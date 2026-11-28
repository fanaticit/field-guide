-- ─────────────────────────────────────────────────────────────
-- Migration: 20261128000001 — Focus project
--
-- A hunter can mark one challenge project as their focus. It is listed first
-- everywhere and the Challenges page opens on it.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.challenge_projects
  ADD COLUMN IF NOT EXISTS is_focus BOOLEAN NOT NULL DEFAULT FALSE;

-- At most one focus project per hunter
CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_projects_one_focus
  ON public.challenge_projects(user_id)
  WHERE is_focus;
