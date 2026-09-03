import type { AnyElement } from './monster.js';
import type { ArmourSkill } from './armour.js';

export type WeaponCategory = 'melee' | 'ranged';

export type WeaponSourceType = 'monster' | 'ore' | 'bone' | 'event' | 'general';

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
  | 'sleep';

export interface WeaponSkill extends ArmourSkill {}

export const WEAPON_SOURCE_CONFIG: Record<
  WeaponSourceType,
  { label: string; bg: string; text: string; border: string }
> = {
  monster: {
    label: 'Monster Craft',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  ore: {
    label: 'Ore / Iron',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  bone: {
    label: 'Bone',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  event: {
    label: 'Event / Special',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  general: {
    label: 'General',
    bg: 'bg-mh-slate-800',
    text: 'text-mh-slate-300',
    border: 'border-mh-slate-700',
  },
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

/**
 * A specific craftable/equippable weapon in public.weapons
 */
export interface DBWeapon {
  id: string;
  game: string;
  name: string;
  name_ja: string | null;
  weapon_type_id: string;
  monster_id: string | null;
  source_type: WeaponSourceType;
  element_type: WeaponElementType;
  skills: WeaponSkill[];
  special_skill: string | null;
  image: string | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type WeaponUpsert = Omit<DBWeapon, 'created_at' | 'updated_at'>;

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


