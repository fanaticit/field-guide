// ─────────────────────────────────────────────────────────────
// Investigation Journey bits for the monster study lists:
//   HowToUnlockButton  "How to unlock" link next to the Unlocked task → small pop-up
//                      with the server days, Investigation Notes studies and the
//                      monster studies the step needs (with the hunter's counts)
//   FreeHuntCounter    "Free Hunt Study" task with a − / + count, for monsters whose
//                      studies a journey step needs
// ─────────────────────────────────────────────────────────────
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, HelpCircle, Minus, Plus, Route, X, CalendarDays, BookOpen, Crosshair } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { JourneyStep } from '../../hooks/useInvestigationJourney';

// ── How to unlock ────────────────────────────────────────────

interface HowToUnlockProps {
  step: JourneyStep;
  /** Studies logged for the step's required monster */
  monsterStudies: number;
  monsterIcon?: string | null;
  /** Open the required monster (e.g. its details) */
  onOpenMonster?: (monsterId: string) => void;
  className?: string;
}

function ProgressLine({ have, need }: { have: number; need: number }) {
  const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100;
  const done = have >= need;
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mh-slate-800">
        <div className={cn('h-full rounded-full', done ? 'bg-emerald-400' : 'bg-mh-gold-400')} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('shrink-0 font-mono text-[10px] font-bold', done ? 'text-emerald-300' : 'text-mh-slate-300')}>
        {have}/{need}
      </span>
    </div>
  );
}

