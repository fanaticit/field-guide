// ─────────────────────────────────────────────────────────────
// Armour page (/armory/armour) — "Explorer". Built as armour v2 and
// now the main armour page; the previous page is at /armory/armour_old.
//   • Rarity lives in the title bar (opens when you tap it).
//   • Sets are flat rows, highest rarity first, with the monster and its
//     five pieces in a line — Helm, Chest, Arms, Coil, Greaves — each
//     listing its skills and the rarity the next level arrives.
//   • Every wanted skill has its own colour, on the filter and on pieces.
//   • The example build sits on the right, also as a row of five.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Check, CheckCircle2, ChevronDown, Flame, Layers, Plus, Shield, Target, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  LAB_SLOTS,
  armourCap,
  computeBuild,
  diffBuilds,
  isAboveRarity,
  skillsAt,
  slotLabel,
  targetProgress,
  type LabBuild,
  type LabData,
  type LabSet,
  type LabSlot,
  type LabTarget,
} from './logic';
import { BuildActions, BuildSkillsList, LockedWarning, RarityOutlook, SetBonusList, WantedProgress } from './build-ui';
import { LabLoading, LabNotices, LabOverlays, useLabPage, type LabPage } from './page-kit';
import { ExportArmourImage } from './export';
import {
  BuildRow,
  FLOATING_BAR_CLASS,
  LOCK_ICON,
  LabHeader,
  Modal,
  PieceIcon,
  PieceSkillList,
  RarityBadge,
  SkillPicker,
  TargetList,
  targetTones,
  wantedOnPiece,
  type TargetTone,
} from './ui';

const PATH = '/armory/armour';
const PAGE_SIZE = 15;

