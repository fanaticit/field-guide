-- ============================================================
-- Migration: 20261111000002 — Add youtube_url to mho_builds
-- Stores an optional YouTube video link for a build showcase/guide
-- ============================================================

ALTER TABLE public.mho_builds
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;
