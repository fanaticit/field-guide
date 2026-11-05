-- ============================================================
-- Migration: 20261105000007 — create site feedback table
-- Stores user feedback, bug reports, and feature requests.
-- Anyone can submit (public insert); only admins/mods can read/update.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_display_name   TEXT,
  contact_info        TEXT,
  feedback_type       TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'data', 'general')),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  page_url            TEXT,
  game_context        TEXT,
  device_info         TEXT,
  status              TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'dismissed')),
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_site_feedback_status     ON public.site_feedback(status);
CREATE INDEX IF NOT EXISTS idx_site_feedback_is_read    ON public.site_feedback(is_read);
CREATE INDEX IF NOT EXISTS idx_site_feedback_created_at ON public.site_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_feedback_type       ON public.site_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_site_feedback_user_id    ON public.site_feedback(user_id);

-- ── Updated At Trigger ────────────────────────────────────────
CREATE TRIGGER site_feedback_updated_at
  BEFORE UPDATE ON public.site_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including guests / unauthenticated visitors) can submit feedback
CREATE POLICY "site_feedback_insert_all"
  ON public.site_feedback FOR INSERT
  WITH CHECK (true);

-- Only admins and moderators can read feedback
CREATE POLICY "site_feedback_select_admin"
  ON public.site_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Only admins and moderators can update feedback (status, is_read, admin_notes)
CREATE POLICY "site_feedback_update_admin"
  ON public.site_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Only admins can delete feedback
CREATE POLICY "site_feedback_delete_admin"
  ON public.site_feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
