// ─────────────────────────────────────────────────────────────
// visageBuild — pure helpers for Visage loadouts (Core + 4 slots).
// Shared by the Visage Builder, the Visage Builds browser and
// (later) the Build Planner so all of them do identical maths.
// ─────────────────────────────────────────────────────────────
import type { DBVisage } from '../data/schemas/visage';
export type { DBVisage };
import type { SetBonusTier } from '../hooks/useAdminSkills';
import type { CardCollectionEntry, VisageSet } from '../hooks/useVisageSets';

export const VISAGE_POINT_CAP = 12;

export type VisageBuildSlot = 'core' | 2 | 3 | 4 | 5;
export const VISAGE_BUILD_SLOTS: VisageBuildSlot[] = ['core', 2, 3, 4, 5];

export interface VisageSlotEntry {
  visage: DBVisage | null;
  ink: string | null;
}

export type VisageLoadout = Record<VisageBuildSlot, VisageSlotEntry>;

export function emptyLoadout(): VisageLoadout {
  return {
    core: { visage: null, ink: null },
    2: { visage: null, ink: null },
    3: { visage: null, ink: null },
    4: { visage: null, ink: null },
    5: { visage: null, ink: null },
  };
}

/** Same normalisation as useVisageSetsData (fire → flames). */
export function normalizeInk(ink: string | null | undefined): string | null {
  if (!ink) return null;
  const k = ink.toLowerCase().replace(/^ink_of_/, '');
  return k === 'fire' ? 'flames' : k;
}

export function slotLabel(slot: VisageBuildSlot): string {
  return slot === 'core' ? 'Core' : `Slot ${slot}`;
}

export function getTotalPoints(loadout: VisageLoadout): number {
  return VISAGE_BUILD_SLOTS.reduce((sum, s) => sum + (loadout[s].visage?.points ?? 0), 0);
}

export function getFilledCount(loadout: VisageLoadout): number {
  return VISAGE_BUILD_SLOTS.filter((s) => loadout[s].visage).length;
}

/** Count of equipped cards per (normalised) ink. */
export function getInkCounts(loadout: VisageLoadout): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of VISAGE_BUILD_SLOTS) {
    const { visage, ink } = loadout[s];
    const n = normalizeInk(ink);
    if (visage && n) counts[n] = (counts[n] || 0) + 1;
  }
  return counts;
}

/** Visage ids that appear more than once (same-name set effects don't stack). */
export function getDuplicateIds(loadout: VisageLoadout): string[] {
  const c: Record<string, number> = {};
  for (const s of VISAGE_BUILD_SLOTS) {
    const id = loadout[s].visage?.id;
    if (id) c[id] = (c[id] || 0) + 1;
  }
  return Object.keys(c).filter((id) => c[id] > 1);
}

/** Would putting `card` into `slot` stay within the point cap? */
export function canPlaceCard(loadout: VisageLoadout, card: DBVisage, slot: VisageBuildSlot): boolean {
  const current = loadout[slot].visage?.points ?? 0;
  return getTotalPoints(loadout) - current + card.points <= VISAGE_POINT_CAP;
}

export function firstEmptySlot(loadout: VisageLoadout, includeCore = true): VisageBuildSlot | null {
  for (const s of VISAGE_BUILD_SLOTS) {
    if (!includeCore && s === 'core') continue;
    if (!loadout[s].visage) return s;
  }
  return null;
}

export interface ActiveSetBonus {
  ink: string;
  name: string;
  count: number;
  thresholds: SetBonusTier[];
  achieved: SetBonusTier[];
  next: SetBonusTier | null;
}

