-- Add miniature_crown and giant_crown columns to user_monster_study
ALTER TABLE public.user_monster_study
  ADD COLUMN IF NOT EXISTS miniature_crown BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS giant_crown BOOLEAN NOT NULL DEFAULT FALSE;
