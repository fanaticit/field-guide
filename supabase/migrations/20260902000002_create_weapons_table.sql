-- =============================================================
-- Migration: Create weapons table & seed 14 core weapon types
-- Description: Stores weapon types and game availability (MHN, MHO).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.weapons (
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

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_weapons_category ON public.weapons(category);
CREATE INDEX IF NOT EXISTS idx_weapons_games ON public.weapons USING GIN(games);

-- Enable RLS
ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can view active weapons, authenticated users / admins can manage
CREATE POLICY "Public read weapons"
  ON public.weapons
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert weapons"
  ON public.weapons
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update weapons"
  ON public.weapons
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete weapons"
  ON public.weapons
  FOR DELETE
  TO authenticated
  USING (true);

-- Seed initial 14 core weapon types
INSERT INTO public.weapons (id, name, category, aliases, description, special_skill, styles, icon, games, sort_order)
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
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  aliases = EXCLUDED.aliases,
  description = EXCLUDED.description,
  special_skill = EXCLUDED.special_skill,
  styles = EXCLUDED.styles,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;
