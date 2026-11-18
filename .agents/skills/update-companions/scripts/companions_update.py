#!/usr/bin/env python3
"""
Compare import/MHO_companions.json against the last applied baseline, write an incremental
Supabase migration for public.buddies + public.buddy_skills, and a markdown change report.

Baseline (first match wins):
  1. --baseline-ref <git ref>
  2. import/.baseline/companions/   (saved by --accept after the last applied update)
  3. git HEAD

The migration never deletes buddies:
  * new / changed buddies     -> INSERT ... ON CONFLICT (id) DO UPDATE on the export-owned columns
                                 (name_ja, notes, is_active are left alone; new buddies get is_active = TRUE)
  * changed skills            -> buddy_skills rows for that buddy are replaced
  * buddies gone from export  -> is_active = FALSE, status = 'not_in_game'
  Debug buddies are imported with is_debug = TRUE (same as the original import).

Usage:
  python3 .agents/skills/update-companions/scripts/companions_update.py            # diff + report + SQL
  python3 .agents/skills/update-companions/scripts/companions_update.py --dry-run  # report only
  python3 .agents/skills/update-companions/scripts/companions_update.py --full     # upsert every buddy
  python3 .agents/skills/update-companions/scripts/companions_update.py --accept   # save baseline
"""
import argparse
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
SRC = "MHO_companions.json"
ADVENTURERS_JSON = IMPORT / "MHO_adventurers.json"
BASELINE_DIR = IMPORT / ".baseline" / "companions"
REPORT_DIR = IMPORT / "reports"
MIGRATIONS = ROOT / "supabase" / "migrations"
IMAGE_DIR = ROOT / "public" / "images" / "buddies"

DB_FIELDS = ["name", "species", "tier", "role", "description", "core_passive", "default_of",
             "image", "sort_order", "status", "status_reason", "is_spoiler", "is_debug"]
INFO_FIELDS = ["how_to_obtain", "bust", "portrait", "head_icon", "profile_icon", "side_icon", "game_status"]
SKILL_KINDS = [("skills", "skill"), ("passive_skills", "passive"), ("other_skills", "other")]


def git_show(ref):
    try:
        out = subprocess.run(["git", "-C", str(ROOT), "show", f"{ref}:import/{SRC}"],
                             capture_output=True, check=True).stdout
        return json.loads(out.decode("utf-8"))
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
        return None


def load_baseline(ref):
    if ref:
        d = git_show(ref)
        if d is None:
            sys.exit(f"Could not read import/{SRC} at git ref '{ref}'")
        return d, f"git `{ref}`"
    if (BASELINE_DIR / SRC).exists():
        meta = BASELINE_DIR / "accepted_at.txt"
        when = meta.read_text().strip() if meta.exists() else "unknown date"
        return json.loads((BASELINE_DIR / SRC).read_text(encoding="utf-8")), f"saved baseline (accepted {when})"
    d = git_show("HEAD")
    if d is not None:
        return d, "git `HEAD` (no saved baseline yet)"
    return [], "none (everything is treated as new)"


def build_model(data):
    out = {}
    for i, c in enumerate(data, start=1):
        bid = str(c["id"])
        status_raw = (c.get("game_status") or "In game").strip()
        in_game = status_raw.lower() == "in game"
        is_debug = str(c.get("debug", "")).strip().lower() == "yes" or "debug" in status_raw.lower()
        cp = c.get("core_passive") or {}
        core = f"{cp['name']}: {cp.get('description', '')}".strip() if cp.get("name") else None
        defaults = c.get("default_buddy_of") or []
        out[bid] = {
            "name": c["name"].strip(),
            "species": re.sub(r"\s*\(.*\)$", "", c.get("species") or "").strip() or None,
            "tier": c.get("rarity"),
            "role": c.get("type"),
            "description": c.get("description") or None,
            "core_passive": core,
            "default_of": defaults[0] if defaults else None,
            "image": f"/images/buddies/{bid}.webp",
            "sort_order": i,
            "status": "in_game" if in_game else "not_in_game",
            "status_reason": None if in_game else status_raw,
            "is_spoiler": (not in_game),
            "is_debug": is_debug,
            "_skills": [
                {"kind": kind, "sort_order": n, "name": s["name"], "description": s.get("description")}
                for key, kind in SKILL_KINDS for n, s in enumerate(c.get(key) or [], start=1)
            ],
            "_info": {k: c.get(k) for k in INFO_FIELDS},
            "_all_defaults": defaults,
        }
    return out


