import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Layers,
  Loader2,
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  ThumbsUp,
  Compass,
  Copy,
  Check,
} from 'lucide-react';
import { useVisageSetsData } from '../../hooks/useVisageSets';
import { type DBVisage, type VisageRarity, getInkConfig, normalizeVisageRow } from '../../data/schemas/visage';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  useHunterChallenges,
  useAddVisageChallenge,
  getVisageChallenge,
  VISAGE_RARITY_INDEX,
} from '../../hooks/useHunterChallenges';
import VisageCard, { InkIconComponent } from './VisageCard';
import VisageModal from './VisageModal';
import LoginModal from '../../components/auth/LoginModal';
import PageTitlePanel from '../../components/layout/PageTitlePanel';
import VisageBuilderPanel from '../../components/visage-builder/VisageBuilderPanel';
import DuplicateBuildModal from '../../components/visage-builder/DuplicateBuildModal';
import MissingCardsChallengeModal from '../../components/visage-builder/MissingCardsChallengeModal';
import { useVisageBuilderStore } from '../../store/visageBuilderStore';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import {
  useVisageBuild,
  useSaveVisageBuild,
  useVisageBuildsList,
  useUserVisageFavorites,
  useUserVisageVotes,
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
  getTotalPoints,
  type MissingCard,
  type VisageBuildRow,
} from '../../lib/visageBuild';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';

const ACTIVE_PILL =
  'bg-gradient-to-b from-[#EAD17A] to-[#C9A042] text-[#1A1408] font-bold shadow-[0_0_10px_var(--accent-gold-glow)]';
const INACTIVE_PILL = 'text-[var(--text-secondary)] hover:text-white';
const FIELD_INPUT =
  'w-full border border-[var(--border-subtle)] bg-black/30 text-xs text-white placeholder-[var(--text-secondary)] outline-none focus:border-[#FFD700]/70';

const INTRO_HIDDEN_KEY = 'visage-builder-intro-hidden';

