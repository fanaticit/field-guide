// ─────────────────────────────────────────────────────────────
// Armour schemas
// ─────────────────────────────────────────────────────────────

/**
 * The 5 armour slot identifiers used consistently across all MH games.
 * MHN internal data uses slightly different keys (chest/gloves/greaves);
 * we normalise to the display terminology.
 */
export type ArmourSlot = 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves';

/** Number of Driftsmelt slots an armour piece can have (MHN-specific mechanic) */
export type DriftsmeltSlotCount = 0 | 1 | 2;

/** A single skill on an armour piece */
export interface ArmourSkill {
  /** Skill identifier, matches keys in skills-metadata */
  id: string;
  level: number;
}

/**
 * All armour pieces for a single monster (the full set).
 * One MonsterArmourSet covers helm + chest + gloves + waist + greaves.
 */
export interface MonsterArmourSet {
  monsterId: string;
  pieces: Record<ArmourSlot, MonsterArmourPiece>;
}

/** Skills on a single armour slot */
export interface MonsterArmourPiece {
  monsterId: string;
  slot: ArmourSlot;
  skills: ArmourSkill[];
  /** Number of Driftsmelt slots. 0 = cannot be Driftsmelted. MHN only. */
  driftsmeltSlots: DriftsmeltSlotCount;
}

/**
 * Weapon talent skills — in MHN, some monsters have skills tied to
 * specific weapon types rather than armour pieces.
 */
export interface WeaponTalentSkill {
  monsterId: string;
  weaponTypeId: string;
  skills: ArmourSkill[];
}

/** Named armour slot definition for display purposes */
export interface ArmourSlotDef {
  id: ArmourSlot;
  /** Internal key as used in hc_data */
  hcDataKey: string;
  name: string;
  displayName: string;
  icon: string;
}
