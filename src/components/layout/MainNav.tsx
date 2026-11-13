// ─────────────────────────────────────────────────────────────
// MainNav.tsx — Icon-button main navigation.
//
// Layout (pure CSS, see "MAIN NAVIGATION" in index.css):
//   • Desktop / mobile landscape → floating rail on the LEFT
//   • Mobile portrait            → floating bar at the BOTTOM
// The active item is lifted out of the bar in a notched bubble.
// Click any item to open its sub-menu.
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
  LayoutGrid,
  BookMarked,
  Layers,
  ChevronUp,
  X,
  ScrollText,
  Eye,
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
  iconZoom?: number;
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

interface BarNavItem {
  id: string;
  label: string;
  iconSrc: string;
  iconZoom?: number;
  accent: 'superior' | 'epic' | 'fine' | 'rare';
  active: boolean;
  section?: NavSection;
  onSelect?: () => void;
  badge?: number;
}

function useNavCapacity(navRef: React.RefObject<HTMLElement | null>): number {
  const [capacity, setCapacity] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const isPortrait = window.matchMedia('(max-width: 1023px) and (orientation: portrait)').matches;
    if (isPortrait) {
      const w = window.innerWidth;
      if (w >= 860) return 8;
      if (w >= 800) return 7;
      if (w >= 740) return 6;
      if (w >= 680) return 5;
      if (w >= 620) return 4;
      if (w >= 560) return 3;
      if (w >= 500) return 2;
      if (w >= 440) return 1;
      return 0;
    } else {
      const h = window.innerHeight;
      if (h >= 880) return 8;
      if (h >= 820) return 7;
      if (h >= 760) return 6;
      if (h >= 700) return 5;
      if (h >= 640) return 4;
      if (h >= 580) return 3;
      if (h >= 520) return 2;
      if (h >= 460) return 1;
      return 0;
    }
  });

  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      const isPortrait = window.matchMedia('(max-width: 1023px) and (orientation: portrait)').matches;

      if (isPortrait) {
        const w = navRef.current?.clientWidth || window.innerWidth;
        if (w >= 860) setCapacity(8);
        else if (w >= 800) setCapacity(7);
        else if (w >= 740) setCapacity(6);
        else if (w >= 680) setCapacity(5);
        else if (w >= 620) setCapacity(4);
        else if (w >= 560) setCapacity(3);
        else if (w >= 500) setCapacity(2);
        else if (w >= 440) setCapacity(1);
        else setCapacity(0);
      } else {
        const h = navRef.current?.clientHeight || window.innerHeight;
        if (h >= 880) setCapacity(8);
        else if (h >= 820) setCapacity(7);
        else if (h >= 760) setCapacity(6);
        else if (h >= 700) setCapacity(5);
        else if (h >= 640) setCapacity(4);
        else if (h >= 580) setCapacity(3);
        else if (h >= 520) setCapacity(2);
        else if (h >= 460) setCapacity(1);
        else setCapacity(0);
      }
    };

    update();
    window.addEventListener('resize', update);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && navRef.current) {
      ro = new ResizeObserver(() => update());
      ro.observe(navRef.current);
    }

    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [navRef]);

  return capacity;
}

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
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navRef = useRef<HTMLElement | null>(null);
  const capacity = useNavCapacity(navRef);

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

  // Priority order for spill-out items:
  // 1 - Weapons (/challenges/weapons) — spills out first, returns last.
  // 2 - Visage Collection (/gallery/collection)
  // 3 - Armour (/armory/armour)
  // 4 - Buddies (/challenges/buddies)
  // 5 - Build Set (/gallery/set)
  // 6 - Build Planner (/armory/planner)
  // 7 - Adventurer (/challenges/adventurers)
  // 8 - Game Updates (/updates) — spills out last, returns first.
  const isWeaponsSpilled = capacity >= 1;
  const isVisageSpilled = capacity >= 2;
  const isArmourSpilled = capacity >= 3;
  const isBuddiesSpilled = capacity >= 4;
  const isBuildSetSpilled = capacity >= 5;
  const isBuildPlannerSpilled = capacity >= 6;
  const isAdventurerSpilled = capacity >= 7;
  const isUpdatesSpilled = capacity >= 8;

  const isWeaponsActive = pathname.startsWith('/challenges/weapons');
  const isVisageActive = pathname.startsWith('/gallery/collection');
  const isArmourActive = pathname.startsWith('/armory/armour');
  const isBuddiesActive = pathname.startsWith('/challenges/buddies');
  const isBuildSetActive = pathname.startsWith('/gallery/set');
  const isBuildPlannerActive = pathname.startsWith('/armory/planner') || pathname.startsWith('/build-planner');
  const isAdventurerActive = pathname.startsWith('/challenges/adventurers');
  const isUpdatesActive = pathname === '/updates';

  const isChallengesChildSpilledAndActive =
    (isWeaponsSpilled && isWeaponsActive) ||
    (isBuddiesSpilled && isBuddiesActive) ||
    (isAdventurerSpilled && isAdventurerActive);

  const isGalleryChildSpilledAndActive =
    (isVisageSpilled && isVisageActive) ||
    (isBuildSetSpilled && isBuildSetActive);

  const isArmoryChildSpilledAndActive =
    (isArmourSpilled && isArmourActive) ||
    (isBuildPlannerSpilled && isBuildPlannerActive);

  const challengesActive = pathname.startsWith('/challenges') && !isChallengesChildSpilledAndActive;
  const galleryActive = pathname.startsWith('/gallery') && !isGalleryChildSpilledAndActive;
  const armoryActive = (pathname.startsWith('/armory') || pathname.startsWith('/build-planner')) && !isArmoryChildSpilledAndActive;
  const homeActive = (pathname === '/' || pathname === '/updates' || pathname === '/settings' || pathname === '/spoilers' || pathname.startsWith('/admin')) && !(isUpdatesSpilled && isUpdatesActive);

  const homeSection: NavSection = {
    id: 'home',
    path: '/',
    label: 'Home',
    description: isLoggedIn ? displayName : 'Welcome to Field Guide',
    iconSrc: '/img/ui/Home%20Icon.png',
    iconZoom: 1,
    accent: 'superior',
    active: homeActive,
    subItems: [
      ...(!isUpdatesSpilled
        ? [{ id: 'home-updates', label: 'Game Updates', icon: ScrollText, iconSrc: '/img/ui/game_updates.png', active: isUpdatesActive, onSelect: go('/updates') }]
        : []),
      ...(isLoggedIn
        ? [{ id: 'home-settings', label: 'Profile & Settings', icon: Settings, iconSrc: '/img/ui/profile_and_settings.png', active: pathname === '/settings', onSelect: go('/settings') }]
        : [{ id: 'home-login', label: 'Login', icon: LogIn, iconSrc: '/img/ui/logout.png', active: false, onSelect: () => setLoginModalOpen(true) }]),
      ...(isLoggedIn && profile?.show_spoilers
        ? [{ id: 'home-spoilers', label: 'Spoilers', icon: Eye, iconSrc: '/img/ui/AggPageIcon_Recruit.png', iconZoom: 0.85, active: pathname === '/spoilers', onSelect: go('/spoilers') }]
        : []),
      ...(isAdmin
        ? [{
            id: 'home-admin',
            label: 'Admin Panel',
            icon: ShieldAlert,
            iconSrc: '/img/ui/adminpanel.png',
            active: pathname.startsWith('/admin'),
            onSelect: go('/admin/feedback'),
            badge: unreadCount > 0 ? unreadCount : undefined,
          }]
        : []),
      ...(isLoggedIn
        ? [{ id: 'home-logout', label: 'Logout', icon: LogOut, iconSrc: '/img/ui/logout.png', active: false, onSelect: () => signOut() }]
        : []),
    ],
  };

  const armorySection: NavSection = {
    id: 'armory',
    path: '/armory',
    label: 'Armory',
    description: 'Builds, Planner & Armour',
    iconSrc: '/img/ui/Equipment%20Icon.png',
    iconZoom: 0.85,
    accent: themeToNavAccent(armoryTheme),
    active: armoryActive,
    subItems: [
      { id: 'armory-builds', label: 'Community Builds', icon: LayoutGrid, iconSrc: '/img/ui/community_builds.png', active: pathname === '/armory' || pathname === '/armory/builds', onSelect: go('/armory') },
      ...(!isBuildPlannerSpilled
        ? [{
            id: 'armory-planner',
            label: 'Build Planner',
            icon: Sword,
            iconSrc: '/img/ui/build_planner.png',
            active: isBuildPlannerActive,
            onSelect: () => {
              const { buildId } = useBuildPlannerStore.getState();
              navigate(buildId ? `/armory/planner/${buildId}` : '/armory/planner');
            },
          }]
        : []),
      ...(!isArmourSpilled
        ? [{ id: 'armory-armour', label: 'Armour', icon: Shield, iconSrc: '/img/ui/Equipment%20Icon.png', iconZoom: 0.75, active: isArmourActive, onSelect: go('/armory/armour') }]
        : []),
    ],
  };

  const gallerySection: NavSection = {
    id: 'gallery',
    path: '/gallery',
    label: 'Gallery',
    description: 'Visage Sets & Collection',
    iconSrc: '/img/ui/Visage%20Icon.png',
    iconZoom: 0.85,
    accent: themeToNavAccent(galleryTheme),
    active: galleryActive,
    subItems: [
      { id: 'gallery-sets', label: 'Visage Sets', icon: Sparkles, iconSrc: '/img/ui/visage_sets.png', active: pathname === '/gallery' || pathname === '/gallery/sets', onSelect: go('/gallery') },
      ...(!isBuildSetSpilled
        ? [{
            id: 'gallery-builder',
            label: 'Build Set',
            icon: Layers,
            iconSrc: '/img/ui/build_set.png',
            active: isBuildSetActive,
            onSelect: () => {
              const { buildId } = useVisageBuilderStore.getState();
              navigate(buildId ? `/gallery/set?build=${buildId}` : '/gallery/set');
            },
          }]
        : []),
      ...(!isVisageSpilled
        ? [{ id: 'gallery-collection', label: 'Visage Collection', icon: BookMarked, iconSrc: '/img/ui/visage_collection.png', active: isVisageActive, onSelect: go('/gallery/collection') }]
        : []),
    ],
  };

  const challengesSection: NavSection = {
    id: 'challenges',
    path: '/challenges',
    label: 'Challenges',
    description: 'Hunter Goals & Records',
    iconSrc: '/img/ui/Challenge%20Icon.png',
    iconZoom: 1,
    accent: themeToNavAccent(challengesTheme),
    active: challengesActive,
    subItems: [
      { id: 'challenges-my', label: 'My Challenges', icon: Target, iconSrc: '/img/ui/my_challenges.png', active: pathname === '/challenges', onSelect: go('/challenges') },
      ...(!isAdventurerSpilled
        ? [{ id: 'challenges-adventurers', label: 'Adventurer', icon: UserCheck, iconSrc: '/img/ui/Adventurer%20Icon.png', active: isAdventurerActive, onSelect: go('/challenges/adventurers') }]
        : []),
      ...(!isBuddiesSpilled
        ? [{ id: 'challenges-buddies', label: 'Buddies', icon: Cat, iconSrc: '/img/ui/Buddy%20Icon.png', iconZoom: 0.75, active: isBuddiesActive, onSelect: go('/challenges/buddies') }]
        : []),
      ...(!isWeaponsSpilled
        ? [{ id: 'challenges-weapons', label: 'Weapons', icon: Sword, iconSrc: '/img/ui/Weapons%20Icon.png', iconZoom: 0.75, active: isWeaponsActive, onSelect: go('/challenges/weapons') }]
        : []),
    ],
  };

  const sections: NavSection[] = [homeSection, armorySection, gallerySection, challengesSection];

  const barItems: BarNavItem[] = [
    {
      id: 'home',
      label: 'Home',
      iconSrc: '/img/ui/Home%20Icon.png',
      iconZoom: 1,
      accent: 'superior',
      active: homeActive,
      section: homeSection,
    },
    ...(isUpdatesSpilled
      ? [
          {
            id: 'home-updates-spill',
            label: 'Game Updates',
            iconSrc: '/img/ui/game_updates.png',
            iconZoom: 0.85,
            accent: 'superior' as const,
            active: isUpdatesActive,
            onSelect: go('/updates'),
          },
        ]
      : []),
    {
      id: 'armory',
      label: 'Armory',
      iconSrc: '/img/ui/Equipment%20Icon.png',
      iconZoom: 0.85,
      accent: themeToNavAccent(armoryTheme),
      active: armoryActive,
      section: armorySection,
    },
    ...(isBuildPlannerSpilled
      ? [
          {
            id: 'armory-planner-spill',
            label: 'Build Planner',
            iconSrc: '/img/ui/build_planner.png',
            iconZoom: 0.85,
            accent: themeToNavAccent(armoryTheme),
            active: isBuildPlannerActive,
            onSelect: () => {
              const { buildId } = useBuildPlannerStore.getState();
              navigate(buildId ? `/armory/planner/${buildId}` : '/armory/planner');
            },
          },
        ]
      : []),
    ...(isArmourSpilled
      ? [
          {
            id: 'armory-armour-spill',
            label: 'Armour',
            iconSrc: '/img/ui/Equipment%20Icon.png',
            iconZoom: 0.75,
            accent: themeToNavAccent(armoryTheme),
            active: isArmourActive,
            onSelect: go('/armory/armour'),
          },
        ]
      : []),
    {
      id: 'gallery',
      label: 'Gallery',
      iconSrc: '/img/ui/Visage%20Icon.png',
      iconZoom: 0.85,
      accent: themeToNavAccent(galleryTheme),
      active: galleryActive,
      section: gallerySection,
    },
    ...(isBuildSetSpilled
      ? [
          {
            id: 'gallery-set-spill',
            label: 'Build Set',
            iconSrc: '/img/ui/build_set.png',
            iconZoom: 0.85,
            accent: themeToNavAccent(galleryTheme),
            active: isBuildSetActive,
            onSelect: () => {
              const { buildId } = useVisageBuilderStore.getState();
              navigate(buildId ? `/gallery/set?build=${buildId}` : '/gallery/set');
            },
          },
        ]
      : []),
    ...(isVisageSpilled
      ? [
          {
            id: 'gallery-collection-spill',
            label: 'Visage Collection',
            iconSrc: '/img/ui/visage_collection.png',
            iconZoom: 0.85,
            accent: themeToNavAccent(galleryTheme),
            active: isVisageActive,
            onSelect: go('/gallery/collection'),
          },
        ]
      : []),
    {
      id: 'challenges',
      label: 'Challenges',
      iconSrc: '/img/ui/Challenge%20Icon.png',
      iconZoom: 1,
      accent: themeToNavAccent(challengesTheme),
      active: challengesActive,
      section: challengesSection,
    },
    ...(isAdventurerSpilled
      ? [
          {
            id: 'challenges-adventurers-spill',
            label: 'Adventurer',
            iconSrc: '/img/ui/Adventurer%20Icon.png',
            iconZoom: 0.85,
            accent: themeToNavAccent(challengesTheme),
            active: isAdventurerActive,
            onSelect: go('/challenges/adventurers'),
          },
        ]
      : []),
    ...(isBuddiesSpilled
      ? [
          {
            id: 'challenges-buddies-spill',
            label: 'Buddies',
            iconSrc: '/img/ui/Buddy%20Icon.png',
            iconZoom: 0.75,
            accent: themeToNavAccent(challengesTheme),
            active: isBuddiesActive,
            onSelect: go('/challenges/buddies'),
          },
        ]
      : []),
    ...(isWeaponsSpilled
      ? [
          {
            id: 'challenges-weapons-spill',
            label: 'Weapons',
            iconSrc: '/img/ui/Weapons%20Icon.png',
            iconZoom: 0.75,
            accent: themeToNavAccent(challengesTheme),
            active: isWeaponsActive,
            onSelect: go('/challenges/weapons'),
          },
        ]
      : []),
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

  const openMenu = (section: NavSection) => {
    const rect = buttonRefs.current[section.id]?.getBoundingClientRect();
    if (rect) setAnchorY(rect.top + rect.height / 2);
    setOpenId(section.id);
  };

  const handleSectionClick = (section: NavSection) => {
    if (openId === section.id) {
      setOpenId(null);
      return;
    }
    openMenu(section);
  };

  return (
    <>
      {openSection && <div className="main-nav-scrim" onClick={() => setOpenId(null)} aria-hidden="true" />}

      <nav ref={navRef} className="main-nav" aria-label="Main navigation">
        <span className="main-nav__surface" aria-hidden="true" />

        <button
          type="button"
          className="main-nav__brand"
          onClick={() => navigate('/?home=true', { state: { fromNav: true } })}
          aria-label="Field Guide home"
        >
          <img
            src="/images/ui/field-guide-icon-removebg-preview.png"
            alt="Field Guide"
            className="h-10 w-10 object-contain drop-shadow-md transition-transform duration-200 hover:scale-110 active:scale-95"
          />
        </button>

        <ul className="main-nav__items">
          {barItems.map((item) => {
            const hasSubmenu = Boolean(item.section && item.section.subItems.length > 1);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  id={`nav-${item.id}`}
                  ref={hasSubmenu && item.section ? (el) => { buttonRefs.current[item.section!.id] = el; } : undefined}
                  className="main-nav__btn"
                  data-active={item.active}
                  data-accent={item.accent}
                  aria-label={item.label}
                  aria-current={item.active ? 'page' : undefined}
                  aria-haspopup={hasSubmenu ? 'menu' : undefined}
                  aria-expanded={hasSubmenu ? openId === item.section!.id : undefined}
                  onClick={
                    item.section
                      ? item.section.subItems.length === 1
                        ? () => {
                            setOpenId(null);
                            item.section!.subItems[0].onSelect();
                          }
                        : () => handleSectionClick(item.section!)
                      : () => {
                          setOpenId(null);
                          item.onSelect?.();
                        }
                  }
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="main-nav__bubble">
                    <span className="main-nav__icon">
                      <img
                        src={item.iconSrc}
                        alt=""
                        draggable={false}
                        style={{ transform: `scale(${item.iconZoom ?? 1})` }}
                      />
                    </span>
                    {item.id === 'home' && isAdmin && unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 z-20 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-md ring-2 ring-[#232328] animate-pulse"
                        title={`${unreadCount} new feedback message${unreadCount > 1 ? 's' : ''}`}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {hasSubmenu && (item.active || openId === item.section!.id) && (
                      <ChevronUp
                        size={10}
                        strokeWidth={3}
                        className={cn('main-nav__more', openId === item.section!.id && 'is-open')}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="main-nav__tip" role="tooltip">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
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
          <div className="px-2 pb-1.5 pt-1">
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
                  onClick={() => {
                    setOpenId(null);
                    sub.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg border px-2 py-1 text-left text-sm transition-colors cursor-pointer',
                    sub.active
                      ? 'border-[var(--nav-accent)]/50 bg-[var(--bg-panel-primary)] font-bold text-[var(--nav-accent)]'
                      : 'border-transparent text-[#A3A3A3] hover:bg-white/5 hover:text-white',
                  )}
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                    {sub.iconSrc ? (
                      <img
                        src={sub.iconSrc}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-contain"
                        style={sub.iconZoom ? { transform: `scale(${sub.iconZoom})` } : undefined}
                      />
                    ) : (
                      <SubIcon size={24} className="shrink-0" />
                    )}
                  </div>
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