export default function ArmourV2() {
  const lab = useLabPage(PATH);
  const { data, result, store, myRarity, wanted } = lab;
  const [onlyMine, setOnlyMine] = useState(true);
  const [focusSlot, setFocusSlot] = useState<LabSlot | null>(null);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [mobileBuildOpen, setMobileBuildOpen] = useState(false);
  useEffect(() => setLimit(PAGE_SIZE), [focusSlot, search, onlyMine, store.targets.length, myRarity]);

  if (!data || !result) return <LabLoading lab={lab} path={PATH} />;

  const progress = targetProgress(result, store.targets);
  const allMet = store.targets.length > 0 && progress.every((p) => p.met);

  const focus = (slot: LabSlot) => {
    setFocusSlot(slot);
    setMobileBuildOpen(false);
    document.getElementById('armour-v2-sets')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const buildCard = (
    <BuildCard
      lab={lab}
      allMet={allMet}
      focusSlot={focusSlot}
      onSlot={(slot, piece) => (piece ? lab.setInspectId(piece.id) : focus(slot))}
      onFocusFree={focus}
    />
  );

  return (
    <div data-rarity-theme={lab.theme} className="section-theme w-full space-y-3 px-3 pb-24 pt-2 sm:px-4 lg:px-6 xl:pb-8">
      <LabHeader
        title="Armour"
        current={PATH}
        showVersions={false}
        minRarity={data.minRarity}
        maxRarity={data.maxRarity}
        onRarityChange={lab.onRarityChange}
        notice={<LabNotices lab={lab} />}
        description={
          <>
            Add the skills you want, browse sets piece by piece, and build an example set at your rarity. Tap a piece for every skill level and when it unlocks.{' '}
            <span className="text-mh-slate-300">
              We&apos;ve moved to a new armour page. Prefer the old one?{' '}
              <Link to="/armory/armour_old" className="font-semibold text-mh-gold-400 underline hover:text-mh-gold-300">
                Open the old armour page
              </Link>
              .
            </span>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-3">
          {/* Skills you want */}
          <section className="mho-panel space-y-2.5 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white">
                <Target size={16} className="text-mh-gold-400" /> Skills you want
              </h2>
              {store.targets.length > 0 && (
                <button type="button" onClick={store.clearTargets} className="text-[11px] text-mh-slate-400 hover:text-white">
                  Clear
                </button>
              )}
            </div>
            <SkillPicker data={data} exclude={wanted} onPick={(key) => store.addTarget(key, Math.max(1, armourCap(data, key)))} />
            <TargetList data={data} targets={store.targets} have={result.skillLevel} onLevel={store.setTargetLevel} onRemove={store.removeTarget} />
            {store.targets.length === 0 && <p className="text-xs text-mh-slate-500">Sets that give these skills move to the top and the skills are highlighted on every piece.</p>}
          </section>

          {/* Toolbar */}
          <div id="armour-v2-sets" className="flex scroll-mt-4 flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a set or monster…"
              className="h-9 min-w-[180px] flex-1 rounded-xl border border-mh-slate-700 bg-mh-slate-950 px-3 text-sm text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-400 focus:outline-none"
            />
            {store.targets.length > 0 && (
              <button
                type="button"
                onClick={() => setOnlyMine((v) => !v)}
                aria-pressed={onlyMine}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold',
                  onlyMine ? 'border-mh-gold-400 bg-mh-gold-500/15 text-mh-gold-200' : 'border-mh-slate-700 text-mh-slate-400 hover:text-white',
                )}
              >
                {onlyMine ? <Check size={13} /> : <Layers size={13} />} Only sets with my skills
              </button>
            )}
            {focusSlot && (
              <span className="flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/60 bg-sky-500/10 pl-3 pr-1.5 text-xs font-bold text-sky-200">
                Best {slotLabel(focusSlot)} first
                <button type="button" onClick={() => setFocusSlot(null)} className="rounded p-0.5 hover:bg-sky-500/20" aria-label="Stop focusing">
                  <X size={13} />
                </button>
              </span>
            )}
          </div>

          <SetList
            data={data}
            lab={lab}
            onlyMine={onlyMine && store.targets.length > 0}
            focusSlot={focusSlot}
            allMet={allMet}
            search={search}
            limit={limit}
            onMore={() => setLimit((l) => l + PAGE_SIZE)}
            onFocus={setFocusSlot}
          />
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-3 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl">{buildCard}</div>
        </aside>
      </div>

      {/* Mobile: build bar + sheet */}
      <button
        type="button"
        onClick={() => setMobileBuildOpen(true)}
        className={cn(FLOATING_BAR_CLASS, 'z-40 flex items-center gap-3 rounded-2xl border border-mh-gold-400/60 bg-mh-slate-900/95 px-4 py-3 text-left shadow-2xl backdrop-blur xl:hidden')}
      >
        <Shield size={18} className="text-mh-gold-400" />
        <span className="flex-1 text-sm">
          <b className="text-white">Build {result.pieceCount}/5</b>
          <span className="text-mh-slate-400">
            {' '}
            · {result.skills.length} skills
            {store.targets.length > 0 && ` · ${progress.filter((p) => p.met).length}/${store.targets.length} wanted`}
          </span>
        </span>
        <RarityBadge rarity={myRarity} />
        <ChevronDown size={16} className="rotate-180 text-mh-slate-400" />
      </button>
      {mobileBuildOpen && (
        <Modal onClose={() => setMobileBuildOpen(false)}>
          <div className="flex items-center justify-between border-b border-mh-slate-800 px-4 py-3">
            <h2 className="font-display font-bold text-white">Your build</h2>
            <button type="button" onClick={() => setMobileBuildOpen(false)} className="rounded-lg p-1 text-mh-slate-400 hover:text-white" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="p-3">{buildCard}</div>
        </Modal>
      )}

      <LabOverlays lab={lab} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function BuildCard({ lab, allMet, focusSlot, onSlot, onFocusFree }: {
  lab: LabPage;
  allMet: boolean;
  focusSlot: LabSlot | null;
  onSlot: Parameters<typeof BuildRow>[0]['onSlot'];
  onFocusFree: (slot: LabSlot) => void;
}) {
  const { data, result, store, myRarity, wanted } = lab;
  if (!data || !result) return null;
  const free = LAB_SLOTS.filter((s) => !store.build[s.id]);
  const empty = result.pieceCount === 0;
  return (
    <div className="mho-panel space-y-3 p-3 sm:p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-white">Example build</h2>
          <p className="text-[11px] text-mh-slate-400">
            {result.pieceCount}/5 pieces at <RarityBadge rarity={myRarity} /> · tap a piece for details
          </p>
        </div>
        <p className="flex items-center gap-1 font-mono text-sm font-bold text-mh-slate-200" title="Total defence">
          <Shield size={13} className="text-mh-gold-400" /> {result.defence}
        </p>
      </header>

      <BuildRow data={data} build={store.build} myRarity={myRarity} onSlot={onSlot} onRemove={store.unequip} active={focusSlot} />
      <LockedWarning data={data} build={store.build} myRarity={myRarity} />

      {empty ? (
        <p className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/40 p-3 text-xs text-mh-slate-400">
          Tap an empty slot to see the best pieces for it, use <b>Equip</b> on any piece, or{' '}
          <button type="button" onClick={lab.actions.importFromPlanner} className="font-semibold text-mh-gold-300 underline">
            bring in your Build Planner armour
          </button>
          .
        </p>
      ) : (
        <>
          <WantedProgress data={data} result={result} targets={store.targets} />
          {allMet && free.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100">
              <CheckCircle2 size={13} className="text-emerald-400" /> All wanted skills reached. See what else fits in
              {free.map((s) => (
                <button key={s.id} type="button" onClick={() => onFocusFree(s.id)} className="rounded-md border border-emerald-400/60 px-1.5 font-bold hover:bg-emerald-400 hover:text-black">
                  {s.label}
                </button>
              ))}
            </p>
          )}
          <section>
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">Skills ({result.skills.length})</h3>
            <BuildSkillsList data={data} result={result} wanted={wanted} changedKeys={lab.change?.keys} />
          </section>
          <SetBonusList result={result} />
          <RarityOutlook data={data} build={store.build} result={result} myRarity={myRarity} wanted={wanted} onRarity={store.setMyRarity} />
        </>
      )}
      <BuildActions
        empty={empty}
        onShare={lab.actions.share}
        onSendToPlanner={lab.actions.sendToPlanner}
        onImport={lab.actions.importFromPlanner}
        onClear={lab.actions.clear}
        exportButton={(className) => <ExportArmourImage lab={lab} className={className} />}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

/** Wanted levels a piece gives at my rarity (each capped at its target) */
function wantedLevels(own: Record<string, number>, targets: LabTarget[]) {
  return targets.reduce((n, t) => n + Math.min(own[t.key] ?? 0, t.level), 0);
}

const ROW_GRID =
  'grid grid-cols-[136px_repeat(5,minmax(0,1fr))] sm:grid-cols-[190px_repeat(5,minmax(0,1fr))] xl:grid-cols-[150px_repeat(5,minmax(0,1fr))] 2xl:grid-cols-[190px_repeat(5,minmax(0,1fr))]';

function SetList({ data, lab, onlyMine, focusSlot, allMet, search, limit, onMore, onFocus }: {
  data: LabData;
  lab: LabPage;
  onlyMine: boolean;
  focusSlot: LabSlot | null;
  allMet: boolean;
  search: string;
  limit: number;
  onMore: () => void;
  onFocus: (slot: LabSlot | null) => void;
}) {
  const { store, myRarity, result } = lab;
  const targets = store.targets;
  const hideAbove = store.hideAbove;
  const tones = useMemo(() => targetTones(targets), [targets]);

  const sets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.sets
      .filter((s) => !hideAbove || s.rarity <= myRarity)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.monsterName.toLowerCase().includes(q))
      .map((set) => {
        // Any wanted skill on any piece, even one that unlocks above my rarity
        const hits = LAB_SLOTS.reduce((n, { id }) => n + (set.pieces[id] ? wantedOnPiece(set.pieces[id]!, myRarity, tones).length : 0), 0);
        let focusScore = 0;
        if (focusSlot && set.pieces[focusSlot]) {
          focusScore = wantedLevels(skillsAt(set.pieces[focusSlot]!, myRarity), targets);
          // Once every wanted skill is in, a focused slot ranks by the other skills it adds
          if (allMet && result) {
            const after = computeBuild(data, { ...store.build, [focusSlot]: { pieceId: set.pieces[focusSlot]!.id } }, myRarity);
            const d = diffBuilds(result, after);
            const lost = d.skills.some((s) => s.to < s.from && targets.some((t) => t.key === s.key && s.to < t.level));
            focusScore = lost ? -1 : d.skills.reduce((n, s) => n + Math.max(0, s.to - s.from), 0);
          }
        }
        return { set, hits, focusScore };
      })
      .filter((x) => {
        if (focusSlot && !x.set.pieces[focusSlot]) return false;
        if (!onlyMine) return true;
        return focusSlot ? x.focusScore > 0 || (allMet && x.focusScore >= 0) : x.hits > 0;
      })
      .sort(
        (a, b) =>
          (focusSlot ? b.focusScore - a.focusScore : 0) ||
          b.set.rarity - a.set.rarity || // higher rarity sets first
          a.set.name.localeCompare(b.set.name),
      );
  }, [data, store.build, result, myRarity, targets, tones, onlyMine, focusSlot, allMet, search, hideAbove]);

  if (sets.length === 0) {
    return (
      <p className="mho-panel p-6 text-center text-sm text-mh-slate-400">
        No sets match{hideAbove ? ` at R${myRarity} or below` : ''}. {onlyMine ? 'Turn off “Only sets with my skills” to see everything.' : ''}
      </p>
    );
  }

  const shown = sets.slice(0, limit);
  return (
    <div className="space-y-2">
      <div className="mho-panel p-0">
        <div className="overflow-x-auto lg:overflow-visible">
          <div className="min-w-[760px] sm:min-w-[860px] lg:min-w-0">
            {/* Slot names once, at the top */}
            <div className={cn(ROW_GRID, 'z-20 rounded-t-[0.875rem] border-b border-mh-slate-700 bg-mh-slate-900/95 backdrop-blur lg:sticky lg:top-0')}>
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">{sets.length} sets</div>
              {LAB_SLOTS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onFocus(focusSlot === id ? null : id)}
                  title={focusSlot === id ? 'Show all slots' : `Best ${label} pieces first`}
                  className={cn(
                    'px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wider',
                    focusSlot === id ? 'bg-sky-500/15 text-sky-200' : 'text-mh-gold-400 hover:text-white',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {shown.map(({ set }, i) => {
              const newGroup = !focusSlot && (i === 0 || shown[i - 1].set.rarity !== set.rarity);
              return (
                <div key={set.key}>
                  {newGroup && (
                    <div className="flex items-center gap-2 border-b border-mh-slate-800 bg-mh-slate-950/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">
                      <RarityBadge rarity={set.rarity} /> sets
                      {set.rarity > myRarity && (
                        <span className="flex items-center gap-1 normal-case tracking-normal text-rose-300">
                          <img src={LOCK_ICON} alt="" className="h-3.5 w-3.5" /> above your R{myRarity}
                        </span>
                      )}
                    </div>
                  )}
                  <SetRow data={data} lab={lab} set={set} tones={tones} focusSlot={focusSlot} showExtras={allMet} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {sets.length > limit && (
        <button type="button" onClick={onMore} className="w-full rounded-xl border border-mh-slate-700 py-2 text-xs font-bold text-mh-slate-300 hover:text-white">
          Show more sets ({sets.length - limit} left)
        </button>
      )}
    </div>
  );
}

function SetRow({ data, lab, set, tones, focusSlot, showExtras }: {
  data: LabData;
  lab: LabPage;
  set: LabSet;
  tones: Map<string, TargetTone>;
  focusSlot: LabSlot | null;
  showExtras: boolean;
}) {
  const { store, myRarity, wanted, result } = lab;
  const above = set.rarity > myRarity;
  const r = Math.min(Math.max(myRarity, set.rarity), set.maxRarity);
  const bonusSkill = set.setBonus ? data.skills.get(set.setBonus.skillKey) : undefined;
  const bonusTone = set.setBonus ? tones.get(set.setBonus.skillKey) : undefined;
  const portrait = set.monsterIcon ?? set.icon;

  const equipSet = () => {
    const next: LabBuild = { ...store.build };
    for (const { id } of LAB_SLOTS) if (set.pieces[id]) next[id] = { pieceId: set.pieces[id]!.id, rarity: null };
    store.setBuild(next);
  };

  return (
    <div className={cn(ROW_GRID, 'border-b border-mh-slate-800/80 last:border-b-0')}>
      {/* The set and the monster it comes from */}
      <div className="sticky left-0 z-10 bg-mh-slate-900 px-2 py-3 sm:px-3 lg:static lg:bg-transparent">
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:gap-2.5">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-mh-slate-700 bg-mh-slate-950 p-1 sm:h-14 sm:w-14">
            {portrait ? <img src={portrait} alt="" className="h-full w-full object-contain" /> : <Layers size={24} className="text-mh-gold-400" />}
            {above && <img src={LOCK_ICON} alt="Above your rarity" className="absolute -bottom-1.5 -right-1.5 h-5 w-5 drop-shadow" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-white">{set.name}</p>
            {set.hasMonster && <p className="truncate text-[11px] text-mh-slate-400">{set.monsterName}</p>}
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-mh-slate-500">
              <RarityBadge rarity={r} />
              {above ? <span className="font-semibold text-rose-300">needs R{set.rarity}</span> : <span>max R{set.maxRarity}</span>}
            </p>
          </div>
        </div>
        {set.setBonus && (
          <p className={cn('mt-1.5 flex items-center gap-1 rounded px-1 text-[11px]', bonusTone ? cn(bonusTone.pill, 'font-bold') : 'text-orange-300/90')}>
            <Flame size={11} className="shrink-0" /> {set.setBonus.pieces}pc: +{set.setBonus.level} {bonusSkill?.name}
          </p>
        )}
        <button type="button" onClick={equipSet} className="mt-1.5 text-[11px] font-semibold text-mh-gold-300 underline-offset-2 hover:underline">
          Equip all 5
        </button>
      </div>

      {/* Helm → Greaves */}
      {LAB_SLOTS.map(({ id, label }) => {
        const p = set.pieces[id];
        if (!p) return <div key={id} className="border-l border-mh-slate-800/60 px-2 py-3 text-[11px] text-mh-slate-600">—</div>;
        const equipped = store.build[id]?.pieceId === p.id;
        const hits = wantedOnPiece(p, myRarity, tones);
        const firstActive = hits.find((h) => !h.locked);
        // What equipping it would change to the wanted skills (and, once they're all in, the others)
        let delta: Array<{ name: string; d: number }> = [];
        if (!equipped && result && store.targets.length > 0) {
          const after = computeBuild(data, { ...store.build, [id]: { pieceId: p.id } }, myRarity);
          delta = diffBuilds(result, after)
            .skills.filter((s) => wanted.has(s.key) || (focusSlot === id && showExtras && s.to > s.from))
            .map((s) => ({ name: s.name, d: s.to - s.from }));
        }
        return (
          <div
            key={id}
            className={cn(
              'relative border-l border-mh-slate-800/60 px-2 pb-2.5 pt-3',
              firstActive?.tone.cell,
              focusSlot !== null && focusSlot !== id && 'opacity-40 hover:opacity-100',
              focusSlot === id && 'bg-sky-500/[0.06]',
            )}
          >
            {/* One coloured bar per wanted skill on this piece (faded = unlocks later) */}
            {hits.length > 0 && (
              <span className="absolute inset-x-0 top-0 flex h-1 gap-px">
                {hits.map((h) => (
                  <span key={h.key} className={cn('flex-1', h.tone.bar, h.locked && 'opacity-40')} />
                ))}
              </span>
            )}

            {equipped ? (
              <span className="absolute right-1.5 top-2 text-emerald-400" title="In your build">
                <CheckCircle2 size={18} />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => store.equip(id, p.id)}
                className="absolute right-1.5 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-mh-gold-400/70 bg-mh-slate-950/80 text-mh-gold-200 hover:bg-mh-gold-500 hover:text-black"
                title={store.build[id] ? `Swap into your build (${label})` : `Add to your build (${label})`}
                aria-label={`Add ${set.name} ${label} to your build`}
              >
                <Plus size={16} />
              </button>
            )}

            <button type="button" onClick={() => lab.setInspectId(p.id)} className="block w-full text-left" title="See every skill level">
              <span className="relative mb-1.5 inline-block">
                <PieceIcon piece={p} size={56} className={cn(isAboveRarity(p, myRarity) && 'opacity-70')} />
                {isAboveRarity(p, myRarity) && <img src={LOCK_ICON} alt="" className="absolute -bottom-1 -right-1 h-4 w-4" />}
              </span>
              <PieceSkillList data={data} piece={p} rarity={myRarity} tones={tones} />
            </button>
            {delta.length > 0 && (
              <p className="mt-1 text-[10px] font-semibold leading-tight">
                {delta.map((s) => (
                  <span key={s.name} className={cn('mr-1 inline-block', s.d > 0 ? 'text-emerald-300' : 'text-rose-300')}>
                    {s.d > 0 ? '▲' : '▼'} {s.name} {s.d > 0 ? `+${s.d}` : s.d}
                  </span>
                ))}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
