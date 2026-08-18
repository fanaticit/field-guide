import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Page = 'field-guide' | 'build-planner' | 'community-hub' | 'settings';

interface UIState {
  activePage: Page;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  setActivePage: (page: Page) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activePage: 'field-guide',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      setActivePage: (page) =>
        set({ activePage: page, mobileMenuOpen: false }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'field-guide-ui',
      partialize: (state) => ({
        activePage: state.activePage,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
