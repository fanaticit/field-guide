-- =============================================================
-- Migration: Create weapon_types & craftable weapons tables
-- =============================================================

-- 1. Ensure weapon_types table exists (14 core franchise types & game availability)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weapons' AND column_name = 'category'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weapons' AND column_name = 'weapon_type_id'
  ) THEN
    ALTER TABLE public.weapons RENAME TO weapon_types;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.weapon_types (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('melee', 'ranged')),
  aliases       TEXT[] NOT NULL DEFAULT '{}',
  description   TEXT NOT NULL DEFAULT '',
  special_skill TEXT NOT NULL DEFAULT '',
  styles        TEXT[] NOT NULL DEFAULT '{}',
  icon          TEXT,
  games         TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed weapon_types if empty
INSERT INTO public.weapon_types (id, name, category, aliases, description, special_skill, styles, icon, games, sort_order)
VALUES
  ('great_sword', 'Great Sword', 'melee', ARRAY['GS'], 'Massive blade with devastating charged attacks; highest single-hit damage in the game.', 'True Charged Slash', ARRAY['Surge Slash', 'Rage Slash'], '/images/weapons/great_sword.svg', ARRAY['mhn', 'mho'], 1),
  ('long_sword', 'Long Sword', 'melee', ARRAY['LS'], 'Swift katana; Spirit Gauge builds through combos and releases in a powerful finisher.', 'Spirit Helm Breaker', ARRAY['Sacred Sheath Combo', 'Spirit Reckoning'], '/images/weapons/long_sword.svg', ARRAY['mhn', 'mho'], 2),
  ('sword_shield', 'Sword & Shield', 'melee', ARRAY['SnS'], 'Versatile weapon; unique ability to use items while the weapon is drawn.', 'Perfect Rush Combo', ARRAY['Drill Slash', 'Perfect Rush'], '/images/weapons/sword_shield.svg', ARRAY['mhn'], 3),
  ('dual_blades', 'Dual Blades', 'melee', ARRAY['DB'], 'Twin blades delivering rapid multi-hits; ideal for elemental and status builds.', 'Shrouded Vault', ARRAY['Feral Demon Mode', 'Spiral Slash'], '/images/weapons/dual_blades.svg', ARRAY['mhn', 'mho'], 4),
  ('hammer', 'Hammer', 'melee', ARRAY['Ham', 'Hmr'], 'Heavy impact weapon; exceptional at knocking out and stunning monsters.', 'Spinning Bludgeon', ARRAY['Water Strike', 'Impact Crater'], '/images/weapons/hammer.svg', ARRAY['mhn'], 5),
  ('hunting_horn', 'Hunting Horn', 'melee', ARRAY['HH'], 'Support weapon that plays melodies granting powerful party-wide buffs.', 'Earthshaker', ARRAY['Fleeting Melody', 'Shockwave'], '/images/weapons/hunting_horn.svg', ARRAY['mhn'], 6),
  ('lance', 'Lance', 'melee', ARRAY['Lnc'], 'Defensive weapon combining a powerful shield with long-reach thrust attacks.', 'Charging Slash', ARRAY['Shield Tackle', 'Insta-Block'], '/images/weapons/lance.svg', ARRAY['mhn', 'mho'], 7),
  ('gunlance', 'Gunlance', 'melee', ARRAY['GL'], 'Lance with built-in explosive shells; shelling damage bypasses monster''s defence.', 'Wyvern''s Fire', ARRAY['Blast Dash', 'Guard Reload'], '/images/weapons/gunlance.svg', ARRAY['mhn'], 8),
  ('switch_axe', 'Switch Axe', 'melee', ARRAY['SA', 'Swag Axe'], 'Morphing weapon swapping between wide-sweep Axe mode and fast-hitting Sword mode.', 'Invincible Gambit', ARRAY['Elemental Burst Counter', 'Soaring Wyvern Blade'], '/images/weapons/switch_axe.svg', ARRAY['mhn'], 9),
  ('charge_blade', 'Charge Blade', 'melee', ARRAY['CB'], 'Technical weapon that charges phials in Sword mode and unleashes them in Axe mode.', 'Savage Axe Slash', ARRAY['Sword Boost', 'Axe Boost'], '/images/weapons/charge_blade.svg', ARRAY['mhn'], 10),
  ('insect_glaive', 'Insect Glaive', 'melee', ARRAY['IG'], 'Aerial weapon wielded with a Kinsect companion; extracts grant stat boosts.', 'Diving Wyvern', ARRAY[]::TEXT[], '/images/weapons/insect_glaive.svg', ARRAY['mhn'], 11),
  ('bow', 'Bow', 'ranged', ARRAY[]::TEXT[], 'Rapid multi-shot ranged weapon; coatings (Power, Poison, etc.) amplify damage types.', 'Dragon Piercer', ARRAY['Dodgebolt', 'Power Volley'], '/images/weapons/bow.svg', ARRAY['mhn', 'mho'], 12),
  ('light_bowgun', 'Light Bowgun', 'ranged', ARRAY['LBG'], 'Mobile ranged weapon with rapid fire and a wide selection of ammo types.', 'Wyvernblast Counter', ARRAY['Stepping Shot', 'Sliding Reload'], '/images/weapons/light_bowgun.svg', ARRAY['mhn'], 13),
  ('heavy_bowgun', 'Heavy Bowgun', 'ranged', ARRAY['HBG'], 'Slow but extremely powerful; capable of firing special Wyvern ammo types.', 'Wyvernheart', ARRAY['Guard Reload', 'Crouching Shot'], '/images/weapons/heavy_bowgun.svg', ARRAY['mhn', 'mho'], 14)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS & policies on weapon_types
