// ─────────────────────────────────────────────────────────────
// Adventurer insight controls: level pill + picker, modal level row and the
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Star } from 'lucide-react';
import {
  ADVENTURER_INSIGHT_LEVELS,
  ADVENTURER_MAX_INSIGHT,
} from '../../data/schemas/adventurer';
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

/** Small "Lv 3" / "Max" pill. */
export function InsightPill({ level, className }: { level: number; className?: string }) {
  const isMax = level >= ADVENTURER_MAX_INSIGHT;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black leading-none',
        isMax ? MAX_CLASSES : LEVEL_CLASSES,
        className,
      )}
    >
      <Star size={10} className={isMax ? 'fill-slate-950' : 'text-mh-gold-400'} />
      <span>{isMax ? 'Insight Max' : `Insight Lv ${level}`}</span>
    </span>
  );
}

interface PickerProps {
  level: number;
  onChange: (level: number) => void;
  onOpenChange?: (open: boolean) => void;
}

/** Card control: pill that opens a 1-7 menu (7 = Max), like the visage rarity selector. */
export function InsightPicker({ level, onChange, onOpenChange }: PickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useDismissable(open, () => {
    setOpen(false);
    onOpenChange?.(false);
  });
  const isMax = level >= ADVENTURER_MAX_INSIGHT;

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
        title="Set insight level"
        className={cn(
          'flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-black leading-none transition-transform hover:scale-105 active:scale-95',
          isMax ? MAX_CLASSES : LEVEL_CLASSES,
        )}
      >
        <Star size={10} className={isMax ? 'fill-slate-950' : 'text-mh-gold-400'} />
        <span>{isMax ? 'Max' : `Insight Lv ${level}`}</span>
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-36 overflow-hidden rounded-xl border border-mh-slate-700 bg-mh-slate-950 p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 border-b border-mh-slate-800">
            Insight Level
          </p>
          {[...ADVENTURER_INSIGHT_LEVELS].reverse().map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                onChange(lvl);
                setOpen(false);
                onOpenChange?.(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold transition-colors mt-0.5',
                lvl === level
                  ? 'bg-mh-gold-500/20 text-mh-gold-300 font-bold'
                  : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
              )}
            >
              <span>{lvl === ADVENTURER_MAX_INSIGHT ? 'Max (7)' : `Insight Lv ${lvl}`}</span>
              {lvl === level && <Check size={12} className="text-mh-gold-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Modal control: all seven levels laid out as toggle buttons. */
export function InsightRow({ level, onChange }: PickerProps) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {ADVENTURER_INSIGHT_LEVELS.map((lvl) => {
        const isMaxBtn = lvl === ADVENTURER_MAX_INSIGHT;
        const reached = lvl <= level;
        return (
          <button
            key={lvl}
            type="button"
            onClick={() => onChange(lvl)}
            title={isMaxBtn ? 'Max insight' : `Insight Lv ${lvl}`}
            className={cn(
              'rounded-lg border py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95',
              reached
                ? isMaxBtn
                  ? MAX_CLASSES
                  : 'bg-mh-gold-500/25 border-mh-gold-500/60 text-mh-gold-200'
                : 'bg-mh-slate-800 border-mh-slate-700 text-mh-slate-400 hover:border-mh-gold-500/40 hover:text-white',
            )}
          >
            {isMaxBtn ? 'Max' : lvl}
          </button>
        );
      })}
    </div>
  );
}
