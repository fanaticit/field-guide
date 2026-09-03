-- =============================================================
-- Migration: Create user_adventurer_collection table
-- Description: Enables hunters/players to track their recruited
--              MHO Adventurers / Playable Characters.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_adventurer_collection (
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adventurer_id TEXT        NOT NULL REFERENCES public.adventurers(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, adventurer_id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_adventurer_collection_user ON public.user_adventurer_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_user_adventurer_collection_adv ON public.user_adventurer_collection(adventurer_id);

-- Enable RLS
ALTER TABLE public.user_adventurer_collection ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view and manage only their own adventurer collection entries
CREATE POLICY "Users can select own adventurer collection"
  ON public.user_adventurer_collection
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adventurer collection"
  ON public.user_adventurer_collection
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adventurer collection"
  ON public.user_adventurer_collection
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own adventurer collection"
  ON public.user_adventurer_collection
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
