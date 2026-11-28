// Visage card "Send to Challenges" — the standard pop-up with the card search goal:
// Fine, Rare, Epic or Superior (challenge max_rarity 1-4). Shared by the monster page,
// Visage Sets and the Visage Builder.
import type { DBVisage, VisageRarity } from '../../data/schemas/visage';
import type { VisageChallengeActions } from './useVisageChallengeActions';
import { isChallengeOpen, VISAGE_RARITY_INDEX, type HunterChallenge } from '../../hooks/useHunterChallenges';
import {
  SendToChallengesButton,
  type ChallengeGoalOption,
} from '../../components/challenges/SendToChallengesButton';

const GOALS: ChallengeGoalOption[] = [
  { value: 1, label: 'Fine', badge: 'Green' },
  { value: 2, label: 'Rare', badge: 'Blue' },
  { value: 3, label: 'Epic', badge: 'Purple' },
  { value: 4, label: 'Superior', badge: 'Gold' },
];

export function VisageChallengeButton({
  card,
  ink,
  currentRarity,
  challenge,
  actions,
  className,
  label = 'Search Challenge',
}: {
  card: DBVisage;
  ink: string;
  currentRarity?: VisageRarity | null;
  challenge?: HunterChallenge | null;
  actions: VisageChallengeActions;
  className?: string;
  label?: string;
}) {
  const active = isChallengeOpen(challenge) ? challenge : null;
  const owned = currentRarity ? VISAGE_RARITY_INDEX[currentRarity] ?? 0 : 0;
  const goals = GOALS.filter((g) => g.value > owned);
  if (!active && goals.length === 0) return null;
  return (
    <SendToChallengesButton
      userId={actions.userId}
      challenge={active}
      itemName={`${card.name} · ${ink.charAt(0).toUpperCase()}${ink.slice(1)}`}
      goals={goals}
      defaultGoal={4}
      onAdd={(goal) => actions.onAdd({ card, ink, currentRarity }, goal)}
      onRemove={active ? () => actions.onRemove(active) : undefined}
      onChangeGoal={active && actions.onChangeGoal && goals.length > 1 ? (goal) => actions.onChangeGoal!(active, goal) : undefined}
      onRequireLogin={actions.onRequireLogin}
      label={label}
      trackedLabel="Searching"
      className={className}
    />
  );
}
