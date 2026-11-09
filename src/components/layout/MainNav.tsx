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
  Layers,
  ChevronUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import { useVisageBuilderStore } from '../../store/visageBuilderStore';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES, themeToNavAccent } from '../../config/themes';
import { cn } from '../../lib/utils';
import LoginModal from '../auth/LoginModal';
import FeedbackModal from '../feedback/FeedbackModal';
import { useAdminFeedbackCount } from '../../hooks/useAdminFeedback';

interface SubNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Optional artwork that replaces the Lucide icon */
  iconSrc?: string;
  active: boolean;
  onSelect: () => void;
  badge?: number;
}

interface NavSection {
  id: string;
  path: string;
  label: string;
  description: string;
  iconSrc: string;
  // Full-bleed artwork is scaled down slightly so it fits inside the round bubble.
  iconZoom: number;
  accent: 'superior' | 'epic' | 'fine' | 'rare';
  active: boolean;
  subItems: SubNavItem[];
}

const HOLD_MS = 350;

const COOKIE_PAGE_VIEWS = 'fg_page_views';
const COOKIE_FEEDBACK_PROMPT_DISMISSED = 'fg_feedback_prompt_dismissed';
const COOKIE_FEEDBACK_TARGET_VIEWS = 'fg_feedback_target_views';

