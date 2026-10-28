// ─────────────────────────────────────────────────────────────
// Layout.tsx — Root layout shell.
// Renders the persistent chrome (MainNav, Footer) and
// an <Outlet /> where the active route's page component renders.
// ─────────────────────────────────────────────────────────────
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useUIStore } from './store/uiStore';
import MainNav from './components/layout/MainNav';
import { cn } from './lib/utils';

export default function Layout() {
  const { getThemeForPath } = useUIStore();
  const { pathname } = useLocation();
  const activeTheme = getThemeForPath(pathname);

  return (
    <div id="app-root" className="relative min-h-screen bg-texture overflow-x-hidden">
      {/* Cinematic Outlanders Ambient Lighting & Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            // Top ambient sunlight / lantern ray
            'radial-gradient(ellipse 75% 40% at 50% -5%, rgba(255, 215, 0, 0.12) 0%, rgba(201, 160, 66, 0.04) 50%, transparent 80%)',
            // Campfire / ambient warm light in upper-left
            'radial-gradient(circle 600px at 15% 15%, rgba(245, 158, 11, 0.07) 0%, transparent 70%)',
            // Deep cinematic edge vignette
            'radial-gradient(ellipse at center, transparent 35%, rgba(6, 7, 9, 0.85) 100%)',
          ].join(', '),
        }}
      />

      {/* Main navigation — left rail on desktop/landscape, bottom bar on mobile portrait */}
      <MainNav />

      {/* Main area — offset by the nav rail & themed by active section */}
      <div
        id="main-content"
        className={cn(
          'app-content relative z-10 flex min-h-screen flex-col',
          `rarity-theme-${activeTheme}`,
        )}
      >
        {/* Page content — active route renders here */}
        <main id="page-main" className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-mh-slate-800 px-6 py-5 flex flex-col items-center justify-center gap-3">
          <p className="rounded-full border border-[var(--border-active)]/20 bg-[var(--bg-superior)] px-4 py-1.5 text-center text-xs font-medium uppercase tracking-wider text-[var(--accent-gold)]/70 sm:text-sm">
            Unofficial Fan Project &ndash; Not affiliated with Capcom or TiMi Studio Group
          </p>
          <p className="text-center text-xs text-mh-slate-600">
            Field Guide &copy; {new Date().getFullYear()} &mdash; Monster Hunter Outlanders Community Tracker
          </p>
          <div className="flex gap-4 text-[11px] font-medium text-mh-slate-500">
            <Link to="/privacy" className="hover:text-mh-slate-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-mh-slate-300 transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
