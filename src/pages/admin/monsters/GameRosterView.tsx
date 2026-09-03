// ─────────────────────────────────────────────────────────────
// GameRosterView — monster × game assignment matrix
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Search, RefreshCw, Check, Plus, X, AlertCircle } from 'lucide-react';
import { type DBMonster, useToggleMonsterGame } from '../../../hooks/useAdminMonsters';
import { cn } from '../../../lib/utils';

const GAMES = [
  { id: 'mhn', label: 'Monster Hunter Now',        short: 'MHN', color: 'blue'   },
  { id: 'mho', label: 'Monster Hunter Outlanders', short: 'MHO', color: 'orange' },
] as const;

const SPECIES_SHORT: Record<string, string> = {
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

const TIER_COLORS: Record<string, string> = {
  low:    'text-blue-400',
  high:   'text-orange-400',
  elder:  'text-purple-400',
  small:  'text-mh-slate-500',
  collab: 'text-pink-400',
};

// ── Per-game toggle button ───────────────────────────────────
function GameToggle({
  monster,
  game,
}: {
  monster: DBMonster;
  game: typeof GAMES[number];
}) {
  const toggle   = useToggleMonsterGame();
  const inGame   = monster.games.includes(game.id);
  const isPending = toggle.isPending;
  const hasError  = toggle.isError;
  const errorMsg  = toggle.error?.message ?? 'Update failed';

  function handleClick() {
    const newGames = inGame
      ? monster.games.filter((g) => g !== game.id)
      : [...new Set([...monster.games, game.id])];
    toggle.mutate({ id: monster.id, newGames });
  }

  const styles = {
    blue: {
      on:  'bg-blue-500/20 text-blue-300 ring-blue-500/40 hover:bg-blue-500/10',
      off: 'bg-mh-slate-800 text-mh-slate-500 ring-mh-slate-700 hover:ring-blue-500/40 hover:text-blue-400',
      err: 'bg-red-500/20 text-red-300 ring-red-500/40',
    },
    orange: {
      on:  'bg-orange-500/20 text-orange-300 ring-orange-500/40 hover:bg-orange-500/10',
      off: 'bg-mh-slate-800 text-mh-slate-500 ring-mh-slate-700 hover:ring-orange-500/40 hover:text-orange-400',
      err: 'bg-red-500/20 text-red-300 ring-red-500/40',
    },
  } as const;

  const s   = styles[game.color];
  const cls = hasError ? s.err : inGame ? s.on : s.off;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        title={hasError ? errorMsg : inGame ? `Remove from ${game.label}` : `Add to ${game.label}`}
        className={cn(
          'flex w-28 items-center justify-center gap-1.5 rounded-lg px-3 py-2',
          'text-sm font-semibold ring-1 transition-all duration-150',
          cls,
          isPending && 'cursor-wait opacity-60',
        )}
      >
        {isPending   ? <RefreshCw size={13} className="animate-spin" />
         : hasError  ? <AlertCircle size={13} className="shrink-0" />
         : inGame    ? <Check size={13} className="shrink-0" />
                     : <Plus size={13} className="shrink-0" />}
        {isPending ? 'Saving…' : hasError ? 'Error' : inGame ? 'In Game' : 'Add'}
      </button>
      {hasError && (
        <p className="max-w-[120px] text-center text-[10px] leading-tight text-red-400">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
interface Props {
  monsters: DBMonster[];
  isLoading: boolean;
  onRefetch: () => void;
}

export default function GameRosterView({ monsters, isLoading, onRefetch }: Props) {
  const [search, setSearch]               = useState('');
  const [filterTier, setFilterTier]       = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState<'' | 'not-mhn' | 'not-mho'>('');

  const activeMonsters = useMemo(
    () => monsters.filter((m) => m.is_active),
    [monsters],
  );

  const filtered = useMemo(() => {
    let list = [...activeMonsters];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.name_ja ?? '').includes(q),
      );
    }
    if (filterTier) list = list.filter((m) => m.tier === filterTier);
    if (filterSpecies) list = list.filter((m) => m.species === filterSpecies);
    if (filterUnassigned === 'not-mhn') list = list.filter((m) => !m.games.includes('mhn'));
    if (filterUnassigned === 'not-mho') list = list.filter((m) => !m.games.includes('mho'));

    // Default sort by MHN order; monsters without an MHN order go last
    return [...list].sort(
      (a, b) =>
        (a.sort_orders['mhn'] ?? 9999) - (b.sort_orders['mhn'] ?? 9999) ||
        a.name.localeCompare(b.name),
    );
  }, [activeMonsters, search, filterTier, filterSpecies, filterUnassigned]);

  const mhnCount    = activeMonsters.filter((m) => m.games.includes('mhn')).length;
  const mhoCount    = activeMonsters.filter((m) => m.games.includes('mho')).length;
  const uniqueSpecies = [...new Set(activeMonsters.map((m) => m.species).filter(Boolean))] as string[];

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-4">

        {/* Game count summary pills */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {GAMES.map((g) => {
            const count     = g.id === 'mhn' ? mhnCount : mhoCount;
            const total     = activeMonsters.length;
            const filterKey: '' | 'not-mhn' | 'not-mho' = g.id === 'mhn' ? 'not-mhn' : 'not-mho';
            const isFiltering = filterUnassigned === filterKey;
            return (
              <div
                key={g.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-2',
                  g.color === 'blue'
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-orange-500/30 bg-orange-500/10',
                )}
              >
                <span className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  g.color === 'blue' ? 'text-blue-400' : 'text-orange-400',
                )}>
                  {g.short}
                </span>
                <span className="text-sm font-bold text-mh-slate-200">{count}</span>
                <span className="text-xs text-mh-slate-500">/ {total} monsters</span>
                <button
                  onClick={() => setFilterUnassigned(isFiltering ? '' : filterKey)}
                  className={cn(
                    'ml-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors',
                    isFiltering
                      ? g.color === 'blue'
                        ? 'bg-blue-500/40 text-blue-200'
                        : 'bg-orange-500/40 text-orange-200'
                      : 'bg-mh-slate-800 text-mh-slate-500 hover:text-mh-slate-300',
                  )}
                >
                  {total - count} unassigned
                </button>
              </div>
            );
          })}

          <button
            onClick={onRefetch}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-mh-slate-500 hover:bg-mh-slate-800 hover:text-mh-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search monsters…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mh-slate-600 hover:text-mh-slate-400">
                <X size={13} />
              </button>
            )}
          </div>

          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none">
            <option value="">All tiers</option>
            <option value="low">Low Rank</option>
            <option value="high">High Rank</option>
            <option value="elder">Elder</option>
          </select>

          <select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none">
            <option value="">All species</option>
            {uniqueSpecies.sort().map((s) => (
              <option key={s} value={s}>{SPECIES_SHORT[s] ?? s}</option>
            ))}
          </select>

          <span className="ml-auto text-xs text-mh-slate-600">
            {filtered.length} of {activeMonsters.length} shown
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && (
          <div className="flex h-40 items-center justify-center gap-2 text-mh-slate-500">
            <RefreshCw size={16} className="animate-spin" /> Loading…
          </div>
        )}

        {!isLoading && (
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-mh-slate-900">
              <tr className="border-b border-mh-slate-700">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-mh-slate-500 w-1/2">
                  Monster
                </th>
                {GAMES.map((g) => (
                  <th
                    key={g.id}
                    className={cn(
                      'px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider',
                      g.color === 'blue' ? 'text-blue-500' : 'text-orange-500',
                    )}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-mh-slate-600">
                    No monsters match your filters.
                  </td>
                </tr>
              )}

              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className="group border-b border-mh-slate-800/70 transition-colors hover:bg-mh-slate-800/30"
                >
                  {/* Monster info */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {m.icon ? (
                        <img
                          src={m.icon}
                          alt={m.name}
                          className="h-10 w-10 shrink-0 rounded-xl object-contain bg-mh-slate-800 p-1 border border-mh-slate-700/80 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-700/80 text-[11px] font-bold text-mh-slate-500">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-mh-slate-200">
                          {m.name}
                          {m.is_variant && (
                            <span className="ml-1.5 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider bg-mh-slate-700 text-mh-slate-500">
                              variant
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-mh-slate-600">
                          {m.species ? (SPECIES_SHORT[m.species] ?? m.species) : 'Unknown species'}
                          {' · '}
                          <span className={TIER_COLORS[m.tier] ?? 'text-mh-slate-500'}>
                            {m.tier.charAt(0).toUpperCase() + m.tier.slice(1)} Rank
                          </span>
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* One toggle cell per game */}
                  {GAMES.map((g) => (
                    <td key={g.id} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <GameToggle monster={m} game={g} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
