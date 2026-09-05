-- ============================================================
-- Migration: 20260905000001 — Add rarity to armour_pieces
-- Stores the starting equipment rarity / grade of the armour set piece.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'armour_pieces'
      AND column_name = 'rarity'
  ) THEN
    ALTER TABLE public.armour_pieces 
      ADD COLUMN rarity INT NOT NULL DEFAULT 1;
  END IF;
END $$;
