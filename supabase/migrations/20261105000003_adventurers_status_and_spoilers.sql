-- ============================================================
-- Migration: 20261105000003 — Adventurer status & spoiler fields
-- Source: import/MHO_adventurers.csv
--   * adds status, status_reason, is_spoiler, is_debug to public.adventurers
--   * gates upcoming adventurers (e.g. Stylia) behind user spoiler preference
-- ============================================================

BEGIN;

-- 1. Add columns to public.adventurers
ALTER TABLE public.adventurers
  ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'in_game',
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_debug      BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.adventurers DROP CONSTRAINT IF EXISTS adventurers_status_check;
ALTER TABLE public.adventurers ADD CONSTRAINT adventurers_status_check CHECK (status IN ('in_game', 'not_in_game'));

CREATE INDEX IF NOT EXISTS idx_adventurers_visible ON public.adventurers(is_active, is_spoiler);

-- 2. Temporary table for adventurer status updates
CREATE TEMP TABLE _adv_status_import (
  id            TEXT PRIMARY KEY,
  status        TEXT NOT NULL,
  status_reason TEXT,
  is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE,
  is_debug      BOOLEAN NOT NULL DEFAULT FALSE
) ON COMMIT DROP;

INSERT INTO _adv_status_import (id, status, status_reason, is_spoiler, is_debug) VALUES
  ('101001', 'in_game', NULL, FALSE, FALSE),
  ('101003', 'in_game', NULL, FALSE, FALSE),
  ('101002', 'in_game', NULL, FALSE, FALSE),
  ('102002', 'in_game', NULL, FALSE, FALSE),
  ('102004', 'in_game', NULL, FALSE, FALSE),
  ('104001', 'in_game', NULL, FALSE, FALSE),
  ('104002', 'in_game', NULL, FALSE, FALSE),
  ('104004', 'in_game', NULL, FALSE, FALSE),
  ('107001', 'in_game', NULL, FALSE, FALSE),
  ('113001', 'in_game', NULL, FALSE, FALSE),
  ('114002', 'in_game', NULL, FALSE, FALSE),
  ('114003', 'in_game', NULL, FALSE, FALSE),
  ('114004', 'not_in_game', 'Upcoming – Recruitment banner starts 2026-11-27', TRUE, FALSE),
  ('107002', 'in_game', NULL, FALSE, FALSE),
  ('105001', 'in_game', NULL, FALSE, FALSE);

-- 3. Update public.adventurers from import data
UPDATE public.adventurers a
SET
  status        = s.status,
  status_reason = s.status_reason,
  is_spoiler    = s.is_spoiler,
  is_debug      = s.is_debug
FROM _adv_status_import s
WHERE a.id = s.id;

-- Ensure default character is always marked in_game, not spoiler, and not debug
UPDATE public.adventurers
SET status = 'in_game', status_reason = NULL, is_spoiler = FALSE, is_debug = FALSE
WHERE is_default = TRUE;

COMMIT;
