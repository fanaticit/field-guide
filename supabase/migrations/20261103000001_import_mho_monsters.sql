-- ============================================================
-- Migration: 20261103000001 — Import MHO monster list
-- Source: import/MHO_monsters.csv (+ import/MonsterIcon)
--   * monsters.id becomes the numeric id from the CSV
--   * is_radiant = name contains "radiant"; parent_id links radiants to their base
--   * icon replaced with /images/monsters/MonsterIcon_*.png, notes = description
--   * monsters not in the CSV are deleted
-- Dependent tables are re-pointed from the old slug id to the new id.
-- ============================================================

BEGIN;

CREATE TEMP TABLE _monster_id_map (old_id TEXT PRIMARY KEY, new_id TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO _monster_id_map (old_id, new_id) VALUES
  ('great_jagras', '110101'),
  ('kulu_ya_ku', '110701'),
  ('pukei_pukei', '110201'),
  ('barroth', '104401'),
  ('jyuratodus', '110801'),
  ('tobi_kadachi', '110901'),
  ('anjanath', '110001'),
  ('rathian', '100101'),
  ('tzitzi_ya_ku', '112001'),
  ('paolumu', '111001'),
  ('legiana', '111101'),
  ('rathalos', '100201'),
  ('diablos', '100701'),
  ('great_girros', '111201'),
  ('nergigante', '110301'),
  ('radobaan', '111401'),
  ('odogaron', '111301'),
  ('black_diablos', '100702'),
  ('kushala_daora', '102401'),
  ('pink_rathian', '100102'),
  ('radiant_barroth', '104410'),
  ('radiant_anjanath', '110010'),
  ('radiant_rathian', '199901'),
  ('radiant_rathalos', '100210'),
  ('radiant_diablos', '100710'),
  ('radiant_great_girros', '111210'),
  ('radiant_radobaan', '111410'),
  ('radiant_tzitzi_ya_ku', '112010');

INSERT INTO public.monsters
  (id, name, name_ja, species, tier, elements, weaknesses, is_variant, is_radiant, is_active, icon, sort_order, notes)
VALUES
  ('110101', 'Great Jagras', 'ドスジャグラス', 'fanged_wyvern', 'low', ARRAY['none']::text[], ARRAY['fire','poison','paralysis','blast','sleep']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_GreatJagras.png', 1, 'Leaders of Jagras packs. When hungry, Great Jagras are known to attack monsters even stronger than themselves. Their habit of swallowing prey whole is a truly astonishing sight.
Once prey is fully swallowed, their stomachs become inflated, and they will boldly use their bloated bellies to attack. Focusing attacks on the stomach to force them to disgorge their prey is an efficient way to weaken them.'),
  ('110701', 'Kulu-Ya-Ku', 'クルルヤック', 'bird_wyvern', 'low', ARRAY['none']::text[], ARRAY['water','ice']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_KuluYaKu.png', 2, 'Odd Bird Wyverns that have developed limbs capable of carrying objects. They''ve been spotted stealing eggs from the lairs of other monsters.
Beyond holding rocks for protection, they also seem to use them as weapons, smashing them against foes. Flash Pods can startle them, as can cleverly luring them toward natural predators. The key is preventing them from getting the chance to use rocks at all.'),
  ('110201', 'Pukei-Pukei', 'プケプケ', 'bird_wyvern', 'low', ARRAY['poison']::text[], ARRAY['thunder','paralysis','sleep']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Pukei.png', 3, 'Bird Wyverns known to carry venom within their bodies. They have been spotted storing scatternuts in their mouths or tails, coating them with venom before spitting them out at threats.
They mix plants with their internal venom to spit out toxins of varying properties. After eating a large amounts of plants, they can also expel venom in a massive burst from their tails. Clearing out their favorite plants in the area first can prevent their unpredictable venom breath attacks.'),
  ('104401', 'Barroth', 'ボルボロス', 'brute_wyvern', 'low', ARRAY['water']::text[], ARRAY['fire','poison','blast']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Barroth.png', 4, 'Barroth seek out ants, their favorite snack, and are often seen patrolling their territory. No matter the opponent, they meet any intruder on their territory with their signature charge.
The hardened mud caked on their bodies not only boosts their defense, but can also be flung at foes as an attack. It''s best to strip away the mud first with water weapons, which they fear, to gain the upper hand.'),
  ('110801', 'Jyuratodus', 'ジュラトドス', 'piscine_wyvern', 'low', ARRAY['water']::text[], ARRAY['thunder']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Jyuratodus.png', 5, 'Large Piscine Wyverns that inhabit the depths of swamps. They use mud to capture prey and protect themselves, and they''re known to battle Barroth over territory.
They move swiftly in swamps, so try to lure them onto land if possible. Their mud-caked parts boast higher defense, so stripping the mud away with water weapons is the best way to gain the upper hand.'),
  ('110901', 'Tobi-Kadachi', 'トビカガチ', 'fanged_wyvern', 'low', ARRAY['thunder']::text[], ARRAY['water','ice']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_FlyingThunderDragon.png', 6, 'Fanged Wyverns that fly among the trees. Their penchant for brushing against the ground and the trees as they move around builds up static electricity within their fur.
They move freely between the trees and the ground, so adventurers must stay alert for attacks from blind spots. The key to a successful hunt is keeping them within view using tactics like "Lock-On," preventing their movement and stopping them from entering an electrified state.'),
  ('110001', 'Anjanath', 'アンジャナフ', 'brute_wyvern', 'low', ARRAY['fire']::text[], ARRAY['water','ice']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Anjanath.png', 7, 'Anjanath patrol areas densely populated by their favorite meal, Aptonoths. These belligerent monsters will attack anything without hesitation.
A specialized organ in their throat allows them to store flame, and they have been confirmed to unleash intense fire breath from it. Aiming for the throat can suppress this buildup, providing a significant advantage.'),
  ('100101', 'Rathian', 'リオレイア', 'flying_wyvern', 'high', ARRAY['fire']::text[], ARRAY['dragon','thunder']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Rathian.png', 8, 'Wyverns that hunt mainly on the ground, also known as the "Queens of the Land." Sightings suggest that males and females sometimes hunt together, overpowering prey with powerful legs and venomous tails.
Guard against their poison tails and fire breath attacks—watch for an opening to sever their tails or boost your fire resistance to gain the upper hand in the hunt.'),
  ('112001', 'Tzitzi-Ya-Ku', 'ツィツィヤック', 'bird_wyvern', 'low', ARRAY['none']::text[], ARRAY['ice']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_DizzyBird.png', 9, 'These odd monsters blind both prey and enemies with the Flash Fins near their heads. They then use their strong legs to deliver finishing blows.
Since the intense flash is emitted forward from the head, circling behind them the moment their Flash Fins begin to open is an effective counter. Destroying the Flash Fins also reduces the range of the blinding light.'),
  ('111001', 'Paolumu', 'パオウルムー', 'flying_wyvern', 'high', ARRAY['none']::text[], ARRAY['fire','blast']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Paolumu.png', 10, 'Flying Wyverns that are able to float through the air using unique sacs in their bodies, and attack with their extremely hard tails.
Without air to expel, their movement becomes restricted, leaving openings in their actions. Aim for the parts where they store air, or deliberately provoke actions that consume it. The key to the hunt is never letting them get the chance to build up air in their bodies.'),
  ('111101', 'Legiana', 'レイギエナ', 'flying_wyvern', 'high', ARRAY['ice']::text[], ARRAY['poison','fire']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Legiana.png', 11, 'Wyverns with exceptional flying ability whose diet primarily consists of Raphinos. They emit chilling air from their bodies to dull their prey''s movements before beginning their hunt.
They can control their posture through the membranes on various parts of their bodies, allowing for agile, sweeping turns. Destroy these membranes to gain the upper hand. Poison attacks have also been confirmed effective.'),
  ('100201', 'Rathalos', 'リオレウス', 'flying_wyvern', 'high', ARRAY['fire','poison']::text[], ARRAY['dragon','thunder']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Rathalos.png', 12, 'Apex monsters of the forests, also known as the "Kings of the Skies." They leave shed scales and claw marks across their territory, and will attack mercilessly even if the intruder is another monster.
Since they circle overhead to unleash various attacks, it''s best to use Flash Pods to blind them and force them back to the ground. Destroying their wings seems to create an opening when they attempt to take flight.'),
  ('100701', 'Diablos', 'ディアブロス', 'flying_wyvern', 'high', ARRAY['none']::text[], ARRAY['ice','dragon','paralysis']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Diablos.png', 13, 'Apex monsters of desert regions with intense territorial instincts and tyrannical aggression. Any prey that makes too much noise on the surface of their territory is dragged underground.
Once they burrow, they become difficult to deal with, so luring them out with loud noises is an effective tactic. Their horn charge attacks carry astonishing destructive force, but if baited into ramming a sand pillar, that same force can be turned against them to create an opening.'),
  ('111201', 'Great Girros', 'ドスギルオス', 'fanged_wyvern', 'low', ARRAY['paralysis']::text[], ARRAY['water','ice']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_DabiThiefDragon.png', 14, 'Monsters that roam with Girros in tow, searching for carrion left behind by other monsters. Their large fangs contain paralytic venom used to finish off prey.
They are known to hunt in packs alongside Girros, so when hunting them, focus on slaying or staggering the Girros first to remove the threat while dealing with the main target. Breaking their fangs will also weaken the effects of their paralytic venom.'),
  ('110301', 'Nergigante', 'ネルギガンテ', 'elder_dragon', 'elder', ARRAY['none']::text[], ARRAY['thunder','blast']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Nergigante.png', 15, 'Terrible Elder Dragons that appear when other elders are in the vicinity. Their penchant for destruction, without any regard for their own well-being, is well-documented, earning them the name "Nergigante."
They seem to possess a special ability that allows their wounds to regenerate instantly. It has been confirmed that regenerated parts significantly increase in hardness over time, so breaking them as early as possible is key to gaining the upper hand.'),
  ('111401', 'Radobaan', 'ラドバルキン', 'brute_wyvern', 'high', ARRAY['sleep']::text[], ARRAY['dragon','ice','poison','blast']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Radobaan.png', 16, 'Brute Wyverns covered in bone armor. They have been observed curling into a ball for both movement and attack.
Taking damage during their rolling attack throws off their balance, and a well-timed follow-up attack can topple them. When hunting them, focus on destroying the bone armor covering their bodies to gain the advantage.'),
  ('111301', 'Odogaron', 'オドガロン', 'fanged_wyvern', 'high', ARRAY['none']::text[], ARRAY['ice','paralysis']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Odogaron.png', 17, 'Monsters that roam caves and other areas in search of food. They attack even other monsters without hesitation, and are known to carry prey and chunks of meat back to their lairs.
Beware the bleeding status inflicted by their razor-sharp claws. Provoking them into a rampaging state will eventually exhaust them, creating an opening to strike.'),
  ('100702', 'Black Diablos', 'ディアブロス亜種', 'flying_wyvern', 'high', ARRAY['none']::text[], ARRAY['ice','paralysis']::text[], TRUE, FALSE, TRUE, '/images/monsters/MonsterIcon_BlackDiablos.png', 18, 'These black-shelled Diablos are female Diablos in breeding season. Their black carapaces are thought to be a warning color to other creatures, and they are far more aggressive than the common species.
They are even more hostile toward territorial intruders than normal Diablos, charging with their massive horns even at distant threats—so don''t let your guard down, even from afar.'),
  ('102401', 'Kushala Daora', 'クシャルダオラ', 'elder_dragon', 'elder', ARRAY['ice']::text[], ARRAY['thunder','dragon','blast','poison']::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_KushalaDaora.png', 19, 'Elder Dragons that shield themselves with fierce winds, preventing anyone from approaching them. Their skin consists of hard, metallic scales.
When faced with intruders, the winds encircling their bodies gradually intensify, rendering bowgun and bow attacks ineffective. When hunting them, focus on inflicting stagger through sustained attacks while suppressing the flow of wind.'),
  ('100102', 'Pink Rathian', 'リオレイア亜種', 'flying_wyvern', 'high', ARRAY['fire','poison']::text[], ARRAY['dragon','thunder']::text[], TRUE, FALSE, TRUE, '/images/monsters/MonsterIcon_PinkRathian.png', 20, 'A subspecies of Rathian with vibrant pink scales. Pink Rathian wield their toxic tails more deftly than normal Rathian, weakening prey with poison before moving in for the kill.
Their tough spots differ from normal Rathian, with the carapaces near the base of their tails being especially hard. To sever their tails, aim for the softer tip instead.'),
  ('110110', 'Radiant Great Jagras', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_GreatJagras_LightingStone.png', 37, 'Radiantite-corrupted Fanged Wyverns unique to Aesoland. Their appetites have grown significantly, allowing them to swallow larger prey than their common counterparts and rapidly digest it to recover their health.
Driven by an insatiable hunger, they devour everything in sight until nothing remains. Once their stomachs swell, they become especially troublesome to deal with. Preventing them from eating can make the hunt considerably easier.'),
  ('110210', 'Radiant Pukei-Pukei', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_PukeiPukei_LightingStone.png', 38, 'Radiantite-corrupted Bird Wyverns unique to Aesoland. They can spew venom over a wide area, and their tails can also store large amounts of venom for spray attacks.
Their radiant particle-enhanced heads and tails can unleash venom spray more frequently. Once frenzied, the venom orbs they spit leave behind toxic pools on the ground that inflict poison upon contact. Stocking up on antidotes beforehand can make the hunt considerably easier.'),
  ('104410', 'Radiant Barroth', NULL, 'brute_wyvern', 'high', ARRAY['water']::text[], ARRAY['fire','poison','blast']::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Barroth_LightingStone.png', 23, 'Radiantite-corrupted Brute Wyverns unique to Aesoland. Their intense body heat thickens the mud coating their bodies, and they can chain charge after charge, making them far more dangerous.
They charge relentlessly in their fury, and once frenzied, fling hardened mud along their path to hinder adventurers. Stripping away the mud on their bodies makes them easier to deal with, while using blunt weapons to break their scalps can also lessen the threat of their charges.'),
  ('110810', 'Radiant Jyuratodus', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Jyuratodus_LightingStone.png', 39, 'Radiantite-corrupted Piscine Wyverns unique to Aesoland. They can spread mud over a wider area, lurking within it before launching consecutive leaping attacks.
While swimming, they generate large muddy pools to hinder adventurers'' movement. However, stripping away the mud clinging to their bodies makes them easy to handle, even during their Radiant Rage.'),
  ('110010', 'Radiant Anjanath', NULL, 'brute_wyvern', 'high', ARRAY['fire']::text[], ARRAY['water']::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Anjanath_LightingStone.png', 25, 'Radiantite-corrupted Brute Wyverns unique to Aesoland. Their volatile temperament drives them to attack with fire more frequently, and they can use Radiantite from the ground for ranged attacks.
Their radiant particle-enhanced heads can unleash even more searing breath attacks, and they use their jaws to gouge Radiantite from the ground to strike foes. Staggering them can quell their aggression, with staggers to the head being especially effective.'),
  ('199901', 'Radiant Rathian', NULL, NULL, 'low', ARRAY['fire']::text[], ARRAY['water']::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Rathian_LightingStone.png', 26, 'Radiantite-corrupted Flying Wyverns unique to Aesoland. Their venom glands have developed even further, letting them launch volatile, poison-laden crystals with a flick of their tails.
The venom crystals fired from their tails create poison pools on the ground, which explode when struck by fire attacks. Severing their tails quickly, or staying clear of the crystals'' blast radius, makes them much easier to deal with.'),
  ('100210', 'Radiant Rathalos', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Rathalos_LightingStone.png', 27, 'Radiantite-corrupted Flying Wyverns unique to Aesoland. They expel a substance that solidifies upon contact with air, then detonate it with fireballs, mercilessly punishing any intruders that enter their territory.
When frenzied, they unleash a barrage of powerful flame breath attacks, leaving solidified deposits on the ground that explode when struck by fire. Interrupting their powerful breath attacks as quickly as possible to prevent more deposits from forming is key to a successful hunt.'),
  ('100710', 'Radiant Diablos', NULL, 'flying_wyvern', 'high', '{}'::text[], ARRAY['dragon']::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Diablos_LightingStone.png', 28, 'Radiantite-corrupted Flying Wyverns unique to Aesoland. Their horns have become far more robust, capable of easily shattering surrounding rock. This allows them to move freely beneath the ground.
They only burrow underground once frenzied, bringing up large amounts of Radiantite when they emerge. They unleash continuous body attacks, and even if these miss, they follow up with a horn strike. Using Disruptor Ultimates can make the hunt considerably easier.'),
  ('110710', 'Radiant Kulu-Ya-Ku', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_KuluYaKu_LightingStone.png', 40, 'Radiantite-corrupted Bird Wyverns unique to Aesoland. With significantly enhanced foreclaw strength, they can keenly detect Radiantite buried underground and excavate it for use as weapons.
They dig up Radiantite and smash it against foes, triggering explosions on impact. They also channel energy into the Radiantite in their claws, making it even more volatile. Promptly destroying the Radiantite held in their foreclaws is key to dealing with them effectively.'),
  ('111010', 'Radiant Paolumu', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Paolumu_LightingStone.png', 41, 'Radiantite-corrupted Flying Wyverns unique to Aesoland. Their enlarged neck pouches store more air, enhancing their flight capabilities and making their flight paths far more unpredictable. They often toy with prey using erratic, unsettling aerial maneuvers before unleashing devastating strikes.
When frenzied, they continuously build up air, and have been confirmed to unleash powerful wind pressure breath attacks. Using Flash Pods or focusing attacks on their neck pouches to interrupt this buildup is key to a successful hunt.'),
  ('111110', 'Radiant Legiana', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Legiana_LightingStone.png', 42, 'Radiantite-corrupted Flying Wyverns unique to Aesoland. Their frost sacs have mutated, allowing them to generate more ice crystals. Their aerial attacks have also grown more powerful, letting them swiftly strike prey on the ground.
They excel at consecutive aerial dashes, launching ferocious assaults on their prey. They release cold air to freeze themselves and their surroundings—shattering the ice beforehand can deal massive damage and suppress their ability to gather cold energy.'),
  ('111210', 'Radiant Great Girros', '', 'fanged_wyvern', 'high', '{}'::text[], ARRAY['dragon','sleep']::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_GreatGirros_LightingStone.png', 32, 'Radiantite-corrupted Fanged Wyverns unique to Aesoland. They hunt in concert with Radiant Girros, and as the pack gathers, the Radiant Great Girros themselves grow more excited and aggressive.
Their radiant particle-enhanced vocal organs can call out to Radiant Girros packs from a distance, stirring up their ferocity. The key to a successful hunt lies in destroying the vocal organs on their heads, and promptly slaying the monsters they summon.'),
  ('110910', 'Radiant Tobi-Kadachi', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_TobiKadachi_LightingStone.png', 43, 'Radiantite-corrupted Fanged Wyverns unique to Aesoland. Their tails, especially affected by the mutation, have become far more dangerous—capable of channeling the static electricity stored in their fur into the ground, unleashing multiple high-output electrostatic attacks.
They can remain in an Electric Charge state for extended periods, using the electrodes within their fur to continuously discharge and strike foes. When hunting them, focus on destroying their tails—doing so will greatly weaken their discharge capabilities.'),
  ('111410', 'Radiant Radobaan', NULL, NULL, 'high', '{}'::text[], ARRAY['dragon']::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Radobaan_LightingStone.png', 34, 'Radiantite-corrupted Brute Wyverns unique to Aesoland. The bone plates covering their bodies have also mutated into dangerous weapons—and the bone shards scattered by their attacks have grown more destructive.
While rolling, they scatter bone spikes that remain on the ground as traps. Though these can be destroyed with direct attacks, luring them into contact with their own spikes during a roll or spin attack can topple them, creating a valuable opening.'),
  ('100111', 'Radiant Pink Rathian', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_PinkRathian_LightingStone.png', 44, 'Radiantite-corrupted Flying Wyverns unique to Aesoland. Their tails, especially affected by the mutation, carry far more potent venom than those of standard variants. They combine fire and poison to unleash relentless, storm-like assaults upon their prey.
Venom seeps continuously from their tails. After a short wind-up, they snare prey with a tail strike, then follow with a powerful breath attack. Sustained attacks on the tail can briefly stem the flow of venom.'),
  ('112010', 'Radiant Tzitzi-Ya-Ku', NULL, NULL, 'high', '{}'::text[], ARRAY['dragon']::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_TzitziYaKu_LightingStone.png', 36, 'Radiantite-corrupted Bird Wyverns unique to Aesoland. The Flash Fins on their heads have grown tougher and more developed through mutation, capable of releasing intense flashes of light; they can also chase down prey relentlessly on powerful legs.
Their Flash Fins are saturated with radiant particles, allowing their high-energy flashes to inflict fireblight. When frenzied, they unleash continuous flashes and follow up with multiple powerful leg strikes—destroying their Flash Fins can effectively reduce the power of their flashes.'),
  ('100711', 'Radiant Black Diablos', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_BlackDiablos_LightingStone.png', 45, 'Radiantite-corrupted Flying Wyverns unique to Aesoland. Their heads and twin horns have been notably affected by the mutation, making them far more volatile. They unleash ferocious dash attacks and also strike using bursts of Radiantite.
As they burrow, they sweep up Radiantite and hurl it, then charge with their massive horns more ferociously than ever, sometimes overcommitting and leaving themselves vulnerable. Focusing on part breaks can weaken their momentum.'),
  ('111310', 'Radiant Odogaron', NULL, NULL, 'high', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Odogaron_LightingStone.png', 46, 'Radiantite-corrupted Fanged Wyverns unique to Aesoland. The mutation has accelerated keratin growth in their claws, dramatically extending their attack range and enabling them to inflict bleeding in a far greater variety of ways.
Once frenzied, they draw on the radiant particles within their bodies to accelerate their metabolism, causing their claws to overgrow and greatly extend their attack range. These overgrown claws eventually fracture on their own—destroying them first can weaken their momentum.'),
  ('140001', 'Ruger Aidal', NULL, NULL, 'high', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_PrismireKnight.png', 47, 'A newly discovered Elder Dragon species on Aesoland. They harden the radiant particles clinging to their bodies into armor-like plating, using them for both offense and defense; they can also absorb ambient radiant particles to unleash devastating attacks.
They form spikes and clusters of Radiantite from radiant particles to attack, but these are unstable when freshly formed—well-timed consecutive blows can shatter the crystals and stagger them.'),
  ('100110', 'Rathian', NULL, NULL, 'high', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Rathian.png', 48, NULL),
  ('200101', 'Aptonoth', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Aptonoth.png', 49, NULL),
  ('200201', 'Apceros', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Apceros.png', 50, NULL),
  ('200301', 'Kelbi', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Kelbi.png', 51, NULL),
  ('200302', 'Kelbi', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Kelbi.png', 52, NULL),
  ('200501', 'Hornetaur', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Hornetaur.png', 53, NULL),
  ('200510', 'Radiant Hornetaur', NULL, NULL, 'small', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Hornetaur_LightingStone.png', 54, NULL),
  ('200601', 'Vespoid', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Vespoid.png', 55, NULL),
  ('202901', 'Gajau', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Gajau.png', 56, NULL),
  ('204901', 'Jagras', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Jagras.png', 57, NULL),
  ('204910', 'Radiant Jagras', NULL, NULL, 'small', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Jagras_LightingStone.png', 58, NULL),
  ('205001', 'Mernos', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Mernos.png', 59, NULL),
  ('205010', 'Radiant Mernos', NULL, NULL, 'small', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Mernos_LightingStone.png', 60, NULL),
  ('205101', 'Kestodon', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, NULL, 61, NULL),
  ('205102', 'Kestodon', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, NULL, 62, NULL),
  ('205110', 'Radiant Kestodon', NULL, NULL, 'small', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, NULL, 63, NULL),
  ('205111', 'Kestodon', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, NULL, 64, NULL),
  ('205301', 'Raphinos', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Raphinos.png', 65, NULL),
  ('205310', 'Radiant Raphinos', NULL, NULL, 'small', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Raphinos_LightingStone.png', 66, NULL),
  ('205401', 'Shamos', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Shamos.png', 67, NULL),
  ('205410', 'Radiant Shamos', NULL, NULL, 'small', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Shamos_LightingStone.png', 68, NULL),
  ('205501', 'Barnos', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Barnos.png', 69, NULL),
  ('205601', 'Girros', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Girros.png', 70, NULL),
  ('205610', 'Radiant Girros', NULL, NULL, 'small', '{}'::text[], '{}'::text[], TRUE, TRUE, TRUE, '/images/monsters/MonsterIcon_Girros_LightingStone.png', 71, NULL),
  ('205801', 'Gastodon', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Gastodon.png', 72, NULL),
  ('205901', 'Noios', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, '/images/monsters/MonsterIcon_Noios.png', 73, NULL),
  ('206101', 'Warrior Atecoli', NULL, NULL, 'small', '{}'::text[], '{}'::text[], FALSE, FALSE, TRUE, NULL, 74, NULL);

UPDATE public.monsters m SET parent_id = v.parent_id
FROM (VALUES
  ('100702', '100701'),
  ('100102', '100101'),
  ('110110', '110101'),
  ('110210', '110201'),
  ('104410', '104401'),
  ('110810', '110801'),
  ('110010', '110001'),
  ('199901', '100101'),
  ('100210', '100201'),
  ('100710', '100701'),
  ('110710', '110701'),
  ('111010', '111001'),
  ('111110', '111101'),
  ('111210', '111201'),
  ('110910', '110901'),
  ('111410', '111401'),
  ('100111', '100102'),
  ('112010', '112001'),
  ('100711', '100702'),
  ('111310', '111301'),
  ('200510', '200501'),
  ('204910', '204901'),
  ('205010', '205001'),
  ('205110', '205101'),
  ('205310', '205301'),
  ('205410', '205401'),
  ('205610', '205601')
) AS v(id, parent_id)
WHERE m.id = v.id;

-- Re-point every table that depends on the monster id
UPDATE public.weapons             t SET monster_id = m.new_id FROM _monster_id_map m WHERE t.monster_id = m.old_id;
UPDATE public.hunter_challenges   t SET monster_id = m.new_id FROM _monster_id_map m WHERE t.monster_id = m.old_id;
UPDATE public.armour_pieces       t SET monster_id = m.new_id FROM _monster_id_map m WHERE t.monster_id = m.old_id;
UPDATE public.visages             t SET monster_id = m.new_id FROM _monster_id_map m WHERE t.monster_id = m.old_id;
UPDATE public.personal_goals      t SET target_monster_id = m.new_id FROM _monster_id_map m WHERE t.target_monster_id = m.old_id;
UPDATE public.community_challenges t SET target_monster_id = m.new_id FROM _monster_id_map m WHERE t.target_monster_id = m.old_id;
UPDATE public.community_builds t SET weapon_monster_id  = m.new_id FROM _monster_id_map m WHERE t.weapon_monster_id  = m.old_id;
UPDATE public.community_builds t SET helm_monster_id    = m.new_id FROM _monster_id_map m WHERE t.helm_monster_id    = m.old_id;
UPDATE public.community_builds t SET chest_monster_id   = m.new_id FROM _monster_id_map m WHERE t.chest_monster_id   = m.old_id;
UPDATE public.community_builds t SET gloves_monster_id  = m.new_id FROM _monster_id_map m WHERE t.gloves_monster_id  = m.old_id;
UPDATE public.community_builds t SET waist_monster_id   = m.new_id FROM _monster_id_map m WHERE t.waist_monster_id   = m.old_id;
UPDATE public.community_builds t SET greaves_monster_id = m.new_id FROM _monster_id_map m WHERE t.greaves_monster_id = m.old_id;

-- Remove the old slug-id monsters (including those not present in the CSV)
DELETE FROM public.monsters WHERE id !~ '^[0-9]+$';

COMMIT;
