// ─────────────────────────────────────────────────────────────
// VisageBuilderPanel — editable Core + 4 loadout tray with points
// meter, per-slot ink picker, card picker, card-source toggle,
// buildability summary, live effects and save actions.
// Visuals are lifted from build-planner/VisageSelector.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Copy, Library, Plus, RotateCcw, Save, Search, Check, Sparkles } from 'lucide-react';
import { getInkConfig, type DBVisage } from '../../data/schemas/visage';
import type { CardCollectionEntry, VisageSet } from '../../hooks/useVisageSets';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { useVisageBuilderStore } from '../../store/visageBuilderStore';
import {
  VISAGE_POINT_CAP,
  canPlaceCard,
  getBuildability,
  getTotalPoints,
  normalizeInk,
  ownsCardInk,
  slotLabel,
  type VisageBuildSlot,
} from '../../lib/visageBuild';
import VisageBuildEffects from './VisageBuildEffects';
import { cn } from '../../lib/utils';

interface Props {
  sets: VisageSet[];
  visages: DBVisage[];
  collectionMap: Record<string, CardCollectionEntry>;
  isOwner: boolean;
  notice: string | null;
  onNotice: (msg: string | null) => void;
  onSave: (asNew: boolean) => void;
}

export default function VisageBuilderPanel({ sets, visages, collectionMap, isOwner, notice, onNotice, onSave }: Props) {
  const { loadout, sourceMode, setSourceMode, setSlot, setSlotInk, buildId, title, dirty, reset } = useVisageBuilderStore();

  const [openSlot, setOpenSlot] = useState<VisageBuildSlot | null>(null);
  const [inkPickSlot, setInkPickSlot] = useState<VisageBuildSlot | null>(null);
  const [filterInk, setFilterInk] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showEffects, setShowEffects] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const totalPoints = getTotalPoints(loadout);
  const buildability = useMemo(() => getBuildability(loadout, collectionMap), [loadout, collectionMap]);
  const filled = Object.values(loadout).some((e) => e.visage);
  const mineOnly = sourceMode === 'mine';

  // Close popovers on outside click
  useEffect(() => {
    if (openSlot === null && inkPickSlot === null) return;
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenSlot(null);
        setInkPickSlot(null);
      }
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [openSlot, inkPickSlot]);

  const ownsAnyInk = (v: DBVisage) => v.ink_types.some((ink) => ownsCardInk(collectionMap, v.id, ink));

  const pickCard = (slot: VisageBuildSlot, v: DBVisage) => {
    if (!canPlaceCard(loadout, v, slot)) {
      onNotice(`Can't equip ${v.name} — point limit (${VISAGE_POINT_CAP}) exceeded.`);
      return;
    }
    let ink: string | null = null;
    if (filterInk && v.ink_types.some((i) => normalizeInk(i) === filterInk)) ink = filterInk;
    else if (mineOnly) ink = v.ink_types.find((i) => ownsCardInk(collectionMap, v.id, i)) ?? null;
    setSlot(slot, v, ink ?? v.ink_types[0]);
    onNotice(null);
    setOpenSlot(null);
    setFilterInk(null);
  };

  const openPickerForInk = (ink: string) => {
    const slot = (([2, 3, 4, 5, 'core'] as VisageBuildSlot[]).find((s) => !loadout[s].visage)) ?? null;
    if (!slot) {
      onNotice('All slots are full — clear one first.');
      return;
    }
    setOpenSlot(slot);
    setFilterInk(ink);
    setSearch('');
    setInkPickSlot(null);
  };

  const copyLink = async () => {
    if (!buildId) return;
    const url = `${window.location.origin}/gallery/collection?mode=builder&build=${buildId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  const renderSlot = (slot: VisageBuildSlot) => {
    const { visage, ink } = loadout[slot];
    const core = slot === 'core';
    const cfg = getInkConfig(ink);
    const multiInk = (visage?.ink_types?.length ?? 0) > 1;
    const notOwned = visage && !ownsCardInk(collectionMap, visage.id, ink);

    return (
      <div key={slot} className="flex flex-col items-center relative w-full">
        <label className={cn('text-[9px] font-bold mb-1 uppercase tracking-wider', core ? 'text-rarity-5' : 'text-mh-slate-500')}>
          {slotLabel(slot)}
        </label>

        <button
          onClick={() => {
            setOpenSlot(openSlot === slot ? null : slot);
            setInkPickSlot(null);
            setFilterInk(null);
            setSearch('');
          }}
          className={cn(
            'relative w-full aspect-[4/5] bg-mh-slate-800 border-2 rounded-lg overflow-hidden flex items-center justify-center transition-colors group',
            core ? 'border-rarity-5 hover:border-rarity-4 shadow-[0_0_10px_rgba(255,215,0,0.15)]' : 'border-mh-slate-700 hover:border-mh-slate-500',
            openSlot === slot && 'ring-2 ring-mh-gold-400',
          )}
        >
          {visage ? (
            <>
              {visage.image_small ? (
                <img src={visage.image_small} alt={visage.name} className={cn('w-full h-full object-cover', notOwned && 'opacity-60')} />
              ) : (
                <span className="text-[10px] font-bold text-mh-slate-300 text-center px-1 leading-tight">{visage.name}</span>
              )}
              <div className="absolute top-0.5 right-0.5 bg-black/80 px-1 rounded text-[10px] font-bold text-white leading-tight">{visage.points}</div>
              {notOwned && (
                <div className="absolute bottom-0.5 left-0.5 text-[10px]" title="You don't own this card + ink">
                  🔒
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-[12px] font-bold">✎</span>
              </div>
            </>
          ) : (
            <span className="text-mh-slate-600 text-lg font-light">+</span>
          )}
        </button>

        {visage && visage.ink_types.length > 0 && (
          <div className="relative mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (multiInk) {
                  setInkPickSlot(inkPickSlot === slot ? null : slot);
                  setOpenSlot(null);
                }
              }}
              title={ink ? cfg.name : 'No ink'}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center ring-1 ring-black/40 text-white shadow-sm transition-all',
                ink ? cfg.dotColor : 'bg-mh-slate-700',
                multiInk ? 'cursor-pointer hover:scale-110 hover:ring-2' : 'cursor-default',
              )}
            >
              {ink ? <InkIconComponent iconName={cfg.iconName} size={13} /> : '?'}
            </button>

            {inkPickSlot === slot && multiInk && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col gap-1 p-1.5 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-xl z-40">
                {visage.ink_types.map((raw: string) => {
                  const i = normalizeInk(raw)!;
                  const c = getInkConfig(i);
                  const active = ink === i;
                  const owned = ownsCardInk(collectionMap, visage.id, i);
                  const disabled = mineOnly && !owned;
                  return (
                    <button
                      key={raw}
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlotInk(slot, i);
                        setInkPickSlot(null);
                      }}
                      title={disabled ? "You don't own this ink version" : undefined}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition-colors',
                        active ? cn(c.dotColor, 'text-white') : 'hover:bg-mh-slate-800 text-mh-slate-300',
                        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                      )}
                    >
                      <div className={cn('w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0', active ? 'bg-white/20' : c.dotColor)}>
                        <InkIconComponent iconName={c.iconName} size={10} />
                      </div>
                      {c.shortName}
                      {!owned && <span className="ml-auto">🔒</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPicker = () => {
    if (openSlot === null) return null;
    const selected = loadout[openSlot].visage;
    const q = search.toLowerCase().trim();
    const list = visages.filter((v) => {
      if (filterInk && !v.ink_types.some((i) => normalizeInk(i) === filterInk)) return false;
      if (q && !v.name.toLowerCase().includes(q)) return false;
      return true;
    });

    return (
      <div className="mt-2 rounded-xl border border-mh-slate-700 bg-mh-slate-900 p-2 shadow-2xl flex flex-col gap-2 max-h-[360px]">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-mh-slate-300 shrink-0">Pick for {slotLabel(openSlot)}</span>
            {filterInk && (
              <span className="flex items-center gap-1 bg-mh-slate-800 px-1.5 py-0.5 rounded border border-mh-slate-700 text-[9px] font-bold text-mh-slate-400">
                {getInkConfig(filterInk).shortName} only
                <button onClick={() => setFilterInk(null)} className="text-mh-slate-500 hover:text-red-400">
                  ×
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selected && (
              <button
                onClick={() => {
                  setSlot(openSlot, null);
                  setOpenSlot(null);
                }}
                className="text-[10px] text-red-400 hover:text-red-300"
              >
                Clear
              </button>
            )}
            <button onClick={() => setOpenSlot(null)} className="text-mh-slate-500 hover:text-white text-sm leading-none">
              ×
            </button>
          </div>
        </div>
        <div className="relative px-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards…"
            className="w-full bg-mh-slate-800 border border-mh-slate-700 rounded text-xs px-2 pl-6 py-1.5 text-mh-slate-200 placeholder:text-mh-slate-600 focus:outline-none focus:border-rarity-5"
          />
        </div>
        <div className="grid grid-cols-5 gap-1.5 overflow-y-auto px-1 pb-1">
          {list.map((v) => {
            const owned = ownsAnyInk(v);
            const disabled = mineOnly && !owned;
            const fits = canPlaceCard(loadout, v, openSlot);
            const firstInk = getInkConfig(filterInk ?? v.ink_types[0]);
            return (
              <button
                key={v.id}
                title={`${v.name} (${v.points} pts)${disabled ? ' — not in your collection' : ''}${!fits ? ' — exceeds point cap' : ''}`}
                disabled={disabled}
                onClick={() => pickCard(openSlot, v)}
                className={cn(
                  'relative aspect-[3/4] rounded bg-mh-slate-800 border overflow-hidden group transition-all',
                  selected?.id === v.id
                    ? 'border-rarity-5 ring-1 ring-rarity-5'
                    : disabled
                      ? 'border-mh-slate-800 opacity-30 cursor-not-allowed'
                      : !fits
                        ? 'border-red-900/60 opacity-60'
                        : 'border-mh-slate-600 hover:border-mh-slate-400',
                )}
              >
                {v.image_small ? (
                  <img src={v.image_small} alt={v.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-mh-slate-400 text-center leading-tight block px-0.5 pt-1">{v.name}</span>
                )}
                <div className={cn('absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center text-white ring-1 ring-black/30', firstInk.dotColor)}>
                  <InkIconComponent iconName={firstInk.iconName} size={8} />
                </div>
                <div className="absolute bottom-0 right-0 bg-black/80 px-0.5 text-[8px] font-bold text-white">{v.points}</div>
                {!owned && <div className="absolute bottom-0 left-0 text-[8px]">🔒</div>}
              </button>
            );
          })}
          {list.length === 0 && <p className="col-span-5 text-center text-[11px] text-mh-slate-500 py-4">No cards match.</p>}
        </div>
      </div>
    );
  };

  return (
    <div ref={rootRef} className="bg-[#121622]/95 border border-mh-gold-500/30 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="mr-auto min-w-0">
          <h2 className="font-display text-sm font-bold text-mh-gold-300 truncate flex items-center gap-1.5">
            {title || 'New Visage Build'}
            {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
          </h2>
        </div>
        <div className="flex rounded-full border border-mh-slate-700 bg-mh-slate-900 p-0.5 text-[10px] font-bold">
          {(['mine', 'any'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSourceMode(m)}
              className={cn(
                'px-2.5 py-0.5 rounded-full transition-colors',
                sourceMode === m ? 'bg-mh-gold-500 text-slate-950' : 'text-mh-slate-400 hover:text-white',
              )}
            >
              {m === 'mine' ? '📦 My Cards' : '🌐 Any Cards'}
            </button>
          ))}
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-bold',
            totalPoints > VISAGE_POINT_CAP ? 'bg-red-500/20 text-red-400' : 'bg-mh-slate-800 text-mh-slate-300',
          )}
        >
          {totalPoints} / {VISAGE_POINT_CAP} pts
        </span>
      </div>

      {/* Slots */}
      <div className="flex w-full items-start gap-2">
        <div className="w-[22%] shrink-0">{renderSlot('core')}</div>
        <div className="w-px self-stretch bg-mh-slate-700/50" />
        <div className="flex-1 grid grid-cols-4 gap-1.5">
          {([2, 3, 4, 5] as VisageBuildSlot[]).map(renderSlot)}
        </div>
      </div>

      {/* Core Inherent Effect — only for the first card (Core slot) */}
      {loadout.core.visage && (
        <div className="rounded-xl border border-rarity-5/40 bg-gradient-to-r from-rarity-5/15 via-rarity-5/5 to-mh-slate-900/60 p-2.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-rarity-5 text-[11px] font-black uppercase tracking-wider">
              <Sparkles size={13} className="shrink-0" />
              <span>Core Effect</span>
              <span className="text-mh-slate-400 font-bold">&bull; {loadout.core.visage.name}</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rarity-5/20 text-rarity-5 border border-rarity-5/30">
              Active
            </span>
          </div>
          <p className="text-xs text-mh-slate-200 leading-snug">
            {loadout.core.visage.core_effect || 'No inherent core effect listed for this card.'}
          </p>
        </div>
      )}

      {renderPicker()}

      {notice && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-red-500/40 bg-red-500/10 text-[11px] text-red-300">
          <span className="flex-1">{notice}</span>
          <button onClick={() => onNotice(null)} className="text-red-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Buildability */}
      {filled && (
        <div
          className={cn(
            'text-[11px] font-semibold px-2 py-1.5 rounded-lg border',
            buildability.buildable
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          )}
        >
          {buildability.buildable ? (
            '✓ You can build this with your cards'
          ) : (
            <>
              ⚠ Missing {buildability.missing.length} card{buildability.missing.length > 1 ? 's' : ''}:{' '}
              <span className="font-normal">
                {buildability.missing
                  .map((m) => `${m.visage.name} (${getInkConfig(m.ink).shortName}${m.needed > 1 ? ` ×${m.needed}` : ''})`)
                  .join(', ')}
              </span>
            </>
          )}
        </div>
      )}

      {/* Effects (always on xl, collapsible below) */}
      <div className="border-t border-mh-slate-800 pt-2">
        <button
          onClick={() => setShowEffects((s) => !s)}
          className="xl:hidden w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 hover:text-white"
        >
          Effects
          <ChevronDown size={14} className={cn('transition-transform', showEffects && 'rotate-180')} />
        </button>
        <div className={cn('mt-2 xl:mt-0', showEffects ? 'block' : 'hidden xl:block')}>
          <VisageBuildEffects loadout={loadout} sets={sets} onAddForInk={openPickerForInk} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-mh-slate-800 pt-3">
        <button
          onClick={() => onSave(false)}
          disabled={!filled}
          className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-mh-gold-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={13} />
          {buildId && isOwner ? 'Save' : 'Save Build'}
        </button>
        {buildId && isOwner && (
          <button
            onClick={() => onSave(true)}
            disabled={!filled}
            className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 px-2.5 py-1.5 text-xs font-bold text-mh-slate-300 hover:text-white hover:border-mh-slate-500 disabled:opacity-40"
          >
            <Plus size={13} />
            Save as new
          </button>
        )}
        {buildId && (
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 px-2.5 py-1.5 text-xs font-bold text-mh-slate-300 hover:text-white hover:border-mh-slate-500"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Link'}
          </button>
        )}
        <button
          onClick={() => {
            if (!dirty || window.confirm('Clear this build? Unsaved changes will be lost.')) reset();
          }}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-mh-slate-400 hover:text-red-300"
        >
          <RotateCcw size={13} />
          New
        </button>
        <Link
          to="/armory/visages"
          className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-mh-gold-400 hover:text-mh-gold-300"
        >
          <Library size={13} />
          Browse builds
        </Link>
      </div>
    </div>
  );
}
