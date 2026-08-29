// ─────────────────────────────────────────────────────────────
// Monster Guide — shows the live monster roster for MHN or MHO
// pulled directly from Supabase, grouped by tier, sorted by the
// per-game sort order set in the admin panel.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react';
import { Bug, Info, RefreshCw, AlertTriangle, Search, X } from 'lucide-react';
import { usePublicMonsters, type DBMonster } from '../../hooks/useAdminMonsters';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

// ── Game toggle ───────────────────────────────────────────────
type GameId = 'mhn' | 'mho';

const GAMES: { id: GameId; label: string; shortLabel: string }[] = [
  { id: 'mhn', label: 'Monster Hunter Now',        shortLabel: 'MHN' },
  { id: 'mho', label: 'Monster Hunter Outlanders', shortLabel: 'MHO' },
];

// ── Tier section config ───────────────────────────────────────
const TIER_SECTIONS: { tier: string; label: string; badgeCls: string; desc: string }[] = [
  { tier: 'small', label: 'Small Monsters',  badgeCls: 'rarity-1',     desc: 'Common small creatures encountered in the field' },
  { tier: 'low',   label: 'Low Rank',        badgeCls: 'rarity-2',     desc: 'Introductory monsters — easier encounters' },
  { tier: 'high',  label: 'High Rank',       badgeCls: 'rarity-4',     desc: 'Mid-tier threats requiring solid preparation' },
  { tier: 'elder', label: 'Elder Dragons',   badgeCls: 'rarity-elder', desc: 'Ancient forces of nature — the toughest hunts' },
  { tier: 'collab',label: 'Collab / Event',  badgeCls: 'rarity-5',     desc: 'Limited-time collaboration monsters' },
];

// ── Element colours ───────────────────────────────────────────
const ELEMENT_COLOURS: Record<string, string> = {
  fire:      'bg-el-fire/15 text-el-fire border border-el-fire/30',
  water:     'bg-el-water/15 text-el-water border border-el-water/30',
  thunder:   'bg-el-thunder/15 text-el-thunder border border-el-thunder/30',
  ice:       'bg-el-ice/15 text-el-ice border border-el-ice/30',
  dragon:    'bg-el-dragon/15 text-el-dragon border border-el-dragon/30',
  poison:    'bg-el-poison/15 text-el-poison border border-el-poison/30',
  paralysis: 'bg-el-paralysis/15 text-el-paralysis border border-el-paralysis/30',
  sleep:     'bg-el-sleep/15 text-el-sleep border border-el-sleep/30',
  blast:     'bg-el-blast/15 text-el-blast border border-el-blast/30',
};

const ELEMENT_LABELS: Record<string, string> = {
  fire: '🔥 Fire', water: '💧 Water', thunder: '⚡ Thunder', ice: '❄️ Ice',
  dragon: '🐉 Dragon', poison: '☠️ Poison', paralysis: '⚡ Para',
  sleep: '💤 Sleep', blast: '💥 Blast',
};

const TIER_CONFIG: Record<string, { label: string; cls: string }> = {
  small:  { label: 'Small',  cls: 'rarity-1' },
  low:    { label: 'Low',    cls: 'rarity-2' },
  high:   { label: 'High',   cls: 'rarity-4' },
  elder:  { label: 'Elder',  cls: 'rarity-elder' },
  collab: { label: 'Collab', cls: 'rarity-5' },
};

const SPECIES_LABELS: Record<string, string> = {
  flying_wyvern:  'Flying Wyvern',
  brute_wyvern:   'Brute Wyvern',
  bird_wyvern:    'Bird Wyvern',
  fanged_wyvern:  'Fanged Wyvern',
  fanged_beast:   'Fanged Beast',
  leviathan:      'Leviathan',
  elder_dragon:   'Elder Dragon',
  piscine_wyvern: 'Piscine Wyvern',
  carapaceon:     'Carapaceon',
  temnoceran:     'Temnoceran',
  neopteron:      'Neopteron',
};

// ── Monster card (DB-shape) ───────────────────────────────────
function ElementChip({ el }: { el: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none',
      ELEMENT_COLOURS[el] ?? 'bg-mh-slate-700/40 text-mh-slate-400 border border-mh-slate-700',
    )}>
      {ELEMENT_LABELS[el] ?? el}
    </span>
  );
}

