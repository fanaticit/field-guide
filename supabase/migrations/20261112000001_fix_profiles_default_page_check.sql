-- ============================================================
-- Migration: 20261112000001 — Fix profiles_default_page_check
-- Drops the restrictive check constraint on default_page so all
-- current and future startup pages can be saved without error.
-- ============================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_default_page_check;

-- Re-add constraint with all current and legacy page identifiers
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_page_check
  CHECK (default_page IN (
    'field-guide', 'home',
    'armory', 'build-planner', 'armour',
    'gallery', 'visage-set', 'visage-builder', 'visage-collection',
    'challenges', 'adventurers', 'buddies', 'weapons',
    'admin', 'settings', 'profile',
    'community-hub', 'investigation-notes'
  ));
