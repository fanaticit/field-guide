-- ============================================================
-- Migration: 20260913000003 — Remove MHN from weapons & weapon_types
-- Ensures all weapons and weapon types are dedicated to Monster Hunter Outlanders (MHO).
-- ============================================================

-- 1. Remove any user challenges referencing non-MHO / MHN weapons
DELETE FROM public.hunter_challenges
WHERE game != 'mho' OR (weapon_id IS NOT NULL AND weapon_id IN (
  SELECT id FROM public.weapons WHERE game != 'mho'
));

-- 2. Remove user weapon collections for non-MHO weapons
DELETE FROM public.user_weapon_collection
WHERE weapon_id IN (
  SELECT id FROM public.weapons WHERE game != 'mho'
);

-- 3. Nullify or clean up mho_builds pointing to non-MHO weapons
UPDATE public.mho_builds
SET weapon_id = NULL
WHERE weapon_id IN (
  SELECT id FROM public.weapons WHERE game != 'mho'
);

-- 4. Delete non-MHO weapons from public.weapons table
DELETE FROM public.weapons
WHERE game != 'mho';

-- 5. Ensure all remaining weapons have game explicitly set to 'mho' and set column default
UPDATE public.weapons
SET game = 'mho'
WHERE game IS NULL OR game != 'mho';

ALTER TABLE public.weapons
  ALTER COLUMN game SET DEFAULT 'mho';

-- 6. Update weapon_types to only contain 'mho' in the games array
UPDATE public.weapon_types
SET games = ARRAY['mho']
WHERE games IS NULL OR games != ARRAY['mho'];
