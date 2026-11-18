---
name: update-companions
description: >-
  Use this skill when the companion (buddy) export in import/ (MHO_companions.json) has been updated and
  the user wants to check what changed, generate the Supabase SQL for buddies/buddy_skills, and get a
  change report. Triggers: "check the buddy update", "companions updated", "update buddies".
---

# Update Companions (Buddies) Skill

Compares `import/MHO_companions.json` with the last version applied to Supabase, writes an
**incremental** migration (upserts only, never deletes) and a markdown report. The CSV isn't needed.

- `public.buddies`: name, species, tier, role, description, core_passive, default_of_adventurer_id,
  image, sort_order, status, status_reason, is_spoiler, is_debug
- `public.buddy_skills`: skills / passive / other skills, replaced only for buddies whose skills changed

## Steps

1. From the project root run:

   `python3 .agents/skills/update-companions/scripts/companions_update.py`

   Writes `import/reports/companions_update_<YYYYMMDD_HHMM>.md` and, if DB fields changed,
   `supabase/migrations/<YYYYMMDD><seq>_update_mho_companions.sql`.
   Options: `--dry-run`, `--full` (resync every buddy), `--baseline-ref <git ref>`.

2. Summarise the report: new companions, removed (hidden, not deleted), changed fields/skills,
   display-only changes ("info" rows such as how_to_obtain are not stored), and any ⚠️ warnings
   (missing `public/images/buddies/<id>.webp` for a new buddy, unknown default adventurer).

3. Give the user the SQL path to run in the Supabase SQL editor. Don't run it against the database yourself.

4. After the user confirms it's applied, run with `--accept` to save `import/.baseline/companions/`.
   Until then the script compares against the last git commit.

Admin-managed columns (`name_ja`, `notes`, `is_active`) are never overwritten, except new buddies get `is_active = TRUE`.
