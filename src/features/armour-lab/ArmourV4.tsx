// ─────────────────────────────────────────────────────────────
// Armour v4 — "Equipment Box". Works like the in-game equipment
// screen: your five slots sit in a row (Helm → Greaves); pick a slot
// and the box below lists every piece for it, each with the skill
// changes it would make — green ▲ for gains, red ▼ for losses.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  LAB_SLOTS,
  armourCap,
  computeBuild,
  diffBuilds,
  isAboveRarity,
  skillsAt,
  slotLabel,
  targetScore,
  type LabData,
  type LabPiece,
  type LabSlot,
} from './logic';
import { BuildActions, BuildSkillChips, LockedWarning, RarityOutlook, SetBonusList, WantedProgress } from './build-ui';
import { LabLoading, LabNotices, LabOverlays, useLabPage, type LabPage } from './page-kit';
import { useArmourLabStore } from './store';
import { BuildRow, LOCK_ICON, LabHeader, PieceIcon, PieceSkillList, RarityBadge, SkillPicker, TargetList, targetTones, wantedOnPiece, type TargetTone } from './ui';

const PATH = '/armory/armour_v4';

export default function ArmourV4() {
  const lab = useLabPage(PATH);
  const { data, result, store, myRarity, wanted } = lab;
  // Start on the first empty slot
  const [slot, setSlot] = useState<LabSlot>(() => LAB_SLOTS.find((s) => !useArmourLabStore.getState().build[s.id])?.id ?? 'helm');
  const [onlyMine, setOnlyMine] = useState(false);

  if (!data || !result) return <LabLoading lab={lab} path={PATH} />;

  return (
    <div data-rarity-theme={lab.theme} className="section-theme w-full space-y-3 px-3 pb-24 pt-2 sm:px-4 lg:px-6 lg:pb-8">
      <LabHeader
        title="Equipment Box"
        current={PATH}
        minRarity={data.minRarity}
        maxRarity={data.maxRarity}
        onRarityChange={lab.onRarityChange}
        notice={<LabNotices lab={lab} />}
        description={<>Like the in-game equipment screen: choose a slot, then compare every piece for it. Green ▲ and red ▼ show what each piece would change in your build.</>}
      />

      {/* ── Equipment + skills you want, in one tight panel ── */}
      <section className="mho-panel grid gap-3 p-2.5 sm:p-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-white">Equipment</h2>
            <span className="flex items-center gap-2 text-xs text-mh-slate-400">
              {result.pieceCount}/5 at <RarityBadge rarity={myRarity} />
              <span className="flex items-center gap-1 font-mono text-mh-slate-300" title="Total defence">
                <Shield size={12} className="text-mh-gold-400" /> {result.defence}
              </span>
            </span>
          </div>
          <BuildRow data={data} build={store.build} myRarity={myRarity} size="lg" active={slot} onSlot={(s) => setSlot(s)} onRemove={store.unequip} />
          <LockedWarning data={data} build={store.build} myRarity={myRarity} />
          {result.pieceCount > 0 && <BuildSkillChips result={result} wanted={wanted} changedKeys={lab.change?.keys} />}
          <SkillPicker data={data} exclude={wanted} onPick={(key) => store.addTarget(key, Math.max(1, armourCap(data, key)))} placeholder="Skills you want — they're compared first…" />
          <TargetList data={data} targets={store.targets} have={result.skillLevel} onLevel={store.setTargetLevel} onRemove={store.removeTarget} />
        </div>
        <div className="space-y-2 lg:border-l lg:border-mh-slate-800 lg:pl-3">
          <WantedProgress data={data} result={result} targets={store.targets} />
          <SetBonusList result={result} />
          <RarityOutlook data={data} build={store.build} result={result} myRarity={myRarity} wanted={wanted} onRarity={store.setMyRarity} />
          <BuildActions empty={result.pieceCount === 0} onShare={lab.actions.share} onSendToPlanner={lab.actions.sendToPlanner} onImport={lab.actions.importFromPlanner} onClear={lab.actions.clear} />
        </div>
      </section>

      {/* ── Slot tabs (pinned) ── */}
      <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center gap-1.5 rounded-xl border border-mh-slate-700 bg-mh-slate-900/95 p-1.5 shadow-xl backdrop-blur">
        <div className="grid flex-1 grid-cols-5 gap-1" role="tablist" aria-label="Armour slot">
          {LAB_SLOTS.map(({ id, label }) => {
            const p = store.build[id] ? data.piecesById.get(store.build[id]!.pieceId) : undefined;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={slot === id}
                onClick={() => setSlot(id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg border px-1 py-1 text-xs font-bold',
                  slot === id ? 'border-mh-gold-400 bg-mh-gold-500 text-black' : 'border-mh-slate-700 text-mh-slate-300 hover:text-white',
                )}
              >
                <PieceIcon piece={p} slot={id} size={28} className="border-0 bg-transparent p-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
        {store.targets.length > 0 && (
          <button
            type="button"
            onClick={() => setOnlyMine((v) => !v)}
            aria-pressed={onlyMine}
            className={cn('rounded-xl border px-2.5 py-1.5 text-xs font-bold', onlyMine ? 'border-mh-gold-400 text-mh-gold-200' : 'border-mh-slate-700 text-mh-slate-400')}
          >
            {onlyMine ? '✓ ' : ''}Only pieces with my skills
          </button>
        )}
      </div>

      <SlotBox data={data} lab={lab} slot={slot} onlyMine={onlyMine && store.targets.length > 0} />

      <LabOverlays lab={lab} />
    </div>
  );
}

function SlotBox({ data, lab, slot, onlyMine }: { data: LabData; lab: LabPage; slot: LabSlot; onlyMine: boolean }) {
  const { store, myRarity, wanted, result } = lab;
  const [limit, setLimit] = useState(24);
  useEffect(() => setLimit(24), [slot, onlyMine, myRarity]);
  const current = store.build[slot] ? data.piecesById.get(store.build[slot]!.pieceId) : undefined;
  const tones = useMemo(() => targetTones(store.targets), [store.targets]);

  const rows = useMemo(() => {
    if (!result) return [];
    const base = targetScore(result, store.targets);
    return data.pieces
      .filter((p) => p.slot === slot)
      .filter((p) => !store.hideAbove || !isAboveRarity(p, myRarity))
      .map((p) => {
        const equipped = current?.id === p.id;
        const after = equipped ? result : computeBuild(data, { ...store.build, [slot]: { pieceId: p.id } }, myRarity);
        const d = diffBuilds(result, after);
        const own = skillsAt(p, myRarity);
        const ownWanted = store.targets.reduce((n, t) => n + Math.min(own[t.key] ?? 0, t.level), 0);
        return {
          p,
          equipped,
          diff: d.skills.sort((a, b) => Number(wanted.has(b.key)) - Number(wanted.has(a.key)) || b.to - b.from - (a.to - a.from)),
          gain: targetScore(after, store.targets) - base,
          total: d.skills.reduce((n, s) => n + (s.to - s.from), 0),
          ownWanted,
          above: isAboveRarity(p, myRarity),
        };
      })
      .filter((r) => !onlyMine || r.ownWanted > 0 || r.equipped)
      .sort(
        (a, b) =>
          Number(b.equipped) - Number(a.equipped) ||
          Number(a.above) - Number(b.above) ||
          b.gain - a.gain ||
          b.ownWanted - a.ownWanted ||
          b.total - a.total ||
          a.p.rarity - b.p.rarity,
      );
  }, [data, slot, store.build, store.targets, store.hideAbove, result, myRarity, current, onlyMine, wanted]);

  return (
    <section className="space-y-2">
      <p className="text-xs text-mh-slate-400">
        <b className="text-mh-slate-200">{rows.length}</b> {slotLabel(slot)} pieces at your rarity, R{myRarity}
        {current ? (
          <>
            {' '}
            · compared with your <b className="text-mh-slate-200">{current.setName}</b>
          </>
        ) : (
          ' · this slot is empty'
        )}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {rows.slice(0, limit).map((r) => (
          <PieceCard key={r.p.id} data={data} lab={lab} row={r} tones={tones} />
        ))}
      </div>
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 24)} className="w-full rounded-xl border border-mh-slate-700 py-2 text-xs font-bold text-mh-slate-300 hover:text-white">
          Show more ({rows.length - limit} left)
        </button>
      )}
    </section>
  );
}

