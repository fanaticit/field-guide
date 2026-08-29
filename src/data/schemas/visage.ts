// ─────────────────────────────────────────────────────────────
// Visage (MHO Cards) Schema & Ink Types Definitions
// ─────────────────────────────────────────────────────────────

export type InkType =
  | 'thunder'
  | 'fire'
  | 'water'
  | 'ice'
  | 'dragon'
  | 'poison'
  | 'paralysis'
  | 'sleep'
  | 'blast'
  | 'resonance'
  | 'grace'
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
}

export const INK_CONFIG: Record<InkType, InkConfig> = {
  thunder: {
    id: 'thunder',
    name: 'Ink of Thunder',
    shortName: 'Thunder',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    dotColor: 'bg-yellow-400',
  },
  fire: {
    id: 'fire',
    name: 'Ink of Fire',
    shortName: 'Fire',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    dotColor: 'bg-orange-400',
  },
  water: {
    id: 'water',
    name: 'Ink of Water',
    shortName: 'Water',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dotColor: 'bg-blue-400',
  },
  ice: {
    id: 'ice',
    name: 'Ink of Ice',
    shortName: 'Ice',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dotColor: 'bg-cyan-400',
  },
  dragon: {
    id: 'dragon',
    name: 'Ink of Dragon',
    shortName: 'Dragon',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dotColor: 'bg-purple-400',
  },
  poison: {
    id: 'poison',
    name: 'Ink of Poison',
    shortName: 'Poison',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
  },
  paralysis: {
    id: 'paralysis',
    name: 'Ink of Paralysis',
    shortName: 'Paralysis',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-300',
  },
  sleep: {
    id: 'sleep',
    name: 'Ink of Sleep',
    shortName: 'Sleep',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    dotColor: 'bg-indigo-400',
  },
  blast: {
    id: 'blast',
    name: 'Ink of Blast',
    shortName: 'Blast',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    dotColor: 'bg-rose-400',
  },
  resonance: {
    id: 'resonance',
    name: 'Ink of Resonance',
    shortName: 'Resonance',
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    dotColor: 'bg-teal-400',
  },
  grace: {
    id: 'grace',
    name: 'Ink of Grace',
    shortName: 'Grace',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-300',
  },
  protection: {
    id: 'protection',
    name: 'Ink of Protection',
    shortName: 'Protection',
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    border: 'border-sky-500/30',
    dotColor: 'bg-sky-300',
  },
};

export const INK_OPTIONS: InkType[] = [
  'thunder',
  'fire',
  'water',
  'ice',
  'dragon',
  'poison',
  'paralysis',
  'sleep',
  'blast',
  'resonance',
  'grace',
  'protection',
];

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
  is_active: boolean;
  description: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type VisageUpsert = Omit<DBVisage, 'created_at' | 'updated_at'>;
