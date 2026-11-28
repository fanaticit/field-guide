// Buddy "Send to Challenges" — the standard pop-up with the buddy's goal choice:
// recruit, reach Tier 1, or reach Tier 2 (Max). Goal values are the challenge's max_rarity
// (1 = recruited / Tier 0, 2 = Tier 1, 3 = Tier 2).
import type { DBBuddy } from '../../data/schemas/buddy';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import { SendToChallengesButton, type ChallengeGoalOption } from '../../components/challenges/SendToChallengesButton';

export interface BuddyChallengeActions {
  userId: string | null | undefined;
  onAdd: (buddy: DBBuddy, goal: number) => Promise<HunterChallenge | null | undefined>;
  onRemove: (challenge: HunterChallenge) => Promise<unknown>;
  onChangeGoal: (challenge: HunterChallenge, goal: number) => Promise<unknown>;
  onRequireLogin: () => void;
}

/** Goals still ahead of the buddy's tier level (-1 = not recruited, 0-2 = Tier 0-2). */
function buddyGoalOptions(currentLevel: number): ChallengeGoalOption[] {
  const goals: ChallengeGoalOption[] = [];
  if (currentLevel < 0) goals.push({ value: 1, label: 'Recruit', badge: 'Tier 0' });
  if (currentLevel < 1) goals.push({ value: 2, label: 'Tier 1', badge: 'Upgrade' });
  if (currentLevel < 2) goals.push({ value: 3, label: 'Tier 2', badge: 'Max' });
  return goals;
}

export function BuddyChallengeButton({
  buddy,
  currentLevel,
  challenge,
  actions,
  className,
}: {
  buddy: DBBuddy;
  /** -1 = not recruited, 0-2 = Tier 0-2 */
  currentLevel: number;
  challenge?: HunterChallenge;
  actions: BuddyChallengeActions;
  className?: string;
}) {
  // A finished or dropped challenge can be set up again with a new goal
  const active = challenge && (challenge.status === 'crafting' || challenge.status === 'upgrading') ? challenge : null;
  const goals = buddyGoalOptions(currentLevel);
  if (!active && goals.length === 0) return null;
  return (
    <SendToChallengesButton
      userId={actions.userId}
      challenge={active}
      itemName={buddy.name}
      goals={goals}
      onAdd={(goal) => actions.onAdd(buddy, goal ?? goals[0]?.value ?? 1)}
      onRemove={active ? () => actions.onRemove(active) : undefined}
      onChangeGoal={active && goals.length > 1 ? (goal) => actions.onChangeGoal(active, goal) : undefined}
      onRequireLogin={actions.onRequireLogin}
      label="Challenge"
      trackedLabel="In Challenges"
      className={className}
    />
  );
}
