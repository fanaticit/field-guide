---
name: add-skill-or-set
description: >-
  Use this skill when the user provides raw text or notes for a Monster Hunter skill or set bonus (e.g. Ink of Dragon, 2-piece / 4-piece set effects, standard skill levels) and wants to parse it and generate the exact Supabase SQL upsert script to add or update the database.
---

# Add Skill or Set Bonus Skill

When the user provides raw text, patch notes, or specifications for a Monster Hunter skill or set bonus (e.g. from MH Outlanders or MH Now), follow this procedure to analyze the text and generate a clean, safe Supabase SQL `INSERT ... ON CONFLICT DO UPDATE` statement.

---

## 1. Analysis & Parsing Guidelines

### A. Identify Skill vs. Set Bonus
- **Set Bonus (`is_set_bonus = true`)**:
  - Identified by piece milestones such as `[ 2-Piece Set ]`, `[ 4-Piece Set ]`, `(0/4)`, `Ink of ...`, or named set effects.
  - Set `is_set_bonus = TRUE`.
  - Parse each tier into a JSON array:
    ```json
    [
      { "pieces": 2, "description": "Effect description" },
      { "pieces": 4, "description": "Effect description" }
    ]
    ```
  - Set `max_levels = <tier_count>` (e.g. `2`) and `level = 1`.

- **Standard Skill (`is_set_bonus = false`)**:
  - Standard skills now come from the game data: update `import/MHO_skills.csv` and run `python3 scripts/import_mho_skills.py` (one row per skill level, id = game Entry ID) instead of writing SQL by hand.

### B. Slug ID Generation
- Format name as lowercase `snake_case` (e.g. `Ink of Dragon` → `ink_of_dragon`).

### C. Infer Category
- Set bonuses keep using the legacy lowercase categories: `attack`, `critical`, `defense`, `survival`, `status`, `utility`, `health`, `general` (pick the closest fit for the effect, e.g. elemental damage → `attack`).

---

## 2. SQL Template to Generate

Generate SQL in the following format:

```sql
INSERT INTO public.skills (
  id,
  name,
  name_ja,
  category,
  level,
  max_levels,
  is_set_bonus,
  set_thresholds,
  is_active
) VALUES (
  '<snake_case_id>',
  '<Display Name>',
  NULL, -- or '<Japanese Name>' if provided
  '<category>',
  1,
  <tier_count>,
  TRUE,
  '<json_set_thresholds>'::jsonb,
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ja = COALESCE(EXCLUDED.name_ja, public.skills.name_ja),
  category = EXCLUDED.category,
  level = EXCLUDED.level,
  max_levels = EXCLUDED.max_levels,
  is_set_bonus = EXCLUDED.is_set_bonus,
  set_thresholds = EXCLUDED.set_thresholds,
  is_active = TRUE;
```

---

## 3. Post-Processing & Special Cases

1. **New Visage Inks**:
   - If the set bonus represents an MHO Visage Ink (e.g. `Ink of ...`), check if the ink is defined in `src/data/schemas/visage.ts`.
   - If it is a new ink type, update `InkType`, `INK_CONFIG`, and `INK_OPTIONS` in `src/data/schemas/visage.ts` so it can be selected on Visage cards.

2. **Output to User**:
   - Present the SQL clearly inside a single copy-pasteable SQL block.
   - Summarize the parsed attributes (ID, Category, Pieces/Levels) for easy review.
