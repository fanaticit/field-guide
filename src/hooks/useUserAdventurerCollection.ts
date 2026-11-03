// ─────────────────────────────────────────────────────────────
// useUserAdventurerCollection — Hook for managing hunter's recruited Adventurers
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { clampInsightLevel, type DBAdventurer } from '../data/schemas/adventurer';

const STORAGE_KEY = 'field-guide-user-adventurer-collection';
const INSIGHT_STORAGE_KEY = 'field-guide-user-adventurer-insight';
const USER_ADVENTURER_COLLECTION_QUERY_KEY = 'user-adventurer-collection';

interface CollectionRow {
  adventurer_id: string;
  insight_level: number;
}

export function useUserAdventurerCollection() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const queryKey = [USER_ADVENTURER_COLLECTION_QUERY_KEY, user?.id];

  // Guest insight levels, keyed by adventurer ID
  const [localInsight, setLocalInsight] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(INSIGHT_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse local adventurer insight levels', e);
    }
    return {};
  });

  const saveLocalInsight = (next: Record<string, number>) => {
    setLocalInsight(next);
    try {
      localStorage.setItem(INSIGHT_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save adventurer insight levels to local storage', e);
    }
  };

  // Local fallback storage for guests / offline: Set of recruited adventurer IDs
  const [localSet, setLocalSet] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {
      console.warn('Failed to parse local adventurer collection', e);
    }
    return new Set<string>();
  });

  const saveLocal = (next: Set<string>) => {
    setLocalSet(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch (e) {
      console.warn('Failed to save adventurer collection to local storage', e);
    }
  };

  // 1. Live Supabase Query (when signed in)
  const { data: dbCollection = [], isLoading: isLoadingCollection } = useQuery({
    queryKey,
    queryFn: async (): Promise<CollectionRow[]> => {
      if (!user) return [];
      let { data, error } = await supabase
        .from('user_adventurer_collection')
        .select('adventurer_id, insight_level')
        .eq('user_id', user.id);

      if (error) {
        // insight_level column not migrated yet: fall back to recruitment only
        const fallback = await supabase
          .from('user_adventurer_collection')
          .select('adventurer_id')
          .eq('user_id', user.id);
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      if (error) {
        console.warn('user_adventurer_collection query error:', error);
        return [];
      }
      return (data ?? []).map((row: { adventurer_id: string; insight_level?: number }) => ({
        adventurer_id: row.adventurer_id,
        insight_level: clampInsightLevel(row.insight_level ?? 1),
      }));
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });

  const useDb = Boolean(user) && dbCollection.length > 0;

  // Combined collection set
  const collectionSet = useMemo<Set<string>>(() => {
    if (useDb) return new Set(dbCollection.map((r) => r.adventurer_id));
    return localSet;
  }, [useDb, dbCollection, localSet]);

  const insightMap = useMemo<Map<string, number>>(() => {
    if (useDb) return new Map(dbCollection.map((r) => [r.adventurer_id, r.insight_level]));
    return new Map(Object.entries(localInsight).map(([id, lvl]) => [id, clampInsightLevel(lvl)]));
  }, [useDb, dbCollection, localInsight]);

  // 2. Add Mutation
  const addMutation = useMutation({
    mutationFn: async (adventurerId: string) => {
      if (!user) {
        const next = new Set(localSet);
        next.add(adventurerId);
        saveLocal(next);
        return;
      }

      const { error } = await supabase.from('user_adventurer_collection').upsert(
        {
          user_id: user.id,
          adventurer_id: adventurerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,adventurer_id' },
      );
      if (error) throw error;
    },
    onMutate: async (adventurerId) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CollectionRow[]>(queryKey);

      qc.setQueryData<CollectionRow[]>(queryKey, (old = []) =>
        old.some((r) => r.adventurer_id === adventurerId)
          ? old
          : [...old, { adventurer_id: adventurerId, insight_level: 1 }],
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey });
    },
  });

  // 3. Remove Mutation
  const deleteMutation = useMutation({
    mutationFn: async (adventurerId: string) => {
      if (!user) {
        const next = new Set(localSet);
        next.delete(adventurerId);
        saveLocal(next);
        const { [adventurerId]: _removed, ...rest } = localInsight;
        saveLocalInsight(rest);
        return;
      }

      const { error } = await supabase
        .from('user_adventurer_collection')
        .delete()
        .eq('user_id', user.id)
        .eq('adventurer_id', adventurerId);

      if (error) throw error;
    },
    onMutate: async (adventurerId) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CollectionRow[]>(queryKey);

      qc.setQueryData<CollectionRow[]>(queryKey, (old = []) =>
        old.filter((r) => r.adventurer_id !== adventurerId),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey });
    },
  });

  // 4. Insight level Mutation (also recruits the adventurer if needed)
  const insightMutation = useMutation({
    mutationFn: async ({ adventurerId, level }: { adventurerId: string; level: number }) => {
      if (!user) {
        const next = new Set(localSet);
        next.add(adventurerId);
        saveLocal(next);
        saveLocalInsight({ ...localInsight, [adventurerId]: level });
        return;
      }

      const { error } = await supabase.from('user_adventurer_collection').upsert(
        {
          user_id: user.id,
          adventurer_id: adventurerId,
          insight_level: level,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,adventurer_id' },
      );
      if (error) throw error;
    },
    onMutate: async ({ adventurerId, level }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CollectionRow[]>(queryKey);

      qc.setQueryData<CollectionRow[]>(queryKey, (old = []) =>
        old.some((r) => r.adventurer_id === adventurerId)
          ? old.map((r) => (r.adventurer_id === adventurerId ? { ...r, insight_level: level } : r))
          : [...old, { adventurer_id: adventurerId, insight_level: level }],
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey });
    },
  });

  // Helpers
  const isRecruited = useCallback(
    (adventurer: DBAdventurer | string) => {
      if (typeof adventurer === 'object') {
        if (adventurer.is_default) return true;
        return collectionSet.has(adventurer.id);
      }
      return collectionSet.has(adventurer);
    },
    [collectionSet],
  );

  const toggleRecruited = useCallback(
    (adventurerId: string) => {
      if (collectionSet.has(adventurerId)) {
        deleteMutation.mutate(adventurerId);
      } else {
        addMutation.mutate(adventurerId);
      }
    },
    [collectionSet, addMutation, deleteMutation],
  );

  const setRecruited = useCallback(
    (adventurerId: string, recruited: boolean) => {
      if (recruited) {
        addMutation.mutate(adventurerId);
      } else {
        deleteMutation.mutate(adventurerId);
      }
    },
    [addMutation, deleteMutation],
  );

  /** Insight level 1-7 for a recruited adventurer; 0 when not recruited. */
  const getInsightLevel = useCallback(
    (adventurer: DBAdventurer | string) => {
      const id = typeof adventurer === 'object' ? adventurer.id : adventurer;
      if (insightMap.has(id)) return insightMap.get(id)!;
      return isRecruited(adventurer) ? 1 : 0;
    },
    [insightMap, isRecruited],
  );

  const setInsightLevel = useCallback(
    (adventurerId: string, level: number) => {
      insightMutation.mutate({ adventurerId, level: clampInsightLevel(level) });
    },
    [insightMutation],
  );

  return {
    collectionSet,
    isLoadingCollection,
    isRecruited,
    toggleRecruited,
    setRecruited,
    getInsightLevel,
    setInsightLevel,
  };
}
