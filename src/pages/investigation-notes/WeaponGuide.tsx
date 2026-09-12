// ─────────────────────────────────────────────────────────────
// WeaponGuide — Investigation Notes view for Weapons & Hunter's Challenge Forge Tracking
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import {
  Sword,
  Search,
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
  CheckCircle2,
  ChevronRight,
  LogIn,
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
import {
  useHunterChallenges,
  useAddWeaponChallenge,
  useIncrementChallenge,
  getWeaponChallenge,
} from '../../hooks/useHunterChallenges';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import WeaponCard from './WeaponCard';
import WeaponModal from './WeaponModal';
import LoginModal from '../../components/auth/LoginModal';
import { cn } from '../../lib/utils';

type ChallengeFilter = 'all' | 'tracked' | 'crafting' | 'upgrading' | 'mastered';
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
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [filterChallenge, setFilterChallenge] = useState<ChallengeFilter>('all');
  const [filterWeaponType, setFilterWeaponType] = useState<string>('all');
  const [filterElement, setFilterElement] = useState<WeaponElementType | 'all'>('all');
  const [filterSource, setFilterSource] = useState<WeaponSourceType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('rarity-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Selected Weapon for Inspection Modal
  const [selectedWeapon, setSelectedWeapon] = useState<DBWeapon | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Queries & Hooks
  const { data: weapons = [], isLoading } = useAdminWeapons({ isActive: true });
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: skills = [] } = useAdminSkills({ isActive: true });
  const { data: challenges = [] } = useHunterChallenges(user?.id);

  const addChallenge = useAddWeaponChallenge();
  const incrementChallenge = useIncrementChallenge();

  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const skillsMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const weaponTypesMap = useMemo(() => new Map(WEAPON_TYPES.map((w) => [w.id, w])), []);

  // Quick challenge add handler
  const handleAddChallenge = useCallback(
    async (weapon: DBWeapon) => {
      if (!user) {
        setLoginModalOpen(true);
        return;
      }

      const monster = weapon.monster_id ? monstersMap.get(weapon.monster_id) : null;
      await addChallenge.mutateAsync({
        userId: user.id,
        game: weapon.game,
        weaponId: weapon.id,
        weaponName: weapon.name,
        weaponTypeId: weapon.weapon_type_id,
        monsterId: weapon.monster_id ?? null,
        monsterName: monster?.name ?? null,
        elementType: weapon.element_type,
        specialSkill: weapon.special_skill ?? null,
        pieceImage: weapon.image ?? null,
        setIcon: weapon.image ?? null,
        craftRarity: weapon.rarity || 1,
        maxRarity: 16,
      });
    },
    [user, monstersMap, addChallenge],
  );

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

    if (filterChallenge !== 'all') {
      list = list.filter((w) => {
        const c = getWeaponChallenge(challenges, w.id);
        if (!c) return false;
        if (filterChallenge === 'tracked') return c.status !== 'abandoned';
        if (filterChallenge === 'crafting') return c.status === 'crafting' || c.current_rarity === 0;
        if (filterChallenge === 'upgrading') return c.status === 'upgrading' && c.current_rarity > 0;
        if (filterChallenge === 'mastered') return c.status === 'completed' || c.current_rarity >= (c.max_rarity || 16);
        return true;
      });
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
  }, [weapons, search, filterGame, filterWeaponType, filterElement, filterSource, filterChallenge, sortOrder, challenges, monstersMap, skillsMap]);

  // Challenge metrics
  const activeChallenges = challenges.filter(
    (c) => c.challenge_type === 'weapon' && (c.status === 'crafting' || c.status === 'upgrading'),
  );
  const completedChallenges = challenges.filter(
    (c) => c.challenge_type === 'weapon' && c.status === 'completed',
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header & Personal Challenge Tracker Stats ── */}
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
                <span className="rounded-full bg-blue-500/10 px-3 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/25">
                  Hunter's Challenge Forge
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-mh-slate-400 max-w-xl leading-relaxed">
                Explore weapons across all 14 Monster Hunter weapon types, special finisher skills, elemental affinities, and challenge yourself to forge and upgrade to Rarity 16.
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

        {/* Hunter's Challenges Summary Stats Row */}
        <div className="mt-6 pt-6 border-t border-mh-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Active Goals Card */}
          <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/70 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-mh-slate-300">Active Forge Goals</span>
              <span className="text-blue-400 font-mono">{activeChallenges.length} Active</span>
            </div>
            <p className="text-[11px] text-mh-slate-400">
              Weapons currently tracked for forging or upgrading to R16.
            </p>
          </div>

          {/* Mastered R16 Card */}
          <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/70 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-mh-slate-300">Mastered (R16)</span>
              <span className="text-emerald-400 font-mono">{completedChallenges.length} Mastered</span>
            </div>
            <p className="text-[11px] text-mh-slate-400">
              Weapons fully forged and upgraded to maximum rank 16.
            </p>
          </div>

          {/* Quick Tip */}
          <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/70 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 text-mh-gold-400">
              <Sparkles size={18} />
            </div>
            <p className="text-xs text-mh-slate-400 leading-relaxed">
              <strong className="text-mh-slate-200">Hunter's Field Note:</strong> Add weapons to your challenges to set starting rarities and track monster hunting targets.
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
          <span className="rounded-full bg-mh-slate-800 border border-mh-slate-750 px-2 py-0.5 text-xs text-mh-slate-400 font-semibold">
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

          {/* Challenge Filter */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'tracked', label: 'Tracked' },
                { id: 'crafting', label: 'Craft Goals' },
                { id: 'upgrading', label: 'Upgrading' },
                { id: 'mastered', label: 'Mastered' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterChallenge(opt.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                  filterChallenge === opt.id
                    ? 'bg-blue-500 text-slate-950 font-bold shadow-sm'
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
          {filteredWeapons.map((weapon) => {
            const challenge = getWeaponChallenge(challenges, weapon.id);
            return (
              <WeaponCard
                key={weapon.id}
                weapon={weapon}
                challenge={challenge}
                isLoggedIn={Boolean(user)}
                onAddChallenge={handleAddChallenge}
                onOpenLogin={() => setLoginModalOpen(true)}
                onInspect={() => setSelectedWeapon(weapon)}
                isAddingChallenge={addChallenge.isPending}
              />
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
                <th className="px-3 py-3.5">Type</th>
                <th className="px-3 py-3.5 text-center">Rarity</th>
                <th className="px-3 py-3.5">Origin</th>
                <th className="px-3 py-3.5">Element / Status</th>
                <th className="px-3 py-3.5">Special Skill</th>
                <th className="px-3 py-3.5">Attached Skills</th>
                <th className="px-3 py-3.5 text-center">Hunter Challenge</th>
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
                const challenge = getWeaponChallenge(challenges, weapon.id);
                const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
                const isCompleted = challenge?.status === 'completed';
                const isCrafted = (challenge?.current_rarity ?? 0) > 0;
                const rarityCfg = getRarityBadgeStyle(weapon.rarity || 1);

                return (
                  <tr
                    key={weapon.id}
                    onClick={() => setSelectedWeapon(weapon)}
                    className="hover:bg-mh-slate-800/50 transition-colors cursor-pointer"
                  >
                    {/* Weapon Info with Wrapped Name */}
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
                        <div className="min-w-0 max-w-[200px]">
                          <p className="font-bold text-mh-slate-100 break-words leading-tight">{weapon.name}</p>
                          {weapon.upgraded_name && (
                            <p className="text-[10px] text-amber-300 font-medium break-words mt-0.5">
                              ▲ {weapon.upgraded_name} {weapon.upgrade_level ? `(Lv ${weapon.upgrade_level})` : ''}
                            </p>
                          )}
                          {weapon.name_ja && !weapon.upgraded_name && (
                            <p className="text-[10px] text-mh-slate-500 break-words">{weapon.name_ja}</p>
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
                      <span className={cn('inline-block rounded px-2 py-0.5 text-[10px] font-bold border font-mono', rarityCfg.badge)}>
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
                    <td className="px-3 py-3.5 font-semibold text-mh-gold-400 max-w-[140px] break-words">
                      {weapon.special_skill || '—'}
                    </td>

                    {/* Skills */}
                    <td className="px-3 py-3.5">
                      {weapon.skills && weapon.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
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

                    {/* Hunter Challenge Action / Status */}
                    <td className="px-3 py-3.5 text-center">
                      {!user ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLoginModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-mh-slate-800 border-mh-slate-700 text-mh-slate-400 hover:text-white transition-all"
                        >
                          <LogIn size={11} />
                          <span>Track</span>
                        </button>
                      ) : isTracked && challenge ? (
                        isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-emerald-500/15 border-emerald-500/30 text-emerald-300">
                            <CheckCircle2 size={11} className="text-emerald-400" />
                            <span>Mastered</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              incrementChallenge.mutateAsync(challenge);
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 transition-all shadow-sm"
                          >
                            <ChevronRight size={11} />
                            <span>{isCrafted ? `R${challenge.current_rarity + 1}` : `Craft (R${challenge.craft_rarity})`}</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddChallenge(weapon);
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-mh-gold-500/15 border-mh-gold-500/30 text-mh-gold-300 hover:bg-mh-gold-500/25 transition-all"
                        >
                          <Plus size={11} />
                          <span>+ Challenge</span>
                        </button>
                      )}
                    </td>

                    {/* Inspect Action */}
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

      {/* ── Inspection & Challenge Modal ── */}
      {selectedWeapon && (
        <WeaponModal
          weapon={selectedWeapon}
          open={Boolean(selectedWeapon)}
          onClose={() => setSelectedWeapon(null)}
          challenge={getWeaponChallenge(challenges, selectedWeapon.id)}
          onOpenLogin={() => setLoginModalOpen(true)}
        />
      )}

      {/* ── Login Modal ── */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
