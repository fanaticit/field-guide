// ─────────────────────────────────────────────────────────────
// Investigation Journey view for the monster grid:
//   JourneyBar      the "Investigation Journey" toggle, spoilers status and a
//                   short summary of where the hunter is on the journey
//   JourneyLines    SVG lines drawn between the journey's monsters in the grid
//                   (solid glow between unlocked ones, dashed arrow to the next)
// ─────────────────────────────────────────────────────────────
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import { Link } from 'react-router';
import { Route, Eye, EyeOff, X, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { JourneyNode } from '../../hooks/useInvestigationJourney';

// ── Bar ──────────────────────────────────────────────────────

export function JourneyBar({
  active,
  onToggle,
  spoilers,
  signedIn,
  path,
  nextNeed,
  hiddenByFilters,
  onClearFilters,
}: {
  active: boolean;
  onToggle: () => void;
  spoilers: boolean;
  signedIn: boolean;
  path: JourneyNode[];
  /** Studies still needed for the next unlock, e.g. "2/5 studies of Radiant Paolumu" */
  nextNeed: string | null;
  hiddenByFilters: number;
  onClearFilters: () => void;
}) {
  if (!path.length) return null;
  const unlocked = path.filter((n) => n.state === 'unlocked' || n.state === 'current').length;
  const next = path.find((n) => n.state === 'next');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
          active
            ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
            : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:border-amber-400/60 hover:text-white',
        )}
        title="Highlight your Investigation Journey on the monster grid"
      >
        <Route size={14} />
        Investigation Journey
        <span className="rounded-full bg-black/30 px-1.5 font-mono text-[10px]">{unlocked}/{path.length}</span>
      </button>

      <Link
        to="/investigation-journey/"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-800 text-sky-300 hover:border-sky-400 hover:text-white"
        title="What is the Investigation Journey? How to unlock each monster"
        aria-label="Investigation Journey guide"
      >
        <Info size={14} />
      </Link>

      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold',
          spoilers ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-mh-slate-700 bg-mh-slate-900 text-mh-slate-400',
        )}
        title={spoilers ? 'Monsters you have not unlocked yet are shown on the journey' : 'Only the monsters you have unlocked are shown on the journey'}
      >
        {spoilers ? <Eye size={11} /> : <EyeOff size={11} />}
        Spoilers {spoilers ? 'on' : 'off'}
        <Link to="/settings" className="ml-1 text-sky-300 underline decoration-dotted underline-offset-2 hover:text-white">
          {signedIn ? 'Change in profile' : 'Sign in to change'}
        </Link>
      </span>

      {active && (
        <span className="text-[11px] text-mh-slate-300">
          {next
            ? spoilers
              ? <>Next: <span className="font-semibold text-sky-300">{next.name}</span>{nextNeed ? ` · ${nextNeed}` : ''}</>
              : <>Next unlock hidden{nextNeed ? ` · ${nextNeed}` : ''} — turn spoilers on to see it</>
            : unlocked === path.length
              ? 'Every journey monster is unlocked'
              : null}
        </span>
      )}

      {active && hiddenByFilters > 0 && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-300 hover:text-white"
        >
          <X size={10} /> {hiddenByFilters} journey monster{hiddenByFilters === 1 ? '' : 's'} hidden by filters — clear filters
        </button>
      )}
    </div>
  );
}

// ── Lines ────────────────────────────────────────────────────

interface Segment {
  x1: number; y1: number; x2: number; y2: number;
  /** Icon radius at each end, so the line stops at the icon's edge */
  r1: number; r2: number;
  kind: 'unlocked' | 'next' | 'locked';
}

/**
 * Lines between consecutive visible journey monsters. Cards are found by their
 * data-monster-id inside the container; the line runs between the centres of the icons.
 */
export function JourneyLines({
  containerRef,
  nodes,
  watch,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  /** Visible journey nodes in journey order */
  nodes: JourneyNode[];
  /** Anything that moves the cards (filters, list) — recomputes the lines */
  watch: unknown;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const centre = (id: string) => {
      const card = container.querySelector<HTMLElement>(`[data-monster-id="${CSS.escape(id)}"]`);
      if (!card) return null;
      const icon = (card.firstElementChild as HTMLElement | null) ?? card;
      const r = icon.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, r: Math.min(r.width, r.height) / 2 };
    };
    const segs: Segment[] = [];
    const points = nodes.map((n) => ({ n, p: centre(n.monsterId) })).filter((x) => x.p);
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const aDone = a.n.state === 'unlocked' || a.n.state === 'current';
      const bDone = b.n.state === 'unlocked' || b.n.state === 'current';
      segs.push({
        x1: a.p!.x, y1: a.p!.y, x2: b.p!.x, y2: b.p!.y, r1: a.p!.r, r2: b.p!.r,
        kind: aDone && bDone ? 'unlocked' : b.n.state === 'next' ? 'next' : 'locked',
      });
    }
    setSegments(segs);
    setSize({ w: container.scrollWidth, h: container.scrollHeight });
  }, [containerRef, nodes]);

  useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    window.addEventListener('resize', measure);
    // Icons can finish loading after the first layout
    const t = window.setTimeout(measure, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.clearTimeout(t);
    };
  }, [measure, containerRef, watch]);

  if (!segments.length) return null;

  // Shorten each line so it runs from the edge of one icon to the edge of the next. Monsters
  // side by side still get a short line (at least ~14px) so the arrow is always visible.
  const trim = (s: Segment) => {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const len = Math.hypot(dx, dy) || 1;
    const minLine = Math.min(14, len * 0.5);
    let a = Math.max(0, s.r1 - 6);
    let b = Math.max(0, s.r2 - 2);
    if (len - a - b < minLine) {
      const scale = Math.max(0, (len - minLine) / (a + b || 1));
      a *= scale;
      b *= scale;
    }
    return { x1: s.x1 + (dx * a) / len, y1: s.y1 + (dy * a) / len, x2: s.x2 - (dx * b) / len, y2: s.y2 - (dy * b) / len };
  };

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-[2]"
      width={size.w}
      height={size.h}
      aria-hidden="true"
    >
      <defs>
        <marker id="journey-arrow-unlocked" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="rgb(251 191 36)" />
        </marker>
        <marker id="journey-arrow-next" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="rgb(56 189 248 / 0.9)" />
        </marker>
        <marker id="journey-arrow-locked" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="rgb(100 116 139 / 0.7)" />
        </marker>
      </defs>
      {segments.map((s, i) => {
        const t = trim(s);
        if (s.kind === 'unlocked') {
          // The glow is a wide, faint line underneath. (An SVG filter would hide perfectly
          // horizontal lines: their bounding box has no height, so the filter area is empty.)
          return (
            <g key={i}>
              <line {...t} stroke="rgb(251 191 36 / 0.3)" strokeWidth={9} strokeLinecap="round" />
              <line {...t} stroke="rgb(251 191 36)" strokeWidth={3} strokeLinecap="round" opacity={0.95} markerEnd="url(#journey-arrow-unlocked)" />
            </g>
          );
        }
        if (s.kind === 'next') {
          return (
            <line key={i} {...t} stroke="rgb(56 189 248 / 0.9)" strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" markerEnd="url(#journey-arrow-next)" />
          );
        }
        return (
          <line key={i} {...t} stroke="rgb(100 116 139 / 0.6)" strokeWidth={1.5} strokeDasharray="3 5" strokeLinecap="round" markerEnd="url(#journey-arrow-locked)" />
        );
      })}
    </svg>
  );
}
