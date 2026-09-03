// ─────────────────────────────────────────────────────────────
// React Query hooks for the admin adventurers table (MHO Playable Characters)
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DBAdventurer, AdventurerUpsert, AdventurerRole } from '../data/schemas/adventurer';

export interface AdventurerFilters {
  search?: string;
  role?: string;
  element?: string;
  weaponType?: string;
  isActive?: boolean | null;
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

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        role: (row.role || 'Assault') as AdventurerRole,
        is_default: Boolean(row.is_default),
        is_active: Boolean(row.is_active),
        allowed_weapon_types: Array.isArray(row.allowed_weapon_types) ? row.allowed_weapon_types : [],
      })) as DBAdventurer[];
    },
    staleTime: 1000 * 30,
  });
}

export function usePublicAdventurers() {
  return useQuery({
    queryKey: [PUBLIC_ADVENTURERS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adventurers')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        role: (row.role || 'Assault') as AdventurerRole,
        is_default: Boolean(row.is_default),
        is_active: Boolean(row.is_active),
        allowed_weapon_types: Array.isArray(row.allowed_weapon_types) ? row.allowed_weapon_types : [],
      })) as DBAdventurer[];
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
