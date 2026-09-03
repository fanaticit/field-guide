-- ============================================================
-- Migration: 20260902000005 — create_mho_builds
-- MHO-specific builds, separating them from the old MHN community_builds.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mho_builds (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  description         TEXT,

  -- ── Adventurer ─────────────────────────────────────────
  adventurer_id       TEXT        NOT NULL REFERENCES public.adventurers(id),

  -- ── Weapon ─────────────────────────────────────────────
  weapon_type_id      TEXT        NOT NULL REFERENCES public.weapon_types(id),
  weapon_id           TEXT        REFERENCES public.weapons(id),

  -- ── Armour Pieces ──────────────────────────────────────
  helm_piece_id       TEXT        REFERENCES public.armour_pieces(id),
  chest_piece_id      TEXT        REFERENCES public.armour_pieces(id),
  gloves_piece_id     TEXT        REFERENCES public.armour_pieces(id),
  waist_piece_id      TEXT        REFERENCES public.armour_pieces(id),
  greaves_piece_id    TEXT        REFERENCES public.armour_pieces(id),

  -- ── Buddy ──────────────────────────────────────────────
  buddy_id            TEXT        REFERENCES public.buddies(id),

  -- ── Visages ────────────────────────────────────────────
  core_visage_id      TEXT        REFERENCES public.visages(id),
  visage_2_id         TEXT        REFERENCES public.visages(id),
  visage_3_id         TEXT        REFERENCES public.visages(id),
  visage_4_id         TEXT        REFERENCES public.visages(id),
  visage_5_id         TEXT        REFERENCES public.visages(id),

  -- ── Community signals ──────────────────────────────────
  upvotes             INT         NOT NULL DEFAULT 0,
  downvotes           INT         NOT NULL DEFAULT 0,
  is_published        BOOLEAN     NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mho_builds_author_id    ON public.mho_builds(author_id);
CREATE INDEX idx_mho_builds_is_published ON public.mho_builds(is_published);
CREATE INDEX idx_mho_builds_weapon_type  ON public.mho_builds(weapon_type_id);
CREATE INDEX idx_mho_builds_adventurer   ON public.mho_builds(adventurer_id);

CREATE TRIGGER mho_builds_updated_at
  BEFORE UPDATE ON public.mho_builds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.mho_builds ENABLE ROW LEVEL SECURITY;

-- Published builds are readable by everyone
CREATE POLICY "mho_builds_select_published"
  ON public.mho_builds FOR SELECT
  USING (is_published = true OR author_id = auth.uid());

-- Authors can insert their own builds
CREATE POLICY "mho_builds_insert_own"
  ON public.mho_builds FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their own builds
CREATE POLICY "mho_builds_update_own"
  ON public.mho_builds FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own builds
CREATE POLICY "mho_builds_delete_own"
  ON public.mho_builds FOR DELETE
  USING (auth.uid() = author_id);

-- ── Voting helper function ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.vote_on_mho_build(
  p_build_id UUID,
  p_vote_type TEXT -- 'up' or 'down'
)
RETURNS VOID AS $$
BEGIN
  IF p_vote_type = 'up' THEN
    UPDATE public.mho_builds SET upvotes = upvotes + 1 WHERE id = p_build_id;
  ELSIF p_vote_type = 'down' THEN
    UPDATE public.mho_builds SET downvotes = downvotes + 1 WHERE id = p_build_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