def diff(old, new):
    new_ids = [b for b in new if b not in old]
    removed = [b for b in old if b not in new]
    changed, reordered = {}, []
    for b in new:
        if b not in old:
            continue
        o, n = old[b], new[b]
        db = {k: (o[k], n[k]) for k in DB_FIELDS if k != "sort_order" and o[k] != n[k]}
        if o["sort_order"] != n["sort_order"]:
            reordered.append(b)
        info = {k: (o["_info"].get(k), n["_info"].get(k)) for k in INFO_FIELDS if o["_info"].get(k) != n["_info"].get(k)}
        sk = []
        okeys = {(s["kind"], s["name"]): s for s in o["_skills"]}
        nkeys = {(s["kind"], s["name"]): s for s in n["_skills"]}
        for k in nkeys:
            if k not in okeys:
                sk.append(("added", k, None, nkeys[k]["description"]))
            elif okeys[k]["description"] != nkeys[k]["description"]:
                sk.append(("changed", k, okeys[k]["description"], nkeys[k]["description"]))
        for k in okeys:
            if k not in nkeys:
                sk.append(("removed", k, okeys[k]["description"], None))
        skills_changed = bool(sk) or [(s["kind"], s["name"]) for s in o["_skills"]] != [(s["kind"], s["name"]) for s in n["_skills"]]
        if db or info or skills_changed:
            changed[b] = {"db": db, "info": info, "skills": sk, "skills_changed": skills_changed}
    return new_ids, removed, changed, reordered


def q(v):
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def b(v):
    return "TRUE" if v else "FALSE"


def render_sql(stamp, buddy_ids, skill_ids, removed, new_ids, reorder_ids, new, baseline):
    L = [
        "-- ============================================================",
        f"-- Migration: {stamp} — Companion (buddy) update (incremental)",
        "-- Source: import/MHO_companions.json",
        "-- Generated by .agents/skills/update-companions/scripts/companions_update.py",
        f"-- Baseline: {baseline}",
        f"--   buddies upserted: {len(buddy_ids)} | skill lists replaced: {len(skill_ids)} | deactivated: {len(removed)}",
        "-- Nothing is deleted from buddies; collections, challenges and builds keep their links.",
        "-- ============================================================",
        "",
        "BEGIN;",
        "",
    ]
    if buddy_ids:
        rows = []
        for i in buddy_ids:
            x = new[i]
            rows.append("  ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})".format(
                q(i), q(x["name"]), q(x["species"]), q(x["tier"]), q(x["role"]), q(x["description"]),
                q(x["core_passive"]), q(x["default_of"]), q(x["image"]), x["sort_order"], q(x["status"]),
                q(x["status_reason"]), b(x["is_spoiler"]), b(x["is_debug"])))
        L += [
            "-- ── Buddies (new + changed) ─────────────────────────────────",
            "CREATE TEMP TABLE _buddy_update (",
            "  id TEXT, name TEXT, species TEXT, tier TEXT, role TEXT, description TEXT, core_passive TEXT,",
            "  default_of TEXT, image TEXT, sort_order INTEGER, status TEXT, status_reason TEXT,",
            "  is_spoiler BOOLEAN, is_debug BOOLEAN",
            ") ON COMMIT DROP;",
            "",
            "INSERT INTO _buddy_update VALUES",
            ",\n".join(rows) + ";",
            "",
            "INSERT INTO public.buddies",
            "  (id, name, species, tier, role, description, core_passive, default_of_adventurer_id, image,",
            "   sort_order, status, status_reason, is_spoiler, is_debug)",
            "SELECT u.id, u.name, u.species, u.tier, u.role, u.description, u.core_passive,",
            "       (SELECT a.id FROM public.adventurers a WHERE a.name = u.default_of LIMIT 1),",
            "       u.image, u.sort_order, u.status, u.status_reason, u.is_spoiler, u.is_debug",
            "FROM _buddy_update u",
            "ON CONFLICT (id) DO UPDATE SET",
            "  name                     = EXCLUDED.name,",
            "  species                  = EXCLUDED.species,",
            "  tier                     = EXCLUDED.tier,",
            "  role                     = EXCLUDED.role,",
            "  description              = EXCLUDED.description,",
            "  core_passive             = EXCLUDED.core_passive,",
            "  default_of_adventurer_id = EXCLUDED.default_of_adventurer_id,",
            "  image                    = EXCLUDED.image,",
            "  sort_order               = EXCLUDED.sort_order,",
            "  status                   = EXCLUDED.status,",
            "  status_reason            = EXCLUDED.status_reason,",
            "  is_spoiler               = EXCLUDED.is_spoiler,",
            "  is_debug                 = EXCLUDED.is_debug;",
            "",
        ]
    if new_ids:
        L += ["UPDATE public.buddies SET is_active = TRUE WHERE id IN (" + ", ".join(q(i) for i in new_ids) + ");", ""]
    if reorder_ids:
        L += ["-- ── Display order ───────────────────────────────────────────"]
        L += [f"UPDATE public.buddies SET sort_order = {new[i]['sort_order']} WHERE id = {q(i)};" for i in reorder_ids]
        L.append("")
    if skill_ids:
        rows = []
        for i in skill_ids:
            for s in new[i]["_skills"]:
                rows.append(f"  ({q(i)}, {q(s['kind'])}, {s['sort_order']}, {q(s['name'])}, {q(s['description'])})")
        L += [
            "-- ── Buddy skills (replaced for affected buddies only) ───────",
            "DELETE FROM public.buddy_skills WHERE buddy_id IN (" + ", ".join(q(i) for i in skill_ids) + ");",
            "",
        ]
        if rows:
            L += ["INSERT INTO public.buddy_skills (buddy_id, kind, sort_order, name, description) VALUES",
                  ",\n".join(rows) + ";", ""]
    if removed:
        L += ["-- ── No longer in the export → hidden, not deleted ──────────"]
        L += [f"UPDATE public.buddies SET is_active = FALSE, status = 'not_in_game', "
              f"status_reason = 'Removed from game data export' WHERE id = {q(i)};" for i in removed]
        L.append("")
    L += ["COMMIT;", ""]
    return "\n".join(L)


