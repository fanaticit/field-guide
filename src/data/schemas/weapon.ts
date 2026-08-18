// ─────────────────────────────────────────────────────────────
// Weapon schemas
// ─────────────────────────────────────────────────────────────
import type { AnyElement } from './monster.js';

export type WeaponCategory = 'melee' | 'ranged';

/**
 * One of the 14 core weapon types in the Monster Hunter franchise.
 * Game layers may restrict which types are available (e.g. MHO currently only has 6).
 */
export interface WeaponType {
  /** Snake_case identifier, e.g. "great_sword" */
  id: string;
  name: string;
  /** Common abbreviations, e.g. ["GS"] */
  aliases: string[];
  category: WeaponCategory;
  description: string;
  /**
   * The overgraded Special Skill (Overgrade 2 unlock).
   * Game-specific — not all games support this system.
   */
  specialSkill: string;
  /**
   * Named style customisations available at Grade 8+ in MHN.
   * Empty array for weapons that don't yet have styles (e.g. Insect Glaive in MHN).
   * May differ per game.
   */
  styles: string[];
}

/**
 * A specific weapon a hunter can equip — defined by:
 * which weapon TYPE it is (e.g. Great Sword)
 * which MONSTER it was crafted from (determines element + stats)
 */
export interface MonsterWeapon {
  /** Monster this weapon was crafted from */
  monsterId: string;
  weaponTypeId: string;
  /** Element(s) the weapon deals. Empty = no element (raw) */
  elements: AnyElement[];
  /** Style active on this weapon, if weapon styles are supported */
  activeStyle?: string;
  /** Weapon grade (1–10+); game-specific */
  grade?: number;
}

/** Confirmed MHO weapon subset reference */
export interface MHOWeaponAvailability {
  weaponTypeId: string;
  /** Whether this weapon type is confirmed in MHO beta */
  confirmedInBeta: boolean;
  note?: string;
}
