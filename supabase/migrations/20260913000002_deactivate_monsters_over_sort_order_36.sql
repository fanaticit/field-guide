-- ============================================================
-- Migration: Deactivate monsters with sort_order > 36
-- Keeps monsters in the database for reference but hides them
-- from the public active roster.
-- ============================================================

UPDATE public.monsters
SET is_active = false
WHERE sort_order > 36
RETURNING id, name, sort_order, is_active;
