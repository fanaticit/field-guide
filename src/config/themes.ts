// ─────────────────────────────────────────────────────────────
// themes.ts — Central Rarity & Section Theme Configuration
// Allows changing themes easily between sections in code or UI.
// ─────────────────────────────────────────────────────────────

export type RarityTheme = 'standard' | 'fine' | 'rare' | 'epic' | 'superior';

export interface ThemeMeta {
  id: RarityTheme;
  label: string;
  colorName: string;
  colorHex: string;
  bgHex: string;
  badgeClass: string;
  expText?: string;
  description: string;
}

export const THEME_REGISTRY: Record<RarityTheme, ThemeMeta> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    colorName: 'Gold / Amber',
    colorHex: '#FFD700',
    bgHex: 'rgba(255, 215, 0, 0.15)',
    badgeClass: 'border-[#FFD700] text-[#FFD700] bg-[rgba(255,215,0,0.15)]',
    description: 'Iconic Monster Hunter Outlanders golden bronze & obsidian interface.',
  },
  fine: {
    id: 'fine',
    label: 'Fine Quality',
    colorName: 'Muted Green',
    colorHex: '#75B670',
    bgHex: 'rgba(117, 182, 112, 0.15)',
    badgeClass: 'border-[#75B670] text-[#75B670] bg-[rgba(117,182,112,0.15)]',
    expText: '+10 EXP',
    description: 'Tactical field-grade compendium and biological investigation theme.',
  },
  rare: {
    id: 'rare',
    label: 'Rare Quality',
    colorName: 'Cyan / Light Blue',
    colorHex: '#62A9D1',
    bgHex: 'rgba(98, 169, 209, 0.15)',
    badgeClass: 'border-[#62A9D1] text-[#62A9D1] bg-[rgba(98,169,209,0.15)]',
    expText: '+20 EXP',
    description: 'Refined research and discovery grade theme.',
  },
  epic: {
    id: 'epic',
    label: 'Epic Quality',
    colorName: 'Purple',
    colorHex: '#9C62D6',
    bgHex: 'rgba(156, 98, 214, 0.15)',
    badgeClass: 'border-[#9C62D6] text-[#9C62D6] bg-[rgba(156,98,214,0.15)]',
    expText: '+30 EXP',
    description: 'Apex combat loadout and potent synergy theme.',
  },
  superior: {
    id: 'superior',
    label: 'Superior Quality',
    colorName: 'Masterwork Gold',
    colorHex: '#DEC267',
    bgHex: 'rgba(222, 194, 103, 0.15)',
    badgeClass: 'border-[#DEC267] text-[#DEC267] bg-[rgba(222,194,103,0.15)]',
    expText: '+60 EXP',
    description: 'Pinnacle masterwork grade and community mastery theme.',
  },
};

export interface SectionDefinition {
  path: string;
  label: string;
  description: string;
}

export const SITE_SECTIONS: SectionDefinition[] = [
  { path: '/', label: 'Home Page', description: 'Landing portal and overview' },
  { path: '/investigation-notes', label: 'Investigation Notes', description: 'Monsters, visages, adventurers, buddies, weapons & armour' },
  { path: '/monsters', label: 'Monster Guide', description: 'Standalone monster hitzones and drop roster' },
  { path: '/build-planner', label: 'Build Planner', description: 'Equipment forging and skill synergy planner' },
  { path: '/armory', label: 'Hunter\'s Armory', description: 'Shared weapon & armour archives' },
  { path: '/challenges', label: 'Hunter\'s Challenges', description: 'Goals, material crafting, and task checklist' },
  { path: '/community-hub', label: 'Community Hub', description: 'Hunter network and build submissions' },
  { path: '/admin', label: 'Admin Panel', description: 'Game data curation tools' },
  { path: '/settings', label: 'Profile & Settings', description: 'Hunter identity and application preferences' },
];

/** Default theme per section: Investigation Notes is Fine; everything else is Standard */
export const DEFAULT_SECTION_THEMES: Record<string, RarityTheme> = {
  '/': 'standard',
  '/investigation-notes': 'fine',
  '/monsters': 'standard',
  '/build-planner': 'standard',
  '/armory': 'standard',
  '/challenges': 'standard',
  '/community-hub': 'standard',
  '/admin': 'standard',
  '/settings': 'standard',
};

/**
 * Resolves the active theme for a given pathname against registered section themes.
 * Uses longest prefix matching so `/investigation-notes/visages` matches `/investigation-notes`.
 */
export function resolveSectionTheme(
  pathname: string,
  overrides?: Record<string, RarityTheme>
): RarityTheme {
  const merged = { ...DEFAULT_SECTION_THEMES, ...(overrides ?? {}) };

  // Exact root match
  if (pathname === '/' || pathname === '') {
    return merged['/'] ?? 'standard';
  }

  // Find longest matching prefix
  let bestMatch = '';
  let bestTheme: RarityTheme = 'standard';

  for (const [sectionPath, theme] of Object.entries(merged)) {
    if (sectionPath === '/') continue;
    if (pathname.startsWith(sectionPath) && sectionPath.length > bestMatch.length) {
      bestMatch = sectionPath;
      bestTheme = theme;
    }
  }

  return bestTheme;
}
