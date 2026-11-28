// ─────────────────────────────────────────────────────────────
// MonsterGuide — Field Guide view for Monsters & Study Progress
// Copies the layout and aesthetic of the Weapons page.
// Default view: List/Table view showing icons, name, Species, and weak to.
// Primary user workflow: Filter by Species to see what monsters are in that species.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Shield,
  Bookmark,
  ChevronDown,
  Check,
  Footprints,
  X,
} from 'lucide-react';
import {
  useAdminMonsters,
  type DBMonster,
} from '../../hooks/useAdminMonsters';
import {
  useUserMonsterStudy,
} from '../../hooks/useUserMonsterStudy';
import {
  useHunterChallenges,
} from '../../hooks/useHunterChallenges';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';
import PageTitlePanel from '../../components/layout/PageTitlePanel';
import MonsterModal from './MonsterModal';
import MonsterGridCard, { type MonsterCardJourney } from './MonsterGridCard';
import { JourneyBar, JourneyLines } from '../../components/monsters/JourneyOverlay';
import {
  buildJourneyPath,
  monsterStudyCount,
  stepUnlocking,
  stepsNeedingStudiesOf,
  type JourneyNode,
} from '../../hooks/useInvestigationJourney';
import ElementIcon from '../../components/ElementIcon';
import { cn } from '../../lib/utils';
import { useSearchParams } from 'react-router';

type ViewMode = 'table' | 'grid';
type SortOrder = 'name-asc' | 'tier-desc' | 'default';
type StudyFilter = 'all' | 'studied' | 'finished' | 'untracked';

const INTRO_HIDDEN_KEY = 'monsters-intro-hidden';

const SPECIES_CONFIG: Record<string, { label: string; icon?: string }> = {
  flying_wyvern:  { label: 'Flying Wyvern' },
  brute_wyvern:   { label: 'Brute Wyvern' },
  bird_wyvern:    { label: 'Bird Wyvern' },
  fanged_wyvern:  { label: 'Fanged Wyvern' },
  fanged_beast:   { label: 'Fanged Beast' },
  leviathan:      { label: 'Leviathan' },
  elder_dragon:   { label: 'Elder Dragon' },
  piscine_wyvern: { label: 'Piscine Wyvern' },
  carapaceon:     { label: 'Carapaceon' },
  temnoceran:     { label: 'Temnoceran' },
  neopteron:      { label: 'Neopteron' },
  herbivore:      { label: 'Herbivore' },
  lynian:         { label: 'Lynian' },
  wingdrake:      { label: 'Wingdrake' },
  relict:         { label: 'Relict' },
};

const TIER_CONFIG: Record<string, { label: string; cls: string; order: number }> = {
  small:  { label: 'Small',  cls: 'rarity-1', order: 1 },
  low:    { label: 'Low',    cls: 'rarity-2', order: 2 },
  high:   { label: 'High',   cls: 'rarity-4', order: 3 },
  elder:  { label: 'Elder',  cls: 'rarity-elder', order: 4 },
  collab: { label: 'Collab', cls: 'rarity-5', order: 5 },
};

const ELEMENT_COLOURS: Record<string, string> = {
  fire:      'bg-el-fire/15 text-el-fire border border-el-fire/30',
  water:     'bg-el-water/15 text-el-water border border-el-water/30',
  thunder:   'bg-el-thunder/15 text-el-thunder border border-el-thunder/30',
  ice:       'bg-el-ice/15 text-el-ice border border-el-ice/30',
  dragon:    'bg-el-dragon/15 text-el-dragon border border-el-dragon/30',
  poison:    'bg-el-poison/15 text-el-poison border border-el-poison/30',
  paralysis: 'bg-el-paralysis/15 text-el-paralysis border border-el-paralysis/30',
  sleep:     'bg-el-sleep/15 text-el-sleep border border-el-sleep/30',
  blast:     'bg-el-blast/15 text-el-blast border border-el-blast/30',
  stun:      'bg-amber-400/15 text-amber-300 border border-amber-400/30',
};