const INITIAL_TARGET_VIEWS = 10;
const LATER_INCREMENT = 30;
const PROMPT_DELAY_MS = 3000;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export default function MainNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuthStore();
  const isAdmin = useAuthStore(selectIsAdmin);
  const challengesTheme = useUIStore((s) => s.sectionThemes['/challenges'] ?? DEFAULT_SECTION_THEMES['/challenges']);
  const armoryTheme = useUIStore((s) => s.sectionThemes['/armory'] ?? DEFAULT_SECTION_THEMES['/armory']);
  const galleryTheme = useUIStore((s) => s.sectionThemes['/gallery'] ?? DEFAULT_SECTION_THEMES['/gallery']);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const lastPathRef = useRef<string | null>(null);
  const { data: unreadCount = 0 } = useAdminFeedbackCount();
  const [openId, setOpenId] = useState<string | null>(null);
  const [anchorY, setAnchorY] = useState(0);
  const [hoverSubId, setHoverSubId] = useState<string | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const holdCleanup = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);

  // Track page views on unique route changes; show feedback popover on 10th page (or next target if 'Later' chosen)
  useEffect(() => {
    if (getCookie(COOKIE_FEEDBACK_PROMPT_DISMISSED) === '1') {
      return;
    }

    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;

      const currentViews = parseInt(getCookie(COOKIE_PAGE_VIEWS) || '0', 10) + 1;
      setCookie(COOKIE_PAGE_VIEWS, String(currentViews), 365);

      const rawTarget = parseInt(getCookie(COOKIE_FEEDBACK_TARGET_VIEWS) || '0', 10);
      const targetViews = rawTarget >= INITIAL_TARGET_VIEWS ? rawTarget : INITIAL_TARGET_VIEWS;

      if (currentViews >= targetViews) {
        const timer = window.setTimeout(() => {
          setShowFeedbackPrompt(true);
        }, PROMPT_DELAY_MS);
        return () => window.clearTimeout(timer);
      }
    }
  }, [pathname]);

  const dismissPermanently = () => {
    setShowFeedbackPrompt(false);
    setCookie(COOKIE_FEEDBACK_PROMPT_DISMISSED, '1', 365);
  };

  const handleLater = () => {
    setShowFeedbackPrompt(false);
    const currentViews = parseInt(getCookie(COOKIE_PAGE_VIEWS) || '0', 10);
    const nextTarget = currentViews + LATER_INCREMENT;
    setCookie(COOKIE_FEEDBACK_TARGET_VIEWS, String(nextTarget), 365);
  };

  const handleOpenFeedbackFromPrompt = () => {
    dismissPermanently();
    setFeedbackModalOpen(true);
  };

  const handleFeedbackButtonClick = () => {
    if (showFeedbackPrompt) {
      dismissPermanently();
    }
    setFeedbackModalOpen(true);
  };

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
          ? [{
              id: 'home-admin',
              label: 'Admin Panel',
              icon: ShieldAlert,
              active: pathname.startsWith('/admin'),
              onSelect: go('/admin/feedback'),
              badge: unreadCount > 0 ? unreadCount : undefined,
            }]
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
      iconZoom: 0.85,
      accent: themeToNavAccent(armoryTheme),
      active: pathname.startsWith('/armory') || pathname.startsWith('/build-planner'),
      subItems: [
        { id: 'armory-builds', label: 'Community Builds', icon: LayoutGrid, active: pathname === '/armory' || pathname === '/armory/builds', onSelect: go('/armory') },
        {
          id: 'armory-planner',
          label: 'Build Planner',
          icon: Sword,
          active: pathname.startsWith('/armory/planner') || pathname.startsWith('/build-planner'),
          onSelect: () => {
            // Keep the hunter's in-progress build; "Clear / Start New" is the explicit reset
            const { buildId } = useBuildPlannerStore.getState();
            navigate(buildId ? `/armory/planner/${buildId}` : '/armory/planner');
          },
        },
        { id: 'armory-armour', label: 'Armour', icon: Shield, iconSrc: '/img/ui/Equipment%20Icon.png', active: pathname.startsWith('/armory/armour'), onSelect: go('/armory/armour') },
      ],
    },
    {
      id: 'gallery',
      path: '/gallery',
      label: 'Gallery',
      description: 'Visage Sets & Collection',
      iconSrc: '/img/ui/Visage%20Icon.png',
      iconZoom: 0.85,
      accent: themeToNavAccent(galleryTheme),
      active: pathname.startsWith('/gallery'),
      subItems: [
        { id: 'gallery-sets', label: 'Visage Sets', icon: Sparkles, active: pathname === '/gallery' || pathname === '/gallery/sets', onSelect: go('/gallery') },
        {
          id: 'gallery-builder',
          label: 'Build Set',
          icon: Layers,
          active: pathname.startsWith('/gallery/set'),
          onSelect: () => {
            const { buildId } = useVisageBuilderStore.getState();
            navigate(buildId ? `/gallery/set?build=${buildId}` : '/gallery/set');
          },
        },
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
      accent: themeToNavAccent(challengesTheme),
      active: pathname.startsWith('/challenges'),
      subItems: [
        { id: 'challenges-my', label: 'My Challenges', icon: Target, active: pathname === '/challenges', onSelect: go('/challenges') },
        { id: 'challenges-adventurers', label: 'Adventurer', icon: UserCheck, iconSrc: '/img/ui/Adventurer%20Icon.png', active: pathname.startsWith('/challenges/adventurers'), onSelect: go('/challenges/adventurers') },
        { id: 'challenges-buddies', label: 'Buddies', icon: Cat, iconSrc: '/img/ui/Buddy%20Icon.png', active: pathname.startsWith('/challenges/buddies'), onSelect: go('/challenges/buddies') },
        { id: 'challenges-weapons', label: 'Weapons', icon: Sword, iconSrc: '/img/ui/Weapons%20Icon.png', active: pathname.startsWith('/challenges/weapons'), onSelect: go('/challenges/weapons') },
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
                  {section.id === 'home' && isAdmin && unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 z-20 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-md ring-2 ring-[#232328] animate-pulse"
                      title={`${unreadCount} new feedback message${unreadCount > 1 ? 's' : ''}`}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
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

        {/* Footer / Utility action: Bottom on desktop rail, far right on mobile bottom bar */}
        <div className="main-nav__footer">
          <div className="main-nav__footer-divider" aria-hidden="true" />
          <button
            type="button"
            id="nav-feedback"
            className="main-nav__btn"
            data-active={feedbackModalOpen}
            data-accent="rare"
            aria-label="Send Feedback & Bug Reports"
            onClick={handleFeedbackButtonClick}
          >
            <span className="main-nav__bubble">
              <span className="main-nav__icon">
                <img
                  src="/img/ui/BtnIcon_Chat.png"
                  alt="Feedback"
                  draggable={false}
                  style={{ transform: 'scale(0.85)' }}
                />
              </span>
            </span>
            <span className="main-nav__tip" role="tooltip">
              Feedback & Bugs
            </span>
          </button>

          {/* Feedback callout popup */}
          {showFeedbackPrompt && !feedbackModalOpen && (
            <div
              role="dialog"
              aria-label="Feedback prompt"
              className="main-nav-feedback-popover animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="main-nav-feedback-popover__arrow" aria-hidden="true" />
              <div className="relative flex flex-col gap-2 rounded-2xl border border-mh-gold-500/60 bg-mh-slate-900/98 p-3 shadow-2xl backdrop-blur-md ring-1 ring-mh-gold-500/20 max-w-[300px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mh-gold-500/15 ring-1 ring-mh-gold-500/30 p-1">
                      <img
                        src="/img/ui/BtnIcon_Chat.png"
                        alt=""
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    </div>
                    <p className="text-xs font-semibold text-white leading-tight">
                      Please give us feedback on the site.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={dismissPermanently}
                    className="-mr-1 -mt-1 rounded-lg p-1 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                    title="Don't ask again"
                    aria-label="Don't ask again"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2 pl-9">
                  <button
                    type="button"
                    onClick={handleOpenFeedbackFromPrompt}
                    className="rounded-lg bg-mh-gold-500 px-3 py-1 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Give Feedback
                  </button>
                  <button
                    type="button"
                    onClick={handleLater}
                    className="rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-2.5 py-1 text-xs font-medium text-mh-slate-300 hover:bg-mh-slate-700 hover:text-white transition-colors whitespace-nowrap"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
                  {sub.iconSrc ? (
                    <img src={sub.iconSrc} alt="" draggable={false} className="h-5 w-5 shrink-0 object-contain" />
                  ) : (
                    <SubIcon size={16} className="shrink-0" />
                  )}
                  <span className="truncate">{sub.label}</span>
                  {sub.badge !== undefined && sub.badge > 0 && (
                    <span className="ml-auto rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/40">
                      {sub.badge > 99 ? '99+' : sub.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <FeedbackModal open={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />
    </>
  );
}