export function HowToUnlockButton({ step, monsterStudies, monsterIcon, onOpenMonster, className }: HowToUnlockProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Place the pop-up next to the link, kept inside the window
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const place = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const w = 288;
      const h = panelRef.current?.offsetHeight ?? 320;
      const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
      const below = r.bottom + 6;
      const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below;
      setPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const needStudies = step.monster_studies ?? 0;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-sky-300 underline decoration-dotted underline-offset-2 hover:text-white',
          className,
        )}
        title="How to unlock this monster on the Investigation Journey"
      >
        <HelpCircle size={10} />
        How to unlock
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: 288 }}
          className="fixed z-[200] space-y-2.5 rounded-xl border border-mh-gold-500/40 bg-mh-slate-950/95 p-3 text-left text-white shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-start gap-2">
            <Route size={14} className="mt-0.5 shrink-0 text-mh-gold-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight">How to unlock {step.unlocks_name}</p>
              <p className="text-[10px] text-mh-slate-400">Investigation Journey {step.journey} · Step {step.step}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-mh-slate-500 hover:text-white" title="Close">
              <X size={13} />
            </button>
          </div>

          <ul className="space-y-2 text-[11px]">
            {needStudies > 0 && step.studies_monster_name && (
              <li className="flex gap-2">
                <Crosshair size={13} className="mt-0.5 shrink-0 text-rose-400" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {monsterIcon && <img src={monsterIcon} alt="" className="h-5 w-5 object-contain" />}
                    <span>{needStudies} studies of {step.studies_monster_name}</span>
                    {monsterStudies >= needStudies && <Check size={12} className="text-emerald-400" />}
                  </p>
                  <ProgressLine have={monsterStudies} need={needStudies} />
                  {onOpenMonster && step.studies_monster_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenMonster(step.studies_monster_id!);
                      }}
                      className="mt-1 text-[10px] font-semibold text-sky-300 hover:text-white"
                    >
                      Open {step.studies_monster_name} →
                    </button>
                  )}
                </div>
              </li>
            )}
            {step.server_day != null && (
              <li className="flex gap-2">
                <CalendarDays size={13} className="mt-0.5 shrink-0 text-sky-400" />
                <div>
                  <p className="font-semibold">Server open for {step.server_day} days</p>
                  <p className="text-[10px] text-mh-slate-500">Counted from when your game server opened, so it differs per server.</p>
                </div>
              </li>
            )}
            {step.total_studies != null && (
              <li className="flex gap-2">
                <BookOpen size={13} className="mt-0.5 shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{step.total_studies} Investigation Notes studies <span className="font-normal text-mh-slate-400">(any monster)</span></p>
                  <p className="text-[10px] text-mh-slate-500">Check your total in the game's Investigation Notes.</p>
                </div>
              </li>
            )}
          </ul>

          {step.what_unlocking_does && (
            <p className="border-t border-mh-slate-800 pt-2 text-[10px] leading-relaxed text-mh-slate-400">{step.what_unlocking_does}</p>
          )}
          {step.rewards.length > 0 && (
            <p className="text-[10px] text-mh-gold-300">
              Reward: {step.rewards.map((r) => `${r.item} ×${r.count.toLocaleString('en-GB')}`).join(', ')}
            </p>
          )}
          {needStudies > 0 && (
            <p className="text-[10px] text-sky-400/90">
              Once {step.studies_monster_name} has {needStudies} studies logged, Unlocked is ticked here for you.
            </p>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Unlock progress (inline) ─────────────────────────────────

/** The step's monster-study requirement as a compact bar, for wide Unlocked rows. */
export function UnlockProgressInline({
  step,
  monsterStudies,
  monsterIcon,
  className,
}: {
  step: JourneyStep;
  monsterStudies: number;
  monsterIcon?: string | null;
  className?: string;
}) {
  const need = step.monster_studies ?? 0;
  if (!need || !step.studies_monster_name) return null;
  const done = monsterStudies >= need;
  const pct = Math.min(100, Math.round((monsterStudies / need) * 100));
  return (
    <div
      className={cn('items-center gap-1.5 rounded-lg border border-mh-slate-800 bg-mh-slate-950/60 px-2 py-1', className)}
      title={`${need} Investigation Notes studies of ${step.studies_monster_name} unlock this monster`}
    >
      {monsterIcon ? <img src={monsterIcon} alt="" className="h-5 w-5 shrink-0 object-contain" /> : <Crosshair size={12} className="shrink-0 text-rose-400" />}
      <span className="max-w-[9rem] truncate text-[10px] font-semibold text-mh-slate-200">{step.studies_monster_name}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-mh-slate-800">
        <div className={cn('h-full rounded-full', done ? 'bg-emerald-400' : 'bg-mh-gold-400')} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('font-mono text-[10px] font-bold', done ? 'text-emerald-300' : 'text-mh-slate-300')}>
        {Math.min(monsterStudies, need)}/{need}
      </span>
      {done && <Check size={11} className="text-emerald-400" />}
    </div>
  );
}

// ── Free Hunt Study counter ──────────────────────────────────

export function FreeHuntCounter({
  count,
  logged,
  needs,
  onChange,
  compact = false,
  revealNames = true,
}: {
  /** Name the monsters these studies unlock (off when the hunter hides spoilers) */
  revealNames?: boolean;
  /** Free Hunt Study count */
  count: number;
  /** All studies logged for the monster (field study tasks + free hunt studies) */
  logged: number;
  /** Journey steps that need studies of this monster */
  needs: JourneyStep[];
  onChange: (next: number) => void;
  compact?: boolean;
}) {
  const need = Math.max(0, ...needs.map((s) => s.monster_studies ?? 0));
  const forNames = revealNames ? needs.map((s) => s.unlocks_name).join(', ') : 'the next monster on the journey';
  const enough = need > 0 && logged >= need;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const stepper = (
    <div className="flex shrink-0 items-center gap-1" onClick={stop}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, count - 1))}
        disabled={count <= 0}
        className={cn('flex items-center justify-center rounded border border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:text-white disabled:opacity-40', compact ? 'h-4 w-4' : 'h-6 w-6')}
        title="One less"
      >
        <Minus size={compact ? 9 : 12} />
      </button>
      <span className={cn('min-w-[1.5rem] text-center font-mono font-bold', compact ? 'text-[10px]' : 'text-xs', enough ? 'text-emerald-300' : 'text-mh-gold-300')}>
        {count}
      </span>
      <button
        type="button"
        onClick={() => onChange(count + 1)}
        className={cn('flex items-center justify-center rounded border border-mh-gold-500/40 bg-mh-gold-500/15 text-mh-gold-300 hover:bg-mh-gold-500/25', compact ? 'h-4 w-4' : 'h-6 w-6')}
        title="One more study finished"
      >
        <Plus size={compact ? 9 : 12} />
      </button>
    </div>
  );

  if (compact) {
    return (
      <div
        className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs', enough ? 'bg-mh-gold-500/10 text-mh-gold-200' : 'text-mh-slate-300')}
        title={need ? `${logged}/${need} studies logged (field studies + free hunts) — ${need} unlock ${forNames}` : undefined}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Route size={12} className="shrink-0 text-sky-400" />
          <span className="truncate text-[11px]">Free Hunt Study</span>
          {need > 0 && <span className={cn('shrink-0 text-[9px]', enough ? 'text-emerald-400' : 'text-mh-slate-500')}>{logged}/{need}</span>}
        </div>
        {stepper}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border p-2.5 sm:p-3',
        enough ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-sky-700/40 bg-sky-950/20',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Route size={16} className="mt-0.5 shrink-0 text-sky-400" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-bold leading-tight text-mh-slate-100">Free Hunt Study</p>
            <span className="rounded border border-sky-500/30 bg-sky-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-sky-300">
              Investigation Journey
            </span>
          </div>
          <p className="mt-0.5 text-[10px] leading-normal text-mh-slate-400">
            Investigation Notes studies finished on this monster (most come from free hunts).
            {need > 0 && ` ${logged}/${need} logged with your field studies — ${need} unlock ${forNames}${enough ? ' ✓' : ''}.`}
          </p>
        </div>
      </div>
      {stepper}
    </div>
  );
}
