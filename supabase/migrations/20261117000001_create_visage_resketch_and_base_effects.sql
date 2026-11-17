-- ============================================================
-- Migration: 20261117000001 — Create Visage Resketch and Base Effects Tables
-- Sources:
--   import/MHO_visage_base_effects.json
--   import/MHO_visage_resketch.json
--   import/MHO_visages.json
-- ============================================================

BEGIN;

-- 1. Visage Base Effects Table
CREATE TABLE IF NOT EXISTS public.visage_base_effects (
  entry_id INTEGER PRIMARY KEY,
  pool_id INTEGER NOT NULL,
  quality TEXT NOT NULL,
  monsters TEXT[] NOT NULL DEFAULT '{}',
  effect TEXT NOT NULL,
  tier INTEGER NOT NULL,
  effect_chance TEXT NOT NULL,
  tier_chance TEXT NOT NULL,
  overall_chance TEXT NOT NULL,
  values_by_level TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visage_base_effects_pool_id ON public.visage_base_effects (pool_id);
CREATE INDEX IF NOT EXISTS idx_visage_base_effects_quality ON public.visage_base_effects (quality);
CREATE INDEX IF NOT EXISTS idx_visage_base_effects_effect ON public.visage_base_effects (effect);

ALTER TABLE public.visage_base_effects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for visage_base_effects" ON public.visage_base_effects;
CREATE POLICY "Public read access for visage_base_effects" ON public.visage_base_effects FOR SELECT USING (true);

-- 2. Visage Resketch Slots Table
CREATE TABLE IF NOT EXISTS public.visage_resketch_slots (
  id SERIAL PRIMARY KEY,
  quality TEXT NOT NULL,
  slot INTEGER NOT NULL,
  unlock_level INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_count INTEGER NOT NULL,
  zenny INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quality, slot)
);

ALTER TABLE public.visage_resketch_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for visage_resketch_slots" ON public.visage_resketch_slots;
CREATE POLICY "Public read access for visage_resketch_slots" ON public.visage_resketch_slots FOR SELECT USING (true);

