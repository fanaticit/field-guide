-- ============================================================
-- Migration: 20260901000002 — Add set_variant to armour_pieces
-- Adds support for multiple armour sets per monster (e.g. Set I, Set VII, Alpha, Beta)
-- ============================================================

DO $$
BEGIN
  -- 1. Add set_variant column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'armour_pieces'
      AND column_name = 'set_variant'
  ) THEN
    ALTER TABLE public.armour_pieces 
      ADD COLUMN set_variant TEXT NOT NULL DEFAULT 'I';
  END IF;

  -- 2. Drop old unique constraint (game, monster_id, slot) if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_armour_pieces_game_monster_slot'
  ) THEN
    ALTER TABLE public.armour_pieces 
      DROP CONSTRAINT uq_armour_pieces_game_monster_slot;
  END IF;

  -- 3. Add new unique constraint (game, monster_id, set_variant, slot)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_armour_pieces_game_monster_set_slot'
  ) THEN
    ALTER TABLE public.armour_pieces 
      ADD CONSTRAINT uq_armour_pieces_game_monster_set_slot 
      UNIQUE (game, monster_id, set_variant, slot);
  END IF;

  -- 4. Create index for fast lookups
  CREATE INDEX IF NOT EXISTS idx_armour_pieces_game_monster_set 
    ON public.armour_pieces(game, monster_id, set_variant);
END $$;
