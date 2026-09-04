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
  | 'frost'
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
    name: 'Ink of Frost',
    shortName: 'Frost',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dotColor: 'bg-cyan-400',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    iconName: 'snowflake',
  },
  frost: {
    id: 'frost',
    name: 'Ink of Frost',
    shortName: 'Frost',
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
  'frost',
  'dragon',
  'poison',
  'paralysis',
  'sleep',
  'blast',
  'resonance',
  'protection',
];

export function getInkConfig(ink: string | null | undefined, customName?: string): InkConfig {
  if (!ink) return INK_CONFIG.flames;
  const key = ink.toLowerCase().replace(/^ink_of_/, '') as InkType;
  if (key === 'fire') return INK_CONFIG.flames;
  if (INK_CONFIG[key]) return INK_CONFIG[key];

  // Dynamic fallback for any custom set / ink from database
  const formattedName = customName || key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const displayName = formattedName.toLowerCase().startsWith('ink of ') || formattedName.toLowerCase().includes(' set') || formattedName.toLowerCase().includes(' power') || formattedName.toLowerCase().includes(' mastery')
    ? formattedName
    : `Ink of ${formattedName}`;

  return {
    id: key,
    name: displayName,
    shortName: formattedName.replace(/^Ink of /i, ''),
    bg: 'bg-mh-gold-500/15',
    text: 'text-mh-gold-400',
    border: 'border-mh-gold-500/30',
    dotColor: 'bg-mh-gold-400',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    iconName: 'sparkles',
  };
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
  image_small: string | null;
  /** Inherent / Core Effect of this Visage card */
  core_effect: string | null;
  is_active: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type VisageUpsert = Omit<DBVisage, 'created_at' | 'updated_at'>;

// ── 4 Card Rarity Types (Fine, Rare, Epic, Superior) ───────────

export type VisageRarity = 'fine' | 'rare' | 'epic' | 'superior';

export interface VisageRarityConfig {
  id: VisageRarity;
  name: string;
  colorName: string;
  bgGradient: string;
  borderClass: string;
  hoverBorderClass: string;
  glowColor: string;
  dotClass: string;
  textClass: string;
  badgeClass: string;
}

export const VISAGE_RARITY_CONFIG: Record<VisageRarity, VisageRarityConfig> = {
  fine: {
    id: 'fine',
    name: 'Fine',
    colorName: 'Green',
    bgGradient: 'bg-gradient-to-b from-[#e3f4dd] via-[#d0eac8] to-[#b8ddae]',
    borderClass: 'border-[#508d44]',
    hoverBorderClass: 'hover:border-emerald-400',
    glowColor: 'rgba(34, 197, 94, 0.45)',
    dotClass: 'bg-emerald-500 text-white ring-1 ring-emerald-400',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  rare: {
    id: 'rare',
    name: 'Rare',
    colorName: 'Blue',
    bgGradient: 'bg-gradient-to-b from-[#d9ebfb] via-[#c0dcf8] to-[#a2c8ee]',
    borderClass: 'border-[#3c74b1]',
    hoverBorderClass: 'hover:border-sky-400',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    dotClass: 'bg-sky-500 text-white ring-1 ring-sky-400',
    textClass: 'text-sky-400',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  epic: {
    id: 'epic',
    name: 'Epic',
    colorName: 'Purple',
    bgGradient: 'bg-gradient-to-b from-[#eeddfb] via-[#dcbaf2] to-[#c598e7]',
    borderClass: 'border-[#8244b0]',
    hoverBorderClass: 'hover:border-purple-400',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    dotClass: 'bg-purple-600 text-white ring-1 ring-purple-400',
    textClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  superior: {
    id: 'superior',
    name: 'Superior',
    colorName: 'Gold',
    bgGradient: 'bg-gradient-to-b from-[#f3e5be] via-[#e2cf9f] to-[#cfba84]',
    borderClass: 'border-[#8e7646]',
    hoverBorderClass: 'hover:border-amber-400',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    dotClass: 'bg-amber-400 text-slate-950 ring-1 ring-amber-300 font-bold',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
};

export const VISAGE_RARITY_OPTIONS: VisageRarity[] = ['fine', 'rare', 'epic', 'superior'];

export interface UserVisageCollectionItem {
  user_id: string;
  visage_id: string;
  ink_type: string; // The specific ink type version of this card
  rarity: VisageRarity;
  quantity: number; // 1 to 5 (where 5 is 5+)
  created_at?: string;
  updated_at?: string;
}
