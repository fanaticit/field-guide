// ─────────────────────────────────────────────────────────────
// VisageModal — Detailed card inspect view for MHO Visage Cards
// ─────────────────────────────────────────────────────────────
import { X, Sparkles, Star, Check, BookmarkCheck } from 'lucide-react';
import type { DBVisage } from '../../data/schemas/visage';
import { INK_CONFIG, getInkConfig } from '../../data/schemas/visage';
import { InkIconComponent } from './VisageCard';
import { cn } from '../../lib/utils';

interface VisageModalProps {
  card: DBVisage | null;
  open: boolean;
  onClose: () => void;
  isCollected?: boolean;
  onToggleCollected?: () => void;
}

export default function VisageModal({
  card,
  open,
  onClose,
  isCollected = false,
  onToggleCollected,
}: VisageModalProps) {
  if (!open || !card) return null;

  const primaryInk = card.ink_types[0] || 'flames';
  const inkCfg = getInkConfig(primaryInk);
  const imageSrc = card.image_large || card.image_small;

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
                card.rarity >= 5
                  ? 'bg-gradient-to-b from-indigo-900 via-slate-800 to-indigo-950 border-indigo-400'
                  : 'bg-gradient-to-b from-[#f3e5be] via-[#e2cf9f] to-[#cfba84] border-[#8e7646]',
              )}
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
                    Rarity
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

        {/* Modal Footer with Collection Toggle */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 bg-mh-slate-950/80 px-6 py-3.5">
          <button
            onClick={onToggleCollected}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-sm',
              isCollected
                ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
                : 'bg-mh-slate-800 text-mh-slate-300 border border-mh-slate-700 hover:bg-mh-slate-700 hover:text-white',
            )}
          >
            {isCollected ? (
              <>
                <Check size={14} />
                <span>Collected in Album</span>
              </>
            ) : (
              <>
                <BookmarkCheck size={14} />
                <span>Mark as Collected</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="rounded-lg bg-mh-slate-800 px-4 py-2 text-xs font-medium text-mh-slate-300 hover:bg-mh-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