-- 3. Visage Resketch Roll Pool Table
CREATE TABLE IF NOT EXISTS public.visage_resketch_pool (
  entry_id INTEGER PRIMARY KEY,
  quality TEXT NOT NULL,
  effect TEXT NOT NULL,
  roll_quality TEXT NOT NULL,
  effect_chance TEXT NOT NULL,
  roll_quality_chance TEXT NOT NULL,
  overall_chance TEXT NOT NULL,
  values TEXT[] NOT NULL DEFAULT '{}',
  value_chances TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visage_resketch_pool_quality ON public.visage_resketch_pool (quality);
CREATE INDEX IF NOT EXISTS idx_visage_resketch_pool_effect ON public.visage_resketch_pool (effect);

ALTER TABLE public.visage_resketch_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for visage_resketch_pool" ON public.visage_resketch_pool;
CREATE POLICY "Public read access for visage_resketch_pool" ON public.visage_resketch_pool FOR SELECT USING (true);

-- 4. Add base_effect_pools column to public.visages
ALTER TABLE public.visages ADD COLUMN IF NOT EXISTS base_effect_pools JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 5. Seed Data

-- Clear existing data if re-running
TRUNCATE TABLE public.visage_base_effects RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.visage_resketch_slots RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.visage_resketch_pool RESTART IDENTITY CASCADE;

INSERT INTO public.visage_base_effects 
  (entry_id, pool_id, quality, monsters, effect, tier, effect_chance, tier_chance, overall_chance, values_by_level)
VALUES
(1001, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 1, '50.0%', '40%', '20.00%', ARRAY['0.88%', '0.98%', '1.08%', '1.18%', '1.28%', '1.38%', '1.48%', '1.58%', '1.68%', '1.78%']::text[]),
(1003, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 1, '50.0%', '40%', '20.00%', ARRAY['0.9%', '1%', '1.1%', '1.2%', '1.3%', '1.4%', '1.5%', '1.6%', '1.7%', '1.8%']::text[]),
(1008, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 2, '50.0%', '30%', '15.00%', ARRAY['1.13%', '1.26%', '1.39%', '1.52%', '1.65%', '1.78%', '1.91%', '2.04%', '2.17%', '2.3%']::text[]),
(1010, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 2, '50.0%', '30%', '15.00%', ARRAY['1.16%', '1.29%', '1.42%', '1.55%', '1.68%', '1.81%', '1.94%', '2.07%', '2.2%', '2.33%']::text[]),
(1015, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 3, '50.0%', '20%', '10.00%', ARRAY['1.38%', '1.53%', '1.68%', '1.83%', '1.98%', '2.13%', '2.28%', '2.43%', '2.58%', '2.73%']::text[]),
(1017, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 3, '50.0%', '20%', '10.00%', ARRAY['1.42%', '1.58%', '1.74%', '1.9%', '2.06%', '2.22%', '2.38%', '2.54%', '2.7%', '2.86%']::text[]),
(1022, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 4, '50.0%', '10%', '5.00%', ARRAY['1.75%', '1.94%', '2.13%', '2.32%', '2.51%', '2.7%', '2.89%', '3.08%', '3.27%', '3.46%']::text[]),
(1024, 101, 'Rare', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 4, '50.0%', '10%', '5.00%', ARRAY['1.81%', '2.01%', '2.21%', '2.41%', '2.61%', '2.81%', '3.01%', '3.21%', '3.41%', '3.61%']::text[]),
(1004, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 1, '50.0%', '40%', '20.00%', ARRAY['0.84%', '0.93%', '1.02%', '1.11%', '1.2%', '1.29%', '1.38%', '1.47%', '1.56%', '1.65%']::text[]),
(1006, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 1, '50.0%', '40%', '20.00%', ARRAY['1.22%', '1.36%', '1.5%', '1.64%', '1.78%', '1.92%', '2.06%', '2.2%', '2.34%', '2.48%']::text[]),
(1011, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 2, '50.0%', '30%', '15.00%', ARRAY['1.07%', '1.19%', '1.31%', '1.43%', '1.55%', '1.67%', '1.79%', '1.91%', '2.03%', '2.15%']::text[]),
(1013, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 2, '50.0%', '30%', '15.00%', ARRAY['1.57%', '1.74%', '1.91%', '2.08%', '2.25%', '2.42%', '2.59%', '2.76%', '2.93%', '3.1%']::text[]),
(1018, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 3, '50.0%', '20%', '10.00%', ARRAY['1.31%', '1.46%', '1.61%', '1.76%', '1.91%', '2.06%', '2.21%', '2.36%', '2.51%', '2.66%']::text[]),
(1020, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 3, '50.0%', '20%', '10.00%', ARRAY['1.92%', '2.13%', '2.34%', '2.55%', '2.76%', '2.97%', '3.18%', '3.39%', '3.6%', '3.81%']::text[]),
(1025, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 4, '50.0%', '10%', '5.00%', ARRAY['1.67%', '1.86%', '2.05%', '2.24%', '2.43%', '2.62%', '2.81%', '3%', '3.19%', '3.38%']::text[]),
(1027, 102, 'Rare', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 4, '50.0%', '10%', '5.00%', ARRAY['2.44%', '2.71%', '2.98%', '3.25%', '3.52%', '3.79%', '4.06%', '4.33%', '4.6%', '4.87%']::text[]),
(1002, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 1, '33.3%', '40%', '13.33%', ARRAY['0.46%', '0.51%', '0.56%', '0.61%', '0.66%', '0.71%', '0.76%', '0.81%', '0.86%', '0.91%']::text[]),
(1005, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 1, '33.3%', '40%', '13.33%', ARRAY['0.45%', '0.5%', '0.55%', '0.6%', '0.65%', '0.7%', '0.75%', '0.8%', '0.85%', '0.9%']::text[]),
(1007, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 1, '33.3%', '40%', '13.33%', ARRAY['0.78%', '0.87%', '0.96%', '1.05%', '1.14%', '1.23%', '1.32%', '1.41%', '1.5%', '1.59%']::text[]),
(1009, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 2, '33.3%', '30%', '10.00%', ARRAY['0.59%', '0.66%', '0.73%', '0.8%', '0.87%', '0.94%', '1.01%', '1.08%', '1.15%', '1.22%']::text[]),
(1012, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 2, '33.3%', '30%', '10.00%', ARRAY['0.58%', '0.64%', '0.7%', '0.76%', '0.82%', '0.88%', '0.94%', '1%', '1.06%', '1.12%']::text[]),
(1014, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 2, '33.3%', '30%', '10.00%', ARRAY['1%', '1.11%', '1.22%', '1.33%', '1.44%', '1.55%', '1.66%', '1.77%', '1.88%', '1.99%']::text[]),
(1016, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 3, '33.3%', '20%', '6.67%', ARRAY['0.72%', '0.8%', '0.88%', '0.96%', '1.04%', '1.12%', '1.2%', '1.28%', '1.36%', '1.44%']::text[]),
(1019, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 3, '33.3%', '20%', '6.67%', ARRAY['0.71%', '0.79%', '0.87%', '0.95%', '1.03%', '1.11%', '1.19%', '1.27%', '1.35%', '1.43%']::text[]),
(1021, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 3, '33.3%', '20%', '6.67%', ARRAY['1.22%', '1.36%', '1.5%', '1.64%', '1.78%', '1.92%', '2.06%', '2.2%', '2.34%', '2.48%']::text[]),
(1023, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 4, '33.3%', '10%', '3.33%', ARRAY['0.92%', '1.02%', '1.12%', '1.22%', '1.32%', '1.42%', '1.52%', '1.62%', '1.72%', '1.82%']::text[]),
(1026, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 4, '33.3%', '10%', '3.33%', ARRAY['0.9%', '1%', '1.1%', '1.2%', '1.3%', '1.4%', '1.5%', '1.6%', '1.7%', '1.8%']::text[]),
(1028, 103, 'Rare', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 4, '33.3%', '10%', '3.33%', ARRAY['1.55%', '1.72%', '1.89%', '2.06%', '2.23%', '2.4%', '2.57%', '2.74%', '2.91%', '3.08%']::text[]),
(1029, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 1, '50.0%', '40%', '20.00%', ARRAY['0.88%', '0.98%', '1.08%', '1.18%', '1.28%', '1.38%', '1.48%', '1.58%', '1.68%', '1.78%']::text[]),
(1031, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 1, '50.0%', '40%', '20.00%', ARRAY['0.9%', '1%', '1.1%', '1.2%', '1.3%', '1.4%', '1.5%', '1.6%', '1.7%', '1.8%']::text[]),
(1036, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 2, '50.0%', '30%', '15.00%', ARRAY['1.13%', '1.26%', '1.39%', '1.52%', '1.65%', '1.78%', '1.91%', '2.04%', '2.17%', '2.3%']::text[]),
(1038, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 2, '50.0%', '30%', '15.00%', ARRAY['1.16%', '1.29%', '1.42%', '1.55%', '1.68%', '1.81%', '1.94%', '2.07%', '2.2%', '2.33%']::text[]),
(1043, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 3, '50.0%', '20%', '10.00%', ARRAY['1.38%', '1.53%', '1.68%', '1.83%', '1.98%', '2.13%', '2.28%', '2.43%', '2.58%', '2.73%']::text[]),
(1045, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 3, '50.0%', '20%', '10.00%', ARRAY['1.42%', '1.58%', '1.74%', '1.9%', '2.06%', '2.22%', '2.38%', '2.54%', '2.7%', '2.86%']::text[]),
(1050, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 4, '50.0%', '10%', '5.00%', ARRAY['1.75%', '1.94%', '2.13%', '2.32%', '2.51%', '2.7%', '2.89%', '3.08%', '3.27%', '3.46%']::text[]),
(1052, 104, 'Epic', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 4, '50.0%', '10%', '5.00%', ARRAY['1.81%', '2.01%', '2.21%', '2.41%', '2.61%', '2.81%', '3.01%', '3.21%', '3.41%', '3.61%']::text[]),
(1032, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 1, '50.0%', '40%', '20.00%', ARRAY['0.84%', '0.93%', '1.02%', '1.11%', '1.2%', '1.29%', '1.38%', '1.47%', '1.56%', '1.65%']::text[]),
(1034, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 1, '50.0%', '40%', '20.00%', ARRAY['1.22%', '1.36%', '1.5%', '1.64%', '1.78%', '1.92%', '2.06%', '2.2%', '2.34%', '2.48%']::text[]),
(1039, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 2, '50.0%', '30%', '15.00%', ARRAY['1.07%', '1.19%', '1.31%', '1.43%', '1.55%', '1.67%', '1.79%', '1.91%', '2.03%', '2.15%']::text[]),
(1041, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 2, '50.0%', '30%', '15.00%', ARRAY['1.57%', '1.74%', '1.91%', '2.08%', '2.25%', '2.42%', '2.59%', '2.76%', '2.93%', '3.1%']::text[]),
(1046, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 3, '50.0%', '20%', '10.00%', ARRAY['1.31%', '1.46%', '1.61%', '1.76%', '1.91%', '2.06%', '2.21%', '2.36%', '2.51%', '2.66%']::text[]),
(1048, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 3, '50.0%', '20%', '10.00%', ARRAY['1.92%', '2.13%', '2.34%', '2.55%', '2.76%', '2.97%', '3.18%', '3.39%', '3.6%', '3.81%']::text[]),
(1053, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 4, '50.0%', '10%', '5.00%', ARRAY['1.67%', '1.86%', '2.05%', '2.24%', '2.43%', '2.62%', '2.81%', '3%', '3.19%', '3.38%']::text[]),
(1055, 105, 'Epic', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 4, '50.0%', '10%', '5.00%', ARRAY['2.44%', '2.71%', '2.98%', '3.25%', '3.52%', '3.79%', '4.06%', '4.33%', '4.6%', '4.87%']::text[]),
(1030, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 1, '33.3%', '40%', '13.33%', ARRAY['0.46%', '0.51%', '0.56%', '0.61%', '0.66%', '0.71%', '0.76%', '0.81%', '0.86%', '0.91%']::text[]),
(1033, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 1, '33.3%', '40%', '13.33%', ARRAY['0.45%', '0.5%', '0.55%', '0.6%', '0.65%', '0.7%', '0.75%', '0.8%', '0.85%', '0.9%']::text[]),
(1035, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 1, '33.3%', '40%', '13.33%', ARRAY['0.78%', '0.87%', '0.96%', '1.05%', '1.14%', '1.23%', '1.32%', '1.41%', '1.5%', '1.59%']::text[]),
(1037, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 2, '33.3%', '30%', '10.00%', ARRAY['0.59%', '0.66%', '0.73%', '0.8%', '0.87%', '0.94%', '1.01%', '1.08%', '1.15%', '1.22%']::text[]),
(1040, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 2, '33.3%', '30%', '10.00%', ARRAY['0.58%', '0.64%', '0.7%', '0.76%', '0.82%', '0.88%', '0.94%', '1%', '1.06%', '1.12%']::text[]),
(1042, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 2, '33.3%', '30%', '10.00%', ARRAY['1%', '1.11%', '1.22%', '1.33%', '1.44%', '1.55%', '1.66%', '1.77%', '1.88%', '1.99%']::text[]),
(1044, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 3, '33.3%', '20%', '6.67%', ARRAY['0.72%', '0.8%', '0.88%', '0.96%', '1.04%', '1.12%', '1.2%', '1.28%', '1.36%', '1.44%']::text[]),
(1047, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 3, '33.3%', '20%', '6.67%', ARRAY['0.71%', '0.79%', '0.87%', '0.95%', '1.03%', '1.11%', '1.19%', '1.27%', '1.35%', '1.43%']::text[]),
(1049, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 3, '33.3%', '20%', '6.67%', ARRAY['1.22%', '1.36%', '1.5%', '1.64%', '1.78%', '1.92%', '2.06%', '2.2%', '2.34%', '2.48%']::text[]),
(1051, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 4, '33.3%', '10%', '3.33%', ARRAY['0.92%', '1.02%', '1.12%', '1.22%', '1.32%', '1.42%', '1.52%', '1.62%', '1.72%', '1.82%']::text[]),
(1054, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 4, '33.3%', '10%', '3.33%', ARRAY['0.9%', '1%', '1.1%', '1.2%', '1.3%', '1.4%', '1.5%', '1.6%', '1.7%', '1.8%']::text[]),
(1056, 106, 'Epic', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 4, '33.3%', '10%', '3.33%', ARRAY['1.55%', '1.72%', '1.89%', '2.06%', '2.23%', '2.4%', '2.57%', '2.74%', '2.91%', '3.08%']::text[]),
(1057, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 1, '50.0%', '40%', '20.00%', ARRAY['1.75%', '1.94%', '2.13%', '2.32%', '2.51%', '2.7%', '2.89%', '3.08%', '3.27%', '3.46%']::text[]),
(1059, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 1, '50.0%', '40%', '20.00%', ARRAY['1.81%', '2.01%', '2.21%', '2.41%', '2.61%', '2.81%', '3.01%', '3.21%', '3.41%', '3.61%']::text[]),
(1064, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 2, '50.0%', '30%', '15.00%', ARRAY['2.34%', '2.6%', '2.86%', '3.12%', '3.38%', '3.64%', '3.9%', '4.16%', '4.42%', '4.68%']::text[]),
(1066, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 2, '50.0%', '30%', '15.00%', ARRAY['2.41%', '2.68%', '2.95%', '3.22%', '3.49%', '3.76%', '4.03%', '4.3%', '4.57%', '4.84%']::text[]),
(1071, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 3, '50.0%', '20%', '10.00%', ARRAY['2.8%', '3.11%', '3.42%', '3.73%', '4.04%', '4.35%', '4.66%', '4.97%', '5.28%', '5.59%']::text[]),
(1073, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 3, '50.0%', '20%', '10.00%', ARRAY['2.89%', '3.21%', '3.53%', '3.85%', '4.17%', '4.49%', '4.81%', '5.13%', '5.45%', '5.77%']::text[]),
(1078, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Affinity', 4, '50.0%', '10%', '5.00%', ARRAY['3.51%', '3.9%', '4.29%', '4.68%', '5.07%', '5.46%', '5.85%', '6.24%', '6.63%', '7.02%']::text[]),
(1080, 107, 'Superior', ARRAY['Barroth', 'Black Diablos', 'Diablos', 'Great Girros', 'Jyuratodus', 'Legiana', 'Paolumu', 'Pink Rathian', 'Radiant Great Jagras', 'Radiant Kulu-Ya-Ku', 'Radiant Odogaron', 'Radiant Pink Rathian', 'Radiant Rathian', 'Tobi-Kadachi']::text[], 'Ultimate Charge Rate', 4, '50.0%', '10%', '5.00%', ARRAY['3.62%', '4.02%', '4.42%', '4.82%', '5.22%', '5.62%', '6.02%', '6.42%', '6.82%', '7.22%']::text[]),
(1060, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 1, '50.0%', '40%', '20.00%', ARRAY['1.67%', '1.86%', '2.05%', '2.24%', '2.43%', '2.62%', '2.81%', '3%', '3.19%', '3.38%']::text[]),
(1062, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 1, '50.0%', '40%', '20.00%', ARRAY['2.44%', '2.71%', '2.98%', '3.25%', '3.52%', '3.79%', '4.06%', '4.33%', '4.6%', '4.87%']::text[]),
(1067, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 2, '50.0%', '30%', '15.00%', ARRAY['2.23%', '2.48%', '2.73%', '2.98%', '3.23%', '3.48%', '3.73%', '3.98%', '4.23%', '4.48%']::text[]),
(1069, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 2, '50.0%', '30%', '15.00%', ARRAY['3.26%', '3.62%', '3.98%', '4.34%', '4.7%', '5.06%', '5.42%', '5.78%', '6.14%', '6.5%']::text[]),
(1074, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 3, '50.0%', '20%', '10.00%', ARRAY['2.67%', '2.97%', '3.27%', '3.57%', '3.87%', '4.17%', '4.47%', '4.77%', '5.07%', '5.37%']::text[]),
(1076, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 3, '50.0%', '20%', '10.00%', ARRAY['3.91%', '4.34%', '4.77%', '5.2%', '5.63%', '6.06%', '6.49%', '6.92%', '7.35%', '7.78%']::text[]),
(1081, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Ultimate Charge Rate', 4, '50.0%', '10%', '5.00%', ARRAY['3.34%', '3.71%', '4.08%', '4.45%', '4.82%', '5.19%', '5.56%', '5.93%', '6.3%', '6.67%']::text[]),
(1083, 108, 'Superior', ARRAY['Anjanath', 'Great Jagras', 'Kulu-Ya-Ku', 'Odogaron', 'Pukei-Pukei', 'Radiant Anjanath', 'Radiant Barroth', 'Radiant Black Diablos', 'Radiant Diablos', 'Radiant Great Girros', 'Radiant Jyuratodus', 'Radiant Legiana', 'Radiant Paolumu', 'Radiant Pukei-Pukei', 'Radiant Radobaan', 'Radiant Rathalos', 'Radiant Tobi-Kadachi', 'Radiant Tzitzi-Ya-Ku', 'Radobaan', 'Rathalos', 'Rathian', 'Tzitzi-Ya-Ku']::text[], 'Elemental damage', 4, '50.0%', '10%', '5.00%', ARRAY['4.88%', '5.42%', '5.96%', '6.5%', '7.04%', '7.58%', '8.12%', '8.66%', '9.2%', '9.74%']::text[]),
(1058, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 1, '33.3%', '40%', '13.33%', ARRAY['0.92%', '1.02%', '1.12%', '1.22%', '1.32%', '1.42%', '1.52%', '1.62%', '1.72%', '1.82%']::text[]),
(1061, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 1, '33.3%', '40%', '13.33%', ARRAY['0.91%', '1.01%', '1.11%', '1.21%', '1.31%', '1.41%', '1.51%', '1.61%', '1.71%', '1.81%']::text[]),
(1063, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 1, '33.3%', '40%', '13.33%', ARRAY['1.56%', '1.73%', '1.9%', '2.07%', '2.24%', '2.41%', '2.58%', '2.75%', '2.92%', '3.09%']::text[]),
(1065, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 2, '33.3%', '30%', '10.00%', ARRAY['1.23%', '1.37%', '1.51%', '1.65%', '1.79%', '1.93%', '2.07%', '2.21%', '2.35%', '2.49%']::text[]),
(1068, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 2, '33.3%', '30%', '10.00%', ARRAY['1.21%', '1.34%', '1.47%', '1.6%', '1.73%', '1.86%', '1.99%', '2.12%', '2.25%', '2.38%']::text[]),
(1070, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 2, '33.3%', '30%', '10.00%', ARRAY['2.07%', '2.3%', '2.53%', '2.76%', '2.99%', '3.22%', '3.45%', '3.68%', '3.91%', '4.14%']::text[]),
(1072, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 3, '33.3%', '20%', '6.67%', ARRAY['1.47%', '1.63%', '1.79%', '1.95%', '2.11%', '2.27%', '2.43%', '2.59%', '2.75%', '2.91%']::text[]),
(1075, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 3, '33.3%', '20%', '6.67%', ARRAY['1.45%', '1.61%', '1.77%', '1.93%', '2.09%', '2.25%', '2.41%', '2.57%', '2.73%', '2.89%']::text[]),
(1077, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 3, '33.3%', '20%', '6.67%', ARRAY['2.49%', '2.77%', '3.05%', '3.33%', '3.61%', '3.89%', '4.17%', '4.45%', '4.73%', '5.01%']::text[]),
(1079, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Affinity', 4, '33.3%', '10%', '3.33%', ARRAY['1.84%', '2.04%', '2.24%', '2.44%', '2.64%', '2.84%', '3.04%', '3.24%', '3.44%', '3.64%']::text[]),
(1082, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Ultimate Charge Rate', 4, '33.3%', '10%', '3.33%', ARRAY['1.81%', '2.01%', '2.21%', '2.41%', '2.61%', '2.81%', '3.01%', '3.21%', '3.41%', '3.61%']::text[]),
(1084, 109, 'Superior', ARRAY['Apceros', 'Aptonoth', 'Barnos', 'Gajau', 'Gastodon', 'Girros', 'Hornetaur', 'Jagras', 'Kelbi', 'Kestodon', 'Mernos', 'Noios', 'Pitcher Atecoli', 'Raphinos', 'Shamos', 'Vespoid', 'Warrior Atecoli']::text[], 'Elemental damage', 4, '33.3%', '10%', '3.33%', ARRAY['3.11%', '3.46%', '3.81%', '4.16%', '4.51%', '4.86%', '5.21%', '5.56%', '5.91%', '6.26%']::text[]),
(1088, 111, 'Rare / Epic / Superior', ARRAY['Kushala Daora', 'Nergigante', 'Ruger Aidal']::text[], 'Ultimate Charge Rate', 1, '50.0%', '100%', '50.00%', ARRAY['2.92%', '3.24%', '3.56%', '3.88%', '4.2%', '4.52%', '4.84%', '5.16%', '5.48%', '5.8%']::text[]),
(1090, 111, 'Rare / Epic / Superior', ARRAY['Kushala Daora', 'Nergigante', 'Ruger Aidal']::text[], 'Elemental damage', 1, '50.0%', '100%', '50.00%', ARRAY['4.27%', '4.74%', '5.21%', '5.68%', '6.15%', '6.62%', '7.09%', '7.56%', '8.03%', '8.5%']::text[]);

INSERT INTO public.visage_resketch_slots
  (quality, slot, unlock_level, item_name, item_count, zenny)
VALUES
('Rare', 1, 2, 'Pure Brush', 2, 4000),
('Rare', 2, 4, 'Pure Brush', 2, 4000),
('Rare', 3, 6, 'Pure Brush', 2, 4000),
('Rare', 4, 8, 'Pure Brush', 2, 4000),
('Rare', 5, 10, 'Pure Brush', 2, 4000),
('Epic', 1, 2, 'Unusual Brush', 2, 8000),
('Epic', 2, 4, 'Unusual Brush', 2, 8000),
('Epic', 3, 6, 'Unusual Brush', 2, 8000),
('Epic', 4, 8, 'Unusual Brush', 2, 8000),
('Epic', 5, 10, 'Unusual Brush', 2, 8000),
('Superior', 1, 2, 'Radiant Brush', 2, 16000),
('Superior', 2, 4, 'Radiant Brush', 2, 16000),
('Superior', 3, 6, 'Radiant Brush', 2, 16000),
('Superior', 4, 8, 'Radiant Brush', 2, 16000),
('Superior', 5, 10, 'Radiant Brush', 2, 16000);

INSERT INTO public.visage_resketch_pool
  (entry_id, quality, effect, roll_quality, effect_chance, roll_quality_chance, overall_chance, values, value_chances)
VALUES
(2001, 'Rare', 'Damage', 'Rare', '11.1%', '89%', '9.89%', ARRAY['0.51%', '0.68%', '0.84%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2002, 'Rare', 'Damage', 'Epic', '11.1%', '10%', '1.11%', ARRAY['1.01%', '1.18%', '1.35%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2003, 'Rare', 'Damage', 'Superior', '11.1%', '1%', '0.11%', ARRAY['1.43%', '1.52%', '1.69%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2004, 'Rare', 'Elemental Critical Damage', 'Rare', '11.1%', '89%', '9.89%', ARRAY['0.76%', '1.01%', '1.27%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2005, 'Rare', 'Elemental Critical Damage', 'Epic', '11.1%', '10%', '1.11%', ARRAY['1.52%', '1.77%', '2.03%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2006, 'Rare', 'Elemental Critical Damage', 'Superior', '11.1%', '1%', '0.11%', ARRAY['2.15%', '2.28%', '2.53%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2007, 'Rare', 'Defense', 'Rare', '11.1%', '89%', '9.89%', ARRAY['2', '2', '3']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2008, 'Rare', 'Defense', 'Epic', '11.1%', '10%', '1.11%', ARRAY['4', '4', '5']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2009, 'Rare', 'Defense', 'Superior', '11.1%', '1%', '0.11%', ARRAY['6', '6', '6']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2010, 'Rare', 'Physical Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['10', '12', '15']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2011, 'Rare', 'Physical Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['18', '21', '24']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2012, 'Rare', 'Physical Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['26', '27', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2013, 'Rare', 'Water Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['10', '12', '15']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2014, 'Rare', 'Water Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['18', '21', '24']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2015, 'Rare', 'Water Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['26', '27', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2016, 'Rare', 'Fire Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['10', '12', '15']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2017, 'Rare', 'Fire Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['18', '21', '24']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2018, 'Rare', 'Fire Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['26', '27', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2019, 'Rare', 'Ice Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['10', '12', '15']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2020, 'Rare', 'Ice Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['18', '21', '24']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2021, 'Rare', 'Ice Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['26', '27', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2022, 'Rare', 'Thunder Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['10', '12', '15']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2023, 'Rare', 'Thunder Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['18', '21', '24']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2024, 'Rare', 'Thunder Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['26', '27', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2025, 'Rare', 'Dragon Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['10', '12', '15']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2026, 'Rare', 'Dragon Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['18', '21', '24']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2027, 'Rare', 'Dragon Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['26', '27', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2028, 'Epic', 'Damage', 'Rare', '11.1%', '89%', '9.89%', ARRAY['0.76%', '1.01%', '1.27%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2029, 'Epic', 'Damage', 'Epic', '11.1%', '10%', '1.11%', ARRAY['1.52%', '1.77%', '2.03%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2030, 'Epic', 'Damage', 'Superior', '11.1%', '1%', '0.11%', ARRAY['2.15%', '2.28%', '2.53%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2031, 'Epic', 'Elemental Critical Damage', 'Rare', '11.1%', '89%', '9.89%', ARRAY['1.14%', '1.52%', '1.9%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2032, 'Epic', 'Elemental Critical Damage', 'Epic', '11.1%', '10%', '1.11%', ARRAY['2.28%', '2.66%', '3.04%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2033, 'Epic', 'Elemental Critical Damage', 'Superior', '11.1%', '1%', '0.11%', ARRAY['3.23%', '3.42%', '3.8%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2034, 'Epic', 'Defense', 'Rare', '11.1%', '89%', '9.89%', ARRAY['3', '3', '4']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2035, 'Epic', 'Defense', 'Epic', '11.1%', '10%', '1.11%', ARRAY['5', '6', '7']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2036, 'Epic', 'Defense', 'Superior', '11.1%', '1%', '0.11%', ARRAY['8', '8', '9']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2037, 'Epic', 'Physical Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['15', '18', '23']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2038, 'Epic', 'Physical Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['27', '32', '36']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2039, 'Epic', 'Physical Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['38', '41', '45']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2040, 'Epic', 'Water Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['15', '18', '23']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2041, 'Epic', 'Water Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['27', '32', '36']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2042, 'Epic', 'Water Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['38', '41', '45']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2043, 'Epic', 'Fire Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['15', '18', '23']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2044, 'Epic', 'Fire Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['27', '32', '36']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2045, 'Epic', 'Fire Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['38', '41', '45']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2046, 'Epic', 'Ice Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['15', '18', '23']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2047, 'Epic', 'Ice Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['27', '32', '36']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2048, 'Epic', 'Ice Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['38', '41', '45']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2049, 'Epic', 'Thunder Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['15', '18', '23']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2050, 'Epic', 'Thunder Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['27', '32', '36']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2051, 'Epic', 'Thunder Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['38', '41', '45']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2052, 'Epic', 'Dragon Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['15', '18', '23']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2053, 'Epic', 'Dragon Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['27', '32', '36']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2054, 'Epic', 'Dragon Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['38', '41', '45']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2055, 'Superior', 'Damage', 'Rare', '11.1%', '89%', '9.89%', ARRAY['1.01%', '1.35%', '1.69%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2056, 'Superior', 'Damage', 'Epic', '11.1%', '10%', '1.11%', ARRAY['2.03%', '2.36%', '2.7%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2057, 'Superior', 'Damage', 'Superior', '11.1%', '1%', '0.11%', ARRAY['2.87%', '3.04%', '3.38%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2058, 'Superior', 'Elemental Critical Damage', 'Rare', '11.1%', '89%', '9.89%', ARRAY['1.52%', '2.03%', '2.53%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2059, 'Superior', 'Elemental Critical Damage', 'Epic', '11.1%', '10%', '1.11%', ARRAY['3.04%', '3.54%', '4.05%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2060, 'Superior', 'Elemental Critical Damage', 'Superior', '11.1%', '1%', '0.11%', ARRAY['4.3%', '4.56%', '5.06%']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2061, 'Superior', 'Defense', 'Rare', '11.1%', '89%', '9.89%', ARRAY['4', '5', '6']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2062, 'Superior', 'Defense', 'Epic', '11.1%', '10%', '1.11%', ARRAY['7', '8', '9']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2063, 'Superior', 'Defense', 'Superior', '11.1%', '1%', '0.11%', ARRAY['10', '11', '12']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2064, 'Superior', 'Physical Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['20', '24', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2065, 'Superior', 'Physical Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['36', '42', '48']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2066, 'Superior', 'Physical Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['51', '54', '60']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2067, 'Superior', 'Water Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['20', '24', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2068, 'Superior', 'Water Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['36', '42', '48']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2069, 'Superior', 'Water Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['51', '54', '60']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2070, 'Superior', 'Fire Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['20', '24', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2071, 'Superior', 'Fire Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['36', '42', '48']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2072, 'Superior', 'Fire Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['51', '54', '60']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2073, 'Superior', 'Ice Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['20', '24', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2074, 'Superior', 'Ice Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['36', '42', '48']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2075, 'Superior', 'Ice Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['51', '54', '60']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2076, 'Superior', 'Thunder Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['20', '24', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2077, 'Superior', 'Thunder Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['36', '42', '48']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2078, 'Superior', 'Thunder Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['51', '54', '60']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2079, 'Superior', 'Dragon Attack', 'Rare', '11.1%', '89%', '9.89%', ARRAY['20', '24', '30']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2080, 'Superior', 'Dragon Attack', 'Epic', '11.1%', '10%', '1.11%', ARRAY['36', '42', '48']::text[], ARRAY['33%', '33%', '33%']::text[]),
(2081, 'Superior', 'Dragon Attack', 'Superior', '11.1%', '1%', '0.11%', ARRAY['51', '54', '60']::text[], ARRAY['33%', '33%', '33%']::text[]);

-- 6. Update visages base_effect_pools
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Great Jagras' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Great Jagras');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Kulu-Ya-Ku' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Kulu-Ya-Ku');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Pukei-Pukei' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Pukei-Pukei');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Barroth' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Barroth');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Jyuratodus' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Jyuratodus');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Tobi-Kadachi' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Tobi-Kadachi');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Anjanath' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Anjanath');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Rathian' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Rathian');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Tzitzi-Ya-Ku' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Tzitzi-Ya-Ku');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Paolumu' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Paolumu');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Great Girros' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Great Girros');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radobaan' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radobaan');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Legiana' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Legiana');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Odogaron' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Odogaron');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Rathalos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Rathalos');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Diablos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Diablos');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Black Diablos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Black Diablos');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Pink Rathian' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Pink Rathian');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Radiant Great Jagras' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Great Jagras');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Radiant Kulu-Ya-Ku' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Kulu-Ya-Ku');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Pukei-Pukei' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Pukei-Pukei');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Barroth' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Barroth');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Jyuratodus' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Jyuratodus');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Anjanath' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Anjanath');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Radiant Rathian' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Rathian');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Paolumu' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Paolumu');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Rathalos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Rathalos');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Diablos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Diablos');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Radiant Pink Rathian' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Pink Rathian');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Black Diablos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Black Diablos');
UPDATE public.visages SET base_effect_pools = '{"rare":101,"epic":104,"superior":107}'::jsonb WHERE name = 'Visage: Radiant Odogaron' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Odogaron');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Tobi-Kadachi' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Tobi-Kadachi');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Tzitzi-Ya-Ku' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Tzitzi-Ya-Ku');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Great Girros' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Great Girros');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Radobaan' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Radobaan');
UPDATE public.visages SET base_effect_pools = '{"rare":102,"epic":105,"superior":108}'::jsonb WHERE name = 'Visage: Radiant Legiana' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Radiant Legiana');
UPDATE public.visages SET base_effect_pools = '{"rare":111,"epic":111,"superior":111}'::jsonb WHERE name = 'Visage: Nergigante' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Nergigante');
UPDATE public.visages SET base_effect_pools = '{"rare":111,"epic":111,"superior":111}'::jsonb WHERE name = 'Visage: Kushala Daora' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Kushala Daora');
UPDATE public.visages SET base_effect_pools = '{"rare":111,"epic":111,"superior":111}'::jsonb WHERE name = 'Visage: Ruger Aidal' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Ruger Aidal');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Jagras' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Jagras');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Vespoid' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Vespoid');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Aptonoth' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Aptonoth');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Kestodon' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Kestodon');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Apceros' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Apceros');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Gajau' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Gajau');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Shamos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Shamos');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Girros' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Girros');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Hornetaur' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Hornetaur');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Gastodon' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Gastodon');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Warrior Atecoli' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Warrior Atecoli');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Pitcher Atecoli' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Pitcher Atecoli');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Mernos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Mernos');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Kelbi' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Kelbi');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Noios' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Noios');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Raphinos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Raphinos');
UPDATE public.visages SET base_effect_pools = '{"rare":103,"epic":106,"superior":109}'::jsonb WHERE name = 'Visage: Barnos' OR monster_id IN (SELECT id FROM public.monsters WHERE name = 'Barnos');

COMMIT;
