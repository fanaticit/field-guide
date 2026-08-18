// Central re-export for all schemas
export type {
  TrueElement,
  StatusElement,
  AnyElement,
  MonsterTier,
  MonsterSpecies,
  CoreMonster,
  MonsterRef,
} from './monster.js';

export type {
  WeaponCategory,
  WeaponType,
  MonsterWeapon,
  MHOWeaponAvailability,
} from './weapon.js';

export type {
  ArmourSlot,
  DriftsmeltSlotCount,
  ArmourSkill,
  MonsterArmourSet,
  MonsterArmourPiece,
  WeaponTalentSkill,
  ArmourSlotDef,
} from './armour.js';

export type {
  SkillCategory,
  SkillMeta,
  ActiveSkill,
  DriftstoneSkillPool,
  DriftstoneMonsterDrop,
} from './skill.js';

export type {
  GameId,
  Build,
  BuildArchetype,
} from './build.js';

export type {
  GameConfig,
  Adventurer,
} from './game.js';
