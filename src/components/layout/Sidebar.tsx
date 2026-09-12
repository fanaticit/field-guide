import {
  BookOpen,
  Sword,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Flame,
  BookMarked,
  Bug,
  Shield,
  ShieldAlert,
  Sparkles,
  Cat,
  UserCheck,
  Target,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { cn } from '../../lib/utils';
import UserMenu from '../auth/UserMenu';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
  adminOnly?: boolean;
}

interface SubNavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const navItems: NavItem[] = [
  {
    id: 'field-guide',
    path: '/',
    label: 'Field Guide',
    icon: BookOpen,
    description: 'Monster Weaknesses & Drops',
  },
  {
    id: 'build-planner',
    path: '/build-planner',
    label: 'Build Planner',
    icon: Sword,
    description: 'Theorycraft your loadouts',
  },
  {
    id: 'armory',
    path: '/armory',
    label: 'Hunter\'s Armory',
    icon: Shield,
    description: 'View community builds',
  },
  {
    id: 'community',
    path: '/community-hub',
    label: 'Community Hub',
    icon: Users,
    description: 'Connect with hunters',
  },
  {
    id: 'investigation-notes',
    path: '/investigation-notes',
    label: 'Investigation Notes',
    icon: BookMarked,
    description: 'Monsters & Lore',
  },
  {
    id: 'admin',
    path: '/admin',
    label: 'Admin Panel',
    icon: ShieldAlert,
    description: 'Manage game data',
    adminOnly: true,
  },
  {
    id: 'challenges',
    path: '/challenges',
    label: "Hunter's Challenges",
    icon: Target,
    description: 'Track craft & upgrade goals',
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Profile & Settings',
    icon: Settings,
    description: 'Preferences & Identity',
  },
];

const investigationSubNav: SubNavItem[] = [
  { id: 'monster-guide', path: '/investigation-notes/monster-guide', label: 'Monster Guide', icon: Bug },
  { id: 'adventurers', path: '/investigation-notes/adventurers', label: 'Adventurers', icon: UserCheck },
  { id: 'visages', path: '/investigation-notes/visages', label: 'Visage', icon: Sparkles },
  { id: 'buddies', path: '/investigation-notes/buddies', label: 'Buddies', icon: Cat },
  { id: 'weapons', path: '/investigation-notes/weapons', label: 'Weapons', icon: Sword },
  { id: 'armour', path: '/investigation-notes/armour', label: 'Armour', icon: Shield },
];

export default function Sidebar() {
  const {
    sidebarCollapsed,
    mobileMenuOpen,
    toggleSidebar,
    setMobileMenuOpen,
  } = useUIStore();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = useAuthStore(selectIsAdmin);

  const isInvestigationActive = pathname.startsWith('/investigation-notes');

  // Derive active top-level item from pathname
  const getIsActive = (item: NavItem) => {
    if (item.path === '/') return pathname === '/';
    return pathname.startsWith(item.path);
  };

  // Filter nav items — hide adminOnly items for non-admins
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const handleNavClick = (item: NavItem) => {
    setMobileMenuOpen(false);
    // For items with sub-pages, navigate to their default sub-page directly
    if (item.id === 'investigation-notes') {
      navigate('/investigation-notes/monster-guide');
    } else if (item.id === 'admin') {
      navigate('/admin/monsters');
    } else {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'sidebar-transition fixed left-0 top-0 z-50 flex h-screen flex-col',
          'border-r border-mh-slate-700 bg-mh-slate-950',
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ willChange: 'transform, width' }}
      >
        {/* ── Header / Branding ── */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-mh-slate-700 px-4',
            sidebarCollapsed ? 'justify-center' : 'justify-between gap-3',
          )}
        >
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-mh-gold-500 to-mh-gold-700 glow-gold">
              <Flame size={20} className="text-mh-slate-900" />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-display text-sm font-bold leading-none tracking-wide text-mh-gold-400 text-glow-gold">
                  Field Guide
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-mh-slate-500">
                  Monster Hunter Now
                </p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-mh-slate-500 transition-colors hover:bg-mh-slate-800 hover:text-mh-slate-300 lg:hidden"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" role="navigation" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
            const isActive = getIsActive(item);
            const Icon = item.icon;
            const isInvestigation = item.id === 'investigation-notes';
            const isAdminItem = item.id === 'admin';

            return (
              <div key={item.id}>
                <button
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
                    'text-left transition-all duration-200',
                    isActive && !isAdminItem
                      ? 'bg-mh-gold-500/10 text-mh-gold-400'
                      : isActive && isAdminItem
                      ? 'bg-mh-gold-500/10 text-mh-gold-400'
                      : isAdminItem
                      ? 'text-mh-gold-600 hover:bg-mh-gold-500/10 hover:text-mh-gold-400'
                      : 'text-mh-slate-400 hover:bg-mh-slate-800 hover:text-mh-slate-200',
                    sidebarCollapsed && 'justify-center px-0',
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-mh-gold-400 glow-gold"
                      aria-hidden="true"
                    />
                  )}

                  <Icon
                    size={20}
                    className={cn(
                      'shrink-0 transition-colors duration-200',
                      isActive
                        ? 'text-mh-gold-400'
                        : isAdminItem
                        ? 'text-mh-gold-600 group-hover:text-mh-gold-400'
                        : 'text-mh-slate-500 group-hover:text-mh-slate-300',
                    )}
                  />

                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-sm font-semibold leading-none',
                        isActive ? 'text-mh-gold-300' : '',
                      )}>
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-mh-slate-500">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Chevron for Investigation Notes */}
                  {!sidebarCollapsed && isInvestigation && (
                    <ChevronDown
                      size={14}
                      className={cn(
                        'shrink-0 transition-transform duration-200 text-mh-slate-500',
                        isInvestigationActive && 'rotate-180 text-mh-gold-500',
                      )}
                    />
                  )}

                  {/* Tooltip when collapsed */}
                  {sidebarCollapsed && (
                    <div
                      className={cn(
                        'pointer-events-none absolute left-full ml-3 whitespace-nowrap',
                        'rounded-md bg-mh-slate-800 px-2.5 py-1.5 text-xs font-semibold text-mh-slate-200',
                        'border border-mh-slate-700 shadow-xl',
                        'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                        'z-50',
                      )}
                      role="tooltip"
                    >
                      {item.label}
                    </div>
                  )}
                </button>

                {/* Investigation Notes sub-nav */}
                {isInvestigation && isInvestigationActive && !sidebarCollapsed && (
                  <div className="mt-1 ml-3 flex flex-col gap-0.5 border-l border-mh-slate-700 pl-3">
                    {investigationSubNav.map((sub) => {
                      const isSubActive = pathname === sub.path;
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => { navigate(sub.path); setMobileMenuOpen(false); }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-all duration-150',
                            isSubActive
                              ? 'bg-mh-gold-500/10 text-mh-gold-400 font-semibold'
                              : 'text-mh-slate-500 hover:bg-mh-slate-800 hover:text-mh-slate-300',
                          )}
                        >
                          <SubIcon size={13} className="shrink-0" />
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── User Menu ── */}
        <UserMenu collapsed={sidebarCollapsed} />

        {/* ── Collapse Toggle — desktop only ── */}
        <div className="hidden shrink-0 border-t border-mh-slate-700 p-3 lg:block">
          <button
            id="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2',
              'text-xs font-medium text-mh-slate-500 transition-all duration-200',
              'hover:bg-mh-slate-800 hover:text-mh-slate-300',
              sidebarCollapsed && 'justify-center px-0',
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