function PieceCard({ data, lab, row, tones }: {
  data: LabData;
  lab: LabPage;
  row: { p: LabPiece; equipped: boolean; diff: Array<{ key: string; name: string; from: number; to: number }>; above: boolean };
  tones: Map<string, TargetTone>;
}) {
  const { store, myRarity, wanted } = lab;
  const { p, equipped, diff, above } = row;
  const slotFilled = Boolean(store.build[p.slot]);
  const shownDiff = slotFilled ? diff : diff.filter((s) => s.from > 0);
  const hits = wantedOnPiece(p, myRarity, tones);
  const firstActive = hits.find((h) => !h.locked);
  return (
    <article
      className={cn(
        'relative flex flex-col gap-1.5 overflow-hidden rounded-xl border p-2',
        equipped ? 'border-emerald-500/50' : 'border-mh-slate-800',
        firstActive?.tone.cell ?? 'bg-mh-slate-950/40',
      )}
    >
      {hits.length > 0 && (
        <span className="absolute inset-x-0 top-0 flex h-1 gap-px">
          {hits.map((h) => (
            <span key={h.key} className={cn('flex-1', h.tone.bar, h.locked && 'opacity-40')} />
          ))}
        </span>
      )}
      {equipped ? (
        <button type="button" onClick={() => store.unequip(p.slot)} className="absolute right-1.5 top-2 text-emerald-400 hover:text-rose-300" title="In your build — tap to remove">
          <CheckCircle2 size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => store.equip(p.slot, p.id)}
          className="absolute right-1.5 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-mh-gold-400/70 bg-mh-slate-950/80 text-mh-gold-200 hover:bg-mh-gold-500 hover:text-black"
          title={slotFilled ? 'Swap into your build' : 'Add to your build'}
          aria-label={`Add ${p.setName} ${slotLabel(p.slot)} to your build`}
        >
          <Plus size={16} />
        </button>
      )}

      <button type="button" onClick={() => lab.setInspectId(p.id)} className="flex items-start gap-2 pr-8 text-left" title="See every skill level">
        <span className="relative shrink-0">
          <PieceIcon piece={p} size={52} className={cn(above && 'opacity-70')} />
          {above && <img src={LOCK_ICON} alt="" className="absolute -bottom-1 -right-1 h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-tight text-white">{p.setName}</span>
          {p.hasMonster && <span className="block truncate text-[11px] text-mh-slate-400">{p.monsterName}</span>}
          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
            <RarityBadge rarity={Math.min(Math.max(myRarity, p.rarity), p.maxRarity)} />
            {above && <span className="font-semibold text-rose-300">needs R{p.rarity}</span>}
          </span>
        </span>
      </button>

      <button type="button" onClick={() => lab.setInspectId(p.id)} className="text-left">
        <PieceSkillList data={data} piece={p} rarity={myRarity} tones={tones} wanted={wanted} />
      </button>

      {/* The in-game style comparison. With an empty slot, only show what stacks with the build. */}
      {!equipped && shownDiff.length > 0 && (
        <ul className="space-y-px border-t border-mh-slate-800/80 pt-1 text-[11px]">
          {shownDiff.map((s) => (
            <li key={s.key} className={cn('flex items-center gap-1.5', s.to > s.from ? 'text-emerald-300' : 'text-rose-300', wanted.has(s.key) && 'font-bold')}>
              <span>{s.to > s.from ? '▲' : '▼'}</span>
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="font-mono">
                {s.from}→{s.to}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
