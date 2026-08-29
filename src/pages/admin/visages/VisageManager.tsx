// ─────────────────────────────────────────────────────────────
// VisageManager — Administration for MH Outlanders Visage Cards
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  Sparkles,
  Edit2,
  Trash2,
  Layers,
} from 'lucide-react';
import {
  type DBVisage,
  type InkType,
  INK_CONFIG,
  INK_OPTIONS,
} from '../../../data/schemas/visage';
import {
  useAdminVisages,
  useToggleVisageActive,
  useDeleteVisage,
} from '../../../hooks/useAdminVisages';
import { useAdminSkills } from '../../../hooks/useAdminSkills';
import VisageEditModal from './VisageEditModal';
import { cn } from '../../../lib/utils';

type ViewMode = 'grid' | 'table';
type SortKey = 'name' | 'points' | 'type';
type SortDir = 'asc' | 'desc';

function ActiveToggle({ visage }: { visage: DBVisage }) {
  const toggle = useToggleVisageActive();
  return (
    <button
      onClick={() => toggle.mutate({ id: visage.id, isActive: !visage.is_active })}
      disabled={toggle.isPending}
      title={visage.is_active ? 'Deactivate' : 'Activate'}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        visage.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
        toggle.isPending && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          visage.is_active ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export default function VisageManager() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterInk, setFilterInk] = useState('');
  const [filterMonsterType, setFilterMonsterType] = useState('');
  const [filterActive, setFilterActive] = useState<'' | 'active' | 'inactive'>('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editVisage, setEditVisage] = useState<DBVisage | null | 'new'>(null);

  const { data: visages = [], isLoading, refetch } = useAdminVisages();
  const { data: setBonuses = [] } = useAdminSkills({ isSetBonus: true });
  const remove = useDeleteVisage();

  const setBonusMap = useMemo(
    () => new Map(setBonuses.map((s) => [s.id, s])),
    [setBonuses],
  );

  const filtered = useMemo(() => {
    let list = [...visages];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q) ||
          (v.name_ja ?? '').toLowerCase().includes(q),
      );
    }

    if (filterInk) {
      list = list.filter((v) => v.ink_types.includes(filterInk as InkType));
    }

    if (filterMonsterType) {
      list = list.filter((v) => v.monster_type === filterMonsterType);
    }

    if (filterActive === 'active') list = list.filter((v) => v.is_active);
    if (filterActive === 'inactive') list = list.filter((v) => !v.is_active);

    list.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortKey === 'name') {
        av = a.name;
        bv = b.name;
      } else if (sortKey === 'points') {
        av = a.points;
        bv = b.points;
      } else if (sortKey === 'type') {
        av = a.monster_type;
        bv = b.monster_type;
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [visages, search, filterInk, filterMonsterType, filterActive, sortKey, sortDir]);

  const activeCount = visages.filter((v) => v.is_active).length;
  const inactiveCount = visages.length - activeCount;

  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-mh-slate-300">
              <span className="font-bold text-mh-slate-100">{visages.length}</span> Visages
            </span>
            <span className="text-green-400">
              <span className="font-semibold">{activeCount}</span> active
            </span>
            {inactiveCount > 0 && (
              <span className="text-mh-slate-600">
                <span className="font-semibold">{inactiveCount}</span> inactive
              </span>
            )}
            {filtered.length !== visages.length && (
              <span className="text-mh-gold-400 text-xs">{filtered.length} shown</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-mh-slate-700 bg-mh-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'grid'
                    ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm'
                    : 'text-mh-slate-400 hover:text-mh-slate-200',
                )}
              >
                <LayoutGrid size={13} />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'table'
                    ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm'
                    : 'text-mh-slate-400 hover:text-mh-slate-200',
                )}
              >
                <List size={13} />
                Table
              </button>
            </div>

            <button
              onClick={() => setEditVisage('new')}
              className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors shadow-sm"
            >
              <Plus size={14} />
              Add Visage
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visages…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          <select
            value={filterInk}
            onChange={(e) => setFilterInk(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All Inks</option>
            {INK_OPTIONS.map((ink) => (
              <option key={ink} value={ink}>
                {INK_CONFIG[ink].name}
              </option>
            ))}
          </select>

          <select
            value={filterMonsterType}
            onChange={(e) => setFilterMonsterType(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All Monster Types</option>
            <option value="small">Small Monsters</option>
            <option value="large">Large Monsters</option>
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as '' | 'active' | 'inactive')}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <select
            value={`${sortKey}_${sortDir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split('_') as [SortKey, SortDir];
              setSortKey(key);
              setSortDir(dir);
            }}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="points_desc">Points (High to Low)</option>
            <option value="points_asc">Points (Low to High)</option>
            <option value="type_asc">Classification (Small to Large)</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs font-medium text-mh-slate-400 hover:bg-mh-slate-700 hover:text-mh-slate-200 transition-colors"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center text-mh-slate-500">
            <Layers size={48} className="mb-2 opacity-30" />
            <p className="text-sm font-semibold">No Visage cards found matching your filters.</p>
            <button
              onClick={() => setEditVisage('new')}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3 py-1.5 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25"
            >
              <Plus size={13} />
              Add First Visage
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Card Grid View ── */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((visage) => {
              const setBonus = visage.set_bonus_id ? setBonusMap.get(visage.set_bonus_id) : null;

              return (
                <div
                  key={visage.id}
                  className={cn(
                    'group relative flex flex-col justify-between rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 shadow-sm transition-all hover:border-mh-gold-500/40 hover:shadow-lg',
                    !visage.is_active && 'opacity-60 bg-mh-slate-900/40',
                  )}
                >
                  {/* Top Bar: Points & Actions */}
                  <div className="flex items-center justify-between border-b border-mh-slate-750/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-lg bg-mh-gold-500/20 border border-mh-gold-500/30 px-2 py-0.5 text-xs font-bold text-mh-gold-400 shadow-sm">
                        <span>{visage.points}</span>
                        <span className="text-[10px] uppercase font-semibold text-mh-slate-400">Pts</span>
                      </span>

                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          visage.monster_type === 'large'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700',
                        )}
                      >
                        {visage.monster_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <ActiveToggle visage={visage} />
                      <button
                        onClick={() => setEditVisage(visage)}
                        title="Edit Visage"
                        className="rounded p-1 text-mh-slate-400 hover:bg-mh-slate-700 hover:text-white transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Body: Card Art & Name */}
                  <div className="py-4 flex items-center gap-3.5">
                    {visage.image_small || visage.image_large ? (
                      <img
                        src={visage.image_small || visage.image_large || ''}
                        alt={visage.name}
                        className="h-14 w-14 rounded-xl object-contain bg-mh-slate-800 p-1 border border-mh-slate-700 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-700 text-mh-gold-400 shadow-sm">
                        <Sparkles size={24} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-sm font-bold text-mh-slate-100 group-hover:text-mh-gold-400 transition-colors truncate">
                          {visage.name}
                        </h3>
                        {visage.name_ja && (
                          <span className="text-[10px] text-mh-slate-500 truncate">
                            ({visage.name_ja})
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-mh-slate-500 truncate">
                        {visage.id}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Inks & Set Bonus */}
                  <div className="pt-3 border-t border-mh-slate-750/80 space-y-2">
                    {/* Ink pool */}
                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-mh-slate-500 mb-1">
                        Possible Inks:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {visage.ink_types.map((ink) => {
                          const cfg = INK_CONFIG[ink];
                          if (!cfg) return null;
                          return (
                            <span
                              key={ink}
                              className={cn(
                                'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border',
                                cfg.bg,
                                cfg.text,
                                cfg.border,
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotColor)} />
                              {cfg.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Set bonus milestones */}
                    {setBonus ? (
                      <div className="rounded-lg bg-mh-slate-900/80 p-2 border border-mh-slate-750 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-mh-gold-400">Set: {setBonus.name}</span>
                        </div>
                        <div className="space-y-0.5">
                          {(setBonus.set_thresholds || []).map((t, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-bold text-mh-slate-400 shrink-0">{t.pieces} pcs:</span>
                              <span className="text-mh-slate-300 truncate">
                                {t.description || (t.granted_skill_id ? `+${t.granted_skill_level || 1} ${t.granted_skill_id}` : `Tier ${idx + 1}`)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded bg-mh-slate-900/40 p-1.5 text-center text-[10px] text-mh-slate-600">
                        No linked set bonus
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ── */
          <div className="overflow-hidden rounded-xl border border-mh-slate-700 bg-mh-slate-900/80">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-mh-slate-700 bg-mh-slate-850 text-[11px] font-semibold uppercase tracking-wider text-mh-slate-400">
                <tr>
                  <th className="px-4 py-3 w-10">Active</th>
                  <th className="px-4 py-3 min-w-[200px]">Visage Card</th>
                  <th className="px-4 py-3 w-28">Type</th>
                  <th className="px-4 py-3 w-20">Points</th>
                  <th className="px-4 py-3 min-w-[180px]">Possible Inks</th>
                  <th className="px-4 py-3 min-w-[220px]">Linked Set Bonus</th>
                  <th className="px-4 py-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mh-slate-800 text-xs">
                {filtered.map((visage) => {
                  const setBonus = visage.set_bonus_id ? setBonusMap.get(visage.set_bonus_id) : null;
                  return (
                    <tr
                      key={visage.id}
                      className={cn(
                        'hover:bg-mh-slate-800/40 transition-colors',
                        !visage.is_active && 'opacity-60 bg-mh-slate-900/20',
                      )}
                    >
                      <td className="px-4 py-3">
                        <ActiveToggle visage={visage} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {visage.image_small || visage.image_large ? (
                            <img
                              src={visage.image_small || visage.image_large || ''}
                              alt={visage.name}
                              className="h-8 w-8 rounded-lg object-contain bg-mh-slate-800 p-0.5 border border-mh-slate-700"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mh-slate-800 text-mh-gold-400">
                              <Sparkles size={14} />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-mh-slate-100">
                              {visage.name}
                            </span>
                            {visage.name_ja && (
                              <span className="ml-1 text-[11px] text-mh-slate-500">
                                ({visage.name_ja})
                              </span>
                            )}
                            <p className="font-mono text-[10px] text-mh-slate-500">
                              {visage.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            visage.monster_type === 'large'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700',
                          )}
                        >
                          {visage.monster_type}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded bg-mh-gold-500/20 border border-mh-gold-500/30 px-2 py-0.5 text-xs font-bold text-mh-gold-400">
                          {visage.points}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {visage.ink_types.map((ink) => {
                            const cfg = INK_CONFIG[ink];
                            if (!cfg) return null;
                            return (
                              <span
                                key={ink}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border',
                                  cfg.bg,
                                  cfg.text,
                                  cfg.border,
                                )}
                              >
                                {cfg.name}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {setBonus ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-mh-gold-300 text-[11px]">
                              {setBonus.name}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(setBonus.set_thresholds || []).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="rounded bg-mh-slate-800 px-1.5 py-0.5 text-[10px] text-mh-slate-300 border border-mh-slate-700"
                                >
                                  {t.pieces} pcs
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-mh-slate-600 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditVisage(visage)}
                            title="Edit Visage"
                            className="rounded p-1.5 text-mh-slate-400 hover:bg-mh-slate-700 hover:text-white"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${visage.name}"?`)) {
                                remove.mutate(visage.id);
                              }
                            }}
                            title="Delete Visage"
                            className="rounded p-1.5 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      <VisageEditModal
        visage={editVisage === 'new' ? null : editVisage}
        open={editVisage !== null}
        onClose={() => setEditVisage(null)}
      />
    </div>
  );
}
