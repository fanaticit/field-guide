// ─────────────────────────────────────────────────────────────
// Skill schemas
// ─────────────────────────────────────────────────────────────

export type SkillCategory =
  | 'attack'
  | 'critical'
  | 'defense'
  | 'survival'
  | 'general'
  | 'status'
  | 'utility'
  | 'health';

/** Metadata entry for a single skill */
export interface SkillMeta {
  /** Snake_case identifier, e.g. "attack_boost" */
  id: string;
  /** Human-readable name, e.g. "Attack Boost" */
  displayName: string;
  maxLevel: number;
  category: SkillCategory;
}

/** A skill at a specific level, as equipped on an armour piece */
export interface ActiveSkill {
  skillId: string;
  level: number;
}

/** Driftstone skill pool entry */
export interface DriftstoneSkillPool {
  stoneType: string;
  stoneIcon: string;
  /** Skills that can be randomly rolled from this stone */
  skills: Array<{ id: string; maxLevel: number }>;
}

/** Which monsters drop which driftstone type */
export interface DriftstoneMonsterDrop {
  stoneType: string;
  stoneIcon: string;
  monsterIds: string[];
}
