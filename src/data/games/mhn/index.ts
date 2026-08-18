// MHN Game Configuration
import type { GameConfig } from '../../schemas/index.js';

export const MHN_CONFIG: GameConfig = {
  id: 'mhn',
  name: 'Monster Hunter Now',
  shortName: 'MHN',
  description:
    'Location-based AR mobile game by Niantic and Capcom. ' +
    '75-second real-world encounters, 14 weapon types, Driftsmelting armour customisation.',
  platform: ['iOS', 'Android'],
  status: 'live',
  supportedWeaponTypeIds: [
    'great_sword',
    'long_sword',
    'sword_shield',
    'dual_blades',
    'hammer',
    'hunting_horn',
    'lance',
    'gunlance',
    'switch_axe',
    'charge_blade',
    'insect_glaive',
    'bow',
    'light_bowgun',
    'heavy_bowgun',
  ],
  hasDriftsmelting: true,
  hasAdventurers: false,
  tierSystem: 'low_high_elder',
  officialUrl: 'https://monsterhunternow.com',
};
