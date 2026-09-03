-- ============================================================
-- Migration: 20260901000005 — Allow Non-Monster / Material Armour Sets
-- Removes foreign key constraint requiring monster_id to be in monsters table.
-- Allows armour sets for non-monsters (e.g. High Metal, Leather, Bone, Chainmail, Alloy, Ingot)
-- while preserving unique constraints, indexes, and full relational integrity.
-- ============================================================

DO $$
BEGIN
  -- 1. Drop foreign key constraint on monster_id if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'armour_pieces_monster_id_fkey'
      AND table_schema = 'public'
      AND table_name = 'armour_pieces'
  ) THEN
    ALTER TABLE public.armour_pieces 
      DROP CONSTRAINT armour_pieces_monster_id_fkey;
  END IF;
END $$;
