-- ============================================================
-- Migration: 20261105000005 — Buddy status & spoiler fields
-- Source: import/MHO_companions.csv
--   * adds status, status_reason, is_spoiler, is_debug to public.buddies
--   * gates upcoming buddies (e.g. Lynn) and debug buddies behind user spoiler preference
-- ============================================================

BEGIN;

-- 1. Add columns to public.buddies
ALTER TABLE public.buddies
  ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'in_game',
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_debug      BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.buddies DROP CONSTRAINT IF EXISTS buddies_status_check;
ALTER TABLE public.buddies ADD CONSTRAINT buddies_status_check CHECK (status IN ('in_game', 'not_in_game'));

CREATE INDEX IF NOT EXISTS idx_buddies_visible ON public.buddies(is_active, is_spoiler);

-- 2. Temporary table for buddy status updates
CREATE TEMP TABLE _buddy_status_import (
  id            TEXT PRIMARY KEY,
  status        TEXT NOT NULL,
  status_reason TEXT,
  is_spoiler    BOOLEAN NOT NULL DEFAULT FALSE,
  is_debug      BOOLEAN NOT NULL DEFAULT FALSE
) ON COMMIT DROP;

INSERT INTO _buddy_status_import (id, status, status_reason, is_spoiler, is_debug) VALUES
  ('320001', 'in_game', NULL, FALSE, FALSE),
  ('320002', 'in_game', NULL, FALSE, FALSE),
  ('320003', 'in_game', NULL, FALSE, FALSE),
  ('320004', 'in_game', NULL, FALSE, FALSE),
  ('320005', 'in_game', NULL, FALSE, FALSE),
  ('320006', 'in_game', NULL, FALSE, FALSE),
  ('320007', 'in_game', NULL, FALSE, FALSE),
  ('320008', 'in_game', NULL, FALSE, FALSE),
  ('320009', 'in_game', NULL, FALSE, FALSE),
  ('320011', 'in_game', NULL, FALSE, FALSE),
  ('320012', 'in_game', NULL, FALSE, FALSE),
  ('320013', 'in_game', NULL, FALSE, FALSE),
  ('320014', 'in_game', NULL, FALSE, FALSE),
  ('320116', 'in_game', NULL, FALSE, FALSE),
  ('320117', 'in_game', NULL, FALSE, FALSE),
  ('320126', 'in_game', NULL, FALSE, FALSE),
  ('320127', 'in_game', NULL, FALSE, FALSE),
  ('320128', 'not_in_game', 'Upcoming – Recruitment banner starts 2026-11-27', TRUE, FALSE),
  ('320027', 'in_game', NULL, FALSE, FALSE),
  ('320023', 'in_game', NULL, FALSE, FALSE),
  ('320028', 'in_game', NULL, FALSE, FALSE),
  ('320033', 'in_game', NULL, FALSE, FALSE),
  ('320037', 'in_game', NULL, FALSE, FALSE),
  ('320038', 'in_game', NULL, FALSE, FALSE),
  ('320039', 'in_game', NULL, FALSE, FALSE),
  ('320040', 'in_game', NULL, FALSE, FALSE),
  ('320041', 'in_game', NULL, FALSE, FALSE),
  ('320042', 'in_game', NULL, FALSE, FALSE),
  ('320043', 'in_game', NULL, FALSE, FALSE),
  ('320044', 'in_game', NULL, FALSE, FALSE),
  ('320053', 'in_game', NULL, FALSE, FALSE),
  ('320054', 'in_game', NULL, FALSE, FALSE),
  ('320055', 'in_game', NULL, FALSE, FALSE),
  ('320080', 'in_game', NULL, FALSE, FALSE),
  ('320081', 'in_game', NULL, FALSE, FALSE),
  ('320082', 'in_game', NULL, FALSE, FALSE),
  ('320087', 'in_game', NULL, FALSE, FALSE),
  ('320088', 'in_game', NULL, FALSE, FALSE),
  ('320089', 'in_game', NULL, FALSE, FALSE),
  ('320090', 'in_game', NULL, FALSE, FALSE),
  ('320091', 'in_game', NULL, FALSE, FALSE),
  ('320092', 'in_game', NULL, FALSE, FALSE),
  ('320998', 'not_in_game', 'Debug – not active in game (character-creation screen display cat)', TRUE, TRUE);

-- 3. Update public.buddies from import data
UPDATE public.buddies b
SET
  status        = s.status,
  status_reason = s.status_reason,
  is_spoiler    = s.is_spoiler,
  is_debug      = s.is_debug
FROM _buddy_status_import s
WHERE b.id = s.id;

COMMIT;
