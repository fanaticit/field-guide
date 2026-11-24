// ─────────────────────────────────────────────────────────────
// Armour v3 — "Armour Table". The guide-book layout: one row per set,
// with Helm, Chest, Arms, Coil and Greaves as columns, grouped by the
// rarity the set starts at. The example build is a strip pinned to
// the top of the page, so it's always in view while you browse.
// ─────────────────────────────────────────────────────────────
import { Fragment, useMemo, useState } from 'react';
import { Check, ChevronDown, Flame, Layers, Plus, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LAB_SLOTS, armourCap, skillsAt, targetProgress, type LabBuild, type LabData, type LabSet, type LabSlot, type LabTarget } from './logic';
import { BuildActions, BuildSkillChips, LockedWarning, RarityOutlook, SetBonusList, WantedProgress } from './build-ui';
import { LabLoading, LabNotices, LabOverlays, useLabPage, type LabPage } from './page-kit';
import { BuildRow, LabHeader, PieceIcon, PieceSkillList, RarityBadge, SkillPicker, TargetList, targetTones, wantedOnPiece } from './ui';

const PATH = '/armory/armour_v3';

export default function ArmourV3() {
  const lab = useLabPage(PATH);
  const { data, result, store, myRarity, wanted } = lab;
  const [onlyMine, setOnlyMine] = useState(true);
  const [allSteps, setAllSteps] = useState(false);
  const [focusSlot, setFocusSlot] = useState<LabSlot | null>(null);
  const [search, setSearch] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const groups = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const filtered = data.sets
      .filter((s) => !store.hideAbove || s.rarity <= myRarity)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.monsterName.toLowerCase().includes(q))
      .map((set) => ({ set, score: wantedScore(set, myRarity, store.targets, focusSlot) }))
      .filter((x) => !(onlyMine && store.targets.length > 0) || x.score > 0);
    const byRarity = new Map<number, typeof filtered>();
    for (const x of filtered) {
      if (!byRarity.has(x.set.rarity)) byRarity.set(x.set.rarity, []);
      byRarity.get(x.set.rarity)!.push(x);
    }
    return [...byRarity.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rarity, list]) => ({ rarity, sets: list.sort((a, b) => b.score - a.score || a.set.name.localeCompare(b.set.name)).map((x) => x.set) }));
  }, [data, search, store.hideAbove, store.targets, myRarity, onlyMine, focusSlot]);

  if (!data || !result) return <LabLoading lab={lab} path={PATH} />;
  const progress = targetProgress(result, store.targets);

  return (
    <div data-rarity-theme={lab.theme} className="section-theme w-full space-y-3 px-3 pb-24 pt-2 sm:px-4 lg:px-6 lg:pb-8">
      <LabHeader
        title="Armour Table"
        current={PATH}
        minRarity={data.minRarity}
        maxRarity={data.maxRarity}
        onRarityChange={lab.onRarityChange}
        notice={<LabNotices lab={lab} />}
        description={<>Every set in one table — Helm to Greaves across, grouped by starting rarity. Your example build stays pinned at the top while you browse.</>}
      />

      {/* ── Build strip (pinned) ── */}
      <section className="sticky top-0 z-30 -mx-1 rounded-2xl border border-mh-slate-700 bg-mh-slate-900/95 p-2.5 shadow-xl backdrop-blur">
        <div className="grid gap-3 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <BuildRow
            data={data}
            build={store.build}
            myRarity={myRarity}
            size="sm"
            active={focusSlot}
            onSlot={(slot, piece) => (piece ? lab.setInspectId(piece.id) : setFocusSlot(focusSlot === slot ? null : slot))}
            onRemove={store.unequip}
          />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-display font-bold uppercase tracking-wide text-white">Example build</span>
              <span className="text-mh-slate-400">
                {result.pieceCount}/5 at <RarityBadge rarity={myRarity} />
              </span>
              <span className="flex items-center gap-1 font-mono text-mh-slate-300" title="Total defence">
                <Shield size={12} className="text-mh-gold-400" /> {result.defence}
              </span>
              {store.targets.length > 0 && (
                <span className={cn('font-semibold', progress.every((p) => p.met) ? 'text-emerald-300' : 'text-mh-slate-300')}>
                  Wanted {progress.filter((p) => p.met).length}/{store.targets.length}
                </span>
              )}
              <button type="button" onClick={() => setDetailsOpen((o) => !o)} className="ml-auto flex items-center gap-1 font-semibold text-mh-gold-300 hover:text-white">
                {detailsOpen ? 'Less' : 'More'} <ChevronDown size={13} className={cn('transition-transform', detailsOpen && 'rotate-180')} />
              </button>
            </div>
            {result.pieceCount === 0 ? (
              <p className="text-xs text-mh-slate-500">Equip pieces from the table, or tap an empty slot to highlight that column.</p>
            ) : (
              <BuildSkillChips result={result} wanted={wanted} changedKeys={lab.change?.keys} />
            )}
          </div>
        </div>
        {detailsOpen && (
          <div className="mt-3 grid max-h-[50vh] gap-3 overflow-y-auto border-t border-mh-slate-800 pt-3 md:grid-cols-2">
            <div className="space-y-2">
              <LockedWarning data={data} build={store.build} myRarity={myRarity} />
              <WantedProgress data={data} result={result} targets={store.targets} />
              <SetBonusList result={result} />
              <BuildActions empty={result.pieceCount === 0} onShare={lab.actions.share} onSendToPlanner={lab.actions.sendToPlanner} onImport={lab.actions.importFromPlanner} onClear={lab.actions.clear} />
            </div>
            <RarityOutlook data={data} build={store.build} result={result} myRarity={myRarity} wanted={wanted} onRarity={store.setMyRarity} />
          </div>
        )}
      </section>

      {/* ── Skills + filters ── */}
      <section className="mho-panel space-y-2.5 p-3 sm:p-4">
        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto]">
          <SkillPicker data={data} exclude={wanted} onPick={(key) => store.addTarget(key, Math.max(1, armourCap(data, key)))} placeholder="Add a skill you want, e.g. Insight…" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a set or monster…"
            className="h-10 rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3 text-sm text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-400 focus:outline-none md:w-60"
          />
        </div>
        <TargetList data={data} targets={store.targets} have={result.skillLevel} onLevel={store.setTargetLevel} onRemove={store.removeTarget} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {store.targets.length > 0 && (
            <button
              type="button"
              onClick={() => setOnlyMine((v) => !v)}
              aria-pressed={onlyMine}
              className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold', onlyMine ? 'border-mh-gold-400 bg-mh-gold-500/15 text-mh-gold-200' : 'border-mh-slate-700 text-mh-slate-400')}
            >
              {onlyMine && <Check size={12} />} Only sets with my skills
            </button>
          )}
          <span className="text-mh-slate-500">Skill levels:</span>
          <div className="flex rounded-lg border border-mh-slate-700 p-0.5">
            {[
              [false, 'Next unlock'],
              [true, 'Every unlock'],
            ].map(([v, label]) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setAllSteps(v as boolean)}
                className={cn('rounded-md px-2 py-0.5 font-semibold', allSteps === v ? 'bg-mh-gold-500 text-black' : 'text-mh-slate-300 hover:text-white')}
              >
                {label as string}
              </button>
            ))}
          </div>
          <span className="text-mh-slate-500">
            Numbers = level at R{myRarity}; <span className="text-amber-300">→2 R9</span> = next level and the rarity it arrives.
          </span>
        </div>
      </section>

      {/* ── The table ── */}
      {groups.length === 0 ? (
        <p className="mho-panel p-6 text-center text-sm text-mh-slate-400">No sets match. {onlyMine && store.targets.length > 0 ? 'Turn off “Only sets with my skills” to see everything.' : ''}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-mh-slate-800 bg-mh-slate-950/40">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[190px]" />
              {LAB_SLOTS.map((s) => (
                <col key={s.id} />
              ))}
            </colgroup>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.rarity}>
                  <tr className="bg-mh-slate-900">
                    <th className="sticky left-0 z-10 bg-mh-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                      <span className="flex items-center gap-1.5">
                        <RarityBadge rarity={g.rarity} /> sets
                        {g.rarity > myRarity && <span className="normal-case tracking-normal text-amber-300">above yours</span>}
                      </span>
                    </th>
                    {LAB_SLOTS.map((s) => (
                      <th
                        key={s.id}
                        className={cn('px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-mh-gold-400', focusSlot === s.id && 'bg-sky-500/15 text-sky-200')}
                      >
                        <button type="button" onClick={() => setFocusSlot(focusSlot === s.id ? null : s.id)} title="Highlight this column">
                          {s.label}
                        </button>
                      </th>
                    ))}
                  </tr>
                  {g.sets.map((set) => (
                    <SetRow key={set.key} data={data} lab={lab} set={set} allSteps={allSteps} focusSlot={focusSlot} />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LabOverlays lab={lab} />
    </div>
  );
}

function wantedScore(set: LabSet, rarity: number, targets: LabTarget[], focus: LabSlot | null) {
  let n = 0;
  for (const { id } of LAB_SLOTS) {
    if (focus && focus !== id) continue;
    const p = set.pieces[id];
    if (!p) continue;
    const own = skillsAt(p, rarity);
    for (const t of targets) n += Math.min(own[t.key] ?? 0, t.level);
  }
  return n;
}

function SetRow({ data, lab, set, allSteps, focusSlot }: { data: LabData; lab: LabPage; set: LabSet; allSteps: boolean; focusSlot: LabSlot | null }) {
  const { store, myRarity, wanted } = lab;
  const tones = targetTones(store.targets);
  const bonusSkill = set.setBonus ? data.skills.get(set.setBonus.skillKey) : undefined;
  const equipSet = () => {
    const next: LabBuild = { ...store.build };
    for (const { id } of LAB_SLOTS) if (set.pieces[id]) next[id] = { pieceId: set.pieces[id]!.id, rarity: null };
    store.setBuild(next);
  };
  return (
    <tr className="border-t border-mh-slate-800 align-top">
      <td className="sticky left-0 z-10 bg-mh-slate-900 px-3 py-2">
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-950 p-0.5">
            {set.icon ? <img src={set.icon} alt="" className="h-full w-full object-contain" /> : <Layers size={15} className="text-mh-gold-400" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight text-white">{set.name}</p>
            <p className="text-[10px] text-mh-slate-500">
              R{set.rarity}–R{set.maxRarity}
            </p>
          </div>
        </div>
        {set.setBonus && (
          <p className={cn('mt-1 flex items-center gap-1 text-[10px]', wanted.has(set.setBonus.skillKey) ? 'font-bold text-orange-200' : 'text-orange-300/80')}>
            <Flame size={10} /> {set.setBonus.pieces}pc: +{set.setBonus.level} {bonusSkill?.name}
          </p>
        )}
        <button type="button" onClick={equipSet} className="mt-1.5 rounded-md border border-mh-slate-600 px-1.5 py-0.5 text-[10px] font-bold text-mh-slate-300 hover:border-mh-gold-400 hover:text-mh-gold-200">
          Equip all
        </button>
      </td>
      {LAB_SLOTS.map(({ id, label }) => {
        const p = set.pieces[id];
        if (!p) return <td key={id} className="px-2 py-2 text-[10px] text-mh-slate-600">—</td>;
        const equipped = store.build[id]?.pieceId === p.id;
        const hits = wantedOnPiece(p, myRarity, tones);
        const firstActive = hits.find((h) => !h.locked);
        return (
          <td
            key={id}
            className={cn(
              'relative border-l border-mh-slate-800/70 px-2 py-2',
              equipped ? 'bg-emerald-500/10' : firstActive?.tone.cell,
              focusSlot === id && !equipped && 'bg-sky-500/10',
            )}
          >
            {hits.length > 0 && (
              <span className="absolute inset-x-0 top-0 flex h-1 gap-px">
                {hits.map((h) => (
                  <span key={h.key} className={cn('flex-1', h.tone.bar, h.locked && 'opacity-40')} />
                ))}
              </span>
            )}
            <div className="mb-1 flex items-center gap-1.5">
              <button type="button" onClick={() => lab.setInspectId(p.id)} title={`${set.name} ${label} — every skill level`}>
                <PieceIcon piece={p} size={28} />
              </button>
              <button
                type="button"
                onClick={() => (equipped ? store.unequip(id) : store.equip(id, p.id))}
                className={cn(
                  'ml-auto flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold',
                  equipped ? 'border-emerald-500/60 text-emerald-300' : 'border-mh-gold-400/50 text-mh-gold-200 hover:bg-mh-gold-500 hover:text-black',
                )}
                aria-label={equipped ? `Remove ${label}` : `Equip ${set.name} ${label}`}
              >
                {equipped ? <Check size={11} /> : <Plus size={11} />} {equipped ? 'On' : 'Equip'}
              </button>
            </div>
            <button type="button" onClick={() => lab.setInspectId(p.id)} className="block w-full text-left">
              <PieceSkillList data={data} piece={p} rarity={myRarity} wanted={wanted} tones={tones} allSteps={allSteps} />
            </button>
          </td>
        );
      })}
    </tr>
  );
}
