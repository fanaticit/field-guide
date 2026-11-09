// ─────────────────────────────────────────────────────────────
// WeaponGuide — Investigation Notes view for Weapons & Hunter's Challenge Forge Tracking
// Includes: Max Rarity Filter, Side-by-Side Comparison Modal,
// Custom Icon Dropdowns for Types & Elements, and User Weapon Crafting Tracking.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Sword,
  Search,
  LayoutGrid,
  List,
  Shield,
  Bookmark,
  Eye,
  CheckCircle2,
  ChevronDown,
  Check,
  LogIn,
  Hammer,
  Plus,
  ArrowLeftRight,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponElementType,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  getRarityBadgeStyle,
  getWeaponDisplayName,
} from '../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { useAdminWeapons } from '../../hooks/useAdminWeapons';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useUserWeaponCollection } from '../../hooks/useUserWeaponCollection';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import WeaponCard from './WeaponCard';
import WeaponModal from './WeaponModal';
import WeaponCompareModal from './WeaponCompareModal';
import LoginModal from '../../components/auth/LoginModal';
import { cn } from '../../lib/utils';
import ElementIcon from '../../components/ElementIcon';

type ChallengeFilter = 'all' | 'tracked' | 'crafting' | 'upgrading' | 'mastered';
type OwnershipFilter = 'all' | 'crafted' | 'missing';
type ViewMode = 'grid' | 'table';
type SortOrder = 'rarity-desc' | 'rarity-asc' | 'name-asc' | 'default';
const INTRO_HIDDEN_KEY = 'weapons-intro-hidden';

