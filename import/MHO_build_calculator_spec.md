# MHO Build Planner – damage calculation spec

This document tells a developer (or an AI building the site) exactly how to turn a saved build into an **effective damage score**, using the game data extracted from Monster Hunter Outlanders 1.0.9.3_3.

Files that go with it:

| File | What it is |
|---|---|
| `MHO_build_planner.json` | All the data: weapons, armour, sets, decorations, skills with machine-readable effects, visages, visage sets, random effect pools, buddies. |
| `mho_build_calc.js` | Reference implementation of this spec in plain JavaScript (no libraries). **If this document and the code disagree, the code is right.** |
| `MHO_build_effects.csv` | The same effects as a flat table, for checking by eye. Not needed by the site. |

Other data files in the same folder (`MHO_weapons`, `MHO_armour`, `MHO_skills`, `MHO_visages`, `MHO_companions`, `MHO_monster_hitzones` …) are for display (names, icons, descriptions, how to obtain). The planner JSON uses the same IDs.

---

## 1. Units – read this first

- Every effect has `unit`: `"%"` or `"flat"`. A `%` value is already a percentage: `8` means **+8 %**. A flat value is a plain number: element attack `50` means **+50**.
- `values` is a list:
  - **skills, set bonuses, Apex effects:** one value (each skill level is its own entry).
  - **visage core effects and visage base stats:** one value per **visage level** (index 0 = level 1). If the list is shorter than the level, use the last value.
  - **buddy core passives:** one value per **Ascension phase** (index 0 = phase 1).
- Weapon `affinity_pct` is already a percentage (raw game value ÷ 100; e.g. Pulsar Shotel II: 4.4 %, confirmed in game).
- `values: null` with a `value_formula` means the value could not be read from the data – skip it in the maths.

## 2. Only use what is in game

- Hide rows whose `status` is not `"In game"` (skills, weapons, armour, visages, buddies). `debug: "yes"` rows are test, scrapped or Boss Hunt entries.
- A skill with a non-empty `data_note` has no reliable numbers in the game data (it points at a placeholder buff). Show its description, but add nothing to the score.

## 3. Collecting a build

```
build = {
  weapon:  { id, rarity, apexAwakenings: [entry_id per awakening slot] },
  armour:  [ { id, rarity, decorations: [deco ids] } ]      // up to 5 pieces
  weaponDecorations: [deco ids],
  visages: [ { id, level, baseChoices: [entry_id per base slot], randomChoices: [ { entry_id, value } ] } ],
  buddy:   { id, phase }                                    // Ascension phase 1..3
}
```

### 3.1 Skill levels (armour, decorations, set bonuses, Apex awakenings)

1. **Armour piece:** use `armour[].rarities[]` for the chosen rarity → its `skills` (entry_id, skill, level).
2. **Decoration:** `decorations[].skills` (1 or 2 skills each, e.g. "Recovery/Attack Jewel 3" = Health Recovery Lv3 **and** Attack Lv1). `size` = slot size 1–3.
3. **Armour set bonus:** count equipped pieces per id in `armour[].set_bonus_ids`. For each `armour_sets[]` tier with `pieces <= count`, add that tier's skill (`entry_id`, `skill_level`). A tier like "Stun Resistance +1" adds **+1 level** to Stun Resistance.
4. **Apex weapon:** `weapons[].apex` → `intrinsic` and `awakening_slots[i]` (pick one option per slot). A slot only works if the weapon's rarity ≥ `awakening_unlock_rarities[i]`. An option with `skill_entry_id` adds that skill; otherwise use its own `effects`.
5. **Add levels per skill.** Identify skills by **`skill_type_id`**, not by name (two different skills are both called "Critical Element"). Cap the total at `skill_max_levels[skill_type_id]`.
6. Use the `skills[]` entry with that `skill_type_id` and `level` (if missing, the highest level below it) and take its `effects`.

### 3.2 Other effects

- **Visage core effect:** `visages[].core_effect[].effects`, value at the visage's level.
- **Visage base stats:** each `base_attribute_slots[i]` is ONE roll – the player picks which option they got. Value at the visage's level.
- **Visage random effects:** unlock at `random_effect_slots[].unlocks_at_level`; options in `visage_random_pools[pool_id]`. The player picks the effect and which of its `values` they rolled.
- **Visage sets:** count equipped visages per id in `visages[].set_ids`; each `visage_sets[]` tier with `pieces <= count` applies its `effects`.
- **Buddy:** `buddies[].effects`, value at the chosen Ascension phase.

## 4. Which effects count

Every effect has:

- `always_on` – `true`: permanent while equipped. `false`: needs a trigger/condition (`trigger`, `conditions`, `duration_s`).
- `target` – `self`, `squad` (whole squad incl. the player), `main adventurer`, or `monster`.
- `text_has_condition` – the in-game text mentions a condition; worth a manual check.

Rules:

1. **Steady score:** use only `always_on: true` effects with target `self`, `squad` or `main adventurer`.
2. **Best case:** also add every conditional effect (all conditions met). Better still, let the player tick conditions on/off by the `conditions` labels (e.g. `"weak point (hitzone >= 45)"`, `"on critical hits"`, `"vs Radiant monsters"`).
3. Effects with target `monster` are debuffs on the monster (e.g. fire resistance −10 % ⇒ +10 % fire damage). They are ignored in the reference code; add them as element damage % if you want them.
4. Effects with `conditions` containing `"certain game modes only"` only work in special high-difficulty challenges.

## 5. Stat buckets

