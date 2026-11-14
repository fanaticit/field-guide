#!/usr/bin/env python3
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS_CSV = ROOT / "import" / "MHO_monster_levels.csv"
HITZONES_CSV = ROOT / "import" / "MHO_monster_hitzones.csv"
OUT_SQL = ROOT / "supabase" / "migrations" / "20261114000005_populate_monster_levels_and_hitzones.sql"

def sql_str(val):
    if val is None or val == "":
        return "NULL"
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

def sql_int(val, default=0):
    if val is None or val == "":
        return "NULL" if default is None else str(default)
    try:
        return str(int(float(val)))
    except ValueError:
        return "NULL" if default is None else str(default)

def main():
    levels_rows = []
    with open(LEVELS_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, r in enumerate(reader):
            m_id = (r.get("Monster ID") or r.get("\ufeffMonster ID") or "").strip()
            name = (r.get("Monster") or "").strip()
            content = (r.get("Content") or "").strip()
            hunt_id = (r.get("Hunt ID") or "").strip()
            difficulty = (r.get("Hunt difficulty") or "").strip()
            level = (r.get("Monster level") or "").strip()
            power = (r.get("Suggested hunt power") or "").strip()
            health = (r.get("Health") or "").strip()
            attack = (r.get("Attack") or "").strip()

            if not m_id:
                continue

            levels_rows.append((
                sql_str(m_id),
                sql_str(name),
                sql_str(content),
                sql_str(hunt_id),
                sql_int(difficulty, default=None),
                sql_int(level, default=None),
                sql_int(power, default=None),
                sql_int(health, default=0),
                sql_int(attack, default=0),
                str(i),
            ))

    hitzones_rows = []
    with open(HITZONES_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, r in enumerate(reader):
            m_id = (r.get("Monster ID") or r.get("\ufeffMonster ID") or "").strip()
            name = (r.get("Monster") or "").strip()
            part = (r.get("Part") or "").strip()
            state = (r.get("State") or "").strip()
            cut = (r.get("Cut") or "").strip()
            impact = (r.get("Impact") or "").strip()
            shot = (r.get("Shot") or "").strip()
            fire = (r.get("Fire") or "").strip()
            water = (r.get("Water") or "").strip()
            thunder = (r.get("Thunder") or "").strip()
            ice = (r.get("Ice") or "").strip()
            dragon = (r.get("Dragon") or "").strip()
            stars = (r.get("Weak point stars") or "").strip()

            if not m_id:
                continue

            hitzones_rows.append((
                sql_str(m_id),
                sql_str(name),
                sql_str(part),
                sql_str(state) if state else "NULL",
                sql_int(cut, default=0),
                sql_int(impact, default=0),
                sql_int(shot, default=0),
                sql_int(fire, default=0),
                sql_int(water, default=0),
                sql_int(thunder, default=0),
                sql_int(ice, default=0),
                sql_int(dragon, default=0),
                sql_int(stars, default=0),
                str(i),
            ))

    lines = [
        "-- ============================================================",
        "-- Migration: 20261114000005 — Populate monster_levels and monster_hitzones",
        "-- Source: import/MHO_monster_levels.csv and import/MHO_monster_hitzones.csv",
        "-- ============================================================",
        "",
        "TRUNCATE TABLE public.monster_levels;",
        "TRUNCATE TABLE public.monster_hitzones;",
        "",
    ]

    # Batch insert levels
    BATCH_SIZE = 100
    for idx in range(0, len(levels_rows), BATCH_SIZE):
        batch = levels_rows[idx:idx + BATCH_SIZE]
        values_str = ",\n  ".join(f"({', '.join(row)})" for row in batch)
        lines.append(f"""INSERT INTO public.monster_levels (
  monster_id, monster_name, content, hunt_id, hunt_difficulty, monster_level, suggested_hunt_power, health, attack, sort_order
) VALUES
  {values_str};
""")

    # Batch insert hitzones
    for idx in range(0, len(hitzones_rows), BATCH_SIZE):
        batch = hitzones_rows[idx:idx + BATCH_SIZE]
        values_str = ",\n  ".join(f"({', '.join(row)})" for row in batch)
        lines.append(f"""INSERT INTO public.monster_hitzones (
  monster_id, monster_name, part, state, cut, impact, shot, fire, water, thunder, ice, dragon, weak_point_stars, sort_order
) VALUES
  {values_str};
""")

    with open(OUT_SQL, "w", encoding="utf-8") as out:
        out.write("\n".join(lines))

    print(f"Generated {OUT_SQL} with {len(levels_rows)} monster levels and {len(hitzones_rows)} hitzones.")

if __name__ == "__main__":
    main()
