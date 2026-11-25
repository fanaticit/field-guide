// visage_power.js - Visage card Power for the "Check my Card" tool.
// Monster Hunter Outlanders, data 1.0.9.3_3 (unchanged in 1.0.9.4). Confirmed against 12 in-game card/wearer checks.
// No per-monster or per-adventurer data: only the card itself + the wearer's element.
// These constants are the game's scoring rules (the same for all 280 visages); they only change
// if the developers rebalance visage power, not when a new monster or adventurer is added.

// Power from the card's quality and level (index 0 = Lv1). Fine cards = 0.
const LEVEL_POINTS = {
  Fine: [0],
  Rare: [45, 48, 52, 55, 58, 62, 65, 68, 72, 75],
  Epic: [58, 69, 79, 89, 99, 109, 119, 130, 140, 150],
  Superior: [118, 139, 159, 179, 199, 219, 239, 260, 280, 300]
};

// Points for the percentage effects and Defense, by card quality and the value shown on the card.
// (Physical / Fire / Water / Ice / Thunder / Dragon Attack: points = the attack value, no table needed.)
const EFFECT_POINTS = {
  Rare: {
    "Damage": {"0.51": 9, "0.68": 12, "0.84": 15, "1.01": 18, "1.18": 21, "1.35": 24, "1.43": 26, "1.52": 27, "1.69": 30},
    "Elemental Critical Damage": {"0.76": 9, "1.01": 12, "1.27": 15, "1.52": 18, "1.77": 21, "2.03": 24, "2.15": 26, "2.28": 27, "2.53": 30},
    "Defense": {"2": 9, "3": 15, "4": 18, "5": 24, "6": 26}
  },
  Epic: {
    "Damage": {"0.76": 14, "1.01": 18, "1.27": 23, "1.52": 27, "1.77": 32, "2.03": 36, "2.15": 38, "2.28": 41, "2.53": 45},
    "Elemental Critical Damage": {"1.14": 14, "1.52": 18, "1.9": 23, "2.28": 27, "2.66": 32, "3.04": 36, "3.23": 38, "3.42": 41, "3.8": 45},
    "Defense": {"3": 14, "4": 23, "5": 27, "6": 32, "7": 36, "8": 38, "9": 45}
  },
  Superior: {
    "Damage": {"1.01": 18, "1.35": 24, "1.69": 30, "2.03": 36, "2.36": 42, "2.7": 48, "2.87": 51, "3.04": 54, "3.38": 60},
    "Elemental Critical Damage": {"1.52": 18, "2.03": 24, "2.53": 30, "3.04": 36, "3.54": 42, "4.05": 48, "4.3": 51, "4.56": 54, "5.06": 60},
    "Defense": {"4": 18, "5": 24, "6": 30, "7": 36, "8": 42, "9": 48, "10": 51, "11": 54, "12": 60}
  }
};

const ELEMENTS = ['Fire', 'Water', 'Ice', 'Thunder', 'Dragon', 'None'];

// card = { quality: 'Rare'|'Epic'|'Superior'|'Fine', level: 1-10,
//          randomEffects: [ { effect: 'Fire Attack', value: 23 }, { effect: 'Damage', value: 0.84 }, ... ] }
// Base effects (top of the card) are ignored: they never add power.
// wearerElement: 'Fire'|'Water'|'Ice'|'Thunder'|'Dragon' (adventurer element, or the Hunter's weapon element),
//                'None' for the Hunter with a non-elemental weapon (Elemental Critical Damage is Inactive: x1, not x1.5),
//                or null for the "base" score (an adventurer with no element match).
function visagePower(card, wearerElement) {
  const levels = LEVEL_POINTS[card.quality] || [0];
  let total = levels[Math.min(card.level, levels.length) - 1] || 0;
  const breakdown = [{ part: card.quality + ' Lv' + card.level, points: total }];
  for (const fx of card.randomEffects || []) {
    let points = 0, note = '';
    const m = /^(Physical|Fire|Water|Ice|Thunder|Dragon) Attack$/.exec(fx.effect);
    if (m && m[1] === 'Physical') {               // always active, x1
      points = fx.value;
    } else if (m) {                               // elemental attack: x2 if it matches the wearer, else Inactive (0)
      if (m[1] === wearerElement) { points = fx.value * 2; note = 'matches element x2'; }
      else { points = 0; note = 'Inactive'; }
    } else {
      const table = (EFFECT_POINTS[card.quality] || {})[fx.effect] || {};
      const raw = table[String(Number(fx.value))];
      if (raw === undefined) { note = 'unknown value'; }
      else if (fx.effect === 'Defense') { points = raw; }                      // x1
      else if (fx.effect === 'Elemental Critical Damage' && wearerElement === 'None') { points = raw; note = 'Inactive (non-elemental weapon) x1'; }
      else { points = raw * 1.5; note = 'suitable x1.5'; }                     // Elemental Critical Damage, Damage
    }
    total += points;
    breakdown.push({ part: fx.effect + ' +' + fx.value, points, note });
  }
  return { power: Math.floor(total), breakdown };   // round DOWN the total, not each part
}

// Base score plus the score with each element, for a "what if I give it to..." table.
function visagePowerByElement(card) {
  const out = { base: visagePower(card, null).power };
  for (const el of ELEMENTS) out[el] = visagePower(card, el).power;
  return out;
}

if (typeof module !== 'undefined') module.exports = { visagePower, visagePowerByElement, LEVEL_POINTS, EFFECT_POINTS, ELEMENTS };
