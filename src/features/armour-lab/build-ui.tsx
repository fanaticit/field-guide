// ─────────────────────────────────────────────────────────────
// Build summary pieces shared by the armour v2 / v3 / v4 layouts:
// wanted-skill progress, skill totals, set bonuses, what the next
// rarity adds, and the share / planner buttons.
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, ChevronDown, Copy, Eraser, Flame, Import, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  LAB_SLOTS,
  computeBuild,
  slotLabel,
  diffBuilds,
  targetProgress,
  type BuildResult,
  type LabBuild,
  type LabData,
  type LabPiece,
  type LabTarget,
} from './logic';
import { LOCK_ICON, SkillPips, isLockedInBuild, toneFor } from './ui';

export function WantedProgress({ data, result, targets }: { data: LabData; result: BuildResult; targets: LabTarget[] }) {
  if (targets.length === 0) return null;
  return (
    <div className="space-y-1">
      {targetProgress(result, targets).map((t) => (
        <div key={t.key} className="flex items-center gap-2 text-xs">
          {t.met ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400" /> : <span className="h-3 w-3 shrink-0 rounded-full border border-mh-slate-500" />}
          <span className={cn('min-w-0 flex-1 truncate font-semibold', t.met ? 'text-emerald-200' : 'text-mh-slate-200')}>{data.skills.get(t.key)?.name}</span>
          <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-mh-slate-800">
            <div className={cn('h-full', t.met ? 'bg-emerald-400' : 'bg-sky-400')} style={{ width: `${(t.have / t.level) * 100}%` }} />
          </div>
          <span className="w-8 text-right font-mono text-mh-slate-300">
            {t.have}/{t.level}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Skill totals as rows with pips; tap one for its description and sources */
export function BuildSkillsList({ data, result, wanted, changedKeys }: { data: LabData; result: BuildResult; wanted: Set<string>; changedKeys?: Set<string> }) {
  const [open, setOpen] = useState<string | null>(null);
  const skills = [...result.skills].sort((a, b) => Number(wanted.has(b.key)) - Number(wanted.has(a.key)));
  return (
    <div className="space-y-0.5">
      {skills.map((l) => {
        const tone = toneFor(l.category);
        const wasted = l.raw - l.level;
        const isOpen = open === l.key;
        const desc = data.skills.get(l.key)?.descByLevel[l.level];
        return (
          <div key={l.key} className={cn('rounded-lg transition-colors', changedKeys?.has(l.key) && 'bg-sky-500/15 ring-1 ring-sky-400/50')}>
            <button type="button" onClick={() => setOpen(isOpen ? null : l.key)} className="flex w-full items-center gap-2 px-1.5 py-1 text-left text-xs">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} />
              <span className={cn('min-w-0 flex-1 truncate font-semibold', wanted.has(l.key) ? 'text-mh-gold-300' : 'text-mh-slate-100')}>{l.name}</span>
              {wasted > 0 && (
                <span className="rounded bg-rose-500/15 px-1 text-[10px] font-bold text-rose-300" title={`${l.raw} levels from your gear, but the skill caps at ${l.max}`}>
                  +{wasted} wasted
                </span>
              )}
              <SkillPips level={l.level} max={l.max} tone={tone} size="sm" />
              <span className="w-8 text-right font-mono text-mh-slate-300">Lv{l.level}</span>
            </button>
            {isOpen && (
              <div className="space-y-1 px-5 pb-2 text-[11px] text-mh-slate-400">
                {desc && <p className="text-mh-slate-300">{desc}</p>}
                <p>
                  From:{' '}
                  {l.sources.map((s, i) => (
                    <span key={i} className={cn('mr-1 inline-block rounded border px-1', s.kind === 'set' ? 'border-orange-500/40 text-orange-300' : 'border-mh-slate-700')}>
                      {s.label} +{s.level}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Skill totals as compact chips (for a horizontal build strip) */
export function BuildSkillChips({ result, wanted, changedKeys }: { result: BuildResult; wanted: Set<string>; changedKeys?: Set<string> }) {
  const skills = [...result.skills].sort((a, b) => Number(wanted.has(b.key)) - Number(wanted.has(a.key)));
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((l) => {
        const tone = toneFor(l.category);
        const wasted = l.raw - l.level;
        return (
          <span
            key={l.key}
            title={wasted > 0 ? `${l.raw} levels, capped at ${l.max}` : undefined}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold',
              wanted.has(l.key) ? tone.chip : 'border-mh-slate-700 bg-mh-slate-900 text-mh-slate-200',
              changedKeys?.has(l.key) && 'ring-2 ring-sky-400/60',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
            {l.name}
            <span className="font-mono">
              {l.level}
              <span className="opacity-50">/{l.max}</span>
            </span>
            {wasted > 0 && <span className="text-rose-300">+{wasted}</span>}
          </span>
        );
      })}
    </div>
  );
}

export function SetBonusList({ result }: { result: BuildResult }) {
  if (result.sets.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {result.sets.map((s) => (
        <p key={s.setKey} className={cn('flex items-center gap-1.5 text-xs', s.active ? 'text-orange-200' : 'text-mh-slate-500')}>
          <Flame size={12} className={cn('shrink-0', s.active && 'text-orange-400')} />
          <span className="min-w-0 flex-1 truncate">
            {s.setName}{' '}
            <span className="font-mono">
              ({Math.min(s.count, s.needed)}/{s.needed})
            </span>
          </span>
          <span className="shrink-0 font-semibold">{s.active ? `+${s.level} ${s.skillName}` : `${s.needed - s.count} more for +${s.level} ${s.skillName}`}</span>
        </p>
      ))}
    </div>
  );
}

/** What upgrading past my rarity would do to the build, plus a table of every rarity */
export function RarityOutlook({ data, build, result, myRarity, wanted, onRarity }: {
  data: LabData;
  build: LabBuild;
  result: BuildResult;
  myRarity: number;
  wanted: Set<string>;
  onRarity: (r: number) => void;
}) {
  const [showTable, setShowTable] = useState(false);
  const next = useMemo(() => {
    if (result.pieceCount === 0 || myRarity >= data.maxRarity) return null;
    const defenceNext = computeBuild(data, build, myRarity + 1).defence - result.defence;
    for (let r = myRarity + 1; r <= data.maxRarity; r++) {
      const d = diffBuilds(result, computeBuild(data, build, r));
      if (d.skills.length > 0) return { rarity: r, diff: d, defenceNext };
    }
    return { rarity: null, diff: null, defenceNext };
  }, [data, build, result, myRarity]);

  if (result.pieceCount === 0) return null;
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5 text-xs">
        <p className="mb-0.5 flex items-center gap-1.5 font-bold text-sky-200">
          <TrendingUp size={13} /> Upgrading from R{myRarity}
        </p>
        {!next ? (
          <p className="text-mh-slate-400">You're at the highest rarity.</p>
        ) : next.rarity ? (
          <p className="text-mh-slate-300">
            {next.rarity === myRarity + 1 ? 'At' : 'Next skill change at'}{' '}
            <button type="button" onClick={() => onRarity(next.rarity!)} className="font-bold text-sky-200 underline">
              R{next.rarity}
            </button>
            : {next.diff!.skills.map((s) => `${s.name} ${s.from}→${s.to}`).join(', ')}
          </p>
        ) : (
          <p className="text-mh-slate-400">No more skill changes above R{myRarity}.</p>
        )}
        <button type="button" onClick={() => setShowTable((s) => !s)} className="mt-1 flex items-center gap-1 font-semibold text-sky-300 hover:text-white">
          <ChevronDown size={13} className={cn('transition-transform', showTable && 'rotate-180')} /> {showTable ? 'Hide' : 'Show'} your skills at every rarity
        </button>
      </div>
      {showTable && <RarityTable data={data} build={build} myRarity={myRarity} wanted={wanted} onRarity={onRarity} />}
    </div>
  );
}

function RarityTable({ data, build, myRarity, wanted, onRarity }: { data: LabData; build: LabBuild; myRarity: number; wanted: Set<string>; onRarity: (r: number) => void }) {
  const { cols, rows } = useMemo(() => {
    const pieces = LAB_SLOTS.map((s) => (build[s.id] ? data.piecesById.get(build[s.id]!.pieceId) : undefined)).filter(Boolean) as LabPiece[];
    const start = Math.min(...pieces.map((p) => p.rarity));
    const cols = Array.from({ length: data.maxRarity - start + 1 }, (_, i) => start + i).map((r) => ({ r, res: computeBuild(data, build, r) }));
    const keys = new Map<string, string>();
    for (const c of cols) for (const l of c.res.skills) keys.set(l.key, l.name);
    const rows = [...keys.entries()]
      .map(([key, name]) => ({ key, name, max: data.skills.get(key)?.maxLevel ?? 5 }))
      .sort((a, b) => Number(wanted.has(b.key)) - Number(wanted.has(a.key)) || a.name.localeCompare(b.name));
    return { cols, rows };
  }, [data, build, wanted]);

  return (
    <div className="overflow-x-auto rounded-xl border border-mh-slate-800">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-mh-slate-900 px-2 py-1 text-left font-semibold text-mh-slate-400">Skill</th>
            {cols.map((c) => (
              <th key={c.r} className="p-0">
                <button type="button" onClick={() => onRarity(c.r)} className={cn('w-full px-1 py-1 font-mono font-bold', c.r === myRarity ? 'bg-mh-gold-500 text-black' : 'text-mh-slate-400 hover:text-white')}>
                  {c.r}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-mh-slate-800">
              <td className={cn('sticky left-0 max-w-[120px] truncate bg-mh-slate-900 px-2 py-1 font-semibold', wanted.has(row.key) ? 'text-mh-gold-300' : 'text-mh-slate-200')}>{row.name}</td>
              {cols.map((c, i) => {
                const lv = c.res.skillLevel[row.key] ?? 0;
                const prev = i > 0 ? (cols[i - 1].res.skillLevel[row.key] ?? 0) : lv;
                return (
                  <td
                    key={c.r}
                    className={cn(
                      'px-1 py-1 text-center font-mono',
                      c.r === myRarity && 'bg-mh-gold-500/10',
                      lv === 0 ? 'text-mh-slate-700' : lv >= row.max ? 'font-bold text-emerald-300' : 'text-mh-slate-200',
                      lv > prev && 'underline decoration-sky-400 decoration-2 underline-offset-2',
                    )}
                  >
                    {lv || '·'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-2 py-1 text-[10px] text-mh-slate-500">Underlined = level gained at that rarity · green = maxed. Click a rarity to switch to it.</p>
    </div>
  );
}

export function BuildActions({ empty, onShare, onSendToPlanner, onImport, onClear }: {
  empty: boolean;
  onShare: () => void;
  onSendToPlanner: () => void;
  onImport: () => void;
  onClear: () => void;
}) {
  const base = 'flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2.5 text-xs font-bold disabled:opacity-40';
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
      <button type="button" disabled={empty} onClick={onShare} className={cn(base, 'border-mh-slate-700 text-mh-slate-200 hover:border-mh-gold-400')}>
        <Copy size={13} /> Share link
      </button>
      <button type="button" disabled={empty} onClick={onSendToPlanner} className={cn(base, 'border-mh-gold-400/70 bg-mh-gold-500/15 text-mh-gold-200 hover:bg-mh-gold-500 hover:text-black')}>
        <ArrowUpRight size={13} /> Build Planner
      </button>
      <button type="button" onClick={onImport} className={cn(base, 'border-mh-slate-700 font-semibold text-mh-slate-400 hover:text-white')}>
        <Import size={13} /> From planner
      </button>
      <button type="button" disabled={empty} onClick={onClear} className={cn(base, 'border-mh-slate-700 font-semibold text-mh-slate-400 hover:text-rose-300')}>
        <Eraser size={13} /> Clear
      </button>
    </div>
  );
}

/** Pieces in the build that can't be crafted at my rarity yet. They stay in the build. */
export function LockedWarning({ data, build, myRarity }: { data: LabData; build: LabBuild; myRarity: number }) {
  const locked = LAB_SLOTS.map(({ id }) => {
    const e = build[id];
    const p = e ? data.piecesById.get(e.pieceId) : undefined;
    return p && isLockedInBuild(p, e?.rarity, myRarity) ? p : null;
  }).filter((p): p is LabPiece => p !== null);
  if (locked.length === 0) return null;
  return (
    <div className="flex gap-2 rounded-xl border border-rose-500/50 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-100" role="alert">
      <img src={LOCK_ICON} alt="" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-bold">
          {locked.length === 1 ? '1 piece' : `${locked.length} pieces`} can't be crafted at your R{myRarity} yet
        </p>
        {locked.map((p) => (
          <p key={p.id} className="text-rose-200/90">
            {slotLabel(p.slot)} · {p.setName} — needs R{p.rarity}
          </p>
        ))}
        <p className="text-[10px] text-rose-200/70">They stay in your build, with their skills shown at the rarity they start at.</p>
      </div>
    </div>
  );
}