/** Resolve ink counts against DB set thresholds. Sorted by count desc. */
export function getActiveSetBonuses(loadout: VisageLoadout, sets: VisageSet[]): ActiveSetBonus[] {
  const counts = getInkCounts(loadout);
  return Object.entries(counts)
    .map(([ink, count]) => {
      const set = sets.find((s) => s.id === ink);
      const thresholds = [...(set?.thresholds ?? [])].sort((a, b) => a.pieces - b.pieces);
      return {
        ink,
        name: set?.name ?? ink,
        count,
        thresholds,
        achieved: thresholds.filter((t) => count >= t.pieces),
        next: thresholds.find((t) => t.pieces > count) ?? null,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export interface MissingCard {
  visage: DBVisage;
  ink: string;
  needed: number;
  owned: number;
}

export interface Buildability {
  buildable: boolean;
  missing: MissingCard[];
}

/**
 * Check whether a user can assemble the loadout from their collection.
 * Using the same card+ink twice requires quantity >= 2. Any rarity counts.
 */
export function getBuildability(
  loadout: VisageLoadout,
  collectionMap: Record<string, CardCollectionEntry>,
): Buildability {
  const need = new Map<string, { visage: DBVisage; ink: string; needed: number }>();
  for (const s of VISAGE_BUILD_SLOTS) {
    const { visage, ink } = loadout[s];
    const n = normalizeInk(ink);
    if (!visage || !n) continue;
    const key = `${visage.id}:${n}`;
    const e = need.get(key);
    if (e) e.needed++;
    else need.set(key, { visage, ink: n, needed: 1 });
  }

  const missing: MissingCard[] = [];
  for (const [key, req] of need) {
    const owned = collectionMap[key]?.quantity ?? 0;
    if (owned < req.needed) missing.push({ ...req, owned });
  }
  return { buildable: missing.length === 0, missing };
}

export function ownsCardInk(
  collectionMap: Record<string, CardCollectionEntry>,
  visageId: string,
  ink: string | null | undefined,
): boolean {
  const n = normalizeInk(ink);
  return Boolean(n && collectionMap[`${visageId}:${n}`]);
}

// ── DB row ⇄ loadout ────────────────────────────────────────

export interface VisageBuildRow {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  core_visage_id: string | null;
  visage_2_id: string | null;
  visage_3_id: string | null;
  visage_4_id: string | null;
  visage_5_id: string | null;
  core_ink_type: string | null;
  visage_2_ink_type: string | null;
  visage_3_ink_type: string | null;
  visage_4_ink_type: string | null;
  visage_5_ink_type: string | null;
  total_points: number;
  upvotes: number;
  downvotes: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author?: { username: string | null } | null;
}

const ID_COL: Record<VisageBuildSlot, keyof VisageBuildRow> = {
  core: 'core_visage_id',
  2: 'visage_2_id',
  3: 'visage_3_id',
  4: 'visage_4_id',
  5: 'visage_5_id',
};
const INK_COL: Record<VisageBuildSlot, keyof VisageBuildRow> = {
  core: 'core_ink_type',
  2: 'visage_2_ink_type',
  3: 'visage_3_ink_type',
  4: 'visage_4_ink_type',
  5: 'visage_5_ink_type',
};

export function rowToLoadout(row: VisageBuildRow, visagesById: Map<string, DBVisage>): VisageLoadout {
  const l = emptyLoadout();
  for (const s of VISAGE_BUILD_SLOTS) {
    const id = row[ID_COL[s]] as string | null;
    const visage = id ? visagesById.get(id) ?? null : null;
    const ink = normalizeInk(row[INK_COL[s]] as string | null) ?? normalizeInk(visage?.ink_types?.[0]);
    l[s] = { visage, ink: visage ? ink : null };
  }
  return l;
}

export function loadoutToColumns(loadout: VisageLoadout) {
  const cols: Record<string, string | number | null> = {};
  for (const s of VISAGE_BUILD_SLOTS) {
    cols[ID_COL[s]] = loadout[s].visage?.id ?? null;
    cols[INK_COL[s]] = loadout[s].visage ? normalizeInk(loadout[s].ink) : null;
  }
  cols.total_points = getTotalPoints(loadout);
  return cols;
}

/**
 * Returns a normalized canonical signature for a loadout based on
 * (Core visage + ink) and the multiset of slots 2-5 (visages + inks).
 */
export function getLoadoutSignature(loadout: VisageLoadout): string {
  const coreKey = `${loadout.core.visage?.id ?? 'none'}:${normalizeInk(loadout.core.ink) ?? 'none'}`;
  const secondaryKeys = ([2, 3, 4, 5] as VisageBuildSlot[])
    .map((s) => `${loadout[s].visage?.id ?? 'none'}:${normalizeInk(loadout[s].ink) ?? 'none'}`)
    .sort()
    .join('|');
  return `${coreKey}#${secondaryKeys}`;
}

/**
 * Search a list of builds for an exact matching card & ink combination.
 */
export function findDuplicateBuild(
  loadout: VisageLoadout,
  allBuilds: VisageBuildRow[],
  visagesById: Map<string, DBVisage>,
  excludeBuildId?: string | null,
): VisageBuildRow | null {
  const filledCount = getFilledCount(loadout);
  // Only check if at least 2 cards are present
  if (filledCount < 2) return null;

  const targetSig = getLoadoutSignature(loadout);
  for (const row of allBuilds) {
    if (excludeBuildId && row.id === excludeBuildId) continue;
    const rowLoadout = rowToLoadout(row, visagesById);
    if (getFilledCount(rowLoadout) !== filledCount) continue;
    if (getLoadoutSignature(rowLoadout) === targetSig) {
      return row;
    }
  }
  return null;
}

