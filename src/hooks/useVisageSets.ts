// ─────────────────────────────────────────────────────────────
// useVisageSets — Pure Supabase-driven hook for MHO Visage Sets
// Manages grouping by sets and user collection tracking (rarity & quantity)
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useAdminVisages } from './useAdminVisages';
import { useAdminSkills, type SetBonusTier, type DBSkill } from './useAdminSkills';
import {
  type DBVisage,
  type VisageRarity,
  getInkConfig,
} from '../data/schemas/visage';

const STORAGE_KEY = 'mho_visage_user_collection_v2';
export const USER_COLLECTION_QUERY_KEY = 'user-visage-collection';

export interface CardCollectionEntry {
  rarity: VisageRarity;
  quantity: number; // 1 to 5 (5 = 5+)
}

export interface GroupedPointsColumn {
  points: number;
  cards: DBVisage[];
  collectedCount: number;
  totalCount: number;
}

export interface VisageSet {
  id: string;
  name: string;
  shortName: string;
  iconName: string;
  setBonusSkill: string;
  thresholds: SetBonusTier[];
  cards: DBVisage[];
  groupedColumns: GroupedPointsColumn[];
  totalCards: number;
  collectedCards: number;
}

export function useUserVisageCollection() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Local fallback storage for non-authenticated / offline state: key is `${visageId}:${inkType}`
  const [localMap, setLocalMap] = useState<Record<string, CardCollectionEntry>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse local visage collection', e);
    }
    return {};
  });

  // Sync to local storage
  const saveLocal = (next: Record<string, CardCollectionEntry>) => {
    setLocalMap(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save to local storage', e);
    }
  };

  // 1. Live Supabase Query (when signed in)
  const { data: dbCollection = [], isLoading: isLoadingCollection } = useQuery({
    queryKey: [USER_COLLECTION_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_visage_collection')
        .select('*')
        .eq('user_id', user.id);
      if (error) {
        console.warn('user_visage_collection query error:', error);
        return [];
      }
      return (data ?? []) as Array<{
        visage_id: string;
        ink_type: string;
        rarity: VisageRarity;
        quantity: number;
      }>;
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });

  // Combined collection map keyed by `${visageId}:${inkType}`
  const collectionMap = useMemo<Record<string, CardCollectionEntry>>(() => {
    if (user && dbCollection.length > 0) {
      const map: Record<string, CardCollectionEntry> = {};
      for (const item of dbCollection) {
        const ink = item.ink_type || 'flames';
        const key = `${item.visage_id}:${ink.toLowerCase()}`;
        map[key] = {
          rarity: item.rarity,
          quantity: Math.min(5, Math.max(1, item.quantity || 1)),
        };
      }
      return map;
    }
    return localMap;
  }, [user, dbCollection, localMap]);

  // 2. Mutations
  const upsertMutation = useMutation({
    mutationFn: async ({
      visageId,
      inkType,
      rarity,
      quantity,
    }: {
      visageId: string;
      inkType: string;
      rarity: VisageRarity;
      quantity: number;
    }) => {
      const normInk = inkType.toLowerCase();
      const cleanQty = Math.min(5, Math.max(1, quantity));
      const key = `${visageId}:${normInk}`;

      if (!user) {
        saveLocal({
          ...localMap,
          [key]: { rarity, quantity: cleanQty },
        });
        return;
      }

      const { error } = await supabase.from('user_visage_collection').upsert(
        {
          user_id: user.id,
          visage_id: visageId,
          ink_type: normInk,
          rarity,
          quantity: cleanQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,visage_id,ink_type' },
      );
      if (error) throw error;
    },
    onMutate: async ({ visageId, inkType, rarity, quantity }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<Array<{ visage_id: string; ink_type: string; rarity: VisageRarity; quantity: number }>>([
        USER_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      const normInk = inkType.toLowerCase();
      const cleanQty = Math.min(5, Math.max(1, quantity));
      qc.setQueryData(
        [USER_COLLECTION_QUERY_KEY, user.id],
        (old: Array<{ visage_id: string; ink_type: string; rarity: VisageRarity; quantity: number }> = []) => {
          const idx = old.findIndex((item) => item.visage_id === visageId && (item.ink_type || '').toLowerCase() === normInk);
          if (idx >= 0) {
            const next = [...old];
            next[idx] = { visage_id: visageId, ink_type: normInk, rarity, quantity: cleanQty };
            return next;
          }
          return [...old, { visage_id: visageId, ink_type: normInk, rarity, quantity: cleanQty }];
        },
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_COLLECTION_QUERY_KEY, user.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ visageId, inkType }: { visageId: string; inkType: string }) => {
      const normInk = inkType.toLowerCase();
      const key = `${visageId}:${normInk}`;

      if (!user) {
        const next = { ...localMap };
        delete next[key];
        saveLocal(next);
        return;
      }

      const { error } = await supabase
        .from('user_visage_collection')
        .delete()
        .eq('user_id', user.id)
        .eq('visage_id', visageId)
        .eq('ink_type', normInk);
      if (error) throw error;
    },
    onMutate: async ({ visageId, inkType }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: [USER_COLLECTION_QUERY_KEY, user.id] });
      const previous = qc.getQueryData<Array<{ visage_id: string; ink_type: string; rarity: VisageRarity; quantity: number }>>([
        USER_COLLECTION_QUERY_KEY,
        user.id,
      ]);

      const normInk = inkType.toLowerCase();
      qc.setQueryData(
        [USER_COLLECTION_QUERY_KEY, user.id],
        (old: Array<{ visage_id: string; ink_type: string; rarity: VisageRarity; quantity: number }> = []) =>
          old.filter((item) => !(item.visage_id === visageId && (item.ink_type || '').toLowerCase() === normInk)),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (user && context?.previous) {
        qc.setQueryData([USER_COLLECTION_QUERY_KEY, user.id], context.previous);
      }
    },
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: [USER_COLLECTION_QUERY_KEY, user.id] });
    },
  });

  // Helper APIs for components
  const getCardCollection = (cardId: string, inkType: string): CardCollectionEntry | null => {
    const key = `${cardId}:${(inkType || 'flames').toLowerCase()}`;
    return collectionMap[key] || null;
  };

  const isCollected = (cardId: string, inkType: string): boolean => {
    const key = `${cardId}:${(inkType || 'flames').toLowerCase()}`;
    return Boolean(collectionMap[key]);
  };

  const setCardRarity = (cardId: string, inkType: string, rarity: VisageRarity, defaultQuantity = 1) => {
    const key = `${cardId}:${(inkType || 'flames').toLowerCase()}`;
    const existing = collectionMap[key];
    const qty = existing && existing.rarity === rarity ? existing.quantity : defaultQuantity;
    upsertMutation.mutate({ visageId: cardId, inkType, rarity, quantity: qty });
  };

  const setCardQuantity = (cardId: string, inkType: string, quantity: number) => {
    const key = `${cardId}:${(inkType || 'flames').toLowerCase()}`;
    const existing = collectionMap[key];
    const rarity: VisageRarity = existing?.rarity || 'superior';
    upsertMutation.mutate({ visageId: cardId, inkType, rarity, quantity });
  };

  const removeCardFromCollection = (cardId: string, inkType: string) => {
    deleteMutation.mutate({ visageId: cardId, inkType });
  };

  return {
    collectionMap,
    isLoadingCollection,
    getCardCollection,
    isCollected,
    setCardRarity,
    setCardQuantity,
    removeCardFromCollection,
  };
}

