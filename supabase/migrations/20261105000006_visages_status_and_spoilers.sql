-- ============================================================
-- Migration: 20261105000006 — Visage status & spoiler fields
-- Source: import/MHO_visages.csv
--   * adds status, status_reason, is_spoiler to public.visages
--   * gates upcoming visages behind user spoiler preference
-- ============================================================

BEGIN;

-- 1. Add columns to public.visages
ALTER TABLE public.visages
  ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'in_game',
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.visages DROP CONSTRAINT IF EXISTS visages_status_check;
ALTER TABLE public.visages ADD CONSTRAINT visages_status_check CHECK (status IN ('in_game', 'not_in_game'));

CREATE INDEX IF NOT EXISTS idx_visages_visible ON public.visages(is_active, is_spoiler);

-- 2. Populate / sanitize existing rows
UPDATE public.visages
SET
  status = COALESCE(NULLIF(status, ''), 'in_game'),
  status_reason = NULL,
  is_spoiler = COALESCE(is_spoiler, FALSE);

COMMIT;
