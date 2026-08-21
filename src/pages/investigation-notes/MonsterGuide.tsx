// ─────────────────────────────────────────────────────────────
// Monster Guide — shows the monster roster for MHN or MHO,
// grouped by tier, with a pill toggle to switch games.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Bug, Info } from 'lucide-react';
import MonsterCard from '../../components/MonsterCard';
import { MONSTERS_SORTED } from '../../data/core/monsters.js';
import { MHN_MONSTER_OVERLAY_MAP } from '../../data/games/mhn/monsters.js';
import { cn } from '../../lib/utils';
import type { MonsterTier } from '../../data/schemas/index.js';

// ── Game toggle ───────────────────────────────────────────────
type GameId = 'mhn' | 'mho';

const GAMES: { id: GameId; label: string; shortLabel: string }[] = [
  { id: 'mhn', label: 'Monster Hunter Now', shortLabel: 'MHN' },
  { id: 'mho', label: 'Monster Hunter Outlanders', shortLabel: 'MHO' },
];

// ── Tier section config ───────────────────────────────────────
const TIER_SECTIONS: { tier: MonsterTier; label: string; badgeCls: string; desc: string }[] = [
  { tier: 'low',   label: 'Low Rank',   badgeCls: 'rarity-2',     desc: 'Introductory monsters — easier encounters' },
  { tier: 'high',  label: 'High Rank',  badgeCls: 'rarity-4',     desc: 'Mid-tier threats requiring solid preparation' },
  { tier: 'elder', label: 'Elder Dragons', badgeCls: 'rarity-elder', desc: 'Ancient forces of nature — the toughest hunts' },
];

// ── MHN monster list (overlaid with icons + sort order) ───────
const MHN_MONSTERS = MONSTERS_SORTED.filter((m) =>
  // Only include monsters that have an MHN overlay entry (i.e. are in the MHN roster)
  MHN_MONSTER_OVERLAY_MAP.has(m.id)
);

// ── MHO monster list (core roster, Radiant data TBC) ─────────
const MHO_MONSTERS = MONSTERS_SORTED;

export default function MonsterGuide() {
  const [activeGame, setActiveGame] = useState<GameId>('mhn');

  const monsters = activeGame === 'mhn' ? MHN_MONSTERS : MHO_MONSTERS;

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Bug size={20} className="text-mh-gold-500" />
          <span className="rarity-badge rarity-5">Investigation Notes</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-mh-slate-100 lg:text-3xl">
          Monster Guide
        </h1>
        <p className="text-sm text-mh-slate-500">
          Browse the monster roster, elements, and weaknesses for each game.
        </p>
      </div>

      {/* Game toggle pill */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex rounded-xl border border-mh-slate-700 bg-mh-slate-900 p-1"
          role="tablist"
          aria-label="Select game"
        >
          {GAMES.map((game) => (
            <button
              key={game.id}
              role="tab"
              aria-selected={activeGame === game.id}
              onClick={() => setActiveGame(game.id)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200',
                activeGame === game.id
                  ? 'bg-mh-gold-500/15 text-mh-gold-300 shadow-sm ring-1 ring-mh-gold-700/50'
                  : 'text-mh-slate-400 hover:text-mh-slate-200',
              )}
            >
              <span className="hidden sm:inline">{game.label}</span>
              <span className="sm:hidden">{game.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Monster count */}
        <p className="text-xs text-mh-slate-500">
          {monsters.length} monster{monsters.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* MHO beta notice */}
      {activeGame === 'mho' && (
        <div className="flex items-start gap-3 rounded-xl border border-mh-slate-700 bg-mh-slate-800/60 p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-el-dragon" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mh-slate-200">
              Monster Hunter Outlanders — Beta Roster
            </p>
            <p className="mt-1 text-xs text-mh-slate-500 leading-relaxed">
              MHO is currently in closed beta. The roster shown here is the core Monster Hunter
              monster list — Radiant variants specific to Aesoland will be added as they are
              officially confirmed from beta footage and announcements.
            </p>
          </div>
        </div>
      )}

      {/* Tier sections */}
      {TIER_SECTIONS.map(({ tier, label, badgeCls, desc }) => {
        const tieredMonsters = monsters.filter((m) => m.tier === tier);
        if (tieredMonsters.length === 0) return null;

        return (
          <section key={tier} className="flex flex-col gap-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-mh-slate-700" />
              <div className="flex items-center gap-2">
                <span className={`rarity-badge ${badgeCls}`}>{label}</span>
                <span className="text-xs text-mh-slate-600">
                  {tieredMonsters.length} monsters
                </span>
              </div>
              <div className="flex-1 border-t border-mh-slate-700" />
            </div>
            <p className="text-xs text-mh-slate-600 text-center -mt-2">{desc}</p>

            {/* Monster grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tieredMonsters.map((monster) => {
                const overlay = MHN_MONSTER_OVERLAY_MAP.get(monster.id);
                return (
                  <MonsterCard
                    key={monster.id}
                    monster={monster}
                    icon={overlay?.icon}
                    sortOrder={overlay?.sortOrder}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
