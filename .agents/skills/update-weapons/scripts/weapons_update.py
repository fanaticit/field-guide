#!/usr/bin/env python3
"""
Compare the weapon exports in import/ against the last applied baseline, write an incremental
Supabase migration for public.weapons + public.weapon_upgrades, and a markdown change report.

Sources (JSON only): import/MHO_weapons.json, import/MHO_weapon_upgrades.json
(or import/Weapons/ if that folder exists, same as scripts/import_mho_weapons.py).
Field mapping is identical to scripts/import_mho_weapons.py, but nothing is deleted:

  * new / changed weapons      -> INSERT ... ON CONFLICT (id) DO UPDATE
  * changed upgrade paths      -> weapon_upgrades rows replaced for those weapons only
  * weapons gone / now debug   -> is_active = FALSE, status = 'not_in_game'
  * display order changes      -> sort_order updates only
  Collections, hunter challenges and builds keep their weapons.

Baseline (first match wins): --baseline-ref <git ref> | import/.baseline/weapons/ | git HEAD

Usage:
  python3 .agents/skills/update-weapons/scripts/weapons_update.py            # diff + report + SQL
  python3 .agents/skills/update-weapons/scripts/weapons_update.py --dry-run  # report only
  python3 .agents/skills/update-weapons/scripts/weapons_update.py --full     # upsert everything (resync)
  python3 .agents/skills/update-weapons/scripts/weapons_update.py --accept   # save baseline
"""
import argparse
import datetime as dt
import json
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
SRC = ROOT / "import" / "Weapons" if (ROOT / "import" / "Weapons").exists() else ROOT / "import"
SRC_REL = SRC.relative_to(ROOT).as_posix()
W_JSON, U_JSON = "MHO_weapons.json", "MHO_weapon_upgrades.json"
BASELINE_DIR = ROOT / "import" / ".baseline" / "weapons"
REPORT_DIR = ROOT / "import" / "reports"
MIGRATIONS = ROOT / "supabase" / "migrations"
DST = ROOT / "public" / "images" / "weapons"
URL = "/images/weapons/"
DYNAMIC = "MHMobile/Content/UI/Dynamic/"
TYPE_IDS = {
    "Great Sword": "great_sword", "Long Sword": "long_sword", "Dual Blades": "dual_blades",
    "Hammer": "hammer", "Lance": "lance", "Charge Blade": "charge_blade", "Bow": "bow",
    "Heavy Bowgun": "heavy_bowgun",
}
W_FIELDS = ["name", "max_name", "rarity_names", "type", "monster", "series", "source_type", "source_detail",
            "element_type", "element_damage", "attack", "affinity", "sharpness", "deco_slots", "rarity",
            "max_rarity", "craftable", "is_apex", "apex_season", "apex_effect", "awakening_slots", "image",
            "description", "status", "status_reason", "is_active", "is_spoiler"]
U_FIELDS = ["name", "attack", "affinity", "element_type", "element_damage", "stats", "sharpness", "gains",
            "materials", "money", "required_level"]


# ── loading ───────────────────────────────────────────────────────────────────

def git_show(ref, name):
    try:
        out = subprocess.run(["git", "-C", str(ROOT), "show", f"{ref}:{SRC_REL}/{name}"],
                             capture_output=True, check=True).stdout
        return json.loads(out.decode("utf-8"))
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
        return None


def load_baseline(ref):
    if ref:
        w, u = git_show(ref, W_JSON), git_show(ref, U_JSON)
        if w is None or u is None:
            sys.exit(f"Could not read the weapon files at git ref '{ref}'")
        return w, u, f"git `{ref}`"
    if (BASELINE_DIR / W_JSON).exists() and (BASELINE_DIR / U_JSON).exists():
        meta = BASELINE_DIR / "accepted_at.txt"
        when = meta.read_text().strip() if meta.exists() else "unknown date"
        return (json.loads((BASELINE_DIR / W_JSON).read_text(encoding="utf-8")),
                json.loads((BASELINE_DIR / U_JSON).read_text(encoding="utf-8")),
                f"saved baseline (accepted {when})")
    w, u = git_show("HEAD", W_JSON), git_show("HEAD", U_JSON)
    if w is not None and u is not None:
        return w, u, "git `HEAD` (no saved baseline yet)"
    return [], [], "none (everything is treated as new)"


