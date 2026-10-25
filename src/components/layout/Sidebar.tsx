import {
  Home,
  BookOpen,
  Sword,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  
  BookMarked,
  Bug,
  Shield,
  ShieldAlert,
  Sparkles,
  Cat,
  UserCheck,
  Target,
} from 'lucide-react';
import {
useNavigate, useLocation } from 'react-router-dom';
import {
useUIStore } from '../../store/uiStore';
import {
useAuthStore, selectIsAdmin } from '../../store/authStore';
import {
cn } from '../../lib/utils';
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
    id: 'home',
    path: '/',
    label: 'Home',
    icon: Home,
    description: 'Welcome to the Field Guide',
  },
  {
    id: 'monsters',
    path: '/monsters',
    label: 'Monster Guide',
    icon: BookOpen,
    description: 'Monster Weaknesses & Drops',
  },
  {
    id: 'armory',
    path: '/armory',
    label: 'Hunter\'s Armory',
    icon: Shield,
    description: 'Builds & Planner',
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

const armorySubNav: SubNavItem[] = [
  { id: 'armory-builds', path: '/armory', label: 'Community Builds', icon: Shield },
  { id: 'armory-planner', path: '/armory/planner', label: 'Build Planner', icon: Sword },
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
  const isArmoryActive = pathname.startsWith('/armory') || pathname.startsWith('/build-planner');

  // Derive active top-level item from pathname
  const getIsActive = (item: NavItem) => {
    if (item.path === '/') return pathname === '/';
    if (item.id === 'armory') return pathname.startsWith('/armory') || pathname.startsWith('/build-planner');
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
          'border-r border-[var(--border-subtle)] bg-[var(--bg-panel-secondary)]/95 backdrop-blur-xl',
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ willChange: 'transform, width' }}
      >
        {/* ── Header / Branding ── */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-[var(--border-subtle)] px-4',
            sidebarCollapsed ? 'justify-center' : 'justify-between gap-3',
          )}
        >
          <div className="flex shrink-0 items-center gap-2.5">
            <img src="/favicon.png" alt="Field Guide Icon" className="h-9 w-9 object-contain drop-shadow-md" />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-display text-sm font-bold leading-none tracking-wide text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
                  Field Guide
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3]">
                  Monster Hunter Outlanders
                </p>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#A3A3A3] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto py-4 pr-3 pl-0" role="navigation" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
            const isActive = getIsActive(item);
            const Icon = item.icon;
            const isInvestigation = item.id === 'investigation-notes';
            const isArmory = item.id === 'armory';

            return (
              <div key={item.id}>
                <button
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-r-xl rounded-l-none px-4 py-3',
                    'border-y border-r transition-all duration-300 ease-out',
                    isActive
                      ? 'bg-[var(--bg-panel-primary)] border-[var(--border-active)] shadow-md shadow-black/50 text-[#FFD700] translate-x-1'
                      : 'border-transparent bg-transparent text-[#A3A3A3] hover:bg-white/5 hover:text-white hover:translate-x-0.5',
                    sidebarCollapsed && 'justify-center px-0 rounded-none border-none translate-x-0',
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && !sidebarCollapsed && (
                    <span
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                      aria-hidden="true"
                    />
                  )}
                  {isActive && sidebarCollapsed && (
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full glow-gold",
                        item.id === 'challenges' ? "bg-yellow-400" : "bg-mh-gold-400"
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <Icon
                    size={20}
                    className={cn(
                      'shrink-0 transition-colors duration-300',
                      isActive
                        ? 'text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.45)]'
                        : 'text-[#A3A3A3] group-hover:text-white',
                    )}
                  />

                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-sm font-bold tracking-wide transition-colors',
                        isActive ? 'text-[#FFD700] drop-shadow-sm' : '',
                      )}>
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#A3A3A3]">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Chevron for items with sub-pages */}
                  {!sidebarCollapsed && isInvestigation && (
                    <ChevronDown
                      size={14}
                      className={cn(
                        'shrink-0 transition-transform duration-200 text-[#A3A3A3]',
                        isInvestigationActive && 'rotate-180 text-[var(--rarity-fine)]',
                      )}
                    />
                  )}
                  {!sidebarCollapsed && isArmory && (
                    <ChevronDown
                      size={14}
                      className={cn(
                        'shrink-0 transition-transform duration-200 text-[#A3A3A3]',
                        isArmoryActive && 'rotate-180 text-[#FFD700]',
                      )}
                    />
                  )}

                  {/* Tooltip when collapsed */}
                  {sidebarCollapsed && (
                    <div
                      className={cn(
                        'pointer-events-none absolute left-full ml-3 whitespace-nowrap',
                        'rounded-md bg-[var(--bg-panel-primary)] px-2.5 py-1.5 text-xs font-semibold text-white',
                        'border border-[var(--border-subtle)] shadow-xl',
                        'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                        'z-50',
                      )}
                      role="tooltip"
                    >
                      {item.label}
                    </div>
                  )}
                </button>

                {/* Hunter's Armory sub-nav (Gold Theme) */}
                {isArmory && isArmoryActive && !sidebarCollapsed && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {armorySubNav.map((sub) => {
                      const isSubActive = sub.path === '/armory'
                        ? pathname === '/armory'
                        : pathname.startsWith('/armory/planner') || pathname.startsWith('/build-planner');
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => { navigate(sub.path); setMobileMenuOpen(false); }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-r-lg rounded-l-none pl-11 pr-4 py-2 text-left text-xs transition-all duration-300 ease-out border-y border-r',
                            isSubActive
                              ? 'bg-[var(--bg-panel-primary)] border-[#FFD700]/50 text-[#FFD700] font-bold translate-x-1 shadow-sm'
                              : 'border-transparent bg-transparent text-[#A3A3A3] hover:bg-white/5 hover:text-white hover:translate-x-0.5',
                          )}
                        >
                          <SubIcon size={14} className={cn('shrink-0 transition-colors', isSubActive ? 'text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.45)]' : '')} />
                          <span className={cn(isSubActive ? 'drop-shadow-sm' : '')}>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Investigation Notes sub-nav (Fine Quality Theme) */}
                {isInvestigation && isInvestigationActive && !sidebarCollapsed && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {investigationSubNav.map((sub) => {
                      const isSubActive = pathname === sub.path;
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => { navigate(sub.path); setMobileMenuOpen(false); }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-r-lg rounded-l-none pl-11 pr-4 py-2 text-left text-xs transition-all duration-300 ease-out border-y border-r',
                            isSubActive
                              ? 'bg-[var(--bg-fine)] border-[var(--rarity-fine)]/50 text-[var(--rarity-fine)] font-bold translate-x-1 shadow-sm'
                              : 'border-transparent bg-transparent text-[#A3A3A3] hover:bg-white/5 hover:text-white hover:translate-x-0.5',
                          )}
                        >
                          <SubIcon size={14} className={cn('shrink-0 transition-colors', isSubActive ? 'text-[var(--rarity-fine)] drop-shadow-[0_0_8px_rgba(117,182,112,0.45)]' : '')} />
                          <span className={cn(isSubActive ? 'drop-shadow-sm' : '')}>{sub.label}</span>
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
        <div className="hidden shrink-0 border-t border-[var(--border-subtle)] p-3 lg:block">
          <button
            id="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2',
              'text-xs font-medium text-[#A3A3A3] transition-all duration-200',
              'hover:bg-white/5 hover:text-white',
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
