-- ============================================================
-- Migration: 20261028000002 — admin_list_users
-- Admin-only RPC returning every user with their last sign-in.
-- last_sign_in_at lives in auth.users, which is not readable
-- by clients, so this runs as SECURITY DEFINER and checks the
-- caller's role itself.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id              UUID,
  username        TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  email           TEXT,
  role            TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    u.email::TEXT,
    p.role,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY u.last_sign_in_at DESC NULLS LAST, p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
