#!/usr/bin/env python3
"""
Generate the armour_pieces import migration from import/MHO_armour.csv and move
the icons it references from import/ArmourIcon into public/images/armor/ArmourIcon.

  id          = ID
  monster_id  = id of the monster named like the Series (e.g. "Great Jagras Set"
                -> "Great Jagras"); when the monsters table has no such monster
                (Alloy, Bone, Guild ...) the name that was looked up is stored
  slot        = Slot (Head, Chest, Arms, Waist, Legs)
  skills      = skill ids (one id per skill *level*, see import_mho_skills.py)
  set_name    = Series
  set_variant = Set without the series name (I, II, IV ...)
  rarity      = Rarity
  deco_slots  = Deco slots ("1 1" -> {1,1})
  set_bonus   = {"pieces": 2, "skill_id": "<skill id>"}
  icon_m/f    = /images/armor/ArmourIcon/<file>

Skill names that exist several times in MHO_skills.csv (same name, same level)
resolve to the lowest Entry ID.

Usage (after updating the CSV when the game changes):
  python3 scripts/import_mho_armour.py [--out supabase/migrations/<ts>_import_mho_armour.sql]
"""
import argparse
import csv
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARMOUR_CSV = ROOT / "import" / "MHO_armour.csv"
SKILLS_CSV = ROOT / "import" / "MHO_skills.csv"
ICON_SRC = ROOT / "import" / "ArmourIcon"
ICON_DST = ROOT / "public" / "images" / "armor" / "ArmourIcon"
ICON_URL_PREFIX = "/images/armor/ArmourIcon/"
DEFAULT_OUT = ROOT / "supabase" / "migrations" / "20261104000010_import_mho_armour.sql"

# Series names that differ from the monster names in the monsters table
MONSTER_NAME_OVERRIDES = {
    "Kadachi": "Tobi-Kadachi",
    "Baan": "Radobaan",
    "Radiant Kadachi": "Radiant Tobi-Kadachi",
    "Radiant Baan": "Radiant Radobaan",
}


