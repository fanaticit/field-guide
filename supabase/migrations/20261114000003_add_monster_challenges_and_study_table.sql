-- ============================================================
-- Migration: 20261114000003 — Add monster challenges and study table
-- Expands hunter_challenges to track Monster Study goals and creates
-- user_monster_study table for tracking monster field research progress.
-- ============================================================

ALTER TABLE public.hunter_challenges
  DROP CONSTRAINT IF EXISTS hunter_challenges_challenge_type_check;

ALTER TABLE public.hunter_challenges
  ADD CONSTRAINT hunter_challenges_challenge_type_check
  CHECK (challenge_type IN ('armour_piece', 'weapon', 'visage_set', 'adventurer', 'buddy', 'full_build', 'monster'));

CREATE TABLE IF NOT EXISTS public.user_monster_study (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monster_id          TEXT NOT NULL REFERENCES public.monsters(id) ON DELETE CASCADE,
  unlocked            BOOLEAN NOT NULL DEFAULT FALSE,
  photo_taken         BOOLEAN NOT NULL DEFAULT FALSE,
  witnessed_behavior  BOOLEAN NOT NULL DEFAULT FALSE,
  hunted_10_plus      BOOLEAN NOT NULL DEFAULT FALSE,
  finished            BOOLEAN NOT NULL DEFAULT FALSE,
  custom_tasks        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_monster_study UNIQUE (user_id, monster_id)
);

CREATE INDEX IF NOT EXISTS idx_user_monster_study_user ON public.user_monster_study(user_id);
CREATE INDEX IF NOT EXISTS idx_user_monster_study_monster ON public.user_monster_study(monster_id);

ALTER TABLE public.user_monster_study ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_monster_study' AND policyname = 'user_monster_study_select_own'
  ) THEN
    CREATE POLICY "user_monster_study_select_own" ON public.user_monster_study FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_monster_study' AND policyname = 'user_monster_study_insert_own'
  ) THEN
    CREATE POLICY "user_monster_study_insert_own" ON public.user_monster_study FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_monster_study' AND policyname = 'user_monster_study_update_own'
  ) THEN
    CREATE POLICY "user_monster_study_update_own" ON public.user_monster_study FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_monster_study' AND policyname = 'user_monster_study_delete_own'
  ) THEN
    CREATE POLICY "user_monster_study_delete_own" ON public.user_monster_study FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