export default function VisageSetBuilder() {
  const theme = useUIStore((s) => s.sectionThemes['/gallery'] ?? DEFAULT_SECTION_THEMES['/gallery']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };

  const { user, profile } = useAuthStore();
  const {
    sets,
    dbVisages,
    collectionMap,
    isLoading,
    getCardCollection,
    setCardRarity,
    setCardQuantity,
    removeCardFromCollection,
  } = useVisageSetsData({ showSpoilers: Boolean(profile?.show_spoilers) });
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const buildParam = params.buildId || searchParams.get('build');

  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [inspectedCard, setInspectedCard] = useState<DBVisage | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const builder = useVisageBuilderStore();
  const { loadout, sourceMode } = builder;
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const triggerFeedback = (message: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setSelectionFeedback(message);
    feedbackTimeoutRef.current = setTimeout(() => {
      setSelectionFeedback(null);
    }, 2200);
  };

  const [duplicateModal, setDuplicateModal] = useState<{
    open: boolean;
    duplicate: VisageBuildRow | null;
    pendingAsNew: boolean;
  }>({ open: false, duplicate: null, pendingAsNew: false });
  const [missingPrompt, setMissingPrompt] = useState<MissingCard[]>([]);
  const [missingError, setMissingError] = useState<string | null>(null);

  const saveBuild = useSaveVisageBuild();
  const { data: loadedBuild } = useVisageBuild(buildParam);
  const { data: allBuilds = [] } = useVisageBuildsList();
  const { favoritesSet, addFavorite, isLoading: isFavoriting } = useUserVisageFavorites();
  const { votedSet, toggleVote } = useUserVisageVotes();
  const hasUpvoted = Boolean(builder.buildId && votedSet.has(builder.buildId));
  const [isVoting, setIsVoting] = useState(false);
  const [isUpvoteAnimating, setIsUpvoteAnimating] = useState(false);

  const visagesById = useMemo(() => new Map(dbVisages.map((v) => [v.id, v])), [dbVisages]);
  const totalPoints = getTotalPoints(loadout);
  const filled = Object.values(loadout).some((e) => e.visage);
  const isOwner = !builder.buildId || builder.authorId === user?.id;
  const isSavedBuild = Boolean(builder.buildId);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!builder.buildId) return;
    const url = `${window.location.origin}/gallery/set?build=${builder.buildId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  // Load a saved build into the builder when buildParam changes
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

  const buildCountFor = (cardId: string, ink: string) =>
    VISAGE_BUILD_SLOTS.filter((s) => loadout[s].visage?.id === cardId && loadout[s].ink === ink).length;

  const getBuildBlock = (card: DBVisage, ink: string): string | null => {
    if (card.status === 'not_in_game' || card.is_spoiler) return 'Not available for builds (unreleased item)';
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

  const handleUpvote = async () => {
    if (!builder.buildId || isVoting) return;
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    setIsVoting(true);
    setIsUpvoteAnimating(true);
    try {
      await toggleVote(builder.buildId);
      triggerFeedback(hasUpvoted ? 'Removed upvote' : 'Upvoted set! +1');
    } catch (err: any) {
      console.error('Failed to vote:', err);
      alert(err?.message || 'Failed to register vote.');
    } finally {
      setIsVoting(false);
      setTimeout(() => setIsUpvoteAnimating(false), 1200);
    }
  };

  const handleClearStartNew = () => {
    builder.reset();
    navigate('/gallery/set', { replace: true });
    triggerFeedback('Started new visage set. Pick cards from below!');
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 80);
  };

  const handleSendToPlanner = () => {
    if (!filled) {
      triggerFeedback('Equip at least one visage card first');
      return;
    }

    const planner = useBuildPlannerStore.getState();
    planner.setBuildId(null);

    planner.setVisage('core', loadout.core.visage ? (normalizeVisageRow(loadout.core.visage as any) as any) : null);
    planner.setVisage(2, loadout[2].visage ? (normalizeVisageRow(loadout[2].visage as any) as any) : null);
    planner.setVisage(3, loadout[3].visage ? (normalizeVisageRow(loadout[3].visage as any) as any) : null);
    planner.setVisage(4, loadout[4].visage ? (normalizeVisageRow(loadout[4].visage as any) as any) : null);
    planner.setVisage(5, loadout[5].visage ? (normalizeVisageRow(loadout[5].visage as any) as any) : null);

    const updatedInks: Record<string, string> = { ...useBuildPlannerStore.getState().selectedInkTypes };
    if (loadout.core.ink) updatedInks['core'] = loadout.core.ink;
    if (loadout[2].ink) updatedInks['2'] = loadout[2].ink;
    if (loadout[3].ink) updatedInks['3'] = loadout[3].ink;
    if (loadout[4].ink) updatedInks['4'] = loadout[4].ink;
    if (loadout[5].ink) updatedInks['5'] = loadout[5].ink;
    planner.setSelectedInkTypes(updatedInks);

    if (!planner.title && builder.title) {
      planner.setTitle(builder.title);
    }
    if (!planner.description && builder.description) {
      planner.setDescription(builder.description);
    }

    navigate('/armory/planner', { state: { sentVisages: true } });
  };

  const executeSave = async (asNew: boolean) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (!builder.title.trim()) {
      triggerFeedback('Please enter a title for your visage set');
      titleInputRef.current?.focus();
      return;
    }
    if (!filled) {
      triggerFeedback('Equip at least one visage card to save');
      return;
    }

    setIsSaving(true);
    try {
      const updateExisting = !asNew && builder.buildId && isOwner;
      const id = await saveBuild.mutateAsync({
        id: updateExisting ? builder.buildId : null,
        authorId: user.id,
        title: builder.title.trim(),
        description: builder.description.trim(),
        isPublished: builder.isPublished,
        loadout,
      });
      builder.markSaved(id, user.id);
      setIsJustSaved(true);
      triggerFeedback(updateExisting ? 'Changes saved successfully!' : 'Visage set created and saved!');
      setTimeout(() => setIsJustSaved(false), 2500);

      const next = new URLSearchParams(searchParams);
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
    } catch (err: any) {
      console.error('Failed to save build:', err);
      alert(`Failed to save visage set: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRequest = (asNew = false) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (!builder.title.trim()) {
      triggerFeedback('Please enter a title for your visage set');
      titleInputRef.current?.focus();
      return;
    }
    if (!filled) {
      triggerFeedback('Equip at least one visage card to save');
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

    executeSave(asNew);
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
    executeSave(asNew);
  };

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

  const handleConfirmMissingChallenges = async () => {
    try {
      for (const m of missingPrompt) {
        await handleAddVisageChallenge(m.visage, m.ink, collectionMap[`${m.visage.id}:${m.ink}`]?.rarity);
      }
      setNotice(
        `Added ${missingPrompt.length} card${missingPrompt.length > 1 ? 's' : ''} to your Personal Hunter's Challenge.`,
      );
    } catch {
      setMissingError('Failed to add one or more challenges. Please try again.');
      return;
    }
    setMissingPrompt([]);
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

  // Columns for the active set, optionally filtered by search query
  const displayedColumns = useMemo(() => {
    if (!activeSet) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeSet.groupedColumns;

    const hasCardMatches = activeSet.cards.some((c) => cardMatchesSearch(c, q));
    // If no specific card matches in this set, but the set matched by name, show all columns
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

  return (
    <div data-rarity-theme={theme} className="section-theme flex flex-col flex-1 min-h-0 h-full gap-3 p-2 sm:p-3 text-white overflow-hidden">
      {/* ── Top Bar: PageTitlePanel with description, hide/show, and controls ── */}
      <div className="relative z-20 shrink-0">
        <PageTitlePanel
          backButton={
            <Link
              to="/gallery/collection"
              className="btn-mho-panel group !px-2.5 sm:!px-3 !py-1.5 !text-xs shrink-0"
              title="Back to Collection"
            >
              <ArrowLeft size={14} className="text-[var(--text-secondary)] group-hover:text-white transition-colors" />
              <span className="hidden sm:inline">Back to Collection</span>
              <span className="sm:hidden">Collection</span>
            </Link>
          }
          icon="/img/ui/Visage%20Icon.png"
          title="Building Visage Set"
          hidden={introHidden}
          onToggleHidden={toggleIntro}
          description={
            <>
              Assemble a 5-card Visage set (1 Core slot and 4 support slots) within the 25-point cap to activate Ink set
              bonuses and unique core abilities. Search by monster name, set name, or{' '}
              <span className="text-mh-slate-200 font-semibold">Core ability keywords</span> (e.g.{' '}
              <span className="text-mh-gold-300 font-semibold">"water"</span>,{' '}
              <span className="text-mh-gold-300 font-semibold">"affinity"</span>, or{' '}
              <span className="text-mh-gold-300 font-semibold">"coating"</span>) to highlight matching Ink collections and
              filter down directly to those cards. Edit the title and notes on-page, save directly to your sets, or click{' '}
              <span className="text-mh-slate-200 font-semibold">Send to Planner</span> to attach your visage loadout to
              your build.
            </>
          }
        >
          {isLoading && <Loader2 size={14} className="animate-spin text-[var(--theme-accent)] shrink-0" />}

          {/* Upvote Button (only if saved build) */}
          {isSavedBuild && (
            <button
              type="button"
              onClick={handleUpvote}
              disabled={isVoting}
              className={`relative whitespace-nowrap text-xs sm:text-sm py-1.5 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 transition-all font-medium border shadow-sm ${
                hasUpvoted
                  ? 'bg-[var(--bg-superior)] text-[var(--theme-accent)] border-[var(--border-active)] cursor-pointer'
                  : 'bg-black/30 hover:bg-white/10 text-white border-[var(--border-subtle)] hover:border-[var(--theme-accent)] active:scale-95 cursor-pointer'
              }`}
              title={hasUpvoted ? 'Remove your upvote' : 'Upvote this set'}
            >
              {isUpvoteAnimating && (
                <span className="absolute -top-3.5 right-1 text-xs font-black text-amber-300 pointer-events-none animate-bounce drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]">
                  {hasUpvoted ? '+1' : '-1'}
                </span>
              )}
              <ThumbsUp
                size={14}
                className={`transition-transform duration-300 ${
                  isUpvoteAnimating ? 'scale-125 rotate-[-12deg]' : ''
                } ${hasUpvoted ? 'text-amber-400 fill-amber-400/40' : 'text-[var(--text-secondary)]'}`}
              />
              <span className="hidden md:inline">{hasUpvoted ? 'Upvoted' : 'Upvote'}</span>
              <span
                className={`rounded px-1.5 py-0.2 text-[11px] font-bold transition-all duration-300 ${
                  isUpvoteAnimating ? 'scale-125 text-amber-200 bg-amber-500/40' : ''
                } ${
                  hasUpvoted
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                    : 'bg-black/30 text-[var(--rarity-rare)] border border-[var(--border-subtle)]'
                }`}
              >
                {loadedBuild?.upvotes ?? 0}
              </span>
            </button>
          )}

          {/* Copy Link Button (only if saved build) */}
          {isSavedBuild && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn-mho-panel whitespace-nowrap !text-xs sm:!text-sm !py-1.5 !px-2 sm:!px-2.5 flex items-center gap-1.5 text-mh-slate-300 hover:text-white"
              title="Copy link to this visage build"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Link'}</span>
            </button>
          )}

          {/* Send to Planner Button */}
          <button
            type="button"
            onClick={handleSendToPlanner}
            disabled={!filled}
            className="btn-mho-panel whitespace-nowrap !text-xs sm:!text-sm !py-1.5 !px-2.5 sm:!px-3 flex items-center gap-1.5 text-amber-300 hover:text-white hover:border-amber-400/50 disabled:opacity-40"
            title="Send this visage set to the Build Planner"
          >
            <Compass size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Send to Planner</span>
            <span className="sm:hidden">Planner</span>
          </button>

          {/* Save Changes / Save Set */}
          {(!isSavedBuild || isOwner) && (
            <button
              type="button"
              onClick={() => handleSaveRequest(false)}
              disabled={!filled || isSaving}
              className={`whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3.5 flex items-center gap-1.5 rounded-lg font-bold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                isJustSaved
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-105'
                  : 'btn-mho-gold !px-2.5 sm:!px-3.5 !py-1.5 !text-xs sm:!text-sm'
              }`}
              title={isSavedBuild ? 'Save Changes' : 'Save Set'}
            >
              {isJustSaved ? (
                <CheckCircle2 size={14} className="text-emerald-400 animate-pulse" />
              ) : (
                <Save size={14} />
              )}
              <span className="hidden sm:inline">
                {isJustSaved ? 'Saved!' : isSavedBuild ? 'Save Changes' : 'Save Set'}
              </span>
              <span className="sm:hidden">
                {isJustSaved ? 'Saved!' : 'Save'}
              </span>
            </button>
          )}

          {/* Clear / Start New Button */}
          <button
            type="button"
            onClick={handleClearStartNew}
            className="btn-mho-panel whitespace-nowrap !text-xs sm:!text-sm !py-1.5 !px-2 sm:!px-2.5"
            title="Clear all selections and start a new visage set"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">Clear</span>
          </button>
        </PageTitlePanel>

        {/* ── Builder Meta Dock: Title, Card Source Toggle, Points Meter, Notes / Description ── */}
        <div className="mho-panel flex flex-col landscape:flex-row md:flex-row gap-2.5 sm:gap-3 items-stretch landscape:items-center md:items-center justify-between p-2.5 sm:px-4 py-2.5 shadow-md mt-2">
          {/* Title, Source Toggle, Points Meter */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
            <input
              ref={titleInputRef}
              type="text"
              placeholder="Visage Set Title (e.g. Master's Touch Dragon Visage)"
              className="w-full bg-transparent border-b border-[var(--border-subtle)] hover:border-white/30 focus:border-[#FFD700] font-display text-base sm:text-lg font-bold text-white focus:ring-0 px-1 py-1 placeholder-[var(--text-secondary)] transition-colors"
              value={builder.title}
              onChange={(e) => builder.setMeta({ title: e.target.value })}
            />

            {/* Card source toggle */}
            <div className="flex rounded-md bg-black/30 p-0.5 border border-[var(--border-subtle)] shrink-0 text-[10px] font-bold">
              {(['mine', 'any'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    builder.setSourceMode(m);
                    triggerFeedback(m === 'mine' ? 'Filtering to your collected cards' : 'Showing all cards');
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded transition-all',
                    builder.sourceMode === m
                      ? 'bg-gradient-to-b from-[#EAD17A] to-[#C9A042] text-[#1A1408]'
                      : 'text-[var(--text-secondary)] hover:text-white',
                  )}
                >
                  {m === 'mine' ? '📦 My Cards' : '🌐 Any'}
                </button>
              ))}
            </div>

            {/* Points meter */}
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border tabular-nums',
                totalPoints > VISAGE_POINT_CAP
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-black/30 text-[var(--rarity-rare)] border border-[var(--border-subtle)]',
              )}
              title={`Total visage points: ${totalPoints} / ${VISAGE_POINT_CAP}`}
            >
              {totalPoints} / {VISAGE_POINT_CAP} pts
            </span>
          </div>

          {/* Compact Notes field */}
          <div className="w-full landscape:w-[280px] md:w-[320px] lg:w-[380px] shrink-0">
            <input
              type="text"
              placeholder="Notes or strategy description (optional)..."
              className="w-full bg-black/30 border border-[var(--border-subtle)] hover:border-white/30 rounded-lg text-xs text-white focus:border-[#FFD700]/70 focus:ring-0 px-3 py-1.5 placeholder-[var(--text-secondary)] transition-colors"
              value={builder.description}
              onChange={(e) => builder.setMeta({ description: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Main Book Container ── */}
      <div className="@container flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 flex-col @[1250px]:flex-row gap-3 overflow-hidden">
          {/* ── Compact Sets Strip on top (narrow containers) ── */}
          <div className="mho-panel-deep @[1250px]:hidden shrink-0 flex flex-col min-h-0">
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

                    {searchQuery.trim() ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {s.cards.filter((c) => cardMatchesSearch(c, searchQuery.toLowerCase().trim())).length}
                      </span>
                    ) : (
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
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Left Sidebar: Sets List (wide containers) ── */}
          <div className="mho-panel-deep hidden @[1250px]:flex w-72 @[1500px]:w-80 shrink-0 flex-col min-h-0 overflow-hidden">
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
                            {searchQuery.trim() ? (
                              <span className="text-amber-300 font-semibold">
                                {s.cards.filter((c) => cardMatchesSearch(c, searchQuery.toLowerCase().trim())).length} matching card{s.cards.filter((c) => cardMatchesSearch(c, searchQuery.toLowerCase().trim())).length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              `${s.cards.length} Visages`
                            )}
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

          {/* ── Right Content: Cards Grid without the Ink header ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 lg:p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <Loader2 size={32} className="animate-spin text-[#FFD700] mb-3" />
                <p className="text-sm font-bold text-mh-slate-300">Loading Visage Sets…</p>
              </div>
            ) : activeSet ? (
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                {/* Notice: The active set header ("Ink of Flames") has been removed to move the cards panel higher */}

                {/* Inline Builder Panel (narrower containers) */}
                <div className="@[1640px]:hidden">
                  <VisageBuilderPanel
                    sets={sets}
                    visages={dbVisages}
                    collectionMap={collectionMap}
                    notice={notice}
                    onNotice={setNotice}
                  />
                </div>

                {/* ── Columns Grouped by Points ── */}
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
                              onClick={() => handleBuildCardClick(card, activeSet.id)}
                              buildMode={true}
                              isCoreCard={loadout.core.visage?.id === card.id}
                              buildCount={buildCountFor(card.id, activeSet.id)}
                              buildDisabled={Boolean(getBuildBlock(card, activeSet.id))}
                              buildDisabledReason={getBuildBlock(card, activeSet.id) ?? undefined}
                              onInspect={() => setInspectedCard(card)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-white/5 py-12 px-6 text-center">
                    <h3 className="font-display text-sm font-bold text-mh-slate-300">
                      {searchQuery.trim()
                        ? `No cards in ${activeSet.name} match "${searchQuery}"`
                        : `No Visage cards for ${activeSet.name} in Supabase yet`}
                    </h3>
                  </div>
                )}

                {/* ── Set Bonus Skills Section (Directly underneath the groups) ── */}
                <div className="mho-card-rarity rarity-theme-standard p-5 shadow-lg space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#FFD700]">
                    <span>{activeSet.name} Bonus</span>
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-mh-slate-500 min-h-[300px]">
                <Layers size={48} className="mb-3 opacity-30 text-mh-gold-400" />
                <h3 className="font-display text-base font-bold text-mh-slate-300">
                  No Visage Sets Found in Database
                </h3>
              </div>
            )}
          </div>

          {/* ── Builder Column (wide containers) ── */}
          <div className="mho-panel-deep hidden @[1640px]:block w-[380px] @[1900px]:w-[420px] shrink-0 overflow-y-auto p-4 min-h-0">
            <VisageBuilderPanel
              sets={sets}
              visages={dbVisages}
              collectionMap={collectionMap}
              notice={notice}
              onNotice={setNotice}
            />
          </div>
        </div>
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

      {/* ── Card Detail Modal (if inspected) ── */}
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

      {/* ── Selection & Save Feedback Notification Toast ── */}
      {selectionFeedback && (
        <div className="fixed bottom-24 lg:bottom-6 right-6 z-50 flex items-center gap-2 mho-panel-deep !border-[var(--border-active)] text-white text-xs font-semibold px-4 py-2.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{selectionFeedback}</span>
        </div>
      )}
    </div>
  );
}
