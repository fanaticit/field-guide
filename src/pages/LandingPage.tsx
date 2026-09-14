import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Users, BookOpen, Shield, ChevronRight, Sparkles } from 'lucide-react';
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
      
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden rounded-3xl border border-mh-slate-700 bg-gradient-to-b from-mh-slate-900 to-mh-slate-950 px-6 py-16 sm:px-12 sm:py-24 text-center shadow-2xl">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mh-gold-500/20 blur-[120px] w-[600px] h-[400px]" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-mh-gold-500 to-mh-gold-700 shadow-lg ring-4 ring-mh-slate-900">
            <img src="/favicon.png" alt="Logo" className="h-full w-full object-contain p-2" />
          </div>
          
          <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md">
            Monster Hunter <span className="text-mh-gold-400">Field Guide</span>
          </h1>
          
          <p className="mt-4 max-w-2xl text-lg sm:text-xl text-mh-slate-300">
            Your ultimate companion for <strong>Monster Hunter Outlanders</strong>. 
            Track your crafting goals, theorycraft the perfect builds, and connect with a community of dedicated hunters.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleCTA}
              className="flex items-center gap-2 rounded-full bg-mh-gold-500 hover:bg-mh-gold-400 px-8 py-3.5 text-sm font-bold text-slate-950 transition-all shadow-lg hover:shadow-mh-gold-500/25 hover:scale-105"
            >
              {user ? 'Continue the Hunt' : 'Join the Hunt'}
              <ChevronRight size={18} />
            </button>
            <Link
              to="/monsters"
              className="flex items-center gap-2 rounded-full border border-mh-slate-700 bg-mh-slate-800 hover:bg-mh-slate-700 px-8 py-3.5 text-sm font-bold text-white transition-all shadow-md"
            >
              Browse Monsters
            </Link>
          </div>
        </div>
      </div>

      {/* ── Feature Highlights ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="rounded-2xl border border-mh-slate-800 bg-mh-slate-900/50 p-6 hover:border-mh-slate-600 transition-colors">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
            <BookOpen size={24} />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">Monster Guide</h3>
          <p className="text-sm text-mh-slate-400 leading-relaxed">
            Study your prey. Access detailed hitzones, elemental weaknesses, and material drop rates to prepare for every encounter.
          </p>
        </div>

        <div className="rounded-2xl border border-mh-slate-800 bg-mh-slate-900/50 p-6 hover:border-mh-slate-600 transition-colors">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <Target size={24} />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">Hunter's Challenges</h3>
          <p className="text-sm text-mh-slate-400 leading-relaxed">
            Set personal goals. Track armor crafting, weapon upgrades, and visage card collections in one central dashboard.
          </p>
        </div>

        <div className="rounded-2xl border border-mh-slate-800 bg-mh-slate-900/50 p-6 hover:border-mh-slate-600 transition-colors">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
            <Shield size={24} />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">Build Planner</h3>
          <p className="text-sm text-mh-slate-400 leading-relaxed">
            Forge the perfect loadout. Plan your weapons, armor sets, and skills to maximize your combat potential.
          </p>
        </div>

        <div className="rounded-2xl border border-mh-slate-800 bg-mh-slate-900/50 p-6 hover:border-mh-slate-600 transition-colors">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
            <Users size={24} />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">Community Hub</h3>
          <p className="text-sm text-mh-slate-400 leading-relaxed">
            Share your mastery. Browse community challenges, adopt builds from top hunters, and showcase your achievements.
          </p>
        </div>

      </div>

      {/* ── Footer CTA ── */}
      <div className="rounded-3xl border border-mh-gold-500/30 bg-gradient-to-r from-mh-slate-900 to-mh-slate-800 p-8 sm:p-12 text-center shadow-xl relative overflow-hidden">
        <Sparkles className="absolute top-4 right-8 text-mh-gold-500/20" size={100} />
        <div className="relative z-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to track your progress?
          </h2>
          <p className="text-mh-slate-400 mb-8 max-w-xl mx-auto">
            Create an account to save your builds, track your crafting materials, and join the Outlanders community.
          </p>
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 rounded-full bg-mh-gold-500 hover:bg-mh-gold-400 px-8 py-3 text-sm font-bold text-slate-950 transition-all shadow-lg"
          >
            {user ? 'Go to Dashboard' : 'Create Free Account'}
          </button>
        </div>
      </div>

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}
