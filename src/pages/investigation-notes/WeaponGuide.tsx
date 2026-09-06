// ─────────────────────────────────────────────────────────────
// WeaponGuide — Investigation Notes view for Weapons & Hunter Collection Tracking
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  Sword,
  Search,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  List,
  Shield,
  Plus,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  Skull,
  Eye,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponSourceType,
  type WeaponElementType,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  getRarityBadgeStyle,
} from '../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { useAdminWeapons } from '../../hooks/useAdminWeapons';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useAdminSkills } from '../../hooks/useAdminSkills';
import { useUserWeaponCollection } from '../../hooks/useUserWeaponCollection';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import WeaponCard from './WeaponCard';
import WeaponModal from './WeaponModal';
import { cn } from '../../lib/utils';

type OwnershipFilter = 'all' | 'collected' | 'missing';
type ViewMode = 'grid' | 'table';
type SortOrder = 'rarity-desc' | 'rarity-asc' | 'name-asc' | 'default';

const ELEMENT_ICONS: Record<WeaponElementType, React.ComponentType<{ size?: number; className?: string }>> = {
  raw: Shield,
  fire: Flame,
  water: Droplets,
  thunder: Zap,
  ice: Snowflake,
  dragon: Sparkles,
  poison: Skull,
  paralysis: Zap,
  blast: Flame,
  sleep: Snowflake,
};

