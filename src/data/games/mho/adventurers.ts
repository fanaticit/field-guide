// ─────────────────────────────────────────────────────────────
// MHO Adventurers
//
// MHO uses named Adventurer characters instead of a generic
// hunter avatar. Each Adventurer has a unique playstyle,
// skills, and preferred weapon types.
//
// This file is intentionally minimal — the character roster
// design is still being decided. Schema is established here
// so the rest of the app can type-safely reference it.
// ─────────────────────────────────────────────────────────────
import type { Adventurer } from '../../schemas/index.js';

/**
 * MHO Adventurer roster.
 *
 * Ouyang Varen is the only publicly confirmed named Adventurer
 * character from official announcements. Additional characters
 * will be added as they are confirmed.
 *
 * Design question (for future decision):
 * - Are Adventurers gacha-style unlockables?
 * - Do they have elemental affinities that affect build choices?
 * - Do they have fixed weapon types or can they use any?
 *
 * These fields can be extended once the system is understood.
 */
export const MHO_ADVENTURERS: Adventurer[] = [
  {
    id: 'ouyang_varen',
    name: 'Ouyang Varen',
    nameJa: 'オウヤン・ヴァレン',
    description:
      'A skilled hunter native to Aesoland. The primary protagonist confirmed in official ' +
      'Monster Hunter Outlanders promotional materials.',
    preferredWeaponTypeIds: [], // TBC — not yet confirmed
    confirmedInBeta: true,
  },
];

export const MHO_ADVENTURER_MAP = new Map<string, Adventurer>(
  MHO_ADVENTURERS.map((a) => [a.id, a])
);
