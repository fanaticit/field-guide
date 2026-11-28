import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { Flame, Sparkles } from 'lucide-react';
import { useAuthStore, getLandingPagePath } from '../store/authStore';
import LoginModal from '../components/auth/LoginModal';
import FeatureShowcase from '../components/home/FeatureShowcase';
import SiteUpdatesSection from '../components/home/SiteUpdatesSection';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuthStore();
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

  // While redirecting a logged-in user to their chosen start page, render nothing.
  // (The page is still rendered while auth loads so it can be pre-rendered for search engines.)
  if (shouldRedirect) {
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
      
      {/* ── Hero Section (Adaptive Section Theme) ── */}
      <div className="mho-panel relative overflow-hidden p-4 sm:p-6 md:p-8 text-center shadow-2xl border-white/15">
        {/* Ambient contextual rarity glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] w-[620px] h-[280px]"
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
          {/* Header Banner */}
          <div className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-white/15 shadow-xl bg-black/40 mb-4 sm:mb-5 group">
            <img
              src="/images/ui/banner_small.jpeg"
              alt="Monster Hunter Outlanders Field Guide banner"
              className="w-full h-32 sm:h-44 md:h-52 object-cover object-center select-none transition-transform duration-700 group-hover:scale-[1.01]"
            />
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
          </div>

          {/* Title - sized to fit comfortably on one line */}
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-md">
            Monster Hunter Outlanders{' '}
            <span className="text-[#FFD700] drop-shadow-[0_0_14px_rgba(255,215,0,0.35)]">
              Field Guide
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-2.5 max-w-2xl text-sm sm:text-base text-[#A3A3A3] leading-relaxed">
            The community companion for <strong className="text-white">Monster Hunter Outlanders</strong>.
            Share gear builds, manage your Visage Cards, and keep a field guide of what to hunt next.
          </p>
        </div>
      </div>

      {/* ── Latest Site Updates (from METADATA.json) ── */}
      <SiteUpdatesSection />

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

