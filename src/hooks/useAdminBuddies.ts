// ─────────────────────────────────────────────────────────────
// React Query hooks for the admin buddies table (MHO Companions)
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DBBuddy, BuddyUpsert, BuddyTier, BuddyRole } from '../data/schemas/buddy';

export interface BuddyFilters {
  search?: string;
  tier?: string;
  role?: string;
  isActive?: boolean | null;
}

export const BUDDIES_KEY = 'admin-buddies';

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

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        tier: (row.tier || 'R') as BuddyTier,
        role: (row.role || 'Assault') as BuddyRole,
        is_active: Boolean(row.is_active),
      })) as DBBuddy[];
    },
    staleTime: 1000 * 30,
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
    },
  });
}
