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
ICON_DIR = ROOT / "public" / "images" / "skills" / "ItemIcon"
ICON_URL_PREFIX = "/images/skills/ItemIcon/"
DEFAULT_OUT = ROOT / "supabase" / "migrations" / "20261104000008_import_mho_skills.sql"


def sql_str(value):
    if value is None or value == "":
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def load_rows():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


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


def load_active_skill_names(all_skills):
    """Identifies skills that appear on armour pieces & upgrades or weapons."""
    active_names = set()

    # 1. Weapon skills from MHO_weapons.json
    weapons_json = ROOT / "import" / "MHO_weapons.json"
    if weapons_json.exists():
        with open(weapons_json, encoding="utf-8") as f:
            for w in json.load(f):
                if w.get("legendary_intrinsic_effect"):
                    active_names.add(w["legendary_intrinsic_effect"]["name"])
                for slot in w.get("legendary_awakening_slots", []):
                    for opt in slot:
                        active_names.add(opt)

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

    for sk in all_skills:
        if sk["Entry ID"].strip() in direct_ids:
            active_names.add(sk["Skill"].strip())

    return active_names


def build_records(groups, active_names):
    records = []
    for group in groups:
        first = group[0]
        max_level = max(int(r["Level"]) for r in group)
        for r in group:
            category = (r["Category"] or first["Category"]).strip()
            icon_file = (r["Icon"] or first["Icon"]).strip().split("/")[-1]
            if not (ICON_DIR / icon_file).exists():
                sys.exit(f"Missing icon file {icon_file} for entry {r['Entry ID']}")
            records.append(
                {
                    "id": r["Entry ID"].strip(),
                    "name": r["Skill"].strip(),
                    "level": int(r["Level"]),
                    "max_levels": max_level,
                    "category": category or "general",
                    "icon": ICON_URL_PREFIX + icon_file,
                    "description": r["Description"].strip(),
                    "is_active": r["Skill"].strip() in active_names,
                }
            )
    return records


def render(records):
    values = ",\n".join(
        "  ({id}, {name}, {category}, {level}, {max_levels}, {is_active}, {icon}, {description})".format(
            id=sql_str(r["id"]),
            name=sql_str(r["name"]),
            category=sql_str(r["category"]),
            level=r["level"],
            max_levels=r["max_levels"],
            is_active="TRUE" if r["is_active"] else "FALSE",
            icon=sql_str(r["icon"]),
            description=sql_str(r["description"]),
        )
        for r in records
    )
    return f"""-- ============================================================
-- Migration: 20261104000008 — Import MHO skills (one row per skill level)
-- Source: import/MHO_skills.csv — generated by scripts/import_mho_skills.py
-- DO NOT edit by hand — update the CSV and re-run the script.
--   * id = game Entry ID, level = skill level, max_levels = highest level of the skill
--   * Replaces every non-set-bonus skill; set bonuses (is_set_bonus) are untouched
--   * Placeholders such as {{SkillB_One_10081_01}} in descriptions are kept as exported
-- ============================================================

BEGIN;

DELETE FROM public.skills WHERE is_set_bonus = FALSE;

INSERT INTO public.skills
  (id, name, category, level, max_levels, is_active, icon, description)
VALUES
{values}
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  category    = EXCLUDED.category,
  level       = EXCLUDED.level,
  max_levels  = EXCLUDED.max_levels,
  is_active   = EXCLUDED.is_active,
  icon        = EXCLUDED.icon,
  description = EXCLUDED.description;

COMMIT;
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    rows = load_rows()
    groups = group_skills(rows)
    for group in groups:
        levels = [int(r["Level"]) for r in group]
        if levels != list(range(1, len(levels) + 1)):
            sys.exit(f"Non-contiguous levels for {group[0]['Skill']}: {levels}")
    active_names = load_active_skill_names(rows)
    records = build_records(groups, active_names)
    ids = [r["id"] for r in records]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate Entry IDs in CSV")

    Path(args.out).write_text(render(records), encoding="utf-8")
    active_count = sum(1 for r in records if r["is_active"])
    print(f"{len(records)} skill rows ({len(groups)} skills, {active_count} active) -> {args.out}")


if __name__ == "__main__":
    main()