# ── model (same mapping as scripts/import_mho_weapons.py) ─────────────────────

def source_type(text):
    text = text or ""
    if text.startswith("Forge"):
        return "forge"
    if text.startswith("Apex Weapon element variant"):
        return "apex_variant"
    if text.startswith("Apex Weapon"):
        return "apex_forge"
    if text.startswith("Starter weapon"):
        return "starter"
    return "unknown"


def to_public(game_path, icons, missing):
    if not game_path or DYNAMIC not in game_path:
        return None
    rel = game_path.split(DYNAMIC, 1)[1]
    if (DST / rel).exists():
        return URL + rel
    if (SRC / rel).exists():
        icons.add(rel)
        return URL + rel
    missing.add(rel)
    return None


def stat_element(stats):
    for key, value in stats.items():
        if key not in ("Attack", "Affinity (raw)"):
            return key.lower(), value
    return "raw", None


def build_model(weapons, upgrades, problems):
    ups = {str(u["id"]): u for u in upgrades}
    rows, steps, debug, icons, missing = {}, {}, {}, set(), set()
    order = 0
    for w in weapons:
        wid = str(w["id"])
        if w.get("debug") == "yes":
            debug[wid] = w.get("game_status") or "Debug"
            continue
        if w["type"] not in TYPE_IDS:
            problems.append(f"{wid} {w['name']}: unknown weapon type '{w['type']}'")
            continue
        up = ups.get(wid)
        if not up:
            problems.append(f"{wid} {w['name']}: no upgrade data in {U_JSON}")
            continue
        element_src = w.get("element") or w.get("status")
        if element_src:
            k, v = next(iter(element_src.items()))
            element_type, element_damage = k.lower(), v
        else:
            element_type, element_damage = "raw", None
        game_status = w.get("game_status") or "In game"
        in_game = game_status == "In game"
        upcoming = game_status.startswith("Upcoming")
        effect = w.get("legendary_intrinsic_effect")
        awakening = None
        if w.get("awakening_slots_unlock_at_rarity"):
            awakening = {"unlock_rarities": w["awakening_slots_unlock_at_rarity"],
                         "options": w.get("legendary_awakening_slots")}
        rarity_names, max_name = {}, w["name"]
        for st in up.get("upgrade_path", []):
            if st.get("name"):
                rarity_names[str(st["rarity"])] = st["name"]
                max_name = st["name"]
        if w.get("sharpness_icon"):
            to_public(w["sharpness_icon"], icons, missing)
        rows[wid] = {
            "name": w["name"], "max_name": max_name, "rarity_names": rarity_names or None,
            "type": TYPE_IDS[w["type"]], "monster": w.get("monster") or None,
            "series": (w.get("series") or "").strip() or None,
            "source_type": source_type(w.get("how_to_obtain")), "source_detail": w.get("how_to_obtain") or None,
            "element_type": element_type, "element_damage": element_damage,
            "attack": w.get("attack"), "affinity": w.get("affinity_raw"),
            "sharpness": w.get("sharpness") or None, "deco_slots": w.get("decoration_slots") or [],
            "rarity": w["rarity"], "max_rarity": up["max_rarity"],
            "craftable": bool(w.get("craftable")), "is_apex": bool(w.get("legendary")),
            "apex_season": w.get("apex_challenge_season"),
            "apex_effect": ({"name": effect["name"], "description": effect["description"],
                             "icon": to_public(effect.get("icon"), icons, missing)} if effect else None),
            "awakening_slots": awakening,
            "image": to_public(w.get("icon"), icons, missing),
            "type_icon": to_public(w.get("type_icon"), icons, missing),
            "description": w.get("description") or None,
            "status": "in_game" if in_game else "not_in_game",
            "status_reason": None if in_game else game_status,
            "is_active": in_game or upcoming, "is_spoiler": upcoming,
            "sort_order": order,
        }
        order += 1
        steps[wid] = {}
        for st in up["upgrade_path"]:
            stats = st.get("stats") or {}
            e_type, e_value = stat_element(stats)
            steps[wid][st["rarity"]] = {
                "name": st.get("name") or None, "attack": stats.get("Attack"),
                "affinity": stats.get("Affinity (raw)"), "element_type": e_type, "element_damage": e_value,
                "stats": stats, "sharpness": st.get("sharpness") or None, "gains": st.get("gains") or {},
                "materials": st.get("materials") or [], "money": st.get("money"),
                "required_level": st.get("required_level"),
            }
    return rows, steps, debug, icons, missing


