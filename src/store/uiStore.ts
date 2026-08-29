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

export type InvestigationSubPage = 'monster-guide' | 'visages' | 'weapons' | 'armour';
export type AdminSubPage = 'monsters' | 'skills' | 'armour' | 'visages' | 'users' | 'content';

interface UIState {
  activePage: Page;
  activeSubPage: InvestigationSubPage;
  adminSubPage: AdminSubPage;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  defaultGame: string;
  setActivePage: (page: Page) => void;
  setActiveSubPage: (subPage: InvestigationSubPage) => void;
  setAdminSubPage: (subPage: AdminSubPage) => void;
  setDefaultGame: (game: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activePage: 'field-guide',
      activeSubPage: 'monster-guide',
      adminSubPage: 'monsters',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      defaultGame: 'mhn',
      setActivePage: (page) =>
        set({ activePage: page, mobileMenuOpen: false }),
      setActiveSubPage: (subPage) => set({ activeSubPage: subPage }),
      setAdminSubPage: (subPage) => set({ adminSubPage: subPage }),
      setDefaultGame: (game) => set({ defaultGame: game }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'field-guide-ui',
      partialize: (state) => ({
        activePage: state.activePage,
        activeSubPage: state.activeSubPage,
        adminSubPage: state.adminSubPage,
        sidebarCollapsed: state.sidebarCollapsed,
        defaultGame: state.defaultGame,
      }),
    }
  )
);