export function useVisageSetsData() {
  const { data: dbVisages = [], isLoading: isLoadingVisages, refetch: refetchVisages } = useAdminVisages({ isActive: true });
  const { data: dbSkills = [], isLoading: isLoadingSkills, refetch: refetchSkills } = useAdminSkills({ isSetBonus: true, isActive: true });
  const collection = useUserVisageCollection();

  const sets: VisageSet[] = useMemo(() => {
    // 1. Build lookup map of Set Bonus Skills by id and name
    const skillMap = new Map<string, DBSkill>();
    for (const skill of dbSkills) {
      skillMap.set(skill.id.toLowerCase(), skill);
      skillMap.set(skill.name.toLowerCase(), skill);
    }

    // 2. Group active DB Visages by their attached set(s)
    const setCardsMap = new Map<string, {
      setId: string;
      setName: string;
      shortName: string;
      iconName: string;
      skill: DBSkill | null;
      cardsMap: Map<string, DBVisage>;
    }>();

    function addCardToSet(setIdRaw: string, card: DBVisage) {
      const normId = setIdRaw.toLowerCase().replace(/^ink_of_/, '');
      const fullSkillId = `ink_of_${normId}`;
      const inkCfg = getInkConfig(normId);

      const matchedSkill =
        skillMap.get(fullSkillId) ||
        skillMap.get(setIdRaw.toLowerCase()) ||
        skillMap.get(normId) ||
        skillMap.get(inkCfg.name.toLowerCase()) ||
        null;

      const setName = matchedSkill?.name || inkCfg.name;
      const shortName = inkCfg.shortName || setName.replace(/^Ink of /, '');
      const iconName = inkCfg.iconName || 'sparkles';
      const effectiveSetId = normId;

      let setGroup = setCardsMap.get(effectiveSetId);
      if (!setGroup) {
        setGroup = {
          setId: effectiveSetId,
          setName,
          shortName,
          iconName,
          skill: matchedSkill,
          cardsMap: new Map<string, DBVisage>(),
        };
        setCardsMap.set(effectiveSetId, setGroup);
      }

      setGroup.cardsMap.set(card.id, card);
    }

    for (const visage of dbVisages) {
      let linkedAnySet = false;

      if (Array.isArray(visage.ink_types) && visage.ink_types.length > 0) {
        for (const ink of visage.ink_types) {
          const normInk = ink === 'fire' ? 'flames' : ink;
          addCardToSet(normInk, visage);
          linkedAnySet = true;
        }
      }

      if (!linkedAnySet) {
        addCardToSet('general', visage);
      }
    }

    // 3. Build the VisageSet list ONLY for sets that have at least 1 attached card
    const result: VisageSet[] = [];

    for (const [setId, group] of setCardsMap.entries()) {
      const cards = Array.from(group.cardsMap.values());
      if (cards.length === 0) continue; // Only include sets with attached visages!

      let thresholds: SetBonusTier[] = [];
      if (group.skill && group.skill.set_thresholds && group.skill.set_thresholds.length > 0) {
        thresholds = group.skill.set_thresholds;
      } else {
        thresholds = [
          { pieces: 2, description: `${group.shortName} Affinity & Potency +5%` },
          { pieces: 4, description: `After continuous attacks, ${group.shortName.toLowerCase()} damage +24% for 20s.` },
        ];
      }

      // Group cards into columns by points (descending: 4, 3, 2, 1)
      const pointsMap = new Map<number, DBVisage[]>();
      for (const card of cards) {
        const pts = card.points || 1;
        const list = pointsMap.get(pts) || [];
        list.push(card);
        pointsMap.set(pts, list);
      }

      const sortedPoints = Array.from(pointsMap.keys()).sort((a, b) => b - a);

      const groupedColumns: GroupedPointsColumn[] = sortedPoints.map((pts) => {
        const colCards = pointsMap.get(pts) || [];
        const collectedCount = colCards.filter((c) => collection.isCollected(c.id, setId)).length;
        return {
          points: pts,
          cards: colCards,
          collectedCount,
          totalCount: colCards.length,
        };
      });

      const totalCards = cards.length;
      const collectedCards = cards.filter((c) => collection.isCollected(c.id, setId)).length;

      result.push({
        id: setId,
        name: group.setName,
        shortName: group.shortName,
        iconName: group.iconName,
        setBonusSkill: group.skill?.name || group.setName,
        thresholds,
        cards,
        groupedColumns,
        totalCards,
        collectedCards,
      });
    }

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [dbVisages, dbSkills, collection]);

  return {
    sets,
    dbVisages,
    isLoading: isLoadingVisages || isLoadingSkills || collection.isLoadingCollection,
    refetch: () => {
      refetchVisages();
      refetchSkills();
    },
    ...collection,
  };
}
