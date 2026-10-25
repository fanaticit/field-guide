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
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  defaultGame: string;
  sectionThemes: Record<string, RarityTheme>;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setDefaultGame: (game: string) => void;
  setSectionTheme: (sectionPath: string, theme: RarityTheme) => void;
  resetSectionThemes: () => void;
  getThemeForPath: (pathname: string) => RarityTheme;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      defaultGame: 'mho',
      sectionThemes: DEFAULT_SECTION_THEMES,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
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
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        defaultGame: state.defaultGame,
        sectionThemes: state.sectionThemes,
      }),
    }
  )
);
