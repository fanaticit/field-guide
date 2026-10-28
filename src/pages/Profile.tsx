// ─────────────────────────────────────────────────────────────
// Profile & Settings Page
// Allows hunters to manage identity and default application settings:
//   1. Default landing page on login / visit
//   2. Hunter identity (display name, username, avatar)
//   3. Locale and active games played
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  User,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Gamepad2,
  Compass,
  Globe,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Sword,
  BookMarked,
  LayoutGrid,
  Target,
  UserCheck,
  Cat,
  Image as ImageIcon,
  LogIn,
  Palette,
} from 'lucide-react';
import { useAuthStore, selectIsAdmin, selectCanModerate } from '../store/authStore';
import { useUIStore, type Page } from '../store/uiStore';
import { DEFAULT_SECTION_THEMES, SITE_SECTIONS, THEME_REGISTRY, type RarityTheme } from '../config/themes';
import LoginModal from '../components/auth/LoginModal';
import { cn } from '../lib/utils';

// ── Preset Avatars ───────────────────────────────────────────
const PRESET_AVATARS: { id: string; label: string; url: string }[] = [
  // MHO avatars will be added here
];

// ── Supported Games ──────────────────────────────────────────
const SUPPORTED_GAMES = [
  {
    id: 'mho',
    name: 'Monster Hunter Outlanders',
    short: 'MHO',
    desc: 'Open-world survival action adventure by TiMi & Capcom.',
    color: 'orange',
    tag: 'Upcoming Game',
  },
];

// ── Available Landing Pages ──────────────────────────────────
interface LandingPageOption {
  id: Page;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  adminOnly?: boolean;
}

const LANDING_PAGE_OPTIONS: LandingPageOption[] = [
  { id: 'field-guide', title: 'Home', desc: 'Overview of the Field Guide', icon: BookOpen },
  { id: 'armory', title: 'Community Builds', desc: 'Browse and upvote builds shared by the community', icon: LayoutGrid },
  { id: 'build-planner', title: 'Build Planner', desc: 'Plan weapons, armour, visage cards and skills', icon: Sword },
  { id: 'armour', title: 'Armour', desc: 'Every armour set with its skills and set bonuses', icon: Shield },
  { id: 'gallery', title: 'Visage Sets', desc: 'Community Visage sets you can build with your cards', icon: Sparkles },
  { id: 'visage-collection', title: 'Visage Collection', desc: 'Manage the Visage Cards you own', icon: BookMarked },
  { id: 'challenges', title: 'My Challenges', desc: 'Your hunting targets and personal goals', icon: Target },
  { id: 'adventurers', title: 'Adventurers', desc: 'Browse and track your adventurers', icon: UserCheck },
  { id: 'buddies', title: 'Buddies', desc: 'Track which buddies you have collected', icon: Cat },
  { id: 'weapons', title: 'Weapons', desc: 'Weapons collection and crafting progress', icon: Sword },
  {
    id: 'admin',
    title: 'Admin Panel',
    desc: 'Monster roster, skill mapping, and armour piece management',
    icon: ShieldAlert,
    adminOnly: true,
  },
];

// Pages that were renamed or removed; map them onto the closest current page.
const LEGACY_PAGES: Partial<Record<string, Page>> = {
  'community-hub': 'armory',
  'investigation-notes': 'armour',
  settings: 'field-guide',
  profile: 'field-guide',
};

function normalizePage(page?: string | null): Page {
  if (!page) return 'field-guide';
  return (LEGACY_PAGES[page] ?? page) as Page;
}

