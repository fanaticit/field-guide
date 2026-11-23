import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Layers,
  Loader2,
  Plus,
  Bookmark,
  ChevronDown,
  ArrowLeft,
  Target,
  RotateCcw,
  X,
} from 'lucide-react';
import { useVisageSetsData } from '../../hooks/useVisageSets';
import { type DBVisage, type VisageRarity, getInkConfig } from '../../data/schemas/visage';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import {
  useHunterChallenges,
  useAddVisageChallenge,
  getVisageChallenge,
  VISAGE_RARITY_INDEX,
} from '../../hooks/useHunterChallenges';
import VisageCard, { InkIconComponent } from './VisageCard';
import VisageModal from './VisageModal';
import LoginModal from '../../components/auth/LoginModal';
import GuestSaveNotice from '../../components/auth/GuestSaveNotice';
import { useVisageBuilderStore } from '../../store/visageBuilderStore';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';

// Shared pill styles that mirror the home page's gold button / panel look
const ACTIVE_PILL =
  'bg-gradient-to-b from-[#EAD17A] to-[#C9A042] text-[#1A1408] font-bold shadow-[0_0_10px_var(--accent-gold-glow)]';
const INACTIVE_PILL = 'text-[var(--text-secondary)] hover:text-white';
const FIELD_INPUT =
  'w-full border border-[var(--border-subtle)] bg-black/30 text-xs text-white placeholder-[var(--text-secondary)] outline-none focus:border-[#FFD700]/70';

