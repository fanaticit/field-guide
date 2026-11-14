-- Add tactical_role column to mho_builds for storing Adventurer Class (Assault, Disrupter, Support)
ALTER TABLE public.mho_builds
  ADD COLUMN IF NOT EXISTS tactical_role TEXT;

COMMENT ON COLUMN public.mho_builds.tactical_role IS 'Tactical role / Class (Assault, Disrupter, Support) chosen for Fated Adventurer or predefined for other adventurers';
