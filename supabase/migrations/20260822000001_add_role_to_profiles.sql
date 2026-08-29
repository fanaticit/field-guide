-- ============================================================
-- Migration: 20260822000001 — add role to profiles
-- Adds a role column with 'member' | 'admin' values.
-- Admins can read and manage content across the platform.
-- ============================================================

-- ── Add role column ─────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'admin', 'moderator'));

-- ── Admins can update any profile (e.g. moderation) ─────────
-- Drop the existing own-only update policy and replace
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Users can update their own non-role fields
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from promoting themselves to admin
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (including role field)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Admins can delete any community content ──────────────────

-- community_builds: admin delete
CREATE POLICY "community_builds_delete_admin"
  ON public.community_builds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- community_challenges: admin delete
CREATE POLICY "community_challenges_delete_admin"
  ON public.community_challenges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- ── Helper function: is the current user an admin? ──────────
-- Used in client-side checks via RPC to avoid exposing roles
-- in raw queries.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