export default function WeaponGuide() {
  const { user, profile } = useAuthStore();
  const theme = useUIStore((s) => s.sectionThemes['/challenges'] ?? DEFAULT_SECTION_THEMES['/challenges']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const compareParam = searchParams.get('compare');

  const [search, setSearch] = useState('');
  const [filterOwnership, setFilterOwnership] = useState<OwnershipFilter>('all');
  const [filterChallenge, setFilterChallenge] = useState<ChallengeFilter>('all');
  const [filterWeaponType, setFilterWeaponType] = useState<string>(() => {
    if (typeParam && (typeParam === 'all' || WEAPON_TYPES.some((wt) => wt.id === typeParam))) {
      return typeParam;
    }
    return 'all';
  });
  const [filterElement, setFilterElement] = useState<WeaponElementType | 'all'>('all');
  const [filterMaxRarity, setFilterMaxRarity] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('rarity-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Custom Dropdown Open States & Refs
  const [weaponTypeOpen, setWeaponTypeOpen] = useState(false);
  const [elementOpen, setElementOpen] = useState(false);
  const weaponTypeRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (weaponTypeRef.current && !weaponTypeRef.current.contains(e.target as Node)) {
        setWeaponTypeOpen(false);
      }
      if (elementRef.current && !elementRef.current.contains(e.target as Node)) {
        setElementOpen(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  // Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState<DBWeapon | null>(null);
  const [compareTargetWeapon, setCompareTargetWeapon] = useState<DBWeapon | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Selected Weapon for Inspection Modal
  const [selectedWeapon, setSelectedWeapon] = useState<DBWeapon | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Queries & Hooks
  const { data: weapons = [], isLoading } = useAdminWeapons({ isActive: true, showSpoilers: Boolean(profile?.show_spoilers) });
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const {
    collectionMap,
    craftedCount,
    getCraftedRarity,
    isCrafted,
    setWeaponCrafted,
    removeWeaponCrafted,
  } = useUserWeaponCollection();

  const addChallenge = useAddWeaponChallenge();
  const navigate = useNavigate();

  // Sync if type query param changes
  useEffect(() => {
    if (typeParam && (typeParam === 'all' || WEAPON_TYPES.some((wt) => wt.id === typeParam))) {
      setFilterWeaponType(typeParam);
    }
  }, [typeParam]);

  // Pre-select weapon for comparison from query param
  useEffect(() => {
    if (compareParam && weapons.length > 0 && !selectedForCompare) {
      const match = weapons.find((w) => w.id === compareParam);
      if (match) {
        setSelectedForCompare(match);
        if (!typeParam && match.weapon_type_id) {
          setFilterWeaponType(match.weapon_type_id);
        }
      }
    }
  }, [compareParam, typeParam, weapons, selectedForCompare]);

  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const weaponTypesMap = useMemo(() => new Map(WEAPON_TYPES.map((w) => [w.id, w])), []);

  const selectedWeaponTypeObj = filterWeaponType !== 'all' ? weaponTypesMap.get(filterWeaponType) : null;
  const selectedElementConfig = filterElement !== 'all' ? WEAPON_ELEMENT_CONFIG[filterElement] : null;

  // Available starting rarities for filter
  const availableRarities = useMemo(() => {
    const set = new Set<number>();
    weapons.forEach((w) => {
      if (w.rarity) set.add(w.rarity);
    });
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  }, [weapons]);

  // Comparison Handlers
  const handleToggleCompare = useCallback(
    (weapon: DBWeapon) => {
      if (!selectedForCompare) {
        // Select first weapon and pin to top
        setSelectedForCompare(weapon);
      } else if (selectedForCompare.id === weapon.id) {
        // De-select first weapon
        setSelectedForCompare(null);
      } else {
        // Second weapon clicked -> open compare panel
        setCompareTargetWeapon(weapon);
        setIsCompareOpen(true);
      }
    },
    [selectedForCompare],
  );

  const handleCloseCompare = useCallback(() => {
    setIsCompareOpen(false);
    setCompareTargetWeapon(null);
    // As requested: "When you exit the panel leave the first weapon selected and at the top."
  }, []);

  const handleClearCompareAll = useCallback(() => {
    setIsCompareOpen(false);
    setCompareTargetWeapon(null);
    setSelectedForCompare(null);
  }, []);

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
        const matchesEvolvedName =
          (w.max_name ?? '').toLowerCase().includes(q) ||
          Object.values(w.rarity_names ?? {}).some((n) => n.toLowerCase().includes(q));
        return (
          w.name.toLowerCase().includes(q) ||
          matchesEvolvedName ||
          (w.series ?? '').toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          (w.name_ja ?? '').toLowerCase().includes(q) ||
          (monster?.name ?? '').toLowerCase().includes(q) ||
          (w.apex_effect?.name ?? '').toLowerCase().includes(q)
        );
      });
    }

    if (filterOwnership === 'crafted') {
      list = list.filter((w) => isCrafted(w.id));
    } else if (filterOwnership === 'missing') {
      list = list.filter((w) => !isCrafted(w.id));
    }

    if (filterWeaponType !== 'all') {
      list = list.filter((w) => w.weapon_type_id === filterWeaponType);
    }

    if (filterElement !== 'all') {
      list = list.filter((w) => w.element_type === filterElement);
    }

    if (filterMaxRarity !== 'all') {
      const maxR = Number(filterMaxRarity);
      list = list.filter((w) => (w.rarity || 1) <= maxR);
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

    // If a weapon is selected for compare, ensure it remains in the list even if filters exclude it
    if (selectedForCompare && !list.some((w) => w.id === selectedForCompare.id)) {
      list.unshift(selectedForCompare);
    }

    // Sort order
    list.sort((a, b) => {
      // Pinned weapon selected for comparison always sorts to the top regardless of sort!
      if (selectedForCompare) {
        if (a.id === selectedForCompare.id) return -1;
        if (b.id === selectedForCompare.id) return 1;
      }

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
  }, [
    weapons,
    search,
    filterOwnership,
    filterWeaponType,
    filterElement,
    filterMaxRarity,
    filterChallenge,
    sortOrder,
    challenges,
    monstersMap,
    selectedForCompare,
    isCrafted,
    collectionMap,
  ]);

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
    <div data-rarity-theme={theme} className="challenges-theme px-1 sm:px-4 lg:px-8 pb-6 pt-2 space-y-4 sm:space-y-6 max-w-7xl mx-auto text-white">
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
          {/* Crafted metric */}
          <div className="px-2.5 py-0.5 text-center border-r border-[var(--border-subtle)]">
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-amber-400">
              <Hammer size={10} />
              <span>Crafted</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-sm font-black text-white">{craftedCount}</span>
              <span className="text-[10px] text-mh-slate-500">/ {weapons.length}</span>
              <span className="text-[9px] font-bold text-amber-400 ml-0.5">
                ({weapons.length > 0 ? Math.round((craftedCount / weapons.length) * 100) : 0}%)
              </span>
            </div>
          </div>

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

          {/* Ownership Filter */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'crafted', label: `Crafted (${craftedCount})` },
                { id: 'missing', label: 'Uncrafted' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterOwnership(opt.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                  filterOwnership === opt.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
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

          {/* Weapon Type Filter Custom Dropdown */}
          <div ref={weaponTypeRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setWeaponTypeOpen((prev) => !prev);
                setElementOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-200 transition-all hover:bg-mh-slate-750 focus:outline-none focus:border-mh-gold-500/50 shadow-sm',
                filterWeaponType !== 'all' && 'border-mh-gold-500/50 bg-mh-slate-800/90 text-mh-gold-300 font-semibold',
              )}
            >
              {selectedWeaponTypeObj ? (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <img
                    src={`/images/weapons/${selectedWeaponTypeObj.id}.svg`}
                    alt={selectedWeaponTypeObj.name}
                    className="h-4 w-4 object-contain filter brightness-110 drop-shadow"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <Sword size={13} className="text-mh-gold-400 shrink-0" />
              )}
              <span>{selectedWeaponTypeObj ? selectedWeaponTypeObj.name : 'All Weapon Types'}</span>
              <ChevronDown size={13} className={cn('text-mh-slate-400 transition-transform duration-200 shrink-0', weaponTypeOpen && 'rotate-180')} />
            </button>

            {weaponTypeOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] rounded-2xl border border-mh-slate-700 bg-mh-slate-900/98 p-1.5 shadow-2xl backdrop-blur-md max-h-72 overflow-y-auto animate-fade-in divide-y divide-mh-slate-800/60">
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterWeaponType('all');
                      setWeaponTypeOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                      filterWeaponType === 'all'
                        ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                        : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Sword size={14} className="text-mh-gold-400" />
                      <span>All Weapon Types</span>
                    </div>
                    {filterWeaponType === 'all' && <Check size={13} className="text-mh-gold-400" />}
                  </button>
                </div>

                <div className="pt-1 space-y-0.5">
                  {WEAPON_TYPES.filter((wt) => weapons.some((w) => w.weapon_type_id === wt.id)).map((wt) => {
                    const isSelected = filterWeaponType === wt.id;
                    return (
                      <button
                        key={wt.id}
                        type="button"
                        onClick={() => {
                          setFilterWeaponType(wt.id);
                          setWeaponTypeOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                          isSelected
                            ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                            : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-mh-slate-800 border border-mh-slate-755 p-0.5">
                            <img
                              src={`/images/weapons/${wt.id}.svg`}
                              alt={wt.name}
                              className="h-full w-full object-contain filter brightness-110"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <span className="truncate">{wt.name}</span>
                        </div>
                        {isSelected && <Check size={13} className="text-mh-gold-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Element Filter Custom Dropdown */}
          <div ref={elementRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setElementOpen((prev) => !prev);
                setWeaponTypeOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-200 transition-all hover:bg-mh-slate-750 focus:outline-none focus:border-mh-gold-500/50 shadow-sm',
                filterElement !== 'all' && 'border-mh-gold-500/50 bg-mh-slate-800/90 text-mh-gold-300 font-semibold',
              )}
            >
              {selectedElementConfig ? (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <img
                    src={selectedElementConfig.icon}
                    alt={selectedElementConfig.label}
                    className="h-4 w-4 object-contain filter drop-shadow"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <Shield size={13} className="text-mh-slate-400 shrink-0" />
              )}
              <span>{selectedElementConfig ? selectedElementConfig.label : 'All Elements & Statuses'}</span>
              <ChevronDown size={13} className={cn('text-mh-slate-400 transition-transform duration-200 shrink-0', elementOpen && 'rotate-180')} />
            </button>

            {elementOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] rounded-2xl border border-mh-slate-700 bg-mh-slate-900/98 p-1.5 shadow-2xl backdrop-blur-md max-h-72 overflow-y-auto animate-fade-in divide-y divide-mh-slate-800/60">
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterElement('all');
                      setElementOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                      filterElement === 'all'
                        ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                        : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-mh-slate-400" />
                      <span>All Elements &amp; Statuses</span>
                    </div>
                    {filterElement === 'all' && <Check size={13} className="text-mh-gold-400" />}
                  </button>
                </div>

                <div className="pt-1 space-y-0.5">
                  {(Object.entries(WEAPON_ELEMENT_CONFIG) as [WeaponElementType, typeof WEAPON_ELEMENT_CONFIG[WeaponElementType]][]).map(([k, cfg]) => {
                    const isSelected = filterElement === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setFilterElement(k);
                          setElementOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                          isSelected
                            ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                            : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-mh-slate-800 border border-mh-slate-750 p-0.5">
                            <img
                              src={cfg.icon}
                              alt={cfg.label}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <span className={cn('truncate', isSelected ? 'text-mh-gold-300 font-bold' : cfg.text)}>{cfg.label}</span>
                        </div>
                        {isSelected && <Check size={13} className="text-mh-gold-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Rarity Filter */}
          <select
            value={filterMaxRarity}
            onChange={(e) => setFilterMaxRarity(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
            title="Filter weapons up to a maximum rarity"
          >
            <option value="all">All Rarities</option>
            {availableRarities.map((r) => (
              <option key={r} value={r}>
                Rarity &le; R{r}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="rarity-desc">Rarity: High to Low</option>
            <option value="rarity-asc">Rarity: Low to High</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="default">Game Order</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
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
                isSelectedForCompare={selectedForCompare?.id === weapon.id}
                onToggleCompare={handleToggleCompare}
                isCrafted={isCrafted(weapon.id)}
                craftedRarity={getCraftedRarity(weapon.id)}
                onSetCraftedRarity={setWeaponCrafted}
                onRemoveCrafted={removeWeaponCrafted}
              />
            );
          })}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-mh-slate-750 bg-mh-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs text-mh-slate-300">
            <thead className="border-b border-mh-slate-750 bg-mh-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              <tr>
                {/* 1. Weapon (Icon + Name) - Required */}
                <th className="py-2.5 sm:py-3.5 pl-3 sm:pl-5 pr-2 sm:pr-3">Weapon</th>
                {/* 2. Type (just the icon on mobile) - Required */}
                <th className="px-2 sm:px-3 py-2.5 sm:py-3.5 text-center sm:text-left">Type</th>
                {/* 3. Attack - Required */}
                <th className="px-2 sm:px-3 py-2.5 sm:py-3.5 text-center">Attack</th>
                {/* 5. Element / Status (can be just icon) - Preference 1 */}
                <th className="hidden min-[480px]:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5 text-center sm:text-left">Element</th>
                {/* 6. Rarity - Preference 2 */}
                <th className="hidden sm:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5 text-center">Rarity</th>
                {/* 7. Hunter Challenge (just icon on md) - Preference 3 */}
                <th className="hidden md:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5 text-center">Challenge</th>
                {/* Extra: Crafted */}
                <th className="hidden lg:table-cell px-3 py-3.5 text-center">Crafted</th>
                {/* Extra: Origin */}
                <th className="hidden xl:table-cell px-3 py-3.5">Origin</th>
                {/* Extra: Apex Effect */}
                <th className="hidden 2xl:table-cell px-3 py-3.5">Apex Effect</th>
                {/* 4. Select to Compare & Action - Required */}
                <th className="py-2.5 sm:py-3.5 pl-2 sm:pl-3 pr-3 sm:pr-5 text-right">Compare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800/80">
              {filteredWeapons.map((weapon) => {
                const wt = weaponTypesMap.get(weapon.weapon_type_id);
                const monster = weapon.monster_id ? monstersMap.get(weapon.monster_id) : null;
                const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.unknown;
                const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
                const challenge = getWeaponChallenge(challenges, weapon.id);
                const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
                const rarityCfg = getRarityBadgeStyle(weapon.rarity || 1);
                const isSelected = selectedForCompare?.id === weapon.id;
                const weaponCraftedRarity = getCraftedRarity(weapon.id);
                const isWeaponCrafted = isCrafted(weapon.id) && Boolean(weaponCraftedRarity);
                const activeCraftedRarity = weaponCraftedRarity ?? (challenge && challenge.current_rarity > 0 ? challenge.current_rarity : null);
                const displayName = getWeaponDisplayName(weapon, activeCraftedRarity);

                return (
                  <tr
                    key={weapon.id}
                    onClick={() => setSelectedWeapon(weapon)}
                    className={cn(
                      'hover:bg-mh-slate-800/50 transition-colors cursor-pointer',
                      isSelected && 'bg-amber-500/10 border-l-2 border-l-amber-400',
                    )}
                  >
                    {/* 1. Weapon Info (Icon + Name) */}
                    <td className="py-2.5 sm:py-3.5 pl-3 sm:pl-5 pr-2 sm:pr-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-mh-slate-800 border border-mh-slate-750 p-1">
                          {weapon.image ? (
                            <img
                              src={weapon.image}
                              alt={displayName}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Sword size={15} className="text-mh-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-[120px] xs:max-w-[150px] sm:max-w-[200px]">
                          <p className="font-bold text-mh-slate-100 break-words leading-tight text-xs">{displayName}</p>
                          {displayName !== weapon.name && (
                            <p className="text-[10px] text-mh-slate-400 break-words">Base: {weapon.name}</p>
                          )}
                          {weapon.series && (
                            <p className="hidden sm:block text-[10px] text-mh-slate-500 break-words">{weapon.series}</p>
                          )}
                          {weapon.name_ja && (
                            <p className="hidden sm:block text-[10px] text-mh-slate-500 break-words">{weapon.name_ja}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Type (just the icon on mobile) */}
                    <td className="px-2 sm:px-3 py-2.5 sm:py-3.5 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5" title={wt?.name || weapon.weapon_type_id}>
                        {wt ? (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-mh-slate-800/80 border border-mh-slate-700/60 p-0.5">
                            <img
                              src={`/images/weapons/${wt.id}.svg`}
                              alt={wt.name}
                              className="h-full w-full object-contain filter brightness-110"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : null}
                        <span className="hidden md:inline font-semibold text-mh-slate-300">
                          {wt?.name || weapon.weapon_type_id}
                        </span>
                      </div>
                    </td>

                    {/* 3. Attack & Affinity */}
                    <td className="px-2 sm:px-3 py-2.5 sm:py-3.5 text-center font-mono font-bold text-mh-slate-100 whitespace-nowrap">
                      <div>{weapon.attack ?? '—'}</div>
                      {weapon.affinity !== null && weapon.affinity !== 0 && (
                        <div className="hidden sm:block text-[10px] text-mh-slate-400 font-mono">
                          {weapon.affinity > 0 ? `+${weapon.affinity / 100}%` : `${weapon.affinity / 100}%`}
                        </div>
                      )}
                    </td>

                    {/* 5. Element / Status (can be just the icon) */}
                    <td className="hidden min-[480px]:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5 text-center sm:text-left whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-1.5 sm:px-2 py-0.5 text-[11px] font-bold border',
                          elemCfg.bg,
                          elemCfg.text,
                          elemCfg.border,
                        )}
                        title={elemCfg.label}
                      >
                        <ElementIcon element={weapon.element_type} size={13} />
                        <span className="hidden md:inline">{elemCfg.label}</span>
                      </span>
                    </td>

                    {/* 6. Rarity */}
                    <td className="hidden sm:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5 text-center whitespace-nowrap">
                      <span className={cn('inline-block rounded px-2 py-0.5 text-[10px] font-bold border font-mono', rarityCfg.badge)}>
                        {rarityCfg.label}
                      </span>
                    </td>

                    {/* 7. Hunter Challenge Action / Status */}
                    <td className="hidden md:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5 text-center whitespace-nowrap">
                      {!user ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLoginModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2 lg:px-2.5 py-0.5 text-[10px] font-bold border bg-mh-slate-800 border-mh-slate-750 text-mh-slate-400 hover:text-white transition-all"
                          title="Sign in to track"
                        >
                          <LogIn size={11} />
                          <span className="hidden lg:inline">Track</span>
                        </button>
                      ) : isTracked && challenge ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/challenges');
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2 lg:px-2.5 py-0.5 text-[10px] font-bold border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-all shadow-sm"
                          title="View in Hunter Challenges"
                        >
                          <CheckCircle2 size={11} />
                          <span className="hidden lg:inline">Go to Challenge ➔</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddChallenge(weapon);
                          }}
                          className="inline-flex items-center gap-1 rounded-full px-2 lg:px-2.5 py-0.5 text-[10px] font-bold border border-sky-600/50 bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200 transition-all shadow-sm"
                          title="Add to Hunter Challenges"
                        >
                          <ChallengeIcon size={14} />
                          <span className="hidden lg:inline">+ Challenge</span>
                        </button>
                      )}
                    </td>

                    {/* Extra: Crafted Status & Quick Level Selector */}
                    <td className="hidden lg:table-cell px-3 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isWeaponCrafted && weaponCraftedRarity ? (
                        <select
                          value={weaponCraftedRarity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val === 0) {
                              removeWeaponCrafted(weapon.id);
                            } else {
                              setWeaponCrafted(weapon.id, val);
                            }
                          }}
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-bold border font-mono cursor-pointer transition-all focus:outline-none',
                            getRarityBadgeStyle(weaponCraftedRarity).badge,
                          )}
                          title="Click to change crafted rarity or uncraft"
                        >
                          {Array.from(
                            { length: Math.max(1, (weapon.max_rarity || 14) - (weapon.rarity || 1) + 1) },
                            (_, i) => (weapon.rarity || 1) + i,
                          ).map((r) => (
                            <option key={r} value={r} className="bg-mh-slate-900 text-white font-sans">
                              ✓ R{r} Crafted
                            </option>
                          ))}
                          <option value={0} className="bg-mh-slate-900 text-rose-400 font-sans">
                            ✕ Uncraft
                          </option>
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setWeaponCrafted(weapon.id, weapon.rarity || 1)}
                          className="inline-flex items-center gap-1 rounded border border-dashed border-mh-slate-600 bg-mh-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-mh-slate-400 hover:border-mh-gold-400 hover:text-white transition-all shadow-xs"
                          title="Click to mark as crafted"
                        >
                          <Plus size={10} />
                          <span>Craft</span>
                        </button>
                      )}
                    </td>

                    {/* Extra: Origin */}
                    <td className="hidden xl:table-cell px-3 py-3.5 whitespace-nowrap">
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

                    {/* Extra: Apex effect */}
                    <td className="hidden 2xl:table-cell px-3 py-3.5 font-semibold text-mh-gold-400 max-w-[160px] break-words">
                      {weapon.apex_effect?.name || '—'}
                    </td>

                    {/* 4. Select to Compare & Action */}
                    <td className="py-2.5 sm:py-3.5 pl-2 sm:pl-3 pr-3 sm:pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleCompare(weapon)}
                          className={cn(
                            'inline-flex items-center justify-center gap-1 rounded-lg p-1.5 sm:px-2.5 sm:py-1 text-xs font-bold transition-all border shadow-xs',
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20 shadow-md ring-1 ring-amber-400 font-black'
                              : 'bg-mh-slate-800/90 border-mh-slate-700 text-mh-slate-300 hover:bg-mh-slate-750 hover:text-white hover:border-mh-slate-500',
                          )}
                          title={isSelected ? 'Selected for comparison (Click to de-select)' : 'Select to compare'}
                          aria-label={isSelected ? 'De-select weapon from comparison' : 'Select weapon to compare'}
                        >
                          <ArrowLeftRight size={13} className={isSelected ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'} />
                          <span className="hidden xl:inline">{isSelected ? 'Comparing' : 'Compare'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedWeapon(weapon)}
                          className="hidden md:flex rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
                          title="Inspect weapon"
                        >
                          <Eye size={14} />
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

      {/* ── Floating Compare Banner (When 1st Weapon is Selected) ── */}
      {selectedForCompare && !isCompareOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-amber-500/60 bg-mh-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-mh-slate-800 border border-mh-slate-750 p-1 flex items-center justify-center shrink-0">
              {selectedForCompare.image ? (
                <img
                  src={selectedForCompare.image}
                  alt={selectedForCompare.name}
                  className="h-full w-full object-contain filter drop-shadow"
                />
              ) : (
                <Sword size={16} className="text-mh-gold-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{selectedForCompare.name}</span>
                <span className="font-mono text-[10px] text-amber-400">
                  ({getRarityBadgeStyle(selectedForCompare.rarity || 1).label})
                </span>
              </p>
              <p className="text-[10px] text-mh-slate-400">
                Select a 2nd weapon to compare side-by-side
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedForCompare(null)}
            className="ml-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800 hover:bg-mh-slate-750 px-3 py-1 text-xs font-semibold text-mh-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Weapon Comparison Modal ── */}
      {selectedForCompare && compareTargetWeapon && (
        <WeaponCompareModal
          weapon1={selectedForCompare}
          weapon2={compareTargetWeapon}
          open={isCompareOpen}
          onClose={handleCloseCompare}
          onClearBoth={handleClearCompareAll}
        />
      )}

      {/* ── Inspection & Challenge Modal ── */}
      {selectedWeapon && (
        <WeaponModal
          weapon={selectedWeapon}
          open={Boolean(selectedWeapon)}
          onClose={() => setSelectedWeapon(null)}
          challenge={getWeaponChallenge(challenges, selectedWeapon.id)}
          onOpenLogin={() => setLoginModalOpen(true)}
          isCrafted={Boolean(selectedWeapon && isCrafted(selectedWeapon.id))}
          craftedRarity={selectedWeapon ? getCraftedRarity(selectedWeapon.id) : null}
          onSetCraftedRarity={setWeaponCrafted}
          onRemoveCrafted={removeWeaponCrafted}
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
