// ─────────────────────────────────────────────────────────────
// AdventurerGuide — Investigation Notes view for MHO Playable Adventurers with Roster Recruitment Tracking
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  User,
  Search,
  Swords,
  Zap,
  Heart,
  Sparkles,
  LayoutGrid,
  List,
  Plus,
  Info,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import {
  type DBAdventurer,
  ADVENTURER_ROLE_CONFIG,
  ADVENTURER_ROLES,
  ELEMENT_OPTIONS,
} from '../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { usePublicAdventurers, useUpdateAdventurerWeapon } from '../../hooks/useAdminAdventurers';
import { useUserAdventurerCollection } from '../../hooks/useUserAdventurerCollection';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import AdventurerCard from './AdventurerCard';
import AdventurerModal from './AdventurerModal';
import { cn } from '../../lib/utils';

type ViewMode = 'grid' | 'table';
type OwnershipFilter = 'all' | 'recruited' | 'missing';

const ROLE_ICONS: Record<string, typeof Swords> = {
  Assault: Swords,
  Disrupter: Zap,
  Disruptor: Zap,
  Support: Heart,
};

export default function AdventurerGuide() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [weaponFilter, setWeaponFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [inspectedAdventurer, setInspectedAdventurer] = useState<DBAdventurer | null>(null);

  const isAdmin = useAuthStore(selectIsAdmin);
  const navigate = useNavigate();

  const { data: adventurers = [], isLoading } = usePublicAdventurers();
  const updateWeaponMutation = useUpdateAdventurerWeapon();
  const { isRecruited, toggleRecruited } = useUserAdventurerCollection();

  const defaultAdventurer = useMemo(
    () => adventurers.find((a) => a.is_default),
    [adventurers],
  );

  const companionAdventurers = useMemo(
    () => adventurers.filter((a) => !a.is_default),
    [adventurers],
  );

  // Collection & Statistics Metrics
  const metrics = useMemo(() => {
    const total = adventurers.length;
    const recruitedCount = adventurers.filter((a) => isRecruited(a)).length;
    const percent = total > 0 ? Math.round((recruitedCount / total) * 100) : 0;

    const roleCounts = {
      Assault: adventurers.filter((a) => a.role === 'Assault').length,
      Disrupter: adventurers.filter((a) => a.role === 'Disrupter' || a.role === 'Disruptor').length,
      Support: adventurers.filter((a) => a.role === 'Support').length,
    };

    return { total, recruitedCount, percent, roleCounts };
  }, [adventurers, isRecruited]);

  // Filtered roster of companion adventurers
  const filteredCompanions = useMemo(() => {
    let list = [...companionAdventurers];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.name_ja ?? '').toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q) ||
          (a.notes ?? '').toLowerCase().includes(q),
      );
    }

    if (roleFilter !== 'all') {
      list = list.filter(
        (a) =>
          a.role === roleFilter ||
          (roleFilter === 'Disrupter' && a.role === 'Disruptor') ||
          (roleFilter === 'Disruptor' && a.role === 'Disrupter'),
      );
    }

    if (elementFilter !== 'all') {
      list = list.filter((a) => a.element_specialization === elementFilter);
    }

    if (weaponFilter !== 'all') {
      list = list.filter(
        (a) =>
          a.weapon_type === weaponFilter ||
          (a.allowed_weapon_types && a.allowed_weapon_types.includes(weaponFilter)),
      );
    }

    if (ownershipFilter === 'recruited') {
      list = list.filter((a) => isRecruited(a));
    } else if (ownershipFilter === 'missing') {
      list = list.filter((a) => !isRecruited(a));
    }

    // Default sorting: sort_order, then name
    list.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [companionAdventurers, search, roleFilter, elementFilter, weaponFilter, ownershipFilter, isRecruited]);

  async function handleWeaponSwitch(weaponType: string) {
    if (!defaultAdventurer) return;
    await updateWeaponMutation.mutateAsync({
      id: defaultAdventurer.id,
      weaponType,
    });
  }

  function handleNavigateToAdmin() {
    navigate('/admin/adventurers');
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Header Introduction & Recruitment Metrics ── */}
      <div className="rounded-2xl border border-mh-slate-700 bg-gradient-to-r from-mh-slate-900 via-mh-slate-850 to-mh-slate-900 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mh-slate-800 pb-5 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30 shadow-inner">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-mh-slate-100">
                  Outlanders Adventurers
                </h1>
                <span className="rounded-full bg-mh-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-mh-gold-400 border border-mh-gold-500/20">
                  MHO Roster
                </span>
              </div>
              <p className="text-xs text-mh-slate-400 mt-0.5">
                Playable characters in Monster Hunter Outlanders. Master tactical combat roles, weapon proficiencies, and elemental synergies.
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleNavigateToAdmin}
              className="flex items-center gap-1.5 rounded-xl bg-mh-slate-800 hover:bg-mh-slate-700 border border-mh-slate-700 px-3.5 py-2 text-xs font-bold text-mh-gold-400 transition-all shadow-sm shrink-0 self-start md:self-auto"
            >
              <Plus size={14} />
              <span>Manage Adventurers in Admin</span>
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Roster */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              Total Roster
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-mh-slate-100">
                {metrics.total}
              </span>
              <span className="text-xs text-mh-slate-500 font-medium">Characters</span>
            </div>
          </div>

          {/* Recruited Progress */}
          <div className="rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/5 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-mh-gold-400">
              <span>Recruitment</span>
              <span>{metrics.percent}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl font-bold text-mh-gold-300">
                {metrics.recruitedCount} <span className="text-xs text-mh-slate-400 font-normal">/ {metrics.total}</span>
              </span>
              <span className="text-[10px] text-mh-slate-400">Unlocked</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-mh-slate-800">
              <div
                className="h-full bg-gradient-to-r from-mh-gold-500 to-amber-300 transition-all duration-300 rounded-full"
                style={{ width: `${metrics.percent}%` }}
              />
            </div>
          </div>

          {/* Combat Roles */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              Combat Roles
            </span>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 rounded bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-400" title="Assault">
                <Swords size={10} /> {metrics.roleCounts.Assault}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-bold text-purple-400" title="Disrupter">
                <Zap size={10} /> {metrics.roleCounts.Disrupter}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400" title="Support">
                <Heart size={10} /> {metrics.roleCounts.Support}
              </span>
            </div>
          </div>

          {/* Guide Hint */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/60 p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              Field Tip
            </span>
            <p className="text-[11px] text-mh-slate-400 leading-snug mt-1">
              Click any character card to inspect tactical abilities, weapons, and lore.
            </p>
          </div>
        </div>
      </div>

      {/* ── Featured Showcase: Your Player Character ── */}
      {defaultAdventurer && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-mh-gold-400" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-mh-slate-200">
              Your Player Character
            </h3>
            <span className="text-xs text-mh-slate-500">
              (Master of all weapon disciplines — switch active weapon anytime)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdventurerCard
              adventurer={defaultAdventurer}
              isRecruited={true}
              onClick={() => setInspectedAdventurer(defaultAdventurer)}
              onSelectWeapon={handleWeaponSwitch}
            />

            {/* Quick Weapon Armory Selector */}
            <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-850/80 p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-mh-slate-800 pb-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-mh-gold-300 flex items-center gap-1.5">
                    <Swords size={14} />
                    <span>Quick Weapon Armory</span>
                  </span>
                  <span className="text-[11px] text-mh-slate-500">
                    Click to switch active weapon
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WEAPON_TYPES.map((w) => {
                    const isSelected = defaultAdventurer.weapon_type === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleWeaponSwitch(w.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all text-left',
                          isSelected
                            ? 'border-mh-gold-400 bg-mh-gold-500 text-mh-slate-950 font-bold shadow-md ring-1 ring-mh-gold-300'
                            : 'border-mh-slate-700 bg-mh-slate-800/80 text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-white',
                        )}
                      >
                        <Swords size={12} className={isSelected ? 'text-mh-slate-950' : 'text-mh-gold-400'} />
                        <span className="truncate">{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-mh-slate-500 flex items-center gap-1.5 pt-2 border-t border-mh-slate-800">
                <Info size={13} className="shrink-0 text-mh-gold-400" />
                <span>Your player character dynamically adapts move sets and combos based on the equipped weapon.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Companion Adventurers Roster ── */}
      <div className="space-y-4">
        {/* Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-mh-gold-400" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-mh-slate-200">
              Adventurer Roster
            </h3>
            <span className="rounded-full bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-xs text-mh-slate-400 font-semibold">
              {filteredCompanions.length} Adventurers
            </span>
          </div>

          {/* Search, Filters & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search adventurers..."
                className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>

            {/* Ownership Filter */}
            <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'recruited', label: 'Recruited' },
                  { id: 'missing', label: 'Missing' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOwnershipFilter(opt.id)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                    ownershipFilter === opt.id
                      ? 'bg-mh-gold-500 text-slate-950 font-bold shadow-sm'
                      : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Role Filter */}
            <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                  roleFilter === 'all' ? 'bg-mh-slate-800 text-mh-gold-400' : 'text-mh-slate-400 hover:text-white',
                )}
              >
                All Roles
              </button>
              {ADVENTURER_ROLES.map((r) => {
                const cfg = ADVENTURER_ROLE_CONFIG[r];
                const isSelected = roleFilter === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(isSelected ? 'all' : r)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                      isSelected ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.border}` : 'text-mh-slate-400 hover:text-white',
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {/* Element Filter */}
            <select
              value={elementFilter}
              onChange={(e) => setElementFilter(e.target.value)}
              className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
            >
              <option value="all">All Elements</option>
              {Object.values(ELEMENT_OPTIONS).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Weapon Filter */}
            <select
              value={weaponFilter}
              onChange={(e) => setWeaponFilter(e.target.value)}
              className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
            >
              <option value="all">All Weapons</option>
              {WEAPON_TYPES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-mh-slate-700 bg-mh-slate-850 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={cn(
                  'rounded-lg p-1.5 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-mh-gold-500 text-slate-950 font-bold'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={cn(
                  'rounded-lg p-1.5 transition-colors',
                  viewMode === 'table'
                    ? 'bg-mh-gold-500 text-slate-950 font-bold'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Render: Grid vs Table */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="text-xs text-mh-gold-400">Loading adventurers...</span>
          </div>
        ) : filteredCompanions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-12 text-center">
            <User size={36} className="text-mh-slate-600 mb-2" />
            <p className="text-xs font-semibold text-mh-slate-400">No companion adventurers match your filter criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanions.map((adv) => (
              <AdventurerCard
                key={adv.id}
                adventurer={adv}
                isRecruited={isRecruited(adv)}
                onToggleRecruit={() => toggleRecruited(adv.id)}
                onClick={() => setInspectedAdventurer(adv)}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-2xl border border-mh-slate-750 bg-mh-slate-900/80 shadow-md">
            <table className="w-full text-left text-xs text-mh-slate-300">
              <thead className="border-b border-mh-slate-750 bg-mh-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
                <tr>
                  <th className="py-3 pl-4 pr-2">Adventurer</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Element</th>
                  <th className="px-3 py-3">Weapon Discipline</th>
                  <th className="px-3 py-3 text-center">Recruitment</th>
                  <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mh-slate-800">
                {filteredCompanions.map((adv) => {
                  const roleKey = (adv.role === 'Disruptor' ? 'Disrupter' : adv.role) as 'Assault' | 'Disrupter' | 'Support';
                  const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
                  const RoleIcon = ROLE_ICONS[roleKey] || Swords;
                  const elemCfg = ELEMENT_OPTIONS[adv.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;
                  const weaponObj = WEAPON_TYPES.find((w) => w.id === adv.weapon_type);
                  const recruited = isRecruited(adv);

                  return (
                    <tr
                      key={adv.id}
                      onClick={() => setInspectedAdventurer(adv)}
                      className={cn(
                        'hover:bg-mh-slate-800/60 cursor-pointer transition-colors',
                        recruited ? 'bg-mh-slate-900/40' : 'opacity-60',
                      )}
                    >
                      {/* Character Info */}
                      <td className="py-3 pl-4 pr-2">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 rounded-xl bg-mh-slate-800 border border-mh-slate-700 p-1 flex items-center justify-center overflow-hidden">
                            {adv.image ? (
                              <img
                                src={adv.image}
                                alt={adv.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <User size={18} className="text-mh-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-mh-slate-100">{adv.name}</p>
                            {adv.name_ja && (
                              <p className="text-[10px] text-mh-slate-500">{adv.name_ja}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border', roleCfg.bg, roleCfg.text, roleCfg.border)}>
                          <RoleIcon size={11} />
                          <span>{roleCfg.label}</span>
                        </span>
                      </td>

                      {/* Element */}
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border', elemCfg.bg, elemCfg.text, elemCfg.border)}>
                          <span>{elemCfg.label}</span>
                        </span>
                      </td>

                      {/* Weapon */}
                      <td className="px-3 py-3">
                        <span className="font-semibold text-mh-slate-300">
                          {weaponObj?.name || adv.weapon_type || '—'}
                        </span>
                      </td>

                      {/* Recruitment Status */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleRecruited(adv.id)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-transform hover:scale-105 active:scale-95',
                            recruited
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700 hover:bg-mh-slate-700 hover:text-white',
                          )}
                        >
                          {recruited ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>Recruited</span>
                            </>
                          ) : (
                            <>
                              <Plus size={11} />
                              <span>Recruit</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setInspectedAdventurer(adv)}
                          className="rounded-lg p-1 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                          title="Inspect character details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {inspectedAdventurer && (
        <AdventurerModal
          adventurer={
            inspectedAdventurer.is_default && defaultAdventurer
              ? defaultAdventurer
              : inspectedAdventurer
          }
          open={Boolean(inspectedAdventurer)}
          onClose={() => setInspectedAdventurer(null)}
          isRecruited={isRecruited(inspectedAdventurer)}
          onToggleRecruit={() => toggleRecruited(inspectedAdventurer.id)}
          onSelectWeapon={handleWeaponSwitch}
        />
      )}
    </div>
  );
}
