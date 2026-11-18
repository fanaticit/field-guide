---
name: update-weapons
description: >-
  Use this skill when the weapon exports in import/ (MHO_weapons.json, MHO_weapon_upgrades.json) have been
  updated and the user wants to check what changed, generate the Supabase SQL for weapons/weapon_upgrades,
  and get a change report. Triggers: "check the weapon update", "new weapon files", "update weapons".
---

# Update Weapons Skill

Compares the weapon exports with the last version applied to Supabase, writes an **incremental**
migration (upserts only, never deletes) and a markdown report. Only the JSON files are used.

Do **not** use `scripts/import_mho_weapons.py` for updates: it deletes every weapon, every user weapon
collection, weapon challenges, and clears weapons from builds. The update script uses the same field
mapping without the deletes.

## Steps

1. From the project root run:

   `python3 .agents/skills/update-weapons/scripts/weapons_update.py`

   Writes `import/reports/weapons_update_<YYYYMMDD_HHMM>.md` and, if DB fields changed,
   `supabase/migrations/<YYYYMMDD><seq>_update_mho_weapons.sql`.
   Options: `--dry-run`, `--full` (upsert every weapon + upgrade path; use on a first run or whenever
   the app is missing something the export has), `--baseline-ref <git ref>`.

2. Exit code 2 = errors (unknown weapon type, weapon without upgrade data). No SQL is written; tell the user.

3. Summarise the report: new weapons, removed/now-debug weapons (hidden, not deleted), changed weapons
   by type and their upgrade-path changes, display-order changes, and ⚠️ warnings (missing icon files —
   icons go under `import/WeaponIcon/...` in the game folder layout and are moved to `public/images/weapons/`).

4. Give the user the SQL path to run in the Supabase SQL editor. Don't run it against the database yourself.

5. After the user confirms it's applied, run with `--accept` to save `import/.baseline/weapons/`.
   Until then the script compares against the last git commit.
