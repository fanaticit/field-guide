// ─────────────────────────────────────────────────────────────
// MonsterManager — two views:
//   "List" — detailed table with edit actions
//   "Game Roster" — matrix for assigning monsters to games
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, RefreshCw, ChevronUp, ChevronDown,
  Flame, Droplets, Zap, Snowflake, Wind,
  MoreVertical, AlertTriangle, List, Gamepad2,
} from 'lucide-react';
import {
  useAdminMonsters, useToggleMonsterActive,
  type DBMonster,
} from '../../../hooks/useAdminMonsters';
import MonsterEditModal from './MonsterEditModal';
import GameRosterView from './GameRosterView';
import { useUIStore } from '../../../store/uiStore';
import { cn } from '../../../lib/utils';

// ── Element display ──────────────────────────────────────────
const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire:      <Flame     size={11} className="text-orange-400" />,
  water:     <Droplets  size={11} className="text-blue-400"   />,
  thunder:   <Zap       size={11} className="text-yellow-400" />,
  ice:       <Snowflake size={11} className="text-cyan-400"   />,
  dragon:    <Wind      size={11} className="text-purple-400" />,
};

const ELEMENT_DOT_COLORS: Record<string, string> = {
  fire:      'bg-orange-400',
  water:     'bg-blue-400',
  thunder:   'bg-yellow-400',
  ice:       'bg-cyan-400',
  dragon:    'bg-purple-400',
  poison:    'bg-green-400',
  sleep:     'bg-indigo-400',
  paralysis: 'bg-yellow-300',
  blast:     'bg-red-400',
  stun:      'bg-amber-300',
};

const TIER_STYLES: Record<string, string> = {
  low:    'bg-blue-500/15 text-blue-400',
  high:   'bg-orange-500/15 text-orange-400',
  elder:  'bg-purple-500/15 text-purple-400',
  small:  'bg-mh-slate-700 text-mh-slate-400',
  collab: 'bg-pink-500/15 text-pink-400',
};

const TIER_LABELS: Record<string, string> = {
  low: 'Low', high: 'High', elder: 'Elder', small: 'Small', collab: 'Collab',
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

const GAMES = [
  { id: 'mhn', label: 'MHN', color: 'blue'   },
  { id: 'mho', label: 'MHO', color: 'orange' },
] as const;

type SortKey = 'name' | 'species' | 'tier' | 'sort_order';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'roster';

function ElementPills({ elements }: { elements: string[] }) {
  if (!elements.length) return <span className="text-mh-slate-600 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {elements.map((el) => (
        <span key={el} className="flex items-center gap-1 rounded-md bg-mh-slate-800 px-1.5 py-0.5 text-[10px] font-medium capitalize">
          {ELEMENT_ICONS[el] ?? (
            <span className={cn('h-2 w-2 rounded-full', ELEMENT_DOT_COLORS[el] ?? 'bg-mh-slate-500')} />
          )}
          {el}
        </span>
      ))}
    </div>
  );
}

