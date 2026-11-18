-- ============================================================
-- Migration: 20261118000001 — add feedback replies & user read tracking
-- Enables admins to leave in-app resolution replies for submitters
-- and allows authenticated users to view their own feedback history.
-- ============================================================

-- 1. Add reply and read status columns
ALTER TABLE public.site_feedback
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_user_read BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Index for fast lookup of unread feedback per user
CREATE INDEX IF NOT EXISTS idx_site_feedback_user_unread
  ON public.site_feedback(user_id, is_user_read)
  WHERE user_id IS NOT NULL;

-- 3. RLS: Authenticated users can view their own feedback
DROP POLICY IF EXISTS "site_feedback_select_own" ON public.site_feedback;
CREATE POLICY "site_feedback_select_own"
  ON public.site_feedback FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- 4. Secure RPC function to mark a specific feedback item as read by the user
CREATE OR REPLACE FUNCTION public.mark_user_feedback_read(p_feedback_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.site_feedback
  SET is_user_read = TRUE
  WHERE id = p_feedback_id
    AND user_id = auth.uid();
END;
$$;

-- 5. Secure RPC function to mark all feedback items as read for the current user
CREATE OR REPLACE FUNCTION public.mark_all_user_feedback_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.site_feedback
  SET is_user_read = TRUE
  WHERE user_id = auth.uid()
    AND is_user_read = FALSE;
END;
$$;
