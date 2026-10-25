import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Users, BookOpen, Shield, ChevronRight, Sparkles, ArrowRight, Flame } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import LoginModal from '../components/auth/LoginModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const handleCTA = () => {
    if (user) {
      navigate('/monsters');
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
            <span>Archive Portal &mdash; Outlanders Compendium</span>
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
            Your definitive tactical archive for <strong className="text-white">Monster Hunter Outlanders</strong>.
            Research hitzones, track crafting trajectories, and theorycraft the ultimate Visage loadouts.
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
              to="/monsters"
              className="btn-mho-panel w-full sm:w-auto"
            >
              <span>Browse Monsters</span>
              <BookOpen size={16} className="text-[#A3A3A3]" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Feature Highlights (Field Modules) ── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[#FFD700] text-sm">❖</span>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white uppercase">
            Field Modules
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Monster Guide (Fine Accent) */}
          <Link
            to="/monsters"
            className="mho-panel mho-panel-interactive p-6 flex flex-col justify-between group block"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-fine)] text-[var(--rarity-fine)] border border-[var(--rarity-fine)]/30">
                  <BookOpen size={22} />
                </div>
                <span className="badge-fine px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase">
                  Fine (+10 EXP)
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-[#FFD700] transition-colors">
                Monster Guide
              </h3>
              <p className="text-sm text-[#A3A3A3] leading-relaxed">
                Study your prey. Access detailed hitzones, elemental weaknesses, and material drop rates to prepare for every encounter.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#A3A3A3] group-hover:text-white transition-colors">
              <span>Hitzones &amp; Weaknesses</span>
              <ArrowRight size={14} className="text-[#FFD700] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Hunter's Challenges (Rare Accent) */}
          <Link
            to="/challenges"
            className="mho-panel mho-panel-interactive p-6 flex flex-col justify-between group block"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-rare)] text-[var(--rarity-rare)] border border-[var(--rarity-rare)]/30">
                  <Target size={22} />
                </div>
                <span className="badge-rare px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase">
                  Rare (+20 EXP)
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-[#FFD700] transition-colors">
                Hunter's Challenges
              </h3>
              <p className="text-sm text-[#A3A3A3] leading-relaxed">
                Set personal goals. Track armor crafting, weapon upgrades, and visage card collections in one central dashboard.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#A3A3A3] group-hover:text-white transition-colors">
              <span>Progress Tracking</span>
              <ArrowRight size={14} className="text-[#FFD700] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Build Planner (Epic Accent) */}
          <Link
            to="/armory/planner"
            className="mho-panel mho-panel-interactive p-6 flex flex-col justify-between group block"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-epic)] text-[var(--rarity-epic)] border border-[var(--rarity-epic)]/30">
                  <Shield size={22} />
                </div>
                <span className="badge-epic px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase">
                  Epic (+30 EXP)
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-[#FFD700] transition-colors">
                Build Planner
              </h3>
              <p className="text-sm text-[#A3A3A3] leading-relaxed">
                Forge the perfect loadout. Plan your weapons, armor sets, and skills to maximize your combat potential.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#A3A3A3] group-hover:text-white transition-colors">
              <span>Theorycraft &amp; Slots</span>
              <ArrowRight size={14} className="text-[#FFD700] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Community Hub (Superior Accent) */}
          <Link
            to="/community-hub"
            className="mho-panel mho-panel-interactive p-6 flex flex-col justify-between group block"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-superior)] text-[var(--rarity-superior)] border border-[var(--rarity-superior)]/30">
                  <Users size={22} />
                </div>
                <span className="badge-superior px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase">
                  Superior (+60 EXP)
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-[#FFD700] transition-colors">
                Community Hub
              </h3>
              <p className="text-sm text-[#A3A3A3] leading-relaxed">
                Share your mastery. Browse community challenges, adopt builds from top hunters, and showcase your achievements.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#A3A3A3] group-hover:text-white transition-colors">
              <span>Guild Transmissions</span>
              <ArrowRight size={14} className="text-[#FFD700] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>

      {/* ── Quality & Rarity Showcase (Game Aesthetic Prototype) ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-[#FFD700] text-sm">❖</span>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white uppercase">
              Quality &amp; Rarity Tiers
            </h2>
          </div>
          <span className="text-xs text-[#A3A3A3] font-mono tracking-wider">
            OUTLANDERS VISAGE QUALITY TIERS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Fine Tier */}
          <div className="mho-panel p-5 relative overflow-hidden border-[var(--rarity-fine)]/40 hover:border-[var(--rarity-fine)] transition-colors">
            <div className="absolute top-0 right-0 px-3 py-1 bg-[var(--bg-fine)] border-b border-l border-[var(--rarity-fine)]/40 rounded-bl-lg text-[10px] font-bold text-[var(--rarity-fine)] tracking-wider">
              ACTIVE THEME
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--rarity-fine)]" />
              <h4 className="font-display font-bold text-white">Fine Quality</h4>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-panel-secondary)] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Collection EXP</span>
                <span className="text-[var(--rarity-fine)] font-bold">+10 EXP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Attack Power</span>
                <span className="text-[var(--text-positive)] font-semibold">+10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Affinity</span>
                <span className="text-[#FFD700] font-semibold">+0.5%</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#A3A3A3]">
              Standard tactical field grade. Balanced for reliable hunting baseline.
            </p>
          </div>

          {/* Rare Tier */}
          <div className="mho-panel p-5 relative overflow-hidden border-[var(--rarity-rare)]/30 hover:border-[var(--rarity-rare)] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--rarity-rare)]" />
              <h4 className="font-display font-bold text-white">Rare Quality</h4>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-panel-secondary)] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Collection EXP</span>
                <span className="text-[var(--rarity-rare)] font-bold">+20 EXP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Attack Power</span>
                <span className="text-[var(--text-positive)] font-semibold">+20</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Affinity</span>
                <span className="text-[#FFD700] font-semibold">+1.0%</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#A3A3A3]">
              Refined research grade. Discovered from elite habitat encounters.
            </p>
          </div>

          {/* Epic Tier */}
          <div className="mho-panel p-5 relative overflow-hidden border-[var(--rarity-epic)]/30 hover:border-[var(--rarity-epic)] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--rarity-epic)]" />
              <h4 className="font-display font-bold text-white">Epic Quality</h4>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-panel-secondary)] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Collection EXP</span>
                <span className="text-[var(--rarity-epic)] font-bold">+30 EXP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Attack Power</span>
                <span className="text-[var(--text-positive)] font-semibold">+30</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Affinity</span>
                <span className="text-[#FFD700] font-semibold">+1.5%</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#A3A3A3]">
              High-tier apex grade. Imbued with potent monster essence.
            </p>
          </div>

          {/* Superior Tier */}
          <div className="mho-panel p-5 relative overflow-hidden border-[var(--rarity-superior)]/30 hover:border-[var(--rarity-superior)] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--rarity-superior)]" />
              <h4 className="font-display font-bold text-white">Superior Quality</h4>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-panel-secondary)] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Collection EXP</span>
                <span className="text-[var(--rarity-superior)] font-bold">+60 EXP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Attack Power</span>
                <span className="text-[var(--text-positive)] font-semibold">+60</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A3A3A3]">Affinity</span>
                <span className="text-[#FFD700] font-semibold">+2.5%</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#A3A3A3]">
              Pinnacle masterwork grade. Maximum attribute synergy &amp; set resonance.
            </p>
          </div>

        </div>
      </div>

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
            Register your hunter guild pass to synchronize custom builds, track material quotas, and collaborate across the Outlanders frontier.
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

