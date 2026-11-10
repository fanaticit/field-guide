// ─────────────────────────────────────────────────────────────
// BuddyModal — Inspection Dialog for Buddy details with Collection Controls
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Cat, Zap, Sparkles, Info, Check, Trash2, Target, CheckCircle2 } from 'lucide-react';
import {
  type DBBuddy,
  type BuddyRole,
  type BuddyCollectionEntry,
  TIER_CONFIG,
  ROLE_CONFIG,
  buddyTierBorder,
} from '../../data/schemas/buddy';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import { cn } from '../../lib/utils';
import ArtBackdrop from '../../components/ArtBackdrop';
import { useBuddySkills } from '../../hooks/useAdminBuddies';
import { usePublicAdventurers } from '../../hooks/useAdminAdventurers';
import { useAuthStore } from '../../store/authStore';
import { ROLE_ICONS } from '../../components/RoleIcon';

const ROLE_DESCRIPTIONS: Record<BuddyRole, string> = {
  Assault: 'Direct damage specialist focused on dealing burst and sustained offensive damage to monsters.',
  Disruptor: 'Specializes in crowd control, monster stagger, interrupts, and applying elemental or status ailments.',
  Support: 'Provides combat buffs, party healing, defense enhancements, and utility aids during hunts.',
};

const QTY_OPTIONS = [1, 2, 3, 4, 5];

interface BuddyModalProps {
  buddy: DBBuddy | null;
  open: boolean;
  onClose: () => void;
  collectionEntry?: BuddyCollectionEntry;
  challenge?: HunterChallenge;
  onSetQuantity: (quantity: number) => void;
  onRemoveFromCollection: () => void;
  onAddChallenge?: (buddy: DBBuddy) => void;
}

