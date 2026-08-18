// ─────────────────────────────────────────────────────────────
// src/data/index.ts — Central data layer re-export
// ─────────────────────────────────────────────────────────────

// ── Schemas (types only) ──────────────────────────────────────
export type {
  TrueElement, StatusElement, AnyElement,
  MonsterTier, MonsterSpecies, CoreMonster, MonsterRef,
  WeaponCategory, WeaponType, MonsterWeapon, MHOWeaponAvailability,
  ArmourSlot, DriftsmeltSlotCount, ArmourSkill,
  MonsterArmourSet, MonsterArmourPiece, WeaponTalentSkill, ArmourSlotDef,
  SkillCategory, SkillMeta, ActiveSkill, DriftstoneSkillPool, DriftstoneMonsterDrop,
  GameId, Build, BuildArchetype,
  GameConfig, Adventurer,
} from './schemas/index.js';

// ── Core — Elements ───────────────────────────────────────────
export {
  TRUE_ELEMENTS, STATUS_ELEMENTS, ALL_ELEMENTS,
  ELEMENT_MAP, TRUE_ELEMENT_IDS, STATUS_ELEMENT_IDS,
  isTrueElement, isStatusElement,
} from './core/elements.js';

// ── Core — Armour Slots ───────────────────────────────────────
export { ARMOUR_SLOTS, ARMOUR_SLOT_IDS, ARMOUR_SLOT_MAP } from './core/armour-slots.js';

// ── Core — Weapon Types ───────────────────────────────────────
export {
  WEAPON_TYPES, WEAPON_TYPE_MAP,
  MELEE_WEAPON_IDS, RANGED_WEAPON_IDS,
} from './core/weapon-types.js';

// ── Core — Skills ─────────────────────────────────────────────
export { SKILLS, SKILL_MAP, getSkillDisplayName } from './core/skills.js';

// ── Core — Monsters ───────────────────────────────────────────
export {
  MONSTERS, MONSTERS_SORTED, MONSTER_MAP, BASE_MONSTERS,
  getVariants, getMonstersBySpecies, getMonstersByTier, getMonstersWeakTo,
} from './core/monsters.js';

// ── MHN ───────────────────────────────────────────────────────
export { MHN_CONFIG } from './games/mhn/index.js';
export {
  MHN_MONSTER_OVERLAYS, MHN_EVENT_ENTRIES, MHN_MONSTER_OVERLAY_MAP,
} from './games/mhn/monsters.js';
export type { MHNMonsterOverlay, MHNEventEntry } from './games/mhn/monsters.js';
export {
  getMHNArmourSkills, getMHNArmourSkillMap, getMHNArmourSkillsForMonster,
  ARMOUR_SLOT_KEYS, WEAPON_SKILL_KEYS,
} from './games/mhn/armour.js';
export type { MHNArmourSkillEntry } from './games/mhn/armour.js';
export {
  getMHNDriftsmeltConfigs, getDriftsmeltSlots,
} from './games/mhn/armour-properties.js';
export type { MHNDriftsmeltConfig } from './games/mhn/armour-properties.js';
export {
  getMHNWeaponElements, getWeaponElementsForMonster,
  getWeaponElement, getAvailableWeaponTypes,
} from './games/mhn/weapons.js';
export type { MHNWeaponElement } from './games/mhn/weapons.js';
export {
  getMHNDriftstoneSkillPools, getMHNDriftstoneMonsterDrops,
  getStonesDroppedBy, getMonstersDropping,
} from './games/mhn/driftstones.js';
export {
  getMHNSeasons, getSeasonByNumber,
} from './games/mhn/seasons.js';
export type { MHNSeason, SeasonChapter, SeasonBoss } from './games/mhn/seasons.js';

// ── MHO ───────────────────────────────────────────────────────
export { MHO_CONFIG } from './games/mho/index.js';
export {
  MHO_RADIANT_MONSTERS, MHO_RADIANT_MAP, getRadiantVariants,
} from './games/mho/monsters.js';
export type { MHORadiantMonster } from './games/mho/monsters.js';
export { MHO_ADVENTURERS, MHO_ADVENTURER_MAP } from './games/mho/adventurers.js';
export {
  MHO_WEAPON_AVAILABILITY, MHO_CONFIRMED_WEAPON_IDS,
} from './games/mho/weapons.js';
