// ─────────────────────────────────────────────────────────────
// Armour Lab store — the hunter's rarity, example build and wanted
// skills. Saved in the browser and shared by armour v2, v3 and v4, so
// a build found in one version opens in the others.
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LabBuild, LabSlot, LabTarget } from './logic';

interface ArmourLabState {
  /** The rarity the hunter's armour is at; null until they choose one */
  myRarity: number | null;
  build: LabBuild;
  targets: LabTarget[];
  /** Hide armour that starts above my rarity */
  hideAbove: boolean;

  setHideAbove: (hide: boolean) => void;
  setMyRarity: (rarity: number) => void;
  equip: (slot: LabSlot, pieceId: string) => void;
  unequip: (slot: LabSlot) => void;
  /** Fix one piece at its own rarity (null = follow my rarity) */
  setSlotRarity: (slot: LabSlot, rarity: number | null) => void;
  setBuild: (build: LabBuild) => void;
  clearBuild: () => void;

  addTarget: (key: string, level: number) => void;
  setTargetLevel: (key: string, level: number) => void;
  removeTarget: (key: string) => void;
  clearTargets: () => void;
}

export const useArmourLabStore = create<ArmourLabState>()(
  persist(
    (set) => ({
      myRarity: null,
      build: {},
      targets: [],
      hideAbove: false,

      setHideAbove: (hideAbove) => set({ hideAbove }),
      setMyRarity: (rarity) => set({ myRarity: rarity }),
      equip: (slot, pieceId) =>
        set((s) => ({ build: { ...s.build, [slot]: { pieceId, rarity: null } } })),
      unequip: (slot) =>
        set((s) => {
          const next = { ...s.build };
          delete next[slot];
          return { build: next };
        }),
      setSlotRarity: (slot, rarity) =>
        set((s) => {
          const cur = s.build[slot];
          if (!cur) return {};
          return { build: { ...s.build, [slot]: { ...cur, rarity } } };
        }),
      setBuild: (build) => set({ build }),
      clearBuild: () => set({ build: {} }),

      addTarget: (key, level) =>
        set((s) =>
          s.targets.some((t) => t.key === key) ? {} : { targets: [...s.targets, { key, level }] },
        ),
      setTargetLevel: (key, level) =>
        set((s) => ({ targets: s.targets.map((t) => (t.key === key ? { ...t, level } : t)) })),
      removeTarget: (key) => set((s) => ({ targets: s.targets.filter((t) => t.key !== key) })),
      clearTargets: () => set({ targets: [] }),
    }),
    {
      name: 'armour-lab',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
