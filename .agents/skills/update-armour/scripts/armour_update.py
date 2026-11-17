#!/usr/bin/env python3
"""
Compare the armour exports in import/ against the last applied baseline, write an
incremental Supabase migration for what changed, and a markdown change report.

Sources (JSON only):
  import/MHO_armour.json           -> public.armour_pieces
  import/MHO_armour_upgrades.json  -> public.armour_piece_upgrades (+ max_rarity / skills)

Baseline (what is believed to be in Supabase already), first match wins:
  1. --baseline-ref <git ref>       the files as they were at that commit
  2. import/.baseline/armour/       snapshot saved by --accept after the last applied update
  3. git HEAD                       the last committed version of the files

The migration never deletes anything:
  * new / changed pieces       -> INSERT ... ON CONFLICT (id) DO UPDATE (import-owned columns only;
                                  is_active, notes, set_icon are left alone)
  * changed upgrade paths      -> rows for those pieces are replaced
  * removed / now-debug pieces -> is_active = FALSE, status = 'not_in_game' (builds keep their link)

Usage:
  python3 .agents/skills/update-armour/scripts/armour_update.py            # diff + report + SQL
  python3 .agents/skills/update-armour/scripts/armour_update.py --dry-run  # diff + report only
  python3 .agents/skills/update-armour/scripts/armour_update.py --full     # upsert every piece (resync)
  python3 .agents/skills/update-armour/scripts/armour_update.py --accept   # save current files as baseline
"""
import argparse
import csv
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def find_root():
    p = Path(__file__).resolve().parent
    for cand in [p, *p.parents]:
        if (cand / "import").is_dir() and (cand / "supabase").is_dir():
            return cand
    sys.exit("Could not find the project root (folder with import/ and supabase/)")


ROOT = find_root()
IMPORT = ROOT / "import"
ARMOUR_JSON = "MHO_armour.json"
UPGRADES_JSON = "MHO_armour_upgrades.json"
SKILLS_CSV = IMPORT / "MHO_skills.csv"
MONSTERS_JSON = IMPORT / "MHO_monsters.json"
BASELINE_DIR = IMPORT / ".baseline" / "armour"
REPORT_DIR = IMPORT / "reports"
MIGRATIONS = ROOT / "supabase" / "migrations"
ICON_DST = ROOT / "public" / "images" / "armor" / "ArmourIcon"
ICON_SRC = IMPORT / "ArmourIcon"
ICON_URL_PREFIX = "/images/armor/ArmourIcon/"

MONSTER_NAME_OVERRIDES = {
    "Kadachi": "Tobi-Kadachi",
    "Baan": "Radobaan",
    "Radiant Kadachi": "Radiant Tobi-Kadachi",
    "Radiant Baan": "Radiant Radobaan",
}
CHANGE_TYPES = {"New skill": "new_skill", "Level up": "level_up"}

PIECE_DB_FIELDS = [
    "monster_name", "slot", "skills", "set_name", "set_variant", "rarity", "deco_slots",
    "set_bonus", "icon_m", "icon_f", "status", "status_reason", "is_spoiler",
]
PIECE_INFO_FIELDS = [
    "name", "defence", "max_health", "water_res", "fire_res", "ice_res", "thunder_res",
    "dragon_res", "description", "how_to_obtain", "forge_materials", "preview_male",
    "preview_female", "game_status", "set_bonus_text",
]
UPGRADE_FIELDS = [
    "defence", "defence_gain", "required_level", "growth_points", "money",
    "progression_level", "materials", "other_gains", "skills", "skill_changes",
]


# ── loading ───────────────────────────────────────────────────────────────────

def git_show(ref, name):
    try:
        out = subprocess.run(
            ["git", "-C", str(ROOT), "show", f"{ref}:import/{name}"],
            capture_output=True, check=True,
        ).stdout
        return json.loads(out.decode("utf-8"))
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
        return None