function GamePills({ games }: { games: string[] }) {
  return (
    <div className="flex gap-1">
      {games.map((g) => (
        <span key={g} className={cn(
          'rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider',
          g === 'mhn' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400',
        )}>
          {g.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

/** Shows the order number for each game the monster is in. */
function SortOrderPills({ sortOrders, games }: { sortOrders: Record<string, number>; games: string[] }) {
  const entries = GAMES.filter((g) => games.includes(g.id));
  if (!entries.length) return <span className="text-mh-slate-700 text-xs">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {entries.map((g) => (
        <span key={g.id} className="flex items-center gap-1 text-[11px] tabular-nums">
          <span className={cn(
            'rounded px-1 py-px text-[8px] font-bold uppercase',
            g.color === 'blue' ? 'text-blue-500' : 'text-orange-500',
          )}>
            {g.label}
          </span>
          <span className="text-mh-slate-400">
            {sortOrders[g.id] ?? <span className="text-mh-slate-700 italic">—</span>}
          </span>
        </span>
      ))}
    </div>
  );
}

function ActiveToggle({ monster }: { monster: DBMonster }) {
  const toggle = useToggleMonsterActive();
  return (
    <button
      onClick={() => toggle.mutate({ id: monster.id, isActive: !monster.is_active })}
      disabled={toggle.isPending}
      title={monster.is_active ? 'Deactivate' : 'Activate'}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        monster.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
        toggle.isPending && 'opacity-50',
      )}
    >
      <span className={cn(
        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
        monster.is_active ? 'translate-x-[18px]' : 'translate-x-0.5',
      )} />
    </button>
  );
}

// ── Main component ───────────────────────────────────────────
export default function MonsterManager() {
  const defaultGame = useUIStore((s) => s.defaultGame);
  const [viewMode, setViewMode]       = useState<ViewMode>('list');
  const [search, setSearch]           = useState('');
  const [filterGame, setFilterGame]   = useState(defaultGame || '');
  const [filterTier, setFilterTier]   = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterActive, setFilterActive]  = useState<'' | 'active' | 'inactive'>('');
  const [sortKey, setSortKey]         = useState<SortKey>('sort_order');
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const [sortGame, setSortGame]       = useState<string>(defaultGame || 'mhn'); // which game's order to sort by
  const [editMonster, setEditMonster] = useState<DBMonster | null | 'new'>(null);

  useEffect(() => {
    if (defaultGame) {
      setFilterGame(defaultGame);
      setSortGame(defaultGame);
    }
  }, [defaultGame]);

  const { data: monsters = [], isLoading, error, refetch } = useAdminMonsters(
    filterGame ? { game: filterGame } : {}
  );

  const filtered = useMemo(() => {
    let list = [...monsters];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        (m.name_ja ?? '').includes(q) ||
        m.id.includes(q)
      );
    }
    if (filterTier) list = list.filter((m) => m.tier === filterTier);
    if (filterSpecies) list = list.filter((m) => m.species === filterSpecies);
    if (filterActive === 'active') list = list.filter((m) => m.is_active);
    if (filterActive === 'inactive') list = list.filter((m) => !m.is_active);

    list.sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortKey === 'sort_order') {
        // Sort by the selected game's sort order
        av = a.sort_orders[sortGame] ?? 9999;
        bv = b.sort_orders[sortGame] ?? 9999;
      } else if (sortKey === 'name') {
        av = a.name; bv = b.name;
      } else if (sortKey === 'species') {
        av = a.species ?? ''; bv = b.species ?? '';
      } else if (sortKey === 'tier') {
        const order = { small: 0, collab: 1, low: 2, high: 3, elder: 4 };
        av = order[a.tier as keyof typeof order] ?? 5;
        bv = order[b.tier as keyof typeof order] ?? 5;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [monsters, search, filterTier, filterSpecies, filterActive, sortKey, sortDir, sortGame]);

  const activeCount   = monsters.filter((m) => m.is_active).length;
  const inactiveCount = monsters.length - activeCount;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
      : <span className="w-[13px]" />;

  const thCls = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-mh-slate-500 select-none';
  const thBtnCls = 'flex items-center gap-1 hover:text-mh-slate-300 transition-colors cursor-pointer';

  // ── Game Roster view ─────────────────────────────────────────
  if (viewMode === 'roster') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-3">
          <ViewModeToggle current={viewMode} onChange={setViewMode} onAdd={() => setEditMonster('new')} />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <GameRosterView monsters={monsters} isLoading={isLoading} onRefetch={refetch} />
        </div>
        <MonsterEditModal
          monster={editMonster === 'new' ? null : editMonster}
          open={editMonster !== null}
          onClose={() => setEditMonster(null)}
        />
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-mh-slate-300">
              <span className="font-bold text-mh-slate-100">{monsters.length}</span> monsters
            </span>
            <span className="text-green-400">
              <span className="font-semibold">{activeCount}</span> active
            </span>
            {inactiveCount > 0 && (
              <span className="text-mh-slate-600">
                <span className="font-semibold">{inactiveCount}</span> inactive
              </span>
            )}
            {filtered.length !== monsters.length && (
              <span className="text-mh-gold-400 text-xs">{filtered.length} shown</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ViewModeToggle current={viewMode} onChange={setViewMode} onAdd={() => setEditMonster('new')} />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search monsters…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>
          <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none">
            <option value="">All games</option>
            <option value="mhn">MHN</option>
            <option value="mho">MHO</option>
          </select>
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none">
            <option value="">All tiers</option>
            <option value="low">Low Rank</option>
            <option value="high">High Rank</option>
            <option value="elder">Elder</option>
            <option value="small">Small</option>
            <option value="collab">Collab</option>
          </select>
          <select value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none">
            <option value="">All species</option>
            {Object.entries(SPECIES_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as '' | 'active' | 'inactive')}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && (
          <div className="flex h-40 items-center justify-center gap-3 text-mh-slate-500">
            <RefreshCw size={18} className="animate-spin" />
            <span>Loading monsters…</span>
          </div>
        )}

        {error && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <AlertTriangle size={24} className="text-red-400" />
            <p className="text-sm text-red-400">Failed to load: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <table className="w-full min-w-[700px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-mh-slate-900">
              <tr className="border-b border-mh-slate-700">
                <th className={thCls}>
                  <button className={thBtnCls} onClick={() => handleSort('name')}>
                    Name <SortIcon k="name" />
                  </button>
                </th>
                <th className={thCls}>
                  <button className={thBtnCls} onClick={() => handleSort('species')}>
                    Species <SortIcon k="species" />
                  </button>
                </th>
                <th className={thCls}>
                  <button className={thBtnCls} onClick={() => handleSort('tier')}>
                    Tier <SortIcon k="tier" />
                  </button>
                </th>
                <th className={thCls}>Elements</th>
                <th className={thCls}>Weak to</th>
                <th className={thCls}>Games</th>
                {/* Order column — with inline game selector */}
                <th className={thCls}>
                  <div className="flex items-center gap-1.5">
                    <button className={thBtnCls} onClick={() => handleSort('sort_order')}>
                      Order <SortIcon k="sort_order" />
                    </button>
                    <select
                      value={sortGame}
                      onChange={(e) => { setSortGame(e.target.value); setSortKey('sort_order'); }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border border-mh-slate-700 bg-mh-slate-800 px-1 py-0.5 text-[10px] text-mh-slate-400 outline-none"
                    >
                      <option value="mhn">MHN</option>
                      <option value="mho">MHO</option>
                    </select>
                  </div>
                </th>
                <th className={cn(thCls, 'text-center')}>Active</th>
                <th className={cn(thCls, 'w-12')} />
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-mh-slate-600">
                    No monsters match your filters.
                  </td>
                </tr>
              )}

              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className={cn(
                    'group border-b border-mh-slate-800 transition-colors hover:bg-mh-slate-800/50',
                    !m.is_active && 'opacity-50',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-mh-slate-200">
                        {m.name}
                        {m.is_variant && (
                          <span className="ml-1.5 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider bg-mh-slate-700 text-mh-slate-400">
                            variant
                          </span>
                        )}
                      </span>
                      {m.name_ja && <span className="text-[11px] text-mh-slate-600">{m.name_ja}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-mh-slate-400">
                    {m.species ? (SPECIES_LABELS[m.species] ?? m.species) : (
                      <span className="text-mh-slate-700 italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      TIER_STYLES[m.tier] ?? 'bg-mh-slate-700 text-mh-slate-400',
                    )}>
                      {TIER_LABELS[m.tier] ?? m.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ElementPills elements={m.elements} /></td>
                  <td className="px-4 py-3"><ElementPills elements={m.weaknesses} /></td>
                  <td className="px-4 py-3"><GamePills games={m.games} /></td>
                  {/* Per-game order — shows a row per game the monster is in */}
                  <td className="px-4 py-3">
                    <SortOrderPills sortOrders={m.sort_orders} games={m.games} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActiveToggle monster={m} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditMonster(m)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-mh-slate-600 opacity-0 group-hover:opacity-100 hover:bg-mh-slate-700 hover:text-mh-slate-200 transition-all"
                      title="Edit"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <MonsterEditModal
        monster={editMonster === 'new' ? null : editMonster}
        open={editMonster !== null}
        onClose={() => setEditMonster(null)}
      />
    </div>
  );
}

// ── View mode toggle bar (shared between modes) ──────────────
function ViewModeToggle({
  current,
  onChange,
  onAdd,
}: {
  current: ViewMode;
  onChange: (v: ViewMode) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center rounded-lg border border-mh-slate-700 bg-mh-slate-800 p-0.5">
        <button
          onClick={() => onChange('list')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150',
            current === 'list'
              ? 'bg-mh-slate-700 text-mh-slate-100 shadow-sm'
              : 'text-mh-slate-500 hover:text-mh-slate-300',
          )}
        >
          <List size={13} />
          Monster List
        </button>
        <button
          onClick={() => onChange('roster')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150',
            current === 'roster'
              ? 'bg-mh-slate-700 text-mh-slate-100 shadow-sm'
              : 'text-mh-slate-500 hover:text-mh-slate-300',
          )}
        >
          <Gamepad2 size={13} />
          Game Roster
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-4 py-2 text-sm font-bold text-mh-slate-900 hover:bg-mh-gold-400 transition-colors"
        >
          <Plus size={16} />
          Add Monster
        </button>
      </div>
    </div>
  );
}
