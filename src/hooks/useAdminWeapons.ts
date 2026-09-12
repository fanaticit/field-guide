// ─────────────────────────────────────────────────────────────
// React Query hooks for weapons & weapon types
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  DBWeapon,
  DBWeaponType,
  WeaponUpsert,
  WeaponSkill,
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
          `name.ilike.%${filters.search}%,upgraded_name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
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
        upgraded_name: (row.upgraded_name as string) || null,
        upgraded_name_ja: (row.upgraded_name_ja as string) || null,
        upgrade_level: row.upgrade_level !== null && row.upgrade_level !== undefined ? Number(row.upgrade_level) : null,
        rarity: Number(row.rarity ?? row.grade ?? 1),
        grade: Number(row.rarity ?? row.grade ?? 1),
        skills: Array.isArray(row.skills)
          ? row.skills.map((s: Record<string, unknown>) => {
              const ur = s.unlock_rarity !== undefined ? (s.unlock_rarity as number | null) : (s.unlock_level as number | null) ?? null;
              return {
                ...s,
                unlock_rarity: ur,
                unlockRarity: ur,
                unlock_level: ur,
                unlockLevel: ur,
              };
            })
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
      const weaponRarity = weapon.rarity ?? weapon.grade ?? 1;
      const payload = {
        ...weapon,
        rarity: weaponRarity,
        grade: weaponRarity,
        upgraded_name: weapon.upgraded_name?.trim() || null,
        upgraded_name_ja: weapon.upgraded_name_ja?.trim() || null,
        upgrade_level: weapon.upgrade_level ? Number(weapon.upgrade_level) : null,
        skills: weapon.skills.map((s) => ({
          id: s.id,
          level: s.level,
          unlock_rarity: s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null,
          unlock_level: s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null,
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

export interface MergeWeaponsPayload {
  baseWeaponId: string;       // Weapon to keep (younger/base)
  upgradedWeaponId: string;   // Weapon to merge from and remove (older/upgraded)
  upgradedName: string;       // New upgraded name to set on base weapon
  upgradedNameJa?: string | null;
  upgradeLevel: number | null; // Level or rarity at which it upgrades
  mergedSkills: WeaponSkill[]; // Consolidated skills
  keepImageFrom: 'base' | 'upgraded';
  keepDescriptionFrom: 'base' | 'upgraded';
}

export function useMergeWeapons() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MergeWeaponsPayload) => {
      const {
        baseWeaponId,
        upgradedWeaponId,
        upgradedName,
        upgradedNameJa,
        upgradeLevel,
        mergedSkills,
        keepImageFrom,
        keepDescriptionFrom,
      } = payload;

      // 1. Fetch both weapons
      const { data: weapons, error: fetchErr } = await supabase
        .from('weapons')
        .select('*')
        .in('id', [baseWeaponId, upgradedWeaponId]);

      if (fetchErr) throw fetchErr;
      const baseWeapon = weapons?.find((w) => w.id === baseWeaponId);
      const upgradedWeapon = weapons?.find((w) => w.id === upgradedWeaponId);

      if (!baseWeapon || !upgradedWeapon) {
        throw new Error('Could not find both weapons to perform merge.');
      }

      const finalImage =
        keepImageFrom === 'upgraded'
          ? upgradedWeapon.image || baseWeapon.image
          : baseWeapon.image || upgradedWeapon.image;
      const finalDesc =
        keepDescriptionFrom === 'upgraded'
          ? upgradedWeapon.description || baseWeapon.description
          : baseWeapon.description || upgradedWeapon.description;

      // 2. Update base weapon with upgraded name, level, merged skills, and chosen assets
      const updatePayload = {
        upgraded_name: upgradedName.trim() || null,
        upgraded_name_ja: upgradedNameJa?.trim() || null,
        upgrade_level: upgradeLevel ? Number(upgradeLevel) : null,
        skills: mergedSkills.map((s) => ({
          id: s.id,
          level: s.level,
          unlock_rarity: s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null,
          unlock_level: s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null,
        })),
        image: finalImage,
        description: finalDesc,
        updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from('weapons')
        .update(updatePayload)
        .eq('id', baseWeaponId);

      if (updateErr) throw updateErr;

      // 3. Migrate user collection references
      const { data: collRows } = await supabase
        .from('user_weapon_collection')
        .select('id, user_id')
        .eq('weapon_id', upgradedWeaponId);

      if (collRows && collRows.length > 0) {
        for (const row of collRows) {
          const { data: existingBase } = await supabase
            .from('user_weapon_collection')
            .select('id')
            .eq('user_id', row.user_id)
            .eq('weapon_id', baseWeaponId)
            .maybeSingle();

          if (existingBase) {
            await supabase.from('user_weapon_collection').delete().eq('id', row.id);
          } else {
            await supabase
              .from('user_weapon_collection')
              .update({ weapon_id: baseWeaponId })
              .eq('id', row.id);
          }
        }
      }

      // 4. Migrate mho_builds references
      await supabase
        .from('mho_builds')
        .update({ weapon_id: baseWeaponId })
        .eq('weapon_id', upgradedWeaponId);

      // 5. Delete the upgraded weapon record
      const { error: delErr } = await supabase
        .from('weapons')
        .delete()
        .eq('id', upgradedWeaponId);

      if (delErr) {
        console.warn('Could not delete merged weapon record, deactivating instead:', delErr);
        await supabase
          .from('weapons')
          .update({ is_active: false, notes: `Merged into ${baseWeaponId}` })
          .eq('id', upgradedWeaponId);
      }

      return { baseWeaponId, upgradedWeaponId };
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WEAPONS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_WEAPONS_KEY] });
      qc.invalidateQueries({ queryKey: ['weapons'] });
      qc.invalidateQueries({ queryKey: ['user_weapon_collection'] });
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

