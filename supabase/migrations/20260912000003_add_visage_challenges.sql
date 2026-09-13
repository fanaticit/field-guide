-- ============================================================
-- Migration: 20260912000003 — Add visage challenges
-- Expands hunter_challenges to track MHO Visage card rarity upgrade goals (Fine -> Rare -> Epic -> Superior)
-- ============================================================

ALTER TABLE public.hunter_challenges
  ADD COLUMN IF NOT EXISTS visage_id TEXT REFERENCES public.visages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ink_type  TEXT;

CREATE INDEX IF NOT EXISTS idx_hunter_challenges_visage
  ON public.hunter_challenges(visage_id);

CREATE INDEX IF NOT EXISTS idx_hunter_challenges_visage_ink
  ON public.hunter_challenges(visage_id, ink_type);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hunter_challenge_user_visage
  ON public.hunter_challenges(user_id, visage_id, ink_type)
  WHERE visage_id IS NOT NULL;
