-- ============================================================
-- Migration: 20260903000001 — Seed MHO Ink Set Bonuses into skills table
-- Inserts all 15 Monster Hunter Outlanders Ink Set Bonuses
-- ============================================================

INSERT INTO public.skills (id, name, category, games, max_levels, is_active, is_set_bonus, set_thresholds, description)
VALUES
  (
    'ink_of_might',
    'Ink of Might',
    'attack',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Grants raw attack power and offensive damage boost at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_flames',
    'Ink of Flames',
    'attack',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Grants Fire elemental attack power and burning affinity at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_water',
    'Ink of Water',
    'attack',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Grants Water elemental attack power and aquatic affinity at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_thunder',
    'Ink of Thunder',
    'attack',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Grants Thunder elemental attack power and electrical affinity at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_combat',
    'Ink of Combat',
    'attack',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Enhances martial prowess, weapon technique, and combat momentum at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_guidance',
    'Ink of Guidance',
    'utility',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Provides team synergy, support buffs, and coordination enhancement at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_grace',
    'Ink of Grace',
    'survival',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Enhances evasion window, agility, and stamina efficiency at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_ice',
    'Ink of Ice',
    'attack',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Grants Ice elemental attack power and freezing affinity at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_dragon',
    'Ink of Dragon',
    'attack',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Unleashes Dragon elemental power and dragonseal properties at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_poison',
    'Ink of Poison',
    'status',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Increases Poison status buildup and toxin effectiveness at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_paralysis',
    'Ink of Paralysis',
    'status',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Increases Paralysis status buildup rate at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_sleep',
    'Ink of Sleep',
    'status',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Increases Sleep status buildup rate at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_blast',
    'Ink of Blast',
    'status',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Increases Blast status buildup and explosive detonation rate at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_resonance',
    'Ink of Resonance',
    'general',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Amplifies acoustic, sonic, and resonant frequency power at 2-piece and 4-piece set thresholds.'
  ),
  (
    'ink_of_protection',
    'Ink of Protection',
    'defense',
    ARRAY['mho'],
    '{"mho": 4}'::jsonb,
    true,
    true,
    '[2, 4]'::jsonb,
    'Enhances defense rating, damage mitigation, and guard stability at 2-piece and 4-piece set thresholds.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_set_bonus = true,
  games = ARRAY(SELECT DISTINCT unnest(array_cat(public.skills.games, EXCLUDED.games))),
  set_thresholds = EXCLUDED.set_thresholds,
  description = COALESCE(NULLIF(EXCLUDED.description, ''), public.skills.description);
