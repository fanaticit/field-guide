-- ============================================================
-- Migration: 20260829000002 — user_visage_collection
-- Tracks hunters' owned Visage card collections by specific ink_type, highest rarity (Fine, Rare, Epic, Superior) and quantity (1-5+)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_visage_collection (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visage_id   TEXT        NOT NULL REFERENCES public.visages(id) ON DELETE CASCADE,
  ink_type    TEXT        NOT NULL,
  rarity      TEXT        NOT NULL CHECK (rarity IN ('fine', 'rare', 'epic', 'superior')),
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, visage_id, ink_type)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_visage_collection_user_id ON public.user_visage_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_user_visage_collection_visage_id ON public.user_visage_collection(visage_id);
CREATE INDEX IF NOT EXISTS idx_user_visage_collection_ink_type ON public.user_visage_collection(ink_type);

-- Trigger for updated_at
CREATE TRIGGER user_visage_collection_updated_at
  BEFORE UPDATE ON public.user_visage_collection
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security
ALTER TABLE public.user_visage_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_visage_collection_select_own"
  ON public.user_visage_collection FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_visage_collection_insert_own"
  ON public.user_visage_collection FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_visage_collection_update_own"
  ON public.user_visage_collection FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_visage_collection_delete_own"
  ON public.user_visage_collection FOR DELETE
  USING (auth.uid() = user_id);
