// ─────────────────────────────────────────────────────────────
// MainNav.tsx — Icon-button main navigation.
//
// Layout (pure CSS, see "MAIN NAVIGATION" in index.css):
//   • Desktop / mobile landscape → floating rail on the LEFT
//   • Mobile portrait            → floating bar at the BOTTOM
// The active item is lifted out of the bar in a notched bubble.
// Tap the active item, or press-and-hold any item, to open its sub-menu.
// Hold → slide your thumb onto a page → release to go there.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
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
  Home,
  LayoutGrid,
  BookMarked,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import { cn } from '../../lib/utils';
import LoginModal from '../auth/LoginModal';

interface SubNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onSelect: () => void;
}

interface NavSection {
  id: string;
  path: string;
  label: string;
  description: string;
  iconSrc: string;
  // The source artwork has different amounts of transparent padding; zoom normalises the visual size.
  iconZoom: number;
  accent: 'superior' | 'epic' | 'fine' | 'rare';
  active: boolean;
  subItems: SubNavItem[];
}

const HOLD_MS = 350;

export default function MainNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuthStore();
  const isAdmin = useAuthStore(selectIsAdmin);
  const resetBuild = useBuildPlannerStore((s) => s.resetBuild);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [anchorY, setAnchorY] = useState(0);
  const [hoverSubId, setHoverSubId] = useState<string | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const holdCleanup = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);

  const isLoggedIn = !!user;
  const displayName = profile?.display_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'Hunter';

  const go = (path: string) => () => navigate(path);

  const sections: NavSection[] = [
    {
      id: 'home',
      path: '/',
      label: 'Home',
      description: isLoggedIn ? displayName : 'Welcome to Field Guide',
      iconSrc: '/img/ui/Home%20Icon.png',
      iconZoom: 1,
      accent: 'superior',
      active: pathname === '/' || pathname === '/settings' || pathname.startsWith('/admin'),
      subItems: [
        { id: 'home-root', label: 'Home', icon: Home, active: pathname === '/', onSelect: go('/') },
        ...(isLoggedIn
          ? [{ id: 'home-settings', label: 'Profile & Settings', icon: Settings, active: pathname === '/settings', onSelect: go('/settings') }]
          : [{ id: 'home-login', label: 'Login', icon: LogIn, active: false, onSelect: () => setLoginModalOpen(true) }]),
        ...(isAdmin
          ? [{ id: 'home-admin', label: 'Admin Panel', icon: ShieldAlert, active: pathname.startsWith('/admin'), onSelect: go('/admin/monsters') }]
          : []),
        ...(isLoggedIn
          ? [{ id: 'home-logout', label: 'Logout', icon: LogOut, active: false, onSelect: () => signOut() }]
          : []),
      ],
    },
    {
      id: 'armory',
      path: '/armory',
      label: 'Armory',
      description: 'Builds, Planner & Armour',
      iconSrc: '/img/ui/Equipment%20Icon.png',
      iconZoom: 2.1,
      accent: 'epic',
      active: pathname.startsWith('/armory') || pathname.startsWith('/build-planner'),
      subItems: [
        { id: 'armory-builds', label: 'Community Builds', icon: LayoutGrid, active: pathname === '/armory' || pathname === '/armory/builds', onSelect: go('/armory') },
        {
          id: 'armory-planner',
          label: 'Build Planner',
          icon: Sword,
          active: pathname.startsWith('/armory/planner') || pathname.startsWith('/build-planner'),
          onSelect: () => {
            resetBuild();
            navigate('/armory/planner');
          },
        },
        { id: 'armory-armour', label: 'Armour', icon: Shield, active: pathname.startsWith('/armory/armour'), onSelect: go('/armory/armour') },
      ],
    },
    {
      id: 'gallery',
      path: '/gallery',
      label: 'Gallery',
      description: 'Visage Sets & Collection',
      iconSrc: '/img/ui/Visage%20Icon.png',
      iconZoom: 2.1,
      accent: 'fine',
      active: pathname.startsWith('/gallery'),
      subItems: [
        { id: 'gallery-sets', label: 'Visage Sets', icon: Sparkles, active: pathname === '/gallery' || pathname === '/gallery/sets', onSelect: go('/gallery') },
        { id: 'gallery-collection', label: 'Visage Collection', icon: BookMarked, active: pathname.startsWith('/gallery/collection'), onSelect: go('/gallery/collection') },
      ],
    },
    {
      id: 'challenges',
      path: '/challenges',
      label: 'Challenges',
      description: 'Hunter Goals & Records',
      iconSrc: '/img/ui/Challenge%20Icon.png',
      iconZoom: 1,
      accent: 'rare',
      active: pathname.startsWith('/challenges'),
      subItems: [
        { id: 'challenges-my', label: 'My Challenges', icon: Target, active: pathname === '/challenges', onSelect: go('/challenges') },
        { id: 'challenges-adventurers', label: 'Adventurer', icon: UserCheck, active: pathname.startsWith('/challenges/adventurers'), onSelect: go('/challenges/adventurers') },
        { id: 'challenges-buddies', label: 'Buddies', icon: Cat, active: pathname.startsWith('/challenges/buddies'), onSelect: go('/challenges/buddies') },
        { id: 'challenges-weapons', label: 'Weapons', icon: Sword, active: pathname.startsWith('/challenges/weapons'), onSelect: go('/challenges/weapons') },
      ],
    },
  ];

  const openSection = sections.find((s) => s.id === openId) ?? null;

  // Close the sub-menu whenever the route changes (including browser back/forward)
  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]);

  useEffect(() => () => holdCleanup.current?.(), []);

  const openMenu = (section: NavSection) => {
    const rect = buttonRefs.current[section.id]?.getBoundingClientRect();
    if (rect) setAnchorY(rect.top + rect.height / 2);
    setOpenId(section.id);
  };

  const subIdAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sub-id]')?.dataset.subId ?? null;

  // Press-and-hold: open the menu, track the pointer over its items, select on release
  const handlePointerDown = (section: NavSection, e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    holdCleanup.current?.();

    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      suppressClick.current = true;
      openMenu(section);
      navigator.vibrate?.(12);
    }, HOLD_MS);

    const onMove = (ev: PointerEvent) => {
      if (fired) setHoverSubId(subIdAt(ev.clientX, ev.clientY));
    };
    const onEnd = (ev: PointerEvent) => {
      cleanup();
      setHoverSubId(null);
      if (!fired) return;
      // Swallow the click that follows a long press
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 50);
      if (ev.type !== 'pointerup') return;
      const sub = section.subItems.find((item) => item.id === subIdAt(ev.clientX, ev.clientY));
      if (sub) {
        setOpenId(null);
        sub.onSelect();
      }
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      holdCleanup.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    holdCleanup.current = cleanup;
  };

  const handleSectionClick = (section: NavSection) => {
    if (suppressClick.current) return;
    if (!section.active) {
      setOpenId(null);
      navigate(section.path);
      return;
    }
    if (openId === section.id) {
      setOpenId(null);
      return;
    }
    openMenu(section);
  };

  return (
    <>
      {openSection && <div className="main-nav-scrim" onClick={() => setOpenId(null)} aria-hidden="true" />}

      <nav className="main-nav" aria-label="Main navigation">
        <span className="main-nav__surface" aria-hidden="true" />

        <button
          type="button"
          className="main-nav__brand"
          onClick={() => navigate('/')}
          aria-label="Field Guide home"
        >
          <img src="/favicon.png" alt="" className="h-9 w-9 object-contain drop-shadow-md" />
        </button>

        <ul className="main-nav__items">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                id={`nav-${section.id}`}
                ref={(el) => {
                  buttonRefs.current[section.id] = el;
                }}
                className="main-nav__btn"
                data-active={section.active}
                data-accent={section.accent}
                aria-label={section.label}
                aria-current={section.active ? 'page' : undefined}
                aria-haspopup={section.active ? 'menu' : undefined}
                aria-expanded={section.active ? openId === section.id : undefined}
                onClick={() => handleSectionClick(section)}
                onPointerDown={(e) => handlePointerDown(section, e)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className="main-nav__bubble">
                  <span className="main-nav__icon">
                    <img
                      src={section.iconSrc}
                      alt=""
                      draggable={false}
                      style={{ transform: `scale(${section.iconZoom})` }}
                    />
                  </span>
                  {section.active && (
                    <ChevronUp
                      size={10}
                      strokeWidth={3}
                      className={cn('main-nav__more', openId === section.id && 'is-open')}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="main-nav__tip" role="tooltip">
                  {section.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {openSection && (
        <div
          role="menu"
          aria-label={openSection.label}
          className="main-nav-submenu"
          data-accent={openSection.accent}
          style={{ '--anchor-y': `${anchorY}px` } as React.CSSProperties}
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="font-display text-sm font-bold leading-none tracking-wide text-[var(--nav-accent)]">
              {openSection.label}
            </p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-widest text-[#A3A3A3]">
              {openSection.description}
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            {openSection.subItems.map((sub) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="menuitem"
                  data-sub-id={sub.id}
                  onClick={() => {
                    setOpenId(null);
                    sub.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    sub.active
                      ? 'border-[var(--nav-accent)]/50 bg-[var(--bg-panel-primary)] font-bold text-[var(--nav-accent)]'
                      : 'border-transparent text-[#A3A3A3] hover:bg-white/5 hover:text-white',
                    hoverSubId === sub.id && '!border-[var(--nav-accent)] !bg-white/10 !text-white',
                  )}
                >
                  <SubIcon size={16} className="shrink-0" />
                  <span className="truncate">{sub.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  );
}
