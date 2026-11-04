-- ============================================================
-- Migration: 20261104000007 — skills table: single game, one row per level
--   * Drops games (only MHO is supported now)
--   * max_levels JSONB per-game map -> INTEGER (highest level of the skill)
--   * Adds level (the skill level this row describes)
--   * category is now free text taken from the game data (e.g. 'Hunt (General)')
-- ============================================================

BEGIN;

DROP INDEX IF EXISTS public.idx_skills_games;
ALTER TABLE public.skills DROP COLUMN IF EXISTS games;

ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_category_check;

ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'max_levels') = 'jsonb' THEN
    ALTER TABLE public.skills ALTER COLUMN max_levels DROP DEFAULT;
    ALTER TABLE public.skills ALTER COLUMN max_levels TYPE INTEGER
      USING COALESCE((max_levels->>'mho')::INTEGER, 1);
    ALTER TABLE public.skills ALTER COLUMN max_levels SET DEFAULT 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(name);

COMMIT;