def load_baseline(ref):
    if ref:
        a, u = git_show(ref, ARMOUR_JSON), git_show(ref, UPGRADES_JSON)
        if a is None or u is None:
            sys.exit(f"Could not read the armour files at git ref '{ref}'")
        return a, u, f"git `{ref}`"
    if (BASELINE_DIR / ARMOUR_JSON).exists() and (BASELINE_DIR / UPGRADES_JSON).exists():
        meta = BASELINE_DIR / "accepted_at.txt"
        when = meta.read_text().strip() if meta.exists() else "unknown date"
        return (
            json.loads((BASELINE_DIR / ARMOUR_JSON).read_text(encoding="utf-8")),
            json.loads((BASELINE_DIR / UPGRADES_JSON).read_text(encoding="utf-8")),
            f"saved baseline (accepted {when})",
        )
    a, u = git_show("HEAD", ARMOUR_JSON), git_show("HEAD", UPGRADES_JSON)
    if a is not None and u is not None:
        return a, u, "git `HEAD` (no saved baseline yet)"
    return [], [], "none (everything is treated as new)"


def load_skills():
    by_id, by_name = {}, {}
    with open(SKILLS_CSV, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            sid = row["Entry ID"].strip()
            by_id[sid] = f"{row['Skill'].strip()} Lv{row['Level'].strip()}"
            key = (row["Skill"].strip(), int(row["Level"]))
            if key not in by_name or int(sid) < int(by_name[key]):
                by_name[key] = sid
    return by_id, by_name


def load_monster_names():
    try:
        data = json.loads(MONSTERS_JSON.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data = next((v for v in data.values() if isinstance(v, list)), [])
        return {str(m.get("name", "")).strip() for m in data if isinstance(m, dict)}
    except Exception:
        return set()


# ── model (one dict per DB row, identical transform for baseline and current) ─

def monster_name(series):
    name = re.sub(r"\s+Set$", "", series.strip())
    return MONSTER_NAME_OVERRIDES.get(name, name)


def icon_url(path):
    name = (path or "").strip().split("/")[-1]
    return ICON_URL_PREFIX + name if name else None


def build_model(armour, upgrades, skills_by_name, problems):
    ups = {str(u["id"]): u for u in upgrades}
    pieces, steps, debug = {}, {}, {}
    for a in armour:
        pid = str(a["id"])
        if str(a.get("debug", "")).strip().lower() == "yes":
            debug[pid] = a.get("game_status") or "Debug"
            continue

        status_raw = (a.get("game_status") or "In game").strip()
        in_game = status_raw.lower() == "in game"
        series = a["series"].strip()
        set_full = a["set_name"].strip()
        if not set_full.startswith(series):
            problems.append(f"{pid} {a['name']}: set '{set_full}' does not start with series '{series}'")
        variant = set_full[len(series):].strip()

        up = ups.get(pid)
        if up and up.get("upgrade_path"):
            skills = [str(s["id"]) for s in up["upgrade_path"][-1]["skills"]]
        elif a.get("skills_by_rarity"):
            skills = [str(s["id"]) for s in a["skills_by_rarity"][-1]["skills"]]
        else:
            skills = []

        set_bonus = None
        if a.get("set_bonus"):
            tier = a["set_bonus"][0]["tiers"][0]
            name = re.sub(r"\s*\+\d+$", "", tier["skill"]).strip()
            sid = skills_by_name.get((name, int(tier["level"])))
            if sid is None:
                problems.append(f"{pid} {a['name']}: set bonus skill '{name}' Lv{tier['level']} is not in MHO_skills.csv")
            set_bonus = {"pieces": int(tier["pieces"]), "skill_id": sid, "_label": f"{tier['pieces']}pc: {tier['skill']}"}

        pieces[pid] = {
            "id": pid,
            "monster_name": monster_name(series),
            "slot": a["slot"].strip(),
            "skills": skills,
            "set_name": series,
            "set_variant": variant,
            "rarity": int(a["rarity"]),
            "deco_slots": [int(n) for n in a.get("decoration_slots") or []],
            "set_bonus": set_bonus,
            "icon_m": icon_url(a.get("icon_male")),
            "icon_f": icon_url(a.get("icon_female")),
            "status": "in_game" if in_game else "not_in_game",
            "status_reason": None if in_game else status_raw,
            "is_spoiler": status_raw.lower().startswith("upcoming"),
            "_info": {
                **{k: a.get(k) for k in PIECE_INFO_FIELDS},
                "set_bonus_text": "; ".join(
                    f"{b.get('name')}: {t['pieces']}pc {t['skill']} — {t.get('description', '')}"
                    for b in a.get("set_bonus") or [] for t in b.get("tiers") or []
                ) or None,
            },
            "_skills_by_rarity": {
                int(s["unlocks_at_rarity"]): [str(x["id"]) for x in s["skills"]]
                for s in a.get("skills_by_rarity") or []
            },
        }

        if up:
            changes_by_rarity = {}
            for unlock in up.get("skill_unlocks") or []:
                ch = []
                for c in unlock["changes"]:
                    kind = next((v for k, v in CHANGE_TYPES.items() if c["change"].startswith(k)), None)
                    if kind is None:
                        problems.append(f"{pid}: unknown skill change '{c['change']}'")
                        kind = c["change"]
                    ch.append({"type": kind, "skill_id": str(c["id"])})
                changes_by_rarity[unlock["rarity"]] = ch
            path = up["upgrade_path"]
            if path and (path[0]["rarity"] != up["starting_rarity"] or path[-1]["rarity"] != up["max_rarity"]):
                problems.append(f"{pid}: upgrade path does not match starting/max rarity")
            steps[pid] = {
                st["rarity"]: {
                    "defence": st.get("defence"),
                    "defence_gain": st.get("defence_gain"),
                    "required_level": st.get("required_level"),
                    "growth_points": st.get("growth_points"),
                    "money": st.get("money"),
                    "progression_level": st.get("progression_level"),
                    "materials": [
                        {"item_id": m["item_id"], "item": m["item"], "count": m["count"]}
                        for m in st.get("materials", [])
                    ],
                    "other_gains": st.get("other_gains") or {},
                    "skills": [str(s["id"]) for s in st["skills"]],
                    "skill_changes": changes_by_rarity.get(st["rarity"], []),
                }
                for st in path
            }
    return pieces, steps, debug


def db_view(piece):
    v = {k: piece[k] for k in PIECE_DB_FIELDS}
    if v["set_bonus"]:
        v["set_bonus"] = {"pieces": v["set_bonus"]["pieces"], "skill_id": v["set_bonus"]["skill_id"]}
    return v


# ── diff ──────────────────────────────────────────────────────────────────────

def diff(old_p, old_s, new_p, new_s, new_debug):
    new_ids = sorted(set(new_p) - set(old_p))
    removed_ids = sorted(set(old_p) - set(new_p))
    changed = {}
    for pid in sorted(set(new_p) & set(old_p)):
        o, n = old_p[pid], new_p[pid]
        db = {k: (db_view(o)[k], db_view(n)[k]) for k in PIECE_DB_FIELDS if db_view(o)[k] != db_view(n)[k]}
        info = {k: (o["_info"].get(k), n["_info"].get(k)) for k in PIECE_INFO_FIELDS
                if o["_info"].get(k) != n["_info"].get(k)}
        os_, ns_ = old_s.get(pid, {}), new_s.get(pid, {})
        up = {}
        for r in sorted(set(os_) | set(ns_)):
            if r not in os_:
                up[r] = "added"
            elif r not in ns_:
                up[r] = "removed"
            else:
                f = {k: (os_[r][k], ns_[r][k]) for k in UPGRADE_FIELDS if os_[r][k] != ns_[r][k]}
                if f:
                    up[r] = f
        if db or info or up:
            changed[pid] = {"db": db, "info": info, "upgrades": up}
    return new_ids, removed_ids, changed


# ── SQL ───────────────────────────────────────────────────────────────────────

def q(v):
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def q_json(v):
    return q(json.dumps(v, separators=(",", ":"), ensure_ascii=False)) + "::JSONB"


def q_int(v):
    return "NULL" if v is None else str(int(v))


def q_text_arr(xs):
    return "ARRAY[" + ", ".join(q(x) for x in xs) + "]::TEXT[]"


def q_int_arr(xs):
    return "ARRAY[" + ", ".join(str(int(x)) for x in xs) + "]::INTEGER[]"


def render_sql(stamp, piece_ids, upgrade_ids, removed, reactivate, new_p, new_s, debug, baseline_label):
    out = [
        "-- ============================================================",
        f"-- Migration: {stamp} — Armour update (incremental)",
        "-- Source: import/MHO_armour.json + import/MHO_armour_upgrades.json",
        "-- Generated by .agents/skills/update-armour/scripts/armour_update.py",
        f"-- Baseline: {baseline_label}",
        f"--   pieces upserted: {len(piece_ids)} | upgrade paths replaced: {len(upgrade_ids)} | deactivated: {len(removed)}",
        "-- Nothing is deleted from armour_pieces; builds keep their links.",
        "-- ============================================================",
        "",
        "BEGIN;",
        "",
    ]
    if piece_ids:
        rows = []
        for pid in piece_ids:
            p = new_p[pid]
            sb = db_view(p)["set_bonus"]
            rows.append("  ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})".format(
                q(pid), q(p["monster_name"]), q(p["slot"]), q_text_arr(p["skills"]), q(p["set_name"]),
                q(p["set_variant"]), p["rarity"], q_int_arr(p["deco_slots"]),
                q_json(sb) if sb else "NULL", q(p["icon_m"]), q(p["icon_f"]), q(p["status"]),
                q(p["status_reason"]), "TRUE" if p["is_spoiler"] else "FALSE",
            ))
        out += [
            "-- ── Armour pieces (new + changed) ───────────────────────────",
            "CREATE TEMP TABLE _armour_update (",
            "  id TEXT, monster_name TEXT, slot TEXT, skills TEXT[], set_name TEXT, set_variant TEXT,",
            "  rarity INTEGER, deco_slots INTEGER[], set_bonus JSONB, icon_m TEXT, icon_f TEXT,",
            "  status TEXT, status_reason TEXT, is_spoiler BOOLEAN",
            ") ON COMMIT DROP;",
            "",
            "INSERT INTO _armour_update VALUES",
            ",\n".join(rows) + ";",
            "",
            "INSERT INTO public.armour_pieces",
            "  (id, monster_id, slot, skills, set_name, set_variant, rarity, deco_slots, set_bonus, icon_m, icon_f, status, status_reason, is_spoiler)",
            "SELECT",
            "  a.id,",
            "  COALESCE((SELECT m.id FROM public.monsters m WHERE m.name = a.monster_name ORDER BY m.id LIMIT 1), a.monster_name),",
            "  a.slot, a.skills, a.set_name, a.set_variant, a.rarity, a.deco_slots, a.set_bonus, a.icon_m, a.icon_f,",
            "  a.status, a.status_reason, a.is_spoiler",
            "FROM _armour_update a",
            "ON CONFLICT (id) DO UPDATE SET",
            "  monster_id    = EXCLUDED.monster_id,",
            "  slot          = EXCLUDED.slot,",
            "  skills        = EXCLUDED.skills,",
            "  set_name      = EXCLUDED.set_name,",
            "  set_variant   = EXCLUDED.set_variant,",
            "  rarity        = EXCLUDED.rarity,",
            "  deco_slots    = EXCLUDED.deco_slots,",
            "  set_bonus     = EXCLUDED.set_bonus,",
            "  icon_m        = EXCLUDED.icon_m,",
            "  icon_f        = EXCLUDED.icon_f,",
            "  status        = EXCLUDED.status,",
            "  status_reason = EXCLUDED.status_reason,",
            "  is_spoiler    = EXCLUDED.is_spoiler,",
            "  updated_at    = now();",
            "",
        ]
    if reactivate:
        out += [
            "-- Pieces that are new in this export are made visible (also if hidden by an earlier removal)",
            "UPDATE public.armour_pieces SET is_active = TRUE, updated_at = now()",
            "WHERE id IN (" + ", ".join(q(i) for i in reactivate) + ");",
            "",
        ]
    if upgrade_ids:
        rows = []
        for pid in upgrade_ids:
            for r, st in sorted(new_s[pid].items()):
                rows.append("  ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})".format(
                    q(pid), r, q_int(st["defence"]), q_int(st["defence_gain"]), q_int(st["required_level"]),
                    q_int(st["growth_points"]), q_int(st["money"]), q_int(st["progression_level"]),
                    q_json(st["materials"]), q_json(st["other_gains"]), q_text_arr(st["skills"]),
                    q_json(st["skill_changes"]),
                ))
        ids_sql = ", ".join(q(i) for i in upgrade_ids)
        out += [
            "-- ── Upgrade paths (replaced for affected pieces only) ───────",
            f"DELETE FROM public.armour_piece_upgrades WHERE armour_piece_id IN ({ids_sql});",
            "",
            "INSERT INTO public.armour_piece_upgrades",
            "  (armour_piece_id, rarity, defence, defence_gain, required_level, growth_points, money, progression_level, materials, other_gains, skills, skill_changes)",
            "VALUES",
            ",\n".join(rows) + ";",
            "",
            "UPDATE public.armour_pieces p",
            "SET max_rarity = m.max_rarity",
            "FROM (SELECT armour_piece_id, MAX(rarity) AS max_rarity FROM public.armour_piece_upgrades",
            f"      WHERE armour_piece_id IN ({ids_sql}) GROUP BY armour_piece_id) m",
            "WHERE p.id = m.armour_piece_id;",
            "",
            "UPDATE public.armour_pieces p",
            "SET skills = u.skills",
            "FROM public.armour_piece_upgrades u",
            f"WHERE u.armour_piece_id = p.id AND u.rarity = p.max_rarity AND p.id IN ({ids_sql});",
            "",
        ]
    if removed:
        out += ["-- ── No longer in the export (or now marked debug) → hidden, not deleted ──"]
        for pid in removed:
            reason = debug.get(pid, "Removed from game data export")
            out.append(
                f"UPDATE public.armour_pieces SET is_active = FALSE, status = 'not_in_game', "
                f"status_reason = {q(reason)}, updated_at = now() WHERE id = {q(pid)};"
            )
        out.append("")
    out += ["COMMIT;", ""]
    return "\n".join(out)


def next_migration_stamp():
    today = dt.datetime.now().strftime("%Y%m%d")
    seqs = [int(p.name[8:14]) for p in MIGRATIONS.glob(f"{today}*_*.sql") if p.name[8:14].isdigit()]
    return f"{today}{(max(seqs) + 1 if seqs else 1):06d}"


# ── report ────────────────────────────────────────────────────────────────────

def fmt(v, skill_names):
    if isinstance(v, list) and v and all(isinstance(x, str) and x.isdigit() for x in v):
        return ", ".join(skill_names.get(x, f"#{x}") for x in v)
    if isinstance(v, list) and v and isinstance(v[0], dict) and "item" in v[0]:
        return ", ".join(f"{m['item']} x{m['count']}" for m in v)
    if isinstance(v, list) and v and isinstance(v[0], dict) and "skill_id" in v[0]:
        return ", ".join(f"{c['type'].replace('_', ' ')}: {skill_names.get(c['skill_id'], c['skill_id'])}" for c in v)
    if isinstance(v, dict) and "skill_id" in v:
        return f"{v.get('_label') or str(v['pieces']) + 'pc'} ({skill_names.get(v['skill_id'], v['skill_id'])})"
    if v in (None, "", [], {}):
        return "—"
    if isinstance(v, list):
        return " ".join(str(x) for x in v)
    if isinstance(v, (dict,)):
        return json.dumps(v, ensure_ascii=False)
    return str(v)


def cell(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def list_diff(o, n, skill_names):
    """Short 'added / removed' form for lists of skills or materials."""
    def keyed(xs):
        if xs and isinstance(xs[0], dict) and "item" in xs[0]:
            return {f"{m['item']} x{m['count']}" for m in xs}
        if xs and isinstance(xs[0], dict) and "skill_id" in xs[0]:
            return {f"{c['type'].replace('_', ' ')}: {skill_names.get(c['skill_id'], c['skill_id'])}" for c in xs}
        return {skill_names.get(x, f"#{x}") for x in xs}
    a, b = keyed(o or []), keyed(n or [])
    parts = []
    if b - a:
        parts.append("+ " + ", ".join(sorted(b - a)))
    if a - b:
        parts.append("− " + ", ".join(sorted(a - b)))
    return "; ".join(parts) or "order changed"


def render_report(ctx):
    sn = ctx["skill_names"]
    new_p, old_p = ctx["new_p"], ctx["old_p"]
    L = [
        f"# Armour update report — {ctx['now']}",
        "",
        f"- **Baseline:** {ctx['baseline']}",
        f"- **Current:** `import/{ARMOUR_JSON}` ({ctx['n_armour']} entries, {len(new_p)} importable, {ctx['n_debug']} debug) "
        f"+ `import/{UPGRADES_JSON}` ({ctx['n_upgrades']} pieces)",
        f"- **SQL:** {ctx['sql_note']}",
        "",
        "## Summary",
        "",
        "| | Count |",
        "|---|---:|",
        f"| New pieces | {len(ctx['new_ids'])} |",
        f"| Removed / now debug (will be hidden) | {len(ctx['removed_ids'])} |",
        f"| Changed pieces (DB fields) | {sum(1 for c in ctx['changed'].values() if c['db'])} |",
        f"| Changed upgrade paths | {sum(1 for c in ctx['changed'].values() if c['upgrades'])} |",
        f"| Display-only changes (not stored in DB) | {sum(1 for c in ctx['changed'].values() if c['info'] and not c['db'] and not c['upgrades'])} |",
        "",
    ]
    if ctx["problems"]:
        L += ["## ⛔ Errors — SQL not generated", ""] + [f"- {p}" for p in ctx["problems"]] + [""]
    if ctx["warnings"]:
        L += ["## ⚠️ Warnings", ""] + [f"- {w}" for w in ctx["warnings"]] + [""]

    # group changed pieces by set for readability
    def set_of(pid):
        p = new_p.get(pid) or old_p.get(pid)
        return p["_info"].get("name") and f"{p['set_name']} {p['set_variant']}".strip()

    if ctx["new_ids"]:
        L += ["## New pieces", "", "| ID | Name | Set | Slot | Rarity | Skills (max rarity) | Set bonus |", "|---|---|---|---|---|---|---|"]
        for pid in ctx["new_ids"]:
            p = new_p[pid]
            L.append(f"| {pid} | {cell(p['_info']['name'])} | {cell(set_of(pid))} | {p['slot']} | "
                     f"{p['rarity']}→{max(ctx['new_s'].get(pid, {p['rarity']: 0}))} | {cell(fmt(p['skills'], sn))} | "
                     f"{cell(fmt(p['set_bonus'], sn))} |")
        L.append("")
    if ctx["removed_ids"]:
        L += ["## Removed / now debug", "", "| ID | Name | Set | Reason |", "|---|---|---|---|"]
        for pid in ctx["removed_ids"]:
            p = old_p[pid]
            L.append(f"| {pid} | {cell(p['_info']['name'])} | {cell(set_of(pid))} | "
                     f"{cell(ctx['debug'].get(pid, 'Missing from export'))} |")
        L.append("")
    if ctx["changed"]:
        L += ["## Changed pieces", ""]
        by_set = {}
        for pid, c in ctx["changed"].items():
            by_set.setdefault(set_of(pid), []).append((pid, c))
        for s in sorted(by_set):
            L += [f"### {s}", ""]
            for pid, c in by_set[s]:
                name = new_p[pid]["_info"]["name"]
                old_name = old_p[pid]["_info"]["name"]
                title = f"{old_name} → {name}" if old_name != name else name
                L.append(f"**{cell(title)}** (`{pid}`, {new_p[pid]['slot']})")
                L.append("")
                rows = []
                for k, (o, n) in c["db"].items():
                    if k == "skills":
                        rows.append(("skills (max rarity)", fmt(o, sn), fmt(n, sn), "DB"))
                    else:
                        rows.append((k, fmt(o, sn), fmt(n, sn), "DB"))
                for k, (o, n) in c["info"].items():
                    if k == "name":
                        continue
                    rows.append((k, fmt(o, sn), fmt(n, sn), "info"))
                if rows:
                    L += ["| Field | Old | New | |", "|---|---|---|---|"]
                    L += [f"| {cell(a)} | {cell(b)} | {cell(d)} | {e} |" for a, b, d, e in rows]
                    L.append("")
                if c["upgrades"]:
                    L.append("Upgrade path:")
                    L.append("")
                    for r, f in c["upgrades"].items():
                        if isinstance(f, str):
                            L.append(f"- R{r}: step {f}")
                            continue
                        bits = []
                        for k, (o, n) in f.items():
                            if k in ("materials", "skills", "skill_changes"):
                                bits.append(f"{k.replace('_', ' ')} {list_diff(o, n, sn)}")
                            else:
                                bits.append(f"{k.replace('_', ' ')} {fmt(o, sn)} → {fmt(n, sn)}")
                        L.append(f"- R{r}: " + "; ".join(bits))
                    L.append("")
    if not (ctx["new_ids"] or ctx["removed_ids"] or ctx["changed"]):
        L += ["No changes against the baseline.", ""]
    L += [
        "## Next steps",
        "",
        "1. Review this report and the generated SQL.",
        "2. Run the SQL in the Supabase SQL editor (or `supabase db push`).",
        "3. Run the script with `--accept` so the next run only reports newer changes.",
        "",
    ]
    return "\n".join(L)


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="report only, no SQL, no icon moves")
    ap.add_argument("--full", action="store_true", help="upsert every piece and upgrade path, not just changes")
    ap.add_argument("--baseline-ref", help="git ref to compare against instead of the saved baseline")
    ap.add_argument("--accept", action="store_true", help="save the current files as the baseline and exit")
    args = ap.parse_args()

    if args.accept:
        BASELINE_DIR.mkdir(parents=True, exist_ok=True)
        for name in (ARMOUR_JSON, UPGRADES_JSON):
            shutil.copy2(IMPORT / name, BASELINE_DIR / name)
        (BASELINE_DIR / "accepted_at.txt").write_text(dt.datetime.now().strftime("%Y-%m-%d %H:%M") + "\n")
        print(f"Baseline saved to {BASELINE_DIR.relative_to(ROOT)}")
        return

    skill_names, skills_by_name = load_skills()
    cur_a = json.loads((IMPORT / ARMOUR_JSON).read_text(encoding="utf-8"))
    cur_u = json.loads((IMPORT / UPGRADES_JSON).read_text(encoding="utf-8"))
    old_a, old_u, baseline_label = load_baseline(args.baseline_ref)

    problems, ignored = [], []
    new_p, new_s, debug = build_model(cur_a, cur_u, skills_by_name, problems)
    old_p, old_s, _ = build_model(old_a, old_u, skills_by_name, ignored)
    new_ids, removed_ids, changed = diff(old_p, old_s, new_p, new_s, debug)

    warnings = []
    multi = sorted(str(a["id"]) for a in cur_a
                   if len(a.get("set_bonus") or []) > 1 or any(len(b.get("tiers") or []) > 1 for b in a.get("set_bonus") or []))
    if multi:
        warnings.append("Pieces with more than one set-bonus tier — only the first is stored in armour_pieces.set_bonus: "
                        + ", ".join(multi))
    # skills referenced but unknown
    used = set()
    for pid, p in new_p.items():
        used.update(p["skills"])
        for st in new_s.get(pid, {}).values():
            used.update(st["skills"])
    missing_sk = sorted(s for s in used if s not in skill_names)
    if missing_sk:
        warnings.append("Skill ids not in MHO_skills.csv (import skills first): " + ", ".join(missing_sk))
    # pieces with no upgrade path
    no_up = sorted(pid for pid in new_p if pid not in new_s)
    if no_up:
        warnings.append("Pieces without an upgrade path in MHO_armour_upgrades.json: " + ", ".join(no_up))
    # icons
    icon_moves, missing_icons = [], []
    touched = set(new_ids) | {pid for pid, c in changed.items() if "icon_m" in c["db"] or "icon_f" in c["db"]}
    for pid in sorted(touched):
        for url in (new_p[pid]["icon_m"], new_p[pid]["icon_f"]):
            if not url:
                continue
            fn = url.split("/")[-1]
            if (ICON_DST / fn).exists():
                continue
            if (ICON_SRC / fn).exists():
                icon_moves.append(fn)
            else:
                missing_icons.append(fn)
    if missing_icons:
        warnings.append("Icon files missing from public/images/armor/ArmourIcon: " + ", ".join(sorted(set(missing_icons))))
    # monster names for new pieces
    known = load_monster_names()
    if known:
        unknown = sorted({new_p[p]["monster_name"] for p in new_ids if new_p[p]["monster_name"] not in known})
        if unknown:
            warnings.append("New series not matching a monster name (stored as plain name, fine for Alloy/Bone/etc.): "
                            + ", ".join(unknown))

    # what goes into SQL
    if args.full:
        piece_ids, upgrade_ids = sorted(new_p), sorted(new_s)
    else:
        piece_ids = sorted(set(new_ids) | {pid for pid, c in changed.items() if c["db"]})
        upgrade_ids = sorted(pid for pid in set(new_ids) | {pid for pid, c in changed.items() if c["upgrades"]}
                             if pid in new_s)
    reactivate = [pid for pid in new_ids]

    now = dt.datetime.now()
    sql_path = None
    if problems:
        sql_note = "not generated — fix the errors below"
    elif args.dry_run:
        sql_note = "not generated (dry run)"
    elif not (piece_ids or upgrade_ids or removed_ids):
        sql_note = "not needed — nothing changed in the database fields"
    else:
        stamp = next_migration_stamp()
        sql_path = MIGRATIONS / f"{stamp}_update_mho_armour.sql"
        sql_path.write_text(
            render_sql(stamp, piece_ids, upgrade_ids, removed_ids, reactivate, new_p, new_s, debug, baseline_label),
            encoding="utf-8",
        )
        sql_note = f"`{sql_path.relative_to(ROOT)}`"
        if icon_moves:
            ICON_DST.mkdir(parents=True, exist_ok=True)
            for fn in sorted(set(icon_moves)):
                shutil.move(str(ICON_SRC / fn), str(ICON_DST / fn))
            warnings.append(f"Moved {len(set(icon_moves))} new icon(s) from import/ArmourIcon into public/images/armor/ArmourIcon")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"armour_update_{now.strftime('%Y%m%d_%H%M')}.md"
    report_path.write_text(render_report({
        "now": now.strftime("%Y-%m-%d %H:%M"), "baseline": baseline_label, "sql_note": sql_note,
        "n_armour": len(cur_a), "n_upgrades": len(cur_u), "n_debug": len(debug),
        "new_p": new_p, "old_p": old_p, "new_s": new_s, "debug": debug,
        "new_ids": new_ids, "removed_ids": removed_ids, "changed": changed,
        "problems": problems, "warnings": warnings, "skill_names": skill_names,
    }), encoding="utf-8")

    print(json.dumps({
        "baseline": baseline_label,
        "new": len(new_ids), "removed": len(removed_ids),
        "changed_db": sum(1 for c in changed.values() if c["db"]),
        "changed_upgrades": sum(1 for c in changed.values() if c["upgrades"]),
        "display_only": sum(1 for c in changed.values() if c["info"] and not c["db"] and not c["upgrades"]),
        "errors": len(problems), "warnings": len(warnings),
        "sql": str(sql_path.relative_to(ROOT)) if sql_path else None,
        "report": str(report_path.relative_to(ROOT)),
    }, indent=2))
    if problems:
        sys.exit(2)


if __name__ == "__main__":
    main()