# ── diff ──────────────────────────────────────────────────────────────────────

def diff(old_w, old_s, new_w, new_s):
    new_ids = [i for i in new_w if i not in old_w]
    removed = [i for i in old_w if i not in new_w]
    changed, reordered = {}, []
    for i in new_w:
        if i not in old_w:
            continue
        o, n = old_w[i], new_w[i]
        db = {k: (o[k], n[k]) for k in W_FIELDS if o[k] != n[k]}
        if o["sort_order"] != n["sort_order"]:
            reordered.append(i)
        os_, ns_ = old_s.get(i, {}), new_s.get(i, {})
        up = {}
        for r in sorted(set(os_) | set(ns_)):
            if r not in os_:
                up[r] = "added"
            elif r not in ns_:
                up[r] = "removed"
            else:
                f = {k: (os_[r][k], ns_[r][k]) for k in U_FIELDS if os_[r][k] != ns_[r][k]}
                if f:
                    up[r] = f
        if db or up:
            changed[i] = {"db": db, "upgrades": up}
    return new_ids, removed, changed, reordered


# ── SQL ───────────────────────────────────────────────────────────────────────

def q(v):
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def q_json(v):
    return "NULL" if v is None else q(json.dumps(v, separators=(",", ":"), ensure_ascii=False)) + "::JSONB"


def q_int(v):
    return "NULL" if v is None else str(int(round(v)))


def b(v):
    return "TRUE" if v else "FALSE"


