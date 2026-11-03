-- ============================================================
-- Migration: 20261101000001 — adventurer insight levels + panel background
--
-- 1. adventurers.background_image: large image used as the background of the
--    adventurer information panel (the existing `image` stays the portrait).
-- 2. user_adventurer_collection.insight_level: 1-7 per recruited adventurer.
--    Level 7 is displayed as "Max".
--
-- Adventurer challenges reuse hunter_challenges.current_rarity / max_rarity
-- as the current / target insight level (0 = not recruited yet,
-- max_rarity 1 = "recruit only"), so no change is needed there.
-- ============================================================

ALTER TABLE public.adventurers
  ADD COLUMN IF NOT EXISTS background_image TEXT;

ALTER TABLE public.user_adventurer_collection
  ADD COLUMN IF NOT EXISTS insight_level SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.user_adventurer_collection
  DROP CONSTRAINT IF EXISTS user_adventurer_collection_insight_level_check;

ALTER TABLE public.user_adventurer_collection
  ADD CONSTRAINT user_adventurer_collection_insight_level_check
  CHECK (insight_level BETWEEN 1 AND 7);
