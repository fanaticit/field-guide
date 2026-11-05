import type { AnyElement } from './monster.js';
import type { ArmourSkill } from './armour.js';

export type WeaponCategory = 'melee' | 'ranged';

/** How a weapon is obtained, from the "How to obtain" text of the game data */
export type WeaponSourceType = 'forge' | 'apex_forge' | 'apex_variant' | 'starter' | 'unknown';

/** Whether the weapon exists in the game yet; status_reason explains the 'not_in_game' ones */
export type WeaponStatus = 'in_game' | 'not_in_game';

export type WeaponElementType =
  | 'raw'
  | 'fire'
  | 'water'
  | 'thunder'
  | 'ice'
  | 'dragon'
  | 'poison'
  | 'paralysis'
  | 'blast'
  | 'sleep'
  | 'stun';

export interface WeaponSkill extends ArmourSkill {
  unlock_level?: number | null;
  unlockLevel?: number | null;
}

export const WEAPON_SOURCE_CONFIG: Record<
  WeaponSourceType,
  { label: string; bg: string; text: string; border: string }
> = {
  forge: {
    label: 'Forge',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  apex_forge: {
    label: 'Apex Weapon',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  apex_variant: {
    label: 'Apex Variant',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  starter: {
    label: 'Starter',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  unknown: {
    label: 'No source',
    bg: 'bg-mh-slate-800',
    text: 'text-mh-slate-300',
    border: 'border-mh-slate-700',
  },
};

/** Sharpness colour name (from the game data) -> icon in /public */
export const WEAPON_SHARPNESS_ICONS: Record<string, string> = {
  Yellow: '/images/weapons/SharpnessIcon/SharpnessIcon_03.png',
  Green: '/images/weapons/SharpnessIcon/SharpnessIcon_04.png',
  Blue: '/images/weapons/SharpnessIcon/SharpnessIcon_05.png',
  White: '/images/weapons/SharpnessIcon/SharpnessIcon_06.png',
};

export const WEAPON_ELEMENT_CONFIG: Record<
  WeaponElementType,
  { label: string; color: string; border: string; bg: string; text: string; dot: string }
> = {
  raw: {
    label: 'Raw / None',
    color: 'text-mh-slate-300',
    border: 'border-mh-slate-600',
    bg: 'bg-mh-slate-800',
    text: 'text-mh-slate-300',
    dot: 'bg-mh-slate-400',
  },
  fire: {
    label: 'Fire',
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
    dot: 'bg-orange-500',
  },
  water: {
    label: 'Water',
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/15',
    text: 'text-blue-300',
    dot: 'bg-blue-500',
  },
  thunder: {
    label: 'Thunder',
    color: 'text-yellow-400',
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-300',
    dot: 'bg-yellow-400',
  },
  ice: {
    label: 'Ice',
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    dot: 'bg-cyan-400',
  },
  dragon: {
    label: 'Dragon',
    color: 'text-red-400',
    border: 'border-red-500/40',
    bg: 'bg-red-500/15',
    text: 'text-red-300',
    dot: 'bg-red-500',
  },
  poison: {
    label: 'Poison',
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    dot: 'bg-purple-400',
  },
  paralysis: {
    label: 'Paralysis',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  blast: {
    label: 'Blast',
    color: 'text-rose-400',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    dot: 'bg-rose-500',
  },
  sleep: {
    label: 'Sleep',
    color: 'text-indigo-400',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-300',
    dot: 'bg-indigo-400',
  },
  stun: {
    label: 'Stun',
    color: 'text-yellow-300',
    border: 'border-yellow-400/40',
    bg: 'bg-yellow-400/15',
    text: 'text-yellow-200',
    dot: 'bg-yellow-300',
  },
};

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
  specialSkill: string;
  styles: string[];
}

/** Database representation of a 14-core Weapon Type in public.weapon_types */
export interface DBWeaponType {
  id: string;
  name: string;
  category: WeaponCategory;
  aliases: string[];
  description: string;
  special_skill: string;
  styles: string[];
  icon: string | null;
  games: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** An Apex weapon's own effect and its awakening slots */
export interface WeaponApexEffect {
  name: string;
  description: string;
  icon: string | null;
}

export interface WeaponAwakeningSlots {
  /** Rarity each awakening slot unlocks at */
  unlock_rarities: number[];
  /** Skill names that can be chosen for each slot */
  options: string[][];
}

/**
 * A specific weapon in public.weapons (imported from the game data).
 * The upgrade steps of a weapon live in public.weapon_upgrades.
 */
export interface DBWeapon {
  id: string;
  name: string;
  name_ja: string | null;
  weapon_type_id: string;
  /** monsters.id of the monster the weapon is made from, if any */
  monster_id: string | null;
  series: string | null;
  source_type: WeaponSourceType;
  /** The full "How to obtain" text */
  source_detail: string | null;
  element_type: WeaponElementType;
  element_damage: number | null;
  attack: number | null;
  /** Raw affinity value as stored by the game */
  affinity: number | null;
  sharpness: string | null;
  deco_slots: number[];
  /** Rarity the weapon starts at */
  rarity: number;
  max_rarity: number;
  craftable: boolean;
  is_apex: boolean;
  apex_season: string | null;
  apex_effect: WeaponApexEffect | null;
  awakening_slots: WeaponAwakeningSlots | null;
  image: string | null;
  description: string | null;
  notes: string | null;
  status: WeaponStatus;
  /** Why the weapon is not in the game (only set when status is 'not_in_game') */
  status_reason: string | null;
  /** Visible in the Field Guide */
  is_active: boolean;
  /** Only shown to users who turned on "Show spoilers" */
  is_spoiler: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** One rarity step of a weapon (public.weapon_upgrades) */
export interface DBWeaponUpgrade {
  weapon_id: string;
  rarity: number;
  attack: number | null;
  affinity: number | null;
  element_type: WeaponElementType;
  element_damage: number | null;
  stats: Record<string, number>;
  sharpness: string | null;
  gains: Record<string, number>;
  materials: { item_id: number; item: string; count: number }[];
  money: number | null;
  required_level: number | null;
}

export type WeaponUpsert = Omit<DBWeapon, 'created_at' | 'updated_at'>;

/** Helper to provide consistent visual styling and labels for equipment rarity badges (R1 to R12) */
export function getRarityBadgeStyle(rarity: number = 1): {
  bg: string;
  text: string;
  border: string;
  label: string;
  badge: string;
} {
  let cfg: { bg: string; text: string; border: string; label: string };
  switch (rarity) {
    case 1:
      cfg = { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30', label: 'R1' };
      break;
    case 2:
      cfg = { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'R2' };
      break;
    case 3:
      cfg = { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', label: 'R3' };
      break;
    case 4:
      cfg = { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', label: 'R4' };
      break;
    case 5:
      cfg = { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', label: 'R5' };
      break;
    case 6:
      cfg = { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30', label: 'R6' };
      break;
    case 7:
      cfg = { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', label: 'R7' };
      break;
    case 8:
      cfg = { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30', label: 'R8' };
      break;
    case 9:
      cfg = { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', label: 'R9' };
      break;
    case 10:
      cfg = { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', label: 'R10' };
      break;
    case 11:
      cfg = { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30', label: 'R11' };
      break;
    case 12:
      cfg = { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300', border: 'border-fuchsia-500/30', label: 'R12' };
      break;
    case 13:
      cfg = { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30', label: 'R13' };
      break;
    case 14:
      cfg = { bg: 'bg-lime-500/15', text: 'text-lime-300', border: 'border-lime-500/30', label: 'R14' };
      break;
    case 15:
      cfg = { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30', label: 'R15' };
      break;
    case 16:
      cfg = { bg: 'bg-mh-gold-500/20', text: 'text-mh-gold-300', border: 'border-mh-gold-500/50', label: 'R16' };
      break;
    default:
      cfg = { bg: 'bg-mh-gold-500/15', text: 'text-mh-gold-300', border: 'border-mh-gold-500/30', label: `R${rarity}` };
      break;
  }
  return {
    ...cfg,
    badge: `${cfg.bg} ${cfg.text} ${cfg.border}`,
  };
}

/** Monster weapon crafting reference */
export interface MonsterWeapon {
  monsterId: string;
  weaponTypeId: string;
  elements: AnyElement[];
  activeStyle?: string;
  grade?: number;
}

/** Confirmed MHO weapon subset reference */
export interface MHOWeaponAvailability {
  weaponTypeId: string;
  confirmedInBeta: boolean;
  note?: string;
}


