// ─────────────────────────────────────────────────────────────
// VisageModal — Detailed card inspect view for MHO Visage Cards
// ─────────────────────────────────────────────────────────────
import { X, Sparkles, Star, Trash2 } from 'lucide-react';
import type { DBVisage, VisageRarity } from '../../data/schemas/visage';
import {
  INK_CONFIG,
  getInkConfig,
  VISAGE_RARITY_CONFIG,
  VISAGE_RARITY_OPTIONS,
} from '../../data/schemas/visage';
import type { CardCollectionEntry } from '../../hooks/useVisageSets';
import { InkIconComponent } from './VisageCard';
import { cn } from '../../lib/utils';

interface VisageModalProps {
  card: DBVisage | null;
  currentInk?: string;
  open: boolean;
  onClose: () => void;
  collectionEntry?: CardCollectionEntry | null;
  onSetRarity?: (rarity: VisageRarity, quantity?: number) => void;
  onSetQuantity?: (quantity: number) => void;
  onRemoveFromCollection?: () => void;
}

export default function VisageModal({
  card,
  currentInk,
  open,
  onClose,
  collectionEntry,
  onSetRarity,
  onSetQuantity,
  onRemoveFromCollection,
}: VisageModalProps) {
  if (!open || !card) return null;

  const primaryInk = currentInk || card.ink_types[0] || 'flames';
  const inkCfg = getInkConfig(primaryInk);
  const imageSrc = card.image_small;

  const isOwned = Boolean(collectionEntry);
  const currentRarity = collectionEntry?.rarity;
  const currentQty = collectionEntry?.quantity ?? 1;
  const rarityCfg = currentRarity ? VISAGE_RARITY_CONFIG[currentRarity] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-mh-gold-500/40 bg-mh-slate-900 shadow-2xl animate-in zoom-in-95 duration-150',
          'text-mh-slate-100',
        )}
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(234, 179, 8, 0.15)',
        }}
      >
        {/* Top Header with in-game gold accent */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 bg-gradient-to-r from-mh-slate-950 via-mh-slate-900 to-mh-slate-950 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', inkCfg.bg, inkCfg.border, inkCfg.text)}>
              <InkIconComponent iconName={inkCfg.iconName} size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-mh-slate-100">
                  Visage: {card.name}
                </h3>
                {card.name_ja && (
                  <span className="text-xs text-mh-slate-400">({card.name_ja})</span>
                )}
              </div>
              <p className="font-mono text-[11px] text-mh-slate-500">ID: {card.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Card Presentation Row */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Card Graphic View */}
            <div
              className={cn(
                'relative flex flex-col items-center justify-between w-32 h-44 rounded-xl p-3 border-2 shrink-0 shadow-lg',
                isOwned && rarityCfg
                  ? cn(rarityCfg.bgGradient, rarityCfg.borderClass, 'text-mh-slate-900')
                  : 'bg-gradient-to-b from-[#f3e5be] via-[#e2cf9f] to-[#cfba84] border-[#8e7646]',
              )}
              style={{
                boxShadow: isOwned && rarityCfg
                  ? `0 10px 25px rgba(0,0,0,0.5), 0 0 15px ${rarityCfg.glowColor}`
                  : undefined,
              }}
            >
              <div className="relative flex flex-1 w-full items-center justify-center">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={card.name}
                    className="h-20 w-20 object-contain drop-shadow-md"
                  />
                ) : (
                  <Sparkles size={36} className="text-amber-800" />
                )}
              </div>

              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 border border-amber-500/40 text-white">
                  <InkIconComponent iconName={inkCfg.iconName} size={12} className={inkCfg.text} />
                  <span className="font-display text-xs font-bold text-amber-300">
                    {card.points} Pts
                  </span>
                </div>
                <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">
                  {card.monster_type}
                </span>
              </div>
            </div>

            {/* Quick Stats Column */}
            <div className="flex-1 space-y-3 w-full">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-mh-slate-800/80 p-2.5 border border-mh-slate-700">
                  <span className="block text-[10px] uppercase font-bold text-mh-slate-400">
                    Points Cost
                  </span>
                  <span className="font-display text-lg font-bold text-mh-gold-400">
                    {card.points} Points
                  </span>
                </div>

                <div className="rounded-lg bg-mh-slate-800/80 p-2.5 border border-mh-slate-700">
                  <span className="block text-[10px] uppercase font-bold text-mh-slate-400">
                    Inherent Base Rarity
                  </span>
                  <div className="flex items-center gap-0.5 mt-0.5 text-mh-gold-400">
                    {Array.from({ length: Math.min(5, card.rarity || 1) }).map((_, i) => (
                      <Star key={i} size={13} fill="currentColor" />
                    ))}
                    <span className="ml-1 text-xs font-bold text-mh-slate-300">
                      R{card.rarity || 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Possible Ink Rolls Pool */}
              <div className="rounded-lg bg-mh-slate-800/80 p-2.5 border border-mh-slate-700">
                <span className="block text-[10px] uppercase font-bold text-mh-slate-400 mb-1.5">
                  Possible Inks Pool
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {card.ink_types.map((ink) => {
                    const cfg = INK_CONFIG[ink] || getInkConfig(ink);
                    return (
                      <span
                        key={ink}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border shadow-sm',
                          cfg.bg,
                          cfg.text,
                          cfg.border,
                        )}
                      >
                        <InkIconComponent iconName={cfg.iconName} size={11} />
                        {cfg.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Collection Status & Rarity Picker Box */}
          <div className="rounded-xl bg-mh-slate-950/90 p-4 border border-mh-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Hunter Collection Status
              </span>
              {isOwned && rarityCfg && (
                <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold border', rarityCfg.badgeClass)}>
                  {rarityCfg.name} ({currentQty >= 5 ? '5+' : `${currentQty}x`})
                </span>
              )}
            </div>

            {/* Rarity Options Button Group */}
            <div className="grid grid-cols-4 gap-2">
              {VISAGE_RARITY_OPTIONS.map((rarityKey) => {
                const cfg = VISAGE_RARITY_CONFIG[rarityKey];
                const isSelected = currentRarity === rarityKey;
                return (
                  <button
                    key={rarityKey}
                    type="button"
                    onClick={() => onSetRarity?.(rarityKey, isSelected ? currentQty : 1)}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg p-2 border transition-all text-center',
                      isSelected
                        ? 'bg-mh-slate-800 border-mh-gold-400 ring-1 ring-mh-gold-400'
                        : 'bg-mh-slate-900 border-mh-slate-800 hover:border-mh-slate-600 hover:bg-mh-slate-850',
                    )}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full shadow-sm mb-1', cfg.dotClass)} />
                    <span className="text-xs font-bold text-mh-slate-200">{cfg.name}</span>
                    <span className="text-[10px] text-mh-slate-500">({cfg.colorName})</span>
                  </button>
                );
              })}
            </div>

            {/* Quantity Selector if Owned */}
            {isOwned && (
              <div className="flex items-center justify-between pt-2 border-t border-mh-slate-800/80">
                <span className="text-xs text-mh-slate-400 font-medium">
                  Count Owned (1 - 5+):
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onSetQuantity?.(q)}
                      className={cn(
                        'h-7 w-8 rounded-md text-xs font-bold transition-colors border',
                        currentQty === q
                          ? 'bg-mh-gold-500 text-slate-950 border-mh-gold-400 font-extrabold'
                          : 'bg-mh-slate-900 text-mh-slate-300 border-mh-slate-750 hover:bg-mh-slate-800',
                      )}
                    >
                      {q === 5 ? '5+' : q}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onRemoveFromCollection?.()}
                    title="Remove from collection"
                    className="ml-2 p-1.5 rounded-md text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Core Inherent Effect Box */}
          <div className="rounded-xl bg-gradient-to-b from-mh-slate-950 to-mh-slate-900 p-4 border border-mh-gold-500/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-mh-gold-400">
              <Sparkles size={14} />
              <span>Core Inherent Effect</span>
            </div>
            <p className="text-sm text-mh-slate-200 leading-relaxed font-sans">
              {card.core_effect || 'Increases hunter capabilities and boosts set resonance in Aesoland hunts.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-mh-slate-750 bg-mh-slate-950/80 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg bg-mh-slate-800 px-5 py-2 text-xs font-bold text-mh-slate-200 hover:bg-mh-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
