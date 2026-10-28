import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Shield, Search, Filter, Plus, LayoutGrid, List, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArmoryBuildCard } from '../components/armory/ArmoryBuildCard';
import { ArmoryBuildRow } from '../components/armory/ArmoryBuildRow';
import {
  FALLBACK_MONSTER_ICONS,
  getBuildInkCounts,
  type ArmoryBuild,
  type MonsterLookup,
} from '../types/armory';
import { INK_CONFIG } from '../data/schemas/visage';
import PageTitlePanel from '../components/layout/PageTitlePanel';
import { useUIStore } from '../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../config/themes';
const INTRO_HIDDEN_KEY = 'armory-builds-intro-hidden';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  return isMobileUA || isSmallScreen;
}

export default function Armory() {
  const theme = useUIStore((s) => s.sectionThemes['/armory'] ?? DEFAULT_SECTION_THEMES['/armory']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'main' | 'support'>('all');
  const [selectedWeaponType, setSelectedWeaponType] = useState<string>('all');
  const [selectedInk, setSelectedInk] = useState<string>('all');
  const [viewMode, setViewModeState] = useState<'panel' | 'list'>(() => {
    const saved = getCookie('armory_view_mode');
    if (saved === 'panel' || saved === 'list') {
      return saved;
    }
    return isMobileDevice() ? 'list' : 'panel';
  });

  const setViewMode = (mode: 'panel' | 'list') => {
    setViewModeState(mode);
    setCookie('armory_view_mode', mode);
  };

  // 1. Fetch community published builds with all character, buddy, equipment and visage references
  const { data: builds, isLoading: isBuildsLoading } = useQuery({
    queryKey: ['mho_builds_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mho_builds')
        .select(`
          id,
          title,
          description,
          upvotes,
          downvotes,
          created_at,
          author_id,
          author:profiles(username),
          adventurer:adventurers(id, name, image, role),
          buddy:buddies(id, name, image),
          weapon_type:weapon_types(id, name, icon),
          weapon:weapons(id, name, monster_id, image, element_type),
          helm:armour_pieces!mho_builds_helm_piece_id_fkey(id, slot, monster_id),
          chest:armour_pieces!mho_builds_chest_piece_id_fkey(id, slot, monster_id),
          gloves:armour_pieces!mho_builds_gloves_piece_id_fkey(id, slot, monster_id),
          waist:armour_pieces!mho_builds_waist_piece_id_fkey(id, slot, monster_id),
          greaves:armour_pieces!mho_builds_greaves_piece_id_fkey(id, slot, monster_id),
          core_visage:visages!mho_builds_core_visage_id_fkey(id, name, ink_types),
          visage_2:visages!mho_builds_visage_2_id_fkey(id, name, ink_types),
          visage_3:visages!mho_builds_visage_3_id_fkey(id, name, ink_types),
          visage_4:visages!mho_builds_visage_4_id_fkey(id, name, ink_types),
          visage_5:visages!mho_builds_visage_5_id_fkey(id, name, ink_types)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ArmoryBuild[];
    },
  });

  // 2. Fetch monsters for resolving armor/weapon monster icons
  const { data: monsters, isLoading: isMonstersLoading } = useQuery({
    queryKey: ['monsters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monsters')
        .select('id, name, icon')
        .eq('is_active', true);
      if (error) throw error;
      return data as { id: string; name: string; icon: string | null }[];
    },
  });

  // 3. Create a fast monster lookup map with fallbacks for materials (Bone, Leather, Alloy, Pink Rathian)
  const monsterMap = useMemo(() => {
    const map = new Map<string, MonsterLookup>();
    // Pre-populate with material fallbacks
    Object.entries(FALLBACK_MONSTER_ICONS).forEach(([id, info]) => {
      map.set(id, info);
    });
    // Add real database monsters
    monsters?.forEach((m) => {
      map.set(m.id, { name: m.name, icon: m.icon });
    });
    return map;
  }, [monsters]);

  // Extract unique weapon types from builds for quick filtering
  const availableWeaponTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon?: string | null }>();
    builds?.forEach((b) => {
      if (b.weapon_type?.id) {
        map.set(b.weapon_type.id, {
          id: b.weapon_type.id,
          name: b.weapon_type.name,
          icon: b.weapon_type.icon,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [builds]);

  // Canonical list of ink options for ink filter
  const availableInks = useMemo(() => {
    const canonicalInks = [
      'flames', 'water', 'thunder', 'ice', 'dragon',
      'combat', 'might', 'guidance', 'grace',
      'poison', 'paralysis', 'sleep', 'blast', 'resonance', 'protection'
    ];
    return canonicalInks
      .filter((id) => (INK_CONFIG as any)[id])
      .map((id) => (INK_CONFIG as any)[id]);
  }, []);

  // 4. Filter builds based on search query, role, weapon type, and ink type
  const filteredBuilds = useMemo(() => {
    if (!builds) return [];

    return builds.filter((build) => {
      // Role filter
      const desc = build.description || '';
      const isSupport = /<!-- role:support -->/.test(desc);
      if (roleFilter === 'main' && isSupport) return false;
      if (roleFilter === 'support' && !isSupport) return false;

      // Weapon type filter
      if (selectedWeaponType !== 'all' && build.weapon_type?.id !== selectedWeaponType) {
        return false;
      }

      // Ink type filter
      if (selectedInk !== 'all') {
        const inkCounts = getBuildInkCounts(build);
        const count =
          (inkCounts[selectedInk] || 0) +
          (selectedInk === 'flames' ? inkCounts['fire'] || 0 : 0) +
          (selectedInk === 'fire' ? inkCounts['flames'] || 0 : 0) +
          (selectedInk === 'ice' ? inkCounts['frost'] || 0 : 0) +
          (selectedInk === 'frost' ? inkCounts['ice'] || 0 : 0);
        if (count === 0) return false;
      }

      // Search query (title, author, adventurer name, weapon name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = build.title.toLowerCase().includes(query);
        const authorMatch = build.author?.username?.toLowerCase().includes(query);
        const advMatch = build.adventurer?.name?.toLowerCase().includes(query);
        const wtMatch = build.weapon_type?.name?.toLowerCase().includes(query);
        const weaponMatch = build.weapon?.name?.toLowerCase().includes(query);

        if (!titleMatch && !authorMatch && !advMatch && !wtMatch && !weaponMatch) {
          return false;
        }
      }

      return true;
    });
  }, [builds, roleFilter, selectedWeaponType, selectedInk, searchQuery]);

  const isLoading = isBuildsLoading || isMonstersLoading;

  return (
    <div data-rarity-theme={theme} className="section-theme flex flex-col gap-6 px-4 pb-4 pt-5 lg:px-6 lg:pb-6 lg:pt-7 max-w-7xl mx-auto w-full">
      <PageTitlePanel
        icon="/img/ui/Equipment%20Icon.png"
        title="Community Builds"
        hidden={introHidden}
        onToggleHidden={toggleIntro}
        description={
          <>
            Browse, inspect and get inspired by gear builds shared by fellow hunters. Search by title, author,
            hunter or weapon, filter by role, weapon type or ink, and open any build to see its equipment, visages
            and skills. Found something you like? Open it in the Build Planner to make it your own, or
            <span className="text-mh-slate-200 font-semibold"> create a new build</span> and share it with the community.
          </>
        }
      >
        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg bg-black/30 p-0.5 border border-[var(--border-subtle)]">
          <button
            onClick={() => setViewMode('panel')}
            title="Panel View (Grid Cards)"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${
              viewMode === 'panel'
                ? 'bg-white/10 text-[var(--theme-accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Panel</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List View (Row Icons)"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white/10 text-[var(--theme-accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <List size={14} />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>

        {/* New Build action button */}
        <Link
          to="/armory/planner"
          className="btn-mho-gold !px-3 !py-1.5 !text-xs"
        >
          <Plus size={15} />
          <span>Create Build</span>
        </Link>
      </PageTitlePanel>

      {/* ── Search & Filter Bar ───────────────────────────────────── */}
      <div className="mho-panel flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, hunter, or weapon..."
            className="w-full bg-black/30 border border-[var(--border-subtle)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
          />
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter Pills */}
          <div className="flex items-center rounded-lg bg-black/30 p-0.5 border border-[var(--border-subtle)] text-xs">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                roleFilter === 'all'
                  ? 'bg-gradient-to-b from-[#EAD17A] to-[#C9A042] text-[#1A1408] shadow-[0_0_10px_var(--accent-gold-glow)]'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRoleFilter('main')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                roleFilter === 'main'
                  ? 'badge-fine'
                  : 'text-[var(--text-secondary)] hover:text-[var(--rarity-fine)]'
              }`}
            >
              Main
            </button>
            <button
              onClick={() => setRoleFilter('support')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                roleFilter === 'support'
                  ? 'badge-superior'
                  : 'text-[var(--text-secondary)] hover:text-[var(--rarity-superior)]'
              }`}
            >
              Support
            </button>
          </div>

          {/* Weapon Type Filter */}
          {availableWeaponTypes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs">
              <Filter size={13} className="text-[var(--text-secondary)]" />
              <select
                value={selectedWeaponType}
                onChange={(e) => setSelectedWeaponType(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-mh-slate-900 text-mh-slate-200">
                  All Weapons
                </option>
                {availableWeaponTypes.map((wt) => (
                  <option key={wt.id} value={wt.id} className="bg-mh-slate-900 text-mh-slate-200">
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ink Type Filter */}
          <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs">
            <Sparkles size={13} className="text-[var(--text-secondary)]" />
            <select
              value={selectedInk}
              onChange={(e) => setSelectedInk(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-mh-slate-900 text-mh-slate-200">
                All Inks
              </option>
              {availableInks.map((ink) => (
                <option key={ink.id} value={ink.id} className="bg-mh-slate-900 text-mh-slate-200">
                  {ink.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Builds Count Summary ──────────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1 -mt-2">
          <span>
            Showing <strong className="text-white">{filteredBuilds.length}</strong> {filteredBuilds.length === 1 ? 'build' : 'builds'}
            {builds && filteredBuilds.length !== builds.length && ` (filtered from ${builds.length})`}
          </span>
          {(searchQuery || roleFilter !== 'all' || selectedWeaponType !== 'all' || selectedInk !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setSelectedWeaponType('all');
                setSelectedInk('all');
              }}
              className="text-[var(--theme-accent)] hover:underline text-[11px] font-bold"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Builds Grid / List View ───────────────────────────────── */}
      {isLoading ? (
        <div className={viewMode === 'panel' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4' : 'flex flex-col gap-1.5'}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`mho-panel animate-pulse ${
                viewMode === 'panel' ? 'h-36 p-3 flex flex-col gap-3' : 'h-11 px-3 py-1.5 flex items-center gap-2.5'
              }`}
            >
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 bg-mh-slate-800 rounded-md shrink-0" />
                <div className="w-6 h-6 bg-mh-slate-800 rounded shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-mh-slate-800 rounded w-1/3" />
                  <div className="h-2.5 bg-mh-slate-800 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredBuilds.length > 0 ? (
        viewMode === 'panel' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredBuilds.map((build) => (
              <ArmoryBuildCard
                key={build.id}
                build={build}
                monsterMap={monsterMap}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredBuilds.map((build) => (
              <ArmoryBuildRow
                key={build.id}
                build={build}
                monsterMap={monsterMap}
              />
            ))}
          </div>
        )
      ) : (
        <div className="mho-panel border-dashed p-12 text-center flex flex-col items-center justify-center gap-3">
          <Shield size={36} className="text-[var(--theme-accent)] opacity-40" />
          <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">No builds found</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm">
            {searchQuery || roleFilter !== 'all' || selectedWeaponType !== 'all' || selectedInk !== 'all'
              ? 'No community builds matched your current filters. Try relaxing your search criteria.'
              : 'No builds have been published yet. Be the first hunter to forge and publish a build!'}
          </p>
          {(searchQuery || roleFilter !== 'all' || selectedWeaponType !== 'all' || selectedInk !== 'all') ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setSelectedWeaponType('all');
                setSelectedInk('all');
              }}
              className="btn-mho-panel !px-3 !py-1.5 !text-xs mt-2"
            >
              Reset Filters
            </button>
          ) : (
            <Link
              to="/armory/planner"
              className="btn-mho-gold !px-4 !py-2 !text-xs mt-2"
            >
              Open Build Planner
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
