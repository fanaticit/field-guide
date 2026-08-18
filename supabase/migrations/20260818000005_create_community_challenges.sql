-- ============================================================
-- Migration: 20260818000005 — community_challenges + adoptions
-- Community-shared hunter challenges and personal adoption tracking.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_challenges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id           TEXT        NOT NULL CHECK (game_id IN ('mhn', 'mho')),
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  challenge_type    TEXT        NOT NULL
                    CHECK (challenge_type IN ('build', 'story', 'custom')),

  -- Optional monster this challenge involves
  target_monster_id TEXT,
  -- For build challenges: link to a community_build
  build_id          UUID        REFERENCES public.community_builds(id) ON DELETE SET NULL,
  -- Difficulty tier hint for filtering
  difficulty        TEXT        CHECK (difficulty IN ('any', 'low', 'high', 'elder', 'radiant')),

  -- Community signals
  upvotes           INT         NOT NULL DEFAULT 0,
  downvotes         INT         NOT NULL DEFAULT 0,
  -- Denormalised adoption count (kept in sync by trigger)
  adoption_count    INT         NOT NULL DEFAULT 0,

  is_published      BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_challenges_author_id    ON public.community_challenges(author_id);
CREATE INDEX idx_community_challenges_game_id      ON public.community_challenges(game_id);
CREATE INDEX idx_community_challenges_is_published ON public.community_challenges(is_published);
CREATE INDEX idx_community_challenges_type         ON public.community_challenges(challenge_type);
CREATE INDEX idx_community_challenges_monster      ON public.community_challenges(target_monster_id);

CREATE TRIGGER community_challenges_updated_at
  BEFORE UPDATE ON public.community_challenges
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── challenge_adoptions ─────────────────────────────────────
-- Tracks a hunter personally adopting / attempting a challenge.
-- One row per (challenge × user) — unique constraint enforced.

CREATE TABLE IF NOT EXISTS public.challenge_adoptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID        NOT NULL REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  adopted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  -- Optional proof notes or screenshot URL
  proof_notes   TEXT,
  proof_url     TEXT,
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX idx_challenge_adoptions_user_id      ON public.challenge_adoptions(user_id);
CREATE INDEX idx_challenge_adoptions_challenge_id ON public.challenge_adoptions(challenge_id);
CREATE INDEX idx_challenge_adoptions_status       ON public.challenge_adoptions(status);

-- ── Keep adoption_count denormalised counter in sync ────────
CREATE OR REPLACE FUNCTION public.sync_adoption_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_challenges
    SET adoption_count = adoption_count + 1
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_challenges
    SET adoption_count = GREATEST(0, adoption_count - 1)
    WHERE id = OLD.challenge_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_adoptions_sync_count
  AFTER INSERT OR DELETE ON public.challenge_adoptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_adoption_count();

-- ── Row Level Security — community_challenges ────────────────
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_challenges_select_published"
  ON public.community_challenges FOR SELECT
  USING (is_published = true OR author_id = auth.uid());

CREATE POLICY "community_challenges_insert_own"
  ON public.community_challenges FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "community_challenges_update_own"
  ON public.community_challenges FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "community_challenges_delete_own"
  ON public.community_challenges FOR DELETE
  USING (auth.uid() = author_id);

-- ── Row Level Security — challenge_adoptions ─────────────────
ALTER TABLE public.challenge_adoptions ENABLE ROW LEVEL SECURITY;

-- Adoptions are private to the adopting user
CREATE POLICY "challenge_adoptions_select_own"
  ON public.challenge_adoptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "challenge_adoptions_insert_own"
  ON public.challenge_adoptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "challenge_adoptions_update_own"
  ON public.challenge_adoptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "challenge_adoptions_delete_own"
  ON public.challenge_adoptions FOR DELETE
  USING (auth.uid() = user_id);

-- ── Voting helper ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.vote_on_challenge(
  p_challenge_id UUID,
  p_vote_type TEXT -- 'up' or 'down'
)
RETURNS VOID AS $$
BEGIN
  IF p_vote_type = 'up' THEN
    UPDATE public.community_challenges SET upvotes = upvotes + 1 WHERE id = p_challenge_id;
  ELSIF p_vote_type = 'down' THEN
    UPDATE public.community_challenges SET downvotes = downvotes + 1 WHERE id = p_challenge_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