def render_sql(stamp, w_ids, u_ids, removed, reorder_ids, type_icons, new_w, new_s, debug, baseline, full):
    L = [
        "-- ============================================================",
        f"-- Migration: {stamp} — Weapon update ({'full resync' if full else 'incremental'})",
        f"-- Source: {SRC_REL}/{W_JSON} + {U_JSON}",
        "-- Generated by .agents/skills/update-weapons/scripts/weapons_update.py",
        f"-- Baseline: {baseline}",
        f"--   weapons upserted: {len(w_ids)} | upgrade paths replaced: {len(u_ids)} | deactivated: {len(removed)}",
        "-- Nothing is deleted; collections, challenges and builds keep their weapons.",
        "-- ============================================================",
        "",
        "BEGIN;",
        "",
        "-- ── Make sure every column this update writes exists (older migrations may not have run) ──",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS max_name        TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS rarity_names    JSONB;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS series          TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS source_detail   TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS sharpness       TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS deco_slots      INTEGER[] NOT NULL DEFAULT '{}';",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS max_rarity      INTEGER   NOT NULL DEFAULT 1;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS craftable       BOOLEAN   NOT NULL DEFAULT TRUE;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS is_apex         BOOLEAN   NOT NULL DEFAULT FALSE;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS apex_season     TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS apex_effect     JSONB;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS awakening_slots JSONB;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS image           TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS description     TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS status          TEXT      NOT NULL DEFAULT 'in_game';",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS status_reason   TEXT;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS is_spoiler      BOOLEAN   NOT NULL DEFAULT FALSE;",
        "ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS sort_order      INTEGER;",
        "ALTER TABLE public.weapon_upgrades ADD COLUMN IF NOT EXISTS name    TEXT;",
        "",
    ]
    if w_ids:
        rows = []
        for i in w_ids:
            r = new_w[i]
            rows.append("  (" + ", ".join([
                q(i), q(r["name"]), q(r["max_name"]), q_json(r["rarity_names"]), q(r["type"]), q(r["monster"]),
                q(r["series"]), q(r["source_type"]), q(r["source_detail"]), q(r["element_type"]),
                q_int(r["element_damage"]), q_int(r["attack"]), q_int(r["affinity"]), q(r["sharpness"]),
                "ARRAY[" + ", ".join(str(int(n)) for n in r["deco_slots"]) + "]::INTEGER[]",
                str(r["rarity"]), str(r["max_rarity"]), b(r["craftable"]), b(r["is_apex"]), q(r["apex_season"]),
                q_json(r["apex_effect"]), q_json(r["awakening_slots"]), q(r["image"]), q(r["description"]),
                q(r["status"]), q(r["status_reason"]), b(r["is_active"]), b(r["is_spoiler"]), str(r["sort_order"]),
            ]) + ")")
        cols = ["name", "max_name", "rarity_names", "weapon_type_id", "monster_id", "series", "source_type",
                "source_detail", "element_type", "element_damage", "attack", "affinity", "sharpness", "deco_slots",
                "rarity", "max_rarity", "craftable", "is_apex", "apex_season", "apex_effect", "awakening_slots",
                "image", "description", "status", "status_reason", "is_active", "is_spoiler", "sort_order"]
        L += [
            "-- ── Weapons (new + changed) ─────────────────────────────────",
            "CREATE TEMP TABLE _weapon_update (",
            "  id TEXT, name TEXT, max_name TEXT, rarity_names JSONB, weapon_type_id TEXT, monster_name TEXT, series TEXT,",
            "  source_type TEXT, source_detail TEXT, element_type TEXT, element_damage INTEGER, attack INTEGER,",
            "  affinity INTEGER, sharpness TEXT, deco_slots INTEGER[], rarity INTEGER, max_rarity INTEGER,",
            "  craftable BOOLEAN, is_apex BOOLEAN, apex_season TEXT, apex_effect JSONB, awakening_slots JSONB,",
            "  image TEXT, description TEXT, status TEXT, status_reason TEXT, is_active BOOLEAN, is_spoiler BOOLEAN,",
            "  sort_order INTEGER",
            ") ON COMMIT DROP;",
            "",
            "INSERT INTO _weapon_update VALUES",
            ",\n".join(rows) + ";",
            "",
            "INSERT INTO public.weapons (id, " + ", ".join(cols) + ")",
            "SELECT w.id, w.name, w.max_name, w.rarity_names, w.weapon_type_id,",
            "  (SELECT m.id FROM public.monsters m WHERE m.name = w.monster_name ORDER BY m.id LIMIT 1),",
            "  w.series, w.source_type, w.source_detail, w.element_type, w.element_damage, w.attack, w.affinity,",
            "  w.sharpness, w.deco_slots, w.rarity, w.max_rarity, w.craftable, w.is_apex, w.apex_season, w.apex_effect,",
            "  w.awakening_slots, w.image, w.description, w.status, w.status_reason, w.is_active, w.is_spoiler, w.sort_order",
            "FROM _weapon_update w",
            "ON CONFLICT (id) DO UPDATE SET",
            ",\n".join(f"  {c} = EXCLUDED.{c}" for c in cols) + ";",
            "",
        ]
    if reorder_ids:
        L += ["-- ── Display order ───────────────────────────────────────────"]
        L += [f"UPDATE public.weapons SET sort_order = {new_w[i]['sort_order']} WHERE id = {q(i)};" for i in reorder_ids]
        L.append("")
    if u_ids:
        rows = []
        for i in u_ids:
            for r, s in sorted(new_s[i].items()):
                rows.append("  (" + ", ".join([
                    q(i), str(r), q(s["name"]), q_int(s["attack"]), q_int(s["affinity"]), q(s["element_type"]),
                    q_int(s["element_damage"]), q_json(s["stats"]), q(s["sharpness"]), q_json(s["gains"]),
                    q_json(s["materials"]), q_int(s["money"]), q_int(s["required_level"]),
                ]) + ")")
        L += [
            "-- ── Upgrade paths (replaced for affected weapons only) ──────",
            "DELETE FROM public.weapon_upgrades WHERE weapon_id IN (" + ", ".join(q(i) for i in u_ids) + ");",
            "",
            "INSERT INTO public.weapon_upgrades",
            "  (weapon_id, rarity, name, attack, affinity, element_type, element_damage, stats, sharpness, gains, materials, money, required_level)",
            "VALUES",
            ",\n".join(rows) + ";",
            "",
        ]
    if type_icons:
        L += ["-- ── Weapon type icons ───────────────────────────────────────"]
        L += [f"UPDATE public.weapon_types SET icon = {q(icon)} WHERE id = {q(t)};" for t, icon in sorted(type_icons.items())]
        L.append("")
    if removed:
        L += ["-- ── No longer in the export (or now debug) → hidden, not deleted ──"]
        for i in removed:
            L.append(f"UPDATE public.weapons SET is_active = FALSE, status = 'not_in_game', "
                     f"status_reason = {q(debug.get(i, 'Removed from game data export'))} WHERE id = {q(i)};")
        L.append("")
    L += ["COMMIT;", ""]
    return "\n".join(L)


