// ─────────────────────────────────────────────────────────────
// Adventurer (MHO Playable Characters) Schema & Configuration
// ─────────────────────────────────────────────────────────────

export type AdventurerRole = 'Assault' | 'Disrupter' | 'Disruptor' | 'Support';

export interface AdventurerRoleConfig {
  role: 'Assault' | 'Disrupter' | 'Support';
  label: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
  description: string;
}

export const ADVENTURER_ROLE_CONFIG: Record<'Assault' | 'Disrupter' | 'Support', AdventurerRoleConfig> = {
  Assault: {
    role: 'Assault',
    label: 'Assault',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dotColor: 'bg-red-500',
    description: 'High-damage combat specialist focused on relentless offensive combos and part breaks.',
  },
  Disrupter: {
    role: 'Disrupter',
    label: 'Disrupter',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dotColor: 'bg-purple-400',
    description: 'Tactical specialist specializing in crowd control, status ailments, stuns, and monster interruptions.',
  },
  Support: {
    role: 'Support',
    label: 'Support',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    description: 'Team coordinator providing heals, stat buffs, utility, and survival enhancements.',
  },
};

export const ADVENTURER_ROLES: ('Assault' | 'Disrupter' | 'Support')[] = ['Assault', 'Disrupter', 'Support'];

export interface ElementOption {
  id: string;
  label: string;
  color: string;
  border: string;
  bg: string;
  text: string;
}

export const ELEMENT_OPTIONS: Record<string, ElementOption> = {
  fire: { id: 'fire', label: 'Fire', color: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/15', text: 'text-orange-300' },
  water: { id: 'water', label: 'Water', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/15', text: 'text-blue-300' },
  thunder: { id: 'thunder', label: 'Thunder', color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/15', text: 'text-yellow-300' },
  ice: { id: 'ice', label: 'Ice', color: 'text-cyan-400', border: 'border-cyan-500/40', bg: 'bg-cyan-500/15', text: 'text-cyan-300' },
  dragon: { id: 'dragon', label: 'Dragon', color: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/15', text: 'text-red-300' },
  poison: { id: 'poison', label: 'Poison', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/15', text: 'text-purple-300' },
  paralysis: { id: 'paralysis', label: 'Paralysis', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/15', text: 'text-amber-300' },
  sleep: { id: 'sleep', label: 'Sleep', color: 'text-indigo-400', border: 'border-indigo-500/40', bg: 'bg-indigo-500/15', text: 'text-indigo-300' },
  blast: { id: 'blast', label: 'Blast', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/15', text: 'text-rose-300' },
  raw: { id: 'raw', label: 'Raw / Physical', color: 'text-mh-slate-300', border: 'border-mh-slate-600', bg: 'bg-mh-slate-800', text: 'text-mh-slate-300' },
};

export interface DBAdventurer {
  id: string;
  name: string;
  name_ja: string | null;
  image: string | null;
  is_default: boolean;
  weapon_type: string | null;
  allowed_weapon_types: string[];
  element_specialization: string | null;
  role: AdventurerRole;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type AdventurerUpsert = Omit<DBAdventurer, 'created_at' | 'updated_at'>;
