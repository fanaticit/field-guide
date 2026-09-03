// ─────────────────────────────────────────────────────────────
// React Query hooks for weapons & weapon types
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  DBWeapon,
  DBWeaponType,
  WeaponUpsert,
  WeaponCategory,
  WeaponSourceType,
  WeaponElementType,
} from '../data/schemas/weapon';
import { WEAPON_TYPES } from '../data/core/weapon-types';
import { MHO_CONFIRMED_WEAPON_IDS } from '../data/games/mho/weapons';

export const WEAPON_TYPES_KEY = 'admin-weapon-types';
export const WEAPONS_KEY = 'admin-weapons';
export const PUBLIC_WEAPONS_KEY = 'public-weapons';

// Default static fallback for the 14 core weapon types
export const DEFAULT_DB_WEAPON_TYPES: DBWeaponType[] = WEAPON_TYPES.map((w, idx) => {
  const isMHO = MHO_CONFIRMED_WEAPON_IDS.includes(w.id);
  return {
    id: w.id,
    name: w.name,
    category: w.category,
    aliases: w.aliases,
    description: w.description,
    special_skill: w.specialSkill,
    styles: w.styles,
    icon: `/images/weapons/${w.id}.svg`,
    games: isMHO ? ['mhn', 'mho'] : ['mhn'],
    is_active: true,
    sort_order: idx + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
});

// ═════════════════════════════════════════════════════════════
// 1. WEAPON TYPES (14 Core Franchise Archetypes & Game Availability)
// ═════════════════════════════════════════════════════════════

export interface WeaponTypeFilters {
  search?: string;
  game?: string;
  category?: WeaponCategory | 'all';
  isActive?: boolean | null;
}

export function useAdminWeaponTypes(filters: WeaponTypeFilters = {}) {
  return useQuery({
    queryKey: [WEAPON_TYPES_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('weapon_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters.search) {
        q = q.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.game && filters.game !== 'all') {
        q = q.contains('games', [filters.game]);
      }
      if (filters.category && filters.category !== 'all') {
        q = q.eq('category', filters.category);
      }
      if (filters.isActive !== null && filters.isActive !== undefined) {
        q = q.eq('is_active', filters.isActive);
      }

      const { data, error } = await q;
      if (error) {
        console.warn('public.weapon_types query failed, using static fallback:', error);
        let res = [...DEFAULT_DB_WEAPON_TYPES];
        if (filters.search) {
          const s = filters.search.toLowerCase();
          res = res.filter((w) => w.name.toLowerCase().includes(s) || w.id.toLowerCase().includes(s));
        }
        if (filters.game && filters.game !== 'all') {
          res = res.filter((w) => w.games.includes(filters.game!));
        }
        if (filters.category && filters.category !== 'all') {
          res = res.filter((w) => w.category === filters.category);
        }
        if (filters.isActive !== null && filters.isActive !== undefined) {
          res = res.filter((w) => w.is_active === filters.isActive);
        }
        return res;
      }

      if (!data || data.length === 0) {
        return DEFAULT_DB_WEAPON_TYPES;
      }

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        aliases: Array.isArray(row.aliases) ? row.aliases : [],
        styles: Array.isArray(row.styles) ? row.styles : [],
        games: Array.isArray(row.games) ? row.games : [],
        is_active: Boolean(row.is_active),
        icon: (row.icon as string) || `/images/weapons/${row.id}.svg`,
      })) as DBWeaponType[];
    },
    staleTime: 1000 * 30,
  });
}

export function useToggleWeaponTypeGame() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newGames }: { id: string; newGames: string[] }) => {
      const { data, error } = await supabase
        .from('weapon_types')
        .update({ games: newGames, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBWeaponType;
    },

    onMutate: async ({ id, newGames }) => {
      await qc.cancelQueries({ queryKey: [WEAPON_TYPES_KEY] });
      const snapshot = qc.getQueriesData<DBWeaponType[]>({
        queryKey: [WEAPON_TYPES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBWeaponType[]>(
        { queryKey: [WEAPON_TYPES_KEY], exact: false },
        (old = []) => old.map((w) => (w.id === id ? { ...w, games: newGames } : w)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [WEAPON_TYPES_KEY] });
    },
  });
}

export function useToggleWeaponTypeActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('weapon_types')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBWeaponType;
    },

    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: [WEAPON_TYPES_KEY] });
      const snapshot = qc.getQueriesData<DBWeaponType[]>({
        queryKey: [WEAPON_TYPES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBWeaponType[]>(
        { queryKey: [WEAPON_TYPES_KEY], exact: false },
        (old = []) => old.map((w) => (w.id === id ? { ...w, is_active: isActive } : w)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [WEAPON_TYPES_KEY] });
    },
  });
}

