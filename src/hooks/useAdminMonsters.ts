// ─────────────────────────────────────────────────────────────
// React Query hooks for the admin monsters table
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DBMonster {
  id: string;
  name: string;
  name_ja: string | null;
  species: string | null;
  tier: string;
  elements: string[];
  weaknesses: string[];
  is_variant: boolean;
  parent_id: string | null;
  is_radiant: boolean;
  games: string[];
  is_active: boolean;
  icon: string | null;
  /** Per-game sort positions — e.g. { mhn: 10, mho: 3 } */
  sort_orders: Record<string, number>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MonsterUpsert = Omit<DBMonster, 'created_at' | 'updated_at'>;

export interface MonsterFilters {
  search?: string;
  game?: string;
  tier?: string;
  species?: string;
  isActive?: boolean | null;
}

export const MONSTERS_KEY = 'admin-monsters';

// ── Queries ───────────────────────────────────────────────────

export function useAdminMonsters(filters: MonsterFilters = {}) {
  return useQuery({
    queryKey: [MONSTERS_KEY, filters.game, filters.tier, filters.species, filters.search, filters.isActive],
    queryFn: async () => {
      // sort_orders is JSONB — can't order by it directly via PostgREST.
      // Game-specific ordering is handled client-side in MonsterManager's useMemo.
      let q = supabase
        .from('monsters')
        .select('*')
        .order('name', { ascending: true });

      if (filters.search) {
        q = q.ilike('name', `%${filters.search}%`);
      }
      if (filters.game) {
        q = q.contains('games', [filters.game]);
      }
      if (filters.tier) {
        q = q.eq('tier', filters.tier);
      }
      if (filters.species) {
        q = q.eq('species', filters.species);
      }
      if (filters.isActive !== null && filters.isActive !== undefined) {
        q = q.eq('is_active', filters.isActive);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as DBMonster[];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useBaseMonsters() {
  return useQuery({
    queryKey: [MONSTERS_KEY, 'base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monsters')
        .select('id, name, species, tier')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Pick<DBMonster, 'id' | 'name' | 'species' | 'tier'>[];
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Public-facing hook — fetches active monsters for a specific game,
 * sorted by that game's sort_orders entry (client-side), then by name.
 * Used by the Monster Guide page so both MHN and MHO reflect the admin
 * roster and ordering set in the admin panel.
 */
export function usePublicMonsters(game: string) {
  return useQuery({
    queryKey: ['public-monsters', game],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monsters')
        .select('*')
        .eq('is_active', true)
        .contains('games', [game])
        .order('name', { ascending: true });
      if (error) throw error;

      const monsters = data as DBMonster[];
      // Sort by this game's sort_orders entry; monsters with no entry go last
      return monsters.sort(
        (a, b) =>
          (a.sort_orders[game] ?? 9999) - (b.sort_orders[game] ?? 9999) ||
          a.name.localeCompare(b.name),
      );
    },
    staleTime: 1000 * 60,
  });
}

// ── Shared optimistic patcher ────────────────────────────────
// Patches all cached monster queries that include the given id.
function patchCachedMonster(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<DBMonster>,
) {
  qc.setQueriesData(
    // Match ANY query whose key starts with MONSTERS_KEY
    { queryKey: [MONSTERS_KEY], exact: false },
    (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return (old as DBMonster[]).map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      );
    },
  );
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpsertMonster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (monster: MonsterUpsert) => {
      const { data, error } = await supabase
        .from('monsters')
        .upsert(monster, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data as DBMonster;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MONSTERS_KEY] });
    },
  });
}

export function useToggleMonsterActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('monsters')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: [MONSTERS_KEY] });
      const snapshot = qc.getQueriesData<DBMonster[]>({ queryKey: [MONSTERS_KEY], exact: false });
      patchCachedMonster(qc, id, { is_active: isActive });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [MONSTERS_KEY] });
    },
  });
}

/**
 * Toggle a single game on/off for a monster.
 *
 * Takes `newGames` (the already-computed target array) from the caller —
 * no extra SELECT round-trip needed.
 *
 * Usage:
 *   const toggle = useToggleMonsterGame();
 *   const newGames = inGame
 *     ? monster.games.filter(g => g !== 'mho')
 *     : [...monster.games, 'mho'];
 *   toggle.mutate({ id: monster.id, newGames });
 */
export function useToggleMonsterGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newGames }: { id: string; newGames: string[] }) => {
      const { error } = await supabase
        .from('monsters')
        .update({ games: newGames })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    onMutate: async ({ id, newGames }) => {
      // Cancel any in-flight fetches so they don't stomp our optimistic update
      await qc.cancelQueries({ queryKey: [MONSTERS_KEY] });

      // Snapshot all matching cached queries for rollback
      const snapshot = qc.getQueriesData<DBMonster[]>({
        queryKey: [MONSTERS_KEY],
        exact: false,
      });

      // Apply optimistic patch to every cached query that contains this monster
      patchCachedMonster(qc, id, { games: newGames });

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      // Roll back to the snapshot
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) {
          qc.setQueryData(key, data);
        }
      }
    },

    onSettled: () => {
      // Always refetch to ensure cache is in sync with DB
      qc.invalidateQueries({ queryKey: [MONSTERS_KEY] });
    },
  });
}

export function useDeleteMonster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('monsters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MONSTERS_KEY] });
    },
  });
}
