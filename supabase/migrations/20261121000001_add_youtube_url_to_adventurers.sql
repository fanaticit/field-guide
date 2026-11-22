-- Migration: 20261121000001 — Add youtube_url to adventurers
-- Allows linking a character breakdown / guide video with optional timestamp

ALTER TABLE public.adventurers
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

COMMENT ON COLUMN public.adventurers.youtube_url IS 'Optional YouTube guide or overview URL for this adventurer.';
