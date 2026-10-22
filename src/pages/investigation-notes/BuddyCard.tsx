// ─────────────────────────────────────────────────────────────
// BuddyCard — Presentation card for MHO Companions with Collection Tracking
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { Swords, Zap, Heart, Cat, Sparkles, Plus, Trash2, Target } from 'lucide-react';
import {
  type DBBuddy,
  type BuddyRole,
  type BuddyCollectionEntry,
  TIER_CONFIG,
  ROLE_CONFIG,
} from '../../data/schemas/buddy';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
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
  challenge?: HunterChallenge;
  onSetQuantity: (quantity: number) => void;
  onRemoveFromCollection: () => void;
  onAddChallenge?: (buddy: DBBuddy) => void;
  onClick: () => void;
}

export default function BuddyCard({
  buddy,
  collectionEntry,
  challenge,
  onSetQuantity,
  onRemoveFromCollection,
  onAddChallenge,
  onClick,
}: BuddyCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showQtyMenu, setShowQtyMenu] = useState(false);
  const qtyMenuRef = useRef<HTMLDivElement>(null);

  const isOwned = Boolean(collectionEntry);
  const currentQty = collectionEntry?.quantity ?? 0;
  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isChallengeDone = challenge?.status === 'completed';

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
        'p-4 shadow-md hover:scale-[1.01] hover:shadow-xl hover:z-10',
        isOwned
          ? isSSR
            ? 'border-amber-500/50 bg-gradient-to-b from-[#1f1a14] via-[#151824] to-[#121622] hover:border-amber-400 shadow-amber-500/10'
            : isSR
              ? 'border-purple-500/40 bg-gradient-to-b from-[#1a1426] via-[#141825] to-[#121622] hover:border-purple-400 shadow-purple-500/10'
              : 'border-blue-500/40 bg-gradient-to-b from-[#141a2a] via-[#131724] to-[#10131d] hover:border-blue-400 shadow-blue-500/10'
          : 'border-mh-slate-800 bg-[#131622]/90 hover:border-mh-slate-700',
        isTracked && !isChallengeDone && !isOwned && 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-black',
      )}
    >
      {/* SSR / High Tier Decorative Corner Accent (When Owned) */}
      {isOwned && isSSR && (
        <div className="pointer-events-none absolute -top-px -right-px h-10 w-10 overflow-hidden rounded-tr-2xl">
          <div className="absolute top-0 right-0 h-4 w-12 translate-x-3 translate-y-1 rotate-45 bg-gradient-to-r from-amber-500 to-yellow-300 shadow-sm" />
        </div>
      )}

      {/* Upper Content: Large Image on the Left, Labels & Buttons Stacked on the Right */}
      <div className="flex items-center gap-3.5 sm:gap-4">
        {/* Left: Large Buddy Image (prominent visible presentation without enclosing border) */}
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 flex items-center justify-center">
          {buddy.image && !imageError ? (
            <img
              src={buddy.image}
              alt={buddy.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-mh-slate-500">
              <Cat size={36} className={isOwned ? (isSSR ? 'text-amber-400' : isSR ? 'text-purple-400' : 'text-blue-400') : 'text-mh-slate-500'} />
            </div>
          )}
        </div>

        {/* Right: Stacked Name, Badges, and Action Buttons */}
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          {/* Name & Japanese Subtitle */}
          <div>
            <h3 className={cn(
              'font-display text-base font-bold leading-tight transition-colors line-clamp-1',
              isOwned ? 'text-mh-slate-100 group-hover:text-mh-gold-300' : 'text-mh-slate-200 group-hover:text-mh-gold-300',
            )}>
              {buddy.name}
            </h3>
            {buddy.name_ja && (
              <p className="text-[11px] text-mh-slate-500 font-medium truncate">
                {buddy.name_ja}
              </p>
            )}
          </div>

          {/* Tier & Role Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-xs font-black tracking-wider border shadow-sm',
                tierCfg.badgeBg,
                tierCfg.badgeText,
                tierCfg.badgeBorder,
              )}
            >
              {buddy.tier}
            </span>

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

          {/* Action Buttons Row */}
          <div
            className="relative z-20 flex items-center gap-1.5 flex-wrap pt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Challenge Button if not already owned */}
            {!isOwned && (
              isTracked && !isChallengeDone ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/35 px-2 text-[10px] font-bold text-blue-300 shadow-xs whitespace-nowrap">
                  <Target size={11} className="text-blue-400" />
                  <span>In Challenges</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChallenge?.(buddy);
                  }}
                  title="Add recruitment challenge to Hunter's Challenges"
                  className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10px] font-bold border border-sky-600/50 bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200 shadow-xs transition-all hover:scale-105 whitespace-nowrap"
                >
                  <Target size={11} />
                  <span>+ Challenge</span>
                </button>
              )
            )}

            {/* Quantity / Ownership Button */}
            {isOwned ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQtyMenu((prev) => !prev);
                  }}
                  title={`You own ${currentQty >= 5 ? '5+' : currentQty} of this companion. Click to change count.`}
                  className={cn(
                    'inline-flex h-6 min-w-[24px] px-2 items-center justify-center gap-1 rounded-full text-[10px] font-black leading-none whitespace-nowrap',
                    'border shadow-md transition-transform hover:scale-105 active:scale-95',
                    isSSR
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30 ring-1 ring-amber-400/50'
                      : isSR
                        ? 'bg-purple-600 text-white border-purple-300 shadow-purple-500/30 ring-1 ring-purple-400/50'
                        : 'bg-blue-600 text-white border-blue-300 shadow-blue-500/30 ring-1 ring-blue-400/50',
                  )}
                >
                  <span>{currentQty >= 5 ? '5+' : currentQty} Owned</span>
                </button>

                {/* Quantity Selection Popup Window */}
                {showQtyMenu && (
                  <div
                    ref={qtyMenuRef}
                    className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 flex flex-col gap-1.5 rounded-xl border border-mh-slate-700 bg-mh-slate-950/95 p-2 shadow-2xl backdrop-blur-md min-w-[130px] animate-in fade-in zoom-in-95 duration-100"
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
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetQuantity(1);
                }}
                title="Click to mark this companion as owned in your collection"
                className={cn(
                  'inline-flex h-6 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold whitespace-nowrap',
                  'border border-mh-slate-700 bg-mh-slate-900/90 text-mh-slate-300 shadow-sm',
                  'transition-all hover:scale-105 hover:border-mh-gold-500 hover:bg-mh-gold-500/20 hover:text-mh-gold-300',
                )}
              >
                <Plus size={11} />
                <span>Collect</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Core Passive under the buttons */}
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
