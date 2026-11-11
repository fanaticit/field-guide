-- ============================================================
-- Migration: 20261111000001 — create patch reactions table
-- Stores visitor emoji reactions per patch version.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patch_reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_version   TEXT NOT NULL,
  emoji           TEXT NOT NULL,
  count           INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_patch_reactions_patch_emoji UNIQUE (patch_version, emoji)
);

CREATE INDEX IF NOT EXISTS idx_patch_reactions_patch ON public.patch_reactions(patch_version);

ALTER TABLE public.patch_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can read reactions
CREATE POLICY "patch_reactions_select_all"
  ON public.patch_reactions FOR SELECT
  USING (true);

-- Anyone can insert new reaction row if it doesn't exist yet
CREATE POLICY "patch_reactions_insert_all"
  ON public.patch_reactions FOR INSERT
  WITH CHECK (true);

-- Anyone can update counts
CREATE POLICY "patch_reactions_update_all"
  ON public.patch_reactions FOR UPDATE
  USING (true);

-- Atomic increment helper RPC
CREATE OR REPLACE FUNCTION public.increment_patch_reaction(
  p_patch_version TEXT,
  p_emoji TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.patch_reactions (patch_version, emoji, count, updated_at)
  VALUES (p_patch_version, p_emoji, 1, now())
  ON CONFLICT (patch_version, emoji)
  DO UPDATE SET
    count = public.patch_reactions.count + 1,
    updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;
