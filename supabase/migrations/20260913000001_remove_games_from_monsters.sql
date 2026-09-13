-- ============================================================
-- Migration: 20260913000001 — Remove games and sort_orders from monsters
-- Replaces per-game sort_orders JSONB with a standard sort_order integer column,
-- and drops the multi-game assignment column.
-- ============================================================

-- 1. Ensure sort_order integer column exists
ALTER TABLE public.monsters
  ADD COLUMN IF NOT EXISTS sort_order INT;

-- 2. Migrate existing sort order values from JSONB sort_orders (prioritizing mho, then mhn)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'monsters' AND column_name = 'sort_orders'
  ) THEN
    UPDATE public.monsters
    SET sort_order = COALESCE(
      (sort_orders->>'mho')::int,
      (sort_orders->>'mhn')::int,
      999
    )
    WHERE sort_order IS NULL;
  END IF;
END $$;

-- 3. Drop legacy index on games
DROP INDEX IF EXISTS public.idx_monsters_games;

-- 4. Drop sort_orders and games columns from monsters table
ALTER TABLE public.monsters
  DROP COLUMN IF EXISTS sort_orders,
  DROP COLUMN IF EXISTS games;

-- 5. Add index on sort_order for fast sorting
CREATE INDEX IF NOT EXISTS idx_monsters_sort_order ON public.monsters(sort_order);
