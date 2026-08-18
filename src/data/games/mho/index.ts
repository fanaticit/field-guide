// MHO Game Configuration
import type { GameConfig } from '../../schemas/index.js';

export const MHO_CONFIG: GameConfig = {
  id: 'mho',
  name: 'Monster Hunter Outlanders',
  shortName: 'MHO',
  description:
    'Open-world mobile Monster Hunter by TiMi Studio Group × Capcom, set on the continent of Aesoland. ' +
    'Features named Adventurer characters, Radiant monster variants powered by Radiantite, ' +
    'and up to 4-player co-op. Currently in closed beta (mid-2026).',
  platform: ['iOS', 'Android'],
  status: 'beta',
  // Only 6 weapon types confirmed in beta; full 14 may arrive post-launch
  supportedWeaponTypeIds: [
    'long_sword',
    'great_sword',
    'dual_blades',
    'heavy_bowgun',
    'bow',
    'lance',
  ],
  hasDriftsmelting: false,
  hasAdventurers: true,
  tierSystem: 'radiant',
  officialUrl: 'https://www.monsterhunter.com/outlanders',
};
