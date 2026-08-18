# Monster Hunter — Game Knowledge Guide

> **Purpose**: This document provides foundational knowledge of the Monster Hunter franchise,
> detailed mechanics from *Monster Hunter Now* (MHN), and early information about the upcoming
> *Monster Hunter Outlanders* (MHO). It is intended as context for new projects — such as the
> **Field Guide** tracker app — so they can correctly model, display, and discuss game data.

---

## Table of Contents

1. [The Monster Hunter Series](#1-the-monster-hunter-series)
2. [Monster Hunter Now (MHN) — Overview](#2-monster-hunter-now-mhn--overview)
3. [Monsters](#3-monsters)
   - [Monster Tiers](#31-monster-tiers)
   - [Monster Types / Species](#32-monster-types--species)
   - [Elements & Status Effects](#33-elements--status-effects)
   - [Full Monster Roster (MHN)](#34-full-monster-roster-mhn)
4. [Weapons](#4-weapons)
   - [All 14 Weapon Types](#41-all-14-weapon-types)
   - [Weapon Grades & Overgrading](#42-weapon-grades--overgrading)
   - [Weapon Styles](#43-weapon-styles)
   - [Special Skills](#44-special-skills)
5. [Armour](#5-armour)
   - [Armour Pieces & Sets](#51-armour-pieces--sets)
   - [Armour Skills](#52-armour-skills)
   - [Defense & Elemental Resistance](#53-defense--elemental-resistance)
   - [Driftstones & Driftsmelting](#54-driftstones--driftsmelting)
6. [Builds](#6-builds)
7. [Progression & Story Seasons](#7-progression--story-seasons)
8. [How Hunter Challenges Models This Data](#8-how-hunter-challenges-models-this-data)
9. [Monster Hunter Outlanders — What We Know](#9-monster-hunter-outlanders--what-we-know)

---

## 1. The Monster Hunter Series

**Monster Hunter** is an action RPG franchise by Capcom, first released in 2004. The core gameplay loop is:

1. **Prepare** — study the target monster's weaknesses, craft the right gear
2. **Hunt** — track and fight the monster in the field, targeting weak spots
3. **Carve** — collect materials from the defeated monster
4. **Craft & Upgrade** — use materials to forge better weapons and armour, then repeat

The series is famous for its deep, interconnected systems: **14 weapon types**, a rich **elemental
damage model**, a **layered armour skill system**, and monsters that serve as the source of all
progression (every weapon and armour set is crafted from monster materials).

### Key Titles

| Year | Game | Platform | Notes |
|------|------|----------|-------|
| 2018 | Monster Hunter: World | PS4/Xbox/PC | Worldwide mainstream breakout |
| 2021 | Monster Hunter Rise | Switch/PC | Japanese-influenced, faster combat |
| 2023 | Monster Hunter Now | iOS/Android | Niantic AR mobile game |
| 2025 | Monster Hunter Wilds | PS5/Xbox/PC | Current mainline entry |
| TBA | Monster Hunter Outlanders | iOS/Android | New open-world mobile title (TiMi × Capcom) |

---

## 2. Monster Hunter Now (MHN) — Overview

**Monster Hunter Now** is a location-based AR mobile game developed by Niantic and Capcom,
released in 2023. Players explore their real-world surroundings to encounter and battle monsters,
collect materials, and build their equipment.

### Key differences from mainline MH

| Feature | Mainline MH | Monster Hunter Now |
|---------|-------------|-------------------|
| Session length | 20–50 min hunts | 75-second mobile encounters |
| Hunting area | Large open zones | Real-world AR map |
| Multiplayer | Up to 4 players per quest | Nearby co-op |
| Weapons | All 14 types, complex combos | Streamlined touch controls |
| Story | Deep narrative campaigns | Seasonal story chapters |
| Progression | Low → High → Master Rank | Low tier → High tier, Grade system |

### Seasons & Story

MHN releases content in **Seasons** (story chapters) and regular **update patches** that add new
monsters, events, and features. Seasons introduce new gameplay mechanics alongside their narrative.

---

## 3. Monsters

Monsters are the heart of the game. Every weapon, armour piece, and piece of progression is tied
to specific monsters. Understanding their classification is essential.

### 3.1 Monster Tiers

In MHN, monsters are divided into difficulty tiers that affect what materials they drop and how
hard they are to hunt:

| Tier | Description | Examples |
|------|-------------|---------|
| `low` | Early-game; basic materials | Great Jagras, Kulu-Ya-Ku, Barroth |
| `high` | Main game content; stronger monsters | Rathalos, Zinogre, Diablos, Magnamalo |
| `elder` | The hardest monsters; special mechanics | Nergigante, Teostra, Kushala Daora, Velkhana |

> Elder Dragons ignore traps, have unique mechanics, and often require specific preparation.

### 3.2 Monster Types / Species

Monsters are grouped into biological species. The species affects behaviour patterns and which
body parts can be broken:

| Species | Characteristics | Examples |
|---------|-----------------|---------|
| **Bird Wyvern** | Bipedal, fast, often picks up objects | Great Jagras, Kulu-Ya-Ku, Tzitzi-Ya-Ku |
| **Brute Wyvern** | Large bipeds, powerful forward charges | Anjanath, Deviljho, Glavenus |
| **Flying Wyvern** | Quadrupeds with wings; the "classic" dragon look | Rathalos, Rathian, Barioth, Tigrex |
| **Leviathan** | Serpentine, aquatic | Jyuratodus, Mizutsune |
| **Fanged Wyvern** | Wolf-like, agile | Zinogre, Odogaron |
| **Fanged Beast** | Ape/bear-like | Rajang, Lagombi, Volvidon, Bishaten |
| **Carapaceon** | Crustacean; heavily armoured | Shogun Ceanataur |
| **Piscine Wyvern** | Fish-like, burrows | Jyuratodus, Beotodus |
| **Neopteron** | Insect-type | (smaller enemies) |
| **Elder Dragon** | Unique, often elemental god-like entities | Teostra, Kushala Daora, Namielle, Malzeno |

### 3.3 Elements & Status Effects

This is **the most important mechanical knowledge** for building effective gear. Monsters both
**deal** elemental damage and have **elemental weaknesses** the hunter can exploit.

#### The Five True Elements

These are pure elements that apply bonus damage on every hit:

| Element | Icon colour | What it does |
|---------|-------------|--------------|
| 🔥 **Fire** | Red-orange | Heat damage; causes Fireblight (DoT) |
| 💧 **Water** | Blue | Water damage; causes Waterblight (stamina drain) |
| ⚡ **Thunder** | Yellow | Lightning damage; causes Thunderblight (stun chance up) |
| ❄️ **Ice** | Light blue | Cold damage; causes Iceblight (stamina halved) |
| 🐉 **Dragon** | Purple | Draconic energy; causes Dragonblight (nullifies player element) |

**How elemental damage works:**
- Each weapon has a hidden or displayed elemental value (e.g. `Thunder 240`)
- When you hit a monster on a part that is weak to that element, you deal bonus elemental damage
- Different body parts have different elemental hitzones — head is usually weakest, back/tail often tougher
- Fast weapons (Dual Blades, Bow) benefit more from element because they land more hits per minute

#### Status Effects

Unlike elements, status effects don't deal damage on every hit. Instead, they build up a
**hidden status value** on the monster. When the threshold is reached, the status **triggers**:

| Status | Effect when triggered | Notes |
|--------|-----------------------|-------|
| ☠️ **Poison** | Monster takes DoT damage over ~60 seconds | Very common, great sustained damage |
| ⚡ **Paralysis** | Monster is completely immobilised for ~10s | Huge opening for big damage |
| 😴 **Sleep** | Monster falls asleep; next hit does 3× damage | Combo with your biggest attack |
| 💥 **Blast** | Explosion dealing flat damage chunk + stagger | Has internal cooldown between procs |

> **Stacking rule**: After a status triggers, the monster's resistance increases. You need to
> build up more status points to proc it again. In MHN's short fights, you typically get 1–2 procs.

#### Elemental Blights (Player Debuffs)

When a monster hits you with an elemental attack, you may receive a **Blight**:

| Blight | Effect on hunter |
|--------|-----------------|
| Fireblight | Takes damage over time |
| Waterblight | Stamina recovery halved |
| Thunderblight | Greatly increased stagger chance from hits |
| Iceblight | Stamina max halved |
| Dragonblight | Your weapon's element is nullified |

### 3.4 Full Monster Roster (MHN)

The following table is derived directly from the project's live data (`public/data/monsters.json`).
Monsters marked with a tier have craftable armour and weapons.

| # | Monster | Tier | Element | Weaknesses |
|---|---------|------|---------|-----------|
| 1 | Great Jagras | low | None | Fire, Poison, Paralysis, Blast, Sleep |
| 2 | Kulu-Ya-Ku | low | None | Water, Ice |
| 3 | Pukei-Pukei | low | Poison | Thunder, Paralysis, Sleep |
| 4 | Coral Pukei-Pukei | high | Water | Poison, Ice |
| 5 | Barroth | low | Water | Fire, Poison, Blast |
| 6 | Great Girros | low | Paralysis | Water, Ice |
| 7 | Tobi-Kadachi | low | Thunder | Water, Ice |
| 8 | Viper Tobi-Kadachi | high | Paralysis + Poison | Thunder |
| 9 | Paolumu | high | None | Fire, Blast |
| 10 | Nightshade Paolumu | high | Sleep | Fire, Thunder |
| 11 | Jyuratodus | low | Water | Thunder |
| 12 | Anjanath | low | Fire | Water, Ice |
| 13 | Fulgur Anjanath | high | Thunder | Ice, Water |
| 14 | Rathian | high | Fire | Dragon, Thunder |
| 15 | Pink Rathian | high | Fire + Poison | Dragon, Thunder |
| 16 | Gold Rathian | high | Fire + Poison | Thunder |
| 17 | Legiana | high | Ice | Poison, Fire |
| 18 | Diablos | high | None | Ice, Dragon, Paralysis |
| 19 | Black Diablos | high | None | Ice, Paralysis |
| 20 | Rathalos | high | Fire + Poison | Dragon, Thunder |
| 21 | Azure Rathalos | high | Fire + Poison | Dragon, Ice |
| 22 | Silver Rathalos | high | Fire | Water, Thunder |
| 23 | Radobaan | high | Sleep | Dragon, Ice, Poison, Blast |
| 24 | Banbaro | high | None | Dragon, Fire, Blast |
| 25 | Barioth | high | Ice | Fire |
| 26 | Zinogre | high | Thunder | Ice |
| 27 | Stygian Zinogre | high | Dragon | Thunder, Blast |
| 28 | Tzitzi-Ya-Ku | low | None | Ice |
| 29 | Odogaron | high | None | Ice, Paralysis |
| 30 | Ebony Odogaron | high | Dragon | Water, Poison, Paralysis |
| 31 | Deviljho | high | Dragon | Thunder, Dragon, Poison |
| 32 | Basarios | high | Fire | Water, Dragon |
| 33 | Khezu | high | Thunder + Paralysis | Fire, Poison |
| 34 | Mizutsune | high | Water | Thunder, Dragon |
| 35 | Kushala Daora | elder | Ice | Thunder, Dragon, Blast, Poison |
| 36 | Teostra | elder | Fire + Blast | Water, Ice |
| 37 | Aknosom | high | Fire | Water, Ice |
| 38 | Magnamalo | high | Blast | Water, Dragon |
| 39 | Rajang | high | Thunder | Ice |
| 40 | Nergigante | elder | None | Thunder, Blast |
| 41 | Lagombi | low | Ice | Fire, Poison, Blast, Paralysis |
| 42 | Volvidon | high | Fire | Water, Ice |
| 43 | Somnacanth | high | Sleep | Thunder |
| 44 | Beotodus | low | Ice | Fire, Blast |
| 45 | Tigrex | high | None | Thunder, Dragon |
| 46 | Brute Tigrex | high | None | Water, Thunder |
| 47 | Kirin | elder | Thunder | Fire, Dragon |
| 48 | Bazelgeuse | high | Fire | Thunder |
| 49 | Chatacabra | low | None | Thunder |
| 50 | Arzuros | low | None | Fire, Poison, Blast, Paralysis, Sleep |
| 51 | Glavenus | high | Fire | Water, Thunder |
| 52 | Chameleos | elder | Poison | Fire, Dragon |
| 53 | Wroggi | low | Poison | Ice, Paralysis, Sleep |
| 54 | Bishaten | high | Paralysis + Poison | Ice |
| 55 | Namielle | elder | Water | Fire, Dragon, Poison, Blast |
| 56 | Nargacuga | high | None | Thunder |
| 57 | Lunagaron | high | Ice | Fire |
| 58 | Espinas | high | Fire + Poison + Paralysis | Ice, Dragon |
| 59 | Malzeno | elder | None | Dragon |
| 60 | Quematrice | high | Fire | Water, Ice |
| 61 | Garangolm | high | None | Thunder |
| 62 | Goss Harag | high | Ice | Fire |
| 63 | Astalos | high | Thunder + Paralysis | Ice |
| 64 | Seregios | high | None | Thunder |
| 65 | Almudron | high | Water | Fire |
| 66 | Shogun Ceanataur | high | Water | Thunder |
| 67 | Velkhana | elder | Ice | Fire, Dragon, Blast |

> Some additional event/collaboration entries exist in the data (e.g. seasonal cosmetic sets)
> that do not follow the standard monster model.

---

## 4. Weapons

### 4.1 All 14 Weapon Types

MHN (and all modern mainline Monster Hunter games) feature exactly **14 weapon types**.
They are grouped into **melee** and **ranged** categories:

#### Melee Weapons

| Weapon | Alias | Key Trait | MHN Styles |
|--------|-------|-----------|-----------|
| **Great Sword** | GS | Massive charged attacks; highest single-hit damage | Surge Slash / Rage Slash |
| **Long Sword** | LS | Swift; Spirit Gauge builds to powerful finisher | Sacred Sheath Combo / Spirit Reckoning |
| **Sword & Shield** | SnS | Versatile; can use items while drawn | Drill Slash / Perfect Rush |
| **Dual Blades** | DB | Rapid multi-hits; ideal for elemental builds | Feral Demon Mode / Spiral Slash |
| **Hammer** | Ham | Impact weapon; great for KO/stun on monster heads | Water Strike / Impact Crater |
| **Hunting Horn** | HH | Support; plays melodies that buff the whole party | Fleeting Melody / Shockwave |
| **Lance** | Lnc | Defensive; strong shield + thrust combos | Shield Tackle / Insta-Block |
| **Gunlance** | GL | Lance with explosive shelling; ignores monster defence | Blast Dash / Guard Reload |
| **Switch Axe** | SA | Transforms between Axe mode and Sword mode | Elemental Burst Counter / Soaring Wyvern Blade |
| **Charge Blade** | CB | Stores energy in Sword mode; releases in Axe mode | Sword Boost / Axe Boost |
| **Insect Glaive** | IG | Aerial attacks; Kinsect collects extracts for buffs | (added March 2026; styles TBC) |

#### Ranged Weapons

| Weapon | Alias | Key Trait | MHN Styles |
|--------|-------|-----------|-----------|
| **Bow** | — | Rapid multi-shot; powerful with coatings (Power, Poison, etc.) | Dodgebolt / Power Volley |
| **Light Bowgun** | LBG | Mobile; rapid fire; wide ammo selection | Stepping Shot / Sliding Reload |
| **Heavy Bowgun** | HBG | Slow but hits extremely hard; special ammo types | Guard Reload / Crouching Shot |

> **Elemental matchups matter more for some weapons than others.** Dual Blades and Bow land
> the most hits per second, so elemental damage multiplies greatly. Great Sword does fewer but
> massive hits, so raw attack power is typically prioritised.

### 4.2 Weapon Grades & Overgrading

In MHN, each weapon has a **Grade** (1–10+) that represents its power level within that
monster's weapon tree:

- **Grade 1–5**: Standard levels, upgraded with monster materials + Zenny
- **Overgrade (G2+)**: Once a weapon reaches Level 5, it can be "Overgraded" to unlock advanced features
- **Grade 8+**: Required to access **Weapon Style Customization**

Each monster family has a full weapon tree covering all 14 weapon types (where applicable).
Weapons are named after the monster they are made from (e.g. *Rathalos Firesword*, *Zinogre Stormslash*).

### 4.3 Weapon Styles

**Style Customization** is an advanced endgame system. Once a weapon is at Grade 8 or above
(and crafted from a compatible monster, typically Riftborne/High-tier), you can choose between
**two distinct combat styles** for that weapon:

- Each style changes your long-press attacks, some combo routes, and provides stat boosts
- Switching style may require additional materials
- Styles are weapon-type specific (e.g. Great Sword has "Surge Slash" and "Rage Slash" styles)

This is how styles are stored in the project data:

```json
{
  "id": "great_sword",
  "name": "Great Sword",
  "styles": ["Surge Slash", "Rage Slash"]
}
```

### 4.4 Special Skills

Every weapon unlocks a **Special Skill** when overgraded to Grade 2. This is a powerful ultimate
move that:

- Is triggered by a gauge that fills during combat
- Grants **invincibility frames** during the animation
- Is unique to each weapon type

| Weapon | Special Skill |
|--------|--------------|
| Great Sword | True Charged Slash |
| Long Sword | Spirit Helm Breaker |
| Sword & Shield | Perfect Rush Combo |
| Dual Blades | Shrouded Vault |
| Hammer | Spinning Bludgeon |
| Hunting Horn | Earthshaker |
| Lance | Charging Slash |
| Gunlance | Wyvern's Fire |
| Switch Axe | Invincible Gambit |
| Charge Blade | Savage Axe Slash |
| Insect Glaive | Diving Wyvern |
| Bow | Dragon Piercer |
| Light Bowgun | Wyvernblast Counter |
| Heavy Bowgun | Wyvernheart |

---

## 5. Armour

### 5.1 Armour Pieces & Sets

A full armour set consists of **5 pieces**:

| Piece | Slot |
|-------|------|
| Helm | Head |
| Mail / Chest | Torso |
| Vambraces / Arms | Arms |
| Coil / Waist | Waist |
| Greaves / Legs | Legs |

Each piece is crafted from a specific monster's materials. You can mix and match pieces from
different monsters to create **mixed sets** that combine the skills you want.

In MHN the armour source monsters include all monsters in the roster table above, plus a small
number of "starter" generic sets (Leather, Alloy, Bone) that provide basic coverage early-game.

### 5.2 Armour Skills

**Skills** are passive bonuses activated by wearing armour pieces. Each piece comes with one or
more built-in skills at specific levels.

#### Skill Categories (as modelled in this project)

| Category | Purpose | Examples |
|----------|---------|---------|
| `attack` | Boost offensive output | Attack Boost, Fire Attack, Thunder Attack, Weakness Exploit, Critical Boost |
| `critical` | Improve critical hit rate/damage | Critical Eye, Critical Element, Critical Ferocity |
| `defense` | Improve survivability | Defense Boost, Health Boost, Elemental Resistances |
| `survival` | Keep you alive at low HP | Guts, Last Stand, Fortify, Dauntless |
| `general` | Miscellaneous utility | Focus, Earplugs, Windproof, Evade Extender, Power Prolonger |
| `status` | Enhance status effect application | Resuscitate, Bubbly Dance, Poison Exploit, Paralysis Exploit |
| `utility` | Advanced utility | Evasive Concentration, Perfectionist, Meditation |
| `health` | Health-conditional bonuses | Vital Thunder, Vital Ice, Vital Fire, Vital Water |

#### Notable Skills in MHN

| Skill | Max Level | What it does |
|-------|-----------|-------------|
| Attack Boost | 5 | Increases raw attack power |
| Critical Eye | 5 | Increases affinity (critical hit %) |
| Weakness Exploit | 5 | Boosts affinity when hitting a weak spot |
| Critical Boost | 5 | Increases critical hit damage multiplier |
| Fire/Water/Thunder/Ice/Dragon Attack | 5 | Boosts the named element's damage |
| Health Boost | 5 | Increases maximum HP |
| Defense Boost | 5 | Increases armour defense rating |
| Earplugs | 3 | Blocks monster roars that would stagger you |
| Focus | 5 | Speeds up charge attacks / gauge fill |
| Slugger | 5 | Increases KO/stun damage on monster heads |
| Partbreaker | 5 | Increases part-break damage |
| Artillery | 5 | Boosts Gunlance shells and Charge Blade phials |
| Poison/Blast/Paralysis/Sleep Attack | 5 | Boosts respective status buildup |

> **Monster-specific "set bonus" skills** exist in MHN for Elder Dragons, e.g. `teostra_powder`,
> `nergigante_hunger`, `chameleos_venomist`, `namielle_power`, `malzeno_crimsonblood`. These are
> activated by wearing enough pieces from that Elder Dragon's armour set.

### 5.3 Defense & Elemental Resistance

Each armour piece contributes:
- **Defense**: Raw damage reduction from physical attacks
- **Elemental Resistance**: Fire / Water / Thunder / Ice / Dragon resist values
  - Positive = takes less elemental damage from that element
  - Negative = takes more damage (a hazard you should address with skills or equipment)

Players at endgame typically prioritise **skills over raw defense**, since the skill multipliers
outweigh marginal defense differences between equivalent-tier gear.

### 5.4 Driftstones & Driftsmelting

**Driftsmelting** is MHN's armour customisation system. It allows hunters to attach **random bonus
skills** to armour pieces beyond their base skills.

#### How it works

1. **Earn Driftstones** by slaying large monsters (unlocked after the pre-season story)
2. **Select an armour piece** with at least one Driftsmelt slot (most pieces unlock slots at Grade 8)
3. **Assign a Driftstone** and walk a set distance to smelt it (or use Insta-Smelt)
4. **Receive a random skill** from that stone's skill pool + a random stat bonus (ATK/DEF/Affinity)
5. **Save up to 20 skills** per piece and activate the ones you want

#### Driftsmelt Slot Configuration

Armour pieces have different numbers of Driftsmelt slots:

| Slot count | Description |
|-----------|-------------|
| 0 slots | Cannot be Driftsmelted |
| 1 slot | One extra random skill |
| 2 slots | Two extra random skills |

The number of slots per armour piece varies by monster source and piece type (helm, chest, arms,
waist, legs). This data is tracked in `public/data/armor-properties.json`.

> Driftsmelting is **separate from weapon upgrades**. It only affects armour.

---

## 6. Builds

A **Build** in Monster Hunter refers to a complete equipment loadout: weapon + all 5 armour pieces,
chosen to synergise around a playstyle or target.

### What defines a Build

- **Weapon**: Type (e.g. Sword & Shield), monster source (e.g. Rathalos), and grade
- **Weapon element**: The element the weapon deals (if any)
- **Weapon style**: Which style customization is active
- **Armour pieces**: Which monster's armour is worn on each of the 5 slots
- **Active skills**: The combination of skills from all 5 armour pieces + Driftsmelt slots

### Common Build Archetypes

| Archetype | Weapon choice | Key skills |
|-----------|-------------|-----------|
| **Elemental DPS** | Dual Blades or Bow | Elemental Attack 5, Critical Eye, Weakness Exploit |
| **Raw DPS** | Great Sword | Attack Boost, Critical Boost, Focus |
| **Status Applier** | Dual Blades (poison) | Poison Attack 5, Buildup Boost |
| **KO / Stun** | Hammer | Slugger 5, Attack Boost |
| **Support** | Hunting Horn | Earplugs, solidarity skills |
| **Tank / Guard** | Lance or Gunlance | Guard 5, Guard Up, Offensive Guard |

### MHN Build Import/Export — MHN.Quest

This project integrates with **[mhn.quest](https://mhn.quest)**, a community tool for sharing
builds. A build can be:

- **Imported** by pasting an mhn.quest URL when creating a Build challenge
- **Exported** to generate a sharable link that shows full stats and material requirements

---

## 7. Progression & Story Seasons

MHN releases content in **Seasons** (numbered story chapters):

- **Season 1**: Core story, introduced the world and tutorial monsters
- **Season 8 / Season 9**: Later content added new high-tier and elder monsters

Each season introduces:
- New monster encounters
- New armour and weapon trees
- Event-limited collaboration content (e.g. seasonal cosmetics)

### Rank Progression

Players advance through gear by:
1. Hunting monsters to collect materials
2. Crafting/upgrading weapons and armour at the Smithy
3. Pushing through Grades (1 → 10) to face harder Riftborne versions of monsters
4. Unlocking Driftsmelting for endgame armour customisation

---

## 8. How Hunter Challenges Models This Data

The **Hunter Challenges** project (`fanaticit/hunter-challenges`) is a React + Supabase web app
that lets players create, share, and track self-imposed challenges for MHN. Here is a summary of
how the game's data is represented:

### Public Static Data Files (`public/data/`)

| File | Contents |
|------|---------|
| `monsters.json` | All monsters: id, name (EN+JA), tier, element, weaknesses, icon path |
| `weapon-types.json` | All 14 weapon types: id, name, aliases, category, description, styles |
| `weapon-elements.json` | Per-weapon-type, per-monster elemental weapon data |
| `armor-equipment-skills.json` | Skills attached to each armour piece per monster |
| `armor-properties.json` | Driftsmelt slot count per armour piece per monster |
| `armor-pieces.json` | Armour piece slot names |
| `skills-metadata.json` | All skills: max level, category type |
| `driftstone-skills.json` | Skill pools available from each Driftstone type |
| `driftstone-monsters.json` | Which monsters drop which Driftstone types |
| `diftsmelts.json` | Driftsmelting data |
| `events.json` | Seasonal/event data |
| `season-*.json` | Story season chapter data |

### Monster Data Model

```json
{
  "id": "rathalos",
  "name": "Rathalos",
  "nameJa": "リオレウス",
  "sortOrder": 20,
  "tier": "high",
  "element": ["fire", "poison"],
  "weaknesses": ["dragon", "thunder"],
  "icon": "/images/monsters/MHNow-Rathalos_Icon.png"
}
```

### Weapon Data Model

```json
{
  "id": "great_sword",
  "name": "Great Sword",
  "aliases": ["GS"],
  "category": "melee",
  "description": "A massive blade with devastating charge attacks",
  "icon": "/images/weapons/great_sword.svg",
  "styles": ["Surge Slash", "Rage Slash"]
}
```

### Skill Data Model

```json
{
  "attack_boost": { "maxLevel": 5, "type": "attack" },
  "critical_eye": { "maxLevel": 5, "type": "critical" },
  "weakness_exploit": { "maxLevel": 5, "type": "critical" }
}
```

### Challenge Types

The platform models three kinds of challenges:

| Type | Description |
|------|-------------|
| **Build Challenge** | Use a specific weapon + armour loadout (linked to MHN.Quest) |
| **Story Challenge** | Complete a story/hunt challenge with specific constraints |
| **Custom Challenge** | Free-form self-imposed rules |

### Build Challenge Structure

A Build Challenge captures:
- Weapon type + monster source + element + style
- All 5 armour slots (helm, chest, arms, waist, legs) — monster source per slot
- Active skills derived from the armour pieces
- Optional MHN.Quest import/export URL

---

## 9. Monster Hunter Outlanders — What We Know

**Monster Hunter Outlanders** is the next major mobile Monster Hunter title, developed by
**TiMi Studio Group** (Tencent) in collaboration with **Capcom**. It was officially announced
in November 2024.

> ⚠️ The game is currently in active closed beta (as of mid-2026). All information below
> is subject to change before final release.

### Key Differences from MHN

| Feature | Monster Hunter Now | Monster Hunter Outlanders |
|---------|-------------------|--------------------------|
| World type | Real-world AR map | Persistent open world (fictional continent: **Aesoland**) |
| Character | Generic hunter avatar | Named "Adventurer" characters with unique skills |
| Multiplayer | Nearby co-op | Up to 4-player cooperative multiplayer |
| Gacha? | No | Reported gacha elements for characters / items |
| Monsters | Based on classic MH roster | "Radiant" monsters altered by **Radiantite** mineral |
| Combat | Streamlined touch controls | Open-world, faster-paced mobile combat |
| Stamina system | No | Reports suggest stamina limits on material gathering |

### Setting: Aesoland

The game is set on a continent called **Aesoland**, home to **Radiant** versions of familiar
Monster Hunter monsters. These creatures have been altered by a mysterious mineral called
**Radiantite**, making them:
- More powerful and aggressive than their classic counterparts
- Capable of entering a **frenzied state** during battles
- Visually distinct from their mainline MH appearances

### Confirmed Weapons (as of beta)

- Long Sword
- Great Sword
- Dual Blades
- Heavy Bowgun
- Bow
- Lance

> The full 14-weapon roster has not been confirmed. Weapon and monster rosters are expected
> to expand through updates after launch.

### Core Gameplay Loop (Expected)

1. **Explore** Aesoland — a seamless open world with no mission loading screens
2. **Track** monsters using environmental clues
3. **Hunt** using streamlined mobile combat (weak spots, elemental vulnerabilities preserved)
4. **Gather** materials (subject to stamina limits per session)
5. **Build** facilities and craft gear

### Radiant Monster System

Unlike MHN which uses standard MH monster variants, Outlanders introduces the concept of
**Radiant monsters** — essentially an in-universe explanation for why familiar monsters behave
differently. This is similar in concept to MH Rise's **Rampage** system or MHW's **Tempered**
modifiers.

---

## Summary: Key Concepts for a Field Guide App

If you are building a **Field Guide** tracker for hunters, the key domains to model are:

| Domain | Data to track |
|--------|-------------|
| **Monsters** | Name, tier, element, weaknesses, species |
| **Weapons** | Type, source monster, element, grade, style |
| **Armour** | Set, piece slot, source monster, skills, driftsmelt slots |
| **Skills** | Name, max level, category (attack / defense / utility…) |
| **Builds** | Weapon + 5 armour pieces + active skills + style |
| **Progress** | Which monsters hunted, which gear crafted/graded |
| **Events** | Time-limited seasonal/collaborative content |

### The Elemental Triangle to Always Remember

```
Monster Element → Hunter Weakness (equip Elemental Resistance)
Monster Weakness → Hunter Weapon Element (exploit with matching weapon)
```

Mastering this loop — crafting gear that resists the monster you're fighting while equipping
a weapon tuned to that monster's weakness — is the fundamental skill of Monster Hunter.

---

*Last updated: August 2026. Sources: Hunter Challenges project data, Monster Hunter Now in-game
mechanics, official Monster Hunter Outlanders announcements, and community documentation.*
