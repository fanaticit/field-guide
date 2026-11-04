-- ============================================================
-- Migration: 20261104000003 — Kushala Daora's Tempest visage set
-- A set bonus that is not named "Ink of ...". Its id doubles as the ink key
-- stored in visages.ink_types ('kushala_daoras_tempest').
-- Source: import/MHO_visages copy.csv (1pc / 2pc set bonuses)
-- ============================================================

BEGIN;

INSERT INTO public.skills (
  id, name, name_ja, category, games, max_levels, is_set_bonus, set_thresholds, is_active
) VALUES (
  'kushala_daoras_tempest',
  'Kushala Daora''s Tempest',
  NULL,
  'attack',
  ARRAY['mho'],
  '{"mho": 2}'::jsonb,
  TRUE,
  '[
    {"pieces": 1, "description": "Elemental Damage +2% (Season 0 only)", "granted_skill_id": null, "granted_skill_level": 1},
    {"pieces": 2, "description": "Elemental Damage +3%, increased to 10% when the monster is suppressed. (Season 0 only)", "granted_skill_id": null, "granted_skill_level": 1}
  ]'::jsonb,
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

UPDATE public.visages
SET ink_types = ARRAY['kushala_daoras_tempest']::text[], is_active = TRUE
WHERE id = '10127200';

COMMIT;
