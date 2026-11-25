-- ============================================================
-- Migration: 20261125000002 — site polls (one table for every poll)
--
-- Poll questions live in the code (src/data/polls.ts); this table only
-- stores votes, one row per voter per poll.
--   * voter_key: the user's id when logged in, otherwise a random id kept
--     in the visitor's browser. The unique constraint stops repeat votes.
--   * Anyone can vote; only admins can read individual votes.
--   * poll_results() returns just the counts, so voters can see results.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     TEXT        NOT NULL CHECK (char_length(poll_id) BETWEEN 1 AND 60),
  answer      TEXT        NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 40),
  voter_key   TEXT        NOT NULL CHECK (char_length(voter_key) BETWEEN 8 AND 80),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  page        TEXT        CHECK (page IS NULL OR char_length(page) <= 200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_poll_votes_voter UNIQUE (poll_id, voter_key)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can vote. Logged-in voters can only vote as themselves.
DROP POLICY IF EXISTS "poll_votes_insert_all" ON public.poll_votes;
CREATE POLICY "poll_votes_insert_all" ON public.poll_votes FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Only admins can read individual votes (for the admin Polls tab).
DROP POLICY IF EXISTS "poll_votes_select_admin" ON public.poll_votes;
CREATE POLICY "poll_votes_select_admin" ON public.poll_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "poll_votes_delete_admin" ON public.poll_votes;
CREATE POLICY "poll_votes_delete_admin" ON public.poll_votes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Vote counts for one poll — safe for everyone (no voter details).
CREATE OR REPLACE FUNCTION public.poll_results(p_poll_id TEXT)
RETURNS TABLE (answer TEXT, votes BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.answer, count(*)::bigint AS votes
  FROM public.poll_votes v
  WHERE v.poll_id = p_poll_id
  GROUP BY v.answer;
$$;

GRANT EXECUTE ON FUNCTION public.poll_results(TEXT) TO anon, authenticated;

COMMIT;
