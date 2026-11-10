-- =============================================================
-- Migration: Add tier_level to user_buddy_collection
-- Description: Replaces the quantity concept with buddy Tier Level (0, 1, 2)
--              just like character insight levels.
-- =============================================================

ALTER TABLE public.user_buddy_collection
  ADD COLUMN IF NOT EXISTS tier_level SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE public.user_buddy_collection
  DROP CONSTRAINT IF EXISTS user_buddy_collection_tier_level_check;

ALTER TABLE public.user_buddy_collection
  ADD CONSTRAINT user_buddy_collection_tier_level_check
  CHECK (tier_level BETWEEN 0 AND 2);

COMMENT ON COLUMN public.user_buddy_collection.tier_level IS 'Buddy tier progression level: 0, 1, or 2 (Max)';
