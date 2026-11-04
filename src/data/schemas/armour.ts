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
    const cmp = nameA.localeCompare(nameB);
    if (cmp !== 0) return cmp;

    return (a.level || 1) - (b.level || 1);
  });
}

/** Badge colours for an armour rarity (R1 – R16) */
export function getRarityBadgeStyle(rarity: number = 1): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (rarity) {
    case 1:
      return { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30', label: 'R1' };
    case 2:
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'R2' };
    case 3:
      return { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', label: 'R3' };
    case 4:
      return { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', label: 'R4' };
    case 5:
      return { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', label: 'R5' };
    case 6:
      return { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30', label: 'R6' };
    case 7:
      return { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', label: 'R7' };
    case 8:
      return { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30', label: 'R8' };
    case 9:
      return { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', label: 'R9' };
    case 10:
      return { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', label: 'R10' };
    case 11:
      return { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30', label: 'R11' };
    case 12:
      return { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300', border: 'border-fuchsia-500/30', label: 'R12' };
    case 13:
      return { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30', label: 'R13' };
    case 14:
      return { bg: 'bg-lime-500/15', text: 'text-lime-300', border: 'border-lime-500/30', label: 'R14' };
    case 15:
      return { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30', label: 'R15' };
    case 16:
      return { bg: 'bg-mh-gold-500/20', text: 'text-mh-gold-300', border: 'border-mh-gold-500/50', label: 'R16' };
    default:
      return { bg: 'bg-mh-gold-500/15', text: 'text-mh-gold-300', border: 'border-mh-gold-500/30', label: `R${rarity}` };
  }
}
