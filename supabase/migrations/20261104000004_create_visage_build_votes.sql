-- ============================================================
-- Migration: 20261104000004 — user_visage_build_votes
-- One upvote per user per shared Visage build. The count is kept in
-- mho_visage_builds.upvotes (by trigger) so the list can be ranked by it.
-- Authors cannot upvote their own build.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_visage_build_votes (
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visage_build_id     UUID        NOT NULL REFERENCES public.mho_visage_builds(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, visage_build_id)
);

CREATE INDEX IF NOT EXISTS idx_visage_votes_build_id ON public.user_visage_build_votes(visage_build_id);

ALTER TABLE public.user_visage_build_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_visage_build_votes_select_own"
  ON public.user_visage_build_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_visage_build_votes_insert_own"
  ON public.user_visage_build_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.mho_visage_builds b
      WHERE b.id = visage_build_id AND b.is_published = true AND b.author_id <> auth.uid()
    )
  );

CREATE POLICY "user_visage_build_votes_delete_own"
  ON public.user_visage_build_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Keep mho_visage_builds.upvotes in sync (runs with the owner's rights; voters can't update builds)
CREATE OR REPLACE FUNCTION public.sync_visage_build_upvotes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.mho_visage_builds SET upvotes = upvotes + 1 WHERE id = NEW.visage_build_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.mho_visage_builds SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.visage_build_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS user_visage_build_votes_sync ON public.user_visage_build_votes;
CREATE TRIGGER user_visage_build_votes_sync
  AFTER INSERT OR DELETE ON public.user_visage_build_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_visage_build_upvotes();

CREATE INDEX IF NOT EXISTS idx_mho_visage_builds_upvotes ON public.mho_visage_builds(upvotes DESC);