const ELEMENT_LABELS: Record<string, string> = {
  fire: 'Fire',
  water: 'Water',
  thunder: 'Thunder',
  ice: 'Ice',
  dragon: 'Dragon',
  poison: 'Poison',
  paralysis: 'Paralysis',
  sleep: 'Sleep',
  blast: 'Blast',
  stun: 'Stun',
};

const AVAILABLE_ELEMENTS = [
  'fire',
  'water',
  'thunder',
  'ice',
  'dragon',
  'poison',
  'paralysis',
  'sleep',
  'blast',
];

export default function MonsterGuide() {
  const { user, profile } = useAuthStore();
  const theme = useUIStore((s) => s.sectionThemes['/challenges'] ?? DEFAULT_SECTION_THEMES['/challenges']);

  const [introHidden, setIntroHidden] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(INTRO_HIDDEN_KEY) === '1';
  });

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };

  const [searchParams] = useSearchParams();
  const initialSpecies = searchParams.get('species') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [filterSpecies, setFilterSpecies] = useState<string>(initialSpecies);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterWeakness, setFilterWeakness] = useState<string>('all');
  const [filterStudy, setFilterStudy] = useState<StudyFilter>('all');
  // Default is Game Order
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  // Default is grid view of monster icons as requested
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Custom Dropdowns open state
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [weaknessOpen, setWeaknessOpen] = useState(false);
  const speciesRef = useRef<HTMLDivElement>(null);
  const weaknessRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (speciesRef.current && !speciesRef.current.contains(e.target as Node)) {
        setSpeciesOpen(false);
      }
      if (weaknessRef.current && !weaknessRef.current.contains(e.target as Node)) {
        setWeaknessOpen(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  // Selected Monster for Detail Modal
  // Selected Monster for Detail Modal
  const [selectedMonster, setSelectedMonster] = useState<DBMonster | null>(null);

  // Queries & Hooks
  const { data: monsters = [], isLoading } = useAdminMonsters({ isActive: true });

  // Auto-open monster detail modal if navigated with ?monster=... or ?id=...
  const initialMonsterParam = searchParams.get('monster') || searchParams.get('id');
  useEffect(() => {
    if (initialMonsterParam && monsters.length > 0) {
      const match = monsters.find(
        (m) =>
          m.id === initialMonsterParam ||
          m.name.toLowerCase() === initialMonsterParam.toLowerCase(),
      );
      if (match) {
        setSelectedMonster(match);
      }
    }
  }, [initialMonsterParam, monsters]);
  const {
    studyMap,
    isLoading: studyLoading,
    getMonsterStudy,
    toggleStandardTask,
    toggleCustomTask,
    setFreeHuntStudies,
    syncJourneyUnlocks,
    journey,
  } = useUserMonsterStudy();

  // ── Investigation Journey ──
  const showSpoilers = Boolean(profile?.show_spoilers);
  // /challenges/monsters?journey=1 (e.g. from the Investigation Journey guide) opens with it on
  const [journeyOn, setJourneyOn] = useState(() => searchParams.get('journey') === '1');
  const gridRef = useRef<HTMLDivElement>(null);

  // Studies already logged before the journey existed can unlock monsters too (once per visit)
  const journeySynced = useRef(false);
  useEffect(() => {
    if (journeySynced.current || studyLoading || journey.length === 0) return;
    journeySynced.current = true;
    syncJourneyUnlocks().catch((err) => console.warn('Investigation Journey sync failed', err));
  }, [studyLoading, journey, syncJourneyUnlocks]);

  const journeyPath = useMemo(() => buildJourneyPath(journey, (id) => studyMap[id]), [journey, studyMap]);
  /** Without spoilers only the monsters already unlocked are shown on the journey */
  const visibleJourney = useMemo<JourneyNode[]>(
    () => journeyPath.filter((n) => showSpoilers || n.state === 'unlocked' || n.state === 'current'),
    [journeyPath, showSpoilers],
  );
  const journeyStateById = useMemo(
    () => new Map(visibleJourney.map((n) => [n.monsterId, n.state])),
    [visibleJourney],
  );
  const monsterIcons = useMemo(() => new Map(monsters.map((m) => [m.id, m.icon])), [monsters]);

  /** e.g. "2/5 studies of Radiant Paolumu" for the next unlock */
  const nextNeed = useMemo(() => {
    const next = journeyPath.find((n) => n.state === 'next');
    const step = next?.step;
    if (!step?.studies_monster_id || !step.monster_studies) return null;
    const have = monsterStudyCount(studyMap[step.studies_monster_id]);
    return `${Math.min(have, step.monster_studies)}/${step.monster_studies} studies of ${step.studies_monster_name}`;
  }, [journeyPath, studyMap]);

  const journeyFor = (monsterId: string): MonsterCardJourney | undefined => {
    if (!journey.length) return undefined;
    const unlockStep = stepUnlocking(journey, monsterId);
    const studyNeeds = stepsNeedingStudiesOf(journey, monsterId);
    const state = journeyOn ? journeyStateById.get(monsterId) ?? null : null;
    if (!unlockStep && !studyNeeds.length && !journeyOn) return undefined;
    return {
      unlockStep,
      studyNeeds,
      studies: monsterStudyCount(studyMap[monsterId]),
      requiredStudies: unlockStep?.studies_monster_id ? monsterStudyCount(studyMap[unlockStep.studies_monster_id]) : 0,
      requiredIcon: unlockStep?.studies_monster_id ? monsterIcons.get(unlockStep.studies_monster_id) : null,
      state,
      dimmed: journeyOn && !state,
      spoilers: showSpoilers,
    };
  };

  const openMonsterById = (id: string) => {
    const m = monsters.find((x) => x.id === id);
    if (m) setSelectedMonster(m);
  };
  const { data: challenges = [] } = useHunterChallenges(user?.id);

  // Available Species list with monster count
  const speciesList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of monsters) {
      if (m.species) {
        counts.set(m.species, (counts.get(m.species) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        label: SPECIES_CONFIG[id]?.label || id.replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [monsters]);

  const selectedSpeciesObj = filterSpecies !== 'all' ? speciesList.find((s) => s.id === filterSpecies) : null;

  // Active monster challenges count
  const activeMonsterChallenges = useMemo(() => {
    return challenges.filter((c) => c.challenge_type === 'monster' && c.status !== 'abandoned');
  }, [challenges]);

  // Overall Statistics (only large monsters and elder dragons that have Study Progress)
  const stats = useMemo(() => {
    const studyableMonsters = monsters.filter((m) => m.tier !== 'small');
    const total = studyableMonsters.length;
    let finishedCount = 0;
    let studiedCount = 0;

    for (const m of studyableMonsters) {
      const study = studyMap[m.id];
      const isElder = m.tier === 'elder' || m.species === 'elder_dragon';
      if (study) {
        const isDone = isElder ? (study.unlocked || study.finished) : study.finished;
        if (isDone) finishedCount++;
        if (
          study.unlocked ||
          (!isElder &&
            (study.photo_taken ||
              study.witnessed_behavior ||
              study.hunted_10_plus ||
              study.miniature_crown ||
              study.giant_crown ||
              study.finished)) ||
          study.custom_tasks.some((t) => t.completed)
        ) {
          studiedCount++;
        }
      }
    }

    return {
      total,
      studiedCount,
      studiedPct: total > 0 ? Math.round((studiedCount / total) * 100) : 0,
      finishedCount,
      finishedPct: total > 0 ? Math.round((finishedCount / total) * 100) : 0,
      challengesTracked: activeMonsterChallenges.length,
    };
  }, [monsters, studyMap, activeMonsterChallenges]);

  // Filtered & Sorted Monsters
  const filteredMonsters = useMemo(() => {
    let list = [...monsters];

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => {
        const speciesLabel = (m.species && SPECIES_CONFIG[m.species]?.label) || m.species || '';
        return (
          m.name.toLowerCase().includes(q) ||
          (m.name_ja && m.name_ja.toLowerCase().includes(q)) ||
          speciesLabel.toLowerCase().includes(q) ||
          m.weaknesses.some((w) => w.toLowerCase().includes(q)) ||
          m.elements.some((e) => e.toLowerCase().includes(q))
        );
      });
    }

    // Species filter
    if (filterSpecies !== 'all') {
      list = list.filter((m) => m.species === filterSpecies);
    }

    // Tier filter
    if (filterTier !== 'all') {
      list = list.filter((m) => m.tier === filterTier);
    }

    // Weakness filter
    if (filterWeakness !== 'all') {
      list = list.filter((m) => m.weaknesses.includes(filterWeakness));
    }

    // Study filter (small monsters don't have study progress)
    if (filterStudy !== 'all') {
      list = list.filter((m) => {
        if (m.tier === 'small') return false;
        const s = studyMap[m.id];
        const isElder = m.tier === 'elder' || m.species === 'elder_dragon';
        const isDone = isElder ? Boolean(s?.unlocked || s?.finished) : Boolean(s?.finished);

        if (filterStudy === 'finished') return isDone;
        if (filterStudy === 'studied') {
          return Boolean(
            s &&
              (s.unlocked ||
                (!isElder &&
                  (s.photo_taken ||
                    s.witnessed_behavior ||
                    s.hunted_10_plus ||
                    s.miniature_crown ||
                    s.giant_crown ||
                    s.finished)) ||
                s.custom_tasks.some((t) => t.completed)),
          );
        }
        if (filterStudy === 'untracked') {
          return (
            !s ||
            (!s.unlocked &&
              (!isElder
                ? !s.photo_taken &&
                  !s.witnessed_behavior &&
                  !s.hunted_10_plus &&
                  !s.miniature_crown &&
                  !s.giant_crown &&
                  !s.finished
                : !s.finished) &&
              !s.custom_tasks.some((t) => t.completed))
          );
        }
        return true;
      });
    }

    // Sorting (Game Order as default)
    list.sort((a, b) => {
      if (sortOrder === 'default') {
        const orderA = a.sort_order ?? 9999;
        const orderB = b.sort_order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        const isSmallA = a.tier === 'small';
        const isSmallB = b.tier === 'small';
        if (isSmallA !== isSmallB) return isSmallA ? 1 : -1;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'name-asc') {
        const isSmallA = a.tier === 'small';
        const isSmallB = b.tier === 'small';
        if (isSmallA !== isSmallB) return isSmallA ? 1 : -1;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'tier-desc') {
        const orderA = TIER_CONFIG[a.tier]?.order || 0;
        const orderB = TIER_CONFIG[b.tier]?.order || 0;
        if (orderB !== orderA) return orderB - orderA;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [monsters, search, filterSpecies, filterTier, filterWeakness, filterStudy, sortOrder, studyMap]);

  const journeyHiddenByFilters = useMemo(() => {
    if (!journeyOn) return 0;
    const shown = new Set(filteredMonsters.map((m) => m.id));
    return visibleJourney.filter((n) => !shown.has(n.monsterId)).length;
  }, [journeyOn, filteredMonsters, visibleJourney]);

  const clearFilters = () => {
    setSearch('');
    setFilterSpecies('all');
    setFilterTier('all');
    setFilterWeakness('all');
    setFilterStudy('all');
  };

  const toggleJourney = () => {
    setJourneyOn((on) => !on);
    // The journey is drawn on the grid
    setViewMode('grid');
  };

  return (
    <div data-rarity-theme={theme} className="challenges-theme px-1 sm:px-4 lg:px-8 pb-6 pt-2 space-y-4 sm:space-y-6 max-w-7xl mx-auto text-white">
      {/* ── Page Title & Metrics Panel ── */}
      <PageTitlePanel
        icon="/img/ui/monster.png"
        title="Monster Field Guide"
        hidden={introHidden}
        onToggleHidden={toggleIntro}
        description={
          <>
            Browse every monster, their species classification, elements, and vulnerabilities.
            Filter by species to locate regional fauna and track your <span className="text-mh-gold-400 font-semibold">Study Progress</span> checklist
            (Unlocked, Photo Taken, Ecological Behavior, Hunted 10+, and Custom Goals). Any research task can be sent to your
            <span className="text-sky-300 font-semibold"> Hunter's Challenges</span> to monitor during hunts!
          </>
        }
      >
        {/* Study progress status metrics */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/30 rounded-xl p-1 border border-[var(--border-subtle)]">
          {/* Studied Metric */}
          <div className="px-2.5 py-0.5 text-center border-r border-[var(--border-subtle)]">
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-mh-gold-400">
              <Footprints size={10} />
              <span>Studied</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-sm font-black text-white">{stats.studiedCount}</span>
              <span className="text-[10px] text-mh-slate-500">/ {stats.total}</span>
              <span className="text-[9px] font-bold text-mh-gold-400 ml-0.5">
                ({stats.studiedPct}%)
              </span>
            </div>
          </div>

          {/* Finished Metric */}
          <div className="px-2.5 py-0.5 text-center border-r border-[var(--border-subtle)]">
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-emerald-400">
              <Bookmark size={10} />
              <span>Finished</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-sm font-black text-white">{stats.finishedCount}</span>
              <span className="text-[10px] text-mh-slate-500">/ {stats.total}</span>
              <span className="text-[9px] font-bold text-emerald-400 ml-0.5">
                ({stats.finishedPct}%)
              </span>
            </div>
          </div>

          {/* Challenges Tracked Metric */}
          <div className="px-2 py-0.5 text-center">
            <span className="block text-[9px] font-bold text-sky-400">In Challenges</span>
            <span className="font-display text-xs font-bold text-sky-300">{stats.challengesTracked}</span>
          </div>
        </div>
      </PageTitlePanel>

      {/* ── Toolbar: Search & Species-First Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-mh-gold-400" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-mh-slate-200">
              Monsters Roster
            </h3>
            <span className="rounded-full bg-mh-slate-800 border border-mh-slate-750 px-2 py-0.5 text-xs text-mh-slate-400 font-semibold">
              {filteredMonsters.length} of {monsters.length}
            </span>
          </div>

          {/* Investigation Journey toggle & spoilers status (wraps under the label when narrow) */}
          <JourneyBar
            active={journeyOn}
            onToggle={toggleJourney}
            spoilers={showSpoilers}
            signedIn={Boolean(user)}
            path={journeyPath}
            nextNeed={nextNeed}
            hiddenByFilters={journeyHiddenByFilters}
            onClearFilters={clearFilters}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search monsters, species, elements…"
              className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-7 text-xs text-mh-slate-200 placeholder-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* ── Primary Filter: Species Dropdown ── */}
          <div ref={speciesRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setSpeciesOpen((prev) => !prev);
                setWeaknessOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-200 transition-all hover:bg-mh-slate-750 focus:outline-none focus:border-mh-gold-500/50 shadow-sm',
                filterSpecies !== 'all' && 'border-mh-gold-500/50 bg-mh-slate-800/90 text-mh-gold-300 font-semibold',
              )}
            >
              <Footprints size={13} className="text-mh-gold-400 shrink-0" />
              <span>{selectedSpeciesObj ? selectedSpeciesObj.label : 'All Species'}</span>
              {selectedSpeciesObj && (
                <span className="rounded-full bg-mh-gold-500/20 px-1.5 py-0.2 text-[10px] text-mh-gold-300 font-bold">
                  {selectedSpeciesObj.count}
                </span>
              )}
              <ChevronDown
                size={13}
                className={cn('text-mh-slate-400 transition-transform duration-200 shrink-0', speciesOpen && 'rotate-180')}
              />
            </button>

            {speciesOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] rounded-2xl border border-mh-slate-700 bg-mh-slate-900/98 p-1.5 shadow-2xl backdrop-blur-md max-h-72 overflow-y-auto animate-fade-in divide-y divide-mh-slate-800/60">
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSpecies('all');
                      setSpeciesOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                      filterSpecies === 'all'
                        ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                        : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Footprints size={14} className="text-mh-gold-400" />
                      <span>All Species</span>
                    </div>
                    {filterSpecies === 'all' && <Check size={13} className="text-mh-gold-400" />}
                  </button>
                </div>

                <div className="pt-1 space-y-0.5">
                  {speciesList.map((sp) => {
                    const isSelected = filterSpecies === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          setFilterSpecies(sp.id);
                          setSpeciesOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                          isSelected
                            ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                            : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                        )}
                      >
                        <span className="truncate">{sp.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-mh-slate-500 font-semibold">{sp.count}</span>
                          {isSelected && <Check size={13} className="text-mh-gold-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Weakness Filter Dropdown ── */}
          <div ref={weaknessRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setWeaknessOpen((prev) => !prev);
                setSpeciesOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-200 transition-all hover:bg-mh-slate-750 focus:outline-none focus:border-mh-gold-500/50 shadow-sm',
                filterWeakness !== 'all' && 'border-mh-gold-500/50 bg-mh-slate-800/90 text-mh-gold-300 font-semibold',
              )}
            >
              {filterWeakness !== 'all' ? (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <ElementIcon element={filterWeakness} size={14} />
                </div>
              ) : (
                <Shield size={13} className="text-mh-slate-400 shrink-0" />
              )}
              <span>{filterWeakness !== 'all' ? `Weak to: ${ELEMENT_LABELS[filterWeakness] || filterWeakness}` : 'All Weaknesses'}</span>
              <ChevronDown
                size={13}
                className={cn('text-mh-slate-400 transition-transform duration-200 shrink-0', weaknessOpen && 'rotate-180')}
              />
            </button>

            {weaknessOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-2xl border border-mh-slate-700 bg-mh-slate-900/98 p-1.5 shadow-2xl backdrop-blur-md max-h-72 overflow-y-auto animate-fade-in divide-y divide-mh-slate-800/60">
                <div className="pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterWeakness('all');
                      setWeaknessOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                      filterWeakness === 'all'
                        ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                        : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-mh-slate-400" />
                      <span>All Weaknesses</span>
                    </div>
                    {filterWeakness === 'all' && <Check size={13} className="text-mh-gold-400" />}
                  </button>
                </div>

                <div className="pt-1 space-y-0.5">
                  {AVAILABLE_ELEMENTS.map((el) => {
                    const isSelected = filterWeakness === el;
                    return (
                      <button
                        key={el}
                        type="button"
                        onClick={() => {
                          setFilterWeakness(el);
                          setWeaknessOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                          isSelected
                            ? 'bg-mh-gold-500/15 text-mh-gold-300 font-bold'
                            : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <ElementIcon element={el} size={15} />
                          <span>{ELEMENT_LABELS[el] ?? el}</span>
                        </div>
                        {isSelected && <Check size={13} className="text-mh-gold-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tier Filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Threat Ranks</option>
            <option value="small">Small Monsters</option>
            <option value="low">Low Rank</option>
            <option value="high">High Rank</option>
            <option value="elder">Elder Dragons</option>
            <option value="collab">Collab / Event</option>
          </select>

          {/* Study Progress Filter */}
          <select
            value={filterStudy}
            onChange={(e) => setFilterStudy(e.target.value as StudyFilter)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Study States</option>
            <option value="studied">Studied (Any Progress)</option>
            <option value="finished">Finished / Mastered</option>
            <option value="untracked">Not Yet Studied</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="default">Game Order (Default)</option>
            <option value="name-asc">Large First, Then Small (A to Z)</option>
            <option value="tier-desc">Threat: High to Low</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid View (Default)"
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
              title="List / Table View"
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

      {/* ── Main Content: List View (Default) or Grid View ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" />
        </div>
      ) : filteredMonsters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-12 text-center">
          <Footprints size={36} className="text-mh-slate-600 mb-2" />
          <p className="text-xs font-semibold text-mh-slate-400">
            No monsters match your active search and filter criteria.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── List / Table View (Default) ── */
        <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-mh-slate-750 bg-mh-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs text-mh-slate-300">
            <thead className="border-b border-mh-slate-750 bg-mh-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
              <tr>
                {/* 1. Monster (Icon + Name) */}
                <th className="py-2.5 sm:py-3.5 pl-3 sm:pl-5 pr-2 sm:pr-3">Monster</th>
                {/* 2. Species */}
                <th className="px-2 sm:px-3 py-2.5 sm:py-3.5">Species</th>
                {/* 3. Weak To */}
                <th className="px-2 sm:px-3 py-2.5 sm:py-3.5">Weak to</th>
                {/* 4. Elements */}
                <th className="hidden md:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5">Element</th>
                {/* 5. Study Progress */}
                <th className="px-2 sm:px-3 py-2.5 sm:py-3.5 text-center">Study Progress</th>
                {/* 6. Action */}
                <th className="py-2.5 sm:py-3.5 pl-2 sm:pl-3 pr-3 sm:pr-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mh-slate-800/80">
              {filteredMonsters.map((monster) => {
                const tierCfg = TIER_CONFIG[monster.tier] ?? { label: monster.tier, cls: 'rarity-1' };
                const speciesLabel = (monster.species && SPECIES_CONFIG[monster.species]?.label) || monster.species || '—';
                const study = getMonsterStudy(monster.id);

                const isSmall = monster.tier === 'small';
                const isElder = monster.tier === 'elder' || monster.species === 'elder_dragon';
                const isFinished = isElder ? (study.unlocked || study.finished) : study.finished;

                let completedCount = 0;
                if (isElder) {
                  if (study.unlocked) completedCount++;
                } else if (!isSmall) {
                  if (study.unlocked) completedCount++;
                  if (study.photo_taken) completedCount++;
                  if (study.witnessed_behavior) completedCount++;
                  if (study.hunted_10_plus) completedCount++;
                  if (study.miniature_crown) completedCount++;
                  if (study.giant_crown) completedCount++;
                  if (study.finished) completedCount++;
                }
                study.custom_tasks.forEach((t) => {
                  if (t.completed) completedCount++;
                });
                const totalTasks = isSmall
                  ? 0
                  : isElder
                  ? 1 + study.custom_tasks.length
                  : 7 + study.custom_tasks.length;

                return (
                  <tr
                    key={monster.id}
                    onClick={() => setSelectedMonster(monster)}
                    className="hover:bg-mh-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Monster Thumbnail + Name */}
                    <td className="py-2.5 sm:py-3.5 pl-3 sm:pl-5 pr-2 sm:pr-3">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="relative flex h-18 w-18 sm:h-22 sm:w-22 shrink-0 items-center justify-center">
                          {monster.icon ? (
                            <img
                              src={monster.icon}
                              alt={monster.name}
                              className="h-full w-full object-contain filter drop-shadow transition-transform duration-200 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Footprints size={36} className="text-mh-slate-500" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`rarity-badge ${tierCfg.cls}`}>{tierCfg.label}</span>
                            {monster.is_variant && (
                              <span className="rounded bg-purple-500/20 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-purple-300">
                                Variant
                              </span>
                            )}
                            {monster.is_radiant && (
                              <span className="rounded bg-amber-500/20 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-amber-400">
                                Radiant
                              </span>
                            )}
                          </div>
                          <p className="font-display font-bold text-xs sm:text-sm text-mh-slate-100 group-hover:text-mh-gold-300 transition-colors truncate">
                            {monster.name}
                          </p>
                          {monster.name_ja && (
                            <p className="text-[10px] text-mh-slate-500 truncate leading-none mt-0.5">
                              {monster.name_ja}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Species */}
                    <td className="px-2 sm:px-3 py-2.5 sm:py-3.5">
                      <span className="inline-block rounded-md border border-mh-slate-750 bg-mh-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-mh-slate-300">
                        {speciesLabel}
                      </span>
                    </td>

                    {/* Weak To */}
                    <td className="px-2 sm:px-3 py-2.5 sm:py-3.5">
                      {monster.weaknesses && monster.weaknesses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {monster.weaknesses.map((el) => (
                            <span
                              key={el}
                              className={cn(
                                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none',
                                ELEMENT_COLOURS[el] ?? 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700',
                              )}
                            >
                              <ElementIcon element={el} size={11} />
                              <span>{ELEMENT_LABELS[el] ?? el}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-mh-slate-600">—</span>
                      )}
                    </td>

                    {/* Elements */}
                    <td className="hidden md:table-cell px-2 sm:px-3 py-2.5 sm:py-3.5">
                      {monster.elements && monster.elements.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {monster.elements.map((el) => (
                            <span
                              key={el}
                              className={cn(
                                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none',
                                ELEMENT_COLOURS[el] ?? 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700',
                              )}
                            >
                              <ElementIcon element={el} size={11} />
                              <span>{ELEMENT_LABELS[el] ?? el}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-mh-slate-600">Physical</span>
                      )}
                    </td>

                    {/* Study Progress Indicator */}
                    <td className="px-2 sm:px-3 py-2.5 sm:py-3.5 text-center">
                      {isSmall ? (
                        <span className="text-[11px] text-mh-slate-600 font-semibold">—</span>
                      ) : isFinished ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          <img src="/img/ui/my_challenges_selected.png" alt="" className="w-3.5 h-3.5 object-contain" />
                          <span>Finished</span>
                        </span>
                      ) : completedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mh-gold-500/15 border border-mh-gold-500/30 px-2.5 py-0.5 text-[10px] font-bold text-mh-gold-300">
                          <span>{completedCount}/{totalTasks}</span>
                          <span className="text-mh-slate-500">done</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-mh-slate-600 italic">Not started</span>
                      )}
                    </td>

                    {/* Action / Inspect */}
                    <td className="py-2.5 sm:py-3.5 pl-2 sm:pl-3 pr-3 sm:pr-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMonster(monster);
                        }}
                        className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1 text-[11px] font-semibold text-mh-slate-300 hover:border-mh-gold-500/50 hover:bg-mh-slate-750 hover:text-mh-gold-300 transition-colors shadow-sm"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Grid View (Default) ── */
        <div ref={gridRef} className="relative">
          {journeyOn && <JourneyLines containerRef={gridRef} nodes={visibleJourney} watch={filteredMonsters} />}
          <div className="grid grid-cols-3 min-[380px]:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-1 sm:gap-1.5">
            {filteredMonsters.map((monster) => {
              const study = getMonsterStudy(monster.id);

              return (
                <MonsterGridCard
                  key={monster.id}
                  monster={monster}
                  study={study}
                  onSelect={() => setSelectedMonster(monster)}
                  onToggleStandardTask={toggleStandardTask}
                  onToggleCustomTask={toggleCustomTask}
                  journey={journeyFor(monster.id)}
                  onSetFreeHunt={setFreeHuntStudies}
                  onOpenMonster={openMonsterById}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <MonsterModal
        monster={selectedMonster}
        open={Boolean(selectedMonster)}
        onClose={() => setSelectedMonster(null)}
        onOpenMonster={openMonsterById}
        monsterIcons={monsterIcons}
      />
    </div>
  );
}
