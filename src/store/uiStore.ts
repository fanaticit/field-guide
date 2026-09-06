import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setDefaultGame: (game: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      defaultGame: 'mhn',
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      setDefaultGame: (game) => set({ defaultGame: game }),
    }),
    {
      name: 'field-guide-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        defaultGame: state.defaultGame,
      }),
    }
  )
);
