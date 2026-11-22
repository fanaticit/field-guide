// ─────────────────────────────────────────────────────────────
// SpoilersPage.tsx — Field Guide Spoilers & Recruitment Schedule
//
// Gated by user authentication and profile `show_spoilers` preference.
// Displays the recruitment schedule (read from the banners table, with
// Live / Coming soon / Ended worked out from the current time), datamined
// event info (Impending Storm), and recruitment pity mechanics breakdown.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Info,
  Maximize2,
  X,
  Zap,
  Swords,
  Shield,
  Trophy,
  Gift,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import LoginModal from '../components/auth/LoginModal';
import { cn } from '../lib/utils';
import BannerSchedule from '../components/banners/BannerSchedule';
import GeneralSpoilers from '../components/spoilers/GeneralSpoilers';

type SpoilerTab = 'recruitment' | 'general';
const SPOILER_TABS: { id: SpoilerTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'recruitment', label: 'Recruitment & Events' },
];

const EVENT_REWARDS = [
  { points: 0, reward: '50,000 Zenny' },
  { points: 200, reward: '200 Rutacoin' },
  { points: 400, reward: '“Wind Pressure” (Emote)' },
  { points: 600, reward: '8 Scale Pigment' },
  { points: 800, reward: '300 Radiant Coin' },
  { points: 1000, reward: '1 Resonance Crystal' },
  { points: 1200, reward: '300 Rutacoin', day7: true },
  { points: 1400, reward: '“Nap Time” (Emote)', day7: true },
  { points: 1600, reward: '15 Unusual Brush', day7: true },
  { points: 1800, reward: '300 Radiant Coin', day7: true },
  { points: 2000, reward: 'Kushala Daora Doll (Cosmetic)', day7: true },
];

interface DateStatus {
  state: 'current' | 'upcoming' | 'ended';
  label: string;
}

function computeDateStatus(startIso: string, endIso: string): DateStatus {
  const now = new Date();
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (now < start) {
    return { state: 'upcoming', label: 'Coming Soon' };
  }
  if (now > end) {
    return { state: 'ended', label: 'Ended' };
  }
  return { state: 'current', label: 'Current' };
}

const IMPENDING_STORM_EVENT = {
  name: 'Impending Storm — Kushala Daora',
  startDate: '13 Nov 2026',
  endDate: '26 Nov 2026, 23:59 UTC',
  startIso: '2026-11-13T00:00:00Z',
  endIso: '2026-11-26T23:59:59Z',
};

