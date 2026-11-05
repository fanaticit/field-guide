// ─────────────────────────────────────────────────────────────
// React Query hooks for the admin visages table (MHO Cards)
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { VISAGE_SELECT, normalizeVisageRow } from '../data/schemas/visage';
import type { DBVisage, VisageUpsert, InkType } from '../data/schemas/visage';

export interface VisageFilters {
  search?: string;
  inkType?: string;
  monsterType?: string;
  isActive?: boolean | null;
  showSpoilers?: boolean;
}

export const VISAGES_KEY = 'admin-visages';

// ── Queries ───────────────────────────────────────────────────

export function useAdminVisages(filters: VisageFilters = {}) {
  return useQuery({
    queryKey: [VISAGES_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('visages')
        .select(VISAGE_SELECT)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters.search) {
        q = q.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      if (filters.inkType) {
        q = q.contains('ink_types', [filters.inkType]);
      }
      if (filters.monsterType) {
        q = q.eq('monster_type', filters.monsterType);
      }
      if (filters.isActive !== null && filters.isActive !== undefined) {
        q = q.eq('is_active', filters.isActive);
      }
      if (filters.showSpoilers === false) {
        q = q.eq('is_spoiler', false);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row) => normalizeVisageRow(row as Record<string, unknown>));
    },
    staleTime: 1000 * 30,
  });
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpsertVisage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (visage: VisageUpsert & { mergeInks?: boolean }) => {
      let finalInkTypes = visage.ink_types ?? [];

      if (visage.mergeInks !== false && visage.id) {
        // Fetch existing ink_types for this card if it exists in DB to prevent removing previous Inks
        const { data: existingRow } = await supabase
          .from('visages')
          .select('ink_types')
          .eq('id', visage.id)
          .maybeSingle();

        if (existingRow && Array.isArray(existingRow.ink_types) && existingRow.ink_types.length > 0) {
          const merged = new Set<InkType>([
            ...(existingRow.ink_types as InkType[]),
            ...(visage.ink_types as InkType[]),
          ]);
          finalInkTypes = Array.from(merged);
        }
      }

      const payload = {
        ...visage,
        ink_types: finalInkTypes,
      };
      delete (payload as { mergeInks?: boolean }).mergeInks;
      delete (payload as { monster_icon?: string | null }).monster_icon;

      const { data, error } = await supabase
        .from('visages')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data as DBVisage;
    },

    onMutate: async (newVisage) => {
      await qc.cancelQueries({ queryKey: [VISAGES_KEY] });
      const snapshot = qc.getQueriesData<DBVisage[]>({
        queryKey: [VISAGES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBVisage[]>(
        { queryKey: [VISAGES_KEY], exact: false },
        (old = []) => {
          const idx = old.findIndex((v) => v.id === newVisage.id);
          const full: DBVisage = {
            ...newVisage,
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
      qc.invalidateQueries({ queryKey: [VISAGES_KEY] });
    },
  });
}

export function useDeleteVisage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('visages').delete().eq('id', id);
      if (error) throw error;
      return id;
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [VISAGES_KEY] });
      const snapshot = qc.getQueriesData<DBVisage[]>({
        queryKey: [VISAGES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBVisage[]>(
        { queryKey: [VISAGES_KEY], exact: false },
        (old = []) => old.filter((v) => v.id !== id),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [VISAGES_KEY] });
    },
  });
}

export function useToggleVisageActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('visages')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBVisage;
    },

    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: [VISAGES_KEY] });
      const snapshot = qc.getQueriesData<DBVisage[]>({
        queryKey: [VISAGES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBVisage[]>(
        { queryKey: [VISAGES_KEY], exact: false },
        (old = []) => old.map((v) => (v.id === id ? { ...v, is_active: isActive } : v)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [VISAGES_KEY] });
    },
  });
}

export function useToggleVisageSpoiler() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isSpoiler }: { id: string; isSpoiler: boolean }) => {
      const { data, error } = await supabase
        .from('visages')
        .update({ is_spoiler: isSpoiler })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DBVisage;
    },

    onMutate: async ({ id, isSpoiler }) => {
      await qc.cancelQueries({ queryKey: [VISAGES_KEY] });
      const snapshot = qc.getQueriesData<DBVisage[]>({
        queryKey: [VISAGES_KEY],
        exact: false,
      });

      qc.setQueriesData<DBVisage[]>(
        { queryKey: [VISAGES_KEY], exact: false },
        (old = []) => old.map((v) => (v.id === id ? { ...v, is_spoiler: isSpoiler } : v)),
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [VISAGES_KEY] });
    },
  });
}
