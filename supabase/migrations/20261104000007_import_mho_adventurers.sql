-- ============================================================
-- Migration: 20261104000007 — Import MHO adventurers
-- Source: import/MHO_adventurers.csv, import/MHO_adventurer_skills.csv
--   * adventurers.id becomes the numeric id from the CSV (the 'default_adventurer' row is kept)
--   * new columns: title, gender, default_buddy, traits, playstyle, height
--   * image = head icon, background_image = bust, both in /images/adventurers/
--   * new table adventurer_skills (name + type; the CSV has few descriptions)
--   * user collections, challenges and builds are re-pointed from the old text ids
-- ============================================================

BEGIN;

ALTER TABLE public.adventurers
  ADD COLUMN IF NOT EXISTS title         TEXT,
  ADD COLUMN IF NOT EXISTS gender        TEXT CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS default_buddy TEXT,
  ADD COLUMN IF NOT EXISTS traits        JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS playstyle     TEXT,
  ADD COLUMN IF NOT EXISTS height        TEXT;

CREATE TABLE IF NOT EXISTS public.adventurer_skills (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  adventurer_id TEXT        NOT NULL REFERENCES public.adventurers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  name          TEXT        NOT NULL,
  skill_type    TEXT,
  description   TEXT
);
CREATE INDEX IF NOT EXISTS idx_adventurer_skills_adventurer ON public.adventurer_skills(adventurer_id, sort_order);

ALTER TABLE public.adventurer_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "adventurer_skills_select_all" ON public.adventurer_skills;
CREATE POLICY "adventurer_skills_select_all"
  ON public.adventurer_skills FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "adventurer_skills_admin_all" ON public.adventurer_skills;
