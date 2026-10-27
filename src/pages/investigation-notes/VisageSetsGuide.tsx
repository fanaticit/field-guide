import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Layers,
  Loader2,
  Plus,
  Bookmark,
  BookOpen,
  Hammer,
  ChevronDown,
} from 'lucide-react';
import { useVisageSetsData } from '../../hooks/useVisageSets';
import { type DBVisage, type VisageRarity, getInkConfig } from '../../data/schemas/visage';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import VisageBuilderPanel from '../../components/visage-builder/VisageBuilderPanel';
import SaveVisageBuildModal from '../../components/visage-builder/SaveVisageBuildModal';
import DuplicateBuildModal from '../../components/visage-builder/DuplicateBuildModal';
import MissingCardsChallengeModal from '../../components/visage-builder/MissingCardsChallengeModal';
import { useVisageBuilderStore } from '../../store/visageBuilderStore';
import {
  useVisageBuild,
  useSaveVisageBuild,
  useVisageBuildsList,
  useUserVisageFavorites,
} from '../../hooks/useVisageBuilds';
import {
  VISAGE_BUILD_SLOTS,
  VISAGE_POINT_CAP,
  canPlaceCard,
  firstEmptySlot,
  ownsCardInk,
  rowToLoadout,
  findDuplicateBuild,
  getBuildability,
  type MissingCard,
  type VisageBuildRow,
} from '../../lib/visageBuild';
import { cn } from '../../lib/utils';

// Shared pill styles that mirror the home page's gold button / panel look
const ACTIVE_PILL =
  'bg-gradient-to-b from-[#EAD17A] to-[#C9A042] text-[#1A1408] font-bold shadow-[0_0_10px_var(--accent-gold-glow)]';
const INACTIVE_PILL = 'text-[var(--text-secondary)] hover:text-white';
const FIELD_INPUT =
  'w-full border border-[var(--border-subtle)] bg-black/30 text-xs text-white placeholder-[var(--text-secondary)] outline-none focus:border-[#FFD700]/70';

