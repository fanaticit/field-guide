import { ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface PageMeta { title: string; subtitle: string }

function getPageMeta(pathname: string): PageMeta {
  if (pathname === '/') return { title: 'Field Guide', subtitle: 'Quests & Challenge Todos' };
  if (pathname.startsWith('/armory/planner') || pathname.startsWith('/armory/build-planner') || pathname.startsWith('/build-planner')) return { title: "Hunter's Armory", subtitle: 'Build Planner' };
  if (pathname.startsWith('/armory')) return { title: "Hunter's Armory", subtitle: 'Community Builds' };
  if (pathname.startsWith('/gallery/collection')) return { title: 'Gallery', subtitle: 'Visage Collection' };
  if (pathname.startsWith('/gallery')) return { title: 'Gallery', subtitle: 'Visage Sets' };
  if (pathname.startsWith('/challenges')) return { title: 'Challenges', subtitle: 'Hunter Goals & Records' };
  if (pathname.startsWith('/community-hub')) return { title: 'Community Hub', subtitle: 'Browse & Share Challenges' };
  if (pathname.startsWith('/investigation-notes')) return { title: 'Investigation Notes', subtitle: 'Monsters, Weapons & Armour' };
  if (pathname.startsWith('/admin')) return { title: 'Admin Panel', subtitle: 'Manage game data & community' };
  if (pathname.startsWith('/settings')) return { title: 'Profile & Settings', subtitle: 'Preferences & Account' };
  return { title: 'Field Guide', subtitle: 'Monster Hunter Outlanders' };
}

export default function Header() {
  const { pathname } = useLocation();
  const { title, subtitle } = getPageMeta(pathname);

  return (
    <header
      id="app-header"
      className="app-header sticky top-0 z-30 h-16 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-primary)]/90 px-4 backdrop-blur-md"
    >
      <img src="/favicon.png" alt="" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />

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
