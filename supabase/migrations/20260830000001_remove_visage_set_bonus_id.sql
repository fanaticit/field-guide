-- ============================================================
-- Migration: 20260830000001 — remove_visage_set_bonus_id_and_image_large
-- Removes set_bonus_id and image_large columns from public.visages.
-- Visages now derive set bonuses solely from possible ink_types and use only image_small for icon art.
-- ============================================================

ALTER TABLE public.visages DROP CONSTRAINT IF EXISTS visages_set_bonus_id_fkey;
DROP INDEX IF EXISTS public.idx_visages_set_bonus_id;
ALTER TABLE public.visages DROP COLUMN IF EXISTS set_bonus_id;
ALTER TABLE public.visages DROP COLUMN IF EXISTS image_large;
