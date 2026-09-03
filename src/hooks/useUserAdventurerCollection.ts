// ─────────────────────────────────────────────────────────────
// useUserAdventurerCollection — Hook for managing hunter's recruited Adventurers
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { DBAdventurer } from '../data/schemas/adventurer';

const STORAGE_KEY = 'field-guide-user-adventurer-collection';
const USER_ADVENTURER_COLLECTION_QUERY_KEY = 'user-adventurer-collection';

export function useUserAdventurerCollection() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

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
    queryKey: [USER_ADVENTURER_COLLECTION_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_adventurer_collection')
        .select('adventurer_id')
        .eq('user_id', user.id);

      if (error) {
        console.warn('user_adventurer_collection query error:', error);
        return [];
      }
      return (data ?? []).map((row: { adventurer_id: string }) => row.adventurer_id);
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });

  // Combined collection set
  const collectionSet = useMemo<Set<string>>(() => {
    if (user && dbCollection.length > 0) {
      return new Set(dbCollection);
    }
    return localSet;
  }, [user, dbCollection, localSet]);

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
      await qc.cancelQueries({ queryKey: [USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<string[]>([
        USER_ADVENTURER_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      qc.setQueryData(
        [USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id],
        (old: string[] = []) => (old.includes(adventurerId) ? old : [...old, adventurerId]),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id] });
    },
  });

  // 3. Remove Mutation
  const deleteMutation = useMutation({
    mutationFn: async (adventurerId: string) => {
      if (!user) {
        const next = new Set(localSet);
        next.delete(adventurerId);
        saveLocal(next);
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
      await qc.cancelQueries({ queryKey: [USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<string[]>([
        USER_ADVENTURER_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      qc.setQueryData(
        [USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id],
        (old: string[] = []) => old.filter((id) => id !== adventurerId),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_ADVENTURER_COLLECTION_QUERY_KEY, user.id] });
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

  return {
    collectionSet,
    isLoadingCollection,
    isRecruited,
    toggleRecruited,
    setRecruited,
  };
}
