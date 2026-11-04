-- ============================================================
-- Migration: 20261104000002 — Refresh visage core effect and ink types
-- Source: import/MHO_visages copy.csv (columns "Core effect", "Set 1", "Set 2")
--   * core_effect = the Core effect shared by the Rare+ rows (NULL when the card has none)
--   * ink_types = [Set 1, Set 2] without the "Ink of " prefix; non-ink sets
--     (e.g. "Kushala Daora's Tempest") are left out
-- ============================================================

BEGIN;

UPDATE public.visages v
SET core_effect = d.core_effect, ink_types = d.ink_types
FROM (VALUES
  ('10001200', 'Quick-Bite +3. Greatly increases the speed of eating meat and using items.', ARRAY['dragon','resonance']::text[]),
  ('10002200', 'Instinct +1. Attacks will not be knocked back.', ARRAY['might','flames']::text[]),
  ('10003200', 'When an ultimate heals a squad member, squad damage +3.5% for 60s.', ARRAY['grace','protection']::text[]),
  ('10004200', 'When equipped with a water weapon, water damage +7%.', ARRAY['water','protection']::text[]),
  ('10005200', 'Unaffected by movement penalties when stuck in mud.', ARRAY['water','frost']::text[]),
  ('10006200', 'When equipped with a thunder weapon, thunder damage +7%.', ARRAY['thunder','grace']::text[]),
  ('10007200', 'After an adventurer uses a buff squad member skill, squad damage +3.5% for 60s.', ARRAY['combat']::text[]),
  ('10008200', 'When equipped with a fire weapon, fire damage +7%.', ARRAY['flames']::text[]),
  ('10009200', 'Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s.', ARRAY['water']::text[]),
  ('10010200', 'When Windproof reaches level 3, grants the entire squad immunity to all wind pressure (including dragon wind pressure).', ARRAY['might','resonance']::text[]),
  ('10011200', 'Paralysis Resistance +3. Prevents paralysis.', ARRAY['thunder','grace']::text[]),
  ('10012200', 'Sleep Resistance +3. Prevents sleep.', ARRAY['resonance','frost']::text[]),
  ('10013200', 'When equipped with an ice weapon, ice damage +7%.', ARRAY['frost']::text[]),
  ('10014200', 'Bleeding Resistance +3. Prevents bleeding.', ARRAY['dragon','combat']::text[]),
  ('10015200', 'After an ultimate inflicts suppression on a monster, squad damage +6% for 30s. Cooldown: 60s.', ARRAY['combat','guidance']::text[]),
  ('10016200', 'When equipped with a physical or ailment weapon, physical damage +3.5%.', ARRAY['protection']::text[]),
  ('10018200', 'When equipped with a dragon weapon, dragon damage +7%.', ARRAY['dragon']::text[]),
  ('10019200', 'After a debuff skill hits a monster, its damage taken +6% for 30s. Cooldown: 60s.', ARRAY['combat']::text[]),
  ('10101200', 'After eating a BBQ, fire damage +10% for 45s. Effect ends early after taking 100 total damage.', ARRAY['guidance']::text[]),
  ('10102200', 'After triggering combo damage, fire damage +16% for 10s. Cooldown: 20s.', ARRAY['flames','guidance']::text[]),
  ('10103200', 'After using a skill that consumes a coating, water damage +10% for 45s.', ARRAY['might','grace']::text[]),
  ('10104200', 'When charge reaches its highest level, water damage +10% for 45s.', ARRAY['water']::text[]),
  ('10105200', 'After using shield, squad defense +10 and squad damage +4% for 45s.', ARRAY['water','protection']::text[]),
  ('10107200', 'During charged attacks, dragon damage +10%.', ARRAY['might']::text[]),
  ('10108200', 'After triggering rupture damage, fire damage +10% for 20s.', ARRAY['flames']::text[]),
  ('10110200', 'While airborne, water damage +10%.', ARRAY['guidance']::text[]),
  ('10115200', 'After using a charged skill, fire damage +10% for 15s.', ARRAY['flames','guidance']::text[]),
  ('10116200', 'After triggering ferocity, dragon damage +10% for 45s.', ARRAY['dragon','protection']::text[]),
  ('10117200', 'When not the Main Adventurer, the character''s ultimate elemental damage +32%.', ARRAY['dragon','resonance']::text[]),
  ('10118200', 'When not the Main Adventurer, ultimate elemental damage +32%.', ARRAY['resonance']::text[]),
  ('10119200', 'After triggering combo damage, dragon damage +10% for 15s.', ARRAY['might','combat']::text[]),
  ('10121200', 'When dealing piercing damage, thunder damage +10%.', ARRAY['thunder']::text[]),
  ('10122200', 'After triggering daze on a monster, thunder damage +16% for 30s. Cooldown: 60s.', ARRAY['thunder']::text[]),
  ('10123200', 'After triggering combo damage, thunder damage +10% for 15s.', ARRAY['thunder','grace']::text[]),
  ('10124200', 'After using a charged skill, ice damage +10% for 15s.', ARRAY['frost']::text[]),
  ('10125200', 'While airborne, ice damage +10%.', ARRAY['frost']::text[]),
  ('10126200', 'When equipped with an ice weapon, ice damage +15%. (S0 Season only)', ARRAY['frost']::text[]),
  ('10127200', 'Elemental Damage +10%, increased to 18% against a monster''s broken parts. (Season 0 only)', ARRAY[]::text[]),
  ('10128200', 'When equipped with a fire weapon, fire damage +15%. (S0 Season only)', ARRAY['flames']::text[]),
  ('10201200', NULL, ARRAY['resonance','combat']::text[]),
  ('10202200', NULL, ARRAY['thunder','guidance']::text[]),
  ('10203200', NULL, ARRAY['protection']::text[]),
  ('10204200', NULL, ARRAY['might','flames']::text[]),
  ('10206200', NULL, ARRAY['water','protection']::text[]),
  ('10207200', NULL, ARRAY['water','frost']::text[]),
  ('10209200', NULL, ARRAY['resonance','grace']::text[]),
  ('10210200', NULL, ARRAY['thunder','combat']::text[]),
  ('10211200', NULL, ARRAY['dragon','protection']::text[]),
  ('10212200', NULL, ARRAY['might','dragon']::text[]),
  ('10213200', NULL, ARRAY['might','combat']::text[]),
  ('10214200', NULL, ARRAY['resonance','guidance']::text[]),
  ('10215200', NULL, ARRAY['water','thunder']::text[]),
  ('10216200', NULL, ARRAY['grace','frost']::text[]),
  ('10218200', NULL, ARRAY['flames','guidance']::text[]),
  ('10219200', NULL, ARRAY['grace','frost']::text[]),
  ('10220200', NULL, ARRAY['flames','dragon']::text[])
) AS d(id, core_effect, ink_types)
WHERE v.id = d.id;

COMMIT;
