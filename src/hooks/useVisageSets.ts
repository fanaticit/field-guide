// ─────────────────────────────────────────────────────────────
// useVisageSets — Pure Supabase-driven hook for MHO Visage Sets
// Only loads and displays sets that are attached to Visage cards
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useAdminVisages } from './useAdminVisages';
import { useAdminSkills, type SetBonusTier, type DBSkill } from './useAdminSkills';
import {
  type DBVisage,
  getInkConfig,
} from '../data/schemas/visage';

const STORAGE_KEY = 'mho_visage_album_collected_v1';

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

export function useVisageCollection() {
  const [collectedMap, setCollectedMap] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse visage collection from storage', e);
    }
    return {};
  });

  const toggleCollected = (cardId: string) => {
    setCollectedMap((prev) => {
      const next = { ...prev, [cardId]: !prev[cardId] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save visage collection', e);
      }
      return next;
    });
  };

  const isCollected = (cardId: string) => Boolean(collectedMap[cardId]);

  return { collectedMap, toggleCollected, isCollected };
}

export function useVisageSetsData() {
  const { data: dbVisages = [], isLoading: isLoadingVisages, refetch: refetchVisages } = useAdminVisages({ isActive: true });
  const { data: dbSkills = [], isLoading: isLoadingSkills, refetch: refetchSkills } = useAdminSkills({ isSetBonus: true, isActive: true });
  const { collectedMap, toggleCollected, isCollected } = useVisageCollection();

  const sets: VisageSet[] = useMemo(() => {
    // 1. Build lookup map of Set Bonus Skills by id and name
    const skillMap = new Map<string, DBSkill>();
    for (const skill of dbSkills) {
      skillMap.set(skill.id.toLowerCase(), skill);
      skillMap.set(skill.name.toLowerCase(), skill);
    }

    // 2. Group active DB Visages by their attached set(s)
    // A card belongs to a set if:
    //  - card.set_bonus_id matches the skill ID, OR
    //  - card.ink_types contains an ink that matches the skill/ink set
    const setCardsMap = new Map<string, {
      setId: string;
      setName: string;
      shortName: string;
      iconName: string;
      skill: DBSkill | null;
      cardsMap: Map<string, DBVisage>;
    }>();

    // Helper to register a card under a set
    function addCardToSet(setIdRaw: string, card: DBVisage) {
      const normId = setIdRaw.toLowerCase().replace(/^ink_of_/, '');
      const fullSkillId = `ink_of_${normId}`;
      const inkCfg = getInkConfig(normId);

      // Find matching skill from public.skills if available
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

    // Iterate over each active visage from Supabase
    for (const visage of dbVisages) {
      let linkedAnySet = false;

      // Check linked set_bonus_id from public.skills
      if (visage.set_bonus_id) {
        addCardToSet(visage.set_bonus_id, visage);
        linkedAnySet = true;
      }

      // Check ink_types on the card
      if (Array.isArray(visage.ink_types) && visage.ink_types.length > 0) {
        for (const ink of visage.ink_types) {
          const normInk = ink === 'fire' ? 'flames' : ink;
          addCardToSet(normInk, visage);
          linkedAnySet = true;
        }
      }

      // If a card has no ink_types or set_bonus_id set, we can link to 'general' or skip
      if (!linkedAnySet) {
        addCardToSet('general', visage);
      }
    }

    // 3. Build the VisageSet list ONLY for sets that have at least 1 attached card
    const result: VisageSet[] = [];

    for (const [setId, group] of setCardsMap.entries()) {
      const cards = Array.from(group.cardsMap.values());
      if (cards.length === 0) continue; // Only include sets with attached visages!

      // Determine skill thresholds from Supabase skill or fallback
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
        const collectedCount = colCards.filter((c) => collectedMap[c.id]).length;
        return {
          points: pts,
          cards: colCards,
          collectedCount,
          totalCount: colCards.length,
        };
      });

      const totalCards = cards.length;
      const collectedCards = cards.filter((c) => collectedMap[c.id]).length;

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

    // Sort sets alphabetically by name or by card count
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [dbVisages, dbSkills, collectedMap]);

  return {
    sets,
    dbVisages,
    isLoading: isLoadingVisages || isLoadingSkills,
    refetch: () => {
      refetchVisages();
      refetchSkills();
    },
    collectedMap,
    toggleCollected,
    isCollected,
  };
}