ALTER TABLE public.weapon_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weapon_types' AND policyname = 'Public read weapon_types') THEN
    CREATE POLICY "Public read weapon_types" ON public.weapon_types FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weapon_types' AND policyname = 'Authenticated users can manage weapon_types') THEN
    CREATE POLICY "Authenticated users can manage weapon_types" ON public.weapon_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Create weapons table for individual craftable equipment weapons
CREATE TABLE IF NOT EXISTS public.weapons (
  id                  TEXT PRIMARY KEY,
  game                TEXT NOT NULL DEFAULT 'mho',
  name                TEXT NOT NULL,
  name_ja             TEXT,
  weapon_type_id      TEXT NOT NULL,
  monster_id          TEXT REFERENCES public.monsters(id) ON DELETE SET NULL,
  source_type         TEXT NOT NULL DEFAULT 'monster' CHECK (source_type IN ('monster', 'ore', 'bone', 'event', 'general')),
  element_type        TEXT NOT NULL DEFAULT 'raw' CHECK (element_type IN ('raw', 'fire', 'water', 'thunder', 'ice', 'dragon', 'poison', 'paralysis', 'blast', 'sleep')),
  element_damage      INTEGER,
  attack              INTEGER,
  affinity            INTEGER,
  defense_bonus       INTEGER,
  skills              JSONB NOT NULL DEFAULT '[]'::jsonb,
  special_skill       TEXT,
  image               TEXT,
  description         TEXT,
  notes               TEXT,
  grade               INTEGER DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices on craftable weapons
CREATE INDEX IF NOT EXISTS idx_weapons_game ON public.weapons(game);
CREATE INDEX IF NOT EXISTS idx_weapons_weapon_type ON public.weapons(weapon_type_id);
CREATE INDEX IF NOT EXISTS idx_weapons_monster ON public.weapons(monster_id);
CREATE INDEX IF NOT EXISTS idx_weapons_element ON public.weapons(element_type);
CREATE INDEX IF NOT EXISTS idx_weapons_source_type ON public.weapons(source_type);

-- Enable RLS & policies on weapons
ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weapons' AND policyname = 'Public read craftable weapons') THEN
    CREATE POLICY "Public read craftable weapons" ON public.weapons FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weapons' AND policyname = 'Authenticated users can manage craftable weapons') THEN
    CREATE POLICY "Authenticated users can manage craftable weapons" ON public.weapons FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
