-- ============================================================
-- Migration: 20261114000001 — Add build_exceptions to mho_builds
-- Stores active build exceptions/mastery perks
-- (e.g. ["hunting_master_1"] for Proof of Mastery — Hunting Master I)
-- ============================================================

ALTER TABLE public.mho_builds
  ADD COLUMN IF NOT EXISTS build_exceptions JSONB DEFAULT '[]'::jsonb;
