-- ============================================================
-- Migration: 20261109000001 — Create other_resources table
-- Stores non-monster resource nodes/sources for equipment (e.g. Mining Outcrops, Bonepiles)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.other_resources (
  id          TEXT        PRIMARY KEY, -- e.g. 'mining_outcrops', 'bonepiles'
  name        TEXT        NOT NULL,    -- e.g. 'Mining Outcrops', 'Bonepiles'
  icon        TEXT        NOT NULL,    -- e.g. '/images/ui/other/MapIcon_Collectible_Lode.png'
  description TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_other_resources_is_active ON public.other_resources(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS other_resources_updated_at ON public.other_resources;
CREATE TRIGGER other_resources_updated_at
  BEFORE UPDATE ON public.other_resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.other_resources ENABLE ROW LEVEL SECURITY;

-- Public read active other_resources
CREATE POLICY "other_resources_select_active"
  ON public.other_resources FOR SELECT
  USING (is_active = TRUE);

-- Admins full CRUD
CREATE POLICY "other_resources_admin_all"
  ON public.other_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed initial other resources
INSERT INTO public.other_resources (id, name, icon, sort_order)
VALUES
  (
    'mining_outcrops',
    'Mining Outcrops',
    '/images/ui/other/MapIcon_Collectible_Lode.png',
    1
  ),
  (
    'bonepiles',
    'Bonepiles',
    '/images/ui/other/MapIcon_Collectible_BoneMound.png',
    2
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