export default function VisageSetsGuide() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const build = searchParams.get('build');

  const theme = useUIStore((s) => s.sectionThemes['/gallery'] ?? DEFAULT_SECTION_THEMES['/gallery']);
  const { user, profile } = useAuthStore();
  const {
    sets,
    dbVisages = [],
    isLoading,
    collectionMap,
    getCardCollection,
    setCardRarity,
    setCardQuantity,
    removeCardFromCollection,
  } = useVisageSetsData({ showSpoilers: Boolean(profile?.show_spoilers) });
  const isAdmin = useAuthStore(selectIsAdmin);
  const navigate = useNavigate();
  const builder = useVisageBuilderStore();

  const [viewMode, setViewMode] = useState<'set' | 'monster'>('monster'); // By Monster is the default view
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [monsterSearchQuery, setMonsterSearchQuery] = useState('');
  const [monsterRarityFilter, setMonsterRarityFilter] = useState<'all' | 'fine' | 'rare' | 'epic' | 'superior'>('all');
  const [inspectedCard, setInspectedCard] = useState<DBVisage | null>(null);
  const [inspectedInk, setInspectedInk] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [showCollectedModal, setShowCollectedModal] = useState(false);
  const collectedMenuRef = useRef<HTMLDivElement>(null);

  // Close collection breakdown modal on outside click / tap
  useEffect(() => {
    if (!showCollectedModal) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (collectedMenuRef.current && !collectedMenuRef.current.contains(e.target as Node)) {
        setShowCollectedModal(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
    };
  }, [showCollectedModal]);

  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const addVisageChallenge = useAddVisageChallenge();

  const handleAddVisageChallenge = async (
    card: DBVisage,
    inkType: string,
    currentRarity?: VisageRarity | null,
  ) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }

    const rarityIdx = currentRarity ? VISAGE_RARITY_INDEX[currentRarity] ?? 0 : 0;
    try {
      await addVisageChallenge.mutateAsync({
        userId: user.id,
        game: 'mho',
        visageId: card.id,
        visageName: card.name,
        inkType: (inkType || 'flames').toLowerCase(),
        monsterId: card.monster_id ?? null,
        monsterName: card.name,
        pieceImage: card.monster_icon ?? null,
        setIcon: card.monster_icon ?? null,
        currentRarity: rarityIdx,
        craftRarity: 1, // Fine
        maxRarity: 4, // Superior
      });
    } catch (err) {
      console.error('Failed to add visage challenge', err);
    }
  };

  // Helper to test if a card matches the search query (card name or core effect)
  const cardMatchesSearch = (c: DBVisage, q: string) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.core_effect && c.core_effect.toLowerCase().includes(q)) return true;
    return false;
  };

  // Filter and sort sets
  const filteredSets = useMemo(() => {
    return sets.filter((s) => {
      if (filterMode === 'complete' && s.collectedCards < s.totalCards) return false;
      if (filterMode === 'incomplete' && s.collectedCards === s.totalCards) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesShort = (s.shortName || '').toLowerCase().includes(q);
        const matchesCard = s.cards.some((c) => cardMatchesSearch(c, q));
        if (!matchesName && !matchesShort && !matchesCard) return false;
      }
      return true;
    });
  }, [sets, filterMode, searchQuery]);

  // Keep selection synced when search/filters change
  useEffect(() => {
    if (filteredSets.length > 0) {
      const exists = filteredSets.some((s) => s.id === selectedSetId);
      if (!exists) {
        setSelectedSetId(filteredSets[0].id);
      }
    }
  }, [filteredSets, selectedSetId]);

  const activeSet = useMemo(() => {
    return sets.find((s) => s.id === selectedSetId) || filteredSets[0] || sets[0] || null;
  }, [sets, filteredSets, selectedSetId]);

  const activeInkCfg = activeSet ? getInkConfig(activeSet.id) : getInkConfig('flames');

  // Columns for the active set, optionally filtered by search query
  const displayedColumns = useMemo(() => {
    if (!activeSet) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeSet.groupedColumns;

    const hasCardMatches = activeSet.cards.some((c) => cardMatchesSearch(c, q));
    if (!hasCardMatches) return activeSet.groupedColumns;

    return activeSet.groupedColumns
      .map((col) => {
        const matchingCards = col.cards.filter((c) => cardMatchesSearch(c, q));
        return {
          ...col,
          cards: matchingCards,
          totalCount: matchingCards.length,
          collectedCount: matchingCards.filter((c) =>
            getCardCollection(c.id, activeSet.id),
          ).length,
        };
      })
      .filter((col) => col.cards.length > 0);
  }, [activeSet, searchQuery, getCardCollection]);

  // ── Monster Progression View Data & Rarity Logic ──
  const allMonsterVisages = useMemo(() => {
    const active = dbVisages.filter((v) => v.is_active);
    const large = active
      .filter((v) => v.monster_type === 'large')
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.name.localeCompare(b.name));
    const small = active
      .filter((v) => v.monster_type === 'small')
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      large,
      small,
      combined: [...large, ...small],
    };
  }, [dbVisages]);

  const RARITY_RANK: Record<string, number> = useMemo(() => ({
    fine: 1,
    rare: 2,
    epic: 3,
    superior: 4,
  }), []);

  // Helper to test if a monster matches the target rarity filter.
  // Rule: If target level is e.g. Epic (3), remove all monsters that have at least one card at Epic or higher (>= 3).
  // Kept: monsters where none of their cards have reached that rarity yet (all cards < targetRank).
  const monsterNeedsRarity = useCallback(
    (m: DBVisage, targetRarity: 'all' | 'fine' | 'rare' | 'epic' | 'superior'): boolean => {
      if (targetRarity === 'all') return true;
      const targetRank = RARITY_RANK[targetRarity] || 1;

      const ink1 = m.ink_types[0] ? (m.ink_types[0] === 'fire' ? 'flames' : m.ink_types[0]) : 'flames';
      const ink2 = m.ink_types[1] ? (m.ink_types[1] === 'fire' ? 'flames' : m.ink_types[1]) : null;

      const e1 = getCardCollection(m.id, ink1);
      const lvl1 = e1?.rarity ? RARITY_RANK[e1.rarity] || 0 : 0;
      if (lvl1 >= targetRank) return false;

      if (ink2) {
        const e2 = getCardCollection(m.id, ink2);
        const lvl2 = e2?.rarity ? RARITY_RANK[e2.rarity] || 0 : 0;
        if (lvl2 >= targetRank) return false;
      }

      return true;
    },
    [RARITY_RANK, getCardCollection],
  );

  const rarityFilterCounts = useMemo(() => {
    let fine = 0;
    let rare = 0;
    let epic = 0;
    let superior = 0;

    for (const m of allMonsterVisages.combined) {
      if (monsterNeedsRarity(m, 'fine')) fine++;
      if (monsterNeedsRarity(m, 'rare')) rare++;
      if (monsterNeedsRarity(m, 'epic')) epic++;
      if (monsterNeedsRarity(m, 'superior')) superior++;
    }

    return {
      all: allMonsterVisages.combined.length,
      fine,
      rare,
      epic,
      superior,
    };
  }, [allMonsterVisages.combined, monsterNeedsRarity]);

  const monsterStats = useMemo(() => {
    let totalSlots = 0;
    let unlockedSlots = 0;

    for (const m of allMonsterVisages.combined) {
      const ink1 = m.ink_types[0] ? (m.ink_types[0] === 'fire' ? 'flames' : m.ink_types[0]) : 'flames';
      const ink2 = m.ink_types[1] ? (m.ink_types[1] === 'fire' ? 'flames' : m.ink_types[1]) : null;

      totalSlots++;
      const e1 = getCardCollection(m.id, ink1);
      if (e1) unlockedSlots++;

      if (ink2) {
        totalSlots++;
        const e2 = getCardCollection(m.id, ink2);
        if (e2) unlockedSlots++;
      }
    }

    return { totalSlots, unlockedSlots };
  }, [allMonsterVisages.combined, getCardCollection]);

  const filterMonsterList = useCallback(
    (list: DBVisage[]) => {
      return list.filter((m) => {
        if (monsterSearchQuery.trim()) {
          const q = monsterSearchQuery.toLowerCase().trim();
          const ink1 = m.ink_types[0] ? (m.ink_types[0] === 'fire' ? 'flames' : m.ink_types[0]) : 'flames';
          const ink2 = m.ink_types[1] ? (m.ink_types[1] === 'fire' ? 'flames' : m.ink_types[1]) : null;

          const matchesName = m.name.toLowerCase().includes(q);
          const matchesEffect = (m.core_effect || '').toLowerCase().includes(q);
          const matchesInk1 = ink1.toLowerCase().includes(q);
          const matchesInk2 = ink2 ? ink2.toLowerCase().includes(q) : false;
          if (!matchesName && !matchesEffect && !matchesInk1 && !matchesInk2) return false;
        }

        return monsterNeedsRarity(m, monsterRarityFilter);
      });
    },
    [monsterSearchQuery, monsterRarityFilter, monsterNeedsRarity],
  );

  const filteredLargeMonsters = useMemo(
    () => filterMonsterList(allMonsterVisages.large),
    [allMonsterVisages.large, filterMonsterList],
  );

  const filteredSmallMonsters = useMemo(
    () => filterMonsterList(allMonsterVisages.small),
    [allMonsterVisages.small, filterMonsterList],
  );

  const handleOpenInspect = (card: DBVisage, ink?: string) => {
    setInspectedCard(card);
    setInspectedInk(ink || activeSet?.id || (card.ink_types[0] === 'fire' ? 'flames' : card.ink_types[0]) || 'flames');
  };

  // Collection statistics across all available card slots in all sets
  const collectionStats = useMemo(() => {
    let totalSlots = 0;
    let ssrCount = 0; // superior (Gold / SSR)
    let srCount = 0;  // epic (Purple / SR)
    let rCount = 0;   // rare (Blue / R)
    let fineCount = 0; // fine (Green)

    for (const set of sets) {
      for (const card of set.cards) {
        totalSlots++;
        const entry = getCardCollection(card.id, set.id);
        if (entry) {
          if (entry.rarity === 'superior') {
            ssrCount++;
          } else if (entry.rarity === 'epic') {
            srCount++;
          } else if (entry.rarity === 'rare') {
            rCount++;
          } else if (entry.rarity === 'fine') {
            fineCount++;
          }
        }
      }
    }

    const totalCollected = ssrCount + srCount + rCount + fineCount;
    const progressPct = totalSlots > 0 ? Math.round((totalCollected / totalSlots) * 100) : 0;
    const ssrPct = totalSlots > 0 ? Math.round((ssrCount / totalSlots) * 100) : 0;
    const srPct = totalSlots > 0 ? Math.round((srCount / totalSlots) * 100) : 0;
    const rPct = totalSlots > 0 ? Math.round((rCount / totalSlots) * 100) : 0;

    return {
      totalSlots,
      totalCollected,
      progressPct,
      ssrCount,
      ssrPct,
      srCount,
      srPct,
      rCount,
      rPct,
      fineCount,
    };
  }, [sets, getCardCollection]);

  // If a user navigates to ?mode=builder, redirect to the new dedicated builder page
  if (mode === 'builder') {
    return <Navigate to={build ? `/gallery/set?build=${build}` : '/gallery/set'} replace />;
  }

  return (
    <div data-rarity-theme={theme} className="section-theme flex flex-col flex-1 min-h-0 h-full gap-3 p-2 sm:p-3 text-white overflow-hidden">
      {/* ── Top Bar: Back to Gallery (Left), Centered Title (Center), Controls (Right) ── */}
      <div className="relative z-20 shrink-0">
        <div className="mho-panel mho-card-rarity flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 shadow-xl">
          {/* Left: Back to Gallery */}
          <div className="order-1 flex items-center shrink-0">
            <Link
              to="/gallery"
              className="btn-mho-panel group !px-2.5 sm:!px-3 !py-1.5 !text-xs shrink-0"
              title="Back to Gallery"
            >
              <ArrowLeft size={14} className="text-[var(--text-secondary)] group-hover:text-white transition-colors" />
              <span className="hidden sm:inline">Back to Gallery</span>
              <span className="sm:hidden">Gallery</span>
            </Link>
          </div>

          {/* Center: Visage Collection Title with Icon */}
          <div className="order-2 flex-1 flex items-center justify-center min-w-0">
            <h1 className="inline-flex items-center gap-2 font-display text-sm sm:text-base md:text-lg font-bold tracking-wide text-white uppercase whitespace-nowrap">
              <img
                src="/img/ui/Visage%20Icon.png"
                alt=""
                draggable={false}
                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 object-contain"
              />
              <span>Visage Collection</span>
            </h1>
          </div>

          {/* Right: Collected Info & New Visage Build button */}
          <div className="order-3 flex items-center gap-2 sm:gap-3 justify-end shrink-0 ml-auto sm:ml-0">
            {isLoading && <Loader2 size={14} className="animate-spin text-[var(--theme-accent)] shrink-0" />}

            {/* Collected Info */}
            <div className="relative shrink-0">
              {/* Desktop breakdown (md+) */}
              <div className="hidden md:flex flex-wrap items-center gap-2 bg-black/30 rounded-xl p-1.5 sm:p-2 border border-[var(--border-subtle)]">
                {/* Total Collected */}
                <div className="px-2.5 py-0.5 text-center border-r border-[var(--border-subtle)]">
                  <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-[#FFD700]">
                    <Bookmark size={10} />
                    <span>Collected</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-display text-sm sm:text-base font-black text-white">{collectionStats.totalCollected}</span>
                    <span className="text-[10px] text-mh-slate-500">/ {collectionStats.totalSlots}</span>
                    <span className="text-[9px] font-bold text-emerald-400 ml-0.5">({collectionStats.progressPct}%)</span>
                  </div>
                </div>

                {/* SSR (Gold) */}
                <div className="px-2 py-0.5 text-center">
                  <span className="block text-[9px] font-bold text-amber-400">SSR (Gold)</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-display text-xs sm:text-sm font-bold text-amber-300">{collectionStats.ssrCount}</span>
                    <span className="text-[9px] text-amber-400/80 font-bold">({collectionStats.ssrPct}%)</span>
                  </div>
                </div>

                {/* SR (Purple) */}
                <div className="px-2 py-0.5 text-center">
                  <span className="block text-[9px] font-bold text-purple-400">SR (Purple)</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-display text-xs sm:text-sm font-bold text-purple-300">{collectionStats.srCount}</span>
                    <span className="text-[9px] text-purple-400/80 font-bold">({collectionStats.srPct}%)</span>
                  </div>
                </div>

                {/* Rare (Blue) */}
                <div className="px-2 py-0.5 text-center">
                  <span className="block text-[9px] font-bold text-sky-400">Rare (Blue)</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-display text-xs sm:text-sm font-bold text-sky-300">{collectionStats.rCount}</span>
                    <span className="text-[9px] text-sky-400/80 font-bold">({collectionStats.rPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Mobile compact badge (< md) */}
              <div className="md:hidden relative" ref={collectedMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowCollectedModal((prev) => !prev)}
                  className="flex items-center gap-1.5 bg-black/30 hover:bg-black/50 border border-[var(--border-subtle)] hover:border-[#FFD700] rounded-lg px-2.5 py-1 text-xs transition-all shadow-sm active:scale-95"
                  title="Click to view full collection breakdown"
                >
                  <Bookmark size={12} className="text-mh-gold-400" />
                  <span className="font-display font-bold text-emerald-400 text-xs">{collectionStats.progressPct}%</span>
                  <span className="text-[10px] text-mh-slate-400 font-mono">({collectionStats.totalCollected}/{collectionStats.totalSlots})</span>
                  <ChevronDown size={11} className={cn("text-mh-slate-400 transition-transform duration-150", showCollectedModal && "rotate-180")} />
                </button>

                {showCollectedModal && (
                  <div
                    className="mho-panel-deep absolute right-0 top-full mt-1.5 z-50 w-60 max-w-[calc(100vw-24px)] border-[var(--border-active)] p-2.5 shadow-2xl animate-in zoom-in-95 duration-100"
                    style={{
                      boxShadow: '0 10px 25px rgba(0,0,0,0.8), 0 0 15px var(--accent-gold-glow)',
                    }}
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--border-subtle)]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFD700] flex items-center gap-1">
                        <Bookmark size={11} />
                        <span>Collection Status</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {collectionStats.progressPct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-white/10">
                      <span className="text-mh-slate-300 font-medium text-[11px]">Total Collected</span>
                      <span className="font-mono font-bold text-white text-xs">
                        {collectionStats.totalCollected} / {collectionStats.totalSlots}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-amber-400 font-bold text-[11px]">SSR (Gold)</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-amber-300 text-xs">{collectionStats.ssrCount}</span>
                        <span className="text-[10px] text-amber-400/80 font-mono">({collectionStats.ssrPct}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-purple-400 font-bold text-[11px]">SR (Purple)</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-purple-300 text-xs">{collectionStats.srCount}</span>
                        <span className="text-[10px] text-purple-400/80 font-mono">({collectionStats.srPct}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-sky-400 font-bold text-[11px]">Rare (Blue)</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-sky-300 text-xs">{collectionStats.rCount}</span>
                        <span className="text-[10px] text-sky-400/80 font-mono">({collectionStats.rPct}%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* "New Visage Build" button (desktop) */}
            <div className="hidden sm:block shrink-0">
              <button
                type="button"
                onClick={() => {
                  builder.reset();
                  navigate('/gallery/set');
                }}
                className="btn-mho-gold shrink-0 !px-3 !py-1.5 !text-xs flex items-center gap-1.5 font-bold"
              >
                <Plus size={15} />
                <span>New Visage Build</span>
              </button>
            </div>
          </div>

          {/* Row 2 (Mobile only): "New Visage Build" button centered */}
          <div className="order-4 sm:hidden w-full flex justify-center pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                builder.reset();
                navigate('/gallery/set');
              }}
              className="btn-mho-gold w-full !py-1.5 !text-xs flex items-center justify-center gap-1.5 font-bold"
            >
              <Plus size={15} />
              <span>New Visage Build</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Book Container ── */}
      <div className="@container flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 flex-col @[1250px]:flex-row gap-3 overflow-hidden">
          {/* ── Compact Sets Strip on top (narrow containers, hidden in By Monster view) ── */}
          {viewMode === 'set' && (
            <div className="mho-panel-deep @[1250px]:hidden shrink-0 flex flex-col min-h-0">
              {/* Compact search & filter row */}
              <div className="p-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sets or monsters…"
                    className={cn(FIELD_INPUT, 'rounded-md py-1 pl-7 pr-7')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white transition-colors p-0.5"
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              {/* Filter pills */}
              <div className="flex rounded-md border border-[var(--border-subtle)] bg-black/30 p-0.5 text-[10px] shrink-0">
                {(['all', 'complete', 'incomplete'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMode(m)}
                    className={cn(
                      'px-2 py-0.5 rounded capitalize font-medium transition-colors',
                      filterMode === m ? ACTIVE_PILL : INACTIVE_PILL,
                    )}
                  >
                    {m === 'all' ? `All (${sets.length})` : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontally scrollable sets chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-2 scrollbar-none">
              {filteredSets.map((s) => {
                const cfg = getInkConfig(s.id);
                const isSelected = activeSet?.id === s.id;
                const isComplete = s.collectedCards === s.totalCards && s.totalCards > 0;

                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSetId(s.id);
                      setViewMode('set');
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-2.5 py-1.5 shrink-0 transition-all text-left border select-none',
                      isSelected
                        ? 'bg-[var(--bg-superior)] border-[var(--border-active)] shadow-[0_0_12px_var(--accent-gold-glow)] text-white'
                        : 'bg-white/5 border-[var(--border-subtle)] hover:border-[#FFD700]/50 text-mh-slate-300',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs',
                        cfg.bg,
                        cfg.border,
                        cfg.text,
                      )}
                    >
                      <InkIconComponent iconName={s.iconName || cfg.iconName} size={12} />
                    </div>

                    <span className={cn('text-xs font-bold whitespace-nowrap', isSelected ? 'text-[#FFD700]' : 'text-mh-slate-200')}>
                      {s.shortName || s.name}
                    </span>

                    <span
                      className={cn(
                        'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded',
                        isComplete
                          ? 'text-green-400 bg-green-500/15 border border-green-500/30'
                          : s.collectedCards > 0
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-mh-slate-500',
                      )}
                    >
                      {s.collectedCards}/{s.totalCards}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* ── Left Sidebar: Sets List (wide containers, hidden in By Monster view) ── */}
          {viewMode === 'set' && (
            <div className="mho-panel-deep hidden @[1250px]:flex w-72 @[1500px]:w-80 shrink-0 flex-col min-h-0 overflow-hidden">
              {/* Search & Filter Bar */}
              <div className="p-3 border-b border-[var(--border-subtle)] space-y-2 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sets or monsters…"
                    className={cn(FIELD_INPUT, 'rounded-lg py-1.5 pl-8 pr-7')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white transition-colors p-0.5"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

              {/* Filter mode */}
              <div className="grid grid-cols-3 rounded-lg border border-[var(--border-subtle)] bg-black/30 p-0.5 text-xs">
                <button
                  onClick={() => setFilterMode('all')}
                  className={cn(
                    'rounded-md py-1 font-medium transition-colors text-center text-[11px]',
                    filterMode === 'all' ? ACTIVE_PILL : INACTIVE_PILL,
                  )}
                >
                  All ({sets.length})
                </button>
                <button
                  onClick={() => setFilterMode('complete')}
                  className={cn(
                    'rounded-md py-1 font-medium transition-colors text-center text-[11px]',
                    filterMode === 'complete' ? ACTIVE_PILL : INACTIVE_PILL,
                  )}
                >
                  Complete
                </button>
                <button
                  onClick={() => setFilterMode('incomplete')}
                  className={cn(
                    'rounded-md py-1 font-medium transition-colors text-center text-[11px]',
                    filterMode === 'incomplete' ? ACTIVE_PILL : INACTIVE_PILL,
                  )}
                >
                  Incomplete
                </button>
              </div>
            </div>

            {/* Sets List Items */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
              {filteredSets.length === 0 ? (
                <div className="p-6 text-center text-xs text-mh-slate-500">
                  No ink sets match your search criteria.
                </div>
              ) : (
                filteredSets.map((s) => {
                  const cfg = getInkConfig(s.id);
                  const isSelected = activeSet?.id === s.id;
                  const isComplete = s.collectedCards === s.totalCards && s.totalCards > 0;

                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSetId(s.id);
                        setViewMode('set');
                      }}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all text-left group border',
                        isSelected
                          ? 'bg-[var(--bg-superior)] border-[var(--border-active)] shadow-[0_0_12px_var(--accent-gold-glow)]'
                          : 'bg-white/5 border-[var(--border-subtle)] hover:border-[#FFD700]/50 hover:bg-white/10 text-mh-slate-300',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg border text-sm shadow-sm transition-transform group-hover:scale-105',
                            cfg.bg,
                            cfg.border,
                            cfg.text,
                          )}
                        >
                          <InkIconComponent iconName={s.iconName || cfg.iconName} size={16} />
                        </div>
                        <div>
                          <span
                            className={cn(
                              'font-display text-sm font-bold tracking-wide transition-colors block',
                              isSelected ? 'text-white' : 'text-mh-slate-200 group-hover:text-white',
                            )}
                          >
                            {s.shortName || s.name}
                          </span>
                          <span className="text-[10px] text-mh-slate-400 block -mt-0.5">
                            {s.cards.length} Visages
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'font-mono text-xs font-bold px-2 py-0.5 rounded-md border',
                            isComplete
                              ? 'text-green-400 bg-green-500/15 border-green-500/30'
                              : s.collectedCards > 0
                                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                : 'text-mh-slate-500 bg-black/20 border-white/5',
                          )}
                        >
                          {s.collectedCards}/{s.totalCards}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          )}

          {/* ── Right Content: Active Set View (Album Mode) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 lg:p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <Loader2 size={32} className="animate-spin text-[#FFD700] mb-3" />
                <p className="text-sm font-bold text-mh-slate-300">Loading Visage Sets…</p>
              </div>
            ) : activeSet ? (
              <div className={cn('mx-auto space-y-4 sm:space-y-6', viewMode === 'monster' ? 'max-w-7xl' : 'max-w-6xl')}>
                <GuestSaveNotice collection="visage" count={Object.keys(collectionMap).length} noun="cards" />

                {/* Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-white/10 pb-2 sm:pb-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    {viewMode === 'set' ? (
                      <>
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-xl border shadow-md shrink-0',
                            activeInkCfg.bg,
                            activeInkCfg.border,
                            activeInkCfg.text,
                          )}
                        >
                          <InkIconComponent iconName={activeSet.iconName || activeInkCfg.iconName} size={20} />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide uppercase">
                            {activeSet.name}
                          </h1>
                          <span className="font-mono text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-md">
                            {activeSet.collectedCards}/{activeSet.totalCards}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/15 text-mh-gold-400 shadow-md shrink-0">
                          <Target size={20} />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide uppercase">
                            Monsters
                          </h1>
                          <span className="font-mono text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-md">
                            {monsterStats.unlockedSlots}/{monsterStats.totalSlots}
                          </span>
                        </div>
                      </>
                    )}

                    {/* View Switcher: Next to the title */}
                    <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-black/40 p-0.5 text-xs shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={() => setViewMode('set')}
                        className={cn(
                          'px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5',
                          viewMode === 'set' ? ACTIVE_PILL : INACTIVE_PILL,
                        )}
                        title="View cards grouped by Ink Set"
                      >
                        <Layers size={13} />
                        <span>By Set</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('monster')}
                        className={cn(
                          'px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5',
                          viewMode === 'monster' ? ACTIVE_PILL : INACTIVE_PILL,
                        )}
                        title="View cards grouped by Large Monster"
                      >
                        <Target size={13} />
                        <span>By Monster</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs flex items-center gap-1.5">
                    <span className="text-[var(--text-secondary)]">
                      {viewMode === 'set'
                        ? 'Click any card to inspect stats & effect'
                        : 'Row 1: 1st Ink · Row 2: 2nd Ink · Click to inspect'}
                    </span>
                  </div>
                </div>

                {/* ── View Mode: By Set ── */}
                {viewMode === 'set' && (
                  <>
                    {/* Columns Grouped by Points */}
                    {displayedColumns.length > 0 ? (
                      <div className="flex flex-wrap gap-4 sm:gap-6 items-start pb-3">
                        {displayedColumns.map((col) => (
                          <div
                            key={col.points}
                            className="mho-panel flex-1 min-w-[200px] max-w-[340px] p-4 shadow-md"
                          >
                            {/* Group Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#FFD700] text-xs">❖</span>
                                <span className="font-display text-sm font-bold uppercase tracking-wide text-white">
                                  Points: {col.points}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-semibold text-green-400">
                                {col.collectedCount}/{col.totalCount}
                              </span>
                            </div>

                            {/* Card Grid within this Point Group */}
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 justify-items-center">
                              {col.cards.map((card) => (
                                <VisageCard
                                  key={card.id}
                                  card={card}
                                  currentInk={activeSet.id}
                                  collectionEntry={getCardCollection(card.id, activeSet.id)}
                                  challenge={getVisageChallenge(challenges, card.id, activeSet.id)}
                                  onSetRarity={(rarity, qty) => setCardRarity(card.id, activeSet.id, rarity, qty)}
                                  onSetQuantity={(qty) => setCardQuantity(card.id, activeSet.id, qty)}
                                  onRemoveFromCollection={() => removeCardFromCollection(card.id, activeSet.id)}
                                  onAddChallenge={handleAddVisageChallenge}
                                  onClick={() => handleOpenInspect(card, activeSet.id)}
                                  buildMode={false}
                                  onInspect={() => handleOpenInspect(card, activeSet.id)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-white/5 py-12 px-6 text-center">
                        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl border mb-3', activeInkCfg.bg, activeInkCfg.border, activeInkCfg.text)}>
                          <InkIconComponent iconName={activeSet.iconName || activeInkCfg.iconName} size={24} />
                        </div>
                        <h3 className="font-display text-sm font-bold text-mh-slate-300">
                          {searchQuery.trim()
                            ? `No cards in ${activeSet.name} match "${searchQuery}"`
                            : `No Visage cards for ${activeSet.name} in Supabase yet`}
                        </h3>
                        <p className="text-xs text-mh-slate-500 mt-1 max-w-sm">
                          Cards assigned to this ink in the database will automatically appear here grouped by their points.
                        </p>
                        {isAdmin && (
                          <button
                            onClick={() => navigate('/admin/visages')}
                            className="mt-4 flex items-center gap-1.5 rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3.5 py-1.5 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 transition-colors"
                          >
                            <Plus size={13} />
                            Add Cards in Admin Panel
                          </button>
                        )}
                      </div>
                    )}

                    {/* Set Bonus Skills Section */}
                    <div className="mho-card-rarity rarity-theme-standard p-5 shadow-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#FFD700]">
                        <div className={cn('flex h-5 w-5 items-center justify-center rounded', activeInkCfg.text)}>
                          <InkIconComponent iconName={activeSet.iconName || activeInkCfg.iconName} size={15} />
                        </div>
                        <span>{activeSet.name}</span>
                      </div>

                      <div className="space-y-2 pl-1">
                        {activeSet.thresholds.map((tier, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-mh-slate-200">
                            <span className="text-mh-gold-400 font-bold mt-0.5">•</span>
                            <div>
                              <span className="font-display font-bold text-mh-gold-300 mr-2">
                                [ {tier.pieces}-Piece Set ]
                              </span>
                              <span className="text-mh-slate-100">
                                {tier.description}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── View Mode: By Monster ── */}
                {viewMode === 'monster' && (
                  <div className="space-y-4">
                    {/* Monster View Toolbar: Search & Rarity Filters */}
                    <div className="mho-panel p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                        {/* Monster Search */}
                        <div className="relative flex-1 min-w-[150px] max-w-xs">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                          <input
                            type="text"
                            value={monsterSearchQuery}
                            onChange={(e) => setMonsterSearchQuery(e.target.value)}
                            placeholder="Search monsters…"
                            className={cn(FIELD_INPUT, 'rounded-md py-1 pl-7 pr-7')}
                          />
                          {monsterSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setMonsterSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white transition-colors p-0.5"
                              title="Clear search"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Rarity Filter Pills */}
                        <div className="flex rounded-md border border-[var(--border-subtle)] bg-black/30 p-0.5 text-[10px] shrink-0 flex-wrap gap-0.5">
                          <button
                            type="button"
                            onClick={() => setMonsterRarityFilter('all')}
                            className={cn(
                              'px-2 py-0.5 rounded capitalize font-medium transition-colors',
                              monsterRarityFilter === 'all' ? ACTIVE_PILL : 'text-mh-slate-300 hover:text-white',
                            )}
                          >
                            All ({rarityFilterCounts.all})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonsterRarityFilter('fine')}
                            className={cn(
                              'px-2 py-0.5 rounded font-medium transition-colors border',
                              monsterRarityFilter === 'fine'
                                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                : 'border-transparent text-emerald-400/80 hover:text-emerald-300',
                            )}
                            title="Shows monsters that still need Fine (missing cards)"
                          >
                            Fine ({rarityFilterCounts.fine})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonsterRarityFilter('rare')}
                            className={cn(
                              'px-2 py-0.5 rounded font-medium transition-colors border',
                              monsterRarityFilter === 'rare'
                                ? 'bg-sky-500/25 text-sky-300 border-sky-500/60 shadow-[0_0_8px_rgba(14,165,233,0.3)]'
                                : 'border-transparent text-sky-400/80 hover:text-sky-300',
                            )}
                            title="Shows monsters that still need Rare cards"
                          >
                            Rare ({rarityFilterCounts.rare})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonsterRarityFilter('epic')}
                            className={cn(
                              'px-2 py-0.5 rounded font-medium transition-colors border',
                              monsterRarityFilter === 'epic'
                                ? 'bg-purple-500/25 text-purple-300 border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                                : 'border-transparent text-purple-400/80 hover:text-purple-300',
                            )}
                            title="Shows monsters that still need Epic cards"
                          >
                            Epic ({rarityFilterCounts.epic})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonsterRarityFilter('superior')}
                            className={cn(
                              'px-2 py-0.5 rounded font-medium transition-colors border',
                              monsterRarityFilter === 'superior'
                                ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                                : 'border-transparent text-amber-400/80 hover:text-amber-300',
                            )}
                            title="Shows monsters that still need Superior cards"
                          >
                            Superior ({rarityFilterCounts.superior})
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-[var(--text-secondary)] shrink-0 hidden sm:block">
                        {monsterRarityFilter === 'all'
                          ? 'Showing all monsters'
                          : `Hiding monsters with any card at ${monsterRarityFilter.toUpperCase()} or higher`}
                      </div>
                    </div>

                    {/* Monsters Columns Grid */}
                    {filteredLargeMonsters.length > 0 || filteredSmallMonsters.length > 0 ? (
                      <div className="space-y-6 pb-6">
                        {/* Large Monsters Section */}
                        {filteredLargeMonsters.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[#FFD700] text-sm">❖</span>
                                <h2 className="font-display text-sm font-bold tracking-wide uppercase text-white">
                                   Large Monsters
                                </h2>
                                <span className="font-mono text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 px-2 py-0.5 rounded-md">
                                  {filteredLargeMonsters.length}{filteredLargeMonsters.length !== allMonsterVisages.large.length ? ` / ${allMonsterVisages.large.length}` : ''}
                                </span>
                              </div>
                              <span className="text-[11px] text-[var(--text-secondary)]">3–4 Points</span>
                            </div>

                            <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
                              {filteredLargeMonsters.map((monster) => {
                                const ink1 = monster.ink_types[0] ? (monster.ink_types[0] === 'fire' ? 'flames' : monster.ink_types[0]) : 'flames';
                                const ink2 = monster.ink_types[1] ? (monster.ink_types[1] === 'fire' ? 'flames' : monster.ink_types[1]) : null;

                                const ink1Cfg = getInkConfig(ink1);
                                const ink2Cfg = ink2 ? getInkConfig(ink2) : null;

                                const entry1 = getCardCollection(monster.id, ink1);
                                const entry2 = ink2 ? getCardCollection(monster.id, ink2) : null;

                                return (
                                  <div
                                    key={monster.id}
                                    className="mho-panel flex flex-col items-center p-2.5 sm:p-3 rounded-2xl shadow-md border border-white/10 hover:border-white/20 transition-all shrink-0 w-[114px] sm:w-[124px]"
                                  >
                                    {/* Monster Header */}
                                    <div className="w-full flex flex-col items-center text-center pb-2 mb-2 border-b border-white/10">
                                      <div className="relative mb-1">
                                        <Link
                                          to={`/challenges/monsters?monster=${monster.monster_id || encodeURIComponent(monster.name)}`}
                                          className="block group/icon relative hover:scale-110 active:scale-95 transition-transform"
                                          title={`View ${monster.name} details in Monster Field Guide`}
                                        >
                                          {monster.monster_icon ? (
                                            <img
                                              src={monster.monster_icon}
                                              alt={monster.name}
                                              className="w-10 h-10 object-contain drop-shadow group-hover/icon:brightness-110 transition-all"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-xs font-bold text-mh-slate-400 group-hover/icon:border-mh-gold-400 border border-transparent">
                                              ?
                                            </div>
                                          )}
                                        </Link>
                                        <span className="absolute -bottom-1 -right-1 font-mono text-[9px] font-bold px-1 rounded bg-black/80 border border-white/20 text-[#FFD700] pointer-events-none">
                                          #{monster.sort_order}
                                        </span>
                                      </div>
                                      <span
                                        className="font-display text-[11px] sm:text-xs font-bold text-white tracking-wide truncate w-full"
                                        title={monster.name}
                                      >
                                        {monster.name}
                                      </span>
                                      <span className="text-[10px] text-mh-slate-400 font-mono">
                                        {monster.points} Pts
                                      </span>
                                    </div>

                                    {/* Cards Rows */}
                                    <div className="flex flex-col gap-2.5 items-center w-full">
                                      {/* Row 1: First Ink */}
                                      <div className="flex flex-col items-center gap-1 w-full">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-mh-slate-300">
                                          <InkIconComponent iconName={ink1Cfg.iconName} size={11} />
                                          <span className="truncate max-w-[85px]">{ink1Cfg.shortName}</span>
                                        </div>
                                        <VisageCard
                                          card={monster}
                                          currentInk={ink1}
                                          collectionEntry={entry1}
                                          challenge={getVisageChallenge(challenges, monster.id, ink1)}
                                          onSetRarity={(rarity, qty) => setCardRarity(monster.id, ink1, rarity, qty)}
                                          onSetQuantity={(qty) => setCardQuantity(monster.id, ink1, qty)}
                                          onRemoveFromCollection={() => removeCardFromCollection(monster.id, ink1)}
                                          onAddChallenge={handleAddVisageChallenge}
                                          onClick={() => handleOpenInspect(monster, ink1)}
                                          buildMode={false}
                                          onInspect={() => handleOpenInspect(monster, ink1)}
                                        />
                                      </div>

                                      {/* Row 2: Second Ink (if present) */}
                                      {ink2 && ink2Cfg && (
                                        <div className="flex flex-col items-center gap-1 w-full pt-2 border-t border-white/5">
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-mh-slate-300">
                                            <InkIconComponent iconName={ink2Cfg.iconName} size={11} />
                                            <span className="truncate max-w-[85px]">{ink2Cfg.shortName}</span>
                                          </div>
                                          <VisageCard
                                            card={monster}
                                            currentInk={ink2}
                                            collectionEntry={entry2}
                                            challenge={getVisageChallenge(challenges, monster.id, ink2)}
                                            onSetRarity={(rarity, qty) => setCardRarity(monster.id, ink2, rarity, qty)}
                                            onSetQuantity={(qty) => setCardQuantity(monster.id, ink2, qty)}
                                            onRemoveFromCollection={() => removeCardFromCollection(monster.id, ink2)}
                                            onAddChallenge={handleAddVisageChallenge}
                                            onClick={() => handleOpenInspect(monster, ink2)}
                                            buildMode={false}
                                            onInspect={() => handleOpenInspect(monster, ink2)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Small Monsters Section */}
                        {filteredSmallMonsters.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 text-sm">❖</span>
                                <h2 className="font-display text-sm font-bold tracking-wide uppercase text-white">
                                  Small Monsters
                                </h2>
                                <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                  {filteredSmallMonsters.length}{filteredSmallMonsters.length !== allMonsterVisages.small.length ? ` / ${allMonsterVisages.small.length}` : ''}
                                </span>
                              </div>
                              <span className="text-[11px] text-[var(--text-secondary)]">1 Point</span>
                            </div>

                            <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
                              {filteredSmallMonsters.map((monster) => {
                                const ink1 = monster.ink_types[0] ? (monster.ink_types[0] === 'fire' ? 'flames' : monster.ink_types[0]) : 'flames';
                                const ink2 = monster.ink_types[1] ? (monster.ink_types[1] === 'fire' ? 'flames' : monster.ink_types[1]) : null;

                                const ink1Cfg = getInkConfig(ink1);
                                const ink2Cfg = ink2 ? getInkConfig(ink2) : null;

                                const entry1 = getCardCollection(monster.id, ink1);
                                const entry2 = ink2 ? getCardCollection(monster.id, ink2) : null;

                                return (
                                  <div
                                    key={monster.id}
                                    className="mho-panel flex flex-col items-center p-2.5 sm:p-3 rounded-2xl shadow-md border border-white/10 hover:border-white/20 transition-all shrink-0 w-[114px] sm:w-[124px]"
                                  >
                                    {/* Monster Header */}
                                    <div className="w-full flex flex-col items-center text-center pb-2 mb-2 border-b border-white/10">
                                      <div className="relative mb-1">
                                        <Link
                                          to={`/challenges/monsters?monster=${monster.monster_id || encodeURIComponent(monster.name)}`}
                                          className="block group/icon relative hover:scale-110 active:scale-95 transition-transform"
                                          title={`View ${monster.name} details in Monster Field Guide`}
                                        >
                                          {monster.monster_icon ? (
                                            <img
                                              src={monster.monster_icon}
                                              alt={monster.name}
                                              className="w-10 h-10 object-contain drop-shadow group-hover/icon:brightness-110 transition-all"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-xs font-bold text-mh-slate-400 group-hover/icon:border-mh-gold-400 border border-transparent">
                                              ?
                                            </div>
                                          )}
                                        </Link>
                                        <span className="absolute -bottom-1 -right-1 font-mono text-[9px] font-bold px-1 rounded bg-black/80 border border-white/20 text-[#FFD700] pointer-events-none">
                                          #{monster.sort_order}
                                        </span>
                                      </div>
                                      <span
                                        className="font-display text-[11px] sm:text-xs font-bold text-white tracking-wide truncate w-full"
                                        title={monster.name}
                                      >
                                        {monster.name}
                                      </span>
                                      <span className="text-[10px] text-mh-slate-400 font-mono">
                                        {monster.points} Pt
                                      </span>
                                    </div>

                                    {/* Cards Rows */}
                                    <div className="flex flex-col gap-2.5 items-center w-full">
                                      {/* Row 1: First Ink */}
                                      <div className="flex flex-col items-center gap-1 w-full">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-mh-slate-300">
                                          <InkIconComponent iconName={ink1Cfg.iconName} size={11} />
                                          <span className="truncate max-w-[85px]">{ink1Cfg.shortName}</span>
                                        </div>
                                        <VisageCard
                                          card={monster}
                                          currentInk={ink1}
                                          collectionEntry={entry1}
                                          challenge={getVisageChallenge(challenges, monster.id, ink1)}
                                          onSetRarity={(rarity, qty) => setCardRarity(monster.id, ink1, rarity, qty)}
                                          onSetQuantity={(qty) => setCardQuantity(monster.id, ink1, qty)}
                                          onRemoveFromCollection={() => removeCardFromCollection(monster.id, ink1)}
                                          onAddChallenge={handleAddVisageChallenge}
                                          onClick={() => handleOpenInspect(monster, ink1)}
                                          buildMode={false}
                                          onInspect={() => handleOpenInspect(monster, ink1)}
                                        />
                                      </div>

                                      {/* Row 2: Second Ink (if present) */}
                                      {ink2 && ink2Cfg && (
                                        <div className="flex flex-col items-center gap-1 w-full pt-2 border-t border-white/5">
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-mh-slate-300">
                                            <InkIconComponent iconName={ink2Cfg.iconName} size={11} />
                                            <span className="truncate max-w-[85px]">{ink2Cfg.shortName}</span>
                                          </div>
                                          <VisageCard
                                            card={monster}
                                            currentInk={ink2}
                                            collectionEntry={entry2}
                                            challenge={getVisageChallenge(challenges, monster.id, ink2)}
                                            onSetRarity={(rarity, qty) => setCardRarity(monster.id, ink2, rarity, qty)}
                                            onSetQuantity={(qty) => setCardQuantity(monster.id, ink2, qty)}
                                            onRemoveFromCollection={() => removeCardFromCollection(monster.id, ink2)}
                                            onAddChallenge={handleAddVisageChallenge}
                                            onClick={() => handleOpenInspect(monster, ink2)}
                                            buildMode={false}
                                            onInspect={() => handleOpenInspect(monster, ink2)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-white/5 py-12 px-6 text-center">
                        <Target size={32} className="text-mh-gold-400/50 mb-2" />
                        <h3 className="font-display text-sm font-bold text-mh-slate-300">
                          No monsters match your filters
                        </h3>
                        <p className="text-xs text-mh-slate-500 mt-1 max-w-sm">
                          {monsterRarityFilter !== 'all'
                            ? `All monsters have already reached ${monsterRarityFilter.toUpperCase()} rarity for all their cards!`
                            : 'Try resetting the search query to see more monsters.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setMonsterSearchQuery('');
                            setMonsterRarityFilter('all');
                          }}
                          className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-mh-slate-300 transition-colors"
                        >
                          <RotateCcw size={12} />
                          <span>Reset Filters</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-mh-slate-500 min-h-[300px]">
                <Layers size={48} className="mb-3 opacity-30 text-mh-gold-400" />
                <h3 className="font-display text-base font-bold text-mh-slate-300">
                  No Visage Sets Found in Database
                </h3>
                <p className="text-xs text-mh-slate-400 mt-1 max-w-md">
                  Sets are automatically generated when Visage cards are added to Supabase and linked to a set bonus skill or ink type.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin/visages')}
                    className="mt-4 flex items-center gap-1.5 rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-4 py-2 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 transition-colors shadow-sm"
                  >
                    <Plus size={14} />
                    Manage Visages in Admin Panel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Card Detail Modal ── */}
      <VisageModal
        card={inspectedCard}
        currentInk={inspectedInk || activeSet?.id}
        open={inspectedCard !== null}
        collectionEntry={
          inspectedCard
            ? getCardCollection(inspectedCard.id, inspectedInk || activeSet?.id || 'flames')
            : null
        }
        challenge={
          inspectedCard
            ? getVisageChallenge(challenges, inspectedCard.id, inspectedInk || activeSet?.id || 'flames')
            : undefined
        }
        onSetRarity={(rarity, qty) => {
          if (inspectedCard) {
            const ink = inspectedInk || activeSet?.id || 'flames';
            setCardRarity(inspectedCard.id, ink, rarity, qty);
          }
        }}
        onSetQuantity={(qty) => {
          if (inspectedCard) {
            const ink = inspectedInk || activeSet?.id || 'flames';
            setCardQuantity(inspectedCard.id, ink, qty);
          }
        }}
        onRemoveFromCollection={() => {
          if (inspectedCard) {
            const ink = inspectedInk || activeSet?.id || 'flames';
            removeCardFromCollection(inspectedCard.id, ink);
          }
        }}
        onAddChallenge={handleAddVisageChallenge}
        onClose={() => {
          setInspectedCard(null);
          setInspectedInk(null);
        }}
      />

      {/* ── Auth Login Modal ── */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
