// ─────────────────────────────────────────────────────────────
// React Query hooks for the admin adventurers table (MHO Playable Characters)
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DBAdventurer, AdventurerUpsert, AdventurerRole, AdventurerSkill, AdventurerStatus } from '../data/schemas/adventurer';
import { resolveAdventurerMedia } from '../data/schemas/adventurer';
import { useAuthStore } from '../store/authStore';

export interface AdventurerFilters {
  search?: string;
  role?: string;
  element?: string;
  weaponType?: string;
  isActive?: boolean | null;
  showSpoilers?: boolean;
}

export const ADVENTURERS_KEY = 'admin-adventurers';
export const PUBLIC_ADVENTURERS_KEY = 'public-adventurers';

// ── Queries ───────────────────────────────────────────────────

export function useAdminAdventurers(filters: AdventurerFilters = {}) {
  return useQuery({
    queryKey: [ADVENTURERS_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('adventurers')
        .select('*')
        .order('is_default', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters.search) {
        q = q.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      if (filters.role) {
        q = q.eq('role', filters.role);
      }
      if (filters.element) {
        q = q.eq('element_specialization', filters.element);
      }
      if (filters.weaponType) {
        q = q.eq('weapon_type', filters.weaponType);
      }
      if (filters.isActive !== null && filters.isActive !== undefined) {
        q = q.eq('is_active', filters.isActive);
      }
      if (filters.showSpoilers === false) {
        q = q.eq('is_spoiler', false);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        role: (row.role || 'Assault') as AdventurerRole,
        is_default: Boolean(row.is_default),
        is_active: Boolean(row.is_active),
        is_spoiler: Boolean(row.is_spoiler),
        is_debug: Boolean(row.is_debug),
        status: (row.status || 'in_game') as AdventurerStatus,
        status_reason: (row.status_reason as string | null) ?? null,
        allowed_weapon_types: Array.isArray(row.allowed_weapon_types) ? row.allowed_weapon_types : [],
        bond_image: (row.bond_image as string | null) || (row.is_default ? null : `/images/adventurers/${row.id}_bond.png`),
      })) as DBAdventurer[];
    },
    staleTime: 1000 * 30,
  });
}

