// ─────────────────────────────────────────────────────────────
// useInvestigationJourney — the in-game Investigation Journey: the monsters it
// unlocks in order and what each step needs (investigation_journey_steps,
// imported from import/MHO_monster_investigation_journey.json).
//
// Each step needs: the server open for N days, N Investigation Notes studies of
// any monster, and N studies of one specific monster (usually the previous one).
// ─────────────────────────────────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface JourneyRequirement {
  kind: 'Server age' | 'Total studies' | 'Monster studies' | string;
  value: number;
  monster?: string;
  monster_note_id?: number;
  text: string;
}

export interface JourneyReward {
  item_id?: number;
  item: string;
  count: number;
}

export interface JourneyStep {
  id: string;
  journey: number;
  step: number;
  sort_order: number;
  unlocks_name: string;
  unlocks_monster_id: string | null;
  is_grand_prize: boolean;
  server_day: number | null;
  total_studies: number | null;
  monster_studies: number | null;
  studies_monster_name: string | null;
  studies_monster_id: string | null;
  requirements: JourneyRequirement[];
  what_unlocking_does: string | null;
  unlocked_message: string | null;
  rewards: JourneyReward[];
}

export const INVESTIGATION_JOURNEY_KEY = 'investigation-journey';

export function useInvestigationJourney() {
  return useQuery({
    queryKey: [INVESTIGATION_JOURNEY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investigation_journey_steps')
        .select('*')
        .order('journey', { ascending: true })
        .order('step', { ascending: true });
      if (error) {
        // Not imported yet — the page works without the journey
        console.warn('investigation_journey_steps unavailable:', error.message);
        return [] as JourneyStep[];
      }
      return ((data ?? []) as JourneyStep[]).map((s) => ({
        ...s,
        requirements: Array.isArray(s.requirements) ? s.requirements : [],
        rewards: Array.isArray(s.rewards) ? s.rewards : [],
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}

// ── Study counts ─────────────────────────────────────────────

/** The parts of a study record that count as Investigation Notes studies. */
export interface StudyCountSource {
  photo_taken: boolean;
  witnessed_behavior: boolean;
  hunted_10_plus: boolean;
  miniature_crown: boolean;
  giant_crown: boolean;
  custom_tasks: { completed: boolean }[];
  free_hunt_studies?: number;
}

/**
 * Investigation Notes studies logged for one monster: each finished field study task
 * (photo, behaviour, hunted 10+, crowns, custom goals) plus the Free Hunt Study count.
 * "Unlocked" and "Finished" are states, not studies, so they don't count.
 */
export function monsterStudyCount(s: StudyCountSource | undefined | null): number {
  if (!s) return 0;
  let c = 0;
  if (s.photo_taken) c++;
  if (s.witnessed_behavior) c++;
  if (s.hunted_10_plus) c++;
  if (s.miniature_crown) c++;
  if (s.giant_crown) c++;
  c += s.custom_tasks.filter((t) => t.completed).length;
  c += Math.max(0, s.free_hunt_studies ?? 0);
  return c;
}

export function totalStudyCount(map: Record<string, StudyCountSource>): number {
  return Object.values(map).reduce((sum, s) => sum + monsterStudyCount(s), 0);
}

// ── Lookups ──────────────────────────────────────────────────

/** The step that unlocks this monster, if it is part of the journey. */
export function stepUnlocking(steps: JourneyStep[], monsterId: string): JourneyStep | undefined {
  return steps.find((s) => !s.is_grand_prize && s.unlocks_monster_id === monsterId);
}

/** Steps that need studies of this monster (it then shows a Free Hunt Study counter). */
export function stepsNeedingStudiesOf(steps: JourneyStep[], monsterId: string): JourneyStep[] {
  return steps.filter((s) => s.studies_monster_id === monsterId && (s.monster_studies ?? 0) > 0);
}

/**
 * Monsters whose "Unlocked" should be ticked: the step's required monster has enough
 * studies logged and the monster it unlocks isn't ticked yet.
 */
export function monstersToAutoUnlock(
  steps: JourneyStep[],
  studyOf: (monsterId: string) => (StudyCountSource & { unlocked: boolean }) | undefined,
): string[] {
  const out: string[] = [];
  for (const s of steps) {
    if (s.is_grand_prize || !s.unlocks_monster_id || !s.studies_monster_id || !s.monster_studies) continue;
    if (monsterStudyCount(studyOf(s.studies_monster_id)) < s.monster_studies) continue;
    if (studyOf(s.unlocks_monster_id)?.unlocked) continue;
    if (!out.includes(s.unlocks_monster_id)) out.push(s.unlocks_monster_id);
  }
  return out;
}

// ── Journey path for the overlay ─────────────────────────────

export type JourneyNodeState =
  /** Unlocked */
  | 'unlocked'
  /** The last monster unlocked so far — the next unlock still needs work (glows a little less) */
  | 'current'
  /** The next monster to unlock (shown only with spoilers on) */
  | 'next'
  /** Further along the journey (shown only with spoilers on) */
  | 'locked';

export interface JourneyNode {
  monsterId: string;
  name: string;
  journey: number;
  /** The step that unlocks this monster (none for a journey's starting monster) */
  step: JourneyStep | null;
  state: JourneyNodeState;
}

/**
 * The journey as an ordered path of monsters. A journey starts with the monster whose
 * studies its first step needs (e.g. Pink Rathian), then each monster it unlocks.
 */
export function buildJourneyPath(
  steps: JourneyStep[],
  studyOf: (monsterId: string) => (StudyCountSource & { unlocked: boolean }) | undefined,
): JourneyNode[] {
  const ordered = [...steps].sort((a, b) => a.journey - b.journey || a.step - b.step);
  const nodes: Omit<JourneyNode, 'state'>[] = [];
  for (const s of ordered) {
    if (s.step === 1 && s.studies_monster_id && !nodes.some((n) => n.monsterId === s.studies_monster_id)) {
      nodes.push({ monsterId: s.studies_monster_id, name: s.studies_monster_name ?? '', journey: s.journey, step: null });
    }
    if (!s.is_grand_prize && s.unlocks_monster_id && !nodes.some((n) => n.monsterId === s.unlocks_monster_id)) {
      nodes.push({ monsterId: s.unlocks_monster_id, name: s.unlocks_name, journey: s.journey, step: s });
    }
  }

  // The last unlocked monster glows a little less while there is still a monster to unlock
  // after it; the first locked monster after it is "next".
  const unlocked = nodes.map((n) => Boolean(studyOf(n.monsterId)?.unlocked));
  const last = unlocked.lastIndexOf(true);
  // At the end of the path, the monster still glows less until its grand-prize studies are done
  const studiesDone = (monsterId: string) =>
    ordered
      .filter((s) => s.studies_monster_id === monsterId && (s.monster_studies ?? 0) > 0)
      .every((s) => monsterStudyCount(studyOf(monsterId)) >= (s.monster_studies ?? 0));
  return nodes.map((n, i) => {
    let state: JourneyNodeState;
    if (unlocked[i]) state = i === last && (last < nodes.length - 1 || !studiesDone(n.monsterId)) ? 'current' : 'unlocked';
    else state = i === last + 1 ? 'next' : 'locked';
    return { ...n, state };
  });
}