def sql_str(value):
    if value is None or value == "":
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def load_skill_lookup():
    lookup = {}
    with open(SKILLS_CSV, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            key = (row["Skill"].strip(), int(row["Level"]))
            if key not in lookup or int(row["Entry ID"]) < int(lookup[key]):
                lookup[key] = row["Entry ID"].strip()
    return lookup


def skill_id(lookup, name, level, context):
    try:
        return lookup[(name, level)]
    except KeyError:
        sys.exit(f"No skill '{name}' level {level} ({context})")


def monster_name(series):
    name = re.sub(r"\s+Set$", "", series.strip())
    return MONSTER_NAME_OVERRIDES.get(name, name)


def build_rows():
    lookup = load_skill_lookup()
    with open(ARMOUR_CSV, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    records, icons = [], set()
    for r in rows:
        series = r["Series"].strip()
        set_full = r["Set"].strip()
        if not set_full.startswith(series):
            sys.exit(f"Set '{set_full}' does not start with series '{series}'")
        variant = set_full[len(series):].strip()

        skills = []
        for part in filter(None, (p.strip() for p in r["Skills (highest rarity tier)"].split(";"))):
            m = re.fullmatch(r"(.+?) Lv(\d+)", part)
            if not m:
                sys.exit(f"Cannot parse skill '{part}' on {r['ID']}")
            skills.append(skill_id(lookup, m.group(1), int(m.group(2)), r["ID"]))

        set_bonus = None
        if r["Set bonus"].strip():
            m = re.fullmatch(r"(\d+)pc: (.+?) \+(\d+)", r["Set bonus"].strip())
            if not m:
                sys.exit(f"Cannot parse set bonus '{r['Set bonus']}' on {r['ID']}")
            set_bonus = {
                "pieces": int(m.group(1)),
                "skill_id": skill_id(lookup, m.group(2), int(m.group(3)), r["ID"]),
            }

        deco = [int(n) for n in r["Deco slots"].split()]

        icon_urls = []
        for col in ("Icon (M)", "Icon (F)"):
            filename = r[col].strip().split("/")[-1]
            if filename:
                if not (ICON_SRC / filename).exists() and not (ICON_DST / filename).exists():
                    sys.exit(f"Missing icon file {filename} for {r['ID']}")
                icons.add(filename)
                icon_urls.append(ICON_URL_PREFIX + filename)
            else:
                icon_urls.append(None)

        records.append(
            {
                "id": r["ID"].strip(),
                "monster": monster_name(series),
                "slot": r["Slot"].strip(),
                "skills": skills,
                "set_name": series,
                "set_variant": variant,
                "rarity": int(r["Rarity"]),
                "deco": deco,
                "set_bonus": set_bonus,
                "icon_m": icon_urls[0],
                "icon_f": icon_urls[1],
            }
        )
    ids = [r["id"] for r in records]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate IDs in CSV")
    return records, icons


def render(records):
    def row(r):
        skills = "ARRAY[" + ", ".join(sql_str(s) for s in r["skills"]) + "]::TEXT[]"
        deco = "ARRAY[" + ", ".join(str(n) for n in r["deco"]) + "]::INTEGER[]"
        if r["set_bonus"]:
            bonus = sql_str('{"pieces": %d, "skill_id": "%s"}' % (r["set_bonus"]["pieces"], r["set_bonus"]["skill_id"])) + "::JSONB"
        else:
            bonus = "NULL"
        return "  ({id}, {monster}, {slot}, {skills}, {set_name}, {variant}, {rarity}, {deco}, {bonus}, {icon_m}, {icon_f})".format(
            id=sql_str(r["id"]),
            monster=sql_str(r["monster"]),
            slot=sql_str(r["slot"]),
            skills=skills,
            set_name=sql_str(r["set_name"]),
            variant=sql_str(r["set_variant"]),
            rarity=r["rarity"],
            deco=deco,
            bonus=bonus,
            icon_m=sql_str(r["icon_m"]),
            icon_f=sql_str(r["icon_f"]),
        )

    values = ",\n".join(row(r) for r in records)
    return f"""-- ============================================================
-- Migration: 20261104000010 — Import MHO armour pieces
-- Source: import/MHO_armour.csv — generated by scripts/import_mho_armour.py
-- DO NOT edit by hand — update the CSV and re-run the script.
--   * Every armour piece and every build (mho_builds, community_builds) is deleted first
--   * game is dropped; skills is a TEXT[] of skill ids (one id per skill level)
--   * driftsmelt_slots -> deco_slots INTEGER[]; image -> icon_m / icon_f
--   * set_bonus = {{"pieces": n, "skill_id": "<id>"}}
--   * monster_id = monsters.id matched by name, otherwise the name that was looked up
-- ============================================================

BEGIN;

DELETE FROM public.mho_builds;
DELETE FROM public.community_builds;
DELETE FROM public.armour_pieces;

-- ── Schema ──────────────────────────────────────────────────
ALTER TABLE public.armour_pieces DROP CONSTRAINT IF EXISTS armour_pieces_slot_check;
ALTER TABLE public.armour_pieces DROP CONSTRAINT IF EXISTS uq_armour_pieces_game_monster_slot;
ALTER TABLE public.armour_pieces DROP CONSTRAINT IF EXISTS uq_armour_pieces_game_monster_set_slot;
DROP INDEX IF EXISTS public.idx_armour_pieces_game_monster;
DROP INDEX IF EXISTS public.idx_armour_pieces_game_monster_set;
DROP INDEX IF EXISTS public.idx_armour_pieces_skills;

ALTER TABLE public.armour_pieces DROP COLUMN IF EXISTS game;
ALTER TABLE public.armour_pieces DROP COLUMN IF EXISTS image;
ALTER TABLE public.armour_pieces DROP COLUMN IF EXISTS driftsmelt_slots;
ALTER TABLE public.armour_pieces DROP COLUMN IF EXISTS skills;

ALTER TABLE public.armour_pieces ADD COLUMN IF NOT EXISTS skills     TEXT[]  NOT NULL DEFAULT '{{}}';
ALTER TABLE public.armour_pieces ADD COLUMN IF NOT EXISTS deco_slots INTEGER[] NOT NULL DEFAULT '{{}}';
ALTER TABLE public.armour_pieces ADD COLUMN IF NOT EXISTS set_bonus  JSONB;
ALTER TABLE public.armour_pieces ADD COLUMN IF NOT EXISTS icon_m     TEXT;
ALTER TABLE public.armour_pieces ADD COLUMN IF NOT EXISTS icon_f     TEXT;

CREATE INDEX IF NOT EXISTS idx_armour_pieces_monster     ON public.armour_pieces(monster_id);
CREATE INDEX IF NOT EXISTS idx_armour_pieces_monster_set ON public.armour_pieces(monster_id, set_variant);
CREATE INDEX IF NOT EXISTS idx_armour_pieces_skills      ON public.armour_pieces USING GIN(skills);

-- ── Data ────────────────────────────────────────────────────
CREATE TEMP TABLE _armour_import (
  id TEXT, monster_name TEXT, slot TEXT, skills TEXT[], set_name TEXT, set_variant TEXT,
  rarity INTEGER, deco_slots INTEGER[], set_bonus JSONB, icon_m TEXT, icon_f TEXT
) ON COMMIT DROP;

INSERT INTO _armour_import VALUES
{values};

INSERT INTO public.armour_pieces
  (id, monster_id, slot, skills, set_name, set_variant, rarity, deco_slots, set_bonus, icon_m, icon_f)
SELECT
  a.id,
  COALESCE((SELECT m.id FROM public.monsters m WHERE m.name = a.monster_name ORDER BY m.id LIMIT 1), a.monster_name),
  a.slot, a.skills, a.set_name, a.set_variant, a.rarity, a.deco_slots, a.set_bonus, a.icon_m, a.icon_f
FROM _armour_import a;

COMMIT;
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    records, icons = build_rows()
    ICON_DST.mkdir(parents=True, exist_ok=True)
    for name in sorted(icons):
        if (ICON_SRC / name).exists():
            shutil.move(str(ICON_SRC / name), str(ICON_DST / name))
    Path(args.out).write_text(render(records), encoding="utf-8")
    print(f"{len(records)} armour pieces, {len(icons)} icons -> {args.out}")


if __name__ == "__main__":
    main()