export default function VisageSetsGuide() {
  const {
    sets,
    dbVisages,
    collectionMap,
    isLoading,
    getCardCollection,
    setCardRarity,
    setCardQuantity,
    removeCardFromCollection,
  } = useVisageSetsData();
  const isAdmin = useAuthStore(selectIsAdmin);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [inspectedCard, setInspectedCard] = useState<DBVisage | null>(null);
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

  // ── Builder mode (URL driven: ?mode=builder&build=<id>) ──────
  const [searchParams, setSearchParams] = useSearchParams();
  const isBuilder = searchParams.get('mode') === 'builder';
  const buildParam = searchParams.get('build');

  const builder = useVisageBuilderStore();
  const { loadout, sourceMode } = builder;
  const [notice, setNotice] = useState<string | null>(null);
  const [saveModal, setSaveModal] = useState<{ open: boolean; asNew: boolean }>({ open: false, asNew: false });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<{
    open: boolean;
    duplicate: VisageBuildRow | null;
    pendingAsNew: boolean;
  }>({ open: false, duplicate: null, pendingAsNew: false });
  const [missingPrompt, setMissingPrompt] = useState<MissingCard[]>([]);
  const [missingError, setMissingError] = useState<string | null>(null);

  const saveBuild = useSaveVisageBuild();
  const { data: loadedBuild } = useVisageBuild(isBuilder ? buildParam : null);
  const { data: allBuilds = [] } = useVisageBuildsList();
  const { favoritesSet, addFavorite, isLoading: isFavoriting } = useUserVisageFavorites();

  const visagesById = useMemo(() => new Map(dbVisages.map((v) => [v.id, v])), [dbVisages]);

  // Load a saved build into the builder when ?build= changes
  useEffect(() => {
    if (!loadedBuild || visagesById.size === 0) return;
    if (builder.buildId === loadedBuild.id) return;
    builder.load({
      buildId: loadedBuild.id,
      authorId: loadedBuild.author_id,
      title: loadedBuild.title,
      description: loadedBuild.description ?? '',
      isPublished: loadedBuild.is_published,
      loadout: rowToLoadout(loadedBuild, visagesById),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedBuild, visagesById]);

  const setMode = (mode: 'album' | 'builder') => {
    const next = new URLSearchParams(searchParams);
    if (mode === 'builder') {
      next.set('mode', 'builder');
      if (builder.buildId) next.set('build', builder.buildId);
    } else {
      next.delete('mode');
      next.delete('build');
    }
    setSearchParams(next, { replace: true });
  };

  const isOwner = !builder.buildId || builder.authorId === user?.id;

  const buildCountFor = (cardId: string, ink: string) =>
    VISAGE_BUILD_SLOTS.filter((s) => loadout[s].visage?.id === cardId && loadout[s].ink === ink).length;

  const getBuildBlock = (card: DBVisage, ink: string): string | null => {
    if (sourceMode === 'mine' && !ownsCardInk(collectionMap, card.id, ink)) return 'Not in your collection';
    const slot = firstEmptySlot(loadout);
    if (!slot) return 'All slots are full';
    if (!canPlaceCard(loadout, card, slot)) return `Exceeds ${VISAGE_POINT_CAP} points`;
    return null;
  };

  const handleBuildCardClick = (card: DBVisage, ink: string) => {
    if (buildCountFor(card.id, ink) > 0) {
      builder.removeCard(card.id, ink);
      setNotice(null);
      return;
    }
    const block = getBuildBlock(card, ink);
    if (block) {
      setNotice(`Can't add ${card.name}: ${block}.`);
      return;
    }
    builder.addCard(card, ink);
    setNotice(null);
  };

  const handleSaveRequest = (asNew: boolean) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }

    // Check for duplicate loadout in directory
    const duplicate = findDuplicateBuild(
      loadout,
      allBuilds,
      visagesById,
      asNew ? null : builder.buildId,
    );

    if (duplicate) {
      setDuplicateModal({
        open: true,
        duplicate,
        pendingAsNew: asNew,
      });
      return;
    }

    setSaveError(null);
    setSaveModal({ open: true, asNew });
  };

  const handleFavoriteExistingDuplicate = async (dup: VisageBuildRow) => {
    try {
      await addFavorite(dup.id);
      setNotice(`Favorited "${dup.title}"! Added to your favorites.`);
      setDuplicateModal({ open: false, duplicate: null, pendingAsNew: false });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to favorite build');
    }
  };

  const handleSaveCustomAnyway = () => {
    const asNew = duplicateModal.pendingAsNew;
    setDuplicateModal({ open: false, duplicate: null, pendingAsNew: false });
    setSaveError(null);
    setSaveModal({ open: true, asNew });
  };

  const handleSaveConfirm = async (v: { title: string; description: string; isPublished: boolean }) => {
    if (!user) return;
    const updateExisting = !saveModal.asNew && builder.buildId && isOwner;
    try {
      const id = await saveBuild.mutateAsync({
        id: updateExisting ? builder.buildId : null,
        authorId: user.id,
        title: v.title,
        description: v.description,
        isPublished: v.isPublished,
        loadout,
      });
      builder.setMeta(v);
      builder.markSaved(id, user.id);
      setSaveModal({ open: false, asNew: false });
      const next = new URLSearchParams(searchParams);
      next.set('mode', 'builder');
      next.set('build', id);
      setSearchParams(next, { replace: true });

      // Offer to track cards the hunter doesn't own yet
      const missing = getBuildability(loadout, collectionMap).missing.filter(
        (m) => !getVisageChallenge(challenges, m.visage.id, m.ink),
      );
      if (missing.length > 0) {
        setMissingError(null);
        setMissingPrompt(missing);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save build.');
    }
  };

  const handleConfirmMissingChallenges = async () => {
    try {
      for (const m of missingPrompt) {
        await handleAddVisageChallenge(m.visage, m.ink, collectionMap[`${m.visage.id}:${m.ink}`]?.rarity);
      }
      setNotice(
        `Added ${missingPrompt.length} card${missingPrompt.length > 1 ? 's' : ''} to your Personal Hunter's Challenge.`,
      );
      setMissingPrompt([]);
    } catch (e) {
      setMissingError(e instanceof Error ? e.message : 'Failed to add challenges.');
    }
  };

  // ── Personal Challenges ──────────────────────────────────────
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
    await addVisageChallenge.mutateAsync({
      userId: user.id,
      game: 'mho',
      visageId: card.id,
      visageName: card.name,
      inkType: (inkType || 'flames').toLowerCase(),
      monsterId: card.monster_id ?? null,
      monsterName: card.name,
      pieceImage: card.image_small ?? null,
      setIcon: card.image_small ?? null,
      currentRarity: rarityIdx,
      craftRarity: 1, // Fine
      maxRarity: 4, // Superior
    });
  };

  // Filter the sets list on the left
  const filteredSets = useMemo(() => {
    let list = [...sets];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q) ||
          s.cards.some((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)),
      );
    }

    if (filterMode === 'complete') {
      list = list.filter((s) => s.collectedCards === s.totalCards && s.totalCards > 0);
    } else if (filterMode === 'incomplete') {
      list = list.filter((s) => s.collectedCards < s.totalCards);
    }

    return list;
  }, [sets, searchQuery, filterMode]);

  // Currently selected active set
  const activeSet = useMemo(() => {
    if (selectedSetId) {
      const found = sets.find((s) => s.id === selectedSetId);
      if (found) return found;
    }
    return sets[0] || null;
  }, [sets, selectedSetId]);

  const activeInkCfg = activeSet ? getInkConfig(activeSet.id) : getInkConfig('flames');

  // Collection statistics across all available card slots in all sets
  // Each (card, ink_set) pairing represents a distinct collectible slot in the album
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

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full gap-3 p-2 sm:p-3 text-white overflow-hidden">
      {/* ── Streamlined Subheader Banner ── */}
      <div className="mho-panel relative shrink-0 px-3 sm:px-6 py-2.5 shadow-xl z-20">
        <div className="flex items-center justify-between gap-x-2 gap-y-2 sm:gap-4 flex-wrap sm:flex-nowrap">
          {/* Left: Clean title (Row 1 Left) */}
          <div className="order-1 flex items-center gap-2 min-w-0">
            <span className="text-[#FFD700] text-sm shrink-0">❖</span>
            <h2 className="font-display text-sm sm:text-base md:text-lg font-bold uppercase tracking-wide text-white whitespace-nowrap">
              {isBuilder ? 'Building Visage Set' : 'Visage Collection'}
            </h2>
            {isLoading && (
              <Loader2 size={12} className="animate-spin text-mh-gold-400 shrink-0 ml-1" />
            )}
          </div>

          {/* Right: Collected Info (Row 1 Right on mobile, far right on desktop) */}
          <div className="order-2 sm:order-3 ml-auto sm:ml-0 relative shrink-0">
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

          {/* Center: Album / Build Set toggle (wrapped to row 2 when contracted/mobile, center on desktop) */}
          <div className="order-3 sm:order-2 w-full sm:w-auto flex justify-center sm:inline-flex shrink-0">
            <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-black/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode('album')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 font-bold transition-all text-xs',
                  !isBuilder ? ACTIVE_PILL : INACTIVE_PILL,
                )}
              >
                <BookOpen size={13} />
                <span>Album</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('builder')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 font-bold transition-all text-xs',
                  isBuilder ? ACTIVE_PILL : INACTIVE_PILL,
                )}
              >
                <Hammer size={13} />
                <span>Build Set</span>
                {builder.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Book Container ── */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-3 overflow-hidden">
        {/* ── Mobile Horizontal Sets Strip (< lg) ── */}
        <div className="mho-panel-deep lg:hidden shrink-0 flex flex-col min-h-0">
          {/* Compact search & filter row */}
          <div className="p-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sets or monsters…"
                className={cn(FIELD_INPUT, 'rounded-md py-1 pl-7 pr-2')}
              />
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
                  onClick={() => setSelectedSetId(s.id)}
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

        {/* ── Left Sidebar: Sets List (Desktop lg+) ── */}
        <div className="mho-panel-deep hidden lg:flex w-72 xl:w-80 shrink-0 flex-col min-h-0 overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-[var(--border-subtle)] space-y-2 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sets or monsters…"
                className={cn(FIELD_INPUT, 'rounded-lg py-1.5 pl-8 pr-3')}
              />
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
                    onClick={() => setSelectedSetId(s.id)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all text-left group border',
                      isSelected
                        ? 'bg-[var(--bg-superior)] border-[var(--border-active)] shadow-[0_0_12px_var(--accent-gold-glow)]'
                        : 'bg-white/5 border-[var(--border-subtle)] hover:border-[#FFD700]/50 hover:bg-white/10 text-mh-slate-300',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Ink Icon Badge */}
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs shadow-sm transition-transform group-hover:scale-105',
                          cfg.bg,
                          cfg.border,
                          cfg.text,
                        )}
                      >
                        <InkIconComponent iconName={s.iconName || cfg.iconName} size={14} />
                      </div>

                      {/* Set Name */}
                      <div className="truncate">
                        <span
                          className={cn(
                            'block text-xs font-bold truncate leading-tight',
                            isSelected ? 'text-[#FFD700]' : 'text-mh-slate-200 group-hover:text-white',
                          )}
                        >
                          {s.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                          {s.cards.length} {s.cards.length === 1 ? 'card' : 'cards'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Badge */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span
                        className={cn(
                          'font-mono text-xs font-bold px-1.5 py-0.5 rounded',
                          isComplete
                            ? 'text-green-400 bg-green-500/15 border border-green-500/30'
                            : s.collectedCards > 0
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-mh-slate-500',
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

        {/* ── Right Content: Active Set View ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 lg:p-6">
          {activeSet ? (
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
              {/* Set Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-white/10 pb-2 sm:pb-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border shadow-md',
                      activeInkCfg.bg,
                      activeInkCfg.border,
                      activeInkCfg.text,
                    )}
                  >
                    <InkIconComponent iconName={activeSet.iconName || activeInkCfg.iconName} size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide uppercase">
                        {activeSet.name}
                      </h1>
                      <span className="font-mono text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-md">
                        {activeSet.collectedCards}/{activeSet.totalCards}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs flex items-center gap-1.5">
                  <span className="text-[var(--text-secondary)]">
                    {isBuilder ? 'Click card to add/remove from build' : 'Click any card to inspect stats & effect'}
                  </span>
                </div>
              </div>

              {/* Mobile/Tablet Builder Panel (< xl) */}
              {isBuilder && (
                <div className="xl:hidden">
                  <VisageBuilderPanel
                    sets={sets}
                    visages={dbVisages}
                    collectionMap={collectionMap}
                    isOwner={isOwner}
                    notice={notice}
                    onNotice={setNotice}
                    onSave={handleSaveRequest}
                  />
                </div>
              )}

              {/* ── Columns Grouped by Points ── */}
              {activeSet.groupedColumns.length > 0 ? (
                <div className="flex flex-wrap lg:flex-nowrap gap-4 sm:gap-6 items-start overflow-x-auto pb-3">
                  {activeSet.groupedColumns.map((col) => (
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
                            onClick={() => {
                              if (isBuilder) {
                                handleBuildCardClick(card, activeSet.id);
                              } else {
                                setInspectedCard(card);
                              }
                            }}
                            buildMode={isBuilder}
                            isCoreCard={isBuilder && loadout.core.visage?.id === card.id}
                            buildCount={isBuilder ? buildCountFor(card.id, activeSet.id) : 0}
                            buildDisabled={isBuilder ? Boolean(getBuildBlock(card, activeSet.id)) : false}
                            buildDisabledReason={isBuilder ? (getBuildBlock(card, activeSet.id) ?? undefined) : undefined}
                            onInspect={() => setInspectedCard(card)}
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
                    No Visage cards for {activeSet.name} in Supabase yet
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

              {/* ── Set Bonus Skills Section (Directly underneath the groups) ── */}
              <div className="mho-card-rarity rarity-theme-standard p-5 shadow-lg space-y-3">
                {/* Title */}
                <div className="flex items-center gap-2 text-sm font-bold text-[#FFD700]">
                  <div className={cn('flex h-5 w-5 items-center justify-center rounded', activeInkCfg.text)}>
                    <InkIconComponent iconName={activeSet.iconName || activeInkCfg.iconName} size={15} />
                  </div>
                  <span>{activeSet.name}</span>
                </div>

                {/* Skill Threshold Bullets */}
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

        {/* ── Desktop Builder Column (xl+) ── */}
        {isBuilder && (
          <div className="mho-panel-deep hidden xl:block w-[380px] 2xl:w-[420px] shrink-0 overflow-y-auto p-4 min-h-0">
            <VisageBuilderPanel
              sets={sets}
              visages={dbVisages}
              collectionMap={collectionMap}
              isOwner={isOwner}
              notice={notice}
              onNotice={setNotice}
              onSave={handleSaveRequest}
            />
          </div>
        )}
      </div>

      {/* ── Duplicate Build Modal ── */}
      <DuplicateBuildModal
        open={duplicateModal.open}
        duplicate={duplicateModal.duplicate}
        visagesById={visagesById}
        isFavorite={Boolean(duplicateModal.duplicate && favoritesSet.has(duplicateModal.duplicate.id))}
        isFavoriting={isFavoriting}
        onClose={() => setDuplicateModal({ open: false, duplicate: null, pendingAsNew: false })}
        onFavoriteExisting={handleFavoriteExistingDuplicate}
        onSaveCustomAnyway={handleSaveCustomAnyway}
      />

      {/* ── Missing Cards → Personal Hunter's Challenge Prompt ── */}
      <MissingCardsChallengeModal
        open={missingPrompt.length > 0}
        missing={missingPrompt}
        adding={addVisageChallenge.isPending}
        error={missingError}
        onConfirm={handleConfirmMissingChallenges}
        onDecline={() => setMissingPrompt([])}
      />

      {/* ── Save Visage Build Modal ── */}
      <SaveVisageBuildModal
        open={saveModal.open}
        asNew={saveModal.asNew}
        initialTitle={builder.title}
        initialDescription={builder.description}
        initialPublished={builder.isPublished}
        saving={saveBuild.isPending}
        error={saveError}
        onClose={() => setSaveModal({ open: false, asNew: false })}
        onConfirm={handleSaveConfirm}
      />

      {/* ── Card Detail Modal ── */}
      <VisageModal
        card={inspectedCard}
        currentInk={activeSet?.id}
        open={inspectedCard !== null}
        collectionEntry={inspectedCard && activeSet ? getCardCollection(inspectedCard.id, activeSet.id) : null}
        challenge={inspectedCard && activeSet ? getVisageChallenge(challenges, inspectedCard.id, activeSet.id) : undefined}
        onSetRarity={(rarity, qty) => {
          if (inspectedCard && activeSet) setCardRarity(inspectedCard.id, activeSet.id, rarity, qty);
        }}
        onSetQuantity={(qty) => {
          if (inspectedCard && activeSet) setCardQuantity(inspectedCard.id, activeSet.id, qty);
        }}
        onRemoveFromCollection={() => {
          if (inspectedCard && activeSet) removeCardFromCollection(inspectedCard.id, activeSet.id);
        }}
        onAddChallenge={handleAddVisageChallenge}
        onClose={() => setInspectedCard(null)}
      />

      {/* ── Auth Login Modal ── */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
