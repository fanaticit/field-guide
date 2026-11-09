#!/usr/bin/env python3
"""
Generate the weapons import migration from import/Weapons/MHO_weapons.json and
import/Weapons/MHO_weapon_upgrades.json, and move the icons they reference into
public/images/weapons/.

  weapons          one row per weapon (id = game ID). Rows with debug = "yes" are skipped.
  weapon_upgrades  one row per weapon per rarity step, linked to weapons by weapon_id.

  weapon_type_id  = Type (Great Sword -> great_sword)
  monster_id      = monsters.id matched by Monster name (NULL when the weapon has no monster)
  source_type     = "How to obtain": forge | apex_forge | apex_variant | starter | unknown
                    (the full text is kept in source_detail)
  element_type    = the element or status that has a value (raw when there is none)
  element_damage  = that value
  attack, affinity = Attack, Affinity (raw)
  status          = in_game | not_in_game; status_reason holds the text when not in game
  is_active       = visible to users   (not released weapons are hidden)
  is_spoiler      = only shown to users who turned on "Show spoilers" (upcoming weapons)

Usage (after updating the files when the game changes):
  python3 scripts/import_mho_weapons.py [--out supabase/migrations/<ts>_import_mho_weapons.sql]
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "import" / "Weapons" if (ROOT / "import" / "Weapons").exists() else ROOT / "import"
DST = ROOT / "public" / "images" / "weapons"
URL = "/images/weapons/"
DEFAULT_OUT = ROOT / "supabase" / "migrations" / "20261105000002_import_mho_weapons.sql"

DYNAMIC = "MHMobile/Content/UI/Dynamic/"
TYPE_IDS = {
    "Great Sword": "great_sword",
    "Long Sword": "long_sword",
    "Dual Blades": "dual_blades",
    "Hammer": "hammer",
    "Lance": "lance",
    "Charge Blade": "charge_blade",
    "Bow": "bow",
    "Heavy Bowgun": "heavy_bowgun",
}


def sql_str(value):
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_json(value):
    if value is None:
        return "NULL"
    return sql_str(json.dumps(value, separators=(",", ":"), ensure_ascii=False)) + "::JSONB"


def sql_int(value):
    return "NULL" if value is None else str(int(round(value)))


def source_type(text):
    if text.startswith("Forge"):
        return "forge"
    if text.startswith("Apex Weapon element variant"):
        return "apex_variant"
    if text.startswith("Apex Weapon"):
        return "apex_forge"
    if text.startswith("Starter weapon"):
        return "starter"
    return "unknown"


def to_public(game_path, moved):
    """MHMobile/.../Dynamic/WeaponIcon/Bow/x.png -> /images/weapons/WeaponIcon/Bow/x.png (file queued to move)."""
    if not game_path:
        return None
    rel = game_path.split(DYNAMIC, 1)[1]
    if not (SRC / rel).exists() and not (DST / rel).exists():
        return None
    moved.add(rel)
    return URL + rel


def stat_element(stats):
    """The element/status entry of a stats dict -> (type, value)."""
    for key, value in stats.items():
        if key not in ("Attack", "Affinity (raw)"):
            return key.lower(), value
    return "raw", None


def build():
    weapons = json.loads((SRC / "MHO_weapons.json").read_text(encoding="utf-8"))
    upgrades = {u["id"]: u for u in json.loads((SRC / "MHO_weapon_upgrades.json").read_text(encoding="utf-8"))}
    moved = set()
    rows, steps = [], []

    for order, w in enumerate(w for w in weapons if w["debug"] != "yes"):
        if w["type"] not in TYPE_IDS:
            sys.exit(f"Unknown weapon type '{w['type']}' on {w['id']}")
        up = upgrades.get(w["id"])
        if not up:
            sys.exit(f"No upgrade data for {w['id']}")

        element_src = w["element"] or w["status"]
        element_type, element_damage = (next(iter(element_src.items()))[0].lower(), next(iter(element_src.values()))) if element_src else ("raw", None)

        game_status = w["game_status"]
        in_game = game_status == "In game"
        upcoming = game_status.startswith("Upcoming")
        effect = w["legendary_intrinsic_effect"]
        awakening = None
        if w["awakening_slots_unlock_at_rarity"]:
            awakening = {
                "unlock_rarities": w["awakening_slots_unlock_at_rarity"],
                "options": w["legendary_awakening_slots"],
            }

        rarity_names = {}
        max_name = w["name"]
        for step in up.get("upgrade_path", []):
            if step.get("name"):
                rarity_names[str(step["rarity"])] = step["name"]
                max_name = step["name"]

        rows.append(
            {
                "id": str(w["id"]),
                "name": w["name"],
                "max_name": max_name,
                "rarity_names": rarity_names if rarity_names else None,
                "type": TYPE_IDS[w["type"]],
                "monster": w["monster"] or None,
                "series": w["series"].strip() or None,
                "source_type": source_type(w["how_to_obtain"]),
                "source_detail": w["how_to_obtain"] or None,
                "element_type": element_type,
                "element_damage": element_damage,
                "attack": w["attack"],
                "affinity": w["affinity_raw"],
                "sharpness": w["sharpness"] or None,
                "deco_slots": w["decoration_slots"],
                "rarity": w["rarity"],
                "max_rarity": up["max_rarity"],
                "craftable": bool(w["craftable"]),
                "is_apex": bool(w["legendary"]),
                "apex_season": w.get("apex_challenge_season"),
                "apex_effect": (
                    {"name": effect["name"], "description": effect["description"], "icon": to_public(effect.get("icon"), moved)}
                    if effect
                    else None
                ),
                "awakening_slots": awakening,
                "image": to_public(w["icon"], moved),
                "type_icon": to_public(w["type_icon"], moved),
                "description": w["description"] or None,
                "status": "in_game" if in_game else "not_in_game",
                "status_reason": None if in_game else game_status,
                "is_active": in_game or upcoming,
                "is_spoiler": upcoming,
                "sort_order": order,
            }
        )
        if w["sharpness_icon"]:
            to_public(w["sharpness_icon"], moved)

        for step in up["upgrade_path"]:
            stats = step["stats"]
            e_type, e_value = stat_element(stats)
            steps.append(
                {
                    "weapon": str(w["id"]),
                    "rarity": step["rarity"],
                    "name": step.get("name") or None,
                    "attack": stats.get("Attack"),
                    "affinity": stats.get("Affinity (raw)"),
                    "element_type": e_type,
                    "element_damage": e_value,
                    "stats": stats,
                    "sharpness": step.get("sharpness") or None,
                    "gains": step.get("gains") or {},
                    "materials": step.get("materials") or [],
                    "money": step.get("money"),
                    "required_level": step.get("required_level"),
                }
            )
    return rows, steps, moved


def render(rows, steps):
    def weapon_row(r):
        return "  ({id}, {name}, {max_name}, {rarity_names}, {type}, {monster}, {series}, {src}, {src_detail}, {el}, {eld}, {atk}, {aff}, {sharp}, {deco}, {rarity}, {maxr}, {craft}, {apex}, {apex_season}, {effect}, {awake}, {image}, {desc}, {status}, {reason}, {active}, {spoiler}, {order})".format(
            id=sql_str(r["id"]),
            name=sql_str(r["name"]),
            max_name=sql_str(r["max_name"]),
            rarity_names=sql_json(r["rarity_names"]),
            type=sql_str(r["type"]),
            monster=sql_str(r["monster"]),
            series=sql_str(r["series"]),
            src=sql_str(r["source_type"]),
            src_detail=sql_str(r["source_detail"]),
            el=sql_str(r["element_type"]),
            eld=sql_int(r["element_damage"]),
            atk=sql_int(r["attack"]),
            aff=sql_int(r["affinity"]),
            sharp=sql_str(r["sharpness"]),
            deco="ARRAY[" + ", ".join(str(n) for n in r["deco_slots"]) + "]::INTEGER[]",
            rarity=r["rarity"],
            maxr=r["max_rarity"],
            craft="TRUE" if r["craftable"] else "FALSE",
            apex="TRUE" if r["is_apex"] else "FALSE",
            apex_season=sql_str(r["apex_season"]),
            effect=sql_json(r["apex_effect"]),
            awake=sql_json(r["awakening_slots"]),
            image=sql_str(r["image"]),
            desc=sql_str(r["description"]),
            status=sql_str(r["status"]),
            reason=sql_str(r["status_reason"]),
            active="TRUE" if r["is_active"] else "FALSE",
            spoiler="TRUE" if r["is_spoiler"] else "FALSE",
            order=r["sort_order"],
        )

    def step_row(s):
        return "  ({w}, {rarity}, {name}, {atk}, {aff}, {el}, {eld}, {stats}, {sharp}, {gains}, {mats}, {money}, {lvl})".format(
            w=sql_str(s["weapon"]),
            rarity=s["rarity"],
            name=sql_str(s["name"]),
            atk=sql_int(s["attack"]),
            aff=sql_int(s["affinity"]),
            el=sql_str(s["element_type"]),
            eld=sql_int(s["element_damage"]),
            stats=sql_json(s["stats"]),
            sharp=sql_str(s["sharpness"]),
            gains=sql_json(s["gains"]),
            mats=sql_json(s["materials"]),
            money=sql_int(s["money"]),
            lvl=sql_int(s["required_level"]),
        )

    weapons_sql = ",\n".join(weapon_row(r) for r in rows)
    steps_sql = ",\n".join(step_row(s) for s in steps)
    type_icons = {}
    for r in rows:
        if r["type_icon"]:
            type_icons[r["type"]] = r["type_icon"]
    type_icon_sql = "\n".join(
        f"UPDATE public.weapon_types SET icon = {sql_str(icon)} WHERE id = {sql_str(t)};" for t, icon in sorted(type_icons.items())
    )

    return f"""-- ============================================================
