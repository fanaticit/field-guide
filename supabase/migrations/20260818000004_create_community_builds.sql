-- ============================================================
-- Migration: 20260818000004 — community_builds
-- Shared equipment loadouts (weapon + 5 armour slots).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_builds (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id             TEXT        NOT NULL CHECK (game_id IN ('mhn', 'mho')),
  title               TEXT        NOT NULL,
  description         TEXT,

  -- ── Weapon ─────────────────────────────────────────────
  weapon_type_id      TEXT        NOT NULL,
  weapon_monster_id   TEXT        NOT NULL,
  weapon_elements     TEXT[]      NOT NULL DEFAULT '{}',
  weapon_style        TEXT,

  -- ── Armour (5 slots — each stores the source monster id) ─
  helm_monster_id     TEXT,
  chest_monster_id    TEXT,
  gloves_monster_id   TEXT,
  waist_monster_id    TEXT,
  greaves_monster_id  TEXT,

  -- ── MHO-specific ───────────────────────────────────────
  -- Named Adventurer character (MHO only, null for MHN)
  adventurer_id       TEXT,

  -- ── MHN integration ────────────────────────────────────
  mhn_quest_url       TEXT,

  -- ── Community signals ──────────────────────────────────
  upvotes             INT         NOT NULL DEFAULT 0,
  downvotes           INT         NOT NULL DEFAULT 0,
  -- is_published: false = draft (author only), true = public
  is_published        BOOLEAN     NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_builds_author_id    ON public.community_builds(author_id);
CREATE INDEX idx_community_builds_game_id      ON public.community_builds(game_id);
CREATE INDEX idx_community_builds_is_published ON public.community_builds(is_published);
CREATE INDEX idx_community_builds_weapon_type  ON public.community_builds(weapon_type_id);

CREATE TRIGGER community_builds_updated_at
  BEFORE UPDATE ON public.community_builds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.community_builds ENABLE ROW LEVEL SECURITY;

-- Published builds are readable by everyone (including anonymous)
CREATE POLICY "community_builds_select_published"
  ON public.community_builds FOR SELECT
  USING (is_published = true OR author_id = auth.uid());

-- Authors can insert their own builds
CREATE POLICY "community_builds_insert_own"
  ON public.community_builds FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their own builds
CREATE POLICY "community_builds_update_own"
  ON public.community_builds FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own builds
CREATE POLICY "community_builds_delete_own"
  ON public.community_builds FOR DELETE
  USING (auth.uid() = author_id);

-- ── Voting helper function ─────────────────────────────────
-- Increments upvote or downvote counter atomically (avoids races)
CREATE OR REPLACE FUNCTION public.vote_on_build(
  p_build_id UUID,
  p_vote_type TEXT -- 'up' or 'down'
)
RETURNS VOID AS $$
BEGIN
  IF p_vote_type = 'up' THEN
    UPDATE public.community_builds SET upvotes = upvotes + 1 WHERE id = p_build_id;
  ELSIF p_vote_type = 'down' THEN
    UPDATE public.community_builds SET downvotes = downvotes + 1 WHERE id = p_build_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