function MonsterCard({ monster, game }: { monster: DBMonster; game: string }) {
  const tierCfg   = TIER_CONFIG[monster.tier] ?? { label: monster.tier, cls: 'rarity-1' };
  const sortOrder = monster.sort_orders[game];

  return (
    <div className="mh-card flex flex-col gap-3 p-3">
      <div className="flex items-start gap-3">
        {/* Icon / silhouette */}
        <div className="relative shrink-0">
          {monster.icon ? (
            <img
              src={monster.icon}
              alt={monster.name}
              className="h-14 w-14 rounded-lg object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-lg bg-mh-slate-700/60 text-2xl',
              monster.icon ? 'hidden' : '',
            )}
            aria-hidden="true"
          >
            🐾
          </div>
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {sortOrder !== undefined && (
              <span className="font-mono text-[9px] text-mh-slate-600">#{sortOrder}</span>
            )}
            <span className={`rarity-badge ${tierCfg.cls}`}>{tierCfg.label}</span>
            {monster.is_variant && (
              <span className="rounded bg-mh-slate-700 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-mh-slate-500">
                variant
              </span>
            )}
            {monster.is_radiant && (
              <span className="rounded bg-yellow-500/20 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-yellow-400">
                radiant
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-bold leading-tight text-mh-slate-100">
            {monster.name}
          </p>
          {monster.name_ja && (
            <p className="mt-0.5 truncate text-[10px] leading-none text-mh-slate-600">
              {monster.name_ja}
            </p>
          )}
          {monster.species && (
            <p className="mt-0.5 text-[10px] text-mh-slate-600">
              {SPECIES_LABELS[monster.species] ?? monster.species}
            </p>
          )}
        </div>
      </div>

      {/* Elements */}
      {monster.elements.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-mh-slate-600">Element</p>
          <div className="flex flex-wrap gap-1">
            {monster.elements.map((el) => <ElementChip key={el} el={el} />)}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {monster.weaknesses.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-mh-slate-600">Weak to</p>
          <div className="flex flex-wrap gap-1">
            {monster.weaknesses.map((el) => <ElementChip key={el} el={el} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Game tab content ──────────────────────────────────────────
function GameMonsters({ game }: { game: string }) {
  const [search, setSearch] = useState('');
  const { data: monsters = [], isLoading, error, refetch } = usePublicMonsters(game);

  const filtered = useMemo(() => {
    if (!search) return monsters;
    const q = search.toLowerCase();
    return monsters.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.name_ja ?? '').toLowerCase().includes(q),
    );
  }, [monsters, search]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center gap-3 text-mh-slate-500">
        <RefreshCw size={20} className="animate-spin" />
        <span>Loading monsters…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-sm text-red-400">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-mh-slate-800 px-4 py-2 text-xs text-mh-slate-300 hover:bg-mh-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search monsters…"
          className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-8 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mh-slate-600 hover:text-mh-slate-400">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Tier sections */}
      {TIER_SECTIONS.map(({ tier, label, badgeCls, desc }) => {
        const tiered = filtered.filter((m) => m.tier === tier);
        if (tiered.length === 0) return null;

        return (
          <section key={tier} className="flex flex-col gap-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-mh-slate-700" />
              <div className="flex items-center gap-2">
                <span className={`rarity-badge ${badgeCls}`}>{label}</span>
                <span className="text-xs text-mh-slate-600">{tiered.length} monsters</span>
              </div>
              <div className="flex-1 border-t border-mh-slate-700" />
            </div>
            <p className="-mt-2 text-center text-xs text-mh-slate-600">{desc}</p>

            {/* Monster grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tiered.map((monster) => (
                <MonsterCard key={monster.id} monster={monster} game={game} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-16 text-center text-mh-slate-600">No monsters match your search.</p>
      )}
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────
export default function MonsterGuide() {
  const defaultGame = useUIStore((s) => s.defaultGame);
  const [activeGame, setActiveGame] = useState<GameId>((defaultGame as GameId) || 'mhn');

  useEffect(() => {
    if (defaultGame === 'mhn' || defaultGame === 'mho') {
      setActiveGame(defaultGame as GameId);
    }
  }, [defaultGame]);

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
      </div>

      {/* MHO notice */}
      {activeGame === 'mho' && (
        <div className="flex items-start gap-3 rounded-xl border border-mh-slate-700 bg-mh-slate-800/60 p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-el-dragon" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mh-slate-200">
              Monster Hunter Outlanders — Beta Roster
            </p>
            <p className="mt-1 text-xs leading-relaxed text-mh-slate-500">
              MHO is currently in closed beta. Only monsters confirmed for Aesoland are shown here.
              Radiant variants will be added as they are officially confirmed.
            </p>
          </div>
        </div>
      )}

      {/* Per-game content — remounts when game changes to fresh-fetch */}
      <GameMonsters key={activeGame} game={activeGame} />
    </div>
  );
}
