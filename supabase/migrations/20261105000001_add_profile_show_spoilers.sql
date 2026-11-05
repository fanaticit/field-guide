-- ============================================================
-- Migration: 20261105000001 — add show_spoilers to profiles
--
-- profiles.show_spoilers: whether the hunter wants to see spoiler content
-- Default is false.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_spoilers BOOLEAN NOT NULL DEFAULT false;
