// ─────────────────────────────────────────────────────────────
// BuddyCard — Presentation card for MHO Companions with Collection Tracking
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Cat, Sparkles, Plus, Check, Target } from 'lucide-react';
import {
  type DBBuddy,
  type BuddyCollectionEntry,
  TIER_CONFIG,
  ROLE_CONFIG,
  buddyTierBorder,
} from '../../data/schemas/buddy';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import { cn } from '../../lib/utils';
import ArtBackdrop from '../../components/ArtBackdrop';
import { ROLE_ICONS } from '../../components/RoleIcon';
import { BuddyTierPicker } from './BuddyTierLevel';

interface BuddyCardProps {
  buddy: DBBuddy;
  collectionEntry?: BuddyCollectionEntry;
  challenge?: HunterChallenge;
  onToggleOwned: () => void;
  onSetTierLevel: (tierLevel: number) => void;
  onAddChallenge?: (buddy: DBBuddy) => void;
  onClick: () => void;
}

export default function BuddyCard({
  buddy,
  collectionEntry,
  challenge,
  onToggleOwned,
  onSetTierLevel,
  onAddChallenge,
  onClick,
}: BuddyCardProps) {
  const [imageError, setImageError] = useState(false);

  const isOwned = Boolean(collectionEntry);
  const currentTierLevel = collectionEntry?.tier_level ?? 0;
  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isChallengeDone = challenge?.status === 'completed';

  const tierCfg = TIER_CONFIG[buddy.tier] || TIER_CONFIG.R;
  const roleCfg = ROLE_CONFIG[buddy.role] || ROLE_CONFIG.Support;
  const RoleIcon = ROLE_ICONS[buddy.role] || ROLE_ICONS.Support;

  const isSSR = buddy.tier === 'SSR';
  const isSR = buddy.tier === 'SR';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${buddy.name} [${buddy.tier}] — Click to inspect`}
      style={buddyTierBorder(buddy.tier, isOwned)}
      className={cn(
        'group relative isolate overflow-hidden flex flex-col justify-between rounded-2xl border cursor-pointer select-none transition-all duration-200',
        'p-3.5 sm:p-4 shadow-md hover:scale-[1.01] hover:shadow-xl hover:z-10 w-full min-w-0 max-w-full box-border',
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
      <ArtBackdrop src={buddy.image} active={isOwned} />

      {/* SSR / High Tier Decorative Corner Accent (When Owned) */}
      {isOwned && isSSR && (
        <div className="pointer-events-none absolute -top-px -right-px h-10 w-10 overflow-hidden rounded-tr-2xl">
          <div className="absolute top-0 right-0 h-4 w-12 translate-x-3 translate-y-1 rotate-45 bg-gradient-to-r from-amber-500 to-yellow-300 shadow-sm" />
        </div>
      )}

      {/* Upper Content: Large Image on the Left, Labels & Buttons Stacked on the Right */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full">
        {/* Left: Large Buddy Image (prominent visible presentation without enclosing border) */}
        <div className="relative h-20 w-20 sm:h-28 sm:w-28 shrink-0 flex items-center justify-center">
          {buddy.image && !imageError ? (
            <img
              src={buddy.image}
              alt={buddy.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-mh-slate-500">
              <Cat size={32} className={isOwned ? (isSSR ? 'text-amber-400' : isSR ? 'text-purple-400' : 'text-blue-400') : 'text-mh-slate-500'} />
            </div>
          )}
        </div>

        {/* Right: Stacked Name, Badges, and Action Buttons */}
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 sm:gap-2">
          {/* Name & Japanese Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className={cn(
                'font-display text-base font-bold leading-tight transition-colors truncate',
                isOwned ? 'text-mh-slate-100 group-hover:text-mh-gold-300' : 'text-mh-slate-200 group-hover:text-mh-gold-300',
              )}>
                {buddy.name}
              </h3>
              {(buddy.status === 'not_in_game' || buddy.is_spoiler) && (
                <span
                  className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 uppercase tracking-wider shrink-0"
                  title="***Spoiler***"
                >
                  Coming
                </span>
              )}
            </div>
            {buddy.name_ja && (
              <p className="text-[11px] text-mh-slate-500 font-medium truncate">
                {buddy.name_ja}
              </p>
            )}
          </div>

          {/* Tier & Role Badges */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-xs font-black tracking-wider border shadow-sm shrink-0',
                tierCfg.badgeBg,
                tierCfg.badgeText,
                tierCfg.badgeBorder,
              )}
            >
              {buddy.tier}
            </span>

            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold border shrink-0',
                roleCfg.bg,
                roleCfg.text,
                roleCfg.border,
              )}
            >
              <RoleIcon size={18} className="shrink-0" />
              <span>{buddy.role}</span>
            </span>

            {(buddy.status === 'not_in_game' || buddy.is_spoiler) && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-xs shrink-0"
                title="***Spoiler***"
              >
                <span>Coming</span>
              </span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div
            className="relative z-20 flex items-center gap-1.5 flex-wrap pt-0.5 min-w-0"
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

            {/* Tier Level Picker (When Owned) */}
            {isOwned && (
              <BuddyTierPicker
                level={currentTierLevel}
                onChange={(lvl) => onSetTierLevel(lvl)}
              />
            )}

            {/* Collect / Owned Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleOwned();
              }}
              title={isOwned ? 'Collected companion. Click to remove from collection.' : 'Click to mark as collected'}
              className={cn(
                'inline-flex h-6 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold whitespace-nowrap transition-all hover:scale-105 active:scale-95',
                isOwned
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-300 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/50'
                  : 'border border-mh-slate-700 bg-mh-slate-900/90 text-mh-slate-300 shadow-sm hover:border-mh-gold-500 hover:bg-mh-gold-500/20 hover:text-mh-gold-300',
              )}
            >
              {isOwned ? (
                <>
                  <Check size={11} strokeWidth={3} />
                  <span>Owned</span>
                </>
              ) : (
                <>
                  <Plus size={11} />
                  <span>Collect</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Core Passive under the buttons */}
      <div className="mt-3 pt-3 border-t border-mh-slate-800/80 w-full min-w-0">
        <div className="rounded-xl bg-mh-slate-950/70 p-2.5 border border-mh-slate-800/70 space-y-1 w-full min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-mh-gold-400">
            <Sparkles size={11} className="text-mh-gold-400 shrink-0" />
            <span>Core Passive</span>
          </div>
          <p className="text-xs text-mh-slate-300 line-clamp-2 leading-relaxed break-words">
            {buddy.core_passive || (
              <span className="text-mh-slate-500 italic">No passive skill documented yet.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