-- Migration: 20261105000002 — Import MHO weapons and their upgrades
-- Source: import/Weapons/MHO_weapons.json + MHO_weapon_upgrades.json
-- Generated by scripts/import_mho_weapons.py — DO NOT edit by hand, update the files and re-run it.
--   * Every weapon is deleted first (collections, hunter challenges and builds lose them)
--   * weapons: game dropped; status / status_reason / is_spoiler added; source_type, element_type
--     and weapon_type_id follow the game data; debug weapons are not imported
--   * weapon_upgrades: one row per weapon per rarity step, linked to weapons
-- ============================================================

BEGIN;

UPDATE public.mho_builds SET weapon_id = NULL WHERE weapon_id IS NOT NULL;
DELETE FROM public.hunter_challenges WHERE weapon_id IS NOT NULL;
DELETE FROM public.user_weapon_collection;
DELETE FROM public.weapons;

-- ── Schema: weapons ─────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_weapons_game;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS game;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS grade;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS upgraded_name;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS upgraded_name_ja;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS upgrade_level;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS defense_bonus;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS skills;
ALTER TABLE public.weapons DROP COLUMN IF EXISTS special_skill;

ALTER TABLE public.weapons DROP CONSTRAINT IF EXISTS weapons_source_type_check;
ALTER TABLE public.weapons DROP CONSTRAINT IF EXISTS weapons_element_type_check;
ALTER TABLE public.weapons ALTER COLUMN source_type SET DEFAULT 'forge';

ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS max_name      TEXT;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS rarity_names  JSONB;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS series          TEXT;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS source_detail   TEXT;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS sharpness       TEXT;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS deco_slots      INTEGER[] NOT NULL DEFAULT '{{}}';
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS max_rarity      INTEGER   NOT NULL DEFAULT 1;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS craftable       BOOLEAN   NOT NULL DEFAULT TRUE;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS is_apex         BOOLEAN   NOT NULL DEFAULT FALSE;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS apex_season     TEXT;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS apex_effect     JSONB;
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS awakening_slots JSONB;
-- in_game | not_in_game; status_reason explains why a weapon is not in the game
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS status          TEXT      NOT NULL DEFAULT 'in_game';
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS status_reason   TEXT;
-- Spoiler weapons are only shown to users who turned on "Show spoilers"
ALTER TABLE public.weapons ADD COLUMN IF NOT EXISTS is_spoiler      BOOLEAN   NOT NULL DEFAULT FALSE;

