// ─────────────────────────────────────────────────────────────
// useUserBuddyCollection — Hook for managing hunter's owned Buddies & quantities
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { BuddyCollectionEntry } from '../data/schemas/buddy';

const STORAGE_KEY = 'field-guide-user-buddy-collection';
const USER_BUDDY_COLLECTION_QUERY_KEY = 'user-buddy-collection';

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
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_buddy_collection')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.warn('user_buddy_collection query error:', error);
        return [];
      }
      return (data ?? []) as Array<{
        buddy_id: string;
        quantity: number;
      }>;
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
          quantity: Math.min(5, Math.max(1, item.quantity || 1)),
        };
      }
      return map;
    }
    return localMap;
  }, [user, dbCollection, localMap]);

  // 2. Upsert Mutation (set quantity)
  const upsertMutation = useMutation({
    mutationFn: async ({
      buddyId,
      quantity,
    }: {
      buddyId: string;
      quantity: number;
    }) => {
      const cleanQty = Math.min(5, Math.max(1, quantity));

      if (!user) {
        saveLocal({
          ...localMap,
          [buddyId]: { quantity: cleanQty },
        });
        return;
      }

      const { error } = await supabase.from('user_buddy_collection').upsert(
        {
          user_id: user.id,
          buddy_id: buddyId,
          quantity: cleanQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,buddy_id' },
      );
      if (error) throw error;
    },
    onMutate: async ({ buddyId, quantity }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_BUDDY_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<Array<{ buddy_id: string; quantity: number }>>([
        USER_BUDDY_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      const cleanQty = Math.min(5, Math.max(1, quantity));
      qc.setQueryData(
        [USER_BUDDY_COLLECTION_QUERY_KEY, user.id],
        (old: Array<{ buddy_id: string; quantity: number }> = []) => {
          const idx = old.findIndex((item) => item.buddy_id === buddyId);
          if (idx >= 0) {
            const next = [...old];
            next[idx] = { buddy_id: buddyId, quantity: cleanQty };
            return next;
          }
          return [...old, { buddy_id: buddyId, quantity: cleanQty }];
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
      const previous = qc.getQueryData<Array<{ buddy_id: string; quantity: number }>>([
        USER_BUDDY_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      qc.setQueryData(
        [USER_BUDDY_COLLECTION_QUERY_KEY, user.id],
        (old: Array<{ buddy_id: string; quantity: number }> = []) =>
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

  const getQuantity = useCallback(
    (buddyId: string) => collectionMap[buddyId]?.quantity ?? 0,
    [collectionMap],
  );

  const setBuddyQuantity = useCallback(
    (buddyId: string, quantity: number) => {
      if (quantity <= 0) {
        deleteMutation.mutate(buddyId);
      } else {
        upsertMutation.mutate({ buddyId, quantity });
      }
    },
    [upsertMutation, deleteMutation],
  );

  const toggleBuddyOwned = useCallback(
    (buddyId: string) => {
      if (collectionMap[buddyId]) {
        deleteMutation.mutate(buddyId);
      } else {
        upsertMutation.mutate({ buddyId, quantity: 1 });
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
    getQuantity,
    setBuddyQuantity,
    toggleBuddyOwned,
    removeBuddyFromCollection,
    totalCollected,
  };
}
