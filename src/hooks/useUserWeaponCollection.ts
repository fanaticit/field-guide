// ─────────────────────────────────────────────────────────────
// useUserWeaponCollection — Hook for managing hunter's crafted weapons & levels
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { DBWeapon } from '../data/schemas/weapon';

const STORAGE_KEY = 'field-guide-user-weapon-collection-v2';
const OLD_STORAGE_KEY = 'field-guide-user-weapon-collection';
export const USER_WEAPON_COLLECTION_QUERY_KEY = 'user-weapon-collection';

export interface WeaponCollectionEntry {
  rarity: number;
}

export function useUserWeaponCollection() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Local fallback storage for guests / offline: keyed by `weapon_id`
  const [localMap, setLocalMap] = useState<Record<string, WeaponCollectionEntry>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);

      // Check legacy array of IDs
      const oldStored = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldStored) {
        const ids: string[] = JSON.parse(oldStored);
        const migrated: Record<string, WeaponCollectionEntry> = {};
        for (const id of ids) {
          migrated[id] = { rarity: 1 };
        }
        return migrated;
      }
    } catch (e) {
      console.warn('Failed to parse local weapon collection', e);
    }
    return {};
  });

  const saveLocal = (next: Record<string, WeaponCollectionEntry>) => {
    setLocalMap(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save weapon collection to local storage', e);
    }
  };

  // 1. Live Supabase Query (when signed in)
  const { data: dbCollection = [], isLoading: isLoadingCollection } = useQuery({
    queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Try selecting with rarity column first
      const { data, error } = await supabase
        .from('user_weapon_collection')
        .select('weapon_id, rarity')
        .eq('user_id', user.id);

      if (error) {
        // Fall back to just weapon_id if rarity column does not exist yet
        const fallback = await supabase
          .from('user_weapon_collection')
          .select('weapon_id')
          .eq('user_id', user.id);

        if (fallback.error) {
          console.warn('user_weapon_collection query error:', fallback.error);
          return [];
        }
        return (fallback.data ?? []).map((row: { weapon_id: string }) => ({
          weapon_id: row.weapon_id,
          rarity: 1,
        }));
      }

      return (data ?? []).map((row: { weapon_id: string; rarity?: number | null }) => ({
        weapon_id: row.weapon_id,
        rarity: typeof row.rarity === 'number' && row.rarity > 0 ? row.rarity : 1,
      }));
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });

  // Combined collection map keyed by weaponId
  const collectionMap = useMemo<Record<string, WeaponCollectionEntry>>(() => {
    if (user && dbCollection.length > 0) {
      const map: Record<string, WeaponCollectionEntry> = {};
      for (const item of dbCollection) {
        // Prefer rarity from db, or fallback to localMap if db defaulted to 1 and local had higher
        const localRarity = localMap[item.weapon_id]?.rarity;
        map[item.weapon_id] = {
          rarity: item.rarity > 1 ? item.rarity : (localRarity ?? item.rarity),
        };
      }
      return map;
    }
    return localMap;
  }, [user, dbCollection, localMap]);

  // Combined set of weapon IDs
  const collectionSet = useMemo<Set<string>>(() => {
    return new Set(Object.keys(collectionMap));
  }, [collectionMap]);

  // 2. Set / Craft Mutation
  const setMutation = useMutation({
    mutationFn: async ({ weaponId, rarity }: { weaponId: string; rarity: number }) => {
      const cleanRarity = Math.max(1, Math.min(16, rarity));
      // Always update local cache
      saveLocal({
        ...localMap,
        [weaponId]: { rarity: cleanRarity },
      });

      if (!user) return;

      // Try upserting with rarity column
      const { error } = await supabase.from('user_weapon_collection').upsert(
        {
          user_id: user.id,
          weapon_id: weaponId,
          rarity: cleanRarity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,weapon_id' },
      );

      if (error) {
        // If rarity column doesn't exist yet in Supabase table, upsert without rarity
        const fallback = await supabase.from('user_weapon_collection').upsert(
          {
            user_id: user.id,
            weapon_id: weaponId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,weapon_id' },
        );
        if (fallback.error) throw fallback.error;
      }
    },
    onMutate: async ({ weaponId, rarity }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<Array<{ weapon_id: string; rarity: number }>>([
        USER_WEAPON_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      const cleanRarity = Math.max(1, Math.min(16, rarity));
      qc.setQueryData(
        [USER_WEAPON_COLLECTION_QUERY_KEY, user.id],
        (old: Array<{ weapon_id: string; rarity: number }> = []) => {
          const idx = old.findIndex((item) => item.weapon_id === weaponId);
          if (idx >= 0) {
            const next = [...old];
            next[idx] = { weapon_id: weaponId, rarity: cleanRarity };
            return next;
          }
          return [...old, { weapon_id: weaponId, rarity: cleanRarity }];
        },
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
      const next = { ...localMap };
      delete next[weaponId];
      saveLocal(next);

      if (!user) return;

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
      const previous = qc.getQueryData<Array<{ weapon_id: string; rarity: number }>>([
        USER_WEAPON_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      qc.setQueryData(
        [USER_WEAPON_COLLECTION_QUERY_KEY, user.id],
        (old: Array<{ weapon_id: string; rarity: number }> = []) =>
          old.filter((item) => item.weapon_id !== weaponId),
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
  const isCrafted = useCallback(
    (weapon: DBWeapon | string) => {
      const id = typeof weapon === 'object' ? weapon.id : weapon;
      return id in collectionMap;
    },
    [collectionMap],
  );

  const getCraftedRarity = useCallback(
    (weapon: DBWeapon | string) => {
      const id = typeof weapon === 'object' ? weapon.id : weapon;
      return collectionMap[id]?.rarity ?? null;
    },
    [collectionMap],
  );

  const setWeaponCrafted = useCallback(
    (weaponId: string, rarity: number) => {
      setMutation.mutate({ weaponId, rarity });
    },
    [setMutation],
  );

  const removeWeaponCrafted = useCallback(
    (weaponId: string) => {
      deleteMutation.mutate(weaponId);
    },
    [deleteMutation],
  );

  const toggleWeaponCrafted = useCallback(
    (weaponId: string, defaultRarity = 1) => {
      if (weaponId in collectionMap) {
        deleteMutation.mutate(weaponId);
      } else {
        setMutation.mutate({ weaponId, rarity: defaultRarity });
      }
    },
    [collectionMap, setMutation, deleteMutation],
  );

  return {
    collectionMap,
    collectionSet,
    craftedCount: Object.keys(collectionMap).length,
    isLoadingCollection,
    isCrafted,
    isCollected: isCrafted,
    getCraftedRarity,
    setWeaponCrafted,
    removeWeaponCrafted,
    toggleWeaponCrafted,
    setCollected: (weaponId: string, collected: boolean, rarity = 1) => {
      if (collected) {
        setMutation.mutate({ weaponId, rarity });
      } else {
        deleteMutation.mutate(weaponId);
      }
    },
    toggleCollected: toggleWeaponCrafted,
  };
}