/** Skill list (name + type) for one adventurer, in the in-game order. */
export function useAdventurerSkills(adventurerId: string | null | undefined) {
  return useQuery({
    queryKey: ['adventurer-skills', adventurerId],
    enabled: Boolean(adventurerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adventurer_skills')
        .select('*')
        .eq('adventurer_id', adventurerId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdventurerSkill[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** One gift as it applies to one adventurer (adventurer_gift_preferences + adventurer_gift_items) */
export interface AdventurerGiftRow {
  gift_id: string;
  preference: 'favourite' | 'neutral' | 'disliked';
  /** percent, e.g. 150 */
  multiplier: number;
  bond_gained: number;
  name: string;
  category: string | null;
  description: string | null;
  icon: string | null;
  base_bond: number;
}

export function useAdventurerGifts(adventurerId: string | null | undefined) {
  return useQuery({
    queryKey: ['adventurer-gifts', adventurerId],
    enabled: Boolean(adventurerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adventurer_gift_preferences')
        .select('gift_id, preference, multiplier, bond_gained, gift:adventurer_gift_items(name, category, description, icon, base_bond, sort_order)')
        .eq('adventurer_id', adventurerId!);
      if (error) throw error;
      type Row = {
        gift_id: string; preference: AdventurerGiftRow['preference']; multiplier: number; bond_gained: number;
        gift: { name: string; category: string | null; description: string | null; icon: string | null; base_bond: number; sort_order: number } | null;
      };
      return ((data ?? []) as unknown as Row[])
        .filter((r) => r.gift)
        .map((r) => ({
          gift_id: r.gift_id, preference: r.preference, multiplier: r.multiplier, bond_gained: r.bond_gained,
          name: r.gift!.name, category: r.gift!.category, description: r.gift!.description,
          icon: r.gift!.icon, base_bond: r.gift!.base_bond, sort_order: r.gift!.sort_order,
        }))
        .sort((a, b) => b.bond_gained - a.bond_gained || a.sort_order - b.sort_order)
        .map(({ sort_order: _s, ...rest }) => rest as AdventurerGiftRow);
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** A favourite gift, for the quick-reference icons */
export interface FavouriteGift {
  gift_id: string;
  name: string;
  icon: string | null;
  bond_gained: number;
  multiplier: number;
}

/** Every adventurer's favourite gifts in one request, keyed by adventurer id (best bond first). */
export function useAllFavouriteGifts() {
  return useQuery({
    queryKey: ['adventurer-favourite-gifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adventurer_gift_preferences')
        .select('adventurer_id, gift_id, multiplier, bond_gained, gift:adventurer_gift_items(name, icon, sort_order)')
        .eq('preference', 'favourite');
      if (error) throw error;
      type Row = {
        adventurer_id: string; gift_id: string; multiplier: number; bond_gained: number;
        gift: { name: string; icon: string | null; sort_order: number } | null;
      };
      const byAdventurer = new Map<string, (FavouriteGift & { sort_order: number })[]>();
      for (const r of (data ?? []) as unknown as Row[]) {
        if (!r.gift) continue;
        const list = byAdventurer.get(r.adventurer_id) ?? [];
        list.push({
          gift_id: r.gift_id, name: r.gift.name, icon: r.gift.icon,
          bond_gained: r.bond_gained, multiplier: r.multiplier, sort_order: r.gift.sort_order,
        });
        byAdventurer.set(r.adventurer_id, list);
      }
      const result = new Map<string, FavouriteGift[]>();
      for (const [id, list] of byAdventurer) {
        list.sort((a, b) => b.bond_gained - a.bond_gained || a.sort_order - b.sort_order);
        result.set(id, list.map(({ sort_order: _s, ...g }) => g));
      }
      return result;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function usePublicAdventurers(options?: { showSpoilers?: boolean }) {
  const gender = useAuthStore((s) => s.profile?.equipment_gender ?? 'male');

  return useQuery({
    queryKey: [PUBLIC_ADVENTURERS_KEY, options?.showSpoilers, gender],
    queryFn: async () => {
      let q = supabase
        .from('adventurers')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!options?.showSpoilers) {
        q = q.eq('is_spoiler', false);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => {
        const adv: DBAdventurer = {
          ...row,
          role: (row.role || 'Assault') as AdventurerRole,
          is_default: Boolean(row.is_default),
          is_active: Boolean(row.is_active),
          is_spoiler: Boolean(row.is_spoiler),
          is_debug: Boolean(row.is_debug),
          status: (row.status || 'in_game') as AdventurerStatus,
          status_reason: (row.status_reason as string | null) ?? null,
          allowed_weapon_types: Array.isArray(row.allowed_weapon_types) ? row.allowed_weapon_types : [],
          traits: Array.isArray(row.traits) ? row.traits : [],
          bond_image: (row.bond_image as string | null) || (row.is_default ? null : `/images/adventurers/${row.id}_bond.png`),
        } as DBAdventurer;
        return resolveAdventurerMedia(adv, gender)!;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpsertAdventurer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (adventurer: AdventurerUpsert) => {
      const { data, error } = await supabase
        .from('adventurers')
        .upsert(adventurer, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data as DBAdventurer;
    },

    onMutate: async (newAdventurer) => {
      await qc.cancelQueries({ queryKey: [ADVENTURERS_KEY] });
      const snapshot = qc.getQueriesData<DBAdventurer[]>({
        queryKey: [ADVENTURERS_KEY],
        exact: false,
      });

      qc.setQueriesData<DBAdventurer[]>(
        { queryKey: [ADVENTURERS_KEY], exact: false },
        (old = []) => {
          const idx = old.findIndex((a) => a.id === newAdventurer.id);
          const full: DBAdventurer = {
            ...newAdventurer,
            created_at: old[idx]?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (idx >= 0) {
            const next = [...old];
            next[idx] = full;
            return next;
          }
          return [...old, full];
        },
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ADVENTURERS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_ADVENTURERS_KEY] });
    },
  });
}

export function useUpdateAdventurerWeapon() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, weaponType }: { id: string; weaponType: string }) => {
      const { data, error } = await supabase
        .from('adventurers')
        .update({ weapon_type: weaponType })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBAdventurer;
    },

    onMutate: async ({ id, weaponType }) => {
      await qc.cancelQueries({ queryKey: [ADVENTURERS_KEY] });
      await qc.cancelQueries({ queryKey: [PUBLIC_ADVENTURERS_KEY] });

      qc.setQueriesData<DBAdventurer[]>(
        { queryKey: [ADVENTURERS_KEY], exact: false },
        (old = []) => old.map((a) => (a.id === id ? { ...a, weapon_type: weaponType } : a)),
      );
      qc.setQueriesData<DBAdventurer[]>(
        { queryKey: [PUBLIC_ADVENTURERS_KEY], exact: false },
        (old = []) => old.map((a) => (a.id === id ? { ...a, weapon_type: weaponType } : a)),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ADVENTURERS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_ADVENTURERS_KEY] });
    },
  });
}

export function useDeleteAdventurer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('adventurers').delete().eq('id', id);
      if (error) throw error;
      return id;
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [ADVENTURERS_KEY] });
      const snapshot = qc.getQueriesData<DBAdventurer[]>({
        queryKey: [ADVENTURERS_KEY],
        exact: false,
      });

      qc.setQueriesData<DBAdventurer[]>(
        { queryKey: [ADVENTURERS_KEY], exact: false },
        (old = []) => old.filter((a) => a.id !== id),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ADVENTURERS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_ADVENTURERS_KEY] });
    },
  });
}

