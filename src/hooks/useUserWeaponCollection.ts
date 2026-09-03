// ─────────────────────────────────────────────────────────────
// useUserWeaponCollection — Hook for managing hunter's collected weapons
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { DBWeapon } from '../data/schemas/weapon';

const STORAGE_KEY = 'field-guide-user-weapon-collection';
const USER_WEAPON_COLLECTION_QUERY_KEY = 'user-weapon-collection';

export function useUserWeaponCollection() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Local fallback storage for guests / offline: Set of collected weapon IDs
  const [localSet, setLocalSet] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {
      console.warn('Failed to parse local weapon collection', e);
    }
    return new Set<string>();
  });

  const saveLocal = (next: Set<string>) => {
    setLocalSet(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch (e) {
      console.warn('Failed to save weapon collection to local storage', e);
    }
  };

  // 1. Live Supabase Query (when signed in)
  const { data: dbCollection = [], isLoading: isLoadingCollection } = useQuery({
    queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_weapon_collection')
        .select('weapon_id')
        .eq('user_id', user.id);

      if (error) {
        console.warn('user_weapon_collection query error:', error);
        return [];
      }
      return (data ?? []).map((row: { weapon_id: string }) => row.weapon_id);
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
    mutationFn: async (weaponId: string) => {
      if (!user) {
        const next = new Set(localSet);
        next.add(weaponId);
        saveLocal(next);
        return;
      }

      const { error } = await supabase.from('user_weapon_collection').upsert(
        {
          user_id: user.id,
          weapon_id: weaponId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,weapon_id' },
      );
      if (error) throw error;
    },
    onMutate: async (weaponId) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<string[]>([
        USER_WEAPON_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      qc.setQueryData(
        [USER_WEAPON_COLLECTION_QUERY_KEY, user.id],
        (old: string[] = []) => (old.includes(weaponId) ? old : [...old, weaponId]),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_WEAPON_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY, user.id] });
    },
  });

  // 3. Remove Mutation
  const deleteMutation = useMutation({
    mutationFn: async (weaponId: string) => {
      if (!user) {
        const next = new Set(localSet);
        next.delete(weaponId);
        saveLocal(next);
        return;
      }

      const { error } = await supabase
        .from('user_weapon_collection')
        .delete()
        .eq('user_id', user.id)
        .eq('weapon_id', weaponId);

      if (error) throw error;
    },
    onMutate: async (weaponId) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<string[]>([
        USER_WEAPON_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      qc.setQueryData(
        [USER_WEAPON_COLLECTION_QUERY_KEY, user.id],
        (old: string[] = []) => old.filter((id) => id !== weaponId),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_WEAPON_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY, user.id] });
    },
  });

  // Helpers
  const isCollected = useCallback(
    (weapon: DBWeapon | string) => {
      const id = typeof weapon === 'object' ? weapon.id : weapon;
      return collectionSet.has(id);
    },
    [collectionSet],
  );

  const toggleCollected = useCallback(
    (weaponId: string) => {
      if (collectionSet.has(weaponId)) {
        deleteMutation.mutate(weaponId);
      } else {
        addMutation.mutate(weaponId);
      }
    },
    [collectionSet, addMutation, deleteMutation],
  );

  const setCollected = useCallback(
    (weaponId: string, collected: boolean) => {
      if (collected) {
        addMutation.mutate(weaponId);
      } else {
        deleteMutation.mutate(weaponId);
      }
    },
    [addMutation, deleteMutation],
  );

  return {
    collectionSet,
    isLoadingCollection,
    isCollected,
    toggleCollected,
    setCollected,
  };
}
