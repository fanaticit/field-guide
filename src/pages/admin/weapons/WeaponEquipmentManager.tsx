// ─────────────────────────────────────────────────────────────
// WeaponEquipmentManager — Admin management interface for craftable / in-game Weapons
// Add and edit individual weapons with monster origins, elements, stats, and attached skills.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import {
  Sword,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Sparkles,
  Shield,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  Skull,
  Layers,
  GitMerge,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponSourceType,
  type WeaponElementType,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  getRarityBadgeStyle,
} from '../../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../../data/core/weapon-types';
import { useAdminMonsters } from '../../../hooks/useAdminMonsters';
import { useAdminSkills } from '../../../hooks/useAdminSkills';
import {
  useAdminWeapons,
  useToggleWeaponActive,
  useDeleteWeapon,
} from '../../../hooks/useAdminWeapons';
import WeaponEditModal from './WeaponEditModal';
import WeaponMergeModal from './WeaponMergeModal';
import { cn } from '../../../lib/utils';

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

export default function WeaponEquipmentManager() {
  const [game, setGame] = useState<string>('mho');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('rarity-desc');
  const [search, setSearch] = useState('');
  const [selectedWeaponType, setSelectedWeaponType] = useState<string>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<WeaponSourceType | 'all'>('all');
  const [selectedElement, setSelectedElement] = useState<WeaponElementType | 'all'>('all');
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>('all');

  // Modal State
  const [editingWeapon, setEditingWeapon] = useState<DBWeapon | null | 'new'>(null);
  const [weaponToDelete, setWeaponToDelete] = useState<DBWeapon | null>(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeBaseWeapon, setMergeBaseWeapon] = useState<DBWeapon | null>(null);
  const [mergeUpgradedWeapon, setMergeUpgradedWeapon] = useState<DBWeapon | null>(null);

  // Queries
  const { data: weapons = [], isLoading, refetch } = useAdminWeapons({ game });
  const { data: monsters = [] } = useAdminMonsters({ game, isActive: true });
  const { data: skills = [] } = useAdminSkills({ game, isActive: true });

  const toggleActiveMutation = useToggleWeaponActive();
  const deleteMutation = useDeleteWeapon();

  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const skillsMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const weaponTypesMap = useMemo(() => new Map(WEAPON_TYPES.map((w) => [w.id, w])), []);

  // Metrics
  const metrics = useMemo(() => {
    const total = weapons.length;
    const monsterCrafted = weapons.filter((w) => w.source_type === 'monster').length;
    const generalCrafted = total - monsterCrafted;
    const elementalCount = weapons.filter((w) => w.element_type !== 'raw').length;

    return { total, monsterCrafted, generalCrafted, elementalCount };
  }, [weapons]);

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
          w.skills.some((s) => s.id.toLowerCase().includes(q) || (skillsMap.get(s.id)?.name ?? '').toLowerCase().includes(q))
        );
      });
    }

    if (selectedWeaponType !== 'all') {
      list = list.filter((w) => w.weapon_type_id === selectedWeaponType);
    }

    if (selectedSourceType !== 'all') {
      list = list.filter((w) => w.source_type === selectedSourceType);
    }

    if (selectedElement !== 'all') {
      list = list.filter((w) => w.element_type === selectedElement);
    }

    if (selectedMonsterId !== 'all') {
      if (selectedMonsterId === 'none') {
        list = list.filter((w) => !w.monster_id);
      } else {
        list = list.filter((w) => w.monster_id === selectedMonsterId);
      }
    }

    // Sort order
    list.sort((a, b) => {
      const rA = a.rarity ?? a.grade ?? 1;
      const rB = b.rarity ?? b.grade ?? 1;

      if (sortOrder === 'rarity-desc') {
        if (rB !== rA) return rB - rA;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'rarity-asc') {
        if (rA !== rB) return rA - rB;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      // default: sort_order, then name
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [weapons, search, selectedWeaponType, selectedSourceType, selectedElement, selectedMonsterId, sortOrder, monstersMap, skillsMap]);

  async function handleDeleteConfirm() {
    if (!weaponToDelete) return;
    await deleteMutation.mutateAsync(weaponToDelete.id);
    setWeaponToDelete(null);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header Introduction & Metrics ── */}
      <div className="rounded-2xl border border-mh-slate-700 bg-gradient-to-r from-mh-slate-900 via-mh-slate-850 to-mh-slate-900 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mh-slate-800 pb-5 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30 shadow-inner">
              <Sword size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-mh-slate-100">
                  Weapon Armory Manager
                </h1>
                <span className="rounded-full bg-mh-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-mh-gold-400 border border-mh-gold-500/20 uppercase">
                  {game}
                </span>
              </div>
              <p className="text-xs text-mh-slate-400 mt-0.5">
                Add and configure craftable equipment weapons with monster origins, elemental damage, and unlockable skill attachments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Game Selector */}
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs font-bold text-mh-gold-400 focus:outline-none"
            >
              <option value="mho">Monster Hunter Outlanders (MHO)</option>
              <option value="mhn">Monster Hunter Now (MHN)</option>
            </select>

            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-xl bg-mh-slate-800 hover:bg-mh-slate-750 border border-mh-slate-700 px-3 py-2 text-xs font-bold text-mh-slate-300 hover:text-white transition-all shadow-sm"
              title="Refresh weapons list"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMergeBaseWeapon(null);
                setMergeUpgradedWeapon(null);
                setMergeModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-300 transition-all shadow-sm"
              title="Merge younger and older versions of weapons"
            >
              <GitMerge size={14} />
              <span>Merge Weapons</span>
            </button>

            <button
              type="button"
              onClick={() => setEditingWeapon('new')}
              className="flex items-center gap-1.5 rounded-xl bg-mh-gold-500 px-4 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>+ Add New Weapon</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Weapons */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              Total In Armory
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-mh-slate-100">
                {metrics.total}
              </span>
              <span className="text-xs text-mh-slate-500 font-medium">Weapons</span>
            </div>
          </div>

          {/* Monster Craft vs General */}
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Monster Crafted
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-orange-300">
                {metrics.monsterCrafted}
              </span>
              <span className="text-xs text-mh-slate-400 font-medium">Associated</span>
            </div>
          </div>

          {/* Ore / Bone / General */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Ore / Bone / Special
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-cyan-300">
                {metrics.generalCrafted}
              </span>
              <span className="text-xs text-mh-slate-400 font-medium">Non-Monster</span>
            </div>
          </div>

          {/* Elemental & Status */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              Elemental / Status
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-bold text-mh-gold-300">
                {metrics.elementalCount}
              </span>
              <span className="text-xs text-mh-slate-500 font-medium">Affinity Types</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-mh-gold-400" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-mh-slate-200">
            Weapons Roster
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

          {/* Weapon Type Filter */}
          <select
            value={selectedWeaponType}
            onChange={(e) => setSelectedWeaponType(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All 14 Weapon Types</option>
            {WEAPON_TYPES.map((wt) => (
              <option key={wt.id} value={wt.id}>
                {wt.name}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={selectedSourceType}
            onChange={(e) => setSelectedSourceType(e.target.value as WeaponSourceType | 'all')}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="monster">Monster Craft</option>
            <option value="ore">Ore / Iron</option>
            <option value="bone">Bone</option>
            <option value="event">Event / Special</option>
            <option value="general">General</option>
          </select>

          {/* Element Filter */}
          <select
            value={selectedElement}
            onChange={(e) => setSelectedElement(e.target.value as WeaponElementType | 'all')}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Elements &amp; Statuses</option>
            {Object.entries(WEAPON_ELEMENT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Monster Filter */}
          <select
            value={selectedMonsterId}
            onChange={(e) => setSelectedMonsterId(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Monsters</option>
            <option value="none">No Monster (General / Ore / Bone)</option>
            {monsters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Sort By Controls */}
          <div className="flex items-center rounded-xl border border-mh-slate-700 bg-mh-slate-850 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSortOrder('rarity-desc')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                sortOrder === 'rarity-desc'
                  ? 'bg-mh-slate-700 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                  : 'text-mh-slate-400 hover:text-white',
              )}
              title="Sort by Starting Rarity (High to Low)"
            >
              Rarity ↓
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('rarity-asc')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                sortOrder === 'rarity-asc'
                  ? 'bg-mh-slate-700 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                  : 'text-mh-slate-400 hover:text-white',
              )}
              title="Sort by Starting Rarity (Low to High)"
            >
              Rarity ↑
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('name-asc')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                sortOrder === 'name-asc'
                  ? 'bg-mh-slate-700 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                  : 'text-mh-slate-400 hover:text-white',
              )}
              title="Sort by Name (A to Z)"
            >
              A-Z
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('default')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                sortOrder === 'default'
                  ? 'bg-mh-slate-700 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                  : 'text-mh-slate-400 hover:text-white',
              )}
              title="Default Catalog Sort Order"
            >
              Default
            </button>
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
          <RefreshCw size={24} className="animate-spin text-mh-gold-400" />
        </div>
      ) : filteredWeapons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-12 text-center">
          <Sword size={36} className="text-mh-slate-600 mb-2" />
          <p className="text-xs font-semibold text-mh-slate-400">
            No weapons found matching your search and filter criteria.
          </p>
          <button
            type="button"
            onClick={() => setEditingWeapon('new')}
            className="mt-3 text-xs font-bold text-mh-gold-400 hover:underline"
          >
            + Add your first weapon
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWeapons.map((weapon) => {
            const wt = weaponTypesMap.get(weapon.weapon_type_id);
            const monster = weapon.monster_id ? monstersMap.get(weapon.monster_id) : null;
            const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.general;
            const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
            const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;

            return (
              <div
                key={weapon.id}
                className={cn(
                  'flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all space-y-4 hover:border-mh-slate-600',
                  weapon.is_active
                    ? 'border-mh-slate-750 bg-mh-slate-850'
                    : 'border-mh-slate-800 bg-mh-slate-900/50 opacity-60',
                )}
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Weapon Type Pill */}
                      <span className="rounded bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 text-[10px] font-bold text-mh-slate-300">
                        {wt?.name || weapon.weapon_type_id}
                      </span>

                      {/* Source Pill */}
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[10px] font-bold border',
                          srcCfg.bg,
                          srcCfg.text,
                          srcCfg.border,
                        )}
                      >
                        {srcCfg.label}
                      </span>
                    </div>

                    {/* Rarity & Element Pill */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[10px] font-bold border shadow-xs',
                          getRarityBadgeStyle(weapon.rarity).bg,
                          getRarityBadgeStyle(weapon.rarity).text,
                          getRarityBadgeStyle(weapon.rarity).border,
                        )}
                        title={`Starting Equipment Rarity ${weapon.rarity}`}
                      >
                        {getRarityBadgeStyle(weapon.rarity).label}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border',
                          elemCfg.bg,
                          elemCfg.text,
                          elemCfg.border,
                        )}
                      >
                        <ElIcon size={11} className={elemCfg.color} />
                        <span>{elemCfg.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Icon & Weapon Title */}
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mh-slate-900 border border-mh-slate-750 p-2 overflow-hidden shadow-inner">
                      {weapon.image ? (
                        <img
                          src={weapon.image}
                          alt={weapon.name}
                          className="h-full w-full object-contain filter brightness-95"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Sword size={26} className="text-mh-slate-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-base font-bold text-mh-slate-100 truncate">
                          {weapon.name}
                        </h3>
                        {weapon.name_ja && (
                          <span className="text-xs text-mh-slate-500 font-medium truncate">
                            ({weapon.name_ja})
                          </span>
                        )}
                      </div>

                      {weapon.upgraded_name && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium truncate mt-0.5">
                          <span className="text-mh-slate-500 text-[10px]">▲ Upgrades:</span>
                          <span className="font-bold text-amber-200">{weapon.upgraded_name}</span>
                          {weapon.upgrade_level && (
                            <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] px-1 py-0.2 font-mono">
                              Lv {weapon.upgrade_level}
                            </span>
                          )}
                        </div>
                      )}

                      {monster ? (
                        <p className="text-xs text-orange-400 font-medium truncate mt-0.5">
                          {monster.name}
                        </p>
                      ) : (
                        <p className="text-xs text-mh-slate-500 truncate mt-0.5">
                          {srcCfg.label}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Element & Special Skill Pill Row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {/* Element / Status Tag */}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border',
                        elemCfg.bg,
                        elemCfg.text,
                        elemCfg.border,
                      )}
                    >
                      <ElIcon size={12} className={elemCfg.color} />
                      <span>{elemCfg.label}</span>
                    </span>

                    {/* Special Skill Tag */}
                    {weapon.special_skill && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-mh-gold-500/10 border border-mh-gold-500/25 px-2.5 py-1 text-xs font-bold text-mh-gold-400">
                        <Sparkles size={12} />
                        <span>{weapon.special_skill}</span>
                      </span>
                    )}
                  </div>

                  {/* Attached Skills */}
                  {weapon.skills && weapon.skills.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-mh-gold-400">
                        <Sparkles size={11} />
                        <span>Attached Skills</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {weapon.skills.map((s, sIdx) => {
                          const meta = skillsMap.get(s.id);
                          const ur = s.unlockRarity ?? s.unlock_rarity ?? null;
                          return (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 rounded-md bg-mh-slate-900 border border-mh-slate-750 px-2 py-0.5 text-[11px] font-semibold text-mh-slate-200"
                            >
                              <span>{meta?.name ?? s.id}</span>
                              <span className="font-bold text-mh-gold-400">Lv {s.level}</span>
                              {ur && ur > 1 && (
                                <span className="rounded bg-amber-500/20 text-amber-300 px-1 py-0.2 text-[9px] font-bold border border-amber-500/40">
                                  R{ur}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-mh-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: weapon.id,
                        isActive: !weapon.is_active,
                      })
                    }
                    className={cn(
                      'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold border',
                      weapon.is_active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-mh-slate-800 border-mh-slate-750 text-mh-slate-500',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', weapon.is_active ? 'bg-emerald-400' : 'bg-mh-slate-500')} />
                    <span>{weapon.is_active ? 'Active' : 'Inactive'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMergeBaseWeapon(weapon);
                        setMergeUpgradedWeapon(null);
                        setMergeModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                      title="Merge with another weapon"
                    >
                      <GitMerge size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingWeapon(weapon)}
                      className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-750 hover:text-white transition-colors"
                      title="Edit Weapon"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeaponToDelete(weapon)}
                      className="rounded-lg p-1.5 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      title="Delete Weapon"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="overflow-hidden rounded-2xl border border-mh-slate-750 bg-mh-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs text-mh-slate-300">
            <thead className="border-b border-mh-slate-750 bg-mh-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Weapon</th>
                <th className="px-3 py-3.5">Rarity</th>
                <th className="px-3 py-3.5">Type</th>
                <th className="px-3 py-3.5">Origin</th>
                <th className="px-3 py-3.5">Element / Status</th>
                <th className="px-3 py-3.5">Special Skill</th>
                <th className="px-3 py-3.5">Skills</th>
                <th className="px-3 py-3.5 text-center">Status</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800/80">
              {filteredWeapons.map((weapon) => {
                const wt = weaponTypesMap.get(weapon.weapon_type_id);
                const monster = weapon.monster_id ? monstersMap.get(weapon.monster_id) : null;
                const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.general;
                const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
                const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;

                return (
                  <tr key={weapon.id} className="hover:bg-mh-slate-800/50 transition-colors">
                    {/* Weapon Info */}
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-700 p-1">
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

                    {/* Starting Rarity */}
                    <td className="px-3 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border shadow-xs',
                          getRarityBadgeStyle(weapon.rarity).bg,
                          getRarityBadgeStyle(weapon.rarity).text,
                          getRarityBadgeStyle(weapon.rarity).border,
                        )}
                        title={`Starting Equipment Rarity ${weapon.rarity}`}
                      >
                        {getRarityBadgeStyle(weapon.rarity).label}
                      </span>
                    </td>

                    {/* Weapon Type */}
                    <td className="px-3 py-3.5">
                      <span className="font-semibold text-mh-slate-300">
                        {wt?.name || weapon.weapon_type_id}
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
                              className="rounded bg-mh-slate-800 border border-mh-slate-700 px-1.5 py-0.2 text-[10px] text-mh-slate-300"
                            >
                              {skillsMap.get(s.id)?.name ?? s.id} Lv{s.level}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-mh-slate-600">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: weapon.id,
                            isActive: !weapon.is_active,
                          })
                        }
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                          weapon.is_active
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-mh-slate-800 border-mh-slate-700 text-mh-slate-500',
                        )}
                      >
                        {weapon.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMergeBaseWeapon(weapon);
                            setMergeUpgradedWeapon(null);
                            setMergeModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                          title="Merge with another weapon"
                        >
                          <GitMerge size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingWeapon(weapon)}
                          className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                          title="Edit weapon"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeaponToDelete(weapon)}
                          className="rounded-lg p-1.5 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          title="Delete weapon"
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

      {/* ── Edit / Create Weapon Modal ── */}
      {editingWeapon && (
        <WeaponEditModal
          game={game}
          weapon={editingWeapon}
          open={Boolean(editingWeapon)}
          onClose={() => setEditingWeapon(null)}
        />
      )}

      {/* ── Weapon Merge Modal ── */}
      <WeaponMergeModal
        open={mergeModalOpen}
        weapons={weapons}
        initialBaseWeapon={mergeBaseWeapon}
        initialUpgradedWeapon={mergeUpgradedWeapon}
        onClose={() => {
          setMergeModalOpen(false);
          setMergeBaseWeapon(null);
          setMergeUpgradedWeapon(null);
        }}
        onSuccess={() => refetch()}
      />

      {/* ── Delete Confirmation Dialog ── */}
      {weaponToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/40 bg-mh-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-red-400">
              Confirm Delete Weapon
            </h3>
            <p className="text-xs text-mh-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{weaponToDelete.name}</strong> ({weaponToDelete.id})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWeaponToDelete(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-mh-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500 shadow-sm"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
