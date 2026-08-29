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
  - Set `max_levels = '{"mho": <tier_count>}'::jsonb` (e.g. `{"mho": 2}`).

- **Standard Skill (`is_set_bonus = false`)**:
  - Has level progression (e.g. Lv 1 to Lv 3 or Lv 5).
  - Set `is_set_bonus = FALSE`.
  - Set `set_thresholds = '[]'::jsonb`.
  - Set `max_levels` (defaults to `{"mho": 3}` for MHO skills).

### B. Slug ID Generation
- Format name as lowercase `snake_case` (e.g. `Ink of Dragon` → `ink_of_dragon`, `Attack Boost` → `attack_boost`).

### C. Infer Category
Must be one of the allowed categories:
- `attack` — Attack power, raw damage, elemental damage (Fire, Water, Thunder, Ice, Dragon).
- `critical` — Affinity, Critical Eye, Weakness Exploit, Critical Boost.
- `defense` — Defense Boost, elemental resistances, Divine Blessing.
- `survival` — Guts, Fortify, Last Stand, Heroics.
- `status` — Poison, Paralysis, Sleep, Blast attack boosts/buildup.
- `utility` — Earplugs, Tremor Resistance, Windproof, Evade Extender.
- `health` — Health Boost, Recovery Speed.
- `general` — Focus, Concentration, Special Boost, Lock On, Power Prolonger.

### D. Game Scope
- Unless the user specifies MH Now (`mhn`), default game scope to `ARRAY['mho']` (Monster Hunter Outlanders).

---

## 2. SQL Template to Generate

Generate SQL in the following format:

```sql
INSERT INTO public.skills (
  id,
  name,
  name_ja,
  category,
  games,
  max_levels,
  is_set_bonus,
  set_thresholds,
  is_active
) VALUES (
  '<snake_case_id>',
  '<Display Name>',
  NULL, -- or '<Japanese Name>' if provided
  '<category>',
  ARRAY['mho'],
  '{"mho": <max_level_or_tier_count>}'::jsonb,
  <true_or_false>,
  '<json_set_thresholds_or_empty_array>'::jsonb,
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ja = COALESCE(EXCLUDED.name_ja, public.skills.name_ja),
  category = EXCLUDED.category,
  games = EXCLUDED.games,
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
   - Summarize the parsed attributes (ID, Category, Games, Pieces/Levels) for easy review.