export default function WeaponGuide() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(selectIsAdmin);

  const [search, setSearch] = useState('');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [filterOwnership, setFilterOwnership] = useState<OwnershipFilter>('all');
  const [filterWeaponType, setFilterWeaponType] = useState<string>('all');
  const [filterElement, setFilterElement] = useState<WeaponElementType | 'all'>('all');
  const [filterSource, setFilterSource] = useState<WeaponSourceType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('rarity-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Selected Weapon for Inspection Modal
  const [selectedWeapon, setSelectedWeapon] = useState<DBWeapon | null>(null);

  // Queries & Hooks
  const { data: weapons = [], isLoading } = useAdminWeapons({ isActive: true });
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: skills = [] } = useAdminSkills({ isActive: true });
  const { isCollected, toggleCollected } = useUserWeaponCollection();

  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const skillsMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const weaponTypesMap = useMemo(() => new Map(WEAPON_TYPES.map((w) => [w.id, w])), []);

  // Filtered Weapons
  const filteredWeapons = useMemo(() => {
    let list = [...weapons];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) => {
        const monster = w.monster_id ? monstersMap.get(w.monster_id) : null;
        return (
          w.name.toLowerCase().includes(q) ||
          (w.upgraded_name ?? '').toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          (w.name_ja ?? '').toLowerCase().includes(q) ||
          (monster?.name ?? '').toLowerCase().includes(q) ||
          (w.special_skill ?? '').toLowerCase().includes(q) ||
          w.skills.some((s) => s.id.toLowerCase().includes(q) || (skillsMap.get(s.id)?.name ?? '').toLowerCase().includes(q))
        );
      });
    }

    if (filterGame !== 'all') {
      list = list.filter((w) => w.game === filterGame);
    }

    if (filterWeaponType !== 'all') {
      list = list.filter((w) => w.weapon_type_id === filterWeaponType);
    }

    if (filterElement !== 'all') {
      list = list.filter((w) => w.element_type === filterElement);
    }

    if (filterSource !== 'all') {
      list = list.filter((w) => w.source_type === filterSource);
    }

    if (filterOwnership === 'collected') {
      list = list.filter((w) => isCollected(w.id));
    } else if (filterOwnership === 'missing') {
      list = list.filter((w) => !isCollected(w.id));
    }

    // Sort order
    list.sort((a, b) => {
      if (sortOrder === 'rarity-desc') {
        const diff = (b.rarity || 1) - (a.rarity || 1);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'rarity-asc') {
        const diff = (a.rarity || 1) - (b.rarity || 1);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [weapons, search, filterGame, filterWeaponType, filterElement, filterSource, filterOwnership, sortOrder, isCollected, monstersMap, skillsMap]);

  // Metrics
  const totalCount = weapons.length;
  const collectedCount = weapons.filter((w) => isCollected(w.id)).length;
  const progressPercent = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Collection Metrics & Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-mh-slate-700 bg-gradient-to-r from-mh-slate-900 via-mh-slate-850 to-mh-slate-900 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mh-gold-500/20 to-mh-gold-700/10 text-mh-gold-400 ring-1 ring-mh-gold-500/40 shadow-inner">
              <Sword size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-mh-slate-100">
                  Weapon Armory
                </h1>
                <span className="rounded-full bg-mh-gold-500/10 px-3 py-0.5 text-xs font-bold text-mh-gold-400 border border-mh-gold-500/25">
                  Collection Tracker
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-mh-slate-400 max-w-xl leading-relaxed">
                Explore craftable weapons across all 14 Monster Hunter weapon types, special finisher skills, elemental affinities, and track your personal forged armory.
              </p>
            </div>
          </div>

          {/* Right: Admin shortcut button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin/weapons')}
              className="flex items-center gap-2 rounded-xl bg-mh-gold-500/10 hover:bg-mh-gold-500/20 border border-mh-gold-500/30 px-4 py-2.5 text-xs font-bold text-mh-gold-400 transition-all shrink-0 self-start lg:self-auto"
            >
              <Sword size={14} />
              <span>+ Manage Weapons in Admin</span>
            </button>
          )}
        </div>

        {/* Collection Progress & Stats Row */}
        <div className="mt-6 pt-6 border-t border-mh-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Progress Bar Card */}
          <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/70 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-mh-slate-300">Armory Forged</span>
              <span className="text-mh-gold-400 font-mono">
                {collectedCount} / {totalCount} ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-mh-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-mh-gold-500 to-amber-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Tip */}
          <div className="sm:col-span-2 rounded-2xl border border-mh-slate-750 bg-mh-slate-950/70 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 text-mh-gold-400">
              <Sparkles size={18} />
            </div>
            <p className="text-xs text-mh-slate-400 leading-relaxed">
              <strong className="text-mh-slate-200">Hunter's Field Note:</strong> Mark weapons as forged to track your collection progress. Click on any weapon card to inspect detailed skill unlocks and lore notes.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sword size={16} className="text-mh-gold-400" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-mh-slate-200">
            Armory Catalog
          </h3>
          <span className="rounded-full bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-xs text-mh-slate-400 font-semibold">
            {filteredWeapons.length} of {weapons.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search weapons, monsters, skills…"
              className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
            />
          </div>

          {/* Ownership Filter */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'collected', label: 'Collected' },
                { id: 'missing', label: 'Missing' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterOwnership(opt.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                  filterOwnership === opt.id
                    ? 'bg-mh-gold-500 text-slate-950 font-bold shadow-sm'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Game Filter */}
          <select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Games</option>
            <option value="mho">Outlanders (MHO)</option>
            <option value="mhn">Now (MHN)</option>
          </select>

          {/* Weapon Type Filter */}
          <select
            value={filterWeaponType}
            onChange={(e) => setFilterWeaponType(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All 14 Weapon Types</option>
            {WEAPON_TYPES.map((wt) => (
              <option key={wt.id} value={wt.id}>
                {wt.name}
              </option>
            ))}
          </select>

          {/* Element Filter */}
          <select
            value={filterElement}
            onChange={(e) => setFilterElement(e.target.value as WeaponElementType | 'all')}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Elements &amp; Statuses</option>
            {Object.entries(WEAPON_ELEMENT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as WeaponSourceType | 'all')}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Crafting Sources</option>
            <option value="monster">Monster Craft</option>
            <option value="ore">Ore / Iron</option>
            <option value="bone">Bone</option>
            <option value="event">Event / Special</option>
            <option value="general">General</option>
          </select>

          {/* Sort By Controls */}
          <div className="flex items-center rounded-xl border border-mh-slate-700 bg-mh-slate-850 p-0.5 text-xs">
            <span className="px-2 text-mh-slate-500 font-bold uppercase tracking-wider text-[10px] hidden sm:inline">Sort:</span>
            {(
              [
                { id: 'rarity-desc', label: 'Rarity ↓' },
                { id: 'rarity-asc', label: 'Rarity ↑' },
                { id: 'name-asc', label: 'A-Z' },
                { id: 'default', label: 'Default' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortOrder(opt.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 transition-colors font-medium',
                  sortOrder === opt.id
                    ? 'bg-mh-gold-500 text-slate-950 font-bold'
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

      {/* ── Content: Grid or Table ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" />
        </div>
      ) : filteredWeapons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-12 text-center">
          <Sword size={36} className="text-mh-slate-600 mb-2" />
          <p className="text-xs font-semibold text-mh-slate-400">
            No weapons match your active search and filter criteria.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWeapons.map((weapon) => (
            <WeaponCard
              key={weapon.id}
              weapon={weapon}
              isCollected={isCollected(weapon.id)}
              onToggleCollected={() => toggleCollected(weapon.id)}
              onInspect={() => setSelectedWeapon(weapon)}
            />
          ))}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="overflow-hidden rounded-2xl border border-mh-slate-750 bg-mh-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs text-mh-slate-300">
            <thead className="border-b border-mh-slate-750 bg-mh-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Weapon</th>
                <th className="px-3 py-3.5">Type</th>
                <th className="px-3 py-3.5 text-center">Rarity</th>
                <th className="px-3 py-3.5">Origin</th>
                <th className="px-3 py-3.5">Element / Status</th>
                <th className="px-3 py-3.5">Special Skill</th>
                <th className="px-3 py-3.5">Attached Skills</th>
                <th className="px-3 py-3.5 text-center">Armory</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800/80">
              {filteredWeapons.map((weapon) => {
                const wt = weaponTypesMap.get(weapon.weapon_type_id);
                const monster = weapon.monster_id ? monstersMap.get(weapon.monster_id) : null;
                const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.general;
                const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
                const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;
                const collected = isCollected(weapon.id);
                const rarityCfg = getRarityBadgeStyle(weapon.rarity || 1);

                return (
                  <tr
                    key={weapon.id}
                    onClick={() => setSelectedWeapon(weapon)}
                    className={cn(
                      'hover:bg-mh-slate-800/50 transition-colors cursor-pointer',
                      !collected && 'opacity-65',
                    )}
                  >
                    {/* Weapon Info */}
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-750 p-1">
                          {weapon.image ? (
                            <img
                              src={weapon.image}
                              alt={weapon.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Sword size={16} className="text-mh-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-mh-slate-100">{weapon.name}</p>
                          {weapon.upgraded_name && (
                            <p className="text-[10px] text-amber-300 font-medium">
                              ▲ {weapon.upgraded_name} {weapon.upgrade_level ? `(Lv ${weapon.upgrade_level})` : ''}
                            </p>
                          )}
                          {weapon.name_ja && (
                            <p className="text-[10px] text-mh-slate-500">{weapon.name_ja}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3.5 font-semibold text-mh-slate-300">
                      {wt?.name || weapon.weapon_type_id}
                    </td>

                    {/* Rarity */}
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn('inline-block rounded px-2 py-0.5 text-[10px] font-bold border', rarityCfg.badge)}>
                        {rarityCfg.label}
                      </span>
                    </td>

                    {/* Origin */}
                    <td className="px-3 py-3.5">
                      {monster ? (
                        <span className="text-orange-400 font-bold">{monster.name}</span>
                      ) : (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-semibold border',
                            srcCfg.bg,
                            srcCfg.text,
                            srcCfg.border,
                          )}
                        >
                          {srcCfg.label}
                        </span>
                      )}
                    </td>

                    {/* Element / Status */}
                    <td className="px-3 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border',
                          elemCfg.bg,
                          elemCfg.text,
                          elemCfg.border,
                        )}
                      >
                        <ElIcon size={11} className={elemCfg.color} />
                        <span>{elemCfg.label}</span>
                      </span>
                    </td>

                    {/* Special Skill */}
                    <td className="px-3 py-3.5 font-semibold text-mh-gold-400">
                      {weapon.special_skill || '—'}
                    </td>

                    {/* Skills */}
                    <td className="px-3 py-3.5">
                      {weapon.skills && weapon.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {weapon.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-mh-slate-800 border border-mh-slate-750 px-1.5 py-0.2 text-[10px] text-mh-slate-300"
                            >
                              {skillsMap.get(s.id)?.name ?? s.id} Lv{s.level}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-mh-slate-600">—</span>
                      )}
                    </td>

                    {/* Armory Status */}
                    <td className="px-3 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollected(weapon.id);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-all',
                          collected
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-mh-slate-800 border-mh-slate-700 text-mh-slate-400 hover:text-white',
                        )}
                      >
                        {collected ? (
                          <>
                            <CheckCircle2 size={11} className="text-emerald-400" />
                            <span>Collected</span>
                          </>
                        ) : (
                          <>
                            <Plus size={11} />
                            <span>Collect</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 pl-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedWeapon(weapon)}
                        className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                        title="Inspect weapon"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Inspection Modal ── */}
      {selectedWeapon && (
        <WeaponModal
          weapon={selectedWeapon}
          open={Boolean(selectedWeapon)}
          onClose={() => setSelectedWeapon(null)}
          isCollected={isCollected(selectedWeapon.id)}
          onToggleCollected={() => toggleCollected(selectedWeapon.id)}
        />
      )}
    </div>
  );
}
