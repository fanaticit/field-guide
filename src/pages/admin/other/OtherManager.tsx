// ─────────────────────────────────────────────────────────────
// OtherManager — Admin "Other" Management Interface
// Allows configuring game-wide settings and franchise weapon type availability
// across Monster Hunter Now (MHN) and Monster Hunter Outlanders (MHO).
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Search,
  RefreshCw,
  Check,
  Plus,
  LayoutGrid,
  List,
  Sparkles,
  Layers,
  AlertCircle,
  Crosshair,
  Sword,
} from 'lucide-react';
import { type DBWeaponType, type WeaponCategory } from '../../../data/schemas/weapon';
import {
  useAdminWeaponTypes,
  useToggleWeaponTypeGame,
  useToggleWeaponTypeActive,
} from '../../../hooks/useAdminWeapons';
import { cn } from '../../../lib/utils';

const GAMES = [
  {
    id: 'mhn',
    label: 'Monster Hunter Now',
    short: 'MHN',
    color: 'blue',
    desc: 'All 14 weapon types supported',
  },
  {
    id: 'mho',
    label: 'Monster Hunter Outlanders',
    short: 'MHO',
    color: 'orange',
    desc: 'Beta currently features 6 confirmed weapons',
  },
] as const;

type ViewMode = 'table' | 'grid';

