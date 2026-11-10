// ─────────────────────────────────────────────────────────────
// Buddy (MHO Companions) Schema & Configuration
// ─────────────────────────────────────────────────────────────

import { adventurerRarityBorder, type AdventurerRarity } from './adventurer';

export type BuddyTier = 'R' | 'SR' | 'SSR';
export type BuddyRole = 'Assault' | 'Disruptor' | 'Support';

export interface TierConfig {
  tier: BuddyTier;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const TIER_CONFIG: Record<BuddyTier, TierConfig> = {
  SSR: {
    tier: 'SSR',
    label: 'SSR',
    badgeBg: 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20',
    badgeText: 'text-amber-300 font-extrabold',
    badgeBorder: 'border-amber-500/50 shadow-sm',
  },
  SR: {
    tier: 'SR',
    label: 'SR',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300 font-bold',
    badgeBorder: 'border-purple-500/40',
  },
  R: {
    tier: 'R',
    label: 'R',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300 font-bold',
    badgeBorder: 'border-blue-500/30',
  },
};

export interface RoleConfig {
  role: BuddyRole;
  label: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
}

export const ROLE_CONFIG: Record<BuddyRole, RoleConfig> = {
  Assault: {
    role: 'Assault',
    label: 'Assault',
    icon: '/images/roles/assault.png',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dotColor: 'bg-red-500',
  },
  Disruptor: {
    role: 'Disruptor',
    label: 'Disruptor',
    icon: '/images/roles/disrupter.png',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dotColor: 'bg-purple-400',
  },
  Support: {
    role: 'Support',
    label: 'Support',
    icon: '/images/roles/support.png',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
  },
};

export const BUDDY_TIERS: BuddyTier[] = ['SSR', 'SR', 'R'];

/** Buddy tiers map onto the shared rarity keys (and colours) used by visages and adventurers. */
export const BUDDY_TIER_RARITY: Record<BuddyTier, AdventurerRarity> = {
  SSR: 'superior',
  SR: 'epic',
  R: 'rare',
};

export const buddyTierBorder = (tier: BuddyTier, strong = true) =>
  adventurerRarityBorder(BUDDY_TIER_RARITY[tier], strong);
export const BUDDY_ROLES: BuddyRole[] = ['Assault', 'Disruptor', 'Support'];

export type BuddyStatus = 'in_game' | 'not_in_game';

export interface DBBuddy {
  id: string;
  name: string;
  name_ja: string | null;
  tier: BuddyTier;
  role: BuddyRole;
  core_passive: string | null;
  image: string | null;
  is_active: boolean;
  /** Only shown to users who turned on "Show spoilers" */
  is_spoiler: boolean;
  /** Whether the companion is currently available in the game */
  status: BuddyStatus;
  /** Why the buddy is not in the game (only set when status is 'not_in_game') */
  status_reason?: string | null;
  /** Debug or test item */
  is_debug?: boolean;
  notes: string | null;
  /** Companion type, e.g. Felyne, Trillan or Rutaco. */
  species?: string | null;
  description?: string | null;
  /** Adventurer this companion starts with. */
  default_of_adventurer_id?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BuddySkill {
  id: string;
  buddy_id: string;
  kind: 'skill' | 'passive' | 'other';
  sort_order: number;
  name: string;
  description: string | null;
}

export type BuddyUpsert = Omit<DBBuddy, 'created_at' | 'updated_at'>;

export interface UserBuddyCollectionItem {
  user_id: string;
  buddy_id: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface BuddyCollectionEntry {
  quantity: number;
}
