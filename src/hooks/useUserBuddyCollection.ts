// ─────────────────────────────────────────────────────────────
// useUserBuddyCollection — Hook for managing hunter's owned Buddies & tier levels (0, 1, 2)
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import {
  type BuddyCollectionEntry,
  clampBuddyTierLevel,
} from '../data/schemas/buddy';

const STORAGE_KEY = 'field-guide-user-buddy-collection';
const USER_BUDDY_COLLECTION_QUERY_KEY = 'user-buddy-collection';

interface DbBuddyCollectionRow {
  buddy_id: string;
  tier_level?: number;
  quantity?: number;
}

export function useUserBuddyCollection() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Local fallback storage for guests / offline: keyed by `buddyId`
  const [localMap, setLocalMap] = useState<Record<string, BuddyCollectionEntry>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse local buddy collection', e);
    }
    return {};
  });

  const saveLocal = (next: Record<string, BuddyCollectionEntry>) => {
    setLocalMap(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save buddy collection to local storage', e);
    }
  };

  // 1. Live Supabase Query (when signed in)
  const { data: dbCollection = [], isLoading: isLoadingCollection } = useQuery({
    queryKey: [USER_BUDDY_COLLECTION_QUERY_KEY, user?.id],
    queryFn: async (): Promise<DbBuddyCollectionRow[]> => {
      if (!user) return [];
      let { data, error } = await supabase
        .from('user_buddy_collection')
        .select('buddy_id, tier_level, quantity')
        .eq('user_id', user.id);

      if (error) {
        // In case tier_level column isn't migrated yet in the current environment
        const fallback = await supabase
          .from('user_buddy_collection')
          .select('buddy_id, quantity')
          .eq('user_id', user.id);
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      if (error) {
        console.warn('user_buddy_collection query error:', error);
        return [];
      }
      return (data ?? []) as DbBuddyCollectionRow[];
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });

  // Combined collection map keyed by `buddyId`
  const collectionMap = useMemo<Record<string, BuddyCollectionEntry>>(() => {
    if (user && dbCollection.length > 0) {
      const map: Record<string, BuddyCollectionEntry> = {};
      for (const item of dbCollection) {
        map[item.buddy_id] = {
          tier_level: clampBuddyTierLevel(item.tier_level ?? 0),
          quantity: item.quantity ?? 1,
        };
      }
      return map;
    }
    return localMap;
  }, [user, dbCollection, localMap]);

  // 2. Upsert Mutation (set tier_level)
  const upsertMutation = useMutation({
    mutationFn: async ({
      buddyId,
      tierLevel,
    }: {
      buddyId: string;
      tierLevel: number;
    }) => {
      const cleanTier = clampBuddyTierLevel(tierLevel);

      if (!user) {
        saveLocal({
          ...localMap,
          [buddyId]: { tier_level: cleanTier, quantity: 1 },
        });
        return;
      }

      const { error } = await supabase.from('user_buddy_collection').upsert(
        {
          user_id: user.id,
          buddy_id: buddyId,
          tier_level: cleanTier,
          quantity: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,buddy_id' },
      );
      if (error) {
        // Fallback without tier_level column if DB not migrated yet
        const { error: fallbackError } = await supabase.from('user_buddy_collection').upsert(
          {
            user_id: user.id,
            buddy_id: buddyId,
            quantity: 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,buddy_id' },
        );
        if (fallbackError) throw fallbackError;
      }
    },
    onMutate: async ({ buddyId, tierLevel }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_BUDDY_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<DbBuddyCollectionRow[]>([
        USER_BUDDY_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      const cleanTier = clampBuddyTierLevel(tierLevel);
      qc.setQueryData(
        [USER_BUDDY_COLLECTION_QUERY_KEY, user.id],
        (old: DbBuddyCollectionRow[] = []) => {
          const idx = old.findIndex((item) => item.buddy_id === buddyId);
          if (idx >= 0) {
            const next = [...old];
            next[idx] = { ...next[idx], buddy_id: buddyId, tier_level: cleanTier, quantity: 1 };
            return next;
          }
          return [...old, { buddy_id: buddyId, tier_level: cleanTier, quantity: 1 }];
        },
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_BUDDY_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_BUDDY_COLLECTION_QUERY_KEY, user.id] });
    },
  });

  // 3. Remove Mutation
  const deleteMutation = useMutation({
    mutationFn: async (buddyId: string) => {
      if (!user) {
        const next = { ...localMap };
        delete next[buddyId];
        saveLocal(next);
        return;
      }

      const { error } = await supabase
        .from('user_buddy_collection')
        .delete()
        .eq('user_id', user.id)
        .eq('buddy_id', buddyId);

      if (error) throw error;
    },
    onMutate: async (buddyId) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_BUDDY_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<DbBuddyCollectionRow[]>([
        USER_BUDDY_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      qc.setQueryData(
        [USER_BUDDY_COLLECTION_QUERY_KEY, user.id],
        (old: DbBuddyCollectionRow[] = []) =>
          old.filter((item) => item.buddy_id !== buddyId),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_BUDDY_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_BUDDY_COLLECTION_QUERY_KEY, user.id] });
    },
  });

  // Helpers
  const isOwned = useCallback(
    (buddyId: string) => Boolean(collectionMap[buddyId]),
    [collectionMap],
  );

  const getTierLevel = useCallback(
    (buddyId: string) => collectionMap[buddyId]?.tier_level ?? 0,
    [collectionMap],
  );

  const setBuddyTierLevel = useCallback(
    (buddyId: string, tierLevel: number) => {
      upsertMutation.mutate({ buddyId, tierLevel });
    },
    [upsertMutation],
  );

  // Backward compatibility alias for any existing code
  const setBuddyQuantity = useCallback(
    (buddyId: string, _qty: number) => {
      upsertMutation.mutate({ buddyId, tierLevel: collectionMap[buddyId]?.tier_level ?? 0 });
    },
    [upsertMutation, collectionMap],
  );

  const toggleBuddyCollected = useCallback(
    (buddyId: string) => {
      if (collectionMap[buddyId]) {
        deleteMutation.mutate(buddyId);
      } else {
        upsertMutation.mutate({ buddyId, tierLevel: 0 });
      }
    },
    [collectionMap, upsertMutation, deleteMutation],
  );

  const removeBuddyFromCollection = useCallback(
    (buddyId: string) => {
      deleteMutation.mutate(buddyId);
    },
    [deleteMutation],
  );

  const totalCollected = useMemo(() => {
    return Object.keys(collectionMap).length;
  }, [collectionMap]);

  return {
    collectionMap,
    isLoadingCollection,
    isOwned,
    getTierLevel,
    setBuddyTierLevel,
    setBuddyQuantity,
    toggleBuddyCollected,
    toggleBuddyOwned: toggleBuddyCollected,
    removeBuddyFromCollection,
    totalCollected,
  };
}
