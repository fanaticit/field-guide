// ─────────────────────────────────────────────────────────────
// Buddy (MHO Companions) Schema & Configuration
// ─────────────────────────────────────────────────────────────

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
  bg: string;
  text: string;
  border: string;
  dotColor: string;
}

export const ROLE_CONFIG: Record<BuddyRole, RoleConfig> = {
  Assault: {
    role: 'Assault',
    label: 'Assault',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dotColor: 'bg-red-500',
  },
  Disruptor: {
    role: 'Disruptor',
    label: 'Disruptor',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dotColor: 'bg-purple-400',
  },
  Support: {
    role: 'Support',
    label: 'Support',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
  },
};

export const BUDDY_TIERS: BuddyTier[] = ['SSR', 'SR', 'R'];
export const BUDDY_ROLES: BuddyRole[] = ['Assault', 'Disruptor', 'Support'];

export interface DBBuddy {
  id: string;
  name: string;
  name_ja: string | null;
  tier: BuddyTier;
  role: BuddyRole;
  core_passive: string | null;
  image: string | null;
  is_active: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