CREATE POLICY "adventurer_skills_admin_all"
  ON public.adventurer_skills FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TEMP TABLE _adv_import (
  id TEXT PRIMARY KEY, old_id TEXT, name TEXT NOT NULL, title TEXT, rarity TEXT, gender TEXT,
  weapon_type TEXT, element TEXT, role TEXT, default_buddy TEXT, traits JSONB, playstyle TEXT,
  description TEXT, height TEXT, image TEXT, background_image TEXT, sort_order INTEGER
) ON COMMIT DROP;
INSERT INTO _adv_import VALUES
  ('101001', 'pyro', 'Pyro', 'Sword Inferno', 'superior', 'male', 'great_sword', 'dragon', 'Assault', 'Alon', '[{"name": "Robust Physique", "description": "While Pyro is airborne, damage dealt increases by 20%."}, {"name": "Butcher", "description": "Yields 1 additional material when carving large monsters. Takes effect as long as the Adventurer is in the squad."}]'::jsonb, 'Pyro is an Assault adventurer who wields the great sword, dealing primarily sever damage. His skills are enhanced when he takes damage. Skill 1: Heat Tackle will increase his Fervor Level after parrying an incoming hit. If he is hit while charging Skill 3, the skill is enhanced to deal significant damage.', 'Pyro was once an untamed warrior obsessed with martial arts, rampaging wherever he pleased with his monstrous strength, desperate to break free from a life he found stifling.', NULL, '/images/adventurers/101001_head.webp', '/images/adventurers/101001_bust.webp', 1),
  ('101003', 'freya', 'Freya', 'Blazing Heavens', 'superior', 'female', 'great_sword', 'fire', 'Disrupter', 'Wrench', '[{"name": "Inner Flame", "description": "Increases attack based on Inner Flame level:\nIncreases attack by 10 at Inner Flame Level 1.\nIncreases attack by 20 at Inner Flame Level 2.\nIncreases attack by 40 at Inner Flame Level 3."}, {"name": "Carving Expert", "description": "Yields 1 additional material when carving small monsters. Takes effect as long as the Adventurer is in the squad."}, {"name": "Fire Damage Up", "description": "Increases fire damage by 10%."}]'::jsonb, 'Freya is a Disruptor adventurer who wields a great sword, dealing primarily sever damage. She can guard while quickly sheathing, or use the momentum to perform a powerful forward strike. Using Skill 3, Spiral Sheathe, she can quickly sheathe her weapon and leverage Inner Flame to rapidly chain into different slashes to respond to monster actions.', 'The expansion of civilization is often accompanied by the wrath of the wilds; from childhood, Freya witnessed firsthand how difficult it was for all things to coexist amid endless conflict.', NULL, '/images/adventurers/101003_head.webp', '/images/adventurers/101003_bust.webp', 2),
  ('101002', 'luxheart', 'Luxheart', NULL, 'epic', 'male', 'great_sword', 'thunder', 'Disrupter', 'Mac', '[]'::jsonb, NULL, 'Adventurer, or pyrotechnician? Why not both?
As a man with "flamboyance" etched into his very bones, Luxheart always claimed his travels were to "explore the mysteries of nature."', NULL, '/images/adventurers/101002_head.webp', '/images/adventurers/101002_bust.webp', 3),
  ('102002', 'midori', 'Midori', 'Gorgeous Dancer', 'superior', 'female', 'long_sword', 'fire', 'Assault', 'Shadow', '[{"name": "Grand Entrance", "description": "When consuming Spirit Gauge level, increases damage by 5% for 5s, up to 3 stacks."}, {"name": "Carving Expert", "description": "Yields 1 additional material when carving small monsters. Takes effect as long as the Adventurer is in the squad."}, {"name": "Fire Damage Up", "description": "Increases fire damage by 10%."}]'::jsonb, 'Midori is an Assault adventurer who wields a long sword, dealing primarily sever damage. Hold Skill 1 to build up the Spirit Gauge, increasing the Spirit Gauge by 60% each time; landing a hit increases the Spirit Gauge Level by 1.
Tap Skill 1 and Skill 2 to consume the Spirit Gauge and raise the Spirit Gauge Level.', 'From a young age, Midori trained in both martial arts and music. Blessed with unmatched talent, she quickly distinguished herself on the path of the warrior.', NULL, '/images/adventurers/102002_head.webp', '/images/adventurers/102002_bust.webp', 4),
  ('102004', NULL, 'Ryunosuke', 'Gluttonous Wanderer', 'epic', 'male', 'long_sword', 'fire', 'Support', 'Bladey', '[{"name": "Exclusive Trait", "description": "For every 1 Spirit Gauge level consumed, increases attack by 5% for 5s, up to 3 stacks."}, {"name": "Botanist", "description": "25% chance to yield 1 additional plant per gather. Takes effect as long as the Adventurer is in the squad."}, {"name": "Water Damage Up", "description": "Increases water damage by 5."}, {"name": "Physical Damage Reduction", "description": "Reduces fixed damage by 17%."}]'::jsonb, 'Ryunosuke is a Support adventurer who wields a long sword, dealing primarily sever damage. He can enter the Feasting status via Skill 1 and Skill 2. During Feasting, he can move freely, and when his Spirit Gauge is full, he can unleash different powerful follow-ups depending on which skill he uses.', 'Ryunosuke has always treated "trouble" as his sworn enemy, and only the finest delicacies could stir any hint of interest in him—but beneath that indolent exterior always lay the courage to draw his blade for his comrades.', NULL, '/images/adventurers/102004_head.webp', '/images/adventurers/102004_bust.webp', 5),
  ('104001', 'keres', 'Keres', 'Silent Frenzy', 'superior', 'female', 'dual_blades', 'dragon', 'Disrupter', 'Wolfe', '[{"name": "Awareness", "description": "Dragon damage dealt to weak points is increased by 40%."}, {"name": "Scavenger", "description": "25% chance to yield 1 additional bone per gather. Takes effect as long as the Adventurer is in the squad."}, {"name": "Fortitude Damage Up", "description": "Increases fortitude depletion by 10%."}]'::jsonb, 'Keres is a Disruptor adventurer who wields dual blades, dealing primarily sever damage. She deals damage to fill the Demon Gauge, then spends the Demon Gauge to enter Demon Mode, unleashing Enhanced Chain Slash: Bone Piercer through skill follow-ups or successful parries for massive damage.', 'From childhood, Keres drifted like a rootless leaf through the perilous wilderness. Through nature''s harsh trials, she honed a beast-like sharp instinct and unmatched survival skills.', NULL, '/images/adventurers/104001_head.webp', '/images/adventurers/104001_bust.webp', 6),
  ('104002', 'raya', 'Raya', 'Boundless Spirit', 'epic', 'female', 'dual_blades', 'fire', 'Disrupter', 'Pupo', '[{"name": "Trump Card", "description": "Triggering combo increases Demon Gauge by an additional 5."}, {"name": "Butcher", "description": "Yields 1 additional material when carving large monsters. Takes effect as long as the Adventurer is in the squad."}, {"name": "Fire Damage Up", "description": "Increases fire damage by 10%."}]'::jsonb, 'Raya is a Disruptor adventurer who wields dual blades, dealing primarily sever damage. Landing skill hits on monsters builds the Demon Gauge. Once full, tap Skill 1 to enter Demon Mode.', 'From a young age, she traveled with a touring dance troupe, and thanks to her naturally graceful figure, she mastered a mesmerizing dance style that captivated all who saw it—quickly becoming the troupe''s brightest star.', NULL, '/images/adventurers/104002_head.webp', '/images/adventurers/104002_bust.webp', 7),
  ('104004', NULL, 'Haze', NULL, 'superior', 'female', 'dual_blades', 'thunder', 'Support', 'Mith', '[{"name": "Exclusive Trait", "description": "In Normal Mode, each basic attack grants 1 stamina on hit."}, {"name": "Butcher", "description": "Yields 1 additional material when carving large monsters. Takes effect as long as the Adventurer is in the squad."}, {"name": "Thunder Crit Damage Up", "description": "Increases thunder critical damage by 10%."}, {"name": "Non-elemental Damage Up", "description": "Increases fixed damage by 10%."}]'::jsonb, 'Haze is a Support Adventurer who wields dual blades, dealing primarily severing damage. After entering Demon Mode, landing attacks builds up the Demon Gauge; once the Demon Gauge is full, she can enter Archdemon Mode, sustaining damage output through Crimson Fang Slash and maintaining Deflect to keep her Chain Slash going.', 'An eternal mist that never lifted was once Haze''s most comforting shield. She and her people lived in seclusion within a deep valley for generations, finding a unique peace within the darkness.', NULL, '/images/adventurers/104004_head.webp', '/images/adventurers/104004_bust.webp', 8),
  ('107001', 'ouyang_varen', 'Ouyang Varen', 'Righteous Guardian', 'epic', 'male', 'lance', 'water', 'Assault', 'Aloo', '[{"name": "Heart of Justice", "description": "Each Basic Attack increases Attack by 5% for 10s, stacking up to 3 times.\nOuyang Varen gains Sharpness from skills. Sharpness increases certain skill damage but resets when attacks stop."}, {"name": "Geologist", "description": "25% chance to yield 1 additional ore per gather. Takes effect as long as the Adventurer is in the squad."}, {"name": "Skill Damage Up", "description": "Increases skill damage by 5%."}]'::jsonb, 'Ouyang Varen is an Assault adventurer who wields a lance, dealing primarily sever damage. Hold Skill 3 to charge and gain Sharpness stacks, then spend them to perform a long-range thrust for massive damage. After releasing Skill 3, chain into Skill 2 to follow up.', 'Ouyang Varen was once a soldier stationed in the desert, guarding passing caravans day after day amid the shifting sands, single-handedly sustaining the lifeline of an entire trade route.', '185 cm', '/images/adventurers/107001_head.webp', '/images/adventurers/107001_bust.webp', 9),
  ('113001', 'pepper', 'Pepper', 'Bubbly Spark', 'superior', 'female', 'heavy_bowgun', 'water', 'Disrupter', 'Boomie', '[{"name": "Aerial Fighter", "description": "Pepper excels at leveraging the powerful firepower of Spread Ammo. Regardless of the ammo type loaded, Spread Ammo will be used, with greater range and tighter spread."}, {"name": "Geologist", "description": "25% chance to yield 1 additional ore per gather. Takes effect as long as the Adventurer is in the squad."}]'::jsonb, NULL, 'Born in a land of eternal frost, Pepper spent countless days trapped indoors by unending blizzards. The only comfort she found was in adventure books depicting the vast world beyond her window.', NULL, '/images/adventurers/113001_head.webp', '/images/adventurers/113001_bust.webp', 10),
  ('114002', NULL, 'Madelyn', 'Fatal Cure', 'epic', 'female', 'bow', 'water', 'Support', 'Viper', '[{"name": "Regenerative Factor", "description": "When Ultimate charge efficiency is 10% or higher, Skill 2 and Skill 3 damage increases by 5% for every 1% additional Ultimate charge efficiency.\nWhen Ultimate charge efficiency is 20% or higher, Skill 2 and Skill 3 damage increases by 5%, and the Ultimate''s recovery effect increases by 20%, for every 1% additional Ultimate charge efficiency."}, {"name": "Botanist", "description": "25% chance to yield 1 additional plant per gather. Takes effect as long as the Adventurer is in the squad."}, {"name": "Physical Specialization", "description": "When equipped with a non-elemental or ailment weapon (paralysis, poison, sleep, blast), this Adventurer deals 30% more damage."}]'::jsonb, 'Madelyn is a Support adventurer who wields the bow, dealing primarily ammo damage. Her Basic Attack generates Catalyst Coatings, and her Skill 1 consumes stamina to perform a dash attack that also generates Catalyst Coatings.', 'Madelyn was born in a remote land perpetually shrouded in rain and mist. To solve the constant scarcity of crops, she buried herself in books, determined to protect her homeland through knowledge.', NULL, '/images/adventurers/114002_head.webp', '/images/adventurers/114002_bust.webp', 11),
  ('114003', NULL, 'Luka', 'Surging Lightning', 'superior', 'male', 'bow', 'thunder', 'Assault', 'Zira', '[{"name": "Piercing Transformation", "description": "Luka''s arrows deal piercing damage, hitting multiple times depending on the monster''s size.\nThe max number of piercing hits increases with the charge level, reaching 3/4/5/6 hits respectively. The 3rd, 4th, 5th, and 6th piercing hits deal reduced damage by 10%, 30%, 50%, 70% respectively."}, {"name": "Botanist", "description": "25% chance to yield 1 additional plant per gather. Takes effect as long as the Adventurer is in the squad."}, {"name": "Thunder Damage Up", "description": "Increases thunder damage by 10%."}, {"name": "Defense Up", "description": "Increases defense by 30%."}]'::jsonb, 'Luka is an Assault adventurer who wields the bow, dealing primarily ammo damage. All arrows shot become Piercing Arrows. Accumulate Thunder Coating energy through movement skills, then expend Thunder Coating energy to unleash Skill 3 for massive damage. Precisely tapping Skill 1 while shooting can trigger Thunderous Spin.', 'Luka was born amid the mountains, as free and untamed as the wind. The harsh trials of the wilderness never dulled his edge. Instead, they gave him a bird-like agility and an unmatched gift for marksmanship.', NULL, '/images/adventurers/114003_head.webp', '/images/adventurers/114003_bust.webp', 12),
  ('114004', NULL, 'Stylia', 'Heart of the Thaw', 'superior', 'female', 'bow', 'ice', 'Support', 'Lynn', '[{"name": "Regenerative Factor", "description": "When Ultimate charge efficiency is 10% or higher, Skill 2 and Skill 3 damage increases by 5% for every 1% additional Ultimate charge efficiency.\nWhen Ultimate charge efficiency is 20% or higher, Skill 2 and Skill 3 damage increases by 5%, and the Ultimate''s recovery effect increases by 20%, for every 1% additional Ultimate charge efficiency."}, {"name": "Botanist", "description": "25% chance to yield 1 additional plant per gather. Takes effect as long as the Adventurer is in the squad."}, {"name": "Physical Specialization", "description": "When equipped with a non-elemental or ailment weapon (paralysis, poison, sleep, blast), this Adventurer deals 30% more damage."}]'::jsonb, 'Stylia is a Support adventurer who wields the bow, dealing primarily ammo damage. Her Basic Attacks and skills can shift the Performance Frequency. When the Performance Frequency is in the Resonance Phase, all skills are enhanced; when the Performance Frequency is in the Elegy Phase, some skills are locked.', 'As a cherished young lady from a prestigious house in the northern lands, Stylia moves with effortless elegance in every gesture. Her only worry is the traditional dance she has long struggled to complete.', NULL, '/images/adventurers/114004_head.webp', '/images/adventurers/114004_bust.webp', 13),
  ('107002', 'arkaya', 'Arkaya', 'Pillar of the Desert', 'superior', 'male', 'lance', 'dragon', 'Support', 'Horn', '[{"name": "Heart of Justice", "description": "Each Basic Attack increases Attack by 5% for 10s, stacking up to 3 times.\nOuyang Varen gains Sharpness from skills. Sharpness increases certain skill damage but resets when attacks stop."}, {"name": "Geologist", "description": "25% chance to yield 1 additional ore per gather. Takes effect as long as the Adventurer is in the squad."}, {"name": "Skill Damage Up", "description": "Increases skill damage by 5%."}]'::jsonb, 'Arkaya is a Support adventurer who wields the lance, dealing primarily sever damage. His Ultimate, Indomitable Oath, grants shields to the entire squad, absorbing significant damage. He can also use Earthrend Finisher to gain a shield himself while dealing heavy damage.', 'Arkaya was born in a canyon settlement surrounded by towering stone. Despite possessing a physique powerful enough to shake rock itself, he was gentle by nature, quietly using his strength to protect his people.', '185 cm', '/images/adventurers/107002_head.webp', '/images/adventurers/107002_bust.webp', 14),
  ('105001', 'rhodes', 'Rhodes', 'Thunder Smith', 'superior', 'male', 'hammer', 'ice', 'Assault', 'Ron', '[{"name": "Aerial Fighter", "description": "Pepper excels at leveraging the powerful firepower of Spread Ammo. Regardless of the ammo type loaded, Spread Ammo will be used, with greater range and tighter spread."}, {"name": "Geologist", "description": "25% chance to yield 1 additional ore per gather. Takes effect as long as the Adventurer is in the squad."}]'::jsonb, 'Rhodes is an Assault adventurer who wields the hammer, dealing primarily blunt damage. His Skill 1 switches between different Charge stances, building up Steam Energy and converting it into the Core Energy. Spend the Core Energy to unleash an attack of overwhelming force.', 'Rhodes grew up to the roar of the forge, captivated from childhood by the mechanics of steam-powered machinery, pouring his talent into every creation with unwavering confidence that his inventions could help him explore the world.', NULL, '/images/adventurers/105001_head.webp', '/images/adventurers/105001_bust.webp', 15);

INSERT INTO public.adventurers
  (id, name, name_ja, image, background_image, is_default, weapon_type, allowed_weapon_types,
   element_specialization, role, description, notes, is_active, sort_order, rarity,
   title, gender, default_buddy, traits, playstyle, height)
SELECT i.id, i.name, o.name_ja, i.image, i.background_image, FALSE, i.weapon_type, ARRAY[i.weapon_type],
       i.element, i.role, i.description, o.notes, COALESCE(o.is_active, TRUE), i.sort_order, i.rarity,
       i.title, i.gender, i.default_buddy, i.traits, i.playstyle, i.height
FROM _adv_import i
LEFT JOIN public.adventurers o ON o.id = i.old_id;

UPDATE public.user_adventurer_collection t SET adventurer_id = i.id FROM _adv_import i WHERE t.adventurer_id = i.old_id;
UPDATE public.hunter_challenges t SET adventurer_id = i.id FROM _adv_import i WHERE t.adventurer_id = i.old_id;
UPDATE public.mho_builds t SET adventurer_id = i.id FROM _adv_import i WHERE t.adventurer_id = i.old_id;

-- Challenges keep a copy of the portrait; point it at the new head icon
UPDATE public.hunter_challenges h SET piece_image = a.image, set_icon = a.image
FROM public.adventurers a WHERE h.adventurer_id = a.id AND h.adventurer_id IN (SELECT id FROM _adv_import);

DELETE FROM public.adventurers WHERE id IN (SELECT old_id FROM _adv_import WHERE old_id IS NOT NULL);

INSERT INTO public.adventurer_skills (adventurer_id, sort_order, name, skill_type, description) VALUES
  ('101001', 1, 'Charged Slash', 'Damage / Basic Attack', NULL),
  ('101001', 2, 'Heat Tackle', 'Guard / React', NULL),
  ('101001', 3, 'Reckless Charge Slash', 'Dash', NULL),
  ('101001', 4, 'Fortifying Slash', 'Damage / Burst', NULL),
  ('101001', 5, 'Peerless V-Slash', 'Control', NULL),
  ('101001', 6, 'Blazing Fury', 'Damage / Attack', NULL),
  ('101001', 7, 'Evade', 'Dash', NULL),
  ('101001', 8, 'Fortifying Follow-Up', 'Dash', NULL),
  ('101003', 1, 'Evade', 'Dash', NULL),
  ('101003', 2, 'Charged Slash', 'Damage / Basic Attack', NULL),
  ('101003', 3, 'Guard', 'Guard / React', NULL),
  ('101003', 4, 'Spiral Sheathe', 'Damage / Burst', NULL),
  ('101003', 5, 'Blazing Anchor', 'Damage / Attack', NULL),
  ('101003', 6, 'Blazing Soul Incineration', 'Damage / Attack', NULL),
  ('101003', 7, 'Flameblade Burst', 'Damage / Attack', NULL),
  ('101003', 8, 'Flameblade Burst', 'Damage / Attack', NULL),
  ('101003', 9, 'Inner Flame Vulnerability', 'Damage / Attack', NULL),
  ('101002', 1, 'Charged Slash', 'Damage / Basic Attack', NULL),
  ('101002', 2, 'Evade', 'Dash', NULL),
  ('101002', 3, 'Guard', 'Guard / React', NULL),
  ('101002', 4, 'Starlight Burst', 'Guard / Attack', NULL),
  ('101002', 5, 'Grand Performance', 'Burst', NULL),
  ('101002', 6, 'Heating Up', 'Guard / Control', NULL),
  ('101002', 7, 'Starlight Devastation', 'Guard', NULL),
  ('101002', 8, 'Perfect Partners', 'Guard', NULL),
  ('101002', 9, 'Perfect Partners', 'Guard', NULL),
  ('102002', 1, 'Chain Slash', 'Charge / Basic Attack', NULL),
  ('102002', 2, 'Spirit Slash', 'Enhance / Attack', 'Midori quickly dashes forward, then performs a horizontal slash.
If the slash lands, tap Basic Attack again at the right moment to unleash Spirit Roundslash, increasing the Spirit Gauge level by 1.'),
  ('102002', 3, 'Blade of Truth', 'Enhance / Attack', NULL),
  ('102002', 4, 'Moment of Insight', 'Burst', NULL),
  ('102002', 5, 'Felyne Draw Technique', 'Control', NULL),
  ('102002', 6, 'Final Curtain', 'Burst', NULL),
  ('102002', 7, 'Evade', 'Dash', NULL),
  ('102002', 8, 'Instant Follow-Up', 'Dash', NULL),
  ('102004', 1, 'Chain Slash', 'Damage / Basic Attack', NULL),
  ('102004', 2, 'Evade', 'Dash', NULL),
  ('102004', 3, 'Spirit Slash', 'Damage / Attack', NULL),
  ('102004', 4, 'Inebriated', 'Damage / React', NULL),
  ('102004', 5, 'Piercing Flavors', 'Damage / Burst', NULL),
  ('102004', 6, 'Hunger Slash', 'Damage', NULL),
  ('102004', 7, 'Hunger Slash', 'Damage', NULL),
  ('102004', 8, 'Grand Feast', 'Recharge', NULL),
  ('102004', 9, 'Myriad Flavors Charge', 'Recharge', NULL),
  ('104001', 1, 'Chain Slash', 'Damage / Basic Attack', 'Keres swings her dual blades, performing up to 4 consecutive attacks on the target.
While in Fanged Demon Mode, her movement speed and attack are enhanced, she becomes immune to knockback, and her attacks fill her Demon Gauge on hit.'),
  ('104001', 2, 'Lupine Demon Mode', 'Damage / Enhance', NULL),
  ('104001', 3, 'Evasive Fang', 'Damage / React', NULL),
  ('104001', 4, 'Wolf Howl', 'Burst', NULL),
  ('104001', 5, 'Spiral Onslaught', 'Dash', NULL),
  ('104001', 6, 'Spiral Onslaught', 'Dash', NULL),
  ('104001', 7, 'Bone Frenzy', 'Disruptor / Attack', NULL),
  ('104001', 8, 'Evade', 'Dash', NULL),
  ('104001', 9, 'Feral Intimidation', 'Damage / Attack', NULL),
  ('104002', 1, 'Chain Slash', 'Damage / Basic Attack', 'Raya swings her dual blades, striking the target up to 4 times in succession.
While in Predator Demon Mode, Raya''s basic attacks have a different attack pattern and increased power.'),
  ('104002', 2, 'Demon Mode', 'Enhance', NULL),
  ('104002', 3, 'Whirling Dance', 'Parry / React', NULL),
  ('104002', 4, 'Chain Dance', 'Damage / Burst', NULL),
  ('104002', 5, 'Returning Dance', 'Control', NULL),
  ('104002', 6, 'Returning Dance', 'Control', NULL),
  ('104002', 7, 'Berserker Dance', 'Control', NULL),
  ('104002', 8, 'Evade', 'Dash', NULL),
  ('104002', 9, 'Whirling Intimidation', 'Control', NULL),
  ('104004', 1, 'Chain Slash', 'Damage / Basic Attack', NULL),
  ('104004', 2, 'Demon Mode', 'Enhance', NULL),
  ('104004', 3, 'Circling Chain Slash', 'Dash', NULL),
  ('104004', 4, 'Waning Moon Slash', 'Burst', NULL),
  ('104004', 5, 'Evade', 'Dash', NULL),
  ('104004', 6, 'Scarlet Mark', 'Enhance', NULL),
  ('104004', 7, 'Windrending Strike', 'Damage', NULL),
  ('104004', 8, 'Windrending Strike', 'Damage', NULL),
  ('104004', 9, 'Waning Moon Charge', 'Damage', NULL),
  ('107001', 1, 'Thrust', 'Damage / Basic Attack', 'Perform a triple thrust in the lock-on direction. If the lock-on point is high, the thrusts will automatically aim upward. The final thrust has a longer wind-up, resulting in higher damage and better performance. Can be chained up to 3 times.
If the third thrust connects and is chained into Charge Thrust, it increases Charge Thrust''s charge level by 1.'),
  ('107001', 2, 'Piercing Thrust', 'Burst', 'Hold Skill 3 to charge up to level 3, then release to lunge in the chosen direction. Higher charge levels increase both lunge damage and distance.
If the charge level is 2 or higher, the attack has Unwavering.
The charge level can be carried over from other skills, but will be reset if idle or guarding for too long.
After performing Charge Thrust, tap Skill 2 to chain into Powerful Sweep. Powerful Sweep inherits Charge Thrust''s charge level, dealing higher damage and restoring more stamina at higher levels.

Rapid Thrust consumes 30–60 stamina.'),
  ('107001', 3, 'Defensive Maneuver', 'Parry / React', 'Quickly move backward or in the input direction, with a window for negating monster attacks.
If chained into Skill 3: Charge Thrust, the charge level bonus from other skills will be carried over. If Defensive Maneuver''s jump evades a monster attack, Charge Thrust''s charge level is further increased by 1.
After using Defensive Maneuver, tap Skill 2 again to chain into Strong Wide Slash, quickly closing in on the monster and dealing damage.
Defensive Maneuver consumes 20 stamina.'),
  ('107001', 4, 'Earthshaker', 'Control', NULL),
  ('107001', 5, 'Defensive Maneuver', 'Control', NULL),
  ('107001', 6, 'Earthshaker', 'Control', NULL),
  ('107001', 7, 'Sentinel Thrust', 'Burst', 'Consume 100 Ultimate Energy to charge up and unleash a series of consecutive attacks.'),
  ('107001', 8, 'Evade', 'Dash', NULL),
  ('107001', 9, 'Defensive Stance', 'Guard / React', 'Ouyang Varen swiftly moves in front of a squad member and raises his shield, granting squad members within 5 meters invulnerability for 5s.
After a successful guard, Ouyang Varen will perform guard bash, raising his shield and dashing forward to deal damage. During this time, squad members within 5 meters can tap Basic Attack to perform a Perfect Evade Counter.'),
  ('107001', 10, 'Breaching Follow-Up', 'Damage / Attack', NULL),
  ('113001', 1, 'Shoot', 'Damage / Basic Attack', NULL),
  ('113001', 2, 'Bouncy Dash', 'Dash', NULL),
  ('113001', 3, 'Pressurized Blast', 'Damage / Burst', NULL),
  ('113001', 4, 'Fluffy, Attack!', 'Control', NULL),
  ('113001', 5, 'Evade', 'Dash', NULL),
  ('113001', 6, 'Guard', 'Guard / React', NULL),
  ('113001', 7, 'Aerial Waltz', 'Control', NULL),
  ('113001', 8, 'Aerial Waltz', 'Control', NULL),
  ('113001', 9, 'Devastating Pressure', 'Control', NULL),
  ('114002', 1, 'Rapid Fire', 'Damage / Basic Attack', NULL),
  ('114002', 2, 'Slide Shot', 'Damage / Dash', NULL),
  ('114002', 3, 'Catalyst Burst', 'Burst / Attack', NULL),
  ('114002', 4, 'Spore Adhesion', 'Charge / Attack', NULL),
  ('114002', 5, 'Leaping Arrow', 'Control', NULL),
  ('114002', 6, 'Leaping Arrow', 'Control', NULL),
  ('114002', 7, 'Stellar Injection', 'Heal', NULL),
  ('114002', 8, 'Piercing Shot', 'Dash', NULL),
  ('114002', 9, 'Violet Plume Charge', 'Damage / Attack', NULL),
  ('114003', 1, 'Rapid Fire', 'Basic Attack', NULL),
  ('114003', 2, 'Thunderous Spin', 'Dash', NULL),
  ('114003', 3, 'Arc Slash', 'Dash', NULL),
  ('114003', 4, 'Swift Volley', 'Burst', NULL),
  ('114003', 5, 'Voltic Volley', 'Burst', NULL),
  ('114003', 6, 'Evade', NULL, NULL),
  ('114003', 7, 'Felyne Arrow', 'Attack', NULL),
  ('114003', 8, 'Felyne Arrow', 'Attack', NULL),
  ('114003', 9, 'Swift Follow-Up', 'Attack', NULL),
  ('114004', 1, 'Rapid Fire', 'Basic Attack', 'Tap Basic Attack to fire an arrow at a longer range.
Hold Basic Attack to charge, up to 4 charge levels.
During the Prelude Phase and Resonance Phase, each shot that hits the monster increases Performance Frequency by 5 and raises the charge level by 1, up to 4 charge levels.
During the Elegy Phase, each shot that hits the monster raises the charge level by 1, up to 4 charge levels.'),
  ('114004', 2, 'Waltz', 'Dash', NULL),
  ('114004', 3, 'Swan Step', 'Attack', NULL),
  ('114004', 4, 'Double Lutz', 'Attack', NULL),
  ('114004', 5, 'Princess''s Flight', 'Attack', 'Tap Co-op Skill, and Stylia begins to play, striking up a rousing melody. Inspired, the Buddy joins other companions in charging the monster, dealing damage while Stylia enters Resonance Phase.
If Co-op Skill hits the co-op focus part, co-op phase increases.'),
  ('114004', 6, 'Princess''s Flight', 'Attack', NULL),
  ('114004', 7, 'Royal Salutation', NULL, 'Tap Ultimate to have Stylia continuously play a harp concerto. The 1st strum during the performance grants all squad members 1 stack of a buff that increases all elemental damage by 6%. The 2nd strum grants all squad members 2 stacks of a buff that increases all elemental damage by 6%, up to 3 stacks. When the performance begins, Stylia''s Resonance Phase window expands by 20%, lasting 15s.'),
  ('114004', 8, 'Evade', NULL, 'Tap Roll to evade the monster''s attack in the direction indicated by the joystick.
Successfully performing a Perfect Evade grants 0.5s of invincibility.'),
  ('114004', 9, 'Resonance Charge', NULL, NULL),
  ('107002', 1, 'Thrust', 'Damage / Basic Attack', NULL),
  ('107002', 2, 'Boulder Stance', 'Guard / React', NULL),
  ('107002', 3, 'Driving Assault', 'Damage / Dash', NULL),
  ('107002', 4, 'Relentless Thrust', 'Burst', NULL),
  ('107002', 5, 'Evade', NULL, NULL),
  ('107002', 6, 'Indomitable Oath', 'Shield', NULL),
  ('107002', 7, 'Falcon Thrust', 'Damage / Attack', NULL),
  ('107002', 8, 'Falcon Thrust', 'Damage / Attack', NULL),
  ('107002', 9, 'Battle Spirit Charge', 'Damage / Attack', NULL),
  ('105001', 1, 'Overhead Smash', 'Basic Attack', NULL),
  ('105001', 2, 'Charge', 'Attack', NULL),
  ('105001', 3, 'Steam Stance', 'React', NULL),
  ('105001', 4, 'Steam Skyrender', 'Burst', NULL),
  ('105001', 5, 'Evade', NULL, NULL),
  ('105001', 6, 'Mega Hammer', 'Attack', NULL),
  ('105001', 7, 'Felyne Flywheel Smash!', 'Control', NULL),
  ('105001', 8, 'Felyne Flywheel Smash!', 'Control', NULL),
  ('105001', 9, 'Steam Follow-Up', NULL, NULL);

COMMIT;