Add values of the same bucket together (additive), then multiply buckets (section 6).

| Stat in data | Bucket | Meaning |
|---|---|---|
| `AttackBonus` | atkFlat | flat attack |
| `AttackPercentage` | atkPct | attack % |
| `AttackWeaponPercentage` | weaponAtkPct | % of the weapon's own attack |
| `PhysicalDamagePercentage` | physPct | physical damage % |
| `DamagePercentage` | dmgPct | all damage % |
| `MotionValuePercentage` | mvPct | move damage % |
| `AffinityRate` | aff | affinity (crit chance) % |
| `AffinityDamage` | critPhys | bonus physical crit damage % |
| `ElementCriticalDamage` | critElem | bonus elemental crit damage % |
| `AllElementDamage`, `<Element>Damage` | elemFlat | flat element attack |
| `AllElementDamagePercentage`, `<Element>DamagePercentage` | elemAtkPct | element attack % |
| `AllElementDamageResultPercentage`, `<Element>DamageResultPercentage` | elemDmgPct | final element damage % |

- `AllElement…` stats apply to whatever element the weapon has. `<Element>…` stats (Fire, Water, Ice, Thunder, Dragon) only count if the weapon has that element. A weapon with no element ignores all element buckets.
- Everything else (defence, health, resistances, status buildup, ultimate charge …) is not part of the damage score; show it in a separate "other bonuses" list.

## 6. Formula

```
weaponAtk = weapon.attack × (1 + weaponAtkPct/100)
Phys      = (weaponAtk + atkFlat) × (1 + atkPct/100) × (1 + physPct/100)
Elem      = (weapon.element + elemFlat) × (1 + elemAtkPct/100) × (1 + elemDmgPct/100)      (0 if no element)

affinity  = clamp(weapon.affinity_pct + BASE_AFFINITY + aff, -100, 100)
critP     = max(affinity, 0) / 100

PhysAvg   = Phys × (1 + critP × (BASE_PHYS_CRIT + critPhys)/100)
ElemAvg   = Elem × (1 + critP × (BASE_ELEM_CRIT + critElem)/100)

Effective = (PhysAvg + ElemAvg) × (1 + dmgPct/100) × (1 + mvPct/100)
```

Against a chosen monster part (`MHO_monster_hitzones.csv`, values 0–100):

```
Effective_vs = PhysAvg × hitzone[Cut|Impact|Shot]/100 × common + ElemAvg × hitzone[weapon element]/100 × common
```

where `common = (1 + dmgPct/100) × (1 + mvPct/100)` and Cut / Impact / Shot is chosen by weapon type.

Notes:

- **Negative affinity:** the reference code ignores the penalty from negative affinity. If the game confirms one (Monster Hunter's usual is −25 %), add `PhysAvg = Phys × (1 − (|affinity|/100) × 0.25)` when affinity < 0.
- **Compare builds of the same weapon type only.** The data has no per-move damage values, so a Great Sword score and a Bow score are not comparable.

## 7. Unknown constants – make these settings

| Setting | Default | Status |
|---|---|---|
| `BASE_PHYS_CRIT` | 25 | Not in the client data. The in-game stat screen only shows *bonus* crit damage (Midori 0 %, Pyro 2 % elemental). 25 is the usual Monster Hunter value – **unconfirmed**. |
| `BASE_ELEM_CRIT` | 0 | Unconfirmed. |
| `BASE_AFFINITY` | 0 | The base-stat table has 1500 (= 15 %) in what looks like the affinity column for every adventurer – **unconfirmed** (check whether the stat screen shows 15 % affinity with a 0 % weapon and no skills). |

Show them on the page as "Advanced settings", and say the numbers are estimates until confirmed in game.

## 8. Worked example (from the reference code, defaults above)

Weapon: **Guild Crimson Crest Long Sword (Fire) I** at rarity 14 (attack 936, fire 468, affinity 0 %).
Build A: Radiant Great Jagras Set I (5 pieces, rarity 14), 2 × Recovery/Attack Jewel 3 in the chest, Visage: Kushala Daora (level 10, both base slots = Elemental damage), buddy Kojiro (phase 3).

| | Value |
|---|---|
| Skills | Charge Up 3, Breaker 2, Insight 4, Stun Resistance 2, Unleashed 2, Health Recovery 3 (capped from 6), Attack 2, Bento Lover 3, Thrifty Meal 2 |
| Always-on effects used | Insight 4: affinity +8 · Attack 2: attack +12 % · Kushala core: element damage +10 % · 2 × base stat element damage +8.5 % · Kushala Daora's Tempest set: element damage +2 % · Kojiro: damage +5 % |
| Phys | 936 × 1.12 = **1,048.32** |
| Elem | 468 × 1.29 = **603.72** |
| Affinity | 8 % |
| Steady score | (1,048.32 × (1 + 0.08 × 0.25) + 603.72) × 1.05 = **1,756.66** |
| Best case (all conditions) | 2,786.01 |
| vs Great Jagras head (Cut 80, Fire 100) | 1,532.11 |

Build B (same, but Great Jagras Set I armour): steady **1,734.64**, best case 3,154.51. So A is better steady, B is better when its conditional skills are active – show both numbers.

Use this example as a unit test: the site must reproduce these numbers with the same settings.

## 9. Showing the result

- Show **Steady**, **Best case** and optionally **vs monster part**.
- List every effect used (source, name, stat, value) and every skipped conditional effect, so players can see why a build scores what it does.
- When comparing two builds, show the difference per bucket (attack %, affinity, element damage % …), not just the totals.
