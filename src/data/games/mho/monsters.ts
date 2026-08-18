// ─────────────────────────────────────────────────────────────
// MHO Radiant Monsters
//
// Radiant monsters are Aesoland-specific variants of classic MH
// monsters, altered by Radiantite mineral. Each Radiant monster
// entry has a parentId linking back to the canonical monster in
// the core monster list.
//
// This file is intentionally sparse — confirmed Radiant monster
// data will be added as the beta/launch roster is publicly confirmed.
// ─────────────────────────────────────────────────────────────

export interface MHORadiantMonster {
  /** Unique ID for this Radiant variant, e.g. "radiant_rathalos" */
  id: string;
  /** Display name, e.g. "Radiant Rathalos" */
  name: string;
  /** ID of the canonical core monster this is based on */
  parentId: string;
  /**
   * Radiantite influence level — affects aggression, frenzied state threshold.
   * 1 = lightly altered; 3 = heavily altered
   */
  radiantiteLevel: 1 | 2 | 3;
  /** Whether this monster can enter a frenzied state mid-battle */
  hasFrenziedState: boolean;
  /** Whether this entry is confirmed from official beta footage/announcements */
  confirmedInBeta: boolean;
  /** Notes on how this Radiant variant differs from its core counterpart */
  notes?: string;
}

/**
 * MHO Radiant monster roster.
 * Empty until official beta roster data is confirmed.
 * Add entries here as monsters are confirmed — they will automatically
 * appear in the MHO Build Planner and Field Guide.
 *
 * Example entry (uncomment when confirmed):
 * {
 *   id: 'radiant_rathalos',
 *   name: 'Radiant Rathalos',
 *   parentId: 'rathalos',
 *   radiantiteLevel: 2,
 *   hasFrenziedState: true,
 *   confirmedInBeta: true,
 *   notes: 'Enhanced fire attacks; frenzied state triggers at 50% HP',
 * }
 */
export const MHO_RADIANT_MONSTERS: MHORadiantMonster[] = [
  // TODO: Populate as beta roster is confirmed
];

export const MHO_RADIANT_MAP = new Map<string, MHORadiantMonster>(
  MHO_RADIANT_MONSTERS.map((m) => [m.id, m])
);

/** Get all Radiant variants for a given core monster */
export function getRadiantVariants(coreId: string): MHORadiantMonster[] {
  return MHO_RADIANT_MONSTERS.filter((m) => m.parentId === coreId);
}
