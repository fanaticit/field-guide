-- ============================================================
-- Migration: 20261104000001 — Import MHO visage cards
-- Source: import/MHO_visages.csv (+ import/VisageBackground)
--   * One row per monster; id = first (Fine) CSV id of the monster
--   * points = Capacity, core_effect = Effects, ink_types = Set without "Ink of "
--   * rarity (int) is replaced by max_levels int[] = [Fine, Rare, Epic, Superior, Superior+]
--   * monster_id is matched by monster name (lowest id, non-radiant wins on duplicates)
--   * image_small / image_large / set_bonus_id are dropped; the card art is now composed
--     in the UI from /images/visages/backgrounds/* + the linked monster icon
--   * Existing slug-id visages are replaced; user collections, builds and challenges are re-pointed
-- ============================================================

BEGIN;

-- The CSV has a Pitcher Atecoli visage but the monsters table has no matching monster.
INSERT INTO public.monsters
  (id, name, name_ja, species, tier, elements, weaknesses, is_variant, is_radiant, is_active, icon, sort_order, notes)
SELECT '206102', 'Pitcher Atecoli', name_ja, species, tier, elements, weaknesses, is_variant, is_radiant, is_active, icon,
       (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.monsters), notes
FROM public.monsters WHERE id = '206101'
ON CONFLICT (id) DO NOTHING;

-- Schema
ALTER TABLE public.visages ADD COLUMN IF NOT EXISTS max_levels INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE public.visages DROP CONSTRAINT IF EXISTS visages_set_bonus_id_fkey;
DROP INDEX IF EXISTS public.idx_visages_set_bonus_id;
ALTER TABLE public.visages DROP COLUMN IF EXISTS set_bonus_id;
ALTER TABLE public.visages DROP COLUMN IF EXISTS image_large;
ALTER TABLE public.visages DROP COLUMN IF EXISTS image_small;
ALTER TABLE public.visages DROP COLUMN IF EXISTS rarity;

CREATE TEMP TABLE _visage_id_map (old_id TEXT PRIMARY KEY, new_id TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO _visage_id_map (old_id, new_id) VALUES
  ('great_jagras', '10001200'),
  ('kulu_ya_ku', '10002200'),
  ('pukei_pukei', '10003200'),
  ('barroth', '10004200'),
  ('jyuratodus', '10005200'),
  ('tobi_kadachi', '10006200'),
  ('anjanath', '10007200'),
  ('rathian', '10008200'),
  ('tzitzi_ya_ku', '10009200'),
  ('paolumu', '10010200'),
  ('great_girros', '10011200'),
  ('radobaan', '10012200'),
  ('legiana', '10013200'),
  ('odogaron', '10014200'),
  ('rathalos', '10015200'),
  ('diablos', '10016200'),
  ('black_diablos', '10018200'),
  ('pink_rathian', '10019200'),
  ('radiant_great_jagras', '10101200'),
  ('radiant_kulu_ya_ku', '10102200'),
  ('radiant_pukei_pukei', '10103200'),
  ('radiant_barroth', '10104200'),
  ('radiant_jyuratodus', '10105200'),
  ('radiant_anjanath', '10107200'),
  ('radiant_rathian', '10108200'),
  ('radiant_paolumu', '10110200'),
  ('radiant_rathalos', '10115200'),
  ('radiant_diablos', '10116200'),
  ('radiant_odogaron', '10119200'),
  ('radiant_tobi_kadachi', '10121200'),
  ('radiant_tzitzi_ya_ku', '10122200'),
  ('radiant_great_girros', '10123200'),
  ('jagras', '10201200'),
  ('vespoid', '10202200'),
  ('aptonoth', '10203200'),
  ('kestodon', '10204200'),
  ('apceros', '10206200'),
  ('gajau', '10207200'),
  ('shamos', '10209200'),
  ('girros', '10210200'),
  ('hornetaur', '10211200'),
  ('gastodon', '10212200'),
  ('warrior_atecoli', '10213200'),
  ('warrior_gajalaka', '10213200'),
  ('pitcher_gajalaka', '10214200'),
  ('mernos', '10215200'),
  ('kelbi', '10216200'),
  ('noios', '10218200'),
  ('raphinos', '10219200'),
  ('barnos', '10220200');

CREATE TEMP TABLE _visage_import (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, points INTEGER NOT NULL, max_levels INTEGER[] NOT NULL,
  ink_types TEXT[] NOT NULL, core_effect TEXT, sort_order INTEGER NOT NULL, carry_from TEXT
) ON COMMIT DROP;
INSERT INTO _visage_import (id, name, points, max_levels, ink_types, core_effect, sort_order, carry_from) VALUES
  ('10001200', 'Great Jagras', 3, ARRAY[5,6,7,8,8]::int[], ARRAY['flames']::text[], 'When equipped with a fire weapon, fire damage +7%. | When equipped with a thunder weapon, thunder damage +7%.', 1, 'great_jagras'),
  ('10002200', 'Kulu-Ya-Ku', 3, ARRAY[5,6,7,8,8]::int[], ARRAY['water']::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items.', 2, 'kulu_ya_ku'),
  ('10003200', 'Pukei-Pukei', 3, ARRAY[5,6,7,8,8]::int[], ARRAY['thunder']::text[], 'Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s. | Bleeding Resistance +3. Prevents bleeding.', 3, 'pukei_pukei'),
  ('10004200', 'Barroth', 4, ARRAY[1,2,3,4,4]::int[], ARRAY['guidance']::text[], 'Instinct +1. Attacks will not be knocked back. | Bleeding Resistance +3. Prevents bleeding.', 4, 'barroth'),
  ('10005200', 'Jyuratodus', 4, ARRAY[1,2,3,4,4]::int[], ARRAY['combat']::text[], 'Instinct +1. Attacks will not be knocked back. | When equipped with an ice weapon, ice damage +7%.', 5, 'jyuratodus'),
  ('10006200', 'Tobi-Kadachi', 4, ARRAY[1,2,3,4,4]::int[], ARRAY['resonance']::text[], 'When an ultimate heals a squad member, squad damage +3.5% for 60s. | Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s.', 6, 'tobi_kadachi'),
  ('10007200', 'Anjanath', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Unaffected by movement penalties when stuck in mud.', 7, 'anjanath'),
  ('10008200', 'Rathian', 3, ARRAY[5,6,7,8,8]::int[], ARRAY['dragon']::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items.', 8, 'rathian'),
  ('10009200', 'Tzitzi-Ya-Ku', 3, ARRAY[5,6,7,8,8]::int[], ARRAY['grace']::text[], 'Instinct +1. Attacks will not be knocked back.', 9, 'tzitzi_ya_ku'),
  ('10010200', 'Paolumu', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'When equipped with a thunder weapon, thunder damage +7%.', 10, 'paolumu'),
  ('10011200', 'Great Girros', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'When an ultimate heals a squad member, squad damage +3.5% for 60s. | Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s.', 11, 'great_girros'),
  ('10012200', 'Radobaan', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When equipped with a thunder weapon, thunder damage +7%. | When equipped with an ice weapon, ice damage +7%.', 12, 'radobaan'),
  ('10013200', 'Legiana', 4, ARRAY[1,2,3,4,4]::int[], ARRAY['frost']::text[], 'When equipped with an ice weapon, ice damage +7%.', 13, 'legiana'),
  ('10014200', 'Odogaron', 3, ARRAY[5,6,7,8,8]::int[], ARRAY['protection']::text[], 'When equipped with a fire weapon, fire damage +7%. | Unaffected by movement penalties when stuck in mud.', 14, 'odogaron'),
  ('10015200', 'Rathalos', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Unaffected by movement penalties when stuck in mud. | When equipped with a water weapon, water damage +7%.', 15, 'rathalos'),
  ('10016200', 'Diablos', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'Bleeding Resistance +3. Prevents bleeding.', 16, 'diablos'),
  ('10018200', 'Black Diablos', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'When equipped with a fire weapon, fire damage +7%.', 17, 'black_diablos'),
  ('10019200', 'Pink Rathian', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'Unaffected by movement penalties when stuck in mud.', 18, 'pink_rathian'),
  ('10101200', 'Radiant Great Jagras', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'When equipped with a water weapon, water damage +7%.', 19, 'radiant_great_jagras'),
  ('10102200', 'Radiant Kulu-Ya-Ku', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items. | When equipped with a water weapon, water damage +7%.', 20, 'radiant_kulu_ya_ku'),
  ('10103200', 'Radiant Pukei-Pukei', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s.', 21, 'radiant_pukei_pukei'),
  ('10104200', 'Radiant Barroth', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Instinct +1. Attacks will not be knocked back.', 22, 'radiant_barroth'),
  ('10105200', 'Radiant Jyuratodus', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Instinct +1. Attacks will not be knocked back. | Bleeding Resistance +3. Prevents bleeding.', 23, 'radiant_jyuratodus'),
  ('10107200', 'Radiant Anjanath', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], NULL, 24, 'radiant_anjanath'),
  ('10108200', 'Radiant Rathian', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items.', 25, 'radiant_rathian'),
  ('10110200', 'Radiant Paolumu', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When equipped with a water weapon, water damage +7%.', 26, 'radiant_paolumu'),
  ('10115200', 'Radiant Rathalos', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items. | When equipped with a water weapon, water damage +7%.', 27, 'radiant_rathalos'),
  ('10116200', 'Radiant Diablos', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When equipped with a fire weapon, fire damage +7%. | Bleeding Resistance +3. Prevents bleeding.', 28, 'radiant_diablos'),
  ('10117200', 'Radiant Pink Rathian', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'When equipped with a fire weapon, fire damage +7%. | When equipped with a thunder weapon, thunder damage +7%.', 29, NULL),
  ('10118200', 'Radiant Black Diablos', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When equipped with a thunder weapon, thunder damage +7%.', 30, NULL),
  ('10119200', 'Radiant Odogaron', 4, ARRAY[1,2,3,4,4]::int[], ARRAY[]::text[], 'Unaffected by movement penalties when stuck in mud.', 31, 'radiant_odogaron'),
  ('10121200', 'Radiant Tobi-Kadachi', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When an ultimate heals a squad member, squad damage +3.5% for 60s.', 32, 'radiant_tobi_kadachi'),
  ('10122200', 'Radiant Tzitzi-Ya-Ku', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When an ultimate heals a squad member, squad damage +3.5% for 60s.', 33, 'radiant_tzitzi_ya_ku'),
  ('10123200', 'Radiant Great Girros', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When an ultimate heals a squad member, squad damage +3.5% for 60s. | Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s.', 34, 'radiant_great_girros'),
  ('10124200', 'Radiant Radobaan', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When equipped with an ice weapon, ice damage +7%.', 35, NULL),
  ('10125200', 'Radiant Legiana', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When equipped with an ice weapon, ice damage +7%.', 36, NULL),
  ('10126200', 'Nergigante', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'When equipped with an ice weapon, ice damage +7%.', 37, NULL),
  ('10127200', 'Kushala Daora', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Sleep Resistance +3. Prevents sleep.', 38, NULL),
  ('10128200', 'Ruger Aidal', 3, ARRAY[5,6,7,8,8]::int[], ARRAY[]::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items.', 39, NULL),
  ('10201200', 'Jagras', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'When equipped with a thunder weapon, thunder damage +7%. | Unaffected by movement penalties when stuck in mud.', 40, 'jagras'),
  ('10202200', 'Vespoid', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'When an ultimate heals a squad member, squad damage +3.5% for 60s. | When equipped with a water weapon, water damage +7%.', 41, 'vespoid'),
  ('10203200', 'Aptonoth', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Bleeding Resistance +3. Prevents bleeding.', 42, 'aptonoth'),
  ('10204200', 'Kestodon', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items.', 43, 'kestodon'),
  ('10206200', 'Apceros', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Instinct +1. Attacks will not be knocked back. | Bleeding Resistance +3. Prevents bleeding.', 44, 'apceros'),
  ('10207200', 'Gajau', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Instinct +1. Attacks will not be knocked back. | When equipped with an ice weapon, ice damage +7%.', 45, 'gajau'),
  ('10209200', 'Shamos', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'When equipped with a thunder weapon, thunder damage +7%. | Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s.', 46, 'shamos'),
  ('10210200', 'Girros', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'When an ultimate heals a squad member, squad damage +3.5% for 60s. | Unaffected by movement penalties when stuck in mud.', 47, 'girros'),
  ('10211200', 'Hornetaur', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'When equipped with a fire weapon, fire damage +7%. | Bleeding Resistance +3. Prevents bleeding.', 48, 'hornetaur'),
  ('10212200', 'Gastodon', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'When equipped with a fire weapon, fire damage +7%.', 49, 'gastodon'),
  ('10213200', 'Warrior Atecoli', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Unaffected by movement penalties when stuck in mud.', 50, 'warrior_atecoli'),
  ('10214200', 'Pitcher Atecoli', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'When equipped with a thunder weapon, thunder damage +7%. | When equipped with a water weapon, water damage +7%.', 51, 'pitcher_gajalaka'),
  ('10215200', 'Mernos', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Instinct +1. Attacks will not be knocked back. | When an ultimate heals a squad member, squad damage +3.5% for 60s.', 52, 'mernos'),
  ('10216200', 'Kelbi', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s. | When equipped with an ice weapon, ice damage +7%.', 53, 'kelbi'),
  ('10218200', 'Noios', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items. | When equipped with a water weapon, water damage +7%.', 54, 'noios'),
  ('10219200', 'Raphinos', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Daze duration +0.5s. After a monster is dazed, its damage taken +6% for 30s. Cooldown: 60s. | When equipped with an ice weapon, ice damage +7%.', 55, 'raphinos'),
  ('10220200', 'Barnos', 1, ARRAY[9,10,11,12,12]::int[], ARRAY[]::text[], 'Quick-Bite +3. Greatly increases the speed of eating meat and using items. | When equipped with a fire weapon, fire damage +7%.', 56, 'barnos');

-- Insert the new rows (name_ja / notes / monster_type carried over from the old rows where they exist)
INSERT INTO public.visages
  (id, name, name_ja, monster_id, monster_type, points, max_levels, ink_types, core_effect, is_active, notes, sort_order)
SELECT i.id, i.name, o.name_ja,
       (SELECT m.id FROM public.monsters m WHERE lower(m.name) = lower(i.name)
          ORDER BY m.is_radiant, m.id LIMIT 1),
       COALESCE(o.monster_type, CASE WHEN (SELECT m.tier FROM public.monsters m WHERE lower(m.name) = lower(i.name)
                                            ORDER BY m.is_radiant, m.id LIMIT 1) = 'small' THEN 'small' ELSE 'large' END),
       i.points, i.max_levels, i.ink_types, i.core_effect, TRUE, COALESCE(o.notes, '[]'), i.sort_order
FROM _visage_import i
LEFT JOIN public.visages o ON o.id = i.carry_from;

-- Re-point everything that referenced the old slug ids
UPDATE public.user_visage_collection t SET visage_id = m.new_id FROM _visage_id_map m WHERE t.visage_id = m.old_id;
UPDATE public.hunter_challenges t SET visage_id = m.new_id FROM _visage_id_map m WHERE t.visage_id = m.old_id;
UPDATE public.mho_builds t SET core_visage_id = m.new_id FROM _visage_id_map m WHERE t.core_visage_id = m.old_id;
UPDATE public.mho_builds t SET visage_2_id = m.new_id FROM _visage_id_map m WHERE t.visage_2_id = m.old_id;
UPDATE public.mho_builds t SET visage_3_id = m.new_id FROM _visage_id_map m WHERE t.visage_3_id = m.old_id;
UPDATE public.mho_builds t SET visage_4_id = m.new_id FROM _visage_id_map m WHERE t.visage_4_id = m.old_id;
UPDATE public.mho_builds t SET visage_5_id = m.new_id FROM _visage_id_map m WHERE t.visage_5_id = m.old_id;
UPDATE public.mho_visage_builds t SET core_visage_id = m.new_id FROM _visage_id_map m WHERE t.core_visage_id = m.old_id;
UPDATE public.mho_visage_builds t SET visage_2_id = m.new_id FROM _visage_id_map m WHERE t.visage_2_id = m.old_id;
UPDATE public.mho_visage_builds t SET visage_3_id = m.new_id FROM _visage_id_map m WHERE t.visage_3_id = m.old_id;
UPDATE public.mho_visage_builds t SET visage_4_id = m.new_id FROM _visage_id_map m WHERE t.visage_4_id = m.old_id;
UPDATE public.mho_visage_builds t SET visage_5_id = m.new_id FROM _visage_id_map m WHERE t.visage_5_id = m.old_id;

-- Old rows (and anything still pointing at an unmapped old row) are removed
DELETE FROM public.visages WHERE id NOT IN (SELECT id FROM _visage_import);

-- Every visage must link to a monster
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.visages WHERE monster_id IS NULL) THEN
    RAISE EXCEPTION 'Some visages could not be matched to a monster';
  END IF;
END $$;

ALTER TABLE public.visages DROP CONSTRAINT IF EXISTS visages_monster_id_fkey;
ALTER TABLE public.visages
  ADD CONSTRAINT visages_monster_id_fkey FOREIGN KEY (monster_id)
  REFERENCES public.monsters(id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_visages_monster_id ON public.visages(monster_id);

COMMIT;
