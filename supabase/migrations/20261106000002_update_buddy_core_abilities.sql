-- ============================================================
-- Migration: 20261106000002 — Update Buddy Core Abilities
-- Source: import/MHO_companions.csv
--   * Updates core_passive in public.buddies with Core Passive name and ascension effect
-- ============================================================

BEGIN;

CREATE TEMP TABLE _buddy_cp_update (
  id TEXT PRIMARY KEY,
  core_passive TEXT
) ON COMMIT DROP;

INSERT INTO _buddy_cp_update (id, core_passive) VALUES
  ('320001', 'Icarus''s Aid: All adventurers in the squad deal 1.8% / 3% / 4% more elemental damage.'),
  ('320002', 'Lido''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320003', 'Akumu''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320004', 'Aloo''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320005', 'Shadow''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320006', 'Wolfe''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320007', 'Viper''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320008', 'Pupo''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320009', 'Boomie''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320011', 'Zira''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320012', 'Alon''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320013', 'Horn''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320014', 'Wrench''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320116', 'Ron''s Aid: All adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320117', 'Mac''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320126', 'Bladey''s Aid: All Adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320127', 'Mith''s Aid: All adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320128', 'Lynn''s Aid: All adventurers in the squad deal 0.6% / 0.8% / 1% more damage.'),
  ('320027', 'Falee Hendsom''s Aid: Increases part break efficiency against suppressed monsters by 4% / 8% / 12% for all adventurers in the squad.'),
  ('320023', 'Fortie''s Aid: All adventurers in the squad deal 1% / 1.3% / 1.8% more damage.'),
  ('320028', 'Barim''s Aid: When any adventurer in the squad suppresses a monster, that suppression duration is extended by 5% / 10% / 15%.'),
  ('320033', 'Ravinge''s Aid: All adventurers in the squad deal 1.8% / 3% / 4% more elemental damage.'),
  ('320037', 'Kojiro''s Aid: When the Adventurer carrying this Buddy deals rupture damage, fire damage dealt is increased by 30% / 40% / 50% for 10s.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320038', 'Pipa''s Aid: When the adventurer carrying this buddy deals piercing damage, they deal 25% / 32% / 40% more thunder damage.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320039', 'Hoppy''s Aid: When the adventurer carrying this buddy is airborne, they deal 21% / 28% / 35% more water damage.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320040', 'Devu''s Aid: When the Adventurer carrying this Buddy deals combo damage, dragon damage dealt is increased by 15% / 20% / 25% for 10s.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320041', 'Daisho''s Aid: When the Adventurer carrying this Buddy triggers parry or ferocity, dragon damage dealt is increased by 21% / 28% / 35% for 10s.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320042', 'Nailu''s Aid: When the adventurer carrying this buddy applies a Shield to an ally, they deal 30% / 40% / 50% more dragon damage for 10s.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320043', 'Aryo''s Aid: When the adventurer carrying this buddy lands a Draw Weapon attack, they deal 3.6% / 4.8% / 6% more fire damage for 15s, stacking up to 5 times, with each trigger refreshing the duration.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320044', 'Ro''s Aid: When the adventurer carrying this buddy triggers Charge damage, they deal 15% / 20% / 25% more ice damage for 10s.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320053', 'Blademaster''s Aid: All adventurers in the squad deal 1% / 1.3% / 1.8% more damage.'),
  ('320054', 'Pheasant''s Aid: When the adventurer carrying this buddy triggers Parry, they deal 15% / 20% / 25% more thunder damage for 10s.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320055', 'Elwin''s Aid: When the adventurer carrying this buddy uses a bow and lands an attack at the highest charge level, they deal 15% / 20% / 25% more ice damage for 10s.

All adventurers in the squad deal 2% / 3.5% / 5% more damage.'),
  ('320080', 'Banako''s Aid: All adventurers in the squad gain 0.6% / 0.8% / 1% affinity.'),
  ('320081', 'Nako''s Aid: All adventurers in the squad deal 2% / 2.6% / 3.6% more damage to suppressed monsters.'),
  ('320082', 'Ario''s Aid: All adventurers in the squad gain 0.6% / 0.8% / 1% affinity.'),
  ('320087', 'Tidal Claw''s Aid: Increases part break efficiency by 2% / 4% / 6% for all adventurers in the squad.'),
  ('320088', 'Sand Velvet''s Aid: Increases elemental critical damage by 1.2% / 1.6% / 2% for all adventurers in the squad.'),
  ('320089', 'Reefcore''s Aid: When any adventurer in the squad suppresses a monster, all adventurers in the squad recover 5 / 10 / 15 stamina.'),
  ('320090', 'Sand Echo''s Aid: All adventurers in the squad gain 1.8% / 2.5% / 3% increased stamina recovery rate.'),
  ('320091', 'Tidal Sound''s Aid: All adventurers in the squad gain 3.5% / 5% / 6% damage reduction.'),
  ('320092', 'Golden Bell''s Aid: All adventurers in the squad gain 1.8% / 2.5% / 3% increased stamina recovery rate.');

UPDATE public.buddies b
SET
  core_passive = u.core_passive,
  updated_at = now()
FROM _buddy_cp_update u
WHERE b.id = u.id;

COMMIT;