export function useToggleAdventurerActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('adventurers')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBAdventurer;
    },

    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: [ADVENTURERS_KEY] });
      const snapshot = qc.getQueriesData<DBAdventurer[]>({
        queryKey: [ADVENTURERS_KEY],
        exact: false,
      });

      qc.setQueriesData<DBAdventurer[]>(
        { queryKey: [ADVENTURERS_KEY], exact: false },
        (old = []) => old.map((a) => (a.id === id ? { ...a, is_active: isActive } : a)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ADVENTURERS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_ADVENTURERS_KEY] });
    },
  });
}

export function useToggleAdventurerSpoiler() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isSpoiler }: { id: string; isSpoiler: boolean }) => {
      const { data, error } = await supabase
        .from('adventurers')
        .update({ is_spoiler: isSpoiler, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBAdventurer;
    },

    onMutate: async ({ id, isSpoiler }) => {
      await qc.cancelQueries({ queryKey: [ADVENTURERS_KEY] });
      await qc.cancelQueries({ queryKey: [PUBLIC_ADVENTURERS_KEY] });

      const snapshot = qc.getQueriesData<DBAdventurer[]>({
        queryKey: [ADVENTURERS_KEY],
        exact: false,
      });

      qc.setQueriesData<DBAdventurer[]>(
        { queryKey: [ADVENTURERS_KEY], exact: false },
        (old = []) => old.map((a) => (a.id === id ? { ...a, is_spoiler: isSpoiler } : a)),
      );
      qc.setQueriesData<DBAdventurer[]>(
        { queryKey: [PUBLIC_ADVENTURERS_KEY], exact: false },
        (old = []) => old.map((a) => (a.id === id ? { ...a, is_spoiler: isSpoiler } : a)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ADVENTURERS_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_ADVENTURERS_KEY] });
    },
  });
}

// ── Storage upload helper ────────────────────────────────────

export async function uploadAdventurerImage(file: File, adventurerId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${adventurerId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('adventurers')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('adventurers').getPublicUrl(path);

  return publicUrl;
}
