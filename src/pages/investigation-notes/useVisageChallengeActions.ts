// Add / remove / change-goal actions for visage card challenges, shared by the monster page,
// Visage Sets and the Visage Builder (used by VisageChallengeButton).
import { useMemo } from 'react';
import type { DBVisage, VisageRarity } from '../../data/schemas/visage';
import { useAuthStore } from '../../store/authStore';
import {
  useAddVisageChallenge,
  useDeleteChallenge,
  useUpdateChallengeStatus,
  challengeGoalUpdate,
  VISAGE_RARITY_INDEX,
} from '../../hooks/useHunterChallenges';
import type { ItemChallengeActions } from '../../components/challenges/SendToChallengesButton';

export interface VisageChallengeItem {
  card: DBVisage;
  ink: string;
  currentRarity?: VisageRarity | null;
}

export type VisageChallengeActions = ItemChallengeActions<VisageChallengeItem>;

/** Everything a page needs to give its visage cards the standard challenge button. */
export function useVisageChallengeActions(onRequireLogin: () => void): VisageChallengeActions {
  const user = useAuthStore((s) => s.user);
  const add = useAddVisageChallenge();
  const del = useDeleteChallenge();
  const update = useUpdateChallengeStatus();
  return useMemo<VisageChallengeActions>(() => ({
    userId: user?.id,
    onRequireLogin,
    onAdd: async ({ card, ink, currentRarity }, goal) => {
      if (!user) return null;
      const res = await add.mutateAsync({
        userId: user.id,
        game: 'mho',
        visageId: card.id,
        visageName: card.name,
        inkType: (ink || 'flames').toLowerCase(),
        monsterId: card.monster_id ?? null,
        monsterName: card.name,
        pieceImage: card.monster_icon ?? null,
        setIcon: card.monster_icon ?? null,
        currentRarity: currentRarity ? VISAGE_RARITY_INDEX[currentRarity] ?? 0 : 0,
        craftRarity: 1, // Fine
        maxRarity: goal ?? 4, // Superior unless a lower goal was picked
      });
      return res.challenge;
    },
    onRemove: (c) => del.mutateAsync(c.id),
    onChangeGoal: (c, goal) => update.mutateAsync(challengeGoalUpdate(c, goal)),
  }), [user, add, del, update, onRequireLogin]);
}
