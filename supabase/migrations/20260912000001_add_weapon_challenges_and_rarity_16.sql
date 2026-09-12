-- ============================================================
-- Migration: 20260912000001 — Add weapon challenges and Rarity 16 support
-- Expands hunter_challenges to track weapons with starting rarity and R16 max.
-- ============================================================

-- 1. Add weapon-specific fields to hunter_challenges
ALTER TABLE public.hunter_challenges
  ADD COLUMN IF NOT EXISTS weapon_id       TEXT REFERENCES public.weapons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS weapon_type_id  TEXT,
  ADD COLUMN IF NOT EXISTS element_type     TEXT,
  ADD COLUMN IF NOT EXISTS special_skill    TEXT;

-- Update max_rarity default to 16
ALTER TABLE public.hunter_challenges
  ALTER COLUMN max_rarity SET DEFAULT 16;

-- Update existing default 12 max_rarity rows to 16 if desired
UPDATE public.hunter_challenges
  SET max_rarity = 16
  WHERE max_rarity = 12;

-- 2. Indices for weapon challenges
CREATE INDEX IF NOT EXISTS idx_hunter_challenges_weapon
  ON public.hunter_challenges(weapon_id);

-- 3. Unique index for user weapon challenges
CREATE UNIQUE INDEX IF NOT EXISTS uq_hunter_challenge_user_weapon
  ON public.hunter_challenges(user_id, weapon_id)
  WHERE weapon_id IS NOT NULL;
