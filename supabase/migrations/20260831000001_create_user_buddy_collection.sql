-- =============================================================
-- Migration: Create user_buddy_collection table
-- Description: Enables hunters/players to track their owned MHO
--              Buddy companions and their quantities (1 to 5+).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_buddy_collection (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_id    TEXT        NOT NULL REFERENCES public.buddies(id) ON DELETE CASCADE,
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, buddy_id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_buddy_collection_user ON public.user_buddy_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_user_buddy_collection_buddy ON public.user_buddy_collection(buddy_id);

-- Enable RLS
ALTER TABLE public.user_buddy_collection ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view and manage only their own buddy collection entries
CREATE POLICY "Users can select own buddy collection"
  ON public.user_buddy_collection
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own buddy collection"
  ON public.user_buddy_collection
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buddy collection"
  ON public.user_buddy_collection
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own buddy collection"
  ON public.user_buddy_collection
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
