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
  /**
   * Minimum equipment upgrade rarity level required to unlock this skill
   * (e.g. 6, 8, 9, 12). If null or omitted, unlocked by default / at base.
   */
  unlock_rarity?: number | null;
  /** CamelCase alias for TypeScript compatibility */
  unlockRarity?: number | null;
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

/**
 * Sort priority rank for skills on an armour piece:
 * 1. Base skill(s) (no upgrade rarity required, not a set bonus) -> rank 10
 * 2. Inherent Set Bonus / Set Effect (e.g. Ink of Flames) -> rank 20
 * 3. Rarity bonuses in ascending order of unlock rarity (R6 -> R8 -> R9 -> R12) -> rank 100 + rarity
 */
export function getArmourSkillSortRank(
  skill: ArmourSkill,
  isSetBonus: boolean = false,
): number {
  const rarity = skill.unlockRarity ?? skill.unlock_rarity ?? null;
  const isLocked = rarity !== null && rarity > 1;

  if (!isLocked && !isSetBonus) {
    return 10;
  }
  if (isSetBonus) {
    return 20;
  }
  return 100 + (rarity ?? 0);
}

export function sortArmourSkills(
  skills: ArmourSkill[],
  isSetBonusMap?: Map<string, boolean> | ((id: string) => boolean),
  nameMap?: Map<string, string> | ((id: string) => string),
): ArmourSkill[] {
  const getIsSetBonus = typeof isSetBonusMap === 'function' 
    ? isSetBonusMap 
    : (id: string) => isSetBonusMap?.get(id) ?? false;

  const getName = typeof nameMap === 'function'
    ? nameMap
    : (id: string) => nameMap?.get(id) ?? id;

  return [...skills].sort((a, b) => {
    const rankA = getArmourSkillSortRank(a, getIsSetBonus(a.id));
    const rankB = getArmourSkillSortRank(b, getIsSetBonus(b.id));

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const nameA = getName(a.id);
    const nameB = getName(b.id);
    return nameA.localeCompare(nameB);
  });
}
