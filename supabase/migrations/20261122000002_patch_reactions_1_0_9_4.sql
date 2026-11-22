-- ============================================================
-- Migration: 20261122000002 — patch ratings for update 1.0.9.4
-- Adds zero-count rating rows for the new patch so the /updates/
-- page shows 0 for each emoji straight away. (The first vote would
-- also create them via increment_patch_reaction; safe to re-run.)
-- ============================================================

INSERT INTO public.patch_reactions (patch_version, emoji, count)
VALUES
  ('1.0.9.4', '🔥', 0),
  ('1.0.9.4', '👍', 0),
  ('1.0.9.4', '😐', 0),
  ('1.0.9.4', '👎', 0)
ON CONFLICT (patch_version, emoji) DO NOTHING;
