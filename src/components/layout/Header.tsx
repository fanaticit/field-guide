import { Menu, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';

interface PageMeta { title: string; subtitle: string }

function getPageMeta(pathname: string): PageMeta {
  if (pathname === '/') return { title: 'Field Guide', subtitle: 'Quests & Challenge Todos' };
  if (pathname.startsWith('/armory/planner') || pathname.startsWith('/armory/build-planner') || pathname.startsWith('/build-planner')) return { title: "Hunter's Armory", subtitle: 'Build Planner' };
  if (pathname.startsWith('/armory')) return { title: "Hunter's Armory", subtitle: 'Community Builds' };
  if (pathname.startsWith('/community-hub')) return { title: 'Community Hub', subtitle: 'Browse & Share Challenges' };
  if (pathname.startsWith('/investigation-notes')) return { title: 'Investigation Notes', subtitle: 'Monsters, Weapons & Armour' };
  if (pathname.startsWith('/admin')) return { title: 'Admin Panel', subtitle: 'Manage game data & community' };
  if (pathname.startsWith('/settings')) return { title: 'Profile & Settings', subtitle: 'Preferences & Account' };
  return { title: 'Field Guide', subtitle: 'Monster Hunter Outlanders' };
}

export default function Header() {
  const { pathname } = useLocation();
  const { setMobileMenuOpen } = useUIStore();
  const { title, subtitle } = getPageMeta(pathname);

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-primary)]/90 px-4 backdrop-blur-md lg:hidden"
    >
      {/* Hamburger — mobile only */}
      <button
        id="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open navigation menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A3A3A3] transition-colors hover:bg-white/10 hover:text-white"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb-style title */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-display text-xs font-semibold uppercase tracking-widest text-mh-gold-600">
          Field Guide
        </span>
        <ChevronRight size={12} className="shrink-0 text-mh-slate-600" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-mh-slate-200">{title}</p>
        </div>
      </div>

      <p className="ml-auto hidden text-xs text-mh-slate-500 sm:block">{subtitle}</p>
    </header>
  );
}