// ── Per-game toggle button ───────────────────────────────────
function WeaponTypeGameToggle({
  weaponType,
  game,
}: {
  weaponType: DBWeaponType;
  game: typeof GAMES[number];
}) {
  const toggle = useToggleWeaponTypeGame();
  const inGame = weaponType.games.includes(game.id);
  const isPending = toggle.isPending;
  const hasError = toggle.isError;
  const errorMsg = toggle.error?.message ?? 'Update failed';

  function handleClick() {
    const newGames = inGame
      ? weaponType.games.filter((g) => g !== game.id)
      : [...new Set([...weaponType.games, game.id])];
    toggle.mutate({ id: weaponType.id, newGames });
  }

  const styles = {
    blue: {
      on: 'bg-blue-500/20 text-blue-300 ring-blue-500/40 hover:bg-blue-500/10 shadow-sm shadow-blue-500/10',
      off: 'bg-mh-slate-900 text-mh-slate-500 ring-mh-slate-700 hover:ring-blue-500/40 hover:text-blue-400',
      err: 'bg-red-500/20 text-red-300 ring-red-500/40',
    },
    orange: {
      on: 'bg-orange-500/20 text-orange-300 ring-orange-500/40 hover:bg-orange-500/10 shadow-sm shadow-orange-500/10',
      off: 'bg-mh-slate-900 text-mh-slate-500 ring-mh-slate-700 hover:ring-orange-500/40 hover:text-orange-400',
      err: 'bg-red-500/20 text-red-300 ring-red-500/40',
    },
  } as const;

  const s = styles[game.color];
  const cls = hasError ? s.err : inGame ? s.on : s.off;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title={hasError ? errorMsg : inGame ? `Remove from ${game.label}` : `Add to ${game.label}`}
        className={cn(
          'flex w-28 items-center justify-center gap-1.5 rounded-lg px-3 py-2',
          'text-xs font-bold ring-1 transition-all duration-150',
          cls,
          isPending && 'cursor-wait opacity-60',
        )}
      >
        {isPending ? (
          <RefreshCw size={13} className="animate-spin" />
        ) : hasError ? (
          <AlertCircle size={13} className="shrink-0" />
        ) : inGame ? (
          <Check size={13} strokeWidth={3} className="shrink-0" />
        ) : (
          <Plus size={13} className="shrink-0" />
        )}
        <span>{isPending ? 'Saving…' : hasError ? 'Error' : inGame ? 'In Game' : 'Add'}</span>
      </button>
      {hasError && (
        <p className="max-w-[120px] text-center text-[10px] leading-tight text-red-400">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

export default function OtherManager() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<WeaponCategory | 'all'>('all');

  const { data: weaponTypes = [], isLoading, refetch } = useAdminWeaponTypes();
  const toggleActiveMutation = useToggleWeaponTypeActive();

  // Metrics
  const metrics = useMemo(() => {
    const total = weaponTypes.length;
    const mhnCount = weaponTypes.filter((w) => w.games.includes('mhn')).length;
    const mhoCount = weaponTypes.filter((w) => w.games.includes('mho')).length;
    const meleeCount = weaponTypes.filter((w) => w.category === 'melee').length;
    const rangedCount = weaponTypes.filter((w) => w.category === 'ranged').length;

    return { total, mhnCount, mhoCount, meleeCount, rangedCount };
  }, [weaponTypes]);

  // Filtered list
  const filteredWeaponTypes = useMemo(() => {
    let list = [...weaponTypes];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          w.aliases.some((a) => a.toLowerCase().includes(q)) ||
          w.description.toLowerCase().includes(q),
      );
    }

    if (filterGame !== 'all') {
      list = list.filter((w) => w.games.includes(filterGame));
    }

    if (filterCategory !== 'all') {
      list = list.filter((w) => w.category === filterCategory);
    }

    return list;
  }, [weaponTypes, search, filterGame, filterCategory]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header Introduction ── */}
      <div className="rounded-2xl border border-mh-slate-700 bg-gradient-to-r from-mh-slate-900 via-mh-slate-850 to-mh-slate-900 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mh-slate-800 pb-5 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30 shadow-inner">
              <SlidersHorizontal size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-mh-slate-100">
                  Game Availability &amp; System Settings (Other)
                </h1>
                <span className="rounded-full bg-mh-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-mh-gold-400 border border-mh-gold-500/20">
                  Configuration
                </span>
              </div>
              <p className="text-xs text-mh-slate-400 mt-0.5">
                Configure which of the 14 core Monster Hunter weapon types are available in Monster Hunter Now (MHN) and Monster Hunter Outlanders (MHO).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-xl bg-mh-slate-800 hover:bg-mh-slate-750 border border-mh-slate-700 px-3.5 py-2 text-xs font-bold text-mh-slate-300 hover:text-white transition-all shadow-sm shrink-0 self-start md:self-auto"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Types */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              Franchise Weapon Types
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-mh-slate-100">
                {metrics.total}
              </span>
              <span className="text-xs text-mh-slate-500 font-medium">Core Archetypes</span>
            </div>
          </div>

          {/* MHN Count */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                MH Now (MHN)
              </span>
              <span className="rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold px-1.5 py-0.2">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-blue-300">
                {metrics.mhnCount} <span className="text-xs text-mh-slate-500 font-normal">/ {metrics.total}</span>
              </span>
              <span className="text-xs text-mh-slate-400 font-medium">Weapon Types</span>
            </div>
          </div>

          {/* MHO Count */}
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                Outlanders (MHO)
              </span>
              <span className="rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold px-1.5 py-0.2">
                Beta Roster
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-orange-300">
                {metrics.mhoCount} <span className="text-xs text-mh-slate-500 font-normal">/ {metrics.total}</span>
              </span>
              <span className="text-xs text-mh-slate-400 font-medium">Confirmed</span>
            </div>
          </div>

          {/* Category Split */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/60 p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              Disciplines
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 rounded bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-xs font-semibold text-mh-slate-300">
                <Sword size={11} className="text-mh-gold-400" /> {metrics.meleeCount} Melee
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-xs font-semibold text-mh-slate-300">
                <Crosshair size={11} className="text-cyan-400" /> {metrics.rangedCount} Ranged
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar & Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-mh-gold-400" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-mh-slate-200">
            Weapon Types Game Assignment Matrix
          </h3>
          <span className="rounded-full bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-xs text-mh-slate-400 font-semibold">
            {filteredWeaponTypes.length} of {weaponTypes.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search weapon types & aliases…"
              className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
            />
          </div>

          {/* Game Filter */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setFilterGame('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                filterGame === 'all'
                  ? 'bg-mh-gold-500 text-slate-950 font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              All Games
            </button>
            <button
              type="button"
              onClick={() => setFilterGame('mhn')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                filterGame === 'mhn'
                  ? 'bg-blue-500 text-white font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              MHN Only
            </button>
            <button
              type="button"
              onClick={() => setFilterGame('mho')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                filterGame === 'mho'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              MHO Only
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
            {(
              [
                { id: 'all', label: 'All Types' },
                { id: 'melee', label: 'Melee' },
                { id: 'ranged', label: 'Ranged' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterCategory(opt.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                  filterCategory === opt.id
                    ? 'bg-mh-slate-800 text-mh-gold-400'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-mh-slate-700 bg-mh-slate-850 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Matrix / Table View"
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                viewMode === 'table'
                  ? 'bg-mh-gold-500 text-slate-950 font-bold'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-mh-gold-500 text-slate-950 font-bold'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content: Table or Grid ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-mh-gold-400" />
        </div>
      ) : filteredWeaponTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-12 text-center">
          <Sword size={36} className="text-mh-slate-600 mb-2" />
          <p className="text-xs font-semibold text-mh-slate-400">No weapon types match your current search/filter criteria.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── Matrix Table View ── */
        <div className="overflow-hidden rounded-2xl border border-mh-slate-750 bg-mh-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs text-mh-slate-300">
            <thead className="border-b border-mh-slate-750 bg-mh-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Weapon Type</th>
                <th className="px-3 py-3.5">Category</th>
                <th className="px-3 py-3.5">Special Skill &amp; Styles</th>
                <th className="px-3 py-3.5 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-blue-400">Monster Hunter Now</span>
                    <span className="text-[9px] text-mh-slate-500 lowercase">mhn</span>
                  </div>
                </th>
                <th className="px-3 py-3.5 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-orange-400">MH Outlanders</span>
                    <span className="text-[9px] text-mh-slate-500 lowercase">mho</span>
                  </div>
                </th>
                <th className="py-3.5 pl-3 pr-5 text-right">Active Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800/80">
              {filteredWeaponTypes.map((weaponType) => {
                const isMelee = weaponType.category === 'melee';
                return (
                  <tr
                    key={weaponType.id}
                    className="hover:bg-mh-slate-800/50 transition-colors"
                  >
                    {/* Weapon Info & Icon */}
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-700 p-1.5 shadow-sm">
                          <img
                            src={weaponType.icon || `/images/weapons/${weaponType.id}.svg`}
                            alt={weaponType.name}
                            className="h-full w-full object-contain filter brightness-95"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-mh-slate-100">
                              {weaponType.name}
                            </span>
                            {weaponType.aliases && weaponType.aliases.length > 0 && (
                              <span className="rounded bg-mh-slate-800 px-1.5 py-0.2 text-[10px] font-mono font-bold text-mh-gold-400 border border-mh-slate-700">
                                {weaponType.aliases.join(', ')}
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-mh-slate-500 mt-0.5">
                            {weaponType.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border',
                          isMelee
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                        )}
                      >
                        {isMelee ? <Sword size={11} /> : <Crosshair size={11} />}
                        <span className="capitalize">{weaponType.category}</span>
                      </span>
                    </td>

                    {/* Special Skill & Styles */}
                    <td className="px-3 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={11} className="text-mh-gold-400" />
                          <span className="font-semibold text-mh-slate-200 text-xs">
                            {weaponType.special_skill || 'None'}
                          </span>
                        </div>
                        {weaponType.styles && weaponType.styles.length > 0 && (
                          <p className="text-[10px] text-mh-slate-400">
                            Styles: {weaponType.styles.join(', ')}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* MHN Toggle */}
                    <td className="px-3 py-3.5 text-center">
                      <WeaponTypeGameToggle weaponType={weaponType} game={GAMES[0]} />
                    </td>

                    {/* MHO Toggle */}
                    <td className="px-3 py-3.5 text-center">
                      <WeaponTypeGameToggle weaponType={weaponType} game={GAMES[1]} />
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 pl-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: weaponType.id,
                            isActive: !weaponType.is_active,
                          })
                        }
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border',
                          weaponType.is_active
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-mh-slate-800 border-mh-slate-700 text-mh-slate-500 hover:text-white',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            weaponType.is_active ? 'bg-emerald-400' : 'bg-mh-slate-600',
                          )}
                        />
                        <span>{weaponType.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Grid Card View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWeaponTypes.map((weaponType) => {
            const isMelee = weaponType.category === 'melee';
            return (
              <div
                key={weaponType.id}
                className="flex flex-col justify-between rounded-2xl border border-mh-slate-750 bg-mh-slate-850 p-5 shadow-sm hover:border-mh-slate-600 transition-all space-y-4"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border',
                        isMelee
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                      )}
                    >
                      {isMelee ? <Sword size={11} /> : <Crosshair size={11} />}
                      <span className="capitalize">{weaponType.category}</span>
                    </span>

                    {weaponType.aliases && weaponType.aliases.length > 0 && (
                      <span className="rounded bg-mh-slate-800 px-1.5 py-0.2 text-[10px] font-mono font-bold text-mh-gold-400 border border-mh-slate-700">
                        {weaponType.aliases.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mh-slate-900 border border-mh-slate-700 p-2 shadow-inner">
                      <img
                        src={weaponType.icon || `/images/weapons/${weaponType.id}.svg`}
                        alt={weaponType.name}
                        className="h-full w-full object-contain filter brightness-95"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-bold text-mh-slate-100 truncate">
                        {weaponType.name}
                      </h3>
                      <p className="font-mono text-[10px] text-mh-slate-500 truncate">
                        {weaponType.id}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-mh-slate-400 line-clamp-2 leading-relaxed">
                    {weaponType.description}
                  </p>

                  {/* Special Skill */}
                  {weaponType.special_skill && (
                    <div className="mt-3 rounded-lg bg-mh-slate-900/80 border border-mh-slate-750 p-2 text-xs flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">
                        Special Skill
                      </span>
                      <span className="font-bold text-mh-gold-300 text-xs">
                        {weaponType.special_skill}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom: Game Toggles */}
                <div className="pt-3 border-t border-mh-slate-800 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-mh-slate-400">
                    Game Availability
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-blue-400 font-bold mb-1">MH Now</span>
                      <WeaponTypeGameToggle weaponType={weaponType} game={GAMES[0]} />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-orange-400 font-bold mb-1">MH Outlanders</span>
                      <WeaponTypeGameToggle weaponType={weaponType} game={GAMES[1]} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
