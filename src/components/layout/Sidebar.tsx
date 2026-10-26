import { useState } from 'react';
import {
  Home,
  Sword,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  UserCheck,
  Cat,
  Settings,
  LogIn,
  LogOut,
  User,
  LayoutGrid,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import { cn } from '../../lib/utils';
import LoginModal from '../auth/LoginModal';

interface SubNavItem {
  id: string;
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  onClick?: () => void;
  adminOnly?: boolean;
}

interface NavSection {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
  theme: 'standard' | 'fine';
  subItems: SubNavItem[];
}

export default function Sidebar() {
  const {
    sidebarCollapsed,
    mobileMenuOpen,
    toggleSidebar,
    setMobileMenuOpen,
  } = useUIStore();

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuthStore();
  const isAdmin = useAuthStore(selectIsAdmin);
  const resetBuild = useBuildPlannerStore((s) => s.resetBuild);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const isLoggedIn = !!user;
  const displayName = profile?.display_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'Hunter';
  const avatarUrl = profile?.avatar_url ?? null;

  // Derive active states
  const isHomeActive = pathname === '/' || pathname === '/settings' || pathname.startsWith('/admin');
  const isArmoryActive = pathname.startsWith('/armory') || pathname.startsWith('/build-planner');
  const isGalleryActive = pathname.startsWith('/gallery');
  const isChallengesActive = pathname.startsWith('/challenges');

  const navSections: NavSection[] = [
    {
      id: 'home',
      path: '/',
      label: 'Home',
      icon: Home,
      description: isLoggedIn ? displayName : 'Welcome to Field Guide',
      theme: 'standard',
      subItems: [
        {
          id: 'home-root',
          path: '/',
          label: 'Home',
          icon: Home,
          onClick: () => {
            navigate('/');
            setMobileMenuOpen(false);
          },
        },
        ...(isLoggedIn
          ? [
              {
                id: 'home-settings',
                path: '/settings',
                label: 'Profile & Settings',
                icon: Settings,
                onClick: () => {
                  navigate('/settings');
                  setMobileMenuOpen(false);
                },
              },
            ]
          : [
              {
                id: 'home-login',
                label: 'Login',
                icon: LogIn,
                onClick: () => {
                  setLoginModalOpen(true);
                  setMobileMenuOpen(false);
                },
              },
            ]),
        ...(isAdmin
          ? [
              {
                id: 'home-admin',
                path: '/admin',
                label: 'Admin Panel',
                icon: ShieldAlert,
                adminOnly: true,
                onClick: () => {
                  navigate('/admin/monsters');
                  setMobileMenuOpen(false);
                },
              },
            ]
          : []),
        ...(isLoggedIn
          ? [
              {
                id: 'home-logout',
                label: 'Logout',
                icon: LogOut,
                onClick: () => {
                  signOut();
                  setMobileMenuOpen(false);
                },
              },
            ]
          : []),
      ],
    },
    {
      id: 'armory',
      path: '/armory',
      label: "Hunter's Armory",
      icon: Shield,
      description: 'Builds, Planner & Armour',
      theme: 'standard',
      subItems: [
        {
          id: 'armory-builds',
          path: '/armory',
          label: 'Community Builds',
          icon: LayoutGrid,
          onClick: () => {
            navigate('/armory');
            setMobileMenuOpen(false);
          },
        },
        {
          id: 'armory-planner',
          path: '/armory/planner',
          label: 'Build Planner',
          icon: Sword,
          onClick: () => {
            resetBuild();
            navigate('/armory/planner');
            setMobileMenuOpen(false);
          },
        },
        {
          id: 'armory-armour',
          path: '/armory/armour',
          label: 'Armour',
          icon: Shield,
          onClick: () => {
            navigate('/armory/armour');
            setMobileMenuOpen(false);
          },
        },
      ],
    },
    {
      id: 'gallery',
      path: '/gallery',
      label: 'Gallery',
      icon: Sparkles,
      description: 'Visage Sets & Collection',
      theme: 'fine',
      subItems: [
        {
          id: 'gallery-sets',
          path: '/gallery',
          label: 'Visage Sets',
          icon: Sparkles,
          onClick: () => {
            navigate('/gallery');
            setMobileMenuOpen(false);
          },
        },
        {
          id: 'gallery-collection',
          path: '/gallery/collection',
          label: 'Visage Collection',
          icon: BookMarked,
          onClick: () => {
            navigate('/gallery/collection');
            setMobileMenuOpen(false);
          },
        },
      ],
    },
    {
      id: 'challenges',
      path: '/challenges',
      label: 'Challenges',
      icon: Target,
      description: 'Hunter Goals & Records',
      theme: 'standard',
      subItems: [
        {
          id: 'challenges-my',
          path: '/challenges',
          label: 'My Challenges',
          icon: Target,
          onClick: () => {
            navigate('/challenges');
            setMobileMenuOpen(false);
          },
        },
        {
          id: 'challenges-adventurers',
          path: '/challenges/adventurers',
          label: 'Adventurer',
          icon: UserCheck,
          onClick: () => {
            navigate('/challenges/adventurers');
            setMobileMenuOpen(false);
          },
        },
        {
          id: 'challenges-buddies',
          path: '/challenges/buddies',
          label: 'Buddies',
          icon: Cat,
          onClick: () => {
            navigate('/challenges/buddies');
            setMobileMenuOpen(false);
          },
        },
        {
          id: 'challenges-weapons',
          path: '/challenges/weapons',
          label: 'Weapons',
          icon: Sword,
          onClick: () => {
            navigate('/challenges/weapons');
            setMobileMenuOpen(false);
          },
        },
      ],
    },
  ];

  const getSectionIsActive = (sectionId: string) => {
    switch (sectionId) {
      case 'home':
        return isHomeActive;
      case 'armory':
        return isArmoryActive;
      case 'gallery':
        return isGalleryActive;
      case 'challenges':
        return isChallengesActive;
      default:
        return false;
    }
  };

  const isSectionOpen = (sectionId: string, isActive: boolean) => {
    if (openSections[sectionId] !== undefined) {
      return openSections[sectionId];
    }
    return isActive;
  };

  const handleSectionClick = (section: NavSection) => {
    const isActive = getSectionIsActive(section.id);
    // If not open, open it
    setOpenSections((prev) => ({ ...prev, [section.id]: true }));
    setMobileMenuOpen(false);
    navigate(section.path);
    if (section.id === 'home' && isActive) {
      // Toggle if already at home
      setOpenSections((prev) => ({ ...prev, [section.id]: !isSectionOpen(section.id, isActive) }));
    }
  };

  const toggleSectionChevron = (sectionId: string, isActive: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = isSectionOpen(sectionId, isActive);
    setOpenSections((prev) => ({ ...prev, [sectionId]: !current }));
  };

  const getSubItemIsActive = (sub: SubNavItem, sectionId: string) => {
    if (!sub.path) return false;
    if (sectionId === 'home') {
      if (sub.path === '/') return pathname === '/';
      if (sub.path === '/settings') return pathname === '/settings';
      if (sub.path === '/admin') return pathname.startsWith('/admin');
    }
    if (sectionId === 'armory') {
      if (sub.path === '/armory') return pathname === '/armory' || pathname === '/armory/builds';
      if (sub.path === '/armory/planner') return pathname.startsWith('/armory/planner') || pathname.startsWith('/build-planner');
      if (sub.path === '/armory/armour') return pathname.startsWith('/armory/armour');
    }
    if (sectionId === 'gallery') {
      if (sub.path === '/gallery') return pathname === '/gallery' || pathname === '/gallery/sets';
      if (sub.path === '/gallery/collection') return pathname.startsWith('/gallery/collection');
    }
    if (sectionId === 'challenges') {
      if (sub.path === '/challenges') return pathname === '/challenges';
      if (sub.path === '/challenges/adventurers') return pathname.startsWith('/challenges/adventurers');
      if (sub.path === '/challenges/buddies') return pathname.startsWith('/challenges/buddies');
      if (sub.path === '/challenges/weapons') return pathname.startsWith('/challenges/weapons');
    }
    return pathname === sub.path;
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
          {navSections.map((section) => {
            const isActive = getSectionIsActive(section.id);
            const isOpen = isSectionOpen(section.id, isActive);
            const isHome = section.id === 'home';
            const isGallery = section.id === 'gallery';
            const FallbackIcon = section.icon;

            return (
              <div key={section.id}>
                {/* Top-level Section Button */}
                <button
                  id={`nav-${section.id}`}
                  onClick={() => handleSectionClick(section)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-r-xl rounded-l-none px-4 py-3',
                    'border-y border-r transition-all duration-300 ease-out',
                    isActive
                      ? isGallery
                        ? 'bg-[var(--bg-fine)] border-[var(--rarity-fine)]/50 shadow-md shadow-black/50 text-[var(--rarity-fine)] translate-x-1'
                        : 'bg-[var(--bg-panel-primary)] border-[var(--border-active)] shadow-md shadow-black/50 text-[#FFD700] translate-x-1'
                      : 'border-transparent bg-transparent text-[#A3A3A3] hover:bg-white/5 hover:text-white hover:translate-x-0.5',
                    sidebarCollapsed && 'justify-center px-0 rounded-none border-none translate-x-0',
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && !sidebarCollapsed && (
                    <span
                      className={cn(
                        'absolute left-0 top-0 bottom-0 w-1 rounded-r-sm',
                        isGallery
                          ? 'bg-[var(--rarity-fine)] shadow-[0_0_10px_rgba(117,182,112,0.5)]'
                          : 'bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.5)]'
                      )}
                      aria-hidden="true"
                    />
                  )}
                  {isActive && sidebarCollapsed && (
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full',
                        isGallery ? 'bg-[var(--rarity-fine)]' : 'bg-mh-gold-400 glow-gold'
                      )}
                      aria-hidden="true"
                    />
                  )}

                  {/* Icon: avatar image for Home if logged in, otherwise default section icon */}
                  {isHome && isLoggedIn ? (
                    <div className="relative shrink-0 flex items-center justify-center">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className={cn(
                            'h-6 w-6 rounded-full object-cover transition-transform',
                            isActive ? 'ring-2 ring-[#FFD700]' : 'ring-1 ring-white/20 group-hover:ring-[#FFD700]/70'
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD700]/15 ring-1 text-[#FFD700]',
                            isActive ? 'ring-[#FFD700]' : 'ring-[#FFD700]/40'
                          )}
                        >
                          <User size={13} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <FallbackIcon
                      size={20}
                      className={cn(
                        'shrink-0 transition-colors duration-300',
                        isActive
                          ? isGallery
                            ? 'text-[var(--rarity-fine)] drop-shadow-[0_0_8px_rgba(117,182,112,0.45)]'
                            : 'text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.45)]'
                          : 'text-[#A3A3A3] group-hover:text-white',
                      )}
                    />
                  )}

                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1 text-left">
                      <p
                        className={cn(
                          'text-sm font-bold tracking-wide transition-colors truncate',
                          isActive
                            ? isGallery
                              ? 'text-[var(--rarity-fine)] drop-shadow-sm'
                              : 'text-[#FFD700] drop-shadow-sm'
                            : '',
                        )}
                      >
                        {section.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#A3A3A3] truncate">
                        {section.description}
                      </p>
                    </div>
                  )}

                  {/* Expand / Collapse Chevron */}
                  {!sidebarCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => toggleSectionChevron(section.id, isActive, e)}
                      className="p-1 text-[#A3A3A3] hover:text-white transition-colors"
                      aria-label={isOpen ? `Collapse ${section.label}` : `Expand ${section.label}`}
                    >
                      <ChevronDown
                        size={14}
                        className={cn(
                          'shrink-0 transition-transform duration-200',
                          isOpen && 'rotate-180',
                          isActive
                            ? isGallery
                              ? 'text-[var(--rarity-fine)]'
                              : 'text-[#FFD700]'
                            : 'text-[#A3A3A3]'
                        )}
                      />
                    </button>
                  )}

                  {/* Tooltip when sidebar is collapsed */}
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
                      {section.label} {isHome && isLoggedIn ? `(${displayName})` : ''}
                    </div>
                  )}
                </button>

                {/* Sub-nav Links */}
                {isOpen && !sidebarCollapsed && (
                  <div className="mt-1 flex flex-col gap-0.5 animate-fadeIn">
                    {section.subItems.map((sub) => {
                      const isSubActive = getSubItemIsActive(sub, section.id);
                      const SubIcon = sub.icon;

                      return (
                        <button
                          key={sub.id}
                          onClick={sub.onClick}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-r-lg rounded-l-none pl-11 pr-4 py-2 text-left text-xs transition-all duration-300 ease-out border-y border-r',
                            isSubActive
                              ? isGallery
                                ? 'bg-[var(--bg-fine)] border-[var(--rarity-fine)]/50 text-[var(--rarity-fine)] font-bold translate-x-1 shadow-sm'
                                : 'bg-[var(--bg-panel-primary)] border-[#FFD700]/50 text-[#FFD700] font-bold translate-x-1 shadow-sm'
                              : 'border-transparent bg-transparent text-[#A3A3A3] hover:bg-white/5 hover:text-white hover:translate-x-0.5',
                          )}
                        >
                          <SubIcon
                            size={14}
                            className={cn(
                              'shrink-0 transition-colors',
                              isSubActive
                                ? isGallery
                                  ? 'text-[var(--rarity-fine)] drop-shadow-[0_0_8px_rgba(117,182,112,0.45)]'
                                  : 'text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.45)]'
                                : 'text-[#A3A3A3]'
                            )}
                          />
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

      {/* Login Modal for guest hunter login trigger */}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  );
}