// ═════════════════════════════════════════════════════════════
// 2. CRAFTABLE EQUIPMENT WEAPONS (In-Game Individual Weapons)
// ═════════════════════════════════════════════════════════════

export interface EquipmentWeaponFilters {
  game?: string;
  weaponType?: string;
  monsterId?: string;
  sourceType?: WeaponSourceType | 'all';
  elementType?: WeaponElementType | 'all';
  search?: string;
  isActive?: boolean | null;
}

export function useAdminWeapons(filters: EquipmentWeaponFilters = {}) {
  return useQuery({
    queryKey: [WEAPONS_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('weapons')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters.game && filters.game !== 'all') {
        q = q.eq('game', filters.game);
      }
      if (filters.weaponType && filters.weaponType !== 'all') {
        q = q.eq('weapon_type_id', filters.weaponType);
      }
      if (filters.monsterId && filters.monsterId !== 'all') {
        if (filters.monsterId === 'none') {
          q = q.is('monster_id', null);
        } else {
          q = q.eq('monster_id', filters.monsterId);
        }
      }
      if (filters.sourceType && filters.sourceType !== 'all') {
        q = q.eq('source_type', filters.sourceType);
      }
      if (filters.elementType && filters.elementType !== 'all') {
        q = q.eq('element_type', filters.elementType);
      }
      if (filters.search) {
        q = q.or(
          `name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
        );
      }
      if (filters.isActive !== null && filters.isActive !== undefined) {
        q = q.eq('is_active', filters.isActive);
      }

      const { data, error } = await q;
      if (error) {
        console.warn('Failed to query craftable weapons:', error);
        return [];
      }

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        game: (row.game as string) || 'mho',
        skills: Array.isArray(row.skills)
          ? row.skills.map((s: Record<string, unknown>) => ({
              ...s,
              unlock_rarity: s.unlock_rarity !== undefined ? (s.unlock_rarity as number | null) : null,
              unlockRarity: s.unlock_rarity !== undefined ? (s.unlock_rarity as number | null) : null,
            }))
          : [],
        is_active: Boolean(row.is_active),
        sort_order: Number(row.sort_order || 0),
      })) as DBWeapon[];
    },
    staleTime: 1000 * 30,
  });
}

export function useUpsertWeapon() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (weapon: WeaponUpsert) => {
      const payload = {
        ...weapon,
        skills: weapon.skills.map((s) => ({
          id: s.id,
          level: s.level,
          unlock_rarity: s.unlockRarity ?? s.unlock_rarity ?? null,
        })),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('weapons')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data as DBWeapon;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WEAPONS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_WEAPONS_KEY] });
    },
  });
}

export function useDeleteWeapon() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('weapons').delete().eq('id', id);
      if (error) throw error;
      return id;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WEAPONS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_WEAPONS_KEY] });
    },
  });
}

export function useToggleWeaponActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('weapons')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBWeapon;
    },

    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: [WEAPONS_KEY] });
      const snapshot = qc.getQueriesData<DBWeapon[]>({
        queryKey: [WEAPONS_KEY],
        exact: false,
      });

      qc.setQueriesData<DBWeapon[]>(
        { queryKey: [WEAPONS_KEY], exact: false },
        (old = []) => old.map((w) => (w.id === id ? { ...w, is_active: isActive } : w)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [WEAPONS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_WEAPONS_KEY] });
    },
  });
}

// ── Storage upload helper ────────────────────────────────────
export async function uploadWeaponImage(file: File, weaponId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${weaponId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('weapons')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('weapons').getPublicUrl(path);

  return publicUrl;
}
