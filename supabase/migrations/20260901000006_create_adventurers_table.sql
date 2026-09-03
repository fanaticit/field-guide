-- ============================================================
-- Migration: 20260901000006 — adventurers table (MHO Adventurers)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.adventurers (
  id                      TEXT        PRIMARY KEY, -- e.g. 'main_character', 'ouyang_varen'
  name                    TEXT        NOT NULL,    -- e.g. 'Player Character', 'Ouyang Varen'
  name_ja                 TEXT,
  image                   TEXT,                    -- Portrait image URL from storage or static assets
  is_default              BOOLEAN     NOT NULL DEFAULT FALSE, -- True for the customizable Player Character
  weapon_type             TEXT,                    -- Main / active weapon type (e.g. 'sword_shield', 'great_sword', etc.)
  allowed_weapon_types    TEXT[]      DEFAULT '{}', -- For default character or multi-weapon characters
  element_specialization  TEXT,                    -- e.g. 'fire', 'water', 'thunder', 'ice', 'dragon', 'poison', 'sleep', 'paralysis', 'blast', 'raw'
  role                    TEXT        NOT NULL DEFAULT 'Assault'
                          CHECK (role IN ('Disrupter', 'Disruptor', 'Assault', 'Support')),
  description             TEXT,
  notes                   TEXT,
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order              INTEGER     NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_adventurers_is_active  ON public.adventurers(is_active);
CREATE INDEX IF NOT EXISTS idx_adventurers_is_default ON public.adventurers(is_default);
CREATE INDEX IF NOT EXISTS idx_adventurers_role       ON public.adventurers(role);
CREATE INDEX IF NOT EXISTS idx_adventurers_element    ON public.adventurers(element_specialization);
CREATE INDEX IF NOT EXISTS idx_adventurers_weapon     ON public.adventurers(weapon_type);

-- Trigger for updated_at
CREATE TRIGGER adventurers_updated_at
  BEFORE UPDATE ON public.adventurers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.adventurers ENABLE ROW LEVEL SECURITY;

-- Public read active adventurers
CREATE POLICY "adventurers_select_active"
  ON public.adventurers FOR SELECT
  USING (is_active = TRUE);

-- Admins full CRUD
CREATE POLICY "adventurers_admin_all"
  ON public.adventurers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage bucket for adventurer portraits
INSERT INTO storage.buckets (id, name, public)
VALUES ('adventurers', 'adventurers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Adventurers Storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'adventurers');

CREATE POLICY "Admin All Adventurers Storage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'adventurers' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Initial Seeds
INSERT INTO public.adventurers (
  id, name, name_ja, is_default, weapon_type, allowed_weapon_types, element_specialization, role, description, sort_order
) VALUES
(
  'main_character',
  'Player Hunter',
  'ハンター',
  TRUE,
  'sword_shield',
  ARRAY['great_sword', 'long_sword', 'sword_shield', 'dual_blades', 'hammer', 'hunting_horn', 'lance', 'gunlance', 'switch_axe', 'charge_blade', 'insect_glaive', 'bow', 'light_bowgun', 'heavy_bowgun'],
  'raw',
  'Assault',
  'Your custom adventurer avatar in Monster Hunter Outlanders. Proficient in all weapon disciplines and adaptable to any combat scenario.',
  0
),
(
  'ouyang_varen',
  'Ouyang Varen',
  'オウヤン・ヴァレン',
  FALSE,
  'long_sword',
  ARRAY['long_sword'],
  'fire',
  'Assault',
  'A skilled hunter native to Aesoland. The primary protagonist featured in Monster Hunter Outlanders.',
  1
)
ON CONFLICT (id) DO NOTHING;
