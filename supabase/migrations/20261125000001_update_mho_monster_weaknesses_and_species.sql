-- ============================================================
-- Migration: 20261125000001 — Update MHO monster weaknesses, species, and elements
-- Source: import/MHO_monsters.csv (+ import/MHO_monsters.json)
-- Updates all Radiant monsters, Small monsters, and Ruger Aidal with complete
-- species, element attacks, and element/status weaknesses.
-- ============================================================

BEGIN;

UPDATE public.monsters AS m
SET
  species = v.species,
  elements = v.elements,
  weaknesses = v.weaknesses,
  updated_at = now()
FROM (VALUES
  ('100111', 'Radiant Pink Rathian', 'flying_wyvern', ARRAY['fire','poison']::text[], ARRAY['dragon','stun']::text[]),
  ('100210', 'Radiant Rathalos', 'flying_wyvern', ARRAY['fire','poison']::text[], ARRAY['thunder']::text[]),
  ('100710', 'Radiant Diablos', 'flying_wyvern', ARRAY['none']::text[], ARRAY['ice','paralysis']::text[]),
  ('100711', 'Radiant Black Diablos', 'flying_wyvern', ARRAY['none']::text[], ARRAY['ice','paralysis']::text[]),
  ('104410', 'Radiant Barroth', 'brute_wyvern', ARRAY['water']::text[], ARRAY['fire','poison','paralysis','blast']::text[]),
  ('110010', 'Radiant Anjanath', 'brute_wyvern', ARRAY['fire']::text[], ARRAY['water']::text[]),
  ('110110', 'Radiant Great Jagras', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['fire','poison','sleep','paralysis','blast','stun']::text[]),
  ('110210', 'Radiant Pukei-Pukei', 'bird_wyvern', ARRAY['poison']::text[], ARRAY['thunder','sleep','paralysis']::text[]),
  ('110710', 'Radiant Kulu-Ya-Ku', 'bird_wyvern', ARRAY['none']::text[], ARRAY['water']::text[]),
  ('110810', 'Radiant Jyuratodus', 'piscine_wyvern', ARRAY['water']::text[], ARRAY['ice','stun']::text[]),
  ('110910', 'Radiant Tobi-Kadachi', 'fanged_wyvern', ARRAY['thunder']::text[], ARRAY['water','poison']::text[]),
  ('111010', 'Radiant Paolumu', 'flying_wyvern', ARRAY['none']::text[], ARRAY['fire','blast','stun']::text[]),
  ('111110', 'Radiant Legiana', 'flying_wyvern', ARRAY['ice']::text[], ARRAY['fire','poison']::text[]),
  ('111210', 'Radiant Great Girros', 'fanged_wyvern', ARRAY['paralysis']::text[], ARRAY['dragon','sleep']::text[]),
  ('111310', 'Radiant Odogaron', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['ice','paralysis']::text[]),
  ('111410', 'Radiant Radobaan', 'brute_wyvern', ARRAY['sleep']::text[], ARRAY['dragon','blast']::text[]),
  ('112010', 'Radiant Tzitzi-Ya-Ku', 'bird_wyvern', ARRAY['none']::text[], ARRAY['dragon']::text[]),
  ('140001', 'Ruger Aidal', 'elder_dragon', ARRAY['none']::text[], ARRAY['fire','ice','blast']::text[]),
  ('199901', 'Radiant Rathian', 'flying_wyvern', ARRAY['fire','poison']::text[], ARRAY['thunder','stun']::text[]),
  ('200101', 'Aptonoth', 'herbivore', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('200201', 'Apceros', 'herbivore', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('200301', 'Kelbi', 'herbivore', ARRAY['none']::text[], ARRAY['fire','water','thunder','ice']::text[]),
  ('200302', 'Kelbi', 'herbivore', ARRAY['none']::text[], ARRAY['fire','water','thunder','ice']::text[]),
  ('200501', 'Hornetaur', 'neopteron', ARRAY['none']::text[], ARRAY['fire','ice']::text[]),
  ('200510', 'Radiant Hornetaur', 'neopteron', ARRAY['none']::text[], ARRAY['fire','ice']::text[]),
  ('200601', 'Vespoid', 'neopteron', ARRAY['none']::text[], ARRAY['fire']::text[]),
  ('202901', 'Gajau', 'piscine_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('202910', 'Radiant Gajau', 'piscine_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('204901', 'Jagras', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('204910', 'Radiant Jagras', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('205001', 'Mernos', 'wingdrake', ARRAY['none']::text[], ARRAY['fire','water','thunder','ice']::text[]),
  ('205010', 'Radiant Mernos', 'wingdrake', ARRAY['none']::text[], ARRAY['fire','water','thunder','ice']::text[]),
  ('205101', 'Kestodon', 'herbivore', ARRAY['none']::text[], ARRAY['water','ice']::text[]),
  ('205102', 'Kestodon', 'herbivore', ARRAY['none']::text[], ARRAY['water','ice']::text[]),
  ('205110', 'Radiant Kestodon', 'herbivore', ARRAY['none']::text[], ARRAY['water','ice']::text[]),
  ('205111', 'Kestodon', 'herbivore', ARRAY['none']::text[], ARRAY['water','ice']::text[]),
  ('205301', 'Raphinos', 'wingdrake', ARRAY['none']::text[], ARRAY['thunder']::text[]),
  ('205310', 'Radiant Raphinos', 'wingdrake', ARRAY['none']::text[], ARRAY['thunder']::text[]),
  ('205401', 'Shamos', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('205410', 'Radiant Shamos', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('205501', 'Barnos', 'wingdrake', ARRAY['none']::text[], ARRAY['dragon']::text[]),
  ('205601', 'Girros', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('205610', 'Radiant Girros', 'fanged_wyvern', ARRAY['none']::text[], ARRAY['fire','thunder']::text[]),
  ('205801', 'Gastodon', 'herbivore', ARRAY['none']::text[], ARRAY['thunder']::text[]),
  ('205901', 'Noios', 'wingdrake', ARRAY['none']::text[], ARRAY['water','thunder','ice']::text[]),
  ('206101', 'Warrior Atecoli', 'lynian', ARRAY['none']::text[], ARRAY['thunder','ice']::text[]),
  ('206102', 'Pitcher Atecoli', 'lynian', ARRAY['none']::text[], ARRAY['thunder','ice']::text[])
) AS v(id, name, species, elements, weaknesses)
WHERE m.id = v.id;

COMMIT;