export default function BuddyModal({
  buddy,
  open,
  onClose,
  collectionEntry,
  challenge,
  onSetQuantity,
  onRemoveFromCollection,
  onAddChallenge,
}: BuddyModalProps) {
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin';
  const { data: skills = [] } = useBuddySkills(open ? buddy?.id : null);
  const { data: adventurers = [] } = usePublicAdventurers();

  if (!open || !buddy) return null;

  const defaultOf = adventurers.find((a) => a.id === buddy.default_of_adventurer_id);
  const skillGroups = [
    { kind: 'skill', title: 'Skills' },
    { kind: 'passive', title: 'Passive Skills' },
    { kind: 'other', title: 'Unique Skills' },
  ] as const;

  const isOwned = Boolean(collectionEntry);
  const currentQty = collectionEntry?.quantity ?? 1;

  const tierCfg = TIER_CONFIG[buddy.tier] || TIER_CONFIG.R;
  const roleCfg = ROLE_CONFIG[buddy.role] || ROLE_CONFIG.Support;
  const RoleIcon = ROLE_ICONS[buddy.role] || ROLE_ICONS.Support;

  const isSSR = buddy.tier === 'SSR';
  const isSR = buddy.tier === 'SR';

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
          'relative isolate z-10 w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-150',
          'bg-gradient-to-b from-[#161a26] to-[#0f121a]',
          isOwned
            ? isSSR
              ? 'border-amber-500/50 shadow-amber-500/10'
              : isSR
                ? 'border-purple-500/40 shadow-purple-500/10'
                : 'border-blue-500/40 shadow-blue-500/10'
            : 'border-mh-slate-800',
        )}
        style={buddyTierBorder(buddy.tier)}
      >
        <ArtBackdrop src={buddy.image} active={isOwned} />

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-mh-slate-800 bg-mh-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Tier Badge */}
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black tracking-wider border shadow-sm',
                tierCfg.badgeBg,
                tierCfg.badgeText,
                tierCfg.badgeBorder,
              )}
            >
              {buddy.tier} Companion
            </span>

            {/* Role Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border',
                roleCfg.bg,
                roleCfg.text,
                roleCfg.border,
              )}
            >
              <RoleIcon size={26} />
              <span>{buddy.role} Role</span>
            </span>

            {(buddy.status === 'not_in_game' || buddy.is_spoiler) && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                title="***Spoiler***"
              >
                Coming
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Identity & Portrait (No extra border, large & visible) */}
          <div className="flex items-center gap-5">
            <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center">
              {buddy.image && !imageError ? (
                <img
                  src={buddy.image}
                  alt={buddy.name}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              ) : (
                <Cat size={48} className={isOwned ? (isSSR ? 'text-amber-400' : isSR ? 'text-purple-400' : 'text-blue-400') : 'text-mh-slate-500'} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-bold text-mh-slate-100">
                  {buddy.name}
                </h2>
                {buddy.name_ja && (
                  <span className="text-sm text-mh-slate-400 font-medium">
                    ({buddy.name_ja})
                  </span>
                )}
                {(buddy.status === 'not_in_game' || buddy.is_spoiler) && (
                  <span
                    className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs font-bold text-amber-300 uppercase tracking-wider"
                    title="***Spoiler***"
                  >
                    Coming
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-mh-slate-500 mt-1">
                Identifier: <span className="text-mh-slate-400">{buddy.id}</span>
              </p>
              <p className="text-xs text-mh-slate-400 mt-1">
                {buddy.species ? `${buddy.species} Companion` : 'Aesoland Companion'} &bull; Monster Hunter Outlanders
              </p>
              {defaultOf && (
                <p className="text-xs text-mh-slate-400 mt-1">Default buddy of {defaultOf.name}</p>
              )}

              {(buddy.status === 'not_in_game' || buddy.is_spoiler) && (
                <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider border border-amber-500/40">Coming</span>
                    <span>Upcoming Companion</span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-300 font-bold tracking-wider">
                    ***Spoiler***
                  </p>
                  {isAdmin && buddy.status_reason && (
                    <p className="mt-1 text-[10px] text-mh-slate-400">
                      <span className="font-semibold text-mh-slate-300">Admin note:</span> {buddy.status_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hunter Collection Tracking Bar & Challenge Controls */}
          <div className="rounded-xl border border-mh-gold-500/30 bg-mh-slate-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-gold-400">
                <Check size={14} className="text-mh-gold-400" />
                <span>Hunter Collection Status</span>
              </div>
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                isOwned
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700'
              )}>
                {isOwned ? `Owned (${currentQty >= 5 ? '5+' : currentQty})` : 'Not Owned'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-mh-slate-800 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-mh-slate-400 font-medium mr-1">Quantity:</span>
                {QTY_OPTIONS.map((q) => {
                  const isSelected = isOwned && currentQty === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onSetQuantity(q)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all',
                        isSelected
                          ? 'bg-mh-gold-500 text-slate-950 font-black ring-1 ring-white shadow-sm'
                          : 'bg-mh-slate-900 border border-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                      )}
                    >
                      {q === 5 ? '5+' : q}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {!isOwned && (
                  challenge && challenge.status !== 'abandoned' && challenge.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => navigate('/challenges')}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                    >
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>Go to Challenge ➔</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddChallenge?.(buddy)}
                      className="flex items-center gap-1.5 rounded-lg border border-sky-600/50 bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200 px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                    >
                      <Target size={13} />
                      <span>+ Add Challenge</span>
                    </button>
                  )
                )}

                {isOwned && (
                  <button
                    type="button"
                    onClick={onRemoveFromCollection}
                    className="flex items-center gap-1 rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Role Overview */}
          <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-900/60 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              <RoleIcon size={28} />
              <span>Combat Role: {buddy.role}</span>
            </div>
            <p className="text-xs text-mh-slate-400 leading-relaxed">
              {ROLE_DESCRIPTIONS[buddy.role]}
            </p>
          </div>

          {/* Core Passive Skill */}
          <div className="rounded-xl border border-mh-gold-500/30 bg-gradient-to-br from-mh-gold-500/10 via-mh-slate-900/60 to-mh-slate-950 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-gold-400">
              <Sparkles size={14} />
              <span>Inherent Core Passive Skill</span>
            </div>
            <div className="rounded-lg bg-black/40 p-3 border border-mh-slate-800">
              <p className="text-sm text-mh-slate-100 leading-relaxed font-medium">
                {buddy.core_passive || 'No passive skill documented for this companion.'}
              </p>
            </div>
          </div>

          {/* Description */}
          {buddy.description && (
            <p className="text-xs italic text-mh-slate-400 leading-relaxed px-1">{buddy.description}</p>
          )}

          {/* Skills */}
          {skillGroups.map(({ kind, title }) => {
            const list = skills.filter((s) => s.kind === kind);
            if (list.length === 0) return null;
            return (
              <div key={kind} className="rounded-xl border border-mh-slate-800 bg-mh-slate-900/60 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                  <Zap size={13} className="text-mh-gold-400" />
                  <span>{title}</span>
                </div>
                <ul className="divide-y divide-mh-slate-800/80">
                  {list.map((sk) => (
                    <li key={sk.id} className="py-1.5 text-xs">
                      <span className="font-semibold text-mh-slate-200">{sk.name}</span>
                      {sk.description && <p className="text-mh-slate-400 leading-relaxed mt-0.5">{sk.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Notes & Extra Lore */}
          {buddy.notes && (
            <div className="rounded-xl border border-mh-slate-800/80 bg-mh-slate-950/40 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mh-slate-400 uppercase tracking-wider">
                <Info size={13} />
                <span>Notes &amp; Lore</span>
              </div>
              <p className="text-xs text-mh-slate-400 leading-relaxed">
                {buddy.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-mh-slate-800 bg-mh-slate-950/90 px-6 py-3 flex items-center justify-between text-xs text-mh-slate-500">
          <span>Monster Hunter Outlanders Companion</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-mh-slate-800 px-4 py-1.5 text-xs font-bold text-mh-slate-200 hover:bg-mh-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
