-- ============================================================
-- Migration: 20260901000003 — Add set_name to armour_pieces
-- Adds custom display name support for armour sets (e.g. 'Set I', 'Set VII', 'Rathalos Alpha+')
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'armour_pieces'
      AND column_name = 'set_name'
  ) THEN
    ALTER TABLE public.armour_pieces 
      ADD COLUMN set_name TEXT;
  END IF;
END $$;
