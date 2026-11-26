#!/usr/bin/env python3
"""
Generate the skills import migration from import/MHO_skills.csv.

The game stores one row per skill *level* (Entry ID, Skill, Level, Category,
Description, Icon). The skills table mirrors that: one row per entry id.

  id          = Entry ID
  level       = Level
  max_levels  = highest level of the skill the row belongs to
  category    = Category (blank cells inherit from the skill's first row)
  icon        = /images/skills/ItemIcon/<file>  (files live in public/)

Rows are grouped into a skill by name and ascending level; a name that restarts
at level 1 is a different skill that happens to share a name (e.g. the two
"Airborne" skills), so max_levels is calculated per group.

Set bonuses (is_set_bonus = TRUE) are left untouched.

Usage (after updating the CSV when the game changes):
  python3 scripts/import_mho_skills.py [--out supabase/migrations/<ts>_import_mho_skills.sql]
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "import" / "MHO_skills.csv"
TYPES_CSV_PATH = ROOT / "import" / "MHO_skill_types.csv"
ICON_DIR = ROOT / "public" / "images" / "skills" / "ItemIcon"
ICON_URL_PREFIX = "/images/skills/ItemIcon/"
DEFAULT_OUT = ROOT / "supabase" / "migrations" / "20261104000008_import_mho_skills.sql"
INCREMENTAL_OUT = ROOT / "supabase" / "migrations" / "20261125000003_add_skill_metadata_to_skills.sql"


def sql_str(value):
    if value is None or value == "":
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_num(value):
    if value is None or value == "":
        return "NULL"
    return str(value)


def load_rows():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    types_by_id = {}
    if TYPES_CSV_PATH.exists():
        with open(TYPES_CSV_PATH, encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                tid = r.get("Skill type ID", "").strip()
                if tid:
                    types_by_id[tid] = r

    return rows, types_by_id


def group_skills(rows):
    """Rows of one skill are not always adjacent in the CSV, so a row joins the
    open group of the same name that is waiting for its level; if several are
    waiting (same-named skills), the one with the closest Entry ID wins."""
    groups = []
    for row in rows:
        level = int(row["Level"])
        candidates = [
            g
            for g in groups
            if g[0]["Skill"] == row["Skill"] and int(g[-1]["Level"]) + 1 == level
        ]
        if candidates:
            target = min(
                candidates,
                key=lambda g: abs(int(g[-1]["Entry ID"]) - int(row["Entry ID"])),
            )
            target.append(row)
        else:
            groups.append([row])
    return groups


def load_active_criteria(all_skills):
    """Identifies skills that appear on armour pieces & upgrades or weapons."""
    # 1. Weapon skills from MHO_weapons.json
    weapon_names = set()
    weapons_json = ROOT / "import" / "MHO_weapons.json"
    if weapons_json.exists():
        with open(weapons_json, encoding="utf-8") as f:
            for w in json.load(f):
                if w.get("legendary_intrinsic_effect"):
                    weapon_names.add(w["legendary_intrinsic_effect"]["name"])
                for slot in w.get("legendary_awakening_slots", []):
                    for opt in slot:
                        weapon_names.add(opt)

    # 2. Armour skills from MHO_armour.json, MHO_armour_upgrades.json, MHO_armour.csv
    direct_ids = set()
    armour_json = ROOT / "import" / "MHO_armour.json"
    if armour_json.exists():
        with open(armour_json, encoding="utf-8") as f:
            for a in json.load(f):
                for r in a.get("skills_by_rarity", []):
                    for s in r.get("skills", []):
                        direct_ids.add(str(s["id"]))

    armour_upgrades_json = ROOT / "import" / "MHO_armour_upgrades.json"
    if armour_upgrades_json.exists():
        with open(armour_upgrades_json, encoding="utf-8") as f:
            for a in json.load(f):
                for u in a.get("skill_unlocks", []):
                    for c in u.get("changes", []):
                        direct_ids.add(str(c["id"]))
                for r in a.get("rarities", []):
                    for s in r.get("skills", []):
                        direct_ids.add(str(s["id"]))

    armour_csv = ROOT / "import" / "MHO_armour.csv"
    if armour_csv.exists():
        with open(armour_csv, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                sb = row.get("Set bonus", "").strip()
                if sb:
                    m = re.fullmatch(r"(\d+)pc: (.+?) \+(\d+)", sb)
                    if m:
                        sname, slevel = m.group(2), int(m.group(3))
                        for sk in all_skills:
                            if sk["Skill"] == sname and int(sk["Level"]) == slevel:
                                direct_ids.add(sk["Entry ID"].strip())
                                break

    active_type_ids = set()
    for sk in all_skills:
        if sk["Entry ID"].strip() in direct_ids and sk.get("Skill type ID", "").strip():
            active_type_ids.add(sk["Skill type ID"].strip())

    return active_type_ids, weapon_names, direct_ids


def build_records(groups, active_type_ids, weapon_names, direct_ids, types_by_id):
    records = []
    for group in groups:
        first = group[0]
        max_level = max(int(r["Level"]) for r in group)
        for r in group:
            category = (r["Category"] or first["Category"]).strip()
            icon_file = (r["Icon"] or first["Icon"]).strip().split("/")[-1]
            if not (ICON_DIR / icon_file).exists():
                sys.exit(f"Missing icon file {icon_file} for entry {r['Entry ID']}")

            tid_str = r.get("Skill type ID", "").strip()
            skill_type_id = int(tid_str) if tid_str else None
            game_status = r.get("Status", "").strip() or "In game"
            is_debug = bool(r.get("Debug", "").strip().lower() == "yes" or game_status != "In game")

            # Active if in game AND (skill type is on armour OR direct ID on armour OR weapon effect name)
            is_active = (not is_debug) and (
                (tid_str and tid_str in active_type_ids)
                or (r["Entry ID"].strip() in direct_ids)
                or (r["Skill"].strip() in weapon_names)
            )

            # Metadata with fallback to skill type
            trow = types_by_id.get(tid_str, {})
            skill_description = (r.get("Skill description") or trow.get("Description") or "").strip() or None
            active = (r.get("Active") or trow.get("Active") or "").strip() or None
            trigger = (r.get("Trigger") or trow.get("Trigger") or "").strip() or None
            trigger_note = (r.get("Trigger note") or trow.get("Trigger note") or "").strip() or None
            conditions = (r.get("Conditions") or trow.get("Conditions") or "").strip() or None

            dur_str = (r.get("Duration (s)") or trow.get("Duration (s)") or "").strip()
            duration_s = None
            if dur_str:
                try:
                    f_val = float(dur_str)
                    duration_s = int(f_val) if f_val.is_integer() else f_val
                except ValueError:
                    duration_s = None

            records.append(
                {
                    "id": r["Entry ID"].strip(),
                    "name": r["Skill"].strip(),
                    "level": int(r["Level"]),
                    "max_levels": max_level,
                    "category": category or "general",
                    "icon": ICON_URL_PREFIX + icon_file,
                    "description": r["Description"].strip(),
                    "skill_type_id": skill_type_id,
                    "game_status": game_status,
                    "is_debug": is_debug,
                    "is_active": is_active,
                    "skill_description": skill_description,
                    "active": active,
                    "trigger": trigger,
                    "trigger_note": trigger_note,
                    "conditions": conditions,
                    "duration_s": duration_s,
                }
            )
    return records


def render(records, migration_id="20261104000008", title="Import MHO skills", include_delete=True):
    values = ",\n".join(
        "  ({id}, {name}, {category}, {level}, {max_levels}, {is_active}, {icon}, {description}, {skill_type_id}, {game_status}, {is_debug}, {skill_description}, {active}, {trigger}, {trigger_note}, {conditions}, {duration_s})".format(
            id=sql_str(r["id"]),
            name=sql_str(r["name"]),
            category=sql_str(r["category"]),
            level=r["level"],
            max_levels=r["max_levels"],
            is_active="TRUE" if r["is_active"] else "FALSE",
            icon=sql_str(r["icon"]),
            description=sql_str(r["description"]),
            skill_type_id=str(r["skill_type_id"]) if r["skill_type_id"] is not None else "NULL",
            game_status=sql_str(r["game_status"]),
            is_debug="TRUE" if r["is_debug"] else "FALSE",
            skill_description=sql_str(r["skill_description"]),
            active=sql_str(r["active"]),
            trigger=sql_str(r["trigger"]),
            trigger_note=sql_str(r["trigger_note"]),
            conditions=sql_str(r["conditions"]),
            duration_s=sql_num(r["duration_s"]),
        )
        for r in records
    )

    delete_stmt = "DELETE FROM public.skills WHERE is_set_bonus = FALSE;\n" if include_delete else ""

    return f"""-- ============================================================
