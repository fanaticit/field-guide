# Visage Power – "Check my Card" tool

Standalone. It doesn't need the build planner files or any per-monster or per-adventurer data. It uses the card itself and the wearer's element.
Game data 1.0.9.3_3 (unchanged in 1.0.9.4). Confirmed against 7 cards and 12 card/wearer checks read from the game on 2026-11-25.

## Inputs
- Card quality: Fine / Rare / Epic / Superior
- Card level: 1–10
- The random effects on the card, each with its name and value (the lines below the two base effects)
- Optional: the wearer's element (Fire / Water / Ice / Thunder / Dragon). For the player's Hunter, use the weapon's element, or None for a non-elemental weapon.

## Formula
Power = round DOWN ( level points + the points from each random effect )

1. **Level points.** Use the card's quality and level. The table is the same for every visage:
   - Rare: 45 48 52 55 58 62 65 68 72 75
   - Epic: 58 69 79 89 99 109 119 130 140 150
   - Superior: 118 139 159 179 199 219 239 260 280 300
   - Fine: 0
2. **Base effects** (the two at the top of the card) add 0.
3. **Random effects:**
   | Effect | Points | Multiplier |
   |---|---|---|
   | Physical Attack +N | N | ×1 (always) |
   | Fire / Water / Ice / Thunder / Dragon Attack +N | N | ×2 if it matches the wearer's element, otherwise 0 (the game shows it as "Inactive") |
   | Defense | from `EFFECT_POINTS` (card quality + value) | ×1 |
   | Elemental Critical Damage | from `EFFECT_POINTS` | ×1.5; ×1 on a Hunter with a non-elemental weapon (shown as "Inactive" but still counts) |
   | Damage % | from `EFFECT_POINTS` | ×1.5 |
4. **Rounding.** Add everything first, then round down. Round the total only, never each effect.

## Base score and "what if"
- **Base score** = wearer element `null`. No elemental attack matches. This is the score the card gets on an adventurer whose element matches none of its elemental attacks.
- **Score for an element** = the base score + 2 × each elemental attack of that element.

  Example: Superior Rathian Lv10 with Dragon +30, Elemental Crit +1.52%, Water +42, Dragon +20, Thunder +36:
  - Base: 327
  - Fire: 327
  - Ice: 327
  - Thunder: 399
  - Water: 411
  - Dragon: 427
  - None (Hunter, non-elemental weapon): 318

The function `visagePowerByElement(card)` returns all seven numbers.

## What can change
- **New monster or new adventurer:** nothing changes. Every visage uses the same scoring, so a new adventurer only needs their element.
- **Developers rebalance visage power:** only then would `LEVEL_POINTS` or `EFFECT_POINTS` change. Re-run `tools\data\planner\build_visage_power.py` to check.
- **Value not in the table:** `visagePower` marks it "unknown value", gives it 0 points and keeps going.

## Hunter with a non-elemental weapon (wearer `'None'`)
All elemental attacks are Inactive (0). Elemental Critical Damage is shown as Inactive but still adds its points ×1 (confirmed: Superior Rathian Lv10 = 300 + 18 = 318). Damage % stays ×1.5 (confirmed: Great Jagras Rare Lv10 = 111, Radiant Odogaron = 357). Example: Epic Rathian Lv10 = 150 + 23 + 23 + 27 + 18 + Fire 0 = 241.

## Unconfirmed
- **Core slot:** the core slot multiplier from Proof of Mastery isn't part of the number on the card.

## Files
- `visage_power.js`: the calculator, usable in a browser or in Node.
- `visage_power.test.js`: 12 in-game card/wearer checks as tests. Run it with `node visage_power.test.js`.
