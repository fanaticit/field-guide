-- =============================================================
-- Migration: Create user_weapon_collection table
-- Description: Tracks hunter's collected/owned craftable equipment weapons.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_weapon_collection (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_id   TEXT NOT NULL REFERENCES public.weapons(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, weapon_id)
);

-- Indices for rapid lookup
CREATE INDEX IF NOT EXISTS idx_user_weapon_collection_user ON public.user_weapon_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_user_weapon_collection_weapon ON public.user_weapon_collection(weapon_id);

-- Enable RLS
ALTER TABLE public.user_weapon_collection ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_weapon_collection' AND policyname = 'Users can view their own weapon collection') THEN
    CREATE POLICY "Users can view their own weapon collection"
      ON public.user_weapon_collection
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_weapon_collection' AND policyname = 'Users can insert their own weapon collection') THEN
    CREATE POLICY "Users can insert their own weapon collection"
      ON public.user_weapon_collection
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_weapon_collection' AND policyname = 'Users can update their own weapon collection') THEN
    CREATE POLICY "Users can update their own weapon collection"
      ON public.user_weapon_collection
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_weapon_collection' AND policyname = 'Users can delete their own weapon collection') THEN
    CREATE POLICY "Users can delete their own weapon collection"
      ON public.user_weapon_collection
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
