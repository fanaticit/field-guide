// ─────────────────────────────────────────────────────────────
// Visage (MHO Cards) Schema & Ink Types Definitions
// ─────────────────────────────────────────────────────────────

export type InkType =
  | 'might'
  | 'flames'
  | 'fire'
  | 'water'
  | 'thunder'
  | 'combat'
  | 'guidance'
  | 'grace'
  | 'ice'
  | 'dragon'
  | 'poison'
  | 'paralysis'
  | 'sleep'
  | 'blast'
  | 'resonance'
  | 'protection';

export type VisageMonsterType = 'small' | 'large';

export interface InkConfig {
  id: InkType;
  name: string;
  shortName: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
  glowColor: string;
  iconName: 'sword' | 'flame' | 'droplet' | 'zap' | 'swords' | 'link' | 'sparkles' | 'snowflake' | 'skull' | 'moon' | 'shield' | 'activity';
}

export const INK_CONFIG: Record<InkType, InkConfig> = {
  might: {
    id: 'might',
    name: 'Ink of Might',
    shortName: 'Might',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dotColor: 'bg-red-500',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    iconName: 'sword',
  },
  flames: {
    id: 'flames',
    name: 'Ink of Flames',
    shortName: 'Flames',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    iconName: 'flame',
  },
  fire: {
    id: 'fire',
    name: 'Ink of Flames',
    shortName: 'Flames',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    iconName: 'flame',
  },
  water: {
    id: 'water',
    name: 'Ink of Water',
    shortName: 'Water',
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    dotColor: 'bg-sky-400',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    iconName: 'droplet',
  },
  thunder: {
    id: 'thunder',
    name: 'Ink of Thunder',
    shortName: 'Thunder',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    dotColor: 'bg-yellow-400',
    glowColor: 'rgba(250, 204, 21, 0.4)',
    iconName: 'zap',
  },
  combat: {
    id: 'combat',
    name: 'Ink of Combat',
    shortName: 'Combat',
    bg: 'bg-rose-600/15',
    text: 'text-rose-400',
    border: 'border-rose-600/30',
    dotColor: 'bg-rose-500',
    glowColor: 'rgba(225, 29, 72, 0.4)',
    iconName: 'swords',
  },
  guidance: {
    id: 'guidance',
    name: 'Ink of Guidance',
    shortName: 'Guidance',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    iconName: 'link',
  },
  grace: {
    id: 'grace',
    name: 'Ink of Grace',
    shortName: 'Grace',
    bg: 'bg-teal-500/15',
    text: 'text-teal-300',
    border: 'border-teal-500/30',
    dotColor: 'bg-teal-300',
    glowColor: 'rgba(45, 212, 191, 0.4)',
    iconName: 'sparkles',
  },
  ice: {
    id: 'ice',
    name: 'Ink of Ice',
    shortName: 'Ice',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dotColor: 'bg-cyan-400',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    iconName: 'snowflake',
  },
  dragon: {
    id: 'dragon',
    name: 'Ink of Dragon',
    shortName: 'Dragon',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dotColor: 'bg-purple-400',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    iconName: 'sparkles',
  },
  poison: {
    id: 'poison',
    name: 'Ink of Poison',
    shortName: 'Poison',
    bg: 'bg-purple-900/25',
    text: 'text-fuchsia-400',
    border: 'border-purple-600/30',
    dotColor: 'bg-fuchsia-400',
    glowColor: 'rgba(192, 38, 211, 0.4)',
    iconName: 'skull',
  },
  paralysis: {
    id: 'paralysis',
    name: 'Ink of Paralysis',
    shortName: 'Paralysis',
    bg: 'bg-amber-400/15',
    text: 'text-amber-300',
    border: 'border-amber-400/30',
    dotColor: 'bg-amber-300',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    iconName: 'zap',
  },
  sleep: {
    id: 'sleep',
    name: 'Ink of Sleep',
    shortName: 'Sleep',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    dotColor: 'bg-indigo-400',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    iconName: 'moon',
  },
  blast: {
    id: 'blast',
    name: 'Ink of Blast',
    shortName: 'Blast',
    bg: 'bg-orange-600/15',
    text: 'text-orange-400',
    border: 'border-orange-600/30',
    dotColor: 'bg-orange-500',
    glowColor: 'rgba(234, 88, 12, 0.4)',
    iconName: 'flame',
  },
  resonance: {
    id: 'resonance',
    name: 'Ink of Resonance',
    shortName: 'Resonance',
    bg: 'bg-emerald-600/15',
    text: 'text-emerald-300',
    border: 'border-emerald-600/30',
    dotColor: 'bg-emerald-300',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    iconName: 'activity',
  },
  protection: {
    id: 'protection',
    name: 'Ink of Protection',
    shortName: 'Protection',
    bg: 'bg-sky-600/15',
    text: 'text-sky-300',
    border: 'border-sky-600/30',
    dotColor: 'bg-sky-300',
    glowColor: 'rgba(2, 132, 199, 0.4)',
    iconName: 'shield',
  },
};

export const INK_OPTIONS: InkType[] = [
  'might',
  'flames',
  'water',
  'thunder',
  'combat',
  'guidance',
  'grace',
  'ice',
  'dragon',
  'poison',
  'paralysis',
  'sleep',
  'blast',
  'resonance',
  'protection',
];

export function getInkConfig(ink: string | null | undefined): InkConfig {
  if (!ink) return INK_CONFIG.flames;
  const key = ink.toLowerCase().replace(/^ink_of_/, '') as InkType;
  if (key === 'fire') return INK_CONFIG.flames;
  return INK_CONFIG[key] ?? INK_CONFIG.flames;
}

export interface DBVisage {
  id: string;
  name: string;
  name_ja: string | null;
  monster_id: string | null;
  monster_type: VisageMonsterType;
  points: number;
  rarity: number;
  /** Pool of 1-3 ink types this card can randomly roll in-game */
  ink_types: InkType[];
  image_large: string | null;
  image_small: string | null;
  /** Linked Set Bonus ID from public.skills */
  set_bonus_id: string | null;
  /** Inherent / Core Effect of this Visage card */
  core_effect: string | null;
  is_active: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type VisageUpsert = Omit<DBVisage, 'created_at' | 'updated_at'>;