export default function SpoilersPage() {
  const { user, profile, updateProfile, authLoading } = useAuthStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // General opens first; ?tab=recruitment links straight to the banners.
  const activeTab: SpoilerTab = searchParams.get('tab') === 'recruitment' ? 'recruitment' : 'general';
  const selectTab = (tab: SpoilerTab) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'general') next.delete('tab');
      else next.set('tab', tab);
      return next;
    }, { replace: true });
  const [enablingSpoilers, setEnablingSpoilers] = useState(false);

  const impendingStormStatus = computeDateStatus(
    IMPENDING_STORM_EVENT.startIso,
    IMPENDING_STORM_EVENT.endIso,
  );
  const showImpendingStorm = impendingStormStatus.state !== 'ended';

  const isLoggedIn = !!user;
  const showSpoilers = Boolean(profile?.show_spoilers);

  const handleQuickEnableSpoilers = async () => {
    setEnablingSpoilers(true);
    await updateProfile({ show_spoilers: true });
    setEnablingSpoilers(false);
  };

  // ── Access Protection: Not Logged In ──
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
        <Link
          to="/?home=true"
          className="inline-flex items-center gap-2 text-xs font-semibold text-mh-slate-400 hover:text-mh-gold-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-mh-slate-900/90 to-mh-slate-950 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 shadow-inner mb-6">
            <img
              src="/img/ui/AggPageIcon_Recruit.png"
              alt="Spoilers"
              className="h-full w-full object-contain opacity-70"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 mb-3">
            <EyeOff size={14} />
            <span>Spoiler Content Gated</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
            Authentication Required
          </h1>
          <p className="text-sm text-mh-slate-300 max-w-xl mx-auto leading-relaxed mb-8">
            This page contains unreleased character details, datamined schedule dates, and recruitment leak summaries.
            Please sign in to your Hunter account and enable <strong>Show Spoilers</strong> in your Profile & Settings before viewing.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-6 py-3 text-sm font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-all shadow-lg hover:shadow-mh-gold-500/20"
            >
              <Lock size={16} />
              Login to Field Guide
            </button>
            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800/80 px-6 py-3 text-sm font-semibold text-mh-slate-200 hover:bg-mh-slate-700 transition-all"
            >
              Profile & Settings
            </Link>
          </div>
        </div>

        <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      </div>
    );
  }

  // ── Access Protection: Logged in, but Show Spoilers disabled ──
  if (!showSpoilers) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
        <Link
          to="/?home=true"
          className="inline-flex items-center gap-2 text-xs font-semibold text-mh-slate-400 hover:text-mh-gold-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        <div className="rounded-2xl border border-mh-gold-500/30 bg-gradient-to-b from-mh-slate-900/90 to-mh-slate-950 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-mh-gold-500/10 border border-mh-gold-500/30 p-3 shadow-inner mb-6">
            <img
              src="/img/ui/AggPageIcon_Recruit.png"
              alt="Spoilers"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-300 mb-3">
            <ShieldAlert size={14} />
            <span>Spoilers Disabled in Profile</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
            Spoilers Are Hidden
          </h1>
          <p className="text-sm text-mh-slate-300 max-w-xl mx-auto leading-relaxed mb-8">
            Your hunter profile is currently set to hide spoiler content. You can enable <strong>Show Spoilers</strong> right here or via your Profile & Settings page to reveal upcoming banner schedules, datamined adventurers, and pity mechanics.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleQuickEnableSpoilers}
              disabled={enablingSpoilers || authLoading}
              className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-6 py-3 text-sm font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-all shadow-lg hover:shadow-mh-gold-500/20 disabled:opacity-50"
            >
              <Eye size={16} />
              {enablingSpoilers ? 'Enabling...' : 'Turn On Show Spoilers'}
            </button>
            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800/80 px-6 py-3 text-sm font-semibold text-mh-slate-200 hover:bg-mh-slate-700 transition-all"
            >
              Manage in Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Full Spoilers Content ──
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 animate-fade-in">
      {/* Breadcrumb */}
      <div>
        <Link
          to="/?home=true"
          className="inline-flex items-center gap-2 text-xs font-semibold text-mh-slate-400 hover:text-mh-gold-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>
      </div>

      {/* Main Page Title Header with AggPageIcon_Recruit.png */}
      <div className="mho-panel relative overflow-hidden p-6 sm:p-8 border-white/15 shadow-2xl">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full blur-[100px]"
          style={{
            background:
              'radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mh-gold-500/10 border border-mh-gold-500/30 p-2 shadow-inner">
              <img
                src="/img/ui/AggPageIcon_Recruit.png"
                alt="Recruitment Spoilers"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-300 mb-1.5">
                <span>❖</span>
                <span>Unreleased Intel & Schedule</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Spoilers & Recruitment Schedule
              </h1>
              <p className="text-xs sm:text-sm text-mh-slate-400 mt-1 max-w-2xl">
                Upcoming banner timeline, rotating pools, {showImpendingStorm ? 'Kushala Daora event details, ' : ''}and pity mechanics breakdown.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto rounded-xl bg-black/40 border border-white/10 px-3.5 py-2 text-xs text-mh-slate-300">
            <Sparkles size={15} className="text-mh-gold-400" />
            <span>Spoiler Mode: <strong className="text-emerald-400">Active</strong></span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div role="tablist" aria-label="Spoiler sections" className="flex flex-wrap gap-2 border-b border-mh-slate-700/80 pb-3">
        {SPOILER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => selectTab(t.id)}
            className={cn(
              'rounded-xl border px-4 py-2 text-sm font-bold transition-colors',
              activeTab === t.id
                ? 'border-mh-gold-500/60 bg-mh-gold-500/15 text-mh-gold-300'
                : 'border-white/10 bg-mh-slate-900/60 text-mh-slate-400 hover:text-white hover:border-white/25',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralSpoilers onImageClick={setModalImage} />}

      {activeTab === 'recruitment' && (
      <>
      {/* ── TOP SECTION 1: Recruitment schedule (from the banners table; statuses worked out live) ── */}
      <BannerSchedule onImageClick={(img) => setModalImage({ src: img.src, alt: img.caption })} />

      {/* ── TOP SECTION 3: Limited-Time Event: Impending Storm (Kushala Daora) ── */}
      {showImpendingStorm && (
        <section className="space-y-6 pt-4">
          <div className="flex items-center gap-2.5 border-b border-mh-slate-700/80 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display">Limited-Time Event: Impending Storm</h2>
                {impendingStormStatus.state === 'current' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Happening Now
                  </span>
                )}
              </div>
              <p className="text-xs text-mh-slate-400">
                {impendingStormStatus.state === 'current' ? 'Active event: ' : ''}Kushala Daora arrival, challenge quests, Omens modifiers, point rewards, and gear leaks.
              </p>
            </div>
          </div>

          {/* Event Main Banner & Overview */}
          <div className={cn(
            'rounded-2xl border p-5 sm:p-7 shadow-xl space-y-6 transition-all',
            impendingStormStatus.state === 'current'
              ? 'border-purple-500/50 bg-gradient-to-b from-mh-slate-900/95 via-purple-950/20 to-mh-slate-950 ring-1 ring-purple-500/30'
              : 'border-purple-500/40 bg-gradient-to-b from-mh-slate-900/95 via-mh-slate-900/90 to-mh-slate-950',
          )}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {impendingStormStatus.state === 'current' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Happening Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    <Clock size={12} />
                    Coming Soon
                  </span>
                )}
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                  Impending Storm — Kushala Daora
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-mh-slate-300 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                <Calendar size={13} className="text-mh-gold-400" />
                <span>November 13, 2026 → November 26, 2026</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5">
              <div
                className="group relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/10 bg-black/60 cursor-pointer shadow-lg"
                onClick={() => setModalImage({ src: '/images/events/Impending Storm.png', alt: 'Impending Storm Event Banner' })}
              >
                <img
                  src="/images/events/Impending Storm.png"
                  alt="Impending Storm Event Artwork"
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <span className="text-xs font-semibold text-white drop-shadow">Click to inspect</span>
                  <Maximize2 size={16} className="text-white drop-shadow" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-3 text-xs sm:text-sm text-mh-slate-300 leading-relaxed">
              <p className="font-semibold text-white text-base">
                Event Hunt Modes & Challenge Quests
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl bg-black/40 border border-white/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-mh-gold-300 font-bold text-xs uppercase tracking-wide">
                    <Swords size={14} />
                    <span>Challenge Quests</span>
                  </div>
                  <ul className="text-xs text-mh-slate-300 list-disc list-inside space-y-1">
                    <li>Hunt Kushala Daora once</li>
                    <li>Break Kushala Daora’s head twice</li>
                    <li>Clear with 400 and 500 points</li>
                    <li>Clear with Omens: <em>Dazed Rampage</em> and <em>Expanded Wind Pressure</em></li>
                  </ul>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs uppercase tracking-wide">
                    <Trophy size={14} />
                    <span>Hunt Types</span>
                  </div>
                  <div className="text-xs text-mh-slate-300 space-y-2">
                    <p>
                      <strong>Tryout Hunt:</strong> Solo mode with trial adventurers. Costs <strong>0 Energy</strong>, yields no drops, and counts toward quests.
                    </p>
                    <p>
                      <strong>Kushala Daora Descends:</strong> Limited 4-player hunt (AI fills open slots). Select Omens to raise difficulty and earn points (no material drops).
                    </p>
                  </div>
                </div>
              </div>

              {/* Support Hunts Callout */}
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-200 flex items-start gap-2.5">
                <Gift size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300 block">Support Hunt Rewards:</span>
                  <span>Helping other hunters in Support Hunts grants <strong>10 Mega Potions</strong>, <strong>10 Flash Pods</strong>, <strong>10 Tranq Launchers</strong>, and <strong>200 Crimson Crest Coins</strong>.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Points Rewards Grid */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
                <Gift size={15} className="text-mh-gold-400" />
                Point Milestones & Rewards (0 → 2,000 Points)
              </h4>
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                Second half unlocks on Day 7
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
              {EVENT_REWARDS.map((item) => (
                <div
                  key={item.points}
                  className={cn(
                    'p-2.5 rounded-xl border flex flex-col justify-between transition-colors',
                    item.day7
                      ? 'border-purple-500/30 bg-purple-950/20'
                      : 'border-white/10 bg-black/40',
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-mh-gold-400">{item.points} pts</span>
                    {item.day7 && (
                      <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">Day 7</span>
                    )}
                  </div>
                  <span className="font-medium text-white text-[11px] leading-tight">{item.reward}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Omens Modifier System */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              Omens Modifiers (15 Total • 10 or 20 Points Each • 6 Unlock on Day 7)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 space-y-1.5">
                <span className="font-bold text-red-400 uppercase tracking-wide text-[11px] block">
                  Debuffs on You
                </span>
                <ul className="text-mh-slate-300 space-y-1 list-disc list-inside">
                  <li>Stamina −50</li>
                  <li>Health −40%</li>
                  <li>No recovery items</li>
                  <li>2 fewer faints allowed</li>
                  <li>Stamina recovery −50%</li>
                  <li>Defense −100</li>
                  <li>Your damage −25%</li>
                </ul>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-1.5">
                <span className="font-bold text-amber-400 uppercase tracking-wide text-[11px] block">
                  Monster Buffs
                </span>
                <ul className="text-mh-slate-300 space-y-1 list-disc list-inside">
                  <li>Health +70%</li>
                  <li>Damage +60%</li>
                  <li>No attack warnings</li>
                  <li>Weak-point damage −40%</li>
                </ul>
              </div>

              <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3.5 space-y-1.5">
                <span className="font-bold text-cyan-400 uppercase tracking-wide text-[11px] block">
                  Kushala Daora Mechanics
                </span>
                <ul className="text-mh-slate-300 space-y-1 list-disc list-inside">
                  <li>More vulnerable to big hits while dazed</li>
                  <li>Larger wind pressure range</li>
                  <li>Tornadoes merge into one giant tornado</li>
                  <li>Wind pressure builds to full power faster</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Kushala Weapons, Armour & Additional Leaks */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
              <Shield size={15} className="text-blue-400" />
              Kushala Daora Equipment & Leaked Items
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-black/40 border border-white/5 p-3.5 space-y-2">
                <span className="font-bold text-mh-gold-300 uppercase tracking-wide text-[11px] block">
                  Kushala Weapons (7 Weapon Types)
                </span>
                <p className="text-mh-slate-300 leading-relaxed">
                  Follows the Apex Weapon template: <strong>1 base physical version</strong> plus 5 elemental variants (<strong>Water, Fire, Ice, Thunder, Dragon</strong>).
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Long Sword', 'Great Sword', 'Dual Blades', 'Lance', 'Hammer', 'Bow', 'Heavy Bowgun'].map((w) => (
                    <span key={w} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-mh-slate-200 text-[11px]">
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-black/40 border border-white/5 p-3.5 space-y-2">
                <span className="font-bold text-blue-300 uppercase tracking-wide text-[11px] block">
                  Armour, Monster Data & Cosmetics
                </span>
                <ul className="text-mh-slate-300 space-y-1.5 leading-relaxed list-disc list-inside">
                  <li>
                    <strong>Kushala Daora Set IV:</strong> 5 pieces at Rarity 10, 145 Defence, 2-piece Tremor Resistance +1 set bonus (skills and crafting recipes TBD; Sets V & VI exist as names).
                  </li>
                  <li>
                    <strong>Monster Details:</strong> Part breaks (Head, Wings, Tail), tail carve, Gold Crown field version, and Visage set.
                  </li>
                  <li>
                    <strong>Achievements & Cosmetics:</strong> 5 event achievements (finish without fainting, beat timer, etc.), α and β layered armour sets, and a Kushala Daora Style Crate.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── BOTTOM SECTION 4: Recruitment Rules & Pity Mechanics ── */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center gap-2.5 border-b border-mh-slate-700/80 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mh-gold-500/10 text-mh-gold-400 border border-mh-gold-500/20">
            <HelpCircle size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-display">Recruitment Guide & Odds</h2>
            <p className="text-xs text-mh-slate-400">
              The game’s own help text explains both banner types, and the guarantee table gives the pity numbers. Everything below is from the game’s English text unless noted as inference/calculation.
            </p>
          </div>
        </div>

        {/* Featured vs Rotating Table */}
        <div className="rounded-2xl border border-mh-gold-500/30 bg-mh-slate-900/90 overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-mh-slate-950 via-mh-slate-900 to-mh-slate-950 px-6 py-4 border-b border-white/10">
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Zap size={16} className="text-mh-gold-400" />
              Featured Recruitment vs Rotating Recruitment
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/40 text-mh-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 sm:px-6 font-semibold w-1/4">Criteria</th>
                  <th className="py-3 px-4 sm:px-6 font-semibold text-mh-gold-300 w-3/8">
                    Featured Recruitment (e.g. Midori, Freya, Stylia)
                  </th>
                  <th className="py-3 px-4 sm:px-6 font-semibold text-blue-300 w-3/8">
                    Rotating Recruitment (e.g. Rhodes, Arkaya)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-mh-slate-200">
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">Currency</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-gold-400 font-medium">Featured Contracts</td>
                  <td className="py-3.5 px-4 sm:px-6 text-blue-400 font-medium">Standard Contracts</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">Featured SSR Afterwards</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300">Not added to the Standard Recruitment when the banner ends</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300">Can also be pulled at the normal rate in the Standard Recruitment</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">SSR Pool</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300">SSR Adventurers only</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300">SSR Adventurers and SSR Buddies</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">Pity Counter</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300">Carries over only to recruitments of the same kind (Featured → Featured, Festival → Festival)</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300">Counted separately; doesn't affect any other banner</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-mh-slate-950/80 px-6 py-3 border-t border-white/5 text-xs text-mh-slate-400 flex items-center gap-2">
            <Info size={14} className="text-mh-gold-400 shrink-0" />
            <span>
              <strong>Festival Recruitment note:</strong> A Festival Recruitment (Freya’s rerun is one) follows the Featured rules and shares its pity counter.
            </span>
          </div>
        </div>

        {/* Chances & Pity Numbers */}
        <div className="rounded-2xl border border-white/10 bg-mh-slate-900/80 p-6 sm:p-7 space-y-5 shadow-lg">
          <div className="flex items-center gap-2 text-white font-display font-bold text-base border-b border-white/10 pb-3">
            <Coins size={18} className="text-mh-gold-400" />
            <h3>Chances for Featured and Rotating Banners</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/5 p-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mh-gold-400">SSR Base Rate</span>
              <p className="text-xl font-bold text-white">0.6% <span className="text-xs text-mh-slate-400 font-normal">(0.3% featured)</span></p>
              <p className="text-xs text-mh-slate-300">One SSR is guaranteed within <strong>90 pulls</strong>.</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">50 / 50 Mechanic</span>
              <p className="text-xl font-bold text-white">50% Win Rate</p>
              <p className="text-xs text-mh-slate-300">When you get an SSR, it’s the featured one 50% of the time. If you lose, your next SSR is guaranteed featured.</p>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Featured Guarantee</span>
              <p className="text-xl font-bold text-white">120 Pulls Cap</p>
              <p className="text-xs text-mh-slate-300">Once per banner period, you’re guaranteed the featured SSR within 120 pulls. This 120 count does not carry over.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">SR Rates</span>
              <p className="text-xl font-bold text-white">9.4%</p>
              <p className="text-xs text-mh-slate-300">7.05% SR Adventurer, 2.35% SR Buddy. 1 SR guaranteed every 10 pulls.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">R Rates</span>
              <p className="text-xl font-bold text-white">90% Base</p>
              <p className="text-xs text-mh-slate-300">Consists of R Buddies.</p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Real Average Chances (With Pity)</span>
              <p className="text-sm font-semibold text-white">Any SSR: 1.6063%</p>
              <p className="text-xs text-mh-slate-300">Featured SSR: 1.0709% • Any SR: 14.3105% • R: 84.0832%</p>
            </div>
          </div>
        </div>

        {/* Other Banners Table */}
        <div className="rounded-2xl border border-white/10 bg-mh-slate-900/90 overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-mh-slate-950 via-mh-slate-900 to-mh-slate-950 px-6 py-4 border-b border-white/10">
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Coins size={16} className="text-mh-gold-400" />
              Other Banners
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/40 text-mh-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 sm:px-6 font-semibold w-1/4">Banner</th>
                  <th className="py-3 px-4 sm:px-6 font-semibold w-1/6">SSR</th>
                  <th className="py-3 px-4 sm:px-6 font-semibold w-1/6">SR</th>
                  <th className="py-3 px-4 sm:px-6 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-mh-slate-200">
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-white">Standard</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-gold-300 font-medium">0.6% <span className="text-[11px] text-mh-slate-400 block">(1.0709% w/ pity)</span></td>
                  <td className="py-3.5 px-4 sm:px-6 text-purple-300 font-medium">9.4%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300 text-xs leading-relaxed">
                    SSR within 90 pulls. If your last two SSRs were both Buddies, the next is guaranteed to be an Adventurer. After 300 pulls, a one-time free pick of any SSR.
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-white">Buddy</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-gold-300 font-medium">0.6% <span className="text-[11px] text-mh-slate-400 block">(Featured Buddy)</span></td>
                  <td className="py-3.5 px-4 sm:px-6 text-purple-300 font-medium">9.4%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300 text-xs leading-relaxed">
                    SSR within 90 pulls; the counter carries over between Buddy banners. SR pool is 7.05% SR Buddy, 2.35% SR Adventurer.
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-white">Beginner’s</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-gold-300 font-medium">0.6%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-purple-300 font-medium">9.4%</td>
                  <td className="py-3.5 px-4 sm:px-6 text-mh-slate-300 text-xs leading-relaxed">
                    SSR guaranteed within 50 pulls, 50 pulls maximum, 10-pull at 20% off.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-mh-slate-950/80 px-6 py-3 border-t border-white/5 text-xs text-mh-slate-400 flex items-start gap-2">
            <Info size={14} className="text-mh-gold-400 shrink-0 mt-0.5" />
            <span>
              <strong>Note on Standard row:</strong> Including pity, the game gives SSR Adventurer 0.9179% and SSR Buddy 0.6884% (1.6063% combined), and SR 14.3105%.
            </span>
          </div>
        </div>

        {/* Soft Pity Deep Dive Callout */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-mh-slate-900 to-mh-slate-950 p-6 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-300 font-display font-bold text-base">
            <TrendingUp size={18} />
            <h3>Probability Analysis: Soft Pity, Likely From Pull 74</h3>
          </div>
          <p className="text-xs sm:text-sm text-mh-slate-300 leading-relaxed">
            The game text explicitly states “guaranteed within 90”. However, the internal guarantee table contains a second number for every SSR counter: <strong>73</strong>.
          </p>
          <p className="text-xs sm:text-sm text-mh-slate-300 leading-relaxed">
            If the pull rate stayed flat at 0.6% until a sudden hard guarantee at 90, the mathematical average SSR chance would only be ~1.44%. The game’s stated average of <strong>1.6063%</strong> mathematically works out when odds climb from about <strong>pull 74</strong>, escalating by roughly 6% per pull until reaching 100% at pull 90.
          </p>
          <p className="text-[11px] text-mh-slate-400 italic">
            * Note: While the guarantee table confirms the 73 checkpoint, the climbing curve is a mathematical calculation rather than explicit in-game text. We refer to this as “soft pity, likely from pull 74”. The SR guarantee has no secondary number; its table straightforwardly states 10.
          </p>
        </div>
      </section>

      </>
      )}

      {/* ── Image Lightbox Modal ── */}
      {modalImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl rounded-2xl overflow-hidden border border-white/20 bg-mh-slate-950 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-mh-slate-300 hover:bg-black hover:text-white transition-colors"
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className="max-h-[85vh] w-auto rounded-xl object-contain mx-auto"
            />
            <p className="text-center text-xs text-mh-slate-400 mt-2 pb-1 font-mono">{modalImage.alt}</p>
          </div>
        </div>
      )}
    </div>
  );
}
