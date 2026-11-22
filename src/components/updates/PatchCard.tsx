// ─────────────────────────────────────────────────────────────
// PatchCard — renders one data-driven patch (src/data/patches) on the
// /updates/ page. Same look as the hand-written 1.0.9.3 card.
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router';
import { Award, Clock, Coins, Eye, HeartPulse, Info, ListChecks, Sliders, Sparkles, Swords, Wrench } from 'lucide-react';
import type { PatchIcon, PatchNotes, PatchSection } from '../../data/patches/types';
import { cn } from '../../lib/utils';
import PatchRating from './PatchRating';
import { patchDateLabel } from '../../data/patches';

const ICONS: Record<PatchIcon, { Icon: typeof Info; color: string; dot: string }> = {
  new: { Icon: Sparkles, color: 'text-mh-gold-400', dot: 'bg-mh-gold-400' },
  items: { Icon: Coins, color: 'text-mh-gold-400', dot: 'bg-mh-gold-400' },
  balance: { Icon: Swords, color: 'text-orange-400', dot: 'bg-orange-400' },
  health: { Icon: HeartPulse, color: 'text-rose-400', dot: 'bg-rose-400' },
  progression: { Icon: Award, color: 'text-sky-400', dot: 'bg-sky-400' },
  recruitment: { Icon: ListChecks, color: 'text-emerald-400', dot: 'bg-emerald-400' },
  content: { Icon: Sparkles, color: 'text-teal-400', dot: 'bg-teal-400' },
  fixes: { Icon: Wrench, color: 'text-purple-400', dot: 'bg-purple-400' },
  info: { Icon: Sliders, color: 'text-purple-400', dot: 'bg-purple-400' },
};

function Section({ s }: { s: PatchSection }) {
  const { Icon, color, dot } = ICONS[s.icon];
  return (
    <section id={`patch-${s.id}`} className={cn('rounded-xl border border-white/10 bg-black/40 p-5 space-y-3', s.wide && 'md:col-span-2')}>
      <div className={cn('flex items-center gap-2.5 pb-2 border-b border-white/5', color)}>
        <Icon size={18} aria-hidden="true" />
        <h3 className="font-display text-sm sm:text-base font-bold text-white">{s.title}</h3>
      </div>
      {s.summary && <p className="text-xs sm:text-sm text-mh-slate-300 leading-relaxed">{s.summary}</p>}
      {s.bullets && (
        <ul className="space-y-2 text-xs sm:text-sm text-mh-slate-300">
          {s.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className={cn('h-1.5 w-1.5 rounded-full mt-2 shrink-0', dot)} aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {s.table && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <caption className="sr-only">{s.table.caption}</caption>
            <thead>
              <tr className="border-b border-white/10 text-mh-slate-400">
                {s.table.headers.map((h) => (
                  <th key={h} scope="col" className="px-2 py-1.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 odd:bg-white/[0.02] text-mh-slate-200">
                  {r.map((c, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="px-2 py-1.5 font-medium text-white">{c}</th>
                    ) : (
                      <td key={j} className={cn('px-2 py-1.5 tabular-nums', typeof c === 'string' && c.startsWith('-') && c.endsWith('%') && 'text-emerald-300 font-semibold')}>{c}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.note && <p className="text-[11px] text-mh-slate-500">{s.note}</p>}
    </section>
  );
}

export default function PatchCard({ patch, current }: { patch: PatchNotes; current: boolean }) {
  return (
    <article
      id={`patch-${patch.version}`}
      className={cn(
        'rounded-2xl border p-6 sm:p-8 shadow-xl relative',
        current ? 'border-mh-gold-500/40 bg-gradient-to-b from-mh-slate-900/90 to-mh-slate-950' : 'border-white/10 bg-mh-slate-900/70',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
        <div className="flex items-center gap-3">
          {current && <span className="flex h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" aria-hidden="true" />}
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">Patch {patch.version}</h2>
            <div className="flex items-center gap-2 text-xs text-mh-gold-400 font-medium mt-0.5">
              <Clock size={13} aria-hidden="true" />
              <time dateTime={patch.date}>{patchDateLabel(patch.date)}</time>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PatchRating version={patch.version} />
          <span
            className={cn(
              'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold border',
              current ? 'bg-mh-gold-500/15 text-mh-gold-300 border-mh-gold-500/30' : 'bg-white/5 text-mh-slate-400 border-white/10',
            )}
          >
            {current ? 'Current Live Version' : 'Previous Version'}
          </span>
        </div>
      </div>

      {/* Headlines */}
      <div className="mb-6 rounded-xl border border-mh-gold-500/25 bg-mh-gold-500/[0.06] p-4 sm:p-5">
        <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-mh-gold-300">Highlights</h3>
        <ul className="space-y-1.5 text-xs sm:text-sm text-mh-slate-200">
          {patch.headlines.map((h) => (
            <li key={h} className="flex items-start gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mh-gold-400 mt-2 shrink-0" aria-hidden="true" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {patch.spoilerNotice && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-100/90">
          <Eye size={18} className="shrink-0 text-amber-400" aria-hidden="true" />
          <p className="flex-1 min-w-[220px]">{patch.spoilerNotice}</p>
          <Link to="/spoilers" className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25">
            View spoilers
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {patch.sections.map((s) => (
          <Section key={s.id} s={s} />
        ))}
      </div>

      {patch.disclaimer && (
        <p className="mt-6 flex items-start gap-2 text-[11px] text-mh-slate-500">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {patch.disclaimer}
        </p>
      )}
    </article>
  );
}
