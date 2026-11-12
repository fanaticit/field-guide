import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Shield,
  Coins,
  HeartPulse,
  Sliders,
  History,
  TrendingDown,
  TrendingUp,
  Award,
  Clock,
  ScrollText,
} from 'lucide-react';
import { usePatchReactions, DEFAULT_REACTION_EMOJIS } from '../hooks/usePatchReactions';

export default function GameUpdates() {
  const patchVersion = '1.0.9.3';
  const { counts, react } = usePatchReactions(patchVersion);
  const [justClicked, setJustClicked] = useState<string | null>(null);

  const handleEmojiClick = (emoji: string) => {
    react(emoji);
    setJustClicked(emoji);
    setTimeout(() => setJustClicked(null), 600);
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Navigation breadcrumb / back link */}
      <div>
        <Link
          to="/?home=true"
          className="inline-flex items-center gap-2 text-xs font-semibold text-mh-slate-400 hover:text-mh-gold-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>
      </div>

      {/* Main Header Panel */}
      <div className="mho-panel relative overflow-hidden p-6 sm:p-8 border-white/15 shadow-2xl">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full blur-[100px]"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mh-gold-500/10 border border-mh-gold-500/30 text-mh-gold-400 shadow-inner">
              <ScrollText size={28} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-300 mb-1.5">
                <span>❖</span>
                <span>Changelog & Patch Notes</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Game Updates
              </h1>
              <p className="text-xs sm:text-sm text-mh-slate-400 mt-1">
                These are the game updates, balance adjustments, and system changes for Monster Hunter Outlanders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl bg-black/40 border border-white/10 px-3.5 py-2 text-xs text-mh-slate-300">
            <History size={15} className="text-mh-gold-400" />
            <span>Latest: <strong>Patch 1.0.9.3</strong></span>
          </div>
        </div>
      </div>

      {/* Patch Card 1.0.9.3 */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-mh-gold-500/40 bg-gradient-to-b from-mh-slate-900/90 to-mh-slate-950 p-6 sm:p-8 shadow-xl relative">
          {/* Top Patch Title Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" />
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  Patch 1.0.9.3
                </h2>
                <div className="flex items-center gap-2 text-xs text-mh-gold-400 font-medium mt-0.5">
                  <Clock size={13} />
                  <span>10th Nov 2026</span>
                </div>
              </div>
            </div>

            {/* Emoji Reactions & Live Version Badge */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-xl bg-black/50 border border-white/10 p-1 shadow-inner">
                <span className="hidden sm:inline px-2 text-[10px] font-semibold uppercase tracking-wider text-mh-slate-400">
                  Rate Patch:
                </span>
                {DEFAULT_REACTION_EMOJIS.map(({ emoji, label }) => {
                  const count = counts[emoji] || 0;
                  const isBouncing = justClicked === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      title={`${label} (${count})`}
                      className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                        isBouncing
                          ? 'scale-110 bg-mh-gold-500/25 border border-mh-gold-500/60 text-white'
                          : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-mh-gold-500/30 text-mh-slate-300 hover:text-white'
                      }`}
                    >
                      <span className={`text-base transition-transform group-hover:scale-125 ${isBouncing ? 'animate-bounce' : ''}`}>
                        {emoji}
                      </span>
                      <span className="font-mono text-xs font-bold tabular-nums text-mh-gold-300">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="inline-flex items-center rounded-lg bg-mh-gold-500/15 px-3 py-1.5 text-xs font-semibold text-mh-gold-300 border border-mh-gold-500/30">
                Current Live Version
              </span>
            </div>
          </div>

          {/* Notice Banner: Skill Guild Might */}
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3.5">
            <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed text-amber-100/90">
              <strong className="text-white block font-semibold mb-1">
                Guild Might Skill Cap Adjustment
              </strong>
              The six Guild Might skills (<strong>Weapon, Helm, Mail, Gauntlets, Coil, and Greaves</strong>) now stop at level 11 instead of 12.
            </div>
          </div>

          {/* Grid of Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Section 1: Cheaper upgrades */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-mh-gold-400 pb-2 border-b border-white/5">
                <Coins size={18} />
                <h3 className="font-display text-sm sm:text-base font-bold text-white">
                  Cheaper Upgrades
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-mh-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mh-gold-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Elemental Awakening:</strong> The zenny cost of stages 1–6 is a third lower.
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-mono text-mh-slate-400">
                      <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">9,000 → 6,000</span>
                      <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">324,000 → 216,000</span>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mh-gold-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Visage card enhancing cost:</strong> Each level costs 475 less zenny.
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-mono text-mh-slate-400">
                      <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">500 → 25</span>
                      <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">660 → 185</span>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mh-gold-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Radiant Challenge:</strong> Stages need less damage to clear.
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-mono text-mh-slate-400">
                      <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">160,000 → 150,000</span>
                      <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">270,000 → 240,000</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Section 2: Adventurer Keepsake buffs */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-sky-400 pb-2 border-b border-white/5">
                <Award size={18} />
                <h3 className="font-display text-sm sm:text-base font-bold text-white">
                  Adventurer Keepsake (Engraving) Buffs
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-mh-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Bonus starts sooner for most adventurers:</strong> Each of these has an elemental damage bonus, and the patch cuts the amount needed before it kicks in by about a third.
                    <p className="mt-1.5 text-xs text-mh-slate-400 leading-relaxed">
                      Covers: <span className="text-sky-200">Ouyang Varen, Pyro, Haze, Luka, Freya, Rhodes, Raya, Pepper, Madelyn, Luxheart, Arkaya, Ryunosuke</span>, and <span className="text-sky-200">Stylia</span>.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Critical damage replaced:</strong> Midori and Keres had their Element Critical Damage bonus replaced.
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-orange-300">
                        Midori → Fire damage
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-purple-300">
                        Keres → Dragon damage
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Section 3: Monster Health Changes */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <HeartPulse size={18} />
                  <h3 className="font-display text-sm sm:text-base font-bold text-white">
                    Monster Health Changes
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-mh-slate-400">
                  55 entries modified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="rounded-lg bg-white/5 border border-white/5 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <TrendingDown size={14} />
                    <span>Field Monsters</span>
                  </div>
                  <p className="text-xs text-mh-slate-300 leading-relaxed">
                    <strong className="text-white">Kulu-Ya-Ku, Pukei-Pukei</strong> and <strong className="text-white">Great Girros</strong> lost health.
                  </p>
                  <p className="text-xs text-mh-slate-400 leading-relaxed">
                    <strong className="text-mh-slate-300">Barroth, Anjanath</strong> and <strong className="text-mh-slate-300">Tobi-Kadachi</strong> gained some health.
                  </p>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/5 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
                    <TrendingUp size={14} />
                    <span>Harder Hunts</span>
                  </div>
                  <p className="text-xs text-mh-slate-300 leading-relaxed">
                    Some hunts got much tougher:
                  </p>
                  <ul className="text-xs text-mh-slate-400 space-y-1">
                    <li>• <strong className="text-rose-200">Tzitzi-Ya-Ku & Barroth:</strong> Up to +70% HP</li>
                    <li>• <strong className="text-rose-200">Anjanath & Paolumu:</strong> ~+33% HP</li>
                  </ul>
                  <div className="pt-1 border-t border-white/5">
                    <span className="text-[11px] text-emerald-300 font-medium">Easier hunts: </span>
                    <span className="text-[11px] text-mh-slate-400">
                      Tobi-Kadachi −34%, Jyuratodus −24%, Barroth & Great Jagras −27%, Diablos ~−10%.
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/5 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Sparkles size={14} />
                    <span>Event-Style Hunts</span>
                  </div>
                  <p className="text-xs text-mh-slate-300 leading-relaxed">
                    Across 15 event entries:
                  </p>
                  <div className="rounded bg-black/40 border border-white/5 p-2 text-center text-xs font-bold text-amber-300">
                    About 16% less health
                  </div>
                  <p className="text-[11px] text-mh-slate-400">
                    Speeds up event clears and farming rotations.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Other tweaks */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-purple-400 pb-2 border-b border-white/5">
                <Sliders size={18} />
                <h3 className="font-display text-sm sm:text-base font-bold text-white">
                  Other Tweaks
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-mh-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Teammate skill cooldowns:</strong> Max level is now <strong>30s</strong> instead of 40s, and <strong>40s</strong> instead of 50s for the support version.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Hunt modifiers:</strong>
                    <ul className="mt-1 space-y-1 text-xs text-mh-slate-400">
                      <li>• <strong>Predatory Instinct:</strong> drops from 10% to 5%.</li>
                      <li>• <strong>Lightning Speed:</strong> is stronger and lasts 180s instead of 90s.</li>
                      <li>• <strong>Desperate Hunt:</strong> is weaker.</li>
                    </ul>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Field Hunts as a new source:</strong> Every monster Appearance Crate (normal, Rare and Epic), Dash Juice, and Light Suppressant can now come from Field Hunts.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                  <div>
                    <strong className="text-white font-medium">Reward changes:</strong> Some reward bundles give more Verdant Dew (32 → 72) and less Aqua Dew. One reward that used to be 100 Research Points is now <strong>Lucent Crystallite ×10, Radiant Brush ×5 and 100,000 zenny</strong>.
                  </div>
                </li>
              </ul>
            </div>

            {/* Section 5: New or changed in small ways */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-teal-400 pb-2 border-b border-white/5">
                <Sparkles size={18} />
                <h3 className="font-display text-sm sm:text-base font-bold text-white">
                  New or Changed in Small Ways
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-mh-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
                  <span>Three new trials using the buddies <strong>Aku</strong> and <strong>Icarus</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
                  <span><strong>Anti-Blight Potion</strong> added to the Material Store.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
                  <span>New effects for the buddy skill <strong>Crimson Fang Resonance</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
                  <span>The wait between guild recruitment posts goes from <strong>1 minute to 15 minutes</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
                  <span>A few shop bundles (Flash Sale, Golden Check-In, Value Card Pack, etc.) had settings tweaked.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