def next_stamp():
    today = dt.datetime.now().strftime("%Y%m%d")
    seqs = [int(p.name[8:14]) for p in MIGRATIONS.glob(f"{today}*_*.sql") if p.name[8:14].isdigit()]
    return f"{today}{(max(seqs) + 1 if seqs else 1):06d}"


def fmt(v):
    if v in (None, "", []):
        return "—"
    return str(v)


def cell(s):
    return fmt(s).replace("|", "\\|").replace("\n", " ")


def render_report(c):
    new, old = c["new"], c["old"]
    L = [
        f"# Companion (buddy) update report — {c['now']}",
        "",
        f"- **Baseline:** {c['baseline']}",
        f"- **Current:** `import/{SRC}` ({len(new)} companions, {sum(1 for x in new.values() if x['is_debug'])} debug)",
        f"- **SQL:** {c['sql_note']}",
        "",
        "## Summary",
        "",
        "| | Count |",
        "|---|---:|",
        f"| New companions | {len(c['new_ids'])} |",
        f"| Removed (will be hidden) | {len(c['removed'])} |",
        f"| Changed (DB fields) | {sum(1 for x in c['changed'].values() if x['db'])} |",
        f"| Changed skills | {sum(1 for x in c['changed'].values() if x['skills_changed'])} |",
        f"| Display-only changes (not stored in DB) | {sum(1 for x in c['changed'].values() if x['info'] and not x['db'] and not x['skills_changed'])} |",
        f"| Display order changed | {len(c['reordered'])} |",
        "",
    ]
    if c["warnings"]:
        L += ["## ⚠️ Warnings", ""] + [f"- {w}" for w in c["warnings"]] + [""]
    if c["new_ids"]:
        L += ["## New companions", "", "| ID | Name | Species | Tier | Role | Status | Core passive | Default of |",
              "|---|---|---|---|---|---|---|---|"]
        for i in c["new_ids"]:
            x = new[i]
            L.append(f"| {i} | {cell(x['name'])} | {cell(x['species'])} | {cell(x['tier'])} | {cell(x['role'])} | "
                     f"{cell(x['status_reason'] or 'In game')} | {cell(x['core_passive'])} | {cell(x['default_of'])} |")
        L.append("")
    if c["removed"]:
        L += ["## Removed", ""] + [f"- {old[i]['name']} (`{i}`)" for i in c["removed"]] + [""]
    if c["changed"]:
        L += ["## Changed companions", ""]
        for i, ch in c["changed"].items():
            L += [f"### {new[i]['name']} (`{i}`)", ""]
            rows = [(k, o, n, "DB") for k, (o, n) in ch["db"].items()] + \
                   [(k, o, n, "info") for k, (o, n) in ch["info"].items()]
            if rows:
                L += ["| Field | Old | New | |", "|---|---|---|---|"]
                L += [f"| {k} | {cell(o)} | {cell(n)} | {t} |" for k, o, n, t in rows]
                L.append("")
            if ch["skills"]:
                L += ["| Skill | Change | Old | New |", "|---|---|---|---|"]
                for what, (kind, name), o, n in ch["skills"]:
                    L.append(f"| {cell(name)} ({kind}) | {what} | {cell(o)} | {cell(n)} |")
                L.append("")
            elif ch["skills_changed"]:
                L += ["Skill order changed.", ""]
    if c["reordered"]:
        L += ["## Display order", "", "Order in the export changed for: "
              + ", ".join(f"{new[i]['name']} ({old[i]['sort_order']}→{new[i]['sort_order']})" for i in c["reordered"]), ""]
    if not (c["new_ids"] or c["removed"] or c["changed"] or c["reordered"]):
        L += ["No changes against the baseline.", ""]
    L += ["## Next steps", "",
          "1. Review this report and the generated SQL.",
          "2. Run the SQL in the Supabase SQL editor.",
          "3. Run the script with `--accept` so the next run only reports newer changes.", ""]
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--baseline-ref")
    ap.add_argument("--accept", action="store_true")
    args = ap.parse_args()

    if args.accept:
        BASELINE_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(IMPORT / SRC, BASELINE_DIR / SRC)
        (BASELINE_DIR / "accepted_at.txt").write_text(dt.datetime.now().strftime("%Y-%m-%d %H:%M") + "\n")
        print(f"Baseline saved to {BASELINE_DIR.relative_to(ROOT)}")
        return

    cur = json.loads((IMPORT / SRC).read_text(encoding="utf-8"))
    base, baseline = load_baseline(args.baseline_ref)
    new, old = build_model(cur), build_model(base)
    ids = [str(x["id"]) for x in cur]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate companion ids in the export")
    new_ids, removed, changed, reordered = diff(old, new)

    warnings = []
    for i in new_ids:
        if not (IMAGE_DIR / f"{i}.webp").exists():
            warnings.append(f"No image public/images/buddies/{i}.webp for new companion {new[i]['name']} "
                            f"(make a 256px WebP from `{new[i]['_info']['bust']}`)")
    try:
        adv = {a["name"] for a in json.loads(ADVENTURERS_JSON.read_text(encoding="utf-8"))}
    except Exception:
        adv = None
    for i, x in new.items():
        if len(x["_all_defaults"]) > 1:
            warnings.append(f"{x['name']} is the default buddy of several adventurers ({', '.join(x['_all_defaults'])}); "
                            "only the first is stored")
        if adv is not None and x["default_of"] and x["default_of"] not in adv and (i in new_ids or i in changed):
            warnings.append(f"{x['name']}: default adventurer '{x['default_of']}' not in MHO_adventurers.json "
                            "(link will be empty until that adventurer is imported)")

    if args.full:
        buddy_ids, skill_ids, reorder_ids = list(new), list(new), []
    else:
        buddy_ids = new_ids + [i for i, ch in changed.items() if ch["db"]]
        skill_ids = new_ids + [i for i, ch in changed.items() if ch["skills_changed"]]
        reorder_ids = [i for i in reordered if i not in buddy_ids]

    now = dt.datetime.now()
    sql_path = None
    if args.dry_run:
        sql_note = "not generated (dry run)"
    elif not (buddy_ids or skill_ids or removed or reorder_ids):
        sql_note = "not needed — nothing changed in the database fields"
    else:
        stamp = next_stamp()
        sql_path = MIGRATIONS / f"{stamp}_update_mho_companions.sql"
        sql_path.write_text(render_sql(stamp, buddy_ids, skill_ids, removed, new_ids, reorder_ids, new, baseline),
                            encoding="utf-8")
        sql_note = f"`{sql_path.relative_to(ROOT)}`"

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report = REPORT_DIR / f"companions_update_{now.strftime('%Y%m%d_%H%M')}.md"
    report.write_text(render_report({
        "now": now.strftime("%Y-%m-%d %H:%M"), "baseline": baseline, "sql_note": sql_note,
        "new": new, "old": old, "new_ids": new_ids, "removed": removed, "changed": changed,
        "reordered": reordered, "warnings": warnings,
    }), encoding="utf-8")

    print(json.dumps({
        "baseline": baseline, "new": len(new_ids), "removed": len(removed),
        "changed_db": sum(1 for x in changed.values() if x["db"]),
        "changed_skills": sum(1 for x in changed.values() if x["skills_changed"]),
        "display_only": sum(1 for x in changed.values() if x["info"] and not x["db"] and not x["skills_changed"]),
        "reordered": len(reordered), "warnings": len(warnings),
        "sql": str(sql_path.relative_to(ROOT)) if sql_path else None,
        "report": str(report.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
