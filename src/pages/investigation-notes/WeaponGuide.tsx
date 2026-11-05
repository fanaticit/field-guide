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
  Bookmark,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  Skull,
  Eye,
  CheckCircle2,
  
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
import {
  useHunterChallenges,
  useAddWeaponChallenge,
  
  getWeaponChallenge,
} from '../../hooks/useHunterChallenges';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';
import ChallengeIcon from '../../components/ChallengeIcon';
import PageTitlePanel from '../../components/layout/PageTitlePanel';
import { useNavigate } from 'react-router-dom';
import WeaponCard from './WeaponCard';
import WeaponModal from './WeaponModal';
import LoginModal from '../../components/auth/LoginModal';
import { cn } from '../../lib/utils';

type ChallengeFilter = 'all' | 'tracked' | 'crafting' | 'upgrading' | 'mastered';
type ViewMode = 'grid' | 'table';
type SortOrder = 'rarity-desc' | 'rarity-asc' | 'name-asc' | 'default';
const INTRO_HIDDEN_KEY = 'weapons-intro-hidden';

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
  stun: Zap,
};

export default function WeaponGuide() {
  const { user, profile } = useAuthStore();
  const theme = useUIStore((s) => s.sectionThemes['/challenges'] ?? DEFAULT_SECTION_THEMES['/challenges']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };
  const [search, setSearch] = useState('');
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
  const { data: weapons = [], isLoading } = useAdminWeapons({ isActive: true, showSpoilers: Boolean(profile?.show_spoilers) });
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: challenges = [] } = useHunterChallenges(user?.id);

  const addChallenge = useAddWeaponChallenge();
  const navigate = useNavigate();
  
  

  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
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
        game: 'mho',
        weaponId: weapon.id,
        weaponName: weapon.name,
        weaponTypeId: weapon.weapon_type_id,
        monsterId: weapon.monster_id ?? null,
        monsterName: monster?.name ?? null,
        elementType: weapon.element_type,
        specialSkill: weapon.apex_effect?.name ?? null,
        pieceImage: weapon.image ?? null,
        setIcon: weapon.image ?? null,
        craftRarity: weapon.rarity || 1,
        maxRarity: weapon.max_rarity,
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
          (w.series ?? '').toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          (w.name_ja ?? '').toLowerCase().includes(q) ||
          (monster?.name ?? '').toLowerCase().includes(q) ||
          (w.apex_effect?.name ?? '').toLowerCase().includes(q)
        );
      });
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
        if (filterChallenge === 'mastered') return c.status === 'completed' || c.current_rarity >= (c.max_rarity || 14);
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
  }, [weapons, search, filterWeaponType, filterElement, filterSource, filterChallenge, sortOrder, challenges, monstersMap]);

  // Collection status (a weapon counts as collected once its challenge is mastered at its max rarity)
  const stats = useMemo(() => {
    const weaponChallenges = challenges.filter((c) => c.challenge_type === 'weapon' && c.status !== 'abandoned');
    const mastered = weaponChallenges.filter((c) => c.status === 'completed').length;
    const total = weapons.length;
    return {
      total,
      mastered,
      masteredPct: total > 0 ? Math.round((mastered / total) * 100) : 0,
      tracked: weaponChallenges.length,
      crafting: weaponChallenges.filter((c) => c.status === 'crafting').length,
      upgrading: weaponChallenges.filter((c) => c.status === 'upgrading').length,
    };
  }, [challenges, weapons]);

  return (
    <div data-rarity-theme={theme} className="challenges-theme px-6 pb-6 pt-2 lg:px-8 lg:pb-8 lg:pt-3 space-y-6 max-w-7xl mx-auto text-white">
      <PageTitlePanel
        icon="/img/ui/Weapons%20Icon.png"
        title="Weapons Collection"
        hidden={introHidden}
        onToggleHidden={toggleIntro}
        description={
          <>
            Browse every weapon in the game with its attack, element, sharpness and the materials needed for each
            upgrade. Add a weapon to your Hunter's Challenges to start tracking it from the rarity you craft it at
            up to its max rarity. The monsters you need to hunt for it then appear in your
            <span className="text-mh-slate-200 font-semibold"> Hunting Targets</span>, and the Mastered count
            fills in as you finish each weapon.
          </>
        }
      >
        {/* Collection status */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/30 rounded-xl p-1 border border-[var(--border-subtle)]">
          <div className="px-2.5 py-0.5 text-center border-r border-[var(--border-subtle)]">
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-[var(--theme-accent)]">
              <Bookmark size={10} />
              <span>Mastered</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-sm font-black text-white">{stats.mastered}</span>
              <span className="text-[10px] text-mh-slate-500">/ {stats.total}</span>
              <span className="text-[9px] font-bold text-emerald-400 ml-0.5">({stats.masteredPct}%)</span>
            </div>
          </div>

          {[
            { label: 'Tracked', value: stats.tracked, color: 'var(--theme-accent)' },
            { label: 'Crafting', value: stats.crafting, color: 'var(--rarity-superior)' },
            { label: 'Upgrading', value: stats.upgrading, color: 'var(--rarity-rare)' },
          ].map((cell) => (
            <div key={cell.label} className="px-2 py-0.5 text-center">
              <span className="block text-[9px] font-bold" style={{ color: cell.color }}>{cell.label}</span>
              <span className="font-display text-xs font-bold" style={{ color: cell.color }}>{cell.value}</span>
            </div>
          ))}
        </div>
      </PageTitlePanel>

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
                    ? 'bg-yellow-500 text-slate-950 font-bold shadow-sm'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Weapon Type Filter */}
          <select
            value={filterWeaponType}
            onChange={(e) => setFilterWeaponType(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Weapon Types</option>
            {WEAPON_TYPES.filter((wt) => weapons.some((w) => w.weapon_type_id === wt.id)).map((wt) => (
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
            <option value="all">All Sources</option>
            {(Object.keys(WEAPON_SOURCE_CONFIG) as WeaponSourceType[]).map((k) => (
              <option key={k} value={k}>
                {WEAPON_SOURCE_CONFIG[k].label}
              </option>
            ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
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
                <th className="px-3 py-3.5 text-center">Attack</th>
                <th className="px-3 py-3.5">Apex Effect</th>
                <th className="px-3 py-3.5 text-center">Hunter Challenge</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800/80">
              {filteredWeapons.map((weapon) => {
                const wt = weaponTypesMap.get(weapon.weapon_type_id);
                const monster = weapon.monster_id ? monstersMap.get(weapon.monster_id) : null;
                const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.unknown;
                const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
                const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;
                const challenge = getWeaponChallenge(challenges, weapon.id);
                const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
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
                          {weapon.series && (
                            <p className="text-[10px] text-mh-slate-500 break-words">{weapon.series}</p>
                          )}
                          {weapon.name_ja && (
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

                    {/* Attack */}
                    <td className="px-3 py-3.5 text-center font-mono font-bold text-mh-slate-100">
                      {weapon.attack ?? '—'}
                    </td>

                    {/* Apex effect */}
                    <td className="px-3 py-3.5 font-semibold text-mh-gold-400 max-w-[160px] break-words">
                      {weapon.apex_effect?.name || '—'}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/challenges');
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-all shadow-sm"
                        >
                          <CheckCircle2 size={11} />
                          <span>Go to Challenge ➔</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddChallenge(weapon);
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-sky-600/50 bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200 transition-all shadow-sm"
                        >
                          <ChallengeIcon size={14} />
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
