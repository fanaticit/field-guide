-- ============================================================
-- Migration: 20261025000002 — user_visage_build_favorites
-- Allows users to favorite shared Visage Builds.
-- Used to easily filter favorites in the directory and attach
-- favorite visage sets to hunter builds.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_visage_build_favorites (
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visage_build_id     UUID        NOT NULL REFERENCES public.mho_visage_builds(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, visage_build_id)
);

CREATE INDEX IF NOT EXISTS idx_visage_favs_user_id ON public.user_visage_build_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_visage_favs_build_id ON public.user_visage_build_favorites(visage_build_id);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.user_visage_build_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_visage_build_favorites_select_own"
  ON public.user_visage_build_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_visage_build_favorites_insert_own"
  ON public.user_visage_build_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_visage_build_favorites_delete_own"
  ON public.user_visage_build_favorites FOR DELETE
  USING (auth.uid() = user_id);
