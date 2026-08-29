-- ============================================================
-- Seed: set fanaticit@gmail.com as admin
-- Run after migrations. Safe to re-run (idempotent).
-- ============================================================

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'fanaticit@gmail.com'
  LIMIT 1
);

-- Confirm
SELECT id, username, display_name, role
FROM public.profiles
WHERE role = 'admin';
