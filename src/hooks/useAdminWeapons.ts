// ─────────────────────────────────────────────────────────────
// React Query hooks for weapons & weapon types
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  DBWeapon,
  DBWeaponUpgrade,
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
    games: isMHO ? ['mho'] : ['mho'],
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
  weaponType?: string;
  monsterId?: string;
  sourceType?: WeaponSourceType | 'all';
  elementType?: WeaponElementType | 'all';
  search?: string;
  /** true = visible weapons only, false = hidden only, null/undefined = all */
  isActive?: boolean | null;
  /**
   * Public pages: spoiler weapons are only included when the hunter turned on "Show spoilers".
   * Leave undefined (admin) to include them.
   */
  showSpoilers?: boolean;
}

export function useAdminWeapons(filters: EquipmentWeaponFilters = {}) {
  return useQuery({
    queryKey: [WEAPONS_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('weapons')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(1000);

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
          `name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,series.ilike.%${filters.search}%,description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
        );
      }
      if (filters.isActive !== null && filters.isActive !== undefined) {
        q = q.eq('is_active', filters.isActive);
      }
      if (filters.showSpoilers === false) {
        q = q.eq('is_spoiler', false);
      }

      const { data, error } = await q;
      if (error) {
        console.warn('Failed to query weapons:', error);
        return [];
      }

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        deco_slots: (row.deco_slots as number[]) ?? [],
        rarity: Number(row.rarity ?? 1),
        max_rarity: Number(row.max_rarity ?? row.rarity ?? 1),
        is_active: Boolean(row.is_active),
        is_spoiler: Boolean(row.is_spoiler),
        sort_order: Number(row.sort_order || 0),
      })) as DBWeapon[];
    },
    staleTime: 1000 * 30,
  });
}

/** The upgrade steps (one per rarity) of a weapon */
export function useWeaponUpgrades(weaponId: string | null) {
  return useQuery({
    queryKey: [WEAPONS_KEY, 'upgrades', weaponId],
    enabled: !!weaponId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weapon_upgrades')
        .select('*')
        .eq('weapon_id', weaponId!)
        .order('rarity', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DBWeaponUpgrade[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

export function useUpsertWeapon() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (weapon: WeaponUpsert) => {
      const payload = {
        ...weapon,
        status_reason: weapon.status === 'in_game' ? null : weapon.status_reason?.trim() || null,
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
      qc.invalidateQueries({ queryKey: ['weapons'] });
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

export function useToggleWeaponSpoiler() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isSpoiler }: { id: string; isSpoiler: boolean }) => {
      const { error } = await supabase
        .from('weapons')
        .update({ is_spoiler: isSpoiler, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },

    onMutate: async ({ id, isSpoiler }) => {
      await qc.cancelQueries({ queryKey: [WEAPONS_KEY] });
      const snapshot = qc.getQueriesData<DBWeapon[]>({ queryKey: [WEAPONS_KEY], exact: false });
      qc.setQueriesData<DBWeapon[]>(
        { queryKey: [WEAPONS_KEY], exact: false },
        (old) => (Array.isArray(old) ? old.map((w) => (w.id === id ? { ...w, is_spoiler: isSpoiler } : w)) : old),
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
  // 1. Ensure user has a valid, active session before attempting upload
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      throw new Error('Your admin session has expired. Please sign in again to upload weapon artwork.');
    }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${weaponId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('weapons')
    .upload(path, file, {
      contentType: file.type || 'image/png',
      upsert: true,
    });

  if (error) {
    if (error.message?.includes('row-level security') || (error as { statusCode?: string }).statusCode === '403') {
      throw new Error('Upload denied: Admin session expired or unauthorized. Please re-sign in.');
    }
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('weapons').getPublicUrl(path);

  return publicUrl;
}

