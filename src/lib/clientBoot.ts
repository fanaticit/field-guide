// ─────────────────────────────────────────────────────────────
// clientBoot.ts — Browser-only start-up work.
//
// This used to run in main.tsx before React rendered. Pages are now
// pre-rendered at build time (where there is no window, document or
// localStorage), so it runs once from the root component after the
// page has hydrated in the browser instead.
// ─────────────────────────────────────────────────────────────
import { initAuth } from '../store/authStore';
import { initBuildDraftPersistence } from '../store/buildDraftCookie';
import { useUIStore } from '../store/uiStore';

let started = false;

export function startClientApp() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Restore saved UI preferences (section themes) from localStorage.
  void useUIStore.persist.rehydrate();

  // Load any persisted Supabase session and subscribe to auth changes.
  initAuth();

  // Restore the hunter's unsaved Build Planner selections from their cookie.
  initBuildDraftPersistence();

  // Discourage casual image saving: block the context menu and dragging on images only.
  const isImage = (e: Event) => (e.target as HTMLElement | null)?.tagName === 'IMG';
  document.addEventListener('contextmenu', (e) => {
    if (isImage(e)) e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => {
    if (isImage(e)) e.preventDefault();
  });
}
