-- ============================================================
-- Migration: 20261027000001 — adventurer rarity (SSR / SR / Rare)
-- Powers the collection status bar on the Adventurers page.
-- Stored with the same keys as visage rarities:
--   superior = SSR (Gold), epic = SR (Purple), rare = Rare (Blue)
-- NULL = not assigned yet (counted in the total only).
-- ============================================================

ALTER TABLE public.adventurers
  ADD COLUMN IF NOT EXISTS rarity TEXT
  CHECK (rarity IN ('rare', 'epic', 'superior'));

CREATE INDEX IF NOT EXISTS idx_adventurers_rarity ON public.adventurers(rarity);