-- Migration: {migration_id} — {title}
-- Source: import/MHO_skills.csv, import/MHO_skill_types.csv
-- Generated by scripts/import_mho_skills.py
-- DO NOT edit by hand — update the CSV and re-run the script.
--   * id = game Entry ID, level = skill level, max_levels = highest level of the skill
--   * Adds/updates skill_description, active, trigger, trigger_note, conditions, duration_s
--   * Placeholders such as {{SkillB_One_10081_01}} in descriptions are kept as exported
-- ============================================================

BEGIN;

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS skill_type_id    INTEGER,
  ADD COLUMN IF NOT EXISTS game_status      TEXT    NOT NULL DEFAULT 'In game',
  ADD COLUMN IF NOT EXISTS is_debug         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skill_description TEXT,
  ADD COLUMN IF NOT EXISTS active           TEXT,
  ADD COLUMN IF NOT EXISTS trigger          TEXT,
  ADD COLUMN IF NOT EXISTS trigger_note     TEXT,
  ADD COLUMN IF NOT EXISTS conditions       TEXT,
  ADD COLUMN IF NOT EXISTS duration_s       NUMERIC;

CREATE INDEX IF NOT EXISTS idx_skills_active ON public.skills(active);

{delete_stmt}INSERT INTO public.skills
  (id, name, category, level, max_levels, is_active, icon, description, skill_type_id, game_status, is_debug, skill_description, active, trigger, trigger_note, conditions, duration_s)
