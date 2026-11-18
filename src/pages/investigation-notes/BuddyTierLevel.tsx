// ─────────────────────────────────────────────────────────────
// Buddy tier level controls: level pill, quick dropdown picker, and modal level row.
// Buddies have tier progression: Tier 0, Tier 1, and Tier 2 (Max).
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import {
  BUDDY_TIER_LEVELS,
  BUDDY_MAX_TIER_LEVEL,
  buddyTierLevelLabel,
} from '../../data/schemas/buddy';
import { cn } from '../../lib/utils';

function useDismissable(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);
  return ref;
}

const MAX_CLASSES =
  'bg-mh-gold-500 text-slate-950 border-mh-gold-300 shadow-sm shadow-mh-gold-500/30';
const LEVEL_CLASSES = 'bg-mh-slate-900/90 text-mh-slate-200 border-mh-slate-600';

/** Small "Tier 0" / "Tier 1" / "Tier 2 (Max)" pill. */
export function BuddyTierLevelPill({ level, className }: { level: number; className?: string }) {
  const isMax = level >= BUDDY_MAX_TIER_LEVEL;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black leading-none whitespace-nowrap',
        isMax ? MAX_CLASSES : LEVEL_CLASSES,
        className,
      )}
    >
      <Layers size={10} className={isMax ? 'text-slate-950' : 'text-mh-gold-400'} />
      <span>{isMax ? 'Tier Max (2)' : `Tier ${level}`}</span>
    </span>
  );
}

interface BuddyTierPickerProps {
  level: number;
  onChange: (level: number) => void;
}

/** Card & table control: button pill that opens a Tier 0, 1, 2 menu. */
export function BuddyTierPicker({ level, onChange }: BuddyTierPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useDismissable(open, () => setOpen(false));
  const isMax = level >= BUDDY_MAX_TIER_LEVEL;

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Set buddy tier level (Tier 0, 1, or 2 Max)"
        className={cn(
          'flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-black leading-none transition-transform hover:scale-105 active:scale-95 whitespace-nowrap',
          isMax ? MAX_CLASSES : LEVEL_CLASSES,
        )}
      >
        <Layers size={10} className={isMax ? 'text-slate-950' : 'text-mh-gold-400'} />
        <span>{isMax ? 'Max' : `Tier ${level}`}</span>
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute top-full sm:bottom-full sm:top-auto right-0 z-50 my-1 sm:mb-2 w-36 overflow-hidden rounded-xl border border-mh-slate-700 bg-mh-slate-950 p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 border-b border-mh-slate-800">
            Buddy Tier Level
          </p>
          {[...BUDDY_TIER_LEVELS].reverse().map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                onChange(lvl);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold transition-colors mt-0.5',
                lvl === level
                  ? 'bg-mh-gold-500/20 text-mh-gold-300 font-bold'
                  : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
              )}
            >
              <span>{buddyTierLevelLabel(lvl)}</span>
              {lvl === level && <Check size={12} className="text-mh-gold-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Modal control: all 3 levels laid out as toggle buttons. */
export function BuddyTierRow({ level, onChange }: BuddyTierPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {BUDDY_TIER_LEVELS.map((lvl) => {
        const isMaxBtn = lvl === BUDDY_MAX_TIER_LEVEL;
        const reached = lvl <= level;
        const isExact = lvl === level;
        return (
          <button
            key={lvl}
            type="button"
            onClick={() => onChange(lvl)}
            title={isMaxBtn ? 'Max tier level' : `Tier ${lvl}`}
            className={cn(
              'rounded-lg border py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95',
              isExact
                ? isMaxBtn
                  ? MAX_CLASSES
                  : 'bg-mh-gold-500 text-slate-950 font-black border-mh-gold-300 shadow-sm'
                : reached
                  ? 'bg-mh-gold-500/25 border-mh-gold-500/60 text-mh-gold-200'
                  : 'bg-mh-slate-800 border-mh-slate-700 text-mh-slate-400 hover:border-mh-gold-500/40 hover:text-white',
            )}
          >
            {isMaxBtn ? 'Tier 2 (Max)' : `Tier ${lvl}`}
          </button>
        );
      })}
    </div>
  );
}

export interface BuddyChallengeGoalMenuProps {
  /** Current tier level of the buddy: -1 if unowned, 0 for Tier 0, 1 for Tier 1, 2 for Tier 2 (Max). */
  currentLevel: number;
  /** Callback with the selected target tier goal: 1 = recruit only, 2 = Tier 1, 3 = Tier 2 (Max). */
  onSelect: (targetGoal: number) => void;
  className?: string;
  children?: React.ReactNode;
  align?: 'left' | 'right';
  placement?: 'top' | 'bottom';
  onOpenChange?: (open: boolean) => void;
}

/** "+ Challenge" button that lets the hunter pick the buddy goal: recruit, or reach Tier 1 or Tier 2 (Max). */
export function BuddyChallengeGoalMenu({
  currentLevel,
  onSelect,
  className,
  children,
  align = 'left',
  placement = 'top',
  onOpenChange,
}: BuddyChallengeGoalMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useDismissable(open, () => {
    setOpen(false);
    onOpenChange?.(false);
  });

  // Available goals:
  // 1: Recruit only (Tier 0+) - available if currentLevel < 0
  // 2: Reach Tier 1 - available if currentLevel < 1
  // 3: Reach Tier 2 (Max) - available if currentLevel < 2
  const goals: { targetGoal: number; label: string; badge: string }[] = [];
  if (currentLevel < 0) {
    goals.push({ targetGoal: 1, label: 'Recruit only', badge: 'Tier 0' });
  }
  if (currentLevel < 1) {
    goals.push({ targetGoal: 2, label: 'Reach Tier 1', badge: 'Tier 1' });
  }
  if (currentLevel < 2) {
    goals.push({ targetGoal: 3, label: 'Reach Tier 2 (Max)', badge: 'Tier 2' });
  }

  if (goals.length === 0) return null;

  const handleToggle = () => {
    setOpen((v) => {
      const next = !v;
      onOpenChange?.(next);
      return next;
    });
  };

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleToggle}
        title="Set a buddy recruitment / tier upgrade challenge"
        className={cn(
          'flex items-center gap-1 border border-sky-600/50 bg-transparent text-sky-400 font-bold shadow-xs transition-all hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200',
          className,
        )}
      >
        {children ?? (
          <>
            <Layers size={11} />
            <span>+ Challenge</span>
          </>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 w-52 overflow-hidden rounded-xl border border-sky-700 bg-mh-slate-950 p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100',
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 border-b border-mh-slate-800">
            Challenge goal
          </p>
          <div className="py-0.5 space-y-0.5">
            {goals.map((g) => (
              <button
                key={g.targetGoal}
                type="button"
                onClick={() => {
                  onSelect(g.targetGoal);
                  setOpen(false);
                  onOpenChange?.(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-mh-slate-200 transition-colors hover:bg-sky-900 hover:text-white"
              >
                <span>{g.label}</span>
                <span className="text-[10px] font-bold text-sky-400">{g.badge}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

