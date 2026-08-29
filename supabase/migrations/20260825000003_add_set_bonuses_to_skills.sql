-- ============================================================
-- Migration: 20260825000003 — add set bonus fields to skills table
-- Adds is_set_bonus and set_thresholds (e.g. [2, 4])
-- ============================================================

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS is_set_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS set_thresholds JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_skills_is_set_bonus ON public.skills(is_set_bonus);