VALUES
{values}
ON CONFLICT (id) DO UPDATE SET
  name              = EXCLUDED.name,
  category          = EXCLUDED.category,
  level             = EXCLUDED.level,
  max_levels        = EXCLUDED.max_levels,
  is_active         = EXCLUDED.is_active,
  icon              = EXCLUDED.icon,
  description       = EXCLUDED.description,
  skill_type_id     = EXCLUDED.skill_type_id,
  game_status       = EXCLUDED.game_status,
  is_debug          = EXCLUDED.is_debug,
  skill_description = EXCLUDED.skill_description,
  active            = EXCLUDED.active,
  trigger           = EXCLUDED.trigger,
  trigger_note      = EXCLUDED.trigger_note,
  conditions        = EXCLUDED.conditions,
  duration_s        = EXCLUDED.duration_s;

COMMIT;
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=None, help="Output SQL migration file path")
    args = parser.parse_args()

    rows, types_by_id = load_rows()
    groups = group_skills(rows)
    for group in groups:
        levels = [int(r["Level"]) for r in group]
        if levels != list(range(1, len(levels) + 1)):
            sys.exit(f"Non-contiguous levels for {group[0]['Skill']}: {levels}")
    active_type_ids, weapon_names, direct_ids = load_active_criteria(rows)
    records = build_records(groups, active_type_ids, weapon_names, direct_ids, types_by_id)
    ids = [r["id"] for r in records]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate Entry IDs in CSV")

    active_count = sum(1 for r in records if r["is_active"])

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(render(records, out_path.stem.split("_")[0], "Update MHO skills", include_delete=False), encoding="utf-8")
        print(f"{len(records)} skill rows ({len(groups)} skills, {active_count} active) -> {out_path}")
    else:
        # Default: update baseline migration AND write incremental migration for Supabase
        DEFAULT_OUT.write_text(render(records, "20261104000008", "Import MHO skills (one row per skill level)", include_delete=True), encoding="utf-8")
        print(f"Updated baseline: {len(records)} skill rows -> {DEFAULT_OUT}")

        INCREMENTAL_OUT.write_text(render(records, "20261125000003", "Add skill metadata (description, active, trigger, trigger_note, conditions, duration_s)", include_delete=False), encoding="utf-8")
        print(f"Generated incremental migration: {len(records)} skill rows -> {INCREMENTAL_OUT}")


if __name__ == "__main__":
    main()
