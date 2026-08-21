import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Page =
  | 'field-guide'
  | 'build-planner'
  | 'community-hub'
  | 'investigation-notes'
  | 'settings';

export type InvestigationSubPage = 'monster-guide' | 'weapons' | 'armour';

interface UIState {
  activePage: Page;
  activeSubPage: InvestigationSubPage;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  setActivePage: (page: Page) => void;
  setActiveSubPage: (subPage: InvestigationSubPage) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activePage: 'field-guide',
      activeSubPage: 'monster-guide',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      setActivePage: (page) =>
        set({ activePage: page, mobileMenuOpen: false }),
      setActiveSubPage: (subPage) => set({ activeSubPage: subPage }),
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
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
