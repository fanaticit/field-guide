// ─────────────────────────────────────────────────────────────
// LevelStepper — where a challenge is now and how to move it.
//
//   [ CRAFTED  R5 ]                         Goal R10
//   ▮▮▮▮▮▯▯▯▯▯   (tap any step to jump straight to it)
//   [ ‹ Back to R4 ]   [ + Upgrade to R6 ]
//
// Works the same for weapons / armour (rarity), visage cards (Fine → Superior),
// adventurers (insight), buddies (tier) and monster studies (done / not done).
// ─────────────────────────────────────────────────────────────
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Undo2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { challengeLevels, challengeMaxRarity, type HunterChallenge } from '../../hooks/useHunterChallenges';
import { adventurerInsightLabel } from '../../data/schemas/adventurer';
import { getRarityBadgeStyle } from '../../data/schemas/weapon';

type Kind = 'gear' | 'visage' | 'adventurer' | 'buddy' | 'monster';

function kindOf(c: HunterChallenge): Kind {
  if (c.challenge_type === 'monster') return 'monster';
  if (c.challenge_type === 'visage_set' || c.visage_id) return 'visage';
  if (c.challenge_type === 'adventurer' || c.adventurer_id) return 'adventurer';
  if (c.challenge_type === 'buddy' || c.buddy_id) return 'buddy';
  return 'gear';
}

const VISAGE_NAMES = ['Not found', 'Fine', 'Rare', 'Epic', 'Superior'];
const VISAGE_STYLE = [
  'bg-white/5 text-sky-400 border-white/10',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  'bg-blue-500/15 text-blue-300 border-blue-500/40',
  'bg-purple-500/15 text-purple-300 border-purple-500/40',
  'bg-amber-500/15 text-amber-300 border-amber-500/50',
];
const VISAGE_FILL = ['bg-sky-700', 'bg-emerald-400', 'bg-blue-400', 'bg-purple-400', 'bg-amber-400'];

/** Short name of a level, e.g. "R5", "Epic", "Insight III", "Tier 1". */
function levelName(c: HunterChallenge, level: number): string {
  switch (kindOf(c)) {
    case 'visage': return VISAGE_NAMES[level] ?? `Level ${level}`;
    case 'adventurer': return level === 0 ? 'Not recruited' : challengeMaxRarity(c) > 1 ? `Insight ${adventurerInsightLabel(level)}` : 'Recruited';
    case 'buddy': return level === 0 ? 'Not recruited' : challengeMaxRarity(c) > 1 ? (level >= 3 ? 'Tier Max' : `Tier ${level - 1}`) : 'Recruited';
    case 'monster': return level > 0 ? 'Complete' : 'In progress';
    default: return level === 0 ? 'Not crafted' : `R${level}`;
  }
}

/** The small word above the level: what the number means. */
function levelHeading(kind: Kind): string {
  switch (kind) {
    case 'visage': return 'Best card';
    case 'adventurer': case 'buddy': return 'Now';
    case 'monster': return 'Study';
    default: return 'Crafted';
  }
}

/** The main button's text for moving up to `next`. */
function upLabel(c: HunterChallenge, cur: number, next: number): string {
  switch (kindOf(c)) {
    case 'visage': return `Found ${VISAGE_NAMES[next]}`;
    case 'adventurer': return cur === 0 ? 'Mark as recruited' : `Raise to ${levelName(c, next)}`;
    case 'buddy': return cur === 0 ? 'Mark as recruited' : `Raise to ${levelName(c, next)}`;
    case 'monster': return 'Complete study task';
    default: return cur === 0 ? `Mark as crafted (R${next})` : `Upgrade to R${next}`;
  }
}

function chipStyle(c: HunterChallenge, level: number): string {
  const kind = kindOf(c);
  if (level === 0) return 'bg-white/5 text-sky-400 border-white/10';
  if (kind === 'visage') return VISAGE_STYLE[level] ?? VISAGE_STYLE[4];
  if (kind === 'gear') return getRarityBadgeStyle(level).badge;
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
}

function fillStyle(c: HunterChallenge, level: number, reached: boolean): string {
  if (!reached) return 'bg-white/10 hover:bg-white/25';
  if (kindOf(c) === 'visage') return VISAGE_FILL[level] ?? 'bg-amber-400';
  return c.status === 'completed' ? 'bg-emerald-400' : 'bg-yellow-400';
}

