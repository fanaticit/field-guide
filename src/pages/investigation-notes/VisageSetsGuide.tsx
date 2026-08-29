import { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Sparkles,
  Layers,
  Info,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useVisageSetsData } from '../../hooks/useVisageSets';
import { type DBVisage, getInkConfig } from '../../data/schemas/visage';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore, selectIsAdmin } from '../../store/authStore';
import VisageCard, { InkIconComponent } from './VisageCard';
import VisageModal from './VisageModal';
import { cn } from '../../lib/utils';

type SortOption = 'default' | 'name' | 'progress';

export default function VisageSetsGuide() {
  const { sets, dbVisages, isLoading, refetch, isCollected, toggleCollected } = useVisageSetsData();
  const isAdmin = useAuthStore(selectIsAdmin);
  const { setActivePage, setAdminSubPage } = useUIStore();

  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [sortAsc, setSortAsc] = useState(true);
  const [inspectedCard, setInspectedCard] = useState<DBVisage | null>(null);

  // Filter and sort the sets list on the left
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

    if (sortOption === 'name') {
      list.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    } else if (sortOption === 'progress') {
      list.sort((a, b) => {
        const ratioA = a.totalCards > 0 ? a.collectedCards / a.totalCards : 0;
        const ratioB = b.totalCards > 0 ? b.collectedCards / b.totalCards : 0;
        return sortAsc ? ratioA - ratioB : ratioB - ratioA;
      });
    }

    return list;
  }, [sets, searchQuery, filterMode, sortOption, sortAsc]);

  // Currently selected active set
  const activeSet = useMemo(() => {
    if (selectedSetId) {
      const found = sets.find((s) => s.id === selectedSetId);
      if (found) return found;
    }
    return sets[0] || null;
  }, [sets, selectedSetId]);

  const activeInkCfg = activeSet ? getInkConfig(activeSet.id) : getInkConfig('flames');

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] bg-gradient-to-b from-[#131722] via-[#0d1017] to-[#0a0c10] text-mh-slate-100">
      {/* ── Subheader Banner ── */}
      <div className="border-b border-mh-slate-800/80 bg-mh-slate-950/70 px-6 py-3.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mh-gold-500/10 border border-mh-gold-500/30 text-mh-gold-400">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-mh-slate-100">
                  Visage Sets Album
                </h2>
                <span className="rounded-full bg-mh-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-mh-gold-300 border border-mh-gold-500/30">
                  MHO Beta
                </span>
              </div>
              <p className="text-xs text-mh-slate-400">
                Collect monster visages to assemble powerful elemental and offensive ink sets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {isLoading && (
              <div className="flex items-center gap-1 text-mh-slate-400">
                <Loader2 size={13} className="animate-spin text-mh-gold-400" />
                <span>Syncing…</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg bg-mh-slate-900 px-3 py-1.5 border border-mh-slate-800">
              <Sparkles size={13} className="text-mh-gold-400" />
              <span className="text-mh-slate-400">Total Sets:</span>
              <span className="font-bold text-mh-slate-200">{sets.length}</span>
              <span className="text-mh-slate-600 mx-1">|</span>
              <span className="text-mh-slate-400">Cards:</span>
              <span className="font-bold text-mh-gold-400">{dbVisages.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Book Container ── */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* ── Left Sidebar: Sets List ── */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-mh-slate-800/80 bg-[#0e121a]/95 flex flex-col">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-mh-slate-800/80 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sets or monsters…"
                className="w-full rounded-lg border border-mh-slate-750 bg-mh-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              />
            </div>

            <div className="flex items-center justify-between gap-1 text-xs">
              {/* Filter mode */}
              <div className="flex rounded-md border border-mh-slate-750 bg-mh-slate-900 p-0.5 text-[11px]">
                <button
                  onClick={() => setFilterMode('all')}
                  className={cn(
                    'rounded px-2 py-0.5 font-medium transition-colors',
                    filterMode === 'all' ? 'bg-mh-gold-500 text-slate-950 font-bold' : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMode('complete')}
                  className={cn(
                    'rounded px-2 py-0.5 font-medium transition-colors',
                    filterMode === 'complete' ? 'bg-mh-gold-500 text-slate-950 font-bold' : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  8/8
                </button>
                <button
                  onClick={() => setFilterMode('incomplete')}
                  className={cn(
                    'rounded px-2 py-0.5 font-medium transition-colors',
                    filterMode === 'incomplete' ? 'bg-mh-gold-500 text-slate-950 font-bold' : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  Incomplete
                </button>
              </div>

              {/* Sort button */}
              <div className="flex items-center gap-1">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="rounded border border-mh-slate-750 bg-mh-slate-900 px-2 py-1 text-[11px] text-mh-slate-300 outline-none"
                >
                  <option value="default">Default</option>
                  <option value="name">Name</option>
                  <option value="progress">Progress</option>
                </select>
                <button
                  onClick={() => setSortAsc((prev) => !prev)}
                  title="Toggle sort direction"
                  className="rounded border border-mh-slate-750 bg-mh-slate-900 p-1 text-mh-slate-400 hover:text-white"
                >
                  <ArrowUpDown size={12} />
                </button>
                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  title="Refresh from Supabase"
                  className="rounded border border-mh-slate-750 bg-mh-slate-900 p-1 text-mh-slate-400 hover:text-mh-gold-400 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={cn(isLoading && 'animate-spin')} />
                </button>
              </div>
            </div>
          </div>

          {/* Sets List Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[360px] lg:max-h-[calc(100vh-230px)]">
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
                      'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all duration-150',
                      'border',
                      isSelected
                        ? 'bg-gradient-to-r from-mh-slate-850 via-[#1b2230] to-mh-slate-850 border-mh-gold-400 text-white shadow-lg ring-1 ring-mh-gold-400/40'
                        : 'bg-mh-slate-900/60 border-mh-slate-800/80 text-mh-slate-300 hover:bg-mh-slate-850/80 hover:border-mh-slate-700',
                    )}
                  >
                    {/* Left Icon + Set Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-sm',
                          cfg.bg,
                          cfg.border,
                          cfg.text,
                        )}
                      >
                        <InkIconComponent iconName={cfg.iconName} size={14} />
                      </div>
                      <span
                        className={cn(
                          'font-display text-sm font-semibold truncate',
                          isSelected ? 'text-mh-gold-300 font-bold' : 'text-mh-slate-200',
                        )}
                      >
                        {s.name}
                      </span>
                    </div>

                    {/* Right Progress Counter (e.g. 8/8) */}
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span
                        className={cn(
                          'font-mono text-xs font-bold px-2 py-0.5 rounded-full border',
                          isComplete
                            ? 'bg-green-500/15 text-green-400 border-green-500/30'
                            : 'bg-mh-slate-800 text-mh-slate-400 border-mh-slate-700',
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

        {/* ── Right Content Area: Active Set View ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0c0f16]/90 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeSet ? (
            <div className="max-w-6xl mx-auto w-full space-y-6">
              {/* Set Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border shadow-md',
                      activeInkCfg.bg,
                      activeInkCfg.border,
                      activeInkCfg.text,
                    )}
                  >
                    <InkIconComponent iconName={activeInkCfg.iconName} size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="font-display text-xl sm:text-2xl font-bold text-mh-slate-100 tracking-wide">
                        {activeSet.name}
                      </h1>
                      <span className="font-mono text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-md">
                        {activeSet.collectedCards}/{activeSet.totalCards}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-mh-slate-400 flex items-center gap-1.5">
                  <span className="text-mh-slate-500">Click any card to inspect stats &amp; effect</span>
                </div>
              </div>

              {/* ── Columns Grouped by Points ── */}
              {activeSet.groupedColumns.length > 0 ? (
                <div className="flex flex-wrap lg:flex-nowrap gap-4 sm:gap-6 items-start overflow-x-auto pb-3">
                  {activeSet.groupedColumns.map((col) => (
                    <div
                      key={col.points}
                      className="flex-1 min-w-[200px] max-w-[340px] rounded-2xl border border-mh-slate-800 bg-[#121622]/80 p-4 shadow-md backdrop-blur-sm"
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between border-b border-mh-slate-750 pb-2.5 mb-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-mh-slate-200">
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
                            isCollected={isCollected(card.id)}
                            onToggleCollected={(e) => {
                              e.stopPropagation();
                              toggleCollected(card.id);
                            }}
                            onClick={() => setInspectedCard(card)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-mh-slate-800 bg-mh-slate-900/40 py-12 px-6 text-center">
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl border mb-3', activeInkCfg.bg, activeInkCfg.border, activeInkCfg.text)}>
                    <InkIconComponent iconName={activeInkCfg.iconName} size={24} />
                  </div>
                  <h3 className="font-display text-sm font-bold text-mh-slate-300">
                    No Visage cards for {activeSet.name} in Supabase yet
                  </h3>
                  <p className="text-xs text-mh-slate-500 mt-1 max-w-sm">
                    Cards assigned to this ink in the database will automatically appear here grouped by their points.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActivePage('admin');
                        setAdminSubPage('visages');
                      }}
                      className="mt-4 flex items-center gap-1.5 rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3.5 py-1.5 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 transition-colors"
                    >
                      <Plus size={13} />
                      Add Cards in Admin Panel
                    </button>
                  )}
                </div>
              )}

              {/* ── Set Bonus Skills Section (Directly underneath the groups) ── */}
              <div className="rounded-2xl border border-mh-gold-500/30 bg-gradient-to-r from-[#171c2b] via-[#141926] to-[#171c2b] p-5 shadow-lg space-y-3">
                {/* Title */}
                <div className="flex items-center gap-2 text-sm font-bold text-mh-gold-400">
                  <div className={cn('flex h-5 w-5 items-center justify-center rounded', activeInkCfg.text)}>
                    <InkIconComponent iconName={activeInkCfg.iconName} size={15} />
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

              {/* ── Footer Tip Banner ── */}
              <div className="flex items-start gap-2.5 rounded-xl border border-mh-slate-800/80 bg-mh-slate-950/60 p-4 text-xs text-mh-slate-400">
                <Info size={16} className="text-mh-gold-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <span className="font-semibold text-mh-slate-300">Tip:</span> Collect{' '}
                  <span className="text-amber-400 font-medium">new</span> or{' '}
                  <span className="text-amber-400 font-medium">higher-quality</span> Visages to gain experience and increase your{' '}
                  <span className="text-mh-gold-400 font-medium">Visage Album level</span>.
                </p>
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
                  onClick={() => {
                    setActivePage('admin');
                    setAdminSubPage('visages');
                  }}
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

      {/* ── Card Detail Modal ── */}
      <VisageModal
        card={inspectedCard}
        open={inspectedCard !== null}
        isCollected={inspectedCard ? isCollected(inspectedCard.id) : false}
        onToggleCollected={() => {
          if (inspectedCard) toggleCollected(inspectedCard.id);
        }}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
}