ALTER TABLE public.weapons ADD CONSTRAINT weapons_source_type_check
  CHECK (source_type IN ('forge', 'apex_forge', 'apex_variant', 'starter', 'unknown'));
ALTER TABLE public.weapons ADD CONSTRAINT weapons_element_type_check
  CHECK (element_type IN ('raw', 'fire', 'water', 'thunder', 'ice', 'dragon', 'poison', 'paralysis', 'blast', 'sleep', 'stun'));
ALTER TABLE public.weapons DROP CONSTRAINT IF EXISTS weapons_status_check;
ALTER TABLE public.weapons ADD CONSTRAINT weapons_status_check CHECK (status IN ('in_game', 'not_in_game'));

CREATE INDEX IF NOT EXISTS idx_weapons_series  ON public.weapons(series);
CREATE INDEX IF NOT EXISTS idx_weapons_visible ON public.weapons(is_active, is_spoiler);

-- ── Schema: weapon_upgrades ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weapon_upgrades (
  weapon_id       TEXT        NOT NULL REFERENCES public.weapons(id) ON DELETE CASCADE,
  rarity          INTEGER     NOT NULL,
  name            TEXT,
  attack          INTEGER,
  affinity        INTEGER,
  element_type    TEXT        NOT NULL DEFAULT 'raw',
  element_damage  INTEGER,
  -- every stat of the step as exported, e.g. {{"Attack": 54, "Water": 27}}
  stats           JSONB       NOT NULL DEFAULT '{{}}',
  sharpness       TEXT,
  -- what this step added, e.g. {{"Attack": 19, "Water": 27}}
  gains           JSONB       NOT NULL DEFAULT '{{}}',
  -- [{{"item_id": 71001, "item": "Hunter's Jade I", "count": 1}}]
  materials       JSONB       NOT NULL DEFAULT '[]',
  money           INTEGER,
  required_level  INTEGER,
  PRIMARY KEY (weapon_id, rarity)
);
ALTER TABLE public.weapon_upgrades ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.weapon_upgrades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weapon_upgrades_select_all" ON public.weapon_upgrades;
CREATE POLICY "weapon_upgrades_select_all" ON public.weapon_upgrades FOR SELECT USING (true);

