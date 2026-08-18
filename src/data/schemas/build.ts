// ─────────────────────────────────────────────────────────────
// Build schemas
// ─────────────────────────────────────────────────────────────
import type { ArmourSlot } from './armour.js';
import type { AnyElement } from './monster.js';

export type GameId = 'mhn' | 'mho';

/**
 * A complete equipment loadout: one weapon + 5 armour pieces.
 * Used both for community builds and personal goal planning.
 */
export interface Build {
  /** Auto-generated UUID when stored in Supabase; optional for local drafts */
  id?: string;
  gameId: GameId;
  title?: string;

  // ── Weapon ────────────────────────────────────────────────
  weaponTypeId: string;
  /** Monster the weapon was crafted from */
  weaponMonsterId: string;
  /** Element(s) the weapon deals */
  weaponElements: AnyElement[];
  /** Active style customisation (MHN Grade 8+) */
  weaponStyle?: string;

  // ── Armour ────────────────────────────────────────────────
  /** Monster source for each armour slot */
  armour: Record<ArmourSlot, string>;

  // ── MHO-specific ──────────────────────────────────────────
  /** Named Adventurer character (MHO only) */
  adventurerId?: string;

  // ── Metadata ──────────────────────────────────────────────
  notes?: string;
  /** mhn.quest import/export URL (MHN only) */
  mhnQuestUrl?: string;
}

/**
 * Common build archetypes for display/filtering hints.
 */
export type BuildArchetype =
  | 'elemental_dps'
  | 'raw_dps'
  | 'status_applier'
  | 'ko_stun'
  | 'support'
  | 'tank_guard'
  | 'custom';
