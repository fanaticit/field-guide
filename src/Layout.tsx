// ─────────────────────────────────────────────────────────────
// Layout.tsx — Root layout shell.
// Renders the persistent chrome (Sidebar, Header, Footer) and
// an <Outlet /> where the active route's page component renders.
// ─────────────────────────────────────────────────────────────
import { Outlet } from 'react-router-dom';
import { useUIStore } from './store/uiStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { cn } from './lib/utils';

export default function Layout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div id="app-root" className="relative min-h-screen bg-texture">
      {/* Subtle radial gradient behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area — offset by sidebar width */}
      <div
        id="main-content"
        className={cn(
          'sidebar-transition relative z-10 flex min-h-screen flex-col',
          // On desktop, leave space for sidebar
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]',
        )}
      >
        {/* Mobile-only sticky header */}
        <Header />

        {/* Page content — active route renders here */}
        <main id="page-main" className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-mh-slate-800 px-6 py-3">
          <p className="text-center text-xs text-mh-slate-700">
            Field Guide &copy; {new Date().getFullYear()} &mdash; Monster Hunter Now Community Tracker
          </p>
        </footer>
      </div>
    </div>
  );
}
