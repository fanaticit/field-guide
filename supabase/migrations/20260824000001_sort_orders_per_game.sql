-- ============================================================
-- Migration: 20260824000001 — per-game sort orders
-- Replaces the single sort_order column with a JSONB map
-- keyed by game id: { "mhn": 10, "mho": 5 }
-- ============================================================

-- Step 1: add the new column
ALTER TABLE public.monsters
  ADD COLUMN IF NOT EXISTS sort_orders JSONB NOT NULL DEFAULT '{}';

-- Step 2: migrate existing MHN data (current sort_order was MHN only)
UPDATE public.monsters
SET sort_orders = jsonb_build_object('mhn', sort_order)
WHERE sort_order IS NOT NULL;

-- Step 3: drop the old column
ALTER TABLE public.monsters
  DROP COLUMN IF EXISTS sort_order;
