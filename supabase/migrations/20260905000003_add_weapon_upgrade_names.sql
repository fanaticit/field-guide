-- Migration: 20260905000003 — Add weapon upgrade names and upgrade levels
-- Facilitates weapons that have a base crafted name and an upgraded name at a specific upgrade level.

DO $$
BEGIN
  -- 1. Add upgraded_name column to weapons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'weapons' 
      AND column_name = 'upgraded_name'
  ) THEN
    ALTER TABLE public.weapons 
      ADD COLUMN upgraded_name TEXT;
  END IF;

  -- 2. Add upgraded_name_ja column to weapons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'weapons' 
      AND column_name = 'upgraded_name_ja'
  ) THEN
    ALTER TABLE public.weapons 
      ADD COLUMN upgraded_name_ja TEXT;
  END IF;

  -- 3. Add upgrade_level column to weapons (level/grade/rarity at which the weapon evolves into upgraded_name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'weapons' 
      AND column_name = 'upgrade_level'
  ) THEN
    ALTER TABLE public.weapons 
      ADD COLUMN upgrade_level INTEGER;
  END IF;
END $$;

-- Indices on upgrade name and upgrade level
CREATE INDEX IF NOT EXISTS idx_weapons_upgraded_name ON public.weapons(upgraded_name);
CREATE INDEX IF NOT EXISTS idx_weapons_upgrade_level ON public.weapons(upgrade_level);