export default function ProfilePage() {
  const { user, profile, updateProfile, authLoading, authError, clearAuthError } = useAuthStore();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canModerate = useAuthStore(selectCanModerate);
  const { sectionThemes, setSectionTheme, resetSectionThemes } = useUIStore();

  const [loginOpen, setLoginOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form local state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedDefaultPage, setSelectedDefaultPage] = useState<Page>('field-guide');
  const [locale, setLocale] = useState('en');
  const [gameIds, setGameIds] = useState<string[]>(['mho']);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Sync state from profile or store
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setUsername(profile.username ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
      setSelectedDefaultPage(normalizePage(profile.default_page));
      setLocale(profile.locale || 'en');
      setGameIds(profile.game_ids || ['mho']);
    }
  }, [profile]);

  const isLoggedIn = !!user;

  // Handle Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearAuthError();
    setSuccessMessage(null);

    const success = await updateProfile({
      display_name: displayName.trim() || null,
      username: username.trim() || profile?.username || 'hunter',
      avatar_url: avatarUrl.trim() || null,
      default_page: selectedDefaultPage,
      locale,
      game_ids: gameIds,
    });

    if (success) {
      setSuccessMessage('Hunter profile and default settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleReset = () => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setUsername(profile.username ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
      setSelectedDefaultPage(normalizePage(profile.default_page));
      setLocale(profile.locale || 'en');
      setGameIds(profile.game_ids || ['mho']);
    }
    clearAuthError();
    setSuccessMessage(null);
  };

  const toggleGameId = (gid: string) => {
    if (gameIds.includes(gid)) {
      if (gameIds.length > 1) {
        setGameIds(gameIds.filter((g) => g !== gid));
      }
    } else {
      setGameIds([...gameIds, gid]);
    }
  };

  const availablePages = LANDING_PAGE_OPTIONS.filter((p) => !p.adminOnly || isAdmin);

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-5xl mx-auto pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <User size={20} className="text-mh-gold-400" />
          <span className="rarity-badge rarity-2">Hunter Profile</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-mh-slate-100 lg:text-3xl">
          Profile & Preferences
        </h1>
        <p className="text-sm text-mh-slate-400">
          Customize your hunter identity and startup preferences.
        </p>
      </div>

      {/* ── Guest Mode Banner ── */}
      {!isLoggedIn && (
        <div className="rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-mh-gold-500/20 p-2 text-mh-gold-400 shrink-0 mt-0.5">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-mh-slate-100">Guest Hunter Mode</p>
              <p className="text-xs text-mh-slate-400 mt-0.5">
                Your settings are saved locally on this browser. Sign in to link your preferences, unlock community challenges, and sync across devices.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLoginOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-mh-gold-500 px-4 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors shrink-0"
          >
            <LogIn size={15} />
            Sign in / Register
          </button>
        </div>
      )}

      {/* ── Feedback Banners ── */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-400">
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {authError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-400">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{authError}</p>
        </div>
      )}

      <form onSubmit={handleSave} noValidate className="flex flex-col gap-8">
        {/* ── Section 1: Hunter Identity ── */}
        <div className="mh-card flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-mh-slate-700/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mh-gold-500/10 text-mh-gold-400">
                <User size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-mh-slate-100">Hunter Identity</h2>
                <p className="text-xs text-mh-slate-500">Your hunter name, avatar, and credentials</p>
              </div>
            </div>

            {/* Role Badge */}
            {isLoggedIn && (
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
                  isAdmin
                    ? 'bg-mh-gold-500/20 text-mh-gold-400 ring-1 ring-mh-gold-500/40'
                    : canModerate
                    ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                    : 'bg-mh-slate-700 text-mh-slate-300',
                )}
              >
                {isAdmin ? (
                  <ShieldCheck size={13} className="text-mh-gold-400" />
                ) : (
                  <Shield size={13} />
                )}
                {profile?.role ?? 'Member'}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar preview and picker */}
            <div className="flex flex-col items-center gap-3 shrink-0 mx-auto md:mx-0">
              <div className="relative group">
                <div
                  className={cn(
                    'h-24 w-24 rounded-2xl overflow-hidden border-2 bg-mh-slate-800 flex items-center justify-center shadow-lg',
                    isAdmin
                      ? 'border-mh-gold-400 ring-4 ring-mh-gold-500/20'
                      : 'border-mh-slate-700',
                  )}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || 'Hunter avatar'}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarUrl('')}
                    />
                  ) : (
                    <User size={40} className="text-mh-slate-500" />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-1.5 text-xs font-medium text-mh-slate-300 hover:bg-mh-slate-700 transition-colors"
              >
                <ImageIcon size={13} />
                {showAvatarPicker ? 'Hide Presets' : 'Choose Monster Avatar'}
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div>
                <label className="block text-xs font-semibold text-mh-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Master Hunter"
                  className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/60 transition-colors"
                />
                <p className="text-[11px] text-mh-slate-500 mt-1">
                  The name visible in comments and community builds.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-mh-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. hunter99"
                  disabled={!isLoggedIn}
                  className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/60 disabled:opacity-50 transition-colors"
                />
                <p className="text-[11px] text-mh-slate-500 mt-1">
                  Unique hunter handle ({isLoggedIn ? 'editable' : 'sign in to reserve'}).
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-mh-slate-300 mb-1.5">
                  Avatar Image URL or Path
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png or /images/monsters/..."
                  className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/60 transition-colors font-mono text-xs"
                />
                <p className="text-[11px] text-mh-slate-500 mt-1">
                  Supports external image URLs or local preset icon paths.
                </p>
              </div>

              {isLoggedIn && user?.email && (
                <div className="sm:col-span-2 rounded-lg border border-mh-slate-800 bg-mh-slate-900/60 p-3 flex items-center justify-between text-xs">
                  <span className="text-mh-slate-400">Linked Account Email:</span>
                  <span className="font-semibold text-mh-slate-200 font-mono">{user.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preset Avatar Selection Grid */}
          {showAvatarPicker && (
            <div className="rounded-xl border border-mh-slate-700/80 bg-mh-slate-900/90 p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-mh-gold-400 uppercase tracking-wider">
                  Select a Monster Hunter Icon
                </p>
                <span className="text-[11px] text-mh-slate-500">Click to apply</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {PRESET_AVATARS.map((avatar) => {
                  const isSelected = avatarUrl === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(avatar.url);
                        setShowAvatarPicker(false);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all group',
                        isSelected
                          ? 'border-mh-gold-500 bg-mh-gold-500/10 ring-2 ring-mh-gold-500/30'
                          : 'border-mh-slate-800 bg-mh-slate-800/50 hover:border-mh-slate-600 hover:bg-mh-slate-800',
                      )}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="h-12 w-12 object-contain group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[11px] font-medium text-mh-slate-300 truncate w-full">
                        {avatar.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Default Application Settings ── */}
        <div className="mh-card flex flex-col gap-6">
          <div className="flex items-center gap-2.5 border-b border-mh-slate-700/80 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mh-gold-500/10 text-mh-gold-400">
              <Gamepad2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-mh-slate-100">Games You Play</h2>
              <p className="text-xs text-mh-slate-500">
                Choose which Monster Hunter titles you play and track
              </p>
            </div>
          </div>

          {/* Active Games Played Multi-Select */}
          <div>
            <label className="block text-xs font-semibold text-mh-slate-300 mb-2">
              Games You Play & Track
            </label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_GAMES.map((game) => {
                const active = gameIds.includes(game.id);
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => toggleGameId(game.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                      active
                        ? 'border-mh-gold-500/60 bg-mh-gold-500/10 text-mh-gold-300'
                        : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-500 hover:text-mh-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        active ? 'bg-mh-gold-400' : 'bg-mh-slate-600',
                      )}
                    />
                    {game.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-mh-slate-500 mt-1.5">
              Select which games appear in your quick filters and tabs across the app.
            </p>
          </div>
        </div>

        {/* ── Section 3: Default Landing Page ── */}
        <div className="mh-card flex flex-col gap-6">
          <div className="flex items-center gap-2.5 border-b border-mh-slate-700/80 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mh-gold-500/10 text-mh-gold-400">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-mh-slate-100">Default Startup Page</h2>
              <p className="text-xs text-mh-slate-500">
                Choose which page loads automatically when you log in
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availablePages.map((page) => {
              const Icon = page.icon;
              const isSelected = selectedDefaultPage === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedDefaultPage(page.id)}
                  className={cn(
                    'flex flex-col text-left p-3.5 rounded-xl border transition-all text-xs',
                    isSelected
                      ? 'border-mh-gold-500/80 bg-mh-gold-500/10 ring-2 ring-mh-gold-500/30'
                      : 'border-mh-slate-700/70 bg-mh-slate-800/40 hover:border-mh-slate-600 hover:bg-mh-slate-800/70',
                  )}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
                        isSelected
                          ? 'bg-mh-gold-500 text-mh-slate-950 font-bold'
                          : 'bg-mh-slate-700 text-mh-slate-400',
                      )}
                    >
                      <Icon size={14} />
                    </div>
                    <span className="font-bold text-sm text-mh-slate-100">{page.title}</span>
                  </div>
                  <p className="text-mh-slate-400 leading-relaxed">{page.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section: Section Rarity Themes ── */}
        <div className="mh-card flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mh-slate-700/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-fine)] text-[var(--rarity-fine)] border border-[var(--rarity-fine)]/40">
                <Palette size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Section Rarity Themes</span>
                  <span className="text-[10px] font-mono text-[var(--accent-gold)] uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    Live Switcher
                  </span>
                </h2>
                <p className="text-xs text-[#A3A3A3]">
                  Customize the color theme and rarity aura for each section of the Field Guide
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => resetSectionThemes()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#A3A3A3] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors w-fit"
            >
              <RotateCcw size={12} />
              <span>Reset to Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SITE_SECTIONS.map((sec) => {
              const currentTheme = sectionThemes[sec.path] ?? DEFAULT_SECTION_THEMES[sec.path] ?? 'standard';
              const meta = THEME_REGISTRY[currentTheme];

              return (
                <div
                  key={sec.path}
                  className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel-primary)] flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-sm text-white">
                        {sec.label}
                        {!sec.live && (
                          <span className="ml-2 text-[9px] font-mono font-normal uppercase text-[#A3A3A3]/70">
                            Not applied yet
                          </span>
                        )}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          borderColor: meta.colorHex,
                          color: meta.colorHex,
                          backgroundColor: meta.bgHex,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A3A3A3] leading-relaxed mb-1">
                      {sec.description}
                    </p>
                    <span className="text-[10px] font-mono text-[#A3A3A3]/60">{sec.path}</span>
                  </div>

                  {/* Theme selector pills */}
                  <div className="flex flex-wrap gap-1 pt-2 border-t border-white/5">
                    {(Object.keys(THEME_REGISTRY) as RarityTheme[]).map((thKey) => {
                      const thMeta = THEME_REGISTRY[thKey];
                      const isSelected = currentTheme === thKey;

                      return (
                        <button
                          key={thKey}
                          type="button"
                          onClick={() => setSectionTheme(sec.path, thKey)}
                          title={`${thMeta.label} (${thMeta.colorName})`}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all',
                            isSelected
                              ? 'ring-1 shadow-sm'
                              : 'border-white/10 bg-white/5 text-[#A3A3A3] hover:text-white hover:bg-white/10'
                          )}
                          style={
                            isSelected
                              ? {
                                  borderColor: thMeta.colorHex,
                                  color: thMeta.colorHex,
                                  backgroundColor: thMeta.bgHex,
                                }
                              : undefined
                          }
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: thMeta.colorHex }}
                          />
                          <span>{thMeta.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 4: Localization & Preferences ── */}
        <div className="mh-card flex flex-col gap-6">
          <div className="flex items-center gap-2.5 border-b border-mh-slate-700/80 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mh-gold-500/10 text-mh-gold-400">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-mh-slate-100">Language & Localization</h2>
              <p className="text-xs text-mh-slate-500">
                Choose preferred language for monster names, skills, and UI elements
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={cn(
                'flex-1 flex items-center justify-between p-3.5 rounded-xl border transition-all text-left',
                locale === 'en'
                  ? 'border-mh-gold-500/80 bg-mh-gold-500/10 ring-1 ring-mh-gold-500/30'
                  : 'border-mh-slate-700 bg-mh-slate-800/50 hover:bg-mh-slate-800',
              )}
            >
              <div>
                <p className="font-bold text-sm text-mh-slate-100">English</p>
                <p className="text-xs text-mh-slate-400">Default terminology (EN)</p>
              </div>
              {locale === 'en' && <CheckCircle2 size={16} className="text-mh-gold-400" />}
            </button>

            <button
              type="button"
              onClick={() => setLocale('ja')}
              className={cn(
                'flex-1 flex items-center justify-between p-3.5 rounded-xl border transition-all text-left',
                locale === 'ja'
                  ? 'border-mh-gold-500/80 bg-mh-gold-500/10 ring-1 ring-mh-gold-500/30'
                  : 'border-mh-slate-700 bg-mh-slate-800/50 hover:bg-mh-slate-800',
              )}
            >
              <div>
                <p className="font-bold text-sm text-mh-slate-100">日本語 (Japanese)</p>
                <p className="text-xs text-mh-slate-400">モンスター名・スキル名 (JA)</p>
              </div>
              {locale === 'ja' && <CheckCircle2 size={16} className="text-mh-gold-400" />}
            </button>
          </div>
        </div>

        {/* ── Save Action Bar ── */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-xl border border-mh-slate-700 bg-mh-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={handleReset}
            disabled={authLoading}
            className="flex items-center gap-2 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-4 py-2 text-xs font-semibold text-mh-slate-300 hover:bg-mh-slate-700 transition-colors"
          >
            <RotateCcw size={14} />
            Reset Changes
          </button>

          <button
            type="submit"
            disabled={authLoading}
            className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-6 py-2.5 text-sm font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors shadow-lg disabled:opacity-50"
          >
            <Save size={16} />
            {authLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
