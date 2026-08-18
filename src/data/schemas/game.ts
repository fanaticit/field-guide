// ─────────────────────────────────────────────────────────────
// Game configuration schema
// ─────────────────────────────────────────────────────────────
import type { GameId } from './build.js';

/**
 * Top-level configuration for a supported game.
 * Each game in src/data/games/ exports one GameConfig.
 */
export interface GameConfig {
  id: GameId;
  /** Full display name, e.g. "Monster Hunter Now" */
  name: string;
  /** Short name for UI labels, e.g. "MHN" */
  shortName: string;
  description: string;
  platform: string[];
  /** Release / launch status */
  status: 'live' | 'beta' | 'announced';
  /**
   * IDs of weapon types available in this game.
   * References weapon IDs in src/data/core/weapon-types.ts
   */
  supportedWeaponTypeIds: string[];
  /**
   * Whether this game has the Driftsmelting armour customisation system.
   * Currently only MHN.
   */
  hasDriftsmelting: boolean;
  /**
   * Whether this game uses named Adventurer characters instead of
   * a generic hunter avatar. Currently only MHO.
   */
  hasAdventurers: boolean;
  /**
   * Tier/rank naming convention for this game.
   * - 'low_high_elder' — standard MHN difficulty tiers
   * - 'radiant' — MHO's Radiantite-altered monster system
   */
  tierSystem: 'low_high_elder' | 'radiant';
  /** External URL for the game's official site */
  officialUrl?: string;
}

/**
 * MHO Adventurer — a named playable character with unique skills.
 * Schema only; roster data lives in src/data/games/mho/adventurers.ts
 */
export interface Adventurer {
  id: string;
  name: string;
  nameJa?: string;
  description?: string;
  /** Weapon types this adventurer is suited to */
  preferredWeaponTypeIds: string[];
  /** Beta-confirmed flag — set false if from leaks/rumours */
  confirmedInBeta: boolean;
}