export function LevelStepper({
  challenge: c,
  onSetLevel,
  busy = false,
  compact = false,
}: {
  /** The challenge as shown (in a project its goal is the project's target) */
  challenge: HunterChallenge;
  onSetLevel: (level: number) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const kind = kindOf(c);
  const levels = challengeLevels(c);
  const cur = c.current_rarity ?? 0;
  const i = Math.max(0, levels.indexOf(cur));
  const prev = i > 0 ? levels[i - 1] : null;
  const next = i < levels.length - 1 ? levels[i + 1] : null;
  const goal = challengeMaxRarity(c);
  const steps = levels.filter((l) => l > 0);
  const reachedGoal = cur >= goal;

  const bar = steps.length > 1 && (
    <div className="flex items-center gap-0.5" role="group" aria-label="Set level">
      {steps.map((l) => {
        const reached = l <= cur;
        return (
          <button
            key={l}
            type="button"
            disabled={busy || l === cur}
            onClick={() => onSetLevel(l)}
            title={l === cur ? `${levelName(c, l)} (now)` : `Set to ${levelName(c, l)}`}
            aria-label={`Set to ${levelName(c, l)}`}
            className={cn(
              'flex-1 rounded-sm transition-all disabled:cursor-default',
              compact ? 'h-1.5' : 'h-2.5',
              fillStyle(c, l, reached),
              l === cur && 'ring-1 ring-white/80 ring-offset-1 ring-offset-black/60',
            )}
          />
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => prev !== null && onSetLevel(prev)}
            disabled={busy || prev === null}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30 text-sky-300 hover:text-white disabled:opacity-30"
            title={prev !== null ? `Back to ${levelName(c, prev)}` : undefined}
            aria-label="Back one step"
          >
            <ChevronLeft size={13} />
          </button>
          <span className={cn('rounded border px-1.5 py-0.5 text-[11px] font-bold', chipStyle(c, cur))}>
            {levelName(c, cur)}
          </span>
          <span className="truncate text-[10px] text-sky-500">of {levelName(c, goal)}</span>
          <button
            type="button"
            onClick={() => next !== null && onSetLevel(next)}
            disabled={busy || next === null}
            className={cn(
              'ml-auto flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition-colors disabled:opacity-40',
              reachedGoal
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25',
            )}
            title={next !== null ? upLabel(c, cur, next) : 'Goal reached'}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : reachedGoal && next === null ? <Check size={12} /> : <ChevronRight size={13} />}
            {next !== null ? levelName(c, next) : 'Done'}
          </button>
        </div>
        {bar}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">{levelHeading(kind)}</span>
          <span className={cn('rounded-md border px-2 py-0.5 text-sm font-bold', chipStyle(c, cur))}>
            {levelName(c, cur)}
          </span>
        </div>
        <span className={cn('text-[11px] font-semibold', reachedGoal ? 'text-emerald-300' : 'text-sky-400')}>
          {reachedGoal ? <><Check size={11} className="mr-0.5 inline" />Goal reached</> : <>Goal {levelName(c, goal)}</>}
        </span>
      </div>

      {bar}

      <div className="flex items-stretch gap-2">
        {prev !== null && (
          <button
            type="button"
            onClick={() => onSetLevel(prev)}
            disabled={busy}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold text-sky-300 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
            title="Go back one step, e.g. if you tapped by mistake"
          >
            <Undo2 size={13} />
            {cur > 0 && prev === 0 ? 'Undo' : `Back to ${levelName(c, prev)}`}
          </button>
        )}
        {next !== null ? (
          <button
            type="button"
            onClick={() => onSetLevel(next)}
            disabled={busy}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-xs font-bold transition-all disabled:opacity-60',
              reachedGoal
                ? 'border-white/10 bg-black/30 text-sky-300 hover:text-white'
                : 'border-[var(--border-active)] bg-[var(--bg-superior)] text-[var(--theme-accent)] hover:shadow-[0_0_12px_var(--accent-gold-glow)]',
            )}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {upLabel(c, cur, next)}
          </button>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300">
            <Check size={13} /> {kind === 'gear' ? `R${cur} — goal reached` : 'Complete'}
          </span>
        )}
      </div>
    </div>
  );
}
