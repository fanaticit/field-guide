import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Shield, ChevronRight, Sparkles, Flame, Settings, LogIn, ScrollText } from 'lucide-react';
import { useAuthStore, getLandingPagePath } from '../store/authStore';
import LoginModal from '../components/auth/LoginModal';
import FeatureShowcase from '../components/home/FeatureShowcase';
import { useUIStore } from '../store/uiStore';
import { resolveSectionTheme } from '../config/themes';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuthStore();
  const sectionThemes = useUIStore((s) => s.sectionThemes);
  const galleryTheme = resolveSectionTheme('/gallery', sectionThemes);
  const armoryTheme = resolveSectionTheme('/armory', sectionThemes);
  const challengesTheme = resolveSectionTheme('/challenges', sectionThemes);
  const settingsTheme = resolveSectionTheme('/settings', sectionThemes);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // If a logged-in user visits the home page and has configured a different startup page, redirect them.
  // Explicit visits via the navigation rail or ?home=true allow the user to view Home when desired.
  const stayOnHome = searchParams.get('home') === 'true' || Boolean(location.state?.fromNav);
  const targetPath = getLandingPagePath(profile);
  const shouldRedirect = !loading && !!user && !stayOnHome && targetPath !== '/';

  useEffect(() => {
    if (shouldRedirect) {
      navigate(targetPath, { replace: true });
    }
  }, [shouldRedirect, targetPath, navigate]);

  // While auth state is initializing or when actively redirecting, avoid flashing the home page
  if (loading || shouldRedirect) {
    return null;
  }

  const handleCTA = () => {
    if (user) {
      navigate('/armory');
    } else {
      setLoginModalOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-16">
      
      {/* ── Hero Section (Adaptive Section Theme) ── */}
      <div className="mho-panel relative overflow-hidden px-6 py-14 sm:px-12 sm:py-20 text-center shadow-2xl border-white/15">
        {/* Ambient contextual rarity glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] w-[620px] h-[380px]"
          style={{
            background: 'radial-gradient(circle, var(--glow-rarity-current, rgba(255, 215, 0, 0.28)) 0%, transparent 70%)',
          }}
        />

        {/* Decorative corner brackets */}
        <div className="pointer-events-none absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[var(--rarity-current)] opacity-60" />
        <div className="pointer-events-none absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[var(--rarity-current)] opacity-60" />
        <div className="pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[var(--rarity-current)] opacity-60" />
        <div className="pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[var(--rarity-current)] opacity-60" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Quality Tier / Section Indicator */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm border border-[var(--border-rarity-current)] bg-[var(--bg-rarity-current)] text-[var(--rarity-current)]">
            <span>❖</span>
            <span>Monster Hunters Outlanders - Field Guide</span>
          </div>

          {/* Featured Field Guide Banner */}
          <div className="relative my-3 sm:my-5 w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl flex items-center justify-center">
            {/* Ambient backlight behind the banner */}
            <div
              className="pointer-events-none absolute inset-0 -m-4 sm:-m-6 rounded-3xl blur-2xl opacity-60"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.18) 0%, rgba(180, 83, 9, 0.10) 50%, transparent 75%)',
              }}
            />

            <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/15 shadow-2xl bg-black/40 group">
              <img
                src="/images/ui/banner_small.jpeg"
                alt="Monster Hunter Field Guide"
                className="w-full h-auto object-cover select-none transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md">
            Monster Hunter{' '}
            <span className="text-[#FFD700] drop-shadow-[0_0_14px_rgba(255,215,0,0.35)]">
              Field Guide
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#A3A3A3] leading-relaxed">
            The community companion for <strong className="text-white">Monster Hunter Outlanders</strong>.
            Share gear builds, manage your Visage Cards, and keep a field guide of what to hunt next.
          </p>

          {/* ── Quick Navigation Cluster (Themed Hunter's Compass) ── */}
          <div className="mt-10 w-full max-w-4xl space-y-3.5">
            {/* Row 1: Dual Primary Highlight CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Make Armour Combinations (Armory theme) */}
              <div data-rarity-theme={armoryTheme} className="section-theme">
                <Link
                  to="/armory/armour"
                  className="btn-mho-gold w-full flex items-center justify-between !py-3.5 !px-5 rounded-xl shadow-lg group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src="/img/ui/Equipment%20Icon.png"
                      alt="Armour"
                      className="w-7 h-7 object-contain drop-shadow group-hover:scale-110 transition-transform"
                    />
                    <div className="text-left min-w-0">
                      <div className="font-display font-bold text-sm tracking-wide leading-tight">
                        Make Armour Combinations
                      </div>
                      <div className="text-[11px] opacity-80 font-sans font-medium truncate">
                        Armory &middot; Sets &amp; resistances
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 opacity-75 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Build a Visage Set (Gallery theme) */}
              <div data-rarity-theme={galleryTheme} className="section-theme">
                <Link
                  to="/gallery/set"
                  className="btn-mho-gold w-full flex items-center justify-between !py-3.5 !px-5 rounded-xl shadow-lg group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src="/img/ui/Visage%20Icon.png"
                      alt="Visage"
                      className="w-7 h-7 object-contain drop-shadow group-hover:scale-110 transition-transform"
                    />
                    <div className="text-left min-w-0">
                      <div className="font-display font-bold text-sm tracking-wide leading-tight">
                        Build a Visage Set
                      </div>
                      <div className="text-[11px] opacity-80 font-sans font-medium truncate">
                        Gallery &middot; Card synergy builder
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 opacity-75 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Row 2: Secondary Hub Features (Armory + Challenges) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Browse Community Builds (Armory theme) */}
              <div data-rarity-theme={armoryTheme} className="section-theme">
                <Link
                  to="/armory"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-mh-slate-900/90 hover:bg-mh-slate-800/90 border border-white/10 hover:border-[var(--theme-accent)] transition-all group shadow-sm text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/10 group-hover:border-[var(--theme-accent)] transition-colors">
                    <Shield size={16} className="text-[var(--theme-accent)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-xs text-white group-hover:text-[var(--theme-accent)] transition-colors truncate">
                      Community Builds
                    </div>
                    <div className="text-[10px] text-mh-slate-400 truncate">
                      Browse top gear sets
                    </div>
                  </div>
                </Link>
              </div>

              {/* Compare Weapons (Challenges theme) */}
              <div data-rarity-theme={challengesTheme} className="section-theme">
                <Link
                  to="/challenges/weapons"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-mh-slate-900/90 hover:bg-mh-slate-800/90 border border-white/10 hover:border-[var(--theme-accent)] transition-all group shadow-sm text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/10 group-hover:border-[var(--theme-accent)] transition-colors">
                    <img
                      src="/img/ui/Weapons%20Icon.png"
                      alt="Weapons"
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-xs text-white group-hover:text-[var(--theme-accent)] transition-colors truncate">
                      Compare Weapons
                    </div>
                    <div className="text-[10px] text-mh-slate-400 truncate">
                      Upgrades, damage & tiers
                    </div>
                  </div>
                </Link>
              </div>

              {/* Find the right Buddy (Challenges theme) */}
              <div data-rarity-theme={challengesTheme} className="section-theme">
                <Link
                  to="/challenges/buddies"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-mh-slate-900/90 hover:bg-mh-slate-800/90 border border-white/10 hover:border-[var(--theme-accent)] transition-all group shadow-sm text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/10 group-hover:border-[var(--theme-accent)] transition-colors">
                    <img
                      src="/img/ui/Buddy%20Icon.png"
                      alt="Buddy"
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-xs text-white group-hover:text-[var(--theme-accent)] transition-colors truncate">
                      Find the Right Buddy
                    </div>
                    <div className="text-[10px] text-mh-slate-400 truncate">
                      Felyne roles & abilities
                    </div>
                  </div>
                </Link>
              </div>

              {/* See Adventurers (Challenges theme) */}
              <div data-rarity-theme={challengesTheme} className="section-theme">
                <Link
                  to="/challenges/adventurers"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-mh-slate-900/90 hover:bg-mh-slate-800/90 border border-white/10 hover:border-[var(--theme-accent)] transition-all group shadow-sm text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/10 group-hover:border-[var(--theme-accent)] transition-colors">
                    <img
                      src="/img/ui/Adventurer%20Icon.png"
                      alt="Adventurers"
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-xs text-white group-hover:text-[var(--theme-accent)] transition-colors truncate">
                      See Adventurers
                    </div>
                    <div className="text-[10px] text-mh-slate-400 truncate">
                      Hunter roster & support
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Row 3: Account Anchor (Profile & Settings / Login) */}
            <div data-rarity-theme={settingsTheme} className="section-theme pt-1">
              {user ? (
                <Link
                  to="/settings"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--theme-accent)] text-xs font-semibold text-mh-slate-300 hover:text-white transition-all shadow-xs"
                >
                  <Settings size={14} className="text-[var(--theme-accent)]" />
                  <span>Profile & Settings</span>
                  <span className="text-mh-slate-500 font-normal">&middot; Manage guild preferences & data</span>
                  <ChevronRight size={13} className="text-mh-slate-500" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--theme-accent)] text-xs font-semibold text-mh-slate-300 hover:text-white transition-all shadow-xs cursor-pointer"
                >
                  <LogIn size={14} className="text-[var(--theme-accent)]" />
                  <span>Hunter Login &amp; Register</span>
                  <span className="text-mh-slate-500 font-normal">&middot; Save builds &amp; sync your collection</span>
                  <ChevronRight size={13} className="text-mh-slate-500" />
                </button>
              )}
            </div>

            {/* Row 4: Game Updates / Patch Notes */}
            <div className="pt-1.5 flex justify-center">
              <Link
                to="/updates"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-mh-gold-500/10 hover:bg-mh-gold-500/20 border border-mh-gold-500/30 text-xs font-semibold text-mh-gold-300 hover:text-mh-gold-200 transition-all shadow-sm group"
              >
                <ScrollText size={13} className="text-mh-gold-400 group-hover:scale-110 transition-transform" />
                <span>Latest Game Updates &middot; Patch 1.0.9.3</span>
                <ChevronRight size={13} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── What you can do (Armory, Gallery, Challenges) ── */}
      <FeatureShowcase />

      {/* ── Footer CTA (Dossier Panel) ── */}
      <div className="mho-panel p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl border-white/15">
        <Sparkles className="absolute top-4 right-8 text-[var(--rarity-fine)] opacity-15" size={120} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#A3A3A3] mb-4">
            <Flame size={14} className="text-[#FFD700]" />
            <span>Hunter Synchronization Protocol</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to record your hunts?
          </h2>
          <p className="text-[#A3A3A3] mb-8 leading-relaxed">
            Register your hunter guild pass to save your builds, manage your Visage Cards, upvote the community's best gear and keep your hunting targets close.
          </p>
          <button
            onClick={handleCTA}
            className="btn-mho-gold"
          >
            {user ? 'Open Hunter Dashboard' : 'Create Free Guild Pass'}
          </button>
        </div>
      </div>

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}

