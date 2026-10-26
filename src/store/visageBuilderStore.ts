// ─────────────────────────────────────────────────────────────
// visageBuilderStore — state for the standalone Visage Builder.
// Deliberately separate from buildPlannerStore so the planner is
// unaffected until we link Visage Builds into it.
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import type { DBVisage } from '../data/schemas/visage';
import {
  emptyLoadout,
  firstEmptySlot,
  normalizeInk,
  type VisageBuildSlot,
  type VisageLoadout,
} from '../lib/visageBuild';

export type CardSourceMode = 'mine' | 'any';

interface VisageBuilderState {
  buildId: string | null;
  authorId: string | null;
  title: string;
  description: string;
  isPublished: boolean;
  loadout: VisageLoadout;
  sourceMode: CardSourceMode;
  /** True when loadout/meta changed since last load/save */
  dirty: boolean;

  setSlot: (slot: VisageBuildSlot, visage: DBVisage | null, ink?: string | null) => void;
  setSlotInk: (slot: VisageBuildSlot, ink: string) => void;
  /** Adds to first empty slot (non-core first unless core empty). Returns slot used or null. */
  addCard: (visage: DBVisage, ink: string | null) => VisageBuildSlot | null;
  removeCard: (visageId: string, ink: string | null) => void;
  setMeta: (meta: Partial<Pick<VisageBuilderState, 'title' | 'description' | 'isPublished'>>) => void;
  setSourceMode: (m: CardSourceMode) => void;
  load: (b: {
    buildId: string | null;
    authorId: string | null;
    title: string;
    description: string;
    isPublished: boolean;
    loadout: VisageLoadout;
  }) => void;
  markSaved: (buildId: string, authorId: string) => void;
  /** Detach from the loaded build so the next save creates a new one */
  detach: () => void;
  reset: () => void;
}

export const useVisageBuilderStore = create<VisageBuilderState>((set, get) => ({
  buildId: null,
  authorId: null,
  title: '',
  description: '',
  isPublished: true,
  loadout: emptyLoadout(),
  sourceMode: 'mine',
  dirty: false,

  setSlot: (slot, visage, ink) =>
    set((s) => ({
      dirty: true,
      loadout: {
        ...s.loadout,
        [slot]: {
          visage,
          ink: visage ? normalizeInk(ink ?? visage.ink_types?.[0]) : null,
        },
      },
    })),

  setSlotInk: (slot, ink) =>
    set((s) => ({
      dirty: true,
      loadout: { ...s.loadout, [slot]: { ...s.loadout[slot], ink: normalizeInk(ink) } },
    })),

  addCard: (visage, ink) => {
    const slot = firstEmptySlot(get().loadout);
    if (!slot) return null;
    get().setSlot(slot, visage, ink);
    return slot;
  },

  removeCard: (visageId, ink) => {
    const { loadout } = get();
    const n = normalizeInk(ink);
    // Remove the last matching slot (keeps core if possible)
    const slots: VisageBuildSlot[] = [5, 4, 3, 2, 'core'];
    const hit = slots.find((s) => loadout[s].visage?.id === visageId && (!n || loadout[s].ink === n));
    if (hit) get().setSlot(hit, null);
  },

  setMeta: (meta) => set({ ...meta, dirty: true }),
  setSourceMode: (sourceMode) => set({ sourceMode }),

  load: (b) => set({ ...b, dirty: false }),
  markSaved: (buildId, authorId) => set({ buildId, authorId, dirty: false }),
  detach: () => set({ buildId: null, authorId: null, dirty: true }),
  reset: () =>
    set({
      buildId: null,
      authorId: null,
      title: '',
      description: '',
      isPublished: true,
      loadout: emptyLoadout(),
      dirty: false,
    }),
}));
