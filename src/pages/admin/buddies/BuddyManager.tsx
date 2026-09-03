// ─────────────────────────────────────────────────────────────
// BuddyManager — Admin management interface for MHO Companions
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Swords,
  Zap,
  Heart,
  Cat,
} from 'lucide-react';
import {
  type DBBuddy,
  type BuddyTier,
  TIER_CONFIG,
  ROLE_CONFIG,
  BUDDY_TIERS,
  BUDDY_ROLES,
} from '../../../data/schemas/buddy';
import {
  useAdminBuddies,
  useToggleBuddyActive,
  useDeleteBuddy,
} from '../../../hooks/useAdminBuddies';
import BuddyEditModal from './BuddyEditModal';
import { cn } from '../../../lib/utils';

type ViewMode = 'grid' | 'table';
type SortKey = 'name' | 'tier' | 'role';
type SortDir = 'asc' | 'desc';

const TIER_ORDER: Record<BuddyTier, number> = {
  SSR: 3,
  SR: 2,
  R: 1,
};

const ROLE_ICONS = {
  Assault: Swords,
  Disruptor: Zap,
  Support: Heart,
};

function ActiveToggle({ buddy }: { buddy: DBBuddy }) {
  const toggle = useToggleBuddyActive();

  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ id: buddy.id, isActive: !buddy.is_active })}
      disabled={toggle.isPending}
      title={buddy.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200',
        buddy.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200',
          buddy.is_active ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export default function BuddyManager() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'' | 'active' | 'inactive'>('');
  const [sortKey, setSortKey] = useState<SortKey>('tier');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Edit Modal
  const [editBuddy, setEditBuddy] = useState<DBBuddy | null | 'new'>(null);

  const { data: buddies = [], isLoading, refetch } = useAdminBuddies();
  const remove = useDeleteBuddy();

  const filtered = useMemo(() => {
    let list = [...buddies];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.name_ja ?? '').toLowerCase().includes(q) ||
          (b.core_passive ?? '').toLowerCase().includes(q),
      );
    }

    if (filterTier) {
      list = list.filter((b) => b.tier === filterTier);
    }

    if (filterRole) {
      list = list.filter((b) => b.role === filterRole);
    }

    if (filterActive === 'active') list = list.filter((b) => b.is_active);
    if (filterActive === 'inactive') list = list.filter((b) => !b.is_active);

    list.sort((a, b) => {
      if (sortKey === 'tier') {
        const orderA = TIER_ORDER[a.tier] || 0;
        const orderB = TIER_ORDER[b.tier] || 0;
        if (orderA !== orderB) {
          return sortDir === 'asc' ? orderA - orderB : orderB - orderA;
        }
      } else if (sortKey === 'role') {
        const cmp = a.role.localeCompare(b.role);
        if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      } else if (sortKey === 'name') {
        const cmp = a.name.localeCompare(b.name);
        if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [buddies, search, filterTier, filterRole, filterActive, sortKey, sortDir]);

  const activeCount = buddies.filter((b) => b.is_active).length;
  const inactiveCount = buddies.length - activeCount;

  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/30 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-mh-slate-300">
              <span className="font-bold text-mh-slate-100">{buddies.length}</span> Buddies
            </span>
            <span className="text-green-400">
              <span className="font-semibold">{activeCount}</span> active
            </span>
            {inactiveCount > 0 && (
              <span className="text-mh-slate-600">
                <span className="font-semibold">{inactiveCount}</span> inactive
              </span>
            )}
            {filtered.length !== buddies.length && (
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
              onClick={() => setEditBuddy('new')}
              className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-colors shadow-sm"
            >
              <Plus size={14} />
              Add Buddy
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
              placeholder="Search buddies or passives…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-2 pl-9 pr-3 text-sm text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All Tiers</option>
            {BUDDY_TIERS.map((t) => (
              <option key={t} value={t}>
                {t} Tier
              </option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-300 outline-none"
          >
            <option value="">All Roles</option>
            {BUDDY_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
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
            <option value="tier_desc">Tier (SSR to R)</option>
            <option value="tier_asc">Tier (R to SSR)</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="role_asc">Role (A-Z)</option>
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
            <Cat size={48} className="mb-2 opacity-30" />
            <p className="text-sm font-semibold">No Buddy companions found matching your filters.</p>
            <button
              onClick={() => setEditBuddy('new')}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3 py-1.5 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25"
            >
              <Plus size={13} />
              Add First Buddy
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Card Grid View ── */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((buddy) => {
              const tierCfg = TIER_CONFIG[buddy.tier] || TIER_CONFIG.R;
              const roleCfg = ROLE_CONFIG[buddy.role] || ROLE_CONFIG.Assault;
              const RoleIcon = ROLE_ICONS[buddy.role] || Swords;

              return (
                <div
                  key={buddy.id}
                  className={cn(
                    'group relative flex flex-col justify-between rounded-2xl border border-mh-slate-750 bg-mh-slate-850 p-4 shadow-sm transition-all hover:border-mh-gold-500/40 hover:shadow-lg',
                    !buddy.is_active && 'opacity-60 bg-mh-slate-900/40',
                  )}
                >
                  {/* Top Bar: Tier, Role & Actions */}
                  <div className="flex items-center justify-between border-b border-mh-slate-750/80 pb-3">
                    <div className="flex items-center gap-2">
                      {/* Tier Badge */}
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-xs font-black uppercase tracking-wider',
                          tierCfg.badgeBg,
                          tierCfg.badgeText,
                          tierCfg.badgeBorder,
                        )}
                      >
                        {buddy.tier}
                      </span>

                      {/* Role Pill */}
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold',
                          roleCfg.bg,
                          roleCfg.text,
                          roleCfg.border,
                        )}
                      >
                        <RoleIcon size={12} />
                        <span>{buddy.role}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <ActiveToggle buddy={buddy} />
                      <button
                        onClick={() => setEditBuddy(buddy)}
                        title="Edit Buddy"
                        className="rounded p-1 text-mh-slate-400 hover:bg-mh-slate-700 hover:text-white transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Body: Portrait & Name */}
                  <div className="py-4 flex items-center gap-3.5">
                    {buddy.image ? (
                      <img
                        src={buddy.image}
                        alt={buddy.name}
                        className="h-16 w-16 rounded-2xl object-cover shadow-sm shrink-0 bg-mh-slate-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-mh-slate-800 text-mh-gold-400 shadow-sm">
                        <Cat size={26} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-sm font-bold text-mh-slate-100 group-hover:text-mh-gold-400 transition-colors truncate">
                          {buddy.name}
                        </h3>
                        {buddy.name_ja && (
                          <span className="text-[10px] text-mh-slate-500 truncate">
                            ({buddy.name_ja})
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-mh-slate-500 truncate">
                        {buddy.id}
                      </p>
                    </div>
                  </div>

                  {/* Core Passive Box */}
                  <div className="pt-3 border-t border-mh-slate-750/80">
                    {buddy.core_passive ? (
                      <div className="rounded-xl bg-mh-slate-900/90 p-2.5 border border-mh-slate-750 text-[11px] text-mh-slate-200 space-y-1">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-mh-gold-400">
                          Core Passive:
                        </span>
                        <p className="line-clamp-3 leading-relaxed">{buddy.core_passive}</p>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-mh-slate-900/40 p-2 text-center text-[10px] text-mh-slate-600">
                        No core passive defined
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
                  <th className="px-4 py-3 min-w-[200px]">Buddy</th>
                  <th className="px-4 py-3 w-24">Tier</th>
                  <th className="px-4 py-3 w-28">Role</th>
                  <th className="px-4 py-3 min-w-[260px]">Core Passive</th>
                  <th className="px-4 py-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mh-slate-800 text-xs">
                {filtered.map((buddy) => {
                  const tierCfg = TIER_CONFIG[buddy.tier] || TIER_CONFIG.R;
                  const roleCfg = ROLE_CONFIG[buddy.role] || ROLE_CONFIG.Assault;
                  const RoleIcon = ROLE_ICONS[buddy.role] || Swords;

                  return (
                    <tr
                      key={buddy.id}
                      className={cn(
                        'hover:bg-mh-slate-800/40 transition-colors',
                        !buddy.is_active && 'opacity-60 bg-mh-slate-900/20',
                      )}
                    >
                      <td className="px-4 py-3">
                        <ActiveToggle buddy={buddy} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {buddy.image ? (
                            <img
                              src={buddy.image}
                              alt={buddy.name}
                              className="h-10 w-10 rounded-xl object-cover shadow-sm shrink-0 bg-mh-slate-800"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 text-mh-gold-400">
                              <Cat size={16} />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-mh-slate-100">
                              {buddy.name}
                            </span>
                            {buddy.name_ja && (
                              <span className="ml-1 text-[11px] text-mh-slate-500">
                                ({buddy.name_ja})
                              </span>
                            )}
                            <p className="font-mono text-[10px] text-mh-slate-500">
                              {buddy.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-md border px-2 py-0.5 text-xs font-black uppercase tracking-wider',
                            tierCfg.badgeBg,
                            tierCfg.badgeText,
                            tierCfg.badgeBorder,
                          )}
                        >
                          {buddy.tier}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold',
                            roleCfg.bg,
                            roleCfg.text,
                            roleCfg.border,
                          )}
                        >
                          <RoleIcon size={11} />
                          <span>{buddy.role}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {buddy.core_passive ? (
                          <span className="text-mh-slate-200 text-[11px] line-clamp-2 leading-relaxed">
                            {buddy.core_passive}
                          </span>
                        ) : (
                          <span className="text-mh-slate-600 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditBuddy(buddy)}
                            title="Edit Buddy"
                            className="rounded p-1.5 text-mh-slate-400 hover:bg-mh-slate-700 hover:text-white"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${buddy.name}"?`)) {
                                remove.mutate(buddy.id);
                              }
                            }}
                            title="Delete Buddy"
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

      {/* Edit / Create Modal */}
      {editBuddy !== null && (
        <BuddyEditModal
          buddy={editBuddy === 'new' ? null : editBuddy}
          open={true}
          onClose={() => setEditBuddy(null)}
        />
      )}
    </div>
  );
}