def next_stamp():
    today = dt.datetime.now().strftime("%Y%m%d")
    seqs = [int(p.name[8:14]) for p in MIGRATIONS.glob(f"{today}*_*.sql") if p.name[8:14].isdigit()]
    return f"{today}{(max(seqs) + 1 if seqs else 1):06d}"


# ── report ────────────────────────────────────────────────────────────────────

def fmt(v):
    if v in (None, "", [], {}):
        return "—"
    if isinstance(v, list) and v and isinstance(v[0], dict) and "item" in v[0]:
        return ", ".join(f"{m['item']} x{m['count']}" for m in v)
    if isinstance(v, list):
        return " ".join(str(x) for x in v)
    if isinstance(v, dict):
        return json.dumps(v, ensure_ascii=False)
    return str(v)


def cell(v):
    return fmt(v).replace("|", "\\|").replace("\n", " ")


def mats_diff(o, n):
    a = {f"{m['item']} x{m['count']}" for m in o or []}
    c = {f"{m['item']} x{m['count']}" for m in n or []}
    parts = []
    if c - a:
        parts.append("+ " + ", ".join(sorted(c - a)))
    if a - c:
        parts.append("− " + ", ".join(sorted(a - c)))
    return "; ".join(parts) or "order changed"


def render_report(c):
    new_w, old_w = c["new_w"], c["old_w"]
    L = [
        f"# Weapon update report — {c['now']}",
        "",
        f"- **Baseline:** {c['baseline']}",
        f"- **Current:** `{SRC_REL}/{W_JSON}` ({c['n_w']} entries, {len(new_w)} importable, {len(c['debug'])} debug) "
        f"+ `{U_JSON}` ({c['n_u']} weapons)",
        f"- **SQL:** {c['sql_note']}",
        "",
        "## Summary",
        "",
        "| | Count |",
        "|---|---:|",
        f"| New weapons | {len(c['new_ids'])} |",
        f"| Removed / now debug (will be hidden) | {len(c['removed'])} |",
        f"| Changed weapons | {sum(1 for x in c['changed'].values() if x['db'])} |",
        f"| Changed upgrade paths | {sum(1 for x in c['changed'].values() if x['upgrades'])} |",
        f"| Display order changed | {len(c['reordered'])} |",
        "",
    ]
    if c["problems"]:
        L += ["## ⛔ Errors — SQL not generated", ""] + [f"- {p}" for p in c["problems"]] + [""]
    if c["warnings"]:
        L += ["## ⚠️ Warnings", ""] + [f"- {w}" for w in c["warnings"]] + [""]
    if c["new_ids"]:
        L += ["## New weapons", "", "| ID | Name (max) | Type | Monster | Rarity | Attack | Element | Status |",
              "|---|---|---|---|---|---|---|---|"]
        for i in c["new_ids"]:
            r = new_w[i]
            el = r["element_type"] + (f" {r['element_damage']}" if r["element_damage"] is not None else "")
            L.append(f"| {i} | {cell(r['name'])} ({cell(r['max_name'])}) | {r['type']} | {cell(r['monster'])} | "
                     f"{r['rarity']}→{r['max_rarity']} | {cell(r['attack'])} | {el} | {cell(r['status_reason'] or 'In game')} |")
        L.append("")
    if c["removed"]:
        L += ["## Removed / now debug", "", "| ID | Name | Reason |", "|---|---|---|"]
        L += [f"| {i} | {cell(old_w[i]['name'])} | {cell(c['debug'].get(i, 'Missing from export'))} |" for i in c["removed"]]
        L.append("")
    if c["changed"]:
        L += ["## Changed weapons", ""]
        by_type = {}
        for i, ch in c["changed"].items():
            by_type.setdefault(new_w[i]["type"], []).append((i, ch))
        for t in sorted(by_type):
            L += [f"### {t.replace('_', ' ').title()}", ""]
            for i, ch in by_type[t]:
                L += [f"**{cell(new_w[i]['name'])}** (`{i}`)", ""]
                if ch["db"]:
                    L += ["| Field | Old | New |", "|---|---|---|"]
                    L += [f"| {k} | {cell(o)} | {cell(n)} |" for k, (o, n) in ch["db"].items()]
                    L.append("")
                if ch["upgrades"]:
                    L += ["Upgrade path:", ""]
                    for r, f in ch["upgrades"].items():
                        if isinstance(f, str):
                            L.append(f"- R{r}: step {f}")
                            continue
                        bits = [f"materials {mats_diff(o, n)}" if k == "materials" else f"{k} {fmt(o)} → {fmt(n)}"
                                for k, (o, n) in f.items()]
                        L.append(f"- R{r}: " + "; ".join(bits))
                    L.append("")
    if c["reordered"]:
        L += ["## Display order", "", f"{len(c['reordered'])} weapon(s) moved position in the export "
              "(sort_order updated).", ""]
    if not (c["new_ids"] or c["removed"] or c["changed"] or c["reordered"]):
        L += ["No changes against the baseline.", ""]
    L += ["## Next steps", "",
          "1. Review this report and the generated SQL.",
          "2. Run the SQL in the Supabase SQL editor.",
          "3. Run the script with `--accept` so the next run only reports newer changes.", ""]
    return "\n".join(L)


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--baseline-ref")
    ap.add_argument("--accept", action="store_true")
    ap.add_argument("--max-kb", type=int, default=250, help="max size of each SQL file (Supabase SQL editor limit)")
    ap.add_argument("--stamp", help="migration number to start from (default: next free for today)")
    args = ap.parse_args()

    if args.accept:
        BASELINE_DIR.mkdir(parents=True, exist_ok=True)
        for n in (W_JSON, U_JSON):
            shutil.copy2(SRC / n, BASELINE_DIR / n)
        (BASELINE_DIR / "accepted_at.txt").write_text(dt.datetime.now().strftime("%Y-%m-%d %H:%M") + "\n")
        print(f"Baseline saved to {BASELINE_DIR.relative_to(ROOT)}")
        return

    cur_w = json.loads((SRC / W_JSON).read_text(encoding="utf-8"))
    cur_u = json.loads((SRC / U_JSON).read_text(encoding="utf-8"))
    old_wj, old_uj, baseline = load_baseline(args.baseline_ref)

    problems = []
    new_w, new_s, debug, icons, missing = build_model(cur_w, cur_u, problems)
    old_w, old_s, _, _, _ = build_model(old_wj, old_uj, [])
    ids = [str(w["id"]) for w in cur_w]
    if len(ids) != len(set(ids)):
        problems.append("Duplicate weapon ids in the export")
    new_ids, removed, changed, reordered = diff(old_w, old_s, new_w, new_s)

    warnings = []
    touched = set(new_ids) | set(changed)
    no_image = [f"{new_w[i]['name']} ({i})" for i in sorted(touched) if new_w[i]["image"] is None]
    if no_image:
        warnings.append("No icon file found for: " + ", ".join(no_image)
                        + " — put the icons under import/WeaponIcon/... (game folder layout) and re-run")

    if args.full:
        w_ids, u_ids, reorder_ids = list(new_w), list(new_s), []
        type_icons = {r["type"]: r["type_icon"] for r in new_w.values() if r["type_icon"]}
    else:
        w_ids = new_ids + [i for i, ch in changed.items() if ch["db"]]
        u_ids = new_ids + [i for i, ch in changed.items() if ch["upgrades"]]
        reorder_ids = [i for i in reordered if i not in w_ids]
        old_ti = {r["type"]: r["type_icon"] for r in old_w.values() if r["type_icon"]}
        type_icons = {t: v for t, v in {r["type"]: r["type_icon"] for r in new_w.values() if r["type_icon"]}.items()
                      if old_ti.get(t) != v}

    now = dt.datetime.now()
    sql_path, paths = None, []
    if problems:
        sql_note = "not generated — fix the errors below"
    elif args.dry_run:
        sql_note = "not generated (dry run)"
    elif not (w_ids or u_ids or removed or reorder_ids or type_icons):
        sql_note = "not needed — nothing changed in the database fields"
    else:
        # Split into parts small enough for the Supabase SQL editor; each part is its own transaction
        ids = list(dict.fromkeys(w_ids + u_ids))
        chunks, cur = [], []
        def part_sql(chunk, first, stamp):
            cs = set(chunk)
            return render_sql(stamp, [i for i in w_ids if i in cs], [i for i in u_ids if i in cs],
                              removed if first else [], reorder_ids if first else [],
                              type_icons if first else {}, new_w, new_s, debug, baseline, args.full)
        for i in ids:
            if cur and len(part_sql(cur + [i], not chunks, "0").encode()) > args.max_kb * 1024:
                chunks.append(cur)
                cur = []
            cur.append(i)
        if cur or not chunks:
            chunks.append(cur)
        stamp = int(args.stamp or next_stamp())
        paths = []
        for n, chunk in enumerate(chunks):
            st = str(stamp + n)
            suffix = f"_part{n + 1}of{len(chunks)}" if len(chunks) > 1 else ""
            path = MIGRATIONS / f"{st}_update_mho_weapons{suffix}.sql"
            path.write_text(part_sql(chunk, n == 0, st), encoding="utf-8")
            paths.append(path)
        sql_path = paths[0]
        sql_note = ", ".join(f"`{p.relative_to(ROOT)}`" for p in paths)
        if len(paths) > 1:
            sql_note += f" — run all {len(paths)} parts in order"
        for rel in sorted(icons):
            if (SRC / rel).exists():
                (DST / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(SRC / rel), str(DST / rel))
        if icons:
            warnings.append(f"Moved {len(icons)} new icon file(s) into public/images/weapons/")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report = REPORT_DIR / f"weapons_update_{now.strftime('%Y%m%d_%H%M')}.md"
    report.write_text(render_report({
        "now": now.strftime("%Y-%m-%d %H:%M"), "baseline": baseline, "sql_note": sql_note,
        "n_w": len(cur_w), "n_u": len(cur_u), "new_w": new_w, "old_w": old_w, "debug": debug,
        "new_ids": new_ids, "removed": removed, "changed": changed, "reordered": reordered,
        "problems": problems, "warnings": warnings,
    }), encoding="utf-8")

    print(json.dumps({
        "baseline": baseline, "new": len(new_ids), "removed": len(removed),
        "changed_db": sum(1 for x in changed.values() if x["db"]),
        "changed_upgrades": sum(1 for x in changed.values() if x["upgrades"]),
        "reordered": len(reordered), "errors": len(problems), "warnings": len(warnings),
        "sql": [str(p.relative_to(ROOT)) for p in paths] if sql_path else None,
        "report": str(report.relative_to(ROOT)),
    }, indent=2))
    if problems:
        sys.exit(2)


if __name__ == "__main__":
    main()
