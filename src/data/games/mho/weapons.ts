// ─────────────────────────────────────────────────────────────
// MHO Weapon Availability
// Only 6 weapon types confirmed in beta as of mid-2026.
// References weapon type IDs from core/weapon-types.ts.
// ─────────────────────────────────────────────────────────────
import type { MHOWeaponAvailability } from '../../schemas/index.js';

export const MHO_WEAPON_AVAILABILITY: MHOWeaponAvailability[] = [
  { weaponTypeId: 'long_sword', confirmedInBeta: true },
  { weaponTypeId: 'great_sword', confirmedInBeta: true },
  { weaponTypeId: 'dual_blades', confirmedInBeta: true },
  { weaponTypeId: 'heavy_bowgun', confirmedInBeta: true },
  { weaponTypeId: 'bow', confirmedInBeta: true },
  { weaponTypeId: 'lance', confirmedInBeta: true },
  // Not yet confirmed — full 14-weapon roster expected post-launch
  { weaponTypeId: 'sword_shield', confirmedInBeta: false },
  { weaponTypeId: 'hammer', confirmedInBeta: false },
  { weaponTypeId: 'hunting_horn', confirmedInBeta: false },
  { weaponTypeId: 'gunlance', confirmedInBeta: false },
  { weaponTypeId: 'switch_axe', confirmedInBeta: false },
  { weaponTypeId: 'charge_blade', confirmedInBeta: false },
  { weaponTypeId: 'insect_glaive', confirmedInBeta: false },
  { weaponTypeId: 'light_bowgun', confirmedInBeta: false },
];

export const MHO_CONFIRMED_WEAPON_IDS = MHO_WEAPON_AVAILABILITY
  .filter((w) => w.confirmedInBeta)
  .map((w) => w.weaponTypeId);
