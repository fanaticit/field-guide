-- ============================================================
-- Migration: 20261104000006 — Correct Ink set bonus descriptions
-- Source: import/MHO_visages copy.csv ("Set bonuses"). Fixes typos and
-- reworded text on Grace, Guidance, Protection, Resonance and Thunder.
-- ============================================================

BEGIN;

UPDATE public.skills s
SET set_thresholds = v.thresholds
FROM (VALUES
  ('ink_of_grace', '[{"pieces": 2, "description": "Ultimate charge rate +5%.", "granted_skill_id": null, "granted_skill_level": 1}, {"pieces": 4, "description": "When an adventurer grants a squad member a buff, squad damage +6.5% for 60s.", "granted_skill_id": null, "granted_skill_level": 1}]'::jsonb),
  ('ink_of_guidance', '[{"pieces": 2, "description": "Ultimate charge rate +5%.", "granted_skill_id": null, "granted_skill_level": 1}, {"pieces": 4, "description": "Within 8s after an ultimate inflicts suppression on a monster, each time the squad uses an ultimate, squad damage +2.2% for 60s, up to 3 stacks.", "granted_skill_id": null, "granted_skill_level": 1}]'::jsonb),
  ('ink_of_protection', '[{"pieces": 2, "description": "Ultimate charge rate +5%.", "granted_skill_id": null, "granted_skill_level": 1}, {"pieces": 4, "description": "When an adventurer and Buddy grant a squad member healing or shield effect, the effect +20%, squad damage +6% for 45s.", "granted_skill_id": null, "granted_skill_level": 1}]'::jsonb),
  ('ink_of_resonance', '[{"pieces": 2, "description": "Affinity +5%.", "granted_skill_id": null, "granted_skill_level": 1}, {"pieces": 4, "description": "When not the Main Adventurer, ultimate damage +32%.", "granted_skill_id": null, "granted_skill_level": 1}]'::jsonb),
  ('ink_of_thunder', '[{"pieces": 2, "description": "Thunder damage +5%.", "granted_skill_id": null, "granted_skill_level": 1}, {"pieces": 4, "description": "After dealing damage to monsters, thunder damage +5% for 12s, up to 5 stacks.", "granted_skill_id": null, "granted_skill_level": 1}]'::jsonb)
) AS v(id, thresholds)
WHERE s.id = v.id;

COMMIT;
