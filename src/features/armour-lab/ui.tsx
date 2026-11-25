// ─────────────────────────────────────────────────────────────
// Armour Lab — shared UI pieces for the armour v2 / v3 / v4 pages.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Lock, Search, Shield, Sparkles, X } from 'lucide-react';
import PageTitlePanel from '../../components/layout/PageTitlePanel';
import { useArmourLabStore } from './store';
import { cn } from '../../lib/utils';
import { getRarityBadgeStyle } from '../../data/schemas/armour';
import {
  LAB_SLOTS,
  clampRarity,
  pieceSkillKeys,
  skillTimeline,
  skillsAt,
  type LabBuild,
  type LabData,
  type LabPiece,
  type LabSlot,
  type LabTarget,
} from './logic';

// ── Colours per game skill category ──────────────────────────

const TONES = {
  red: { chip: 'bg-red-500/15 border-red-500/40 text-red-300', pip: 'bg-red-400', dot: 'bg-red-400' },
  pink: { chip: 'bg-pink-500/15 border-pink-500/40 text-pink-300', pip: 'bg-pink-400', dot: 'bg-pink-400' },
  teal: { chip: 'bg-teal-500/15 border-teal-500/40 text-teal-300', pip: 'bg-teal-400', dot: 'bg-teal-400' },
  blue: { chip: 'bg-blue-500/15 border-blue-500/40 text-blue-300', pip: 'bg-blue-400', dot: 'bg-blue-400' },
  amber: { chip: 'bg-amber-500/15 border-amber-500/40 text-amber-300', pip: 'bg-amber-400', dot: 'bg-amber-400' },
  emerald: { chip: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300', pip: 'bg-emerald-400', dot: 'bg-emerald-400' },
  purple: { chip: 'bg-purple-500/15 border-purple-500/40 text-purple-300', pip: 'bg-purple-400', dot: 'bg-purple-400' },
  slate: { chip: 'bg-slate-500/15 border-slate-500/40 text-slate-300', pip: 'bg-slate-300', dot: 'bg-slate-300' },
};
export type Tone = (typeof TONES)[keyof typeof TONES];

const CATEGORY_TONE: Record<string, keyof typeof TONES> = {
  'Hunt (General)': 'red',
  'Hunt (Ranged)': 'pink',
  'Weapon-specific': 'teal',
  Attributes: 'blue',
  Resistance: 'amber',
  Survival: 'emerald',
  Exploration: 'purple',
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_TONE);

export function toneFor(category: string | undefined): Tone {
  return TONES[CATEGORY_TONE[category ?? ''] ?? 'slate'];
}

// ── One colour per wanted skill ──────────────────────────────
// The filter chips and every piece that has the skill share it, so a
// hunter can spot "the orange one" across the whole page.

export interface TargetTone {
  dot: string;
  chip: string;
  /** Background for a skill line on a piece */
  pill: string;
  /** Faint tint for a whole piece cell */
  cell: string;
  /** Solid bar colour */
  bar: string;
  /** The same colour as a hex value (for the exported image) */
  hex: string;
}

const TARGET_TONES: TargetTone[] = [
  { dot: 'bg-orange-400', chip: 'border-orange-400/70 bg-orange-500/15', pill: 'bg-orange-500/25 text-orange-100', cell: 'bg-orange-500/[0.07]', bar: 'bg-orange-400', hex: '#fb923c' },
  { dot: 'bg-cyan-400', chip: 'border-cyan-400/70 bg-cyan-500/15', pill: 'bg-cyan-500/25 text-cyan-100', cell: 'bg-cyan-500/[0.07]', bar: 'bg-cyan-400', hex: '#22d3ee' },
  { dot: 'bg-lime-400', chip: 'border-lime-400/70 bg-lime-500/15', pill: 'bg-lime-500/25 text-lime-100', cell: 'bg-lime-500/[0.07]', bar: 'bg-lime-400', hex: '#a3e635' },
  { dot: 'bg-fuchsia-400', chip: 'border-fuchsia-400/70 bg-fuchsia-500/15', pill: 'bg-fuchsia-500/25 text-fuchsia-100', cell: 'bg-fuchsia-500/[0.07]', bar: 'bg-fuchsia-400', hex: '#e879f9' },
  { dot: 'bg-yellow-300', chip: 'border-yellow-300/70 bg-yellow-400/15', pill: 'bg-yellow-400/25 text-yellow-100', cell: 'bg-yellow-400/[0.07]', bar: 'bg-yellow-300', hex: '#fde047' },
  { dot: 'bg-rose-400', chip: 'border-rose-400/70 bg-rose-500/15', pill: 'bg-rose-500/25 text-rose-100', cell: 'bg-rose-500/[0.07]', bar: 'bg-rose-400', hex: '#fb7185' },
  { dot: 'bg-sky-400', chip: 'border-sky-400/70 bg-sky-500/15', pill: 'bg-sky-500/25 text-sky-100', cell: 'bg-sky-500/[0.07]', bar: 'bg-sky-400', hex: '#38bdf8' },
  { dot: 'bg-emerald-400', chip: 'border-emerald-400/70 bg-emerald-500/15', pill: 'bg-emerald-500/25 text-emerald-100', cell: 'bg-emerald-500/[0.07]', bar: 'bg-emerald-400', hex: '#34d399' },
];

export function targetTones(targets: LabTarget[]): Map<string, TargetTone> {
  return new Map(targets.map((t, i) => [t.key, TARGET_TONES[i % TARGET_TONES.length]]));
}

/** Wanted skills a piece has: given at my rarity, or only later (locked) */
export function wantedOnPiece(piece: LabPiece, rarity: number, tones: Map<string, TargetTone>) {
  const now = skillsAt(piece, clampRarity(piece, rarity));
  const out: Array<{ key: string; tone: TargetTone; locked: boolean }> = [];
  for (const key of pieceSkillKeys(piece)) {
    const tone = tones.get(key);
    if (tone) out.push({ key, tone, locked: !(now[key] > 0) });
  }
  return out;
}

/** True when a build piece follows my rarity but can't be crafted that low */
export function isLockedInBuild(piece: LabPiece, entryRarity: number | null | undefined, myRarity: number) {
  return entryRarity == null && piece.rarity > myRarity;
}

export const LOCK_ICON = '/img/ui/lock.png';

// ── Small building blocks ────────────────────────────────────

export function RarityBadge({ rarity, className, title }: { rarity: number; className?: string; title?: string }) {
  const s = getRarityBadgeStyle(rarity);
  return (
    <span
      title={title}
      className={cn('inline-flex items-center rounded border px-1.5 py-px font-mono text-[10px] font-bold leading-4', s.bg, s.text, s.border, className)}
    >
      {s.label}
    </span>
  );
}

/** Level pips. `preview` draws extra hollow pips for levels still to come. */
export function SkillPips({ level, max, preview = 0, tone, size = 'md' }: { level: number; max: number; preview?: number; tone?: Tone; size?: 'sm' | 'md' }) {
  const full = level >= max;
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`Level ${level} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'inline-block rounded-[1px]',
            size === 'sm' ? 'h-2.5 w-1' : 'h-3 w-1.5',
            i < level
              ? full
                ? (tone?.pip ?? 'bg-mh-gold-400')
                : 'bg-sky-400'
              : i < level + preview
                ? 'border border-dashed border-amber-400/80 bg-amber-400/10'
                : 'bg-slate-700/80',
          )}
        />
      ))}
    </span>
  );
}

export function PieceIcon({ piece, slot, size = 40, className, dim }: { piece?: LabPiece | null; slot?: LabSlot; size?: number; className?: string; dim?: boolean }) {
  const fallback = LAB_SLOTS.find((s) => s.id === (piece?.slot ?? slot))?.icon;
  const src = piece?.image ?? fallback;
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-950 p-0.5', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" draggable={false} className={cn('h-full w-full object-contain', (!piece || dim) && 'opacity-40')} />
      ) : (
        <Shield size={size * 0.5} className="text-mh-slate-500" />
      )}
    </span>
  );
}

export function SkillChip({ name, category, level, max, muted, highlight, title, onClick }: {
  name: string;
  category?: string;
  level?: number;
  max?: number;
  muted?: boolean;
  highlight?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  const tone = toneFor(category);
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-4',
        highlight ? tone.chip : muted ? 'border-mh-slate-700 bg-transparent text-mh-slate-500' : 'border-mh-slate-700 bg-mh-slate-900 text-mh-slate-300',
        highlight && 'ring-1 ring-current/30',
        onClick && 'hover:brightness-125',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot, muted && 'opacity-40')} />
      {name}
      {level !== undefined && (
        <span className="font-mono">
          {level}
          {max !== undefined && <span className="opacity-50">/{max}</span>}
        </span>
      )}
    </Comp>
  );
}

// ── "My rarity" control ──────────────────────────────────────

export function RarityControl({ value, min, max, onChange, onPick, compact }: {
  value: number;
  min: number;
  max: number;
  onChange: (r: number) => void;
  /** Called instead of onChange when a rarity chip itself is clicked */
  onPick?: (r: number) => void;
  compact?: boolean;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="@container flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-900 text-mh-slate-200 hover:border-mh-gold-400 disabled:opacity-30"
        aria-label="Lower rarity"
      >
        <ChevronLeft size={16} />
      </button>
      <div
        className={cn(
          'grid min-w-0 flex-1 grid-cols-7 gap-1 py-0.5 @min-[560px]:flex',
          compact && 'hidden sm:grid',
        )}
        role="radiogroup"
        aria-label="Armour rarity"
      >
        {values.map((r) => {
          const s = getRarityBadgeStyle(r);
          const on = r === value;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => (onPick ?? onChange)(r)}
              className={cn(
                'h-8 min-w-0 flex-1 rounded-lg border font-mono text-xs font-bold transition-all @min-[560px]:min-w-[2.25rem]',
                on
                  ? cn(s.bg, s.text, 'border-current ring-2 ring-current/40 scale-105')
                  : r < value
                    ? cn(s.bg, s.text, s.border, 'opacity-70 hover:opacity-100')
                    : 'border-mh-slate-700 bg-mh-slate-950 text-mh-slate-500 hover:text-mh-slate-200',
              )}
            >
              {r}
            </button>
          );
        })}
      </div>
      {compact && <RarityBadge rarity={value} className="sm:hidden px-2 py-1 text-sm" />}
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-900 text-mh-slate-200 hover:border-mh-gold-400 disabled:opacity-30"
        aria-label="Raise rarity"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Skill picker (search + browse) ───────────────────────────

/** Number of pieces that can give each skill (at max rarity) */
export function useSkillPieceCounts(data: LabData | null) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    if (!data) return counts;
    for (const p of data.pieces) {
      const last = p.steps[p.steps.length - 1];
      for (const key of Object.keys(last.skills)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [data]);
}

export function SkillPicker({ data, exclude, onPick, placeholder = 'Search a skill, e.g. Insight, Health Boost…' }: {
  data: LabData;
  exclude?: Set<string>;
  onPick: (key: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const counts = useSkillPieceCounts(data);

  // Only skills armour can give (directly or as a set bonus)
  const available = useMemo(() => {
    const bonusKeys = new Set(data.pieces.map((p) => p.setBonus?.skillKey).filter(Boolean) as string[]);
    return [...data.skills.values()]
      .filter((s) => (counts.get(s.key) ?? 0) > 0 || bonusKeys.has(s.key))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, counts]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = available.filter((s) => !exclude?.has(s.key));
    if (!q) return list.slice(0, 40);
    return list
      .filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
      .slice(0, 40);
  }, [available, exclude, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (key: string) => {
    onPick(key);
    setQuery('');
    setOpen(false);
  };

  const grouped = useMemo(() => {
    const g = new Map<string, typeof available>();
    for (const s of available) {
      const cat = CATEGORY_ORDER.includes(s.category) ? s.category : 'Other';
      if (!g.has(cat)) g.set(cat, []);
      g.get(cat)!.push(s);
    }
    return [...g.entries()].sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]));
  }, [available]);

  return (
    <div ref={wrapRef} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, matches.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && matches[active]) {
                e.preventDefault();
                pick(matches[active].key);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className="h-10 w-full rounded-xl border border-mh-slate-700 bg-mh-slate-950 pl-9 pr-3 text-sm text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-400 focus:outline-none"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-mh-slate-700 bg-mh-slate-900 p-1 shadow-2xl" role="listbox">
              {matches.map((s, i) => (
                <li key={s.key} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(s.key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm',
                      i === active ? 'bg-mh-slate-700 text-white' : 'text-mh-slate-300',
                    )}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', toneFor(s.category).dot)} />
                    <span className="flex-1 truncate font-semibold">{s.name}</span>
                    <span className="hidden text-[10px] text-mh-slate-500 sm:inline">{s.category}</span>
                    <span className="font-mono text-[10px] text-mh-slate-400">max {s.maxLevel}</span>
                    <span className="w-14 text-right text-[10px] text-mh-slate-500">{counts.get(s.key) ?? 0} pcs</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => setBrowse((b) => !b)}
          className={cn(
            'flex h-10 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-bold',
            browse ? 'border-mh-gold-400 text-mh-gold-300' : 'border-mh-slate-700 text-mh-slate-300 hover:text-white',
          )}
        >
          Browse <ChevronDown size={14} className={cn('transition-transform', browse && 'rotate-180')} />
        </button>
      </div>

      {browse && (
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-2.5">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-mh-slate-500">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {list.map((s) => (
                  <SkillChip
                    key={s.key}
                    name={s.name}
                    category={s.category}
                    muted={exclude?.has(s.key)}
                    title={`${counts.get(s.key) ?? 0} pieces · max level ${s.maxLevel}`}
                    onClick={exclude?.has(s.key) ? undefined : () => pick(s.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Chips of the wanted skills, each with a target level stepper */
export function TargetList({ data, targets, have, onLevel, onRemove }: {
  data: LabData;
  targets: LabTarget[];
  /** Level the current build reaches, per skill */
  have?: Record<string, number>;
  onLevel: (key: string, level: number) => void;
  onRemove: (key: string) => void;
}) {
  const tones = targetTones(targets);
  if (targets.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {targets.map((t) => {
        const s = data.skills.get(t.key);
        const tone = tones.get(t.key)!;
        const got = have ? Math.min(have[t.key] ?? 0, t.level) : null;
        const met = got !== null && got >= t.level;
        return (
          <div key={t.key} className={cn('flex items-center gap-1.5 rounded-xl border py-1 pl-2 pr-1 text-xs', tone.chip)}>
            {met ? <CheckCircle2 size={13} className="text-emerald-300" /> : <span className={cn('h-2.5 w-2.5 rounded-full', tone.dot)} />}
            <span className="font-bold text-mh-slate-100">{s?.name ?? t.key}</span>
            {got !== null && (
              <span className={cn('font-mono font-bold', met ? 'text-emerald-300' : 'text-mh-slate-300')}>
                {got}/{t.level}
              </span>
            )}
            <span className="ml-1 flex items-center rounded-lg border border-mh-slate-700 bg-mh-slate-950">
              <button type="button" className="px-1.5 text-mh-slate-400 hover:text-white disabled:opacity-30" disabled={t.level <= 1} onClick={() => onLevel(t.key, t.level - 1)} aria-label="Lower target level">−</button>
              <span className="px-0.5 font-mono text-[11px] text-mh-slate-200" title="Target level">Lv{t.level}</span>
              <button type="button" className="px-1.5 text-mh-slate-400 hover:text-white disabled:opacity-30" disabled={t.level >= (s?.maxLevel ?? 5)} onClick={() => onLevel(t.key, t.level + 1)} aria-label="Raise target level">+</button>
            </span>
            <button type="button" onClick={() => onRemove(t.key)} className="rounded-md p-0.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white" aria-label={`Remove ${s?.name}`}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Version switcher ─────────────────────────────────────────

const VERSIONS = [
  { to: '/armory/armour', label: 'Armour (new)', hint: 'The new armour page' },
  { to: '/armory/armour_old', label: 'Old page', hint: 'The previous armour page' },
  { to: '/armory/armour_v3', label: 'v3 · Armour Table', hint: 'Every set in one table, build on top' },
  { to: '/armory/armour_v4', label: 'v4 · Equipment Box', hint: 'Pick a slot, compare pieces like in game' },
];

export function VersionNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Armour page versions">
      <span className="mr-1 flex items-center gap-1 font-bold uppercase tracking-wider text-mh-slate-500">
        <Sparkles size={12} /> Preview
      </span>
      {VERSIONS.map((v) => (
        <Link
          key={v.to}
          to={v.to}
          title={v.hint}
          className={cn(
            'rounded-lg border px-2.5 py-1 font-semibold transition-colors',
            v.to === current
              ? 'border-mh-gold-400 bg-mh-gold-500/15 text-mh-gold-300'
              : 'border-mh-slate-700 text-mh-slate-400 hover:border-mh-slate-500 hover:text-white',
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}

// ── Page helpers ─────────────────────────────────────────────

/**
 * #app-root uses overflow-x: hidden, which silently turns off position: sticky
 * for everything inside it. While a lab page is open, switch it to `clip`
 * (same visual result, but sticky works). Restored when the page closes.
 */
export function useStickyFriendlyRoot() {
  useEffect(() => {
    const root = document.getElementById('app-root');
    if (!root) return;
    const prev = root.style.overflowX;
    root.style.overflowX = 'clip';
    return () => {
      root.style.overflowX = prev;
    };
  }, []);
}

/** Classes for a bar fixed to the bottom of the screen, clear of the site navigation */
export const FLOATING_BAR_CLASS =
  'fixed bottom-3 right-3 left-[calc(var(--nav-offset,0px)+0.75rem)] [@media(max-width:1023px)_and_(orientation:portrait)]:bottom-[calc(var(--nav-bar-h)+var(--nav-margin)*2+env(safe-area-inset-bottom,0px))]';

// ── Modal shell ──────────────────────────────────────────────

export function Modal({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl sm:rounded-2xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Loading / error states shared by the lab pages */
export function LabStatus({ isLoading, error }: { isLoading: boolean; error: unknown }) {
  if (error) {
    return <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">Could not load armour data. Please refresh the page.</p>;
  }
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-8 text-sm text-mh-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" /> Loading armour…
      </div>
    );
  }
  return null;
}

// ── Page header: title, rarity (folds into the title bar) ───

export function LabHeader({ title, description, current, minRarity, maxRarity, notice, onRarityChange, showVersions = true }: {
  title: string;
  description: ReactNode;
  current: string;
  /** Show the strip of design versions (only on the explored layouts) */
  showVersions?: boolean;
  minRarity: number;
  maxRarity: number;
  /** Shown under the header, e.g. what a rarity change did to the build */
  notice?: ReactNode;
  onRarityChange?: (from: number, to: number) => void;
}) {
  const introKey = `${current}-intro-hidden`;
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(introKey) === '1');
  const { myRarity: saved, setMyRarity, hideAbove, setHideAbove } = useArmourLabStore();
  const rarity = Math.min(saved ?? maxRarity, maxRarity);
  const [open, setOpen] = useState(saved === null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const change = (r: number, close: boolean) => {
    if (r !== rarity) onRarityChange?.(rarity, r);
    setMyRarity(r);
    clearTimeout(closeTimer.current);
    if (close) closeTimer.current = setTimeout(() => setOpen(false), 300);
  };

  return (
    <div className="space-y-2">
      {showVersions && <VersionNav current={current} />}
      <PageTitlePanel
        icon="/img/ui/Equipment%20Icon.png"
        title={title}
        hidden={introHidden}
        onToggleHidden={() => {
          localStorage.setItem(introKey, introHidden ? '0' : '1');
          setIntroHidden(!introHidden);
        }}
        description={description}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title="Change the rarity your armour is at"
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors',
            open ? 'border-mh-gold-400 text-mh-gold-200' : 'border-mh-slate-600 text-mh-slate-300 hover:border-mh-gold-400 hover:text-white',
          )}
        >
          My rarity <RarityBadge rarity={rarity} className="px-2 py-0.5 text-xs" />
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={() => setHideAbove(!hideAbove)}
          title={hideAbove ? 'Show armour above your rarity too' : 'Hide armour that starts above your rarity'}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold',
            hideAbove ? 'border-mh-gold-400/70 text-mh-gold-200' : 'border-mh-slate-600 text-mh-slate-400 hover:text-white',
          )}
        >
          {hideAbove ? <EyeOff size={13} /> : <Eye size={13} />}
          {hideAbove ? `Hiding above R${rarity}` : 'Showing all rarities'}
        </button>
      </PageTitlePanel>

      {open && (
        <div className="rounded-2xl border border-mh-gold-400/50 bg-mh-slate-900/95 px-3 py-2.5 shadow-xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mh-gold-400">My armour rarity</p>
              <p className="text-[11px] text-mh-slate-400">{saved === null ? 'Pick the rarity your armour is upgraded to' : 'Everything on the page updates to match'}</p>
            </div>
            <div className="min-w-[240px] flex-1">
              <RarityControl value={rarity} min={minRarity} max={maxRarity} onChange={(r) => change(r, false)} onPick={(r) => change(r, true)} />
            </div>
            {saved !== null && (
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-mh-gold-500 px-3 py-1.5 text-xs font-bold text-black">
                Done
              </button>
            )}
          </div>
        </div>
      )}
      {notice}
    </div>
  );
}

// ── A piece's skills, with the rarity each level arrives ─────

export function PieceSkillList({ data, piece, rarity, wanted, tones, allSteps }: {
  data: LabData;
  piece: LabPiece;
  rarity: number;
  wanted?: Set<string>;
  /** Colour of each wanted skill (from targetTones) */
  tones?: Map<string, TargetTone>;
  /** Show every future level, not just the next one */
  allSteps?: boolean;
}) {
  const r = clampRarity(piece, rarity);
  const now = skillsAt(piece, r);
  const keys = pieceSkillKeys(piece);
  if (keys.length === 0) return <p className="text-[11px] italic text-mh-slate-500">No skills</p>;
  return (
    <ul className="space-y-0.5">
      {keys.map((key) => {
        const s = data.skills.get(key);
        const lv = now[key] ?? 0;
        const future = skillTimeline(piece, key).filter((t) => t.rarity > r);
        const shown = allSteps ? future : future.slice(0, 1);
        const tt = tones?.get(key);
        const isWanted = Boolean(tt) || wanted?.has(key);
        return (
          <li
            key={key}
            className={cn(
              'flex items-center gap-1 text-[11px] leading-snug',
              tt && cn('-mx-1 rounded px-1 py-px', tt.pill, lv === 0 && 'outline outline-1 outline-dashed outline-current/40'),
              lv === 0 && (tt ? 'opacity-80' : 'opacity-60'),
            )}
          >
            <span className={cn('shrink-0 rounded-full', tt ? cn('h-2 w-2', tt.dot) : cn('h-1.5 w-1.5', toneFor(s?.category).dot))} />
            <span className={cn('min-w-0 flex-1 truncate', tt ? 'font-bold' : isWanted ? 'font-bold text-mh-gold-300' : 'font-medium text-mh-slate-200')} title={s?.name}>
              {s?.name ?? key}
            </span>
            {lv > 0 ? (
              <span className={cn('font-mono font-bold', !tt && 'text-mh-slate-100')}>{lv}</span>
            ) : (
              <Lock size={9} className="shrink-0 text-amber-400" />
            )}
            {shown.map((f) => (
              <span key={f.rarity} className={cn('whitespace-nowrap font-mono text-[10px]', tt ? 'opacity-90' : 'text-amber-300/90')} title={`Level ${f.level} at rarity ${f.rarity}`}>
                {lv > 0 || f !== shown[0] ? `→${f.level}` : f.level} R{f.rarity}
              </span>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

// ── The build as a row: Helm, Chest, Arms, Coil, Greaves ────

export function BuildRow({ data, build, myRarity, onSlot, onRemove, active, size = 'md' }: {
  data: LabData;
  build: LabBuild;
  myRarity: number;
  onSlot: (slot: LabSlot, piece: LabPiece | undefined) => void;
  onRemove?: (slot: LabSlot) => void;
  active?: LabSlot | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const icon = size === 'lg' ? 56 : size === 'sm' ? 32 : 42;
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {LAB_SLOTS.map(({ id, label }) => {
        const e = build[id];
        const p = e ? data.piecesById.get(e.pieceId) : undefined;
        const r = p ? clampRarity(p, e?.rarity ?? myRarity) : null;
        const locked = p ? isLockedInBuild(p, e?.rarity, myRarity) : false;
        return (
          <div key={id} className="relative min-w-0">
            <button
              type="button"
              onClick={() => onSlot(id, p)}
              className={cn(
                'flex w-full flex-col items-center gap-0.5 rounded-xl border p-1.5 text-center transition-colors',
                p ? 'border-mh-slate-700 bg-mh-slate-950/60 hover:border-mh-gold-400' : 'border-dashed border-mh-slate-600 hover:border-mh-gold-400',
                locked && 'border-rose-500/70 bg-rose-500/10',
                active === id && 'border-mh-gold-400 bg-mh-gold-500/10 ring-2 ring-mh-gold-400/40',
              )}
              title={p ? (locked ? `${p.setName} ${label} — can't be crafted until R${p.rarity}` : `${p.setName} ${label}`) : `Choose a ${label}`}
            >
              <span className="relative">
                <PieceIcon piece={p} slot={id} size={icon} className={cn(!p && 'border-0 bg-transparent', locked && 'opacity-60')} />
                {locked && <img src={LOCK_ICON} alt="Locked" className="absolute -bottom-1 -right-1.5 h-5 w-5 drop-shadow" />}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-mh-gold-400">{label}</span>
              {size !== 'sm' && (
                <span className="line-clamp-2 min-h-[2.4em] w-full text-[10px] leading-tight text-mh-slate-300">
                  {p ? p.setName : <span className="text-mh-slate-500">+ Add</span>}
                </span>
              )}
              {r !== null &&
                (locked ? (
                  <span className="rounded border border-rose-500/60 bg-rose-500/15 px-1 font-mono text-[10px] font-bold text-rose-200">needs R{p!.rarity}</span>
                ) : (
                  <RarityBadge rarity={r} />
                ))}
            </button>
            {p && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                aria-label={`Remove ${label}`}
                className="absolute right-0.5 top-0.5 rounded-md bg-mh-slate-900/80 p-0.5 text-mh-slate-500 hover:text-white"
              >
                <X size={11} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
