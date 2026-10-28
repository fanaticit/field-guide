import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type RarityTheme, DEFAULT_SECTION_THEMES, resolveSectionTheme } from '../config/themes';

export type Page =
  | 'field-guide'
  | 'build-planner'
  | 'community-hub'
  | 'investigation-notes'
  | 'admin'
  | 'settings'
  | 'profile';

export type InvestigationSubPage = 'monster-guide' | 'adventurers' | 'visages' | 'buddies' | 'weapons' | 'armour';
export type AdminSubPage = 'monsters' | 'skills' | 'weapons' | 'armour' | 'adventurers' | 'visages' | 'buddies' | 'content' | 'users' | 'other';

interface UIState {
  defaultGame: string;
  sectionThemes: Record<string, RarityTheme>;
  setDefaultGame: (game: string) => void;
  setSectionTheme: (sectionPath: string, theme: RarityTheme) => void;
  resetSectionThemes: () => void;
  getThemeForPath: (pathname: string) => RarityTheme;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      defaultGame: 'mho',
      sectionThemes: DEFAULT_SECTION_THEMES,
      setDefaultGame: (game) => set({ defaultGame: game }),
      setSectionTheme: (sectionPath, theme) =>
        set((state) => ({
          sectionThemes: {
            ...state.sectionThemes,
            [sectionPath]: theme,
          },
        })),
      resetSectionThemes: () => set({ sectionThemes: DEFAULT_SECTION_THEMES }),
      getThemeForPath: (pathname: string) => {
        return resolveSectionTheme(pathname, get().sectionThemes);
      },
    }),
    {
      name: 'field-guide-ui',
      version: 1,
      // v0 stored every section as 'standard' before themes were applied anywhere; pick up the new defaults.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<UIState>;
        if (version < 1) {
          return { ...state, sectionThemes: DEFAULT_SECTION_THEMES } as UIState;
        }
        return state as UIState;
      },
      partialize: (state) => ({
        defaultGame: state.defaultGame,
        sectionThemes: state.sectionThemes,
      }),
    }
  )
);
