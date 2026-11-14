-- ============================================================
-- Migration: 20261114000004 — Create monster_levels and monster_hitzones
-- Stores health, attack, suggested hunt power, and hitzone vulnerabilities per monster part.
-- ============================================================

-- Ensure Radiant Gajau exists
INSERT INTO public.monsters (
  id, name, species, tier, elements, weaknesses, is_variant, is_radiant, parent_id, is_active, icon, sketch
) VALUES (
  '202910', 'Radiant Gajau', 'piscine_wyvern', 'small', '{fire}', '{dragon,water}', FALSE, TRUE, '202901', TRUE,
  '/images/monsters/MonsterIcon_Gajau_LightingStone.png',
  '/images/sketch/SmallMonster/Gajau/Sketch_Gajau_Coloured.png'
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.monster_levels (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monster_id           TEXT NOT NULL REFERENCES public.monsters(id) ON DELETE CASCADE,
  monster_name         TEXT,
  content              TEXT NOT NULL,
  hunt_id              TEXT,
  hunt_difficulty      INTEGER,
  monster_level        INTEGER,
  suggested_hunt_power INTEGER,
  health               INTEGER NOT NULL DEFAULT 0,
  attack               INTEGER NOT NULL DEFAULT 0,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monster_levels_monster_id ON public.monster_levels(monster_id);
CREATE INDEX IF NOT EXISTS idx_monster_levels_content ON public.monster_levels(content);

ALTER TABLE public.monster_levels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'monster_levels' AND policyname = 'monster_levels_select'
  ) THEN
    CREATE POLICY "monster_levels_select" ON public.monster_levels FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'monster_levels' AND policyname = 'monster_levels_admin'
  ) THEN
    CREATE POLICY "monster_levels_admin" ON public.monster_levels FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.monster_hitzones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monster_id       TEXT NOT NULL REFERENCES public.monsters(id) ON DELETE CASCADE,
  monster_name     TEXT,
  part             TEXT NOT NULL,
  state            TEXT,
  cut              INTEGER NOT NULL DEFAULT 0,
  impact           INTEGER NOT NULL DEFAULT 0,
  shot             INTEGER NOT NULL DEFAULT 0,
  fire             INTEGER NOT NULL DEFAULT 0,
  water            INTEGER NOT NULL DEFAULT 0,
  thunder          INTEGER NOT NULL DEFAULT 0,
  ice              INTEGER NOT NULL DEFAULT 0,
  dragon           INTEGER NOT NULL DEFAULT 0,
  weak_point_stars INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monster_hitzones_monster_id ON public.monster_hitzones(monster_id);

ALTER TABLE public.monster_hitzones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'monster_hitzones' AND policyname = 'monster_hitzones_select'
  ) THEN
    CREATE POLICY "monster_hitzones_select" ON public.monster_hitzones FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'monster_hitzones' AND policyname = 'monster_hitzones_admin'
  ) THEN
    CREATE POLICY "monster_hitzones_admin" ON public.monster_hitzones FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;
