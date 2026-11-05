-- =============================================================
-- Migration: 20261105000003 — Add rarity to user_weapon_collection
-- Description: Tracks the crafted rarity level of a user's weapon.
-- =============================================================

ALTER TABLE public.user_weapon_collection
ADD COLUMN IF NOT EXISTS rarity INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.user_weapon_collection.rarity IS 'Crafted rarity level of the weapon (e.g. 1 to 16)';
