-- ============================================================
-- Migration: 20261028000001 — expand default_page options
-- The startup page now maps to the current site pages (Armory, Gallery,
-- Challenges and their sub pages). Legacy values are migrated and still
-- accepted so older clients keep working.
-- ============================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_default_page_check;

UPDATE public.profiles SET default_page = 'armory' WHERE default_page = 'community-hub';
UPDATE public.profiles SET default_page = 'armour' WHERE default_page = 'investigation-notes';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_page_check
  CHECK (default_page IN (
    'field-guide', 'armory', 'build-planner', 'armour',
    'gallery', 'visage-collection',
    'challenges', 'adventurers', 'buddies', 'weapons',
    'admin', 'settings',
    'community-hub', 'investigation-notes'
  ));
