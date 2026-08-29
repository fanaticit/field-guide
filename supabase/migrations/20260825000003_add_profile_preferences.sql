-- ============================================================
-- Migration: 20260825000003 — add profile preferences
-- Adds default_game and default_page columns to public.profiles.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_game TEXT NOT NULL DEFAULT 'mhn'
  CHECK (default_game IN ('mhn', 'mho')),
  ADD COLUMN IF NOT EXISTS default_page TEXT NOT NULL DEFAULT 'field-guide'
  CHECK (default_page IN ('field-guide', 'build-planner', 'community-hub', 'investigation-notes', 'admin', 'settings'));
