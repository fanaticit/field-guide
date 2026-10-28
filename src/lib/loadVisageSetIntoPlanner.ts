import { useBuildPlannerStore, type Visage } from '../store/buildPlannerStore';
import { normalizeInk, VISAGE_BUILD_SLOTS, type VisageLoadout } from './visageBuild';

/**
 * Replaces the Build Planner's visage selection with a Visage Set's loadout,
 * leaving every other part of the current build untouched.
 * Returns the planner path the hunter should be sent back to.
 */
export function loadVisageLoadoutIntoPlanner(loadout: VisageLoadout): string {
  const { buildId, selectedInkTypes } = useBuildPlannerStore.getState();

  const patch: Record<string, Visage | null> = {};
  const inks: Record<string, string> = { ...selectedInkTypes };

  for (const slot of VISAGE_BUILD_SLOTS) {
    const key = slot === 'core' ? 'coreVisage' : `visage${slot}`;
    const { visage, ink } = loadout[slot];
    patch[key] = (visage as unknown as Visage) ?? null;

    if (visage) {
      // The planner stores the card's own ink name, the set stores a normalised one
      const wanted = normalizeInk(ink);
      const match = visage.ink_types.find((t) => normalizeInk(t) === wanted) ?? visage.ink_types[0];
      if (match) inks[String(slot)] = match;
      else delete inks[String(slot)];
    } else {
      delete inks[String(slot)];
    }
  }

  useBuildPlannerStore.setState({ ...patch, selectedInkTypes: inks });
  return buildId ? `/armory/planner/${buildId}` : '/armory/planner';
}
