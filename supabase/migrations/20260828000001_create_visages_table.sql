-- ============================================================
-- Migration: 20260828000001 — visages table (MHO Cards)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visages (
  id            TEXT        PRIMARY KEY, -- e.g. 'mernos', 'great_jagras'
  name          TEXT        NOT NULL,    -- e.g. 'Mernos'
  name_ja       TEXT,
  monster_id    TEXT,                    -- optional reference to monster slug
  monster_type  TEXT        NOT NULL DEFAULT 'small'
                CHECK (monster_type IN ('small', 'large')),
  points        INTEGER     NOT NULL DEFAULT 1,
  rarity        INTEGER     NOT NULL DEFAULT 1,
  -- Pool of 1-3 possible ink types this card can roll (e.g. '{"thunder"}', '{"fire", "thunder"}')
  ink_types     TEXT[]      NOT NULL DEFAULT '{}',
  image_large   TEXT,                    -- detailed large card art URL/path
  image_small   TEXT,                    -- compact icon URL/path for collection view
  -- Linked Set Bonus from public.skills (where is_set_bonus = true)
  set_bonus_id  TEXT        REFERENCES public.skills(id) ON DELETE SET NULL,
  core_effect   TEXT,                    -- inherent passive effect of the card
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  notes         TEXT,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_visages_is_active    ON public.visages(is_active);
CREATE INDEX IF NOT EXISTS idx_visages_monster_type ON public.visages(monster_type);
CREATE INDEX IF NOT EXISTS idx_visages_set_bonus_id ON public.visages(set_bonus_id);
CREATE INDEX IF NOT EXISTS idx_visages_ink_types    ON public.visages USING GIN(ink_types);

-- Trigger for updated_at
CREATE TRIGGER visages_updated_at
  BEFORE UPDATE ON public.visages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.visages ENABLE ROW LEVEL SECURITY;

-- Public can view active visages
CREATE POLICY "visages_select_active"
  ON public.visages FOR SELECT
  USING (is_active = TRUE);

-- Admins full access
CREATE POLICY "visages_admin_all"
  ON public.visages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 1. Insert/Update Mernos Visage Card linked to Ink of Thunder
INSERT INTO public.visages (
  id, name, monster_type, points, ink_types, set_bonus_id, is_active
) VALUES (
  'mernos',
  'Mernos',
  'small',
  1,
  ARRAY['thunder'],
  (SELECT id FROM public.skills WHERE name ILIKE '%Ink of Thunder%' OR id = 'ink_of_thunder' LIMIT 1),
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  set_bonus_id = COALESCE(EXCLUDED.set_bonus_id, public.visages.set_bonus_id),
  ink_types = EXCLUDED.ink_types;

-- 2. Populate Visage cards for all monsters currently in MHO
INSERT INTO public.visages (
  id, name, name_ja, monster_id, monster_type, points, ink_types, image_small, is_active
)
SELECT 
  m.id,
  m.name,
  m.name_ja,
  m.id,
  CASE WHEN m.tier = 'small' THEN 'small' ELSE 'large' END,
  1,
  ARRAY['thunder']::text[],
  m.icon,
  TRUE
FROM public.monsters m
WHERE 'mho' = ANY(m.games)
ON CONFLICT (id) DO NOTHING;
