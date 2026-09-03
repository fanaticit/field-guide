// ─────────────────────────────────────────────────────────────
// BuddyCard — Presentation card for MHO Companions with Collection Tracking
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { Swords, Zap, Heart, Cat, Sparkles, Plus, Trash2 } from 'lucide-react';
import {
  type DBBuddy,
  type BuddyRole,
  type BuddyCollectionEntry,
  TIER_CONFIG,
  ROLE_CONFIG,
} from '../../data/schemas/buddy';
import { cn } from '../../lib/utils';

const ROLE_ICONS: Record<BuddyRole, React.ComponentType<{ size?: number; className?: string }>> = {
  Assault: Swords,
  Disruptor: Zap,
  Support: Heart,
};

const QTY_OPTIONS = [1, 2, 3, 4, 5];

interface BuddyCardProps {
  buddy: DBBuddy;
  collectionEntry?: BuddyCollectionEntry;
  onSetQuantity: (quantity: number) => void;
  onRemoveFromCollection: () => void;
  onClick: () => void;
}

export default function BuddyCard({
  buddy,
  collectionEntry,
  onSetQuantity,
  onRemoveFromCollection,
  onClick,
}: BuddyCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showQtyMenu, setShowQtyMenu] = useState(false);
  const qtyMenuRef = useRef<HTMLDivElement>(null);

  const isOwned = Boolean(collectionEntry);
  const currentQty = collectionEntry?.quantity ?? 0;

  const tierCfg = TIER_CONFIG[buddy.tier] || TIER_CONFIG.R;
  const roleCfg = ROLE_CONFIG[buddy.role] || ROLE_CONFIG.Support;
  const RoleIcon = ROLE_ICONS[buddy.role] || Heart;

  const isSSR = buddy.tier === 'SSR';
  const isSR = buddy.tier === 'SR';

  // Close quantity popup when clicking outside
  useEffect(() => {
    if (!showQtyMenu) return;
    function handleOutside(e: MouseEvent) {
      if (qtyMenuRef.current && !qtyMenuRef.current.contains(e.target as Node)) {
        setShowQtyMenu(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [showQtyMenu]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${buddy.name} [${buddy.tier}] — Click to inspect`}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border cursor-pointer select-none transition-all duration-200',
        'p-4 shadow-md hover:scale-[1.02] hover:shadow-xl hover:z-10',
        isOwned
          ? isSSR
            ? 'border-amber-500/50 bg-gradient-to-b from-[#1f1a14] via-[#151824] to-[#121622] hover:border-amber-400 shadow-amber-500/10'
            : isSR
              ? 'border-purple-500/40 bg-gradient-to-b from-[#1a1426] via-[#141825] to-[#121622] hover:border-purple-400 shadow-purple-500/10'
              : 'border-blue-500/40 bg-gradient-to-b from-[#141a2a] via-[#131724] to-[#10131d] hover:border-blue-400 shadow-blue-500/10'
          : 'border-mh-slate-800 bg-[#131622]/80 opacity-50 grayscale hover:opacity-90 hover:grayscale-0 hover:border-mh-slate-700',
      )}
    >
      {/* SSR / High Tier Decorative Corner Accent (When Owned) */}
      {isOwned && isSSR && (
        <div className="pointer-events-none absolute -top-px -right-px h-10 w-10 overflow-hidden rounded-tr-2xl">
          <div className="absolute top-0 right-0 h-4 w-12 translate-x-3 translate-y-1 rotate-45 bg-gradient-to-r from-amber-500 to-yellow-300 shadow-sm" />
        </div>
      )}

      {/* Top Row: Tier Badge + Role Badge + Quantity/Collection Ball */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          {/* Tier Badge */}
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-lg px-2.5 py-0.5 text-xs font-black tracking-wider border shadow-sm',
              tierCfg.badgeBg,
              tierCfg.badgeText,
              tierCfg.badgeBorder,
            )}
          >
            {buddy.tier}
          </span>

          {/* Role Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold border',
              roleCfg.bg,
              roleCfg.text,
              roleCfg.border,
            )}
          >
            <RoleIcon size={12} />
            <span>{buddy.role}</span>
          </span>
        </div>

        {/* Collection Tracking Button / Ball */}
        <div
          className="relative z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {isOwned ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQtyMenu((prev) => !prev);
              }}
              title={`You own ${currentQty >= 5 ? '5+' : currentQty} of this companion. Click to change count.`}
              className={cn(
                'flex h-6 min-w-[24px] px-1.5 items-center justify-center rounded-full text-[11px] font-black leading-none',
                'border shadow-md transition-transform hover:scale-110 active:scale-95',
                isSSR
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30 ring-1 ring-amber-400/50'
                  : isSR
                    ? 'bg-purple-600 text-white border-purple-300 shadow-purple-500/30 ring-1 ring-purple-400/50'
                    : 'bg-blue-600 text-white border-blue-300 shadow-blue-500/30 ring-1 ring-blue-400/50',
              )}
            >
              {currentQty >= 5 ? '5+' : currentQty}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetQuantity(1);
              }}
              title="Click to mark this companion as owned in your collection"
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                'border border-mh-slate-700 bg-mh-slate-900/90 text-mh-slate-400 shadow-sm',
                'transition-all hover:scale-110 hover:border-mh-gold-500 hover:bg-mh-gold-500/20 hover:text-mh-gold-300',
              )}
            >
              <Plus size={13} />
            </button>
          )}

          {/* Quantity Selection Popup Window */}
          {showQtyMenu && (
            <div
              ref={qtyMenuRef}
              className="absolute top-full right-0 mt-2 z-50 flex flex-col gap-1.5 rounded-xl border border-mh-slate-700 bg-mh-slate-950/95 p-2 shadow-2xl backdrop-blur-md min-w-[130px] animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-mh-gold-400 border-b border-mh-slate-800">
                Quantity Owned
              </div>

              <div className="grid grid-cols-5 gap-1 my-0.5">
                {QTY_OPTIONS.map((q) => {
                  const isSelected = currentQty === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        onSetQuantity(q);
                        setShowQtyMenu(false);
                      }}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all',
                        isSelected
                          ? 'bg-mh-gold-500 text-slate-950 font-black ring-1 ring-white shadow-sm'
                          : 'bg-mh-slate-900 text-mh-slate-200 hover:bg-mh-slate-800 hover:text-white',
                      )}
                    >
                      {q === 5 ? '5+' : q}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  onRemoveFromCollection();
                  setShowQtyMenu(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/25 transition-colors mt-0.5"
              >
                <Trash2 size={11} />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Portrait Art & Name */}
      <div className="flex items-center gap-3.5 my-1">
        <div
          className={cn(
            'relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-inner transition-transform group-hover:scale-105',
            isOwned
              ? isSSR
                ? 'border-amber-500/40 bg-black/40 ring-1 ring-amber-500/20'
                : isSR
                  ? 'border-purple-500/30 bg-black/40'
                  : 'border-blue-500/20 bg-black/30'
              : 'border-mh-slate-800 bg-black/20',
          )}
        >
          {buddy.image && !imageError ? (
            <img
              src={buddy.image}
              alt={buddy.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover drop-shadow filter transition-transform group-hover:scale-110"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-mh-slate-500">
              <Cat size={26} className={isOwned ? (isSSR ? 'text-amber-400' : isSR ? 'text-purple-400' : 'text-blue-400') : 'text-mh-slate-600'} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={cn(
              'font-display text-base font-bold transition-colors truncate',
              isOwned ? 'text-mh-slate-100 group-hover:text-mh-gold-300' : 'text-mh-slate-400 group-hover:text-mh-slate-200'
            )}>
              {buddy.name}
            </h3>
            {buddy.name_ja && (
              <span className="text-xs text-mh-slate-500 font-medium">
                ({buddy.name_ja})
              </span>
            )}
          </div>
          <p className="font-mono text-[10px] text-mh-slate-500 mt-0.5">
            ID: {buddy.id}
          </p>
        </div>
      </div>

      {/* Bottom: Core Passive */}
      <div className="mt-3 pt-3 border-t border-mh-slate-800/80">
        <div className="rounded-xl bg-mh-slate-950/70 p-2.5 border border-mh-slate-800/70 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-mh-gold-400">
            <Sparkles size={11} className="text-mh-gold-400" />
            <span>Core Passive</span>
          </div>
          <p className="text-xs text-mh-slate-300 line-clamp-2 leading-relaxed">
            {buddy.core_passive || (
              <span className="text-mh-slate-500 italic">No passive skill documented yet.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