DROP POLICY IF EXISTS "weapon_upgrades_write_admin" ON public.weapon_upgrades;
CREATE POLICY "weapon_upgrades_write_admin" ON public.weapon_upgrades FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Data: weapons ───────────────────────────────────────────
CREATE TEMP TABLE _weapon_import (
  id TEXT, name TEXT, max_name TEXT, rarity_names JSONB, weapon_type_id TEXT, monster_name TEXT, series TEXT, source_type TEXT, source_detail TEXT,
  element_type TEXT, element_damage INTEGER, attack INTEGER, affinity INTEGER, sharpness TEXT,
  deco_slots INTEGER[], rarity INTEGER, max_rarity INTEGER, craftable BOOLEAN, is_apex BOOLEAN, apex_season TEXT,
  apex_effect JSONB, awakening_slots JSONB, image TEXT, description TEXT,
  status TEXT, status_reason TEXT, is_active BOOLEAN, is_spoiler BOOLEAN, sort_order INTEGER
) ON COMMIT DROP;

INSERT INTO _weapon_import VALUES
{weapons_sql};

INSERT INTO public.weapons
  (id, name, max_name, rarity_names, weapon_type_id, monster_id, series, source_type, source_detail, element_type, element_damage, attack, affinity,
   sharpness, deco_slots, rarity, max_rarity, craftable, is_apex, apex_season, apex_effect, awakening_slots, image, description,
   status, status_reason, is_active, is_spoiler, sort_order)
SELECT
  w.id, w.name, w.max_name, w.rarity_names, w.weapon_type_id,
  (SELECT m.id FROM public.monsters m WHERE m.name = w.monster_name ORDER BY m.id LIMIT 1),
  w.series, w.source_type, w.source_detail, w.element_type, w.element_damage, w.attack, w.affinity,
  w.sharpness, w.deco_slots, w.rarity, w.max_rarity, w.craftable, w.is_apex, w.apex_season, w.apex_effect, w.awakening_slots, w.image, w.description,
  w.status, w.status_reason, w.is_active, w.is_spoiler, w.sort_order
FROM _weapon_import w;

-- ── Data: weapon_upgrades ───────────────────────────────────
INSERT INTO public.weapon_upgrades
  (weapon_id, rarity, name, attack, affinity, element_type, element_damage, stats, sharpness, gains, materials, money, required_level)
VALUES
{steps_sql};

-- ── Weapon type icons from the game data ────────────────────
{type_icon_sql}

COMMIT;
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    rows, steps, moved = build()
    for rel in sorted(moved):
        src = SRC / rel
        if src.exists():
            (DST / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(DST / rel))
    Path(args.out).write_text(render(rows, steps), encoding="utf-8")
    print(f"{len(rows)} weapons, {len(steps)} upgrade rows, {len(moved)} icons -> {args.out}")


if __name__ == "__main__":
    main()
