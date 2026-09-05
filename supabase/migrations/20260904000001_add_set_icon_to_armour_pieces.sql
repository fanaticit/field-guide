-- ============================================================
-- Migration: 20260904000001 — Add set_icon to armour_pieces
-- Stores the icon / image URL for material builds and armour sets
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'armour_pieces'
      AND column_name = 'set_icon'
  ) THEN
    ALTER TABLE public.armour_pieces 
      ADD COLUMN set_icon TEXT;
  END IF;
END $$;
