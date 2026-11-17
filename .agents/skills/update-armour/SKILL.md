---
name: update-armour
description: >-
  Use this skill when the armour export files in import/ (MHO_armour.json, MHO_armour_upgrades.json)
  have been updated and the user wants to check what changed, generate the Supabase SQL to apply the
  changes, and get a change report. Triggers: "check the armour update", "new armour files", "update armour".
---

# Update Armour Skill

Compares the latest armour exports with the last version that was applied to Supabase, writes an
**incremental** migration (upserts only, never deletes) and a markdown report of every change.

Only the JSON files are used — the CSVs carry the same data:

- `import/MHO_armour.json` → `public.armour_pieces`
- `import/MHO_armour_upgrades.json` → `public.armour_piece_upgrades` (+ `max_rarity`, `skills`)

Do **not** use `scripts/import_mho_armour.py` for updates: it wipes `armour_pieces` and deletes all
`mho_builds` and `community_builds`.

## Steps

1. **Run the check** from the project root:

   `python3 .agents/skills/update-armour/scripts/armour_update.py`

   It prints a JSON summary (counts, SQL path, report path) and writes:
   - `import/reports/armour_update_<YYYYMMDD_HHMM>.md` — the change report
   - `supabase/migrations/<YYYYMMDD><seq>_update_mho_armour.sql` — only when database fields changed

   Options:
   - `--dry-run` — report only, no SQL and no icon moves
   - `--full` — upsert every piece and upgrade path (use if Supabase is out of sync with the baseline)
   - `--baseline-ref <git ref>` — compare against the files at a specific commit

2. **Handle errors (exit code 2).** The report has a "⛔ Errors" section and no SQL is written.
   Usually a set-bonus skill is missing from `import/MHO_skills.csv`. That means the skills need
   importing first. Tell the user what's missing and stop.

3. **Read the report** and summarise it for the user:
   - new pieces, removed/now-debug pieces (these are hidden, not deleted), changed pieces grouped by set
   - "DB" rows change Supabase; "info" rows (defence, forge materials, descriptions) are display-only
   - any ⚠️ warnings: unknown skill ids, missing icon files, unmatched monster names, multi-tier set bonuses

4. **Show the SQL path** and remind the user to run it in the Supabase SQL editor (or `supabase db push`).
   Do not run it against the database yourself.

5. **After the user confirms the SQL was applied**, save the baseline so the next run only shows
   newer changes:

   `python3 .agents/skills/update-armour/scripts/armour_update.py --accept`

   This copies the current JSONs into `import/.baseline/armour/`. Until a baseline exists the
   script compares against the last git commit of the files.

## What the SQL does

- New and changed pieces: `INSERT … ON CONFLICT (id) DO UPDATE` on the columns from the export
  (`monster_id, slot, skills, set_name, set_variant, rarity, deco_slots, set_bonus, icon_m, icon_f,
  status, status_reason, is_spoiler`). Admin-managed columns (`is_active`, `notes`, `set_icon`) are not touched,
  except that new pieces get `is_active = TRUE`.
- Pieces whose upgrade path changed: their `armour_piece_upgrades` rows are replaced, then `max_rarity`
  and `skills` (skills at max rarity) are refreshed for those pieces only.
- Pieces that left the export or became debug: `is_active = FALSE`, `status = 'not_in_game'`, with
  the reason. Builds that use them keep working.
- Debug entries (`"debug": "yes"`) are never imported.
- New icon files found in `import/ArmourIcon/` are moved to `public/images/armor/ArmourIcon/`.
