-- ============================================================
-- Migration: 20261128000002 — Free Hunt Study count per monster
-- Hunters log how many Investigation Notes studies they've finished on a monster
-- (most come from free hunts). The Investigation Journey uses it to see when a
-- monster has enough studies to unlock the next one.
-- ============================================================

ALTER TABLE public.user_monster_study
  ADD COLUMN IF NOT EXISTS free_hunt_studies INTEGER NOT NULL DEFAULT 0
  CHECK (free_hunt_studies >= 0);
