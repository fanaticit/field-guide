// ─────────────────────────────────────────────────────────────
// Monster schemas
// ─────────────────────────────────────────────────────────────

/** True elemental damage types */
export type TrueElement = 'fire' | 'water' | 'thunder' | 'ice' | 'dragon';

/** Status ailments that build up on monsters (and can also be a monster's "element") */
export type StatusElement = 'poison' | 'paralysis' | 'sleep' | 'blast';

/** All possible elemental or status values a monster can have or be weak to */
export type AnyElement = TrueElement | StatusElement | 'none';

/** Difficulty tier — applies to MHN; MHO uses its own modifier system */
export type MonsterTier = 'low' | 'high' | 'elder' | 'small' | 'event';

/**
 * Biological species classification.
 * Present in the core layer; individual game layers may not populate all entries.
 */
export type MonsterSpecies =
  | 'bird_wyvern'
  | 'brute_wyvern'
  | 'flying_wyvern'
  | 'leviathan'
  | 'fanged_wyvern'
  | 'fanged_beast'
  | 'carapaceon'
  | 'piscine_wyvern'
  | 'neopteron'
  | 'elder_dragon'
  | 'unknown';

/**
 * Core monster definition — game-agnostic.
 * A monster here is a specific variant (e.g. Azure Rathalos is its own entry).
 */
export interface CoreMonster {
  /** Unique kebab/snake_case identifier, e.g. "rathalos" */
  id: string;
  /** English display name */
  name: string;
  /** Japanese display name */
  nameJa: string;
  /**
   * Biological species classification.
   * Populated where known; may be 'unknown' for event/collab monsters.
   */
  species: MonsterSpecies;
  /** Difficulty tier */
  tier: MonsterTier;
  /**
   * Elements this monster deals. Always an array; empty means no element.
   * Note: A monster can have multiple elements (e.g. Espinas: fire + poison + paralysis).
   */
  elements: AnyElement[];
  /**
   * Elemental and status weaknesses hunters can exploit.
   * Always an array; empty means no notable weakness.
   */
  weaknesses: AnyElement[];
  /**
   * ID of the base/canonical monster this variant belongs to.
   * null if this IS the base monster (e.g. rathalos → null).
   * E.g. azure_rathalos → "rathalos"
   */
  parentId: string | null;
  /**
   * Whether this monster is a variant of another (convenience flag).
   * Derived from parentId but useful for quick filtering.
   */
  isVariant: boolean;
  /**
   * MHO only: Whether this is a Radiant version of a monster.
   * Radiant monsters are in-universe altered forms introduced in Aesoland.
   */
  isRadiant?: boolean;
}

/** Lightweight reference for dropdowns, selectors, etc. */
export interface MonsterRef {
  id: string;
  name: string;
  tier: MonsterTier;
  species: MonsterSpecies;
}
