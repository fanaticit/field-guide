// ─────────────────────────────────────────────────────────────
// AdventurerManager — Admin management interface for MHO Adventurers
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  LayoutGrid,
  List,
  User,
  Sparkles,
  Swords,
  Zap,
  Heart,
} from 'lucide-react';
import {
  type DBAdventurer,
  ADVENTURER_ROLE_CONFIG,
  ADVENTURER_ROLES,
  ELEMENT_OPTIONS,
} from '../../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../../data/core/weapon-types';
import {
  useAdminAdventurers,
  useToggleAdventurerActive,
} from '../../../hooks/useAdminAdventurers';
import AdventurerEditModal from './AdventurerEditModal';
import { cn } from '../../../lib/utils';

type ViewMode = 'grid' | 'table';
type SortKey = 'name' | 'role' | 'element' | 'order';
type SortDir = 'asc' | 'desc';

const ROLE_ICONS: Record<string, typeof Swords> = {
  Assault: Swords,
  Disrupter: Zap,
  Disruptor: Zap,
  Support: Heart,
};

function ActiveToggle({ adventurer }: { adventurer: DBAdventurer }) {
  const toggle = useToggleAdventurerActive();

  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ id: adventurer.id, isActive: !adventurer.is_active })}
      disabled={toggle.isPending}
      title={adventurer.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200',
        adventurer.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200',
          adventurer.is_active ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export default function AdventurerManager() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterElement, setFilterElement] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'' | 'active' | 'inactive'>('');
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Edit Modal state
  const [editAdventurer, setEditAdventurer] = useState<DBAdventurer | null | 'new'>(null);

  const { data: adventurers = [], isLoading, refetch } = useAdminAdventurers();

  const weaponTypeMap = useMemo(
    () => new Map(WEAPON_TYPES.map((w) => [w.id, w.name])),
    [],
  );

  const filtered = useMemo(() => {
    let list = [...adventurers];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.name_ja ?? '').toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q),
      );
    }

    if (filterRole) {
      list = list.filter((a) => a.role === filterRole || (filterRole === 'Disrupter' && a.role === 'Disruptor'));
    }

    if (filterElement) {
      list = list.filter((a) => a.element_specialization === filterElement);
    }

    if (filterActive === 'active') {
      list = list.filter((a) => a.is_active);
    } else if (filterActive === 'inactive') {
      list = list.filter((a) => !a.is_active);
    }

    list.sort((a, b) => {
      // Default player character always at the very top
      if (a.is_default !== b.is_default) {
        return a.is_default ? -1 : 1;
      }

      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'role') {
        comparison = a.role.localeCompare(b.role);
      } else if (sortKey === 'element') {
        comparison = (a.element_specialization || '').localeCompare(b.element_specialization || '');
      } else {
        comparison = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [adventurers, search, filterRole, filterElement, filterActive, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Top Overview Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mh-slate-700 bg-mh-slate-850 p-5 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30 shadow-inner">
            <User size={24} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-mh-slate-100 flex items-center gap-2">
              <span>MHO Adventurer Roster</span>
              <span className="rounded-full bg-mh-gold-500/20 px-2 py-0.5 text-xs font-bold text-mh-gold-300 border border-mh-gold-500/30">
                {adventurers.length} Total
              </span>
            </h2>
            <p className="text-xs text-mh-slate-400 mt-0.5">
              Manage playable Outlanders adventurers, roles (Assault, Disrupter, Support), element affinities, and player avatar defaults.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3.5 py-2 text-xs font-semibold text-mh-slate-300 hover:border-mh-slate-600 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setEditAdventurer('new')}
            className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-4 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-all shadow-md hover:shadow-mh-gold-500/20"
          >
            <Plus size={15} />
            <span>+ Add Adventurer</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or lore..."
              className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => setFilterRole('')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                filterRole === ''
                  ? 'bg-mh-slate-800 text-mh-gold-400 shadow-sm'
                  : 'text-mh-slate-400 hover:text-mh-slate-200',
              )}
            >
              All Roles
            </button>
            {ADVENTURER_ROLES.map((r) => {
              const cfg = ADVENTURER_ROLE_CONFIG[r];
              const isSelected = filterRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilterRole(isSelected ? '' : r)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                    isSelected
                      ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.border}`
                      : 'text-mh-slate-400 hover:text-mh-slate-200',
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Element Filter */}
          <select
            value={filterElement}
            onChange={(e) => setFilterElement(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="">All Elements</option>
            {Object.values(ELEMENT_OPTIONS).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as '' | 'active' | 'inactive')}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-mh-slate-750 bg-mh-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              viewMode === 'grid'
                ? 'bg-mh-slate-800 text-mh-gold-400 shadow-sm'
                : 'text-mh-slate-500 hover:text-mh-slate-300',
            )}
            title="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              viewMode === 'table'
                ? 'bg-mh-slate-800 text-mh-gold-400 shadow-sm'
                : 'text-mh-slate-500 hover:text-mh-slate-300',
            )}
            title="Table view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* ── Content: Grid or Table ── */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-mh-gold-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-12 text-center">
          <User size={40} className="text-mh-slate-600 mb-3" />
          <p className="font-semibold text-mh-slate-400">No adventurers found</p>
          <p className="text-xs text-mh-slate-600 mt-1 max-w-sm">
            Try adjusting your search query or filters, or add a new adventurer to the roster.
          </p>
          <button
            type="button"
            onClick={() => setEditAdventurer('new')}
            className="mt-4 rounded-xl bg-mh-gold-500/10 border border-mh-gold-500/30 px-4 py-2 text-xs font-bold text-mh-gold-400 hover:bg-mh-gold-500/20"
          >
            + Add New Adventurer
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((adventurer) => {
            const roleKey = adventurer.role === 'Disruptor' ? 'Disrupter' : adventurer.role;
            const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
            const RoleIcon = ROLE_ICONS[roleKey] || Swords;
            const elemCfg = ELEMENT_OPTIONS[adventurer.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;
            const weaponName = weaponTypeMap.get(adventurer.weapon_type || '') || adventurer.weapon_type || 'Custom';

            return (
              <div
                key={adventurer.id}
                className={cn(
                  'group relative flex flex-col justify-between rounded-2xl border bg-mh-slate-850 p-4 transition-all duration-200 hover:border-mh-gold-500/40 hover:shadow-lg',
                  adventurer.is_default
                    ? 'border-mh-gold-500/50 bg-gradient-to-b from-mh-gold-500/10 via-mh-slate-850 to-mh-slate-850'
                    : 'border-mh-slate-750',
                )}
              >
                <div>
                  {/* Top Badges & Actions */}
                  <div className="flex items-center justify-between gap-2 border-b border-mh-slate-800 pb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {adventurer.is_default && (
                        <span className="flex items-center gap-1 rounded-md bg-mh-gold-500 px-2 py-0.5 text-[10px] font-black text-mh-slate-950 shadow-sm">
                          <Sparkles size={11} />
                          <span>Player Avatar</span>
                        </span>
                      )}
                      <span className={cn('flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border', roleCfg.bg, roleCfg.text, roleCfg.border)}>
                        <RoleIcon size={11} />
                        <span>{roleCfg.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ActiveToggle adventurer={adventurer} />
                      <button
                        type="button"
                        onClick={() => setEditAdventurer(adventurer)}
                        className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                        title="Edit Adventurer"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Character Portrait & Main Info */}
                  <div className="mt-3 flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0 rounded-xl bg-mh-slate-800 border border-mh-slate-700 p-1 overflow-hidden shadow-inner flex items-center justify-center">
                      {adventurer.image ? (
                        <img
                          src={adventurer.image}
                          alt={adventurer.name}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <User size={24} className="text-mh-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-sm font-bold text-mh-slate-100 truncate">
                        {adventurer.name}
                      </h3>
                      {adventurer.name_ja && (
                        <p className="text-[10px] text-mh-slate-500 truncate">{adventurer.name_ja}</p>
                      )}
                      <p className="text-[10px] text-mh-slate-500 font-mono mt-0.5 truncate">{adventurer.id}</p>
                    </div>
                  </div>

                  {/* Traits Pill Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {/* Weapon badge */}
                    <span className="rounded-md bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-[10px] font-semibold text-mh-slate-300">
                      {adventurer.is_default ? 'Any Weapon (Switchable)' : weaponName}
                    </span>

                    {/* Element badge */}
                    <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold border', elemCfg.bg, elemCfg.text, elemCfg.border)}>
                      {elemCfg.label}
                    </span>
                  </div>

                  {/* Description */}
                  {adventurer.description && (
                    <p className="mt-2.5 text-xs text-mh-slate-400 line-clamp-2 leading-relaxed">
                      {adventurer.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-mh-slate-800 flex items-center justify-between text-[11px] text-mh-slate-500">
                  <span>Order: {adventurer.sort_order}</span>
                  <button
                    type="button"
                    onClick={() => setEditAdventurer(adventurer)}
                    className="text-mh-gold-400 hover:text-mh-gold-300 font-semibold"
                  >
                    Configure &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-2xl border border-mh-slate-750 bg-mh-slate-850 shadow-md">
          <table className="w-full text-left text-xs text-mh-slate-300">
            <thead className="border-b border-mh-slate-750 bg-mh-slate-900/80 uppercase tracking-wider text-[10px] text-mh-slate-400 font-bold">
              <tr>
                <th className="px-4 py-3 cursor-pointer hover:text-mh-gold-400" onClick={() => handleSort('name')}>
                  Adventurer {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-mh-gold-400" onClick={() => handleSort('role')}>
                  Role {sortKey === 'role' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3">Weapon Type</th>
                <th className="px-4 py-3 cursor-pointer hover:text-mh-gold-400" onClick={() => handleSort('element')}>
                  Element {sortKey === 'element' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-center">Default</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800">
              {filtered.map((adventurer) => {
                const roleKey = adventurer.role === 'Disruptor' ? 'Disrupter' : adventurer.role;
                const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
                const elemCfg = ELEMENT_OPTIONS[adventurer.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;
                const weaponName = weaponTypeMap.get(adventurer.weapon_type || '') || adventurer.weapon_type || 'Custom';

                return (
                  <tr
                    key={adventurer.id}
                    className="hover:bg-mh-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-mh-slate-800 border border-mh-slate-700 p-0.5 overflow-hidden flex items-center justify-center">
                          {adventurer.image ? (
                            <img src={adventurer.image} alt={adventurer.name} className="h-full w-full object-contain" />
                          ) : (
                            <User size={16} className="text-mh-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-mh-slate-100 truncate">{adventurer.name}</p>
                          <p className="text-[10px] text-mh-slate-500 font-mono truncate">{adventurer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold border', roleCfg.bg, roleCfg.text, roleCfg.border)}>
                        {roleCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-mh-slate-200">
                      {adventurer.is_default ? (
                        <span className="text-mh-gold-400 font-bold">Any (Switchable)</span>
                      ) : (
                        weaponName
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold border', elemCfg.bg, elemCfg.text, elemCfg.border)}>
                        {elemCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {adventurer.is_default && (
                        <span className="inline-flex items-center gap-1 rounded bg-mh-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-mh-gold-300 border border-mh-gold-500/40">
                          <Sparkles size={11} /> Player
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActiveToggle adventurer={adventurer} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditAdventurer(adventurer)}
                        className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit / Create Modal ── */}
      {editAdventurer && (
        <AdventurerEditModal
          open={Boolean(editAdventurer)}
          adventurer={editAdventurer === 'new' ? null : editAdventurer}
          nextSortOrder={adventurers.length}
          onClose={() => setEditAdventurer(null)}
        />
      )}
    </div>
  );
}
