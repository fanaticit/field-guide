// Adventurer "Send to Challenges" — the standard pop-up with the goal choice:
// recruit, or reach an insight level. Goal values are the challenge's max_rarity (insight level).
import { ADVENTURER_INSIGHT_LEVELS, adventurerInsightLabel, type DBAdventurer } from '../../data/schemas/adventurer';
import { isChallengeOpen, type HunterChallenge } from '../../hooks/useHunterChallenges';
import { SendToChallengesButton, type ChallengeGoalOption } from '../../components/challenges/SendToChallengesButton';

export interface AdventurerChallengeActions {
  userId: string | null | undefined;
  onAdd: (adventurer: DBAdventurer, targetInsight: number) => Promise<HunterChallenge | null | undefined>;
  onRemove: (challenge: HunterChallenge) => Promise<unknown>;
  onChangeGoal: (challenge: HunterChallenge, targetInsight: number) => Promise<unknown>;
  onRequireLogin: () => void;
}

/** Goals still ahead: recruit (when not recruited) and each higher insight level. */
function insightGoals(currentLevel: number): ChallengeGoalOption[] {
  return ADVENTURER_INSIGHT_LEVELS
    .filter((lvl) => lvl > Math.max(1, currentLevel) || (lvl === 1 && currentLevel === 0))
    .map((lvl) => (lvl === 1
      ? { value: 1, label: 'Recruit', badge: 'Lv 1' }
      : { value: lvl, label: adventurerInsightLabel(lvl), badge: 'Insight' }));
}

export function AdventurerChallengeButton({
  adventurer,
  currentLevel,
  challenge,
  actions,
  className,
}: {
  adventurer: DBAdventurer;
  /** 0 = not recruited, else the insight level */
  currentLevel: number;
  challenge?: HunterChallenge;
  actions: AdventurerChallengeActions;
  className?: string;
}) {
  const active = isChallengeOpen(challenge) ? challenge : null;
  const goals = insightGoals(currentLevel);
  if (!active && goals.length === 0) return null;
  return (
    <SendToChallengesButton
      userId={actions.userId}
      challenge={active}
      itemName={adventurer.name}
      goals={goals}
      onAdd={(goal) => actions.onAdd(adventurer, goal ?? goals[0]?.value ?? 1)}
      onRemove={active ? () => actions.onRemove(active) : undefined}
      onChangeGoal={active && goals.length > 1 ? (goal) => actions.onChangeGoal(active, goal) : undefined}
      onRequireLogin={actions.onRequireLogin}
      label="Challenge"
      trackedLabel="In Challenges"
      className={className}
    />
  );
}
