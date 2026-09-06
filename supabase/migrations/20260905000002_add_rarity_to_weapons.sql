-- ============================================================
-- Migration: 20260905000002 — Add rarity to weapons
-- Stores the starting equipment rarity / grade of craftable weapons.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weapons'
      AND column_name = 'rarity'
  ) THEN
    ALTER TABLE public.weapons 
      ADD COLUMN rarity INT NOT NULL DEFAULT 1;

    -- Backfill from grade if available
    UPDATE public.weapons 
      SET rarity = grade 
      WHERE grade IS NOT NULL AND grade > 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_weapons_rarity ON public.weapons(rarity);
