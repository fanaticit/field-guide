-- ============================================================
-- Migration: 20260830000001 — buddies table (MHO Companions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.buddies (
  id            TEXT        PRIMARY KEY, -- e.g. 'palico_hero', 'grimalkyne_scout'
  name          TEXT        NOT NULL,    -- e.g. 'Palico Hero'
  name_ja       TEXT,
  tier          TEXT        NOT NULL DEFAULT 'R'
                CHECK (tier IN ('R', 'SR', 'SSR')),
  role          TEXT        NOT NULL DEFAULT 'Assault'
                CHECK (role IN ('Assault', 'Disruptor', 'Support')),
  core_passive  TEXT,                    -- Core passive ability text description
  image         TEXT,                    -- image/portrait URL from Supabase storage or static assets
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  notes         TEXT,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_buddies_is_active ON public.buddies(is_active);
CREATE INDEX IF NOT EXISTS idx_buddies_tier      ON public.buddies(tier);
CREATE INDEX IF NOT EXISTS idx_buddies_role      ON public.buddies(role);

-- Trigger for updated_at
CREATE TRIGGER buddies_updated_at
  BEFORE UPDATE ON public.buddies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;

-- Public read active buddies
CREATE POLICY "buddies_select_active"
  ON public.buddies FOR SELECT
  USING (is_active = TRUE);

-- Admins full CRUD
CREATE POLICY "buddies_admin_all"
  ON public.buddies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage bucket for buddy portraits
INSERT INTO storage.buckets (id, name, public)
VALUES ('buddies', 'buddies', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Buddies Storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'buddies');

CREATE POLICY "Admin All Buddies Storage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'buddies' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
