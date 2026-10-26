// ─────────────────────────────────────────────────────────────
// VisageBuilds — Browse and search published Visage Sets on the site.
// Displays active set bonuses, point totals, and whether the user
// can assemble the loadout with their owned card collection.
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Trash2,
  User,
  Calendar,
  Layers,
  LayoutGrid,
  List,
  Star,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useVisageSetsData } from '../hooks/useVisageSets';
import {
  useVisageBuildsList,
  useDeleteVisageBuild,
  useUserVisageFavorites,
} from '../hooks/useVisageBuilds';
import { useVisageBuilderStore } from '../store/visageBuilderStore';
import {
  rowToLoadout,
  getBuildability,
  getActiveSetBonuses,
  getDuplicateIds,
  VISAGE_POINT_CAP,
  type VisageBuildRow as TVisageBuildRow,
} from '../lib/visageBuild';
import { getInkConfig, INK_OPTIONS } from '../data/schemas/visage';
import VisageLoadoutStrip from '../components/visage-builder/VisageLoadoutStrip';
import VisageBuildRow from '../components/visage-builder/VisageBuildRow';
import { InkIconComponent } from './investigation-notes/VisageCard';
import { cn } from '../lib/utils';

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

export default function VisageBuilds() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: rawBuilds = [], isLoading: isLoadingBuilds, error: buildsError } = useVisageBuildsList();
  const { sets, dbVisages, collectionMap, isLoading: isLoadingVisages } = useVisageSetsData();
  const deleteBuild = useDeleteVisageBuild();
  const builder = useVisageBuilderStore();
  const { favorites, favoritesSet, toggleFavorite } = useUserVisageFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [inkFilter, setInkFilter] = useState<string>('all');
  const [buildableOnly, setBuildableOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [viewMode, setViewModeState] = useState<'panel' | 'list'>(() => {
    const saved = getCookie('visage_builds_view_mode');
    if (saved === 'panel' || saved === 'list') {
      return saved;
    }
    return isMobileDevice() ? 'list' : 'panel';
  });

  const setViewMode = (mode: 'panel' | 'list') => {
    setViewModeState(mode);
    setCookie('visage_builds_view_mode', mode);
  };

  const visagesById = useMemo(() => new Map(dbVisages.map((v) => [v.id, v])), [dbVisages]);

  // Process rows with converted loadout, buildability, and set bonuses
  const processedBuilds = useMemo(() => {
    return rawBuilds.map((row) => {
      const loadout = rowToLoadout(row, visagesById);
      const buildability = getBuildability(loadout, collectionMap);
      const activeBonuses = getActiveSetBonuses(loadout, sets);
      const duplicateIds = getDuplicateIds(loadout);

      const missingKeys = new Set(buildability.missing.map((m) => `${m.visage.id}:${m.ink}`));

      return {
        row,
        loadout,
        buildability,
        activeBonuses,
        duplicateIds,
        missingKeys,
      };
    });
  }, [rawBuilds, visagesById, collectionMap, sets]);

  // Filtered builds
  const filtered = useMemo(() => {
    return processedBuilds.filter(({ row, loadout, buildability, activeBonuses }) => {
      // 0. Favorites only
      if (favoritesOnly && !favoritesSet.has(row.id)) return false;

      // 1. Mine only
      if (mineOnly && row.author_id !== user?.id) return false;

      // 2. Buildable only
      if (buildableOnly && !buildability.buildable) return false;

      // 3. Ink filter
      if (inkFilter !== 'all') {
        const matchesInk =
          activeBonuses.some((b) => b.ink === inkFilter) ||
          Object.values(loadout).some((s) => s.ink === inkFilter);
        if (!matchesInk) return false;
      }

      // 4. Search query (title, author, card names)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = row.title.toLowerCase().includes(q);
        const matchesDesc = row.description?.toLowerCase().includes(q) ?? false;
        const matchesAuthor = row.author?.username?.toLowerCase().includes(q) ?? false;
        const matchesCards = Object.values(loadout).some(
          (s) => s.visage && s.visage.name.toLowerCase().includes(q),
        );
        if (!matchesTitle && !matchesDesc && !matchesAuthor && !matchesCards) return false;
      }

      return true;
    });
  }, [processedBuilds, favoritesOnly, favoritesSet, mineOnly, user, buildableOnly, inkFilter, searchQuery]);

  const handleOpenInBuilder = (row: TVisageBuildRow) => {
    const loadout = rowToLoadout(row, visagesById);
    builder.load({
      buildId: row.id,
      authorId: row.author_id,
      title: row.title,
      description: row.description ?? '',
      isPublished: row.is_published,
      loadout,
    });
    navigate(`/investigation-notes/visages?mode=builder&build=${row.id}`);
  };

  const handleDuplicate = (row: TVisageBuildRow) => {
    const loadout = rowToLoadout(row, visagesById);
    builder.load({
      buildId: null, // Detached as new build
      authorId: null,
      title: `${row.title} (Copy)`,
      description: row.description ?? '',
      isPublished: true,
      loadout,
    });
    navigate(`/investigation-notes/visages?mode=builder`);
  };

  const handleDelete = async (row: TVisageBuildRow) => {
    if (!window.confirm(`Delete Visage build "${row.title}"?`)) return;
    try {
      await deleteBuild.mutateAsync(row.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete build');
    }
  };

  const isLoading = isLoadingBuilds || isLoadingVisages;

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-b from-[#131722] via-[#0d1017] to-[#0a0c10] text-mh-slate-100">
      {/* ── Subheader Banner ── */}
      <div className="shrink-0 border-b border-mh-slate-800/80 bg-gradient-to-r from-[#191e2b] via-[#141824] to-[#191e2b] px-6 py-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-mh-gold-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-mh-gold-400">
                Hunter's Armory
              </span>
              <span className="text-xs text-mh-slate-400">&bull; Shared Visage Sets</span>
              {isLoading && (
                <div className="flex items-center gap-1 text-mh-slate-400 ml-2 text-xs">
                  <Loader2 size={12} className="animate-spin text-mh-gold-400" />
                  <span>Loading…</span>
                </div>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-mh-slate-100 flex items-center gap-2.5">
              <Sparkles className="text-mh-gold-400" size={24} />
              <span>Visage Sets Directory</span>
            </h1>
            <p className="text-xs text-mh-slate-300">
              Browse community-shared Visage builds and instantly see which ones you can assemble with your cards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                builder.reset();
                navigate('/investigation-notes/visages?mode=builder');
              }}
              className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-mh-gold-400 shadow-md transition-all shrink-0"
            >
              <Plus size={15} />
              <span>New Visage Build</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── Filter Controls Bar ── */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#121622]/90 border border-mh-slate-800 p-3 sm:p-4 rounded-2xl shadow-md">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by build title, card, or author…"
              className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-900/90 py-2 pl-9 pr-3 text-xs text-mh-slate-200 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          {/* Quick Filters Group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ink Set Dropdown */}
            <select
              value={inkFilter}
              onChange={(e) => setInkFilter(e.target.value)}
              className="rounded-xl border border-mh-slate-750 bg-mh-slate-900 px-3 py-2 text-xs font-semibold text-mh-slate-200 outline-none focus:border-mh-gold-500/50"
            >
              <option value="all">All Ink Sets</option>
              {INK_OPTIONS.map((ink) => (
                <option key={ink} value={ink}>
                  {getInkConfig(ink).name}
                </option>
              ))}
            </select>

            {/* Favorites toggle */}
            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all select-none',
                favoritesOnly
                  ? 'border-mh-gold-500/50 bg-mh-gold-500/20 text-mh-gold-300 ring-1 ring-mh-gold-500/30'
                  : 'border-mh-slate-750 bg-mh-slate-900 text-mh-slate-400 hover:text-white',
              )}
            >
              <Star
                size={13}
                className={cn(favoritesOnly ? 'fill-mh-gold-400 text-mh-gold-400' : 'text-mh-slate-500')}
              />
              <span>Favorites {favorites.length > 0 && `(${favorites.length})`}</span>
            </button>

            {/* Buildable with my cards toggle */}
            {user && (
              <button
                type="button"
                onClick={() => setBuildableOnly((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all select-none',
                  buildableOnly
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'border-mh-slate-750 bg-mh-slate-900 text-mh-slate-400 hover:text-white',
                )}
              >
                <CheckCircle2 size={13} className={buildableOnly ? 'text-emerald-400' : 'text-mh-slate-500'} />
                <span>Buildable Only</span>
              </button>
            )}

            {/* My builds toggle */}
            {user && (
              <button
                type="button"
                onClick={() => setMineOnly((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all select-none',
                  mineOnly
                    ? 'border-mh-gold-500/50 bg-mh-gold-500/20 text-mh-gold-300 ring-1 ring-mh-gold-500/30'
                    : 'border-mh-slate-750 bg-mh-slate-900 text-mh-slate-400 hover:text-white',
                )}
              >
                <User size={13} className={mineOnly ? 'text-mh-gold-400' : 'text-mh-slate-500'} />
                <span>My Builds</span>
              </button>
            )}

            {/* View Mode Toggle: Panel / List */}
            <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => setViewMode('panel')}
                title="Panel / Grid View"
                className={cn(
                  'flex items-center justify-center p-1.5 rounded-lg transition-colors',
                  viewMode === 'panel'
                    ? 'bg-mh-slate-800 text-mh-gold-400 shadow-sm'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                className={cn(
                  'flex items-center justify-center p-1.5 rounded-lg transition-colors',
                  viewMode === 'list'
                    ? 'bg-mh-slate-800 text-mh-gold-400 shadow-sm'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {buildsError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex items-center justify-between">
            <span>Failed to load visage builds: {buildsError instanceof Error ? buildsError.message : 'Unknown error'}</span>
          </div>
        )}

        {/* ── Builds Display (Grid or List) ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={32} className="animate-spin text-mh-gold-400 mb-3" />
            <p className="text-sm font-bold text-mh-slate-300">Loading Visage Sets…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-800 bg-mh-slate-900/40 py-16 px-6 text-center">
            <Layers size={40} className="text-mh-gold-400/40 mb-3" />
            <h3 className="font-display text-base font-bold text-mh-slate-300">No Visage Sets Found</h3>
            <p className="text-xs text-mh-slate-500 mt-1 max-w-sm">
              {favoritesOnly
                ? "You haven't favorited any visage sets yet. Click the star icon on any visage build to add it to your favorites."
                : buildableOnly
                ? "You don't currently have the cards to assemble any of the matching builds. Try unchecking 'Buildable Only'."
                : 'No visage builds match your filters. Be the first to build and share one!'}
            </p>
            <button
              onClick={() => {
                builder.reset();
                navigate('/investigation-notes/visages?mode=builder');
              }}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-mh-gold-400 transition-colors shadow-sm"
            >
              <Plus size={14} />
              Create a Visage Build
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* ── List View ── */
          <div className="flex flex-col space-y-2.5">
            {filtered.map(({ row, loadout, buildability, activeBonuses, duplicateIds, missingKeys }) => (
              <VisageBuildRow
                key={row.id}
                row={row}
                loadout={loadout}
                buildability={buildability}
                activeBonuses={activeBonuses}
                duplicateIds={duplicateIds}
                missingKeys={missingKeys}
                isFavorite={favoritesSet.has(row.id)}
                isAuthor={user?.id === row.author_id}
                isSignedIn={Boolean(user)}
                onToggleFavorite={() => toggleFavorite(row.id)}
                onOpenInBuilder={() => handleOpenInBuilder(row)}
                onDuplicate={() => handleDuplicate(row)}
                onDelete={() => handleDelete(row)}
              />
            ))}
          </div>
        ) : (
          /* ── Panel / Grid View ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(({ row, loadout, buildability, activeBonuses, duplicateIds, missingKeys }) => {
              const isAuthor = user?.id === row.author_id;
              const isFav = favoritesSet.has(row.id);
              const dateStr = new Date(row.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={row.id}
                  className="flex flex-col justify-between rounded-2xl border border-mh-slate-800 bg-[#121622]/90 hover:border-mh-slate-700 hover:shadow-xl transition-all p-4 space-y-3.5 group backdrop-blur-sm"
                >
                  {/* Card Header: Title & Meta */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(row.id);
                          }}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          className={cn(
                            'p-1 -ml-1 rounded-md transition-colors shrink-0',
                            isFav
                              ? 'text-mh-gold-400 hover:text-mh-gold-300'
                              : 'text-mh-slate-600 hover:text-mh-gold-400 hover:bg-mh-slate-800',
                          )}
                        >
                          <Star
                            size={16}
                            className={cn(isFav && 'fill-mh-gold-400')}
                          />
                        </button>

                        <h3
                          onClick={() => handleOpenInBuilder(row)}
                          className="font-display text-base font-bold text-mh-slate-100 hover:text-mh-gold-400 cursor-pointer transition-colors leading-snug line-clamp-1"
                        >
                          {row.title}
                        </h3>
                      </div>

                      {/* Points badge */}
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-mh-slate-800 text-mh-slate-300 border border-mh-slate-700">
                        {row.total_points} / {VISAGE_POINT_CAP} pts
                      </span>
                    </div>

                    {/* Author & date & privacy */}
                    <div className="flex items-center gap-2 text-[11px] text-mh-slate-500">
                      <span className="flex items-center gap-1 truncate">
                        <User size={11} />
                        <span className="truncate text-mh-slate-400">
                          {row.author?.username || (isAuthor ? 'You' : 'Hunter')}
                        </span>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar size={11} />
                        <span>{dateStr}</span>
                      </span>
                      {!row.is_published && (
                        <>
                          <span>&bull;</span>
                          <span className="text-amber-400 text-[10px] font-bold">Draft</span>
                        </>
                      )}
                    </div>

                    {row.description && (
                      <p className="text-xs text-mh-slate-400 line-clamp-2 leading-relaxed pt-0.5">
                        {row.description}
                      </p>
                    )}
                  </div>

                  {/* ── 5-Slot Card Artwork Strip ── */}
                  <div className="py-1">
                    <VisageLoadoutStrip loadout={loadout} missingKeys={missingKeys} />
                  </div>

                  {/* ── Active Ink Set Bonuses & Core Effect ── */}
                  <div className="space-y-2 pt-1 border-t border-mh-slate-800/80">
                    {/* Active Set Bonuses Badges */}
                    {activeBonuses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {activeBonuses.map((b) => {
                          const cfg = getInkConfig(b.ink);
                          const activeTier = b.achieved[b.achieved.length - 1];
                          return (
                            <span
                              key={b.ink}
                              className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border',
                                cfg.bg,
                                cfg.border,
                                cfg.text,
                              )}
                              title={`${b.name} (${b.count} cards)${activeTier ? ` - ${activeTier.pieces}pc effect active` : ''}`}
                            >
                              <InkIconComponent iconName={cfg.iconName} size={10} />
                              <span>{cfg.shortName}</span>
                              <span className="opacity-70 font-mono">({b.count})</span>
                              {activeTier && (
                                <span className="ml-0.5 bg-black/40 px-1 rounded text-[9px] text-white">
                                  {activeTier.pieces}pc
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[10px] text-mh-slate-500 italic">No set bonus active</span>
                    )}

                    {/* Core effect summary */}
                    {loadout.core.visage && (
                      <p className="text-[11px] text-mh-slate-400 line-clamp-1 italic">
                        <span className="text-rarity-5 font-semibold not-italic">Core: </span>
                        {loadout.core.visage.core_effect || loadout.core.visage.name}
                      </p>
                    )}

                    {/* Duplicate Warning */}
                    {duplicateIds.length > 0 && (
                      <p className="text-[10px] text-amber-400 flex items-center gap-1">
                        <span>⚠ Duplicate cards equip — effects do not stack</span>
                      </p>
                    )}
                  </div>

                  {/* ── Buildability Status & Action Bar ── */}
                  <div className="pt-2 border-t border-mh-slate-800/80 flex items-center justify-between gap-2">
                    {/* Buildability Badge */}
                    <div>
                      {user ? (
                        buildability.buildable ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <CheckCircle2 size={13} />
                            <span>Ready to Build</span>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1 text-[11px] font-semibold text-amber-400"
                            title={`Missing: ${buildability.missing.map((m) => `${m.visage.name} (${getInkConfig(m.ink).shortName})`).join(', ')}`}
                          >
                            <AlertCircle size={12} className="shrink-0" />
                            <span>
                              Missing {buildability.missing.length} card{buildability.missing.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-[10px] text-mh-slate-500">Sign in to check cards</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDuplicate(row)}
                        title="Copy to Builder"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-mh-slate-750 bg-mh-slate-900 text-mh-slate-400 hover:text-white hover:border-mh-slate-600 transition-colors"
                      >
                        <Copy size={13} />
                      </button>

                      {isAuthor && (
                        <button
                          onClick={() => handleDelete(row)}
                          title="Delete build"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-mh-slate-750 bg-mh-slate-900 text-rose-400 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenInBuilder(row)}
                        className="flex items-center gap-1.5 rounded-lg bg-mh-slate-800 border border-mh-slate-750 hover:bg-mh-slate-700 hover:border-mh-gold-500/50 px-2.5 py-1 text-xs font-bold text-mh-slate-200 hover:text-white transition-all"
                      >
                        <span>{isAuthor ? 'Edit' : 'Open'}</span>
                        <ExternalLink size={12} className="text-mh-gold-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
