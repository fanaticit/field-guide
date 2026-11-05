-- ============================================================
-- Migration: 20261105000004 — Armour piece status & spoiler fields
-- Source: import/MHO_armour.csv
--   * adds status, status_reason, is_spoiler to public.armour_pieces
--   * gates upcoming armour behind user spoiler preference
--   * debug items are excluded from DB import
-- ============================================================

BEGIN;

-- 1. Add columns to public.armour_pieces
ALTER TABLE public.armour_pieces
  ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'in_game',
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.armour_pieces DROP CONSTRAINT IF EXISTS armour_pieces_status_check;
ALTER TABLE public.armour_pieces ADD CONSTRAINT armour_pieces_status_check CHECK (status IN ('in_game', 'not_in_game'));

CREATE INDEX IF NOT EXISTS idx_armour_pieces_visible ON public.armour_pieces(is_active, is_spoiler);

-- 2. Populate / sanitize existing rows
UPDATE public.armour_pieces
SET
  status = COALESCE(NULLIF(status, ''), 'in_game'),
  status_reason = NULL,
  is_spoiler = COALESCE(is_spoiler, FALSE);

COMMIT;
