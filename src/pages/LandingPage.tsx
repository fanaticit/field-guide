import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ChevronRight, Sparkles, Flame } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import LoginModal from '../components/auth/LoginModal';
import FeatureShowcase from '../components/home/FeatureShowcase';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

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

          {/* Featured Field Guide Tome (blended into the page) */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Ambient backlight behind the book */}
            <div
              className="pointer-events-none absolute inset-0 -m-8 rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(117, 182, 112, 0.22) 0%, rgba(255, 215, 0, 0.12) 40%, transparent 70%)',
              }}
            />

            {/* The Book Image with feathered edge blending */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-full flex items-center justify-center">
              <img
                src="/field_guide_big_background.jpeg"
                alt="Monster Hunter Field Guide Tome"
                className="w-full h-full object-cover select-none drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                style={{
                  maskImage:
                    'radial-gradient(circle at 50% 50%, black 45%, rgba(0,0,0,0.75) 65%, transparent 95%)',
                  WebkitMaskImage:
                    'radial-gradient(circle at 50% 50%, black 45%, rgba(0,0,0,0.75) 65%, transparent 95%)',
                }}
              />
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

          {/* Call to Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleCTA}
              className="btn-mho-gold w-full sm:w-auto"
            >
              <span>{user ? 'Continue the Hunt' : 'Join the Hunt'}</span>
              <ChevronRight size={18} />
            </button>
            <Link
              to="/armory"
              className="btn-mho-panel w-full sm:w-auto"
            >
              <span>Browse Community Builds</span>
              <Shield size={16} className="text-[#A3A3A3]" />
            </Link>
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

