// ─────────────────────────────────────────────────────────────
// React Query hooks for the admin buddies table (MHO Companions)
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DBBuddy, BuddyUpsert, BuddyTier, BuddyRole, BuddySkill, BuddyStatus } from '../data/schemas/buddy';

export interface BuddyFilters {
  search?: string;
  tier?: string;
  role?: string;
  isActive?: boolean | null;
  showSpoilers?: boolean;
}

/** Skills of one companion (basic skills, passive skills and unique skills), in game order. */
export function useBuddySkills(buddyId: string | null | undefined) {
  return useQuery({
    queryKey: ['buddy-skills', buddyId],
    enabled: Boolean(buddyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buddy_skills')
        .select('*')
        .eq('buddy_id', buddyId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BuddySkill[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export const BUDDIES_KEY = 'admin-buddies';
export const PUBLIC_BUDDIES_KEY = 'public-buddies';

// ── Queries ───────────────────────────────────────────────────

export function useAdminBuddies(filters: BuddyFilters = {}) {
  return useQuery({
    queryKey: [BUDDIES_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('buddies')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters.search) {
        q = q.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      if (filters.tier) {
        q = q.eq('tier', filters.tier);
      }
      if (filters.role) {
        q = q.eq('role', filters.role);
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
        tier: (row.tier || 'R') as BuddyTier,
        role: (row.role || 'Assault') as BuddyRole,
        is_active: Boolean(row.is_active),
        is_spoiler: Boolean(row.is_spoiler),
        is_debug: Boolean(row.is_debug),
        status: (row.status || 'in_game') as BuddyStatus,
        status_reason: (row.status_reason as string | null) ?? null,
      })) as DBBuddy[];
    },
    staleTime: 1000 * 30,
  });
}

export function usePublicBuddies(options?: { showSpoilers?: boolean }) {
  return useQuery({
    queryKey: [PUBLIC_BUDDIES_KEY, options?.showSpoilers],
    queryFn: async () => {
      let q = supabase
        .from('buddies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!options?.showSpoilers) {
        q = q.eq('is_spoiler', false);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        tier: (row.tier || 'R') as BuddyTier,
        role: (row.role || 'Assault') as BuddyRole,
        is_active: Boolean(row.is_active),
        is_spoiler: Boolean(row.is_spoiler),
        is_debug: Boolean(row.is_debug),
        status: (row.status || 'in_game') as BuddyStatus,
        status_reason: (row.status_reason as string | null) ?? null,
      })) as DBBuddy[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpsertBuddy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (buddy: BuddyUpsert) => {
      const { data, error } = await supabase
        .from('buddies')
        .upsert(buddy, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data as DBBuddy;
    },

    onMutate: async (newBuddy) => {
      await qc.cancelQueries({ queryKey: [BUDDIES_KEY] });
      const snapshot = qc.getQueriesData<DBBuddy[]>({
        queryKey: [BUDDIES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBBuddy[]>(
        { queryKey: [BUDDIES_KEY], exact: false },
        (old = []) => {
          const idx = old.findIndex((b) => b.id === newBuddy.id);
          const full: DBBuddy = {
            ...newBuddy,
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
      qc.invalidateQueries({ queryKey: [BUDDIES_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_BUDDIES_KEY] });
    },
  });
}

export function useDeleteBuddy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('buddies').delete().eq('id', id);
      if (error) throw error;
      return id;
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [BUDDIES_KEY] });
      await qc.cancelQueries({ queryKey: [PUBLIC_BUDDIES_KEY] });
      const snapshot = qc.getQueriesData<DBBuddy[]>({
        queryKey: [BUDDIES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBBuddy[]>(
        { queryKey: [BUDDIES_KEY], exact: false },
        (old = []) => old.filter((b) => b.id !== id),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [BUDDIES_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_BUDDIES_KEY] });
    },
  });
}

export function useToggleBuddyActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('buddies')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBBuddy;
    },

    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: [BUDDIES_KEY] });
      const snapshot = qc.getQueriesData<DBBuddy[]>({
        queryKey: [BUDDIES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBBuddy[]>(
        { queryKey: [BUDDIES_KEY], exact: false },
        (old = []) => old.map((b) => (b.id === id ? { ...b, is_active: isActive } : b)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [BUDDIES_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_BUDDIES_KEY] });
    },
  });
}

export function useToggleBuddySpoiler() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isSpoiler }: { id: string; isSpoiler: boolean }) => {
      const { data, error } = await supabase
        .from('buddies')
        .update({ is_spoiler: isSpoiler })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBBuddy;
    },

    onMutate: async ({ id, isSpoiler }) => {
      await qc.cancelQueries({ queryKey: [BUDDIES_KEY] });
      await qc.cancelQueries({ queryKey: [PUBLIC_BUDDIES_KEY] });
      const snapshot = qc.getQueriesData<DBBuddy[]>({
        queryKey: [BUDDIES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBBuddy[]>(
        { queryKey: [BUDDIES_KEY], exact: false },
        (old = []) => old.map((b) => (b.id === id ? { ...b, is_spoiler: isSpoiler } : b)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [BUDDIES_KEY] });
      qc.invalidateQueries({ queryKey: [PUBLIC_BUDDIES_KEY] });
    },
  });
}
