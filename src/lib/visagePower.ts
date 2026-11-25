// ─────────────────────────────────────────────────────────────
// visagePower — the Power number shown on a Visage card.
// Port of import/visage_power.js (spec: import/visage_power_spec.md).
// Game data 1.0.9.3_3 (unchanged in 1.0.9.4); confirmed against 12 in-game card/wearer checks.
//
// Power = round DOWN( level points + points from each random (resketch) effect )
// Base effects add nothing. Only the card and the wearer's element are needed, so new
// monsters or adventurers never need changes here; only a developer rebalance would.
// ─────────────────────────────────────────────────────────────

export type PowerQuality = 'Fine' | 'Rare' | 'Epic' | 'Superior';
export type ElementName = 'Fire' | 'Water' | 'Ice' | 'Thunder' | 'Dragon';
/**
 * The wearer's element: an adventurer's element or the Hunter's weapon element,
 * 'None' for the Hunter with a non-elemental weapon, or null for the base score
 * (an adventurer whose element matches none of the card's elemental attacks).
 */
export type WearerElement = ElementName | 'None' | null;

export const POWER_ELEMENTS: ElementName[] = ['Fire', 'Water', 'Thunder', 'Ice', 'Dragon'];

/** Power from the card's quality and level (index 0 = Lv1). Fine cards = 0. */
export const LEVEL_POINTS: Record<PowerQuality, number[]> = {
  Fine: [0],
  Rare: [45, 48, 52, 55, 58, 62, 65, 68, 72, 75],
  Epic: [58, 69, 79, 89, 99, 109, 119, 130, 140, 150],
  Superior: [118, 139, 159, 179, 199, 219, 239, 260, 280, 300],
};

/**
 * Points for the percentage effects and Defense, by card quality and the value shown on the card.
 * (Physical / elemental Attack: points = the attack value, no table needed.)
 */
export const EFFECT_POINTS: Record<'Rare' | 'Epic' | 'Superior', Record<string, Record<string, number>>> = {
  Rare: {
    Damage: { '0.51': 9, '0.68': 12, '0.84': 15, '1.01': 18, '1.18': 21, '1.35': 24, '1.43': 26, '1.52': 27, '1.69': 30 },
    'Elemental Critical Damage': { '0.76': 9, '1.01': 12, '1.27': 15, '1.52': 18, '1.77': 21, '2.03': 24, '2.15': 26, '2.28': 27, '2.53': 30 },
    Defense: { '2': 9, '3': 15, '4': 18, '5': 24, '6': 26 },
  },
  Epic: {
    Damage: { '0.76': 14, '1.01': 18, '1.27': 23, '1.52': 27, '1.77': 32, '2.03': 36, '2.15': 38, '2.28': 41, '2.53': 45 },
    'Elemental Critical Damage': { '1.14': 14, '1.52': 18, '1.9': 23, '2.28': 27, '2.66': 32, '3.04': 36, '3.23': 38, '3.42': 41, '3.8': 45 },
    Defense: { '3': 14, '4': 23, '5': 27, '6': 32, '7': 36, '8': 38, '9': 45 },
  },
  Superior: {
    Damage: { '1.01': 18, '1.35': 24, '1.69': 30, '2.03': 36, '2.36': 42, '2.7': 48, '2.87': 51, '3.04': 54, '3.38': 60 },
    'Elemental Critical Damage': { '1.52': 18, '2.03': 24, '2.53': 30, '3.04': 36, '3.54': 42, '4.05': 48, '4.3': 51, '4.56': 54, '5.06': 60 },
    Defense: { '4': 18, '5': 24, '6': 30, '7': 36, '8': 42, '9': 48, '10': 51, '11': 54, '12': 60 },
  },
};

export interface PowerEffectInput {
  effect: string;
  value: number;
}

export interface PowerCard {
  quality: PowerQuality;
  level: number;
  /** The random (resketch) effects. Base effects are ignored: they never add power. */
  randomEffects: PowerEffectInput[];
}

export type PowerNote = '' | 'always' | 'matches element ×2' | 'Inactive' | 'unknown value' | 'Inactive (non-elemental weapon) ×1' | '×1.5';

export interface PowerBreakdownRow {
  part: string;
  effect?: string;
  value?: number;
  points: number;
  note: PowerNote;
}

export function visagePower(card: PowerCard, wearerElement: WearerElement): { power: number; breakdown: PowerBreakdownRow[] } {
  const levels = LEVEL_POINTS[card.quality] || [0];
  let total = levels[Math.min(Math.max(1, card.level), levels.length) - 1] || 0;
  const breakdown: PowerBreakdownRow[] = [{ part: `${card.quality} Lv ${card.level}`, points: total, note: '' }];

  for (const fx of card.randomEffects || []) {
    let points = 0;
    let note: PowerNote = '';
    const m = /^(Physical|Fire|Water|Ice|Thunder|Dragon) Attack$/.exec(fx.effect);
    if (m && m[1] === 'Physical') {
      points = fx.value; // always active, ×1
      note = 'always';
    } else if (m) {
      // elemental attack: ×2 if it matches the wearer, else Inactive (0)
      if (m[1] === wearerElement) {
        points = fx.value * 2;
        note = 'matches element ×2';
      } else {
        note = 'Inactive';
      }
    } else {
      const table = (EFFECT_POINTS[card.quality as 'Rare' | 'Epic' | 'Superior'] || {})[fx.effect] || {};
      const raw = table[String(Number(fx.value))];
      if (raw === undefined) note = 'unknown value';
      else if (fx.effect === 'Defense') points = raw; // ×1
      else if (fx.effect === 'Elemental Critical Damage' && wearerElement === 'None') {
        points = raw;
        note = 'Inactive (non-elemental weapon) ×1';
      } else {
        points = raw * 1.5; // Elemental Critical Damage, Damage
        note = '×1.5';
      }
    }
    total += points;
    breakdown.push({ part: `${fx.effect} +${fx.value}`, effect: fx.effect, value: fx.value, points, note });
  }
  return { power: Math.floor(total), breakdown }; // round DOWN the total, never each part
}

/** Base score plus the score with each element, for a "what if I give it to…" table. */
export function visagePowerByElement(card: PowerCard): Record<'base' | ElementName | 'None', number> {
  const out = { base: visagePower(card, null).power } as Record<'base' | ElementName | 'None', number>;
  for (const el of [...POWER_ELEMENTS, 'None' as const]) out[el] = visagePower(card, el).power;
  return out;
}

/** Map an adventurer's element id ('fire', 'water'…) to the power element name. */
export function toPowerElement(id: string | null | undefined): ElementName | null {
  const found = POWER_ELEMENTS.find((e) => e.toLowerCase() === String(id ?? '').toLowerCase());
  return found ?? null;
}
