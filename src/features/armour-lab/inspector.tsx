// ─────────────────────────────────────────────────────────────
// Piece popup — what a hunter wants to know about a piece: its
// skills, what each level does, and the rarity each level arrives.
// The rest of its set sits in a row (Helm → Greaves) to jump between.
// ─────────────────────────────────────────────────────────────
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Check, CheckCircle2, Flame, Lock, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import ChallengeIcon from '../../components/ChallengeIcon';
import {
  LAB_SLOTS,
  clampRarity,
  isAboveRarity,
  pieceSkillKeys,
  skillTimeline,
  skillsAt,
  slotLabel,
  type LabData,
  type LabPiece,
  type LabTarget,
} from './logic';
import { useArmourLabStore } from './store';
import type { useTrackPiece } from './hooks';
import { LOCK_ICON, Modal, PieceIcon, RarityBadge, SkillPips, targetTones, toneFor } from './ui';

export function PieceInspector({ data, pieceId, myRarity, targets, onClose, actions }: {
  data: LabData;
  pieceId: string;
  myRarity: number;
  targets?: LabTarget[];
  onClose: () => void;
  /** Buttons shown under the header (equip, track …) */
  actions?: (piece: LabPiece) => ReactNode;
}) {
  const [currentId, setCurrentId] = useState(pieceId);
  const piece = data.piecesById.get(currentId);
  if (!piece) return null;

  const tones = targetTones(targets ?? []);
  const r = clampRarity(piece, myRarity);
  const now = skillsAt(piece, r);
  const above = isAboveRarity(piece, myRarity);
  const set = data.setsByKey.get(piece.setKey);
  const bonus = set?.setBonus ?? piece.setBonus;
  const bonusSkill = bonus ? data.skills.get(bonus.skillKey) : undefined;

  return (
    <Modal onClose={onClose}>
      <div className="relative border-b border-mh-slate-800 p-4">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white" aria-label="Close">
          <X size={20} />
        </button>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Big picture of the piece */}
          <span className="relative shrink-0">
            <PieceIcon piece={piece} size={136} className="rounded-2xl p-2" />
            {above && <img src={LOCK_ICON} alt="Above your rarity" className="absolute -bottom-2 -right-2 h-8 w-8 drop-shadow" />}
          </span>
          <div className="w-full min-w-0 flex-1 space-y-3">
            <div className="pr-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mh-gold-400">{slotLabel(piece.slot)}</p>
              <h2 className="font-display text-lg font-bold leading-tight text-white">{piece.setName}</h2>
              {piece.hasMonster && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-mh-slate-300">
                  {piece.monsterIcon && <img src={piece.monsterIcon} alt="" className="h-5 w-5 object-contain" />}
                  from {piece.monsterName}
                </p>
              )}
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-mh-slate-400">
                <RarityBadge rarity={piece.rarity} /> → <RarityBadge rarity={piece.maxRarity} />
                <span>· showing R{r}</span>
                {piece.decoSlots.length > 0 && <span>· Deco slots {piece.decoSlots.join(' · ')}</span>}
                {piece.comingSoon && (
                  <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 font-bold text-amber-300">Coming{piece.statusReason ? ` — ${piece.statusReason}` : ''}</span>
                )}
              </p>
            </div>
            {actions && <div className="flex flex-col gap-2">{actions(piece)}</div>}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {above && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            This piece starts at <b>R{piece.rarity}</b>, above your <b>R{myRarity}</b>, so it is shown at R{piece.rarity}.
          </p>
        )}

        {/* One card per skill: every level, what it does, and when it arrives */}
        {pieceSkillKeys(piece).map((key) => {
          const s = data.skills.get(key);
          const tone = toneFor(s?.category);
          const lv = now[key] ?? 0;
          const timeline = skillTimeline(piece, key);
          const pieceMax = timeline.length ? timeline[timeline.length - 1].level : 0;
          return (
            <section key={key} className={cn('rounded-2xl border p-3', tones.get(key)?.chip ?? 'border-mh-slate-800 bg-mh-slate-950/50')}>
              <header className="flex flex-wrap items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', tones.get(key)?.dot ?? tone.dot)} />
                <h3 className="font-bold text-white">{s?.name ?? key}</h3>
                <span className={cn('rounded border px-1.5 text-[10px] font-bold uppercase tracking-wide', tone.chip)}>{s?.category}</span>
                <span className="ml-auto flex items-center gap-2 text-xs">
                  {lv > 0 ? (
                    <span className="font-bold text-mh-slate-100">Lv{lv} now</span>
                  ) : (
                    <span className="flex items-center gap-1 font-bold text-amber-300">
                      <Lock size={11} /> from R{timeline[0]?.rarity}
                    </span>
                  )}
                  <SkillPips level={lv} max={pieceMax} preview={pieceMax - lv} tone={tone} size="sm" />
                </span>
              </header>
              <ol className="mt-2 space-y-1">
                {timeline.map((t) => {
                  const reached = t.rarity <= r;
                  const current = reached && t.level === lv;
                  return (
                    <li
                      key={t.rarity}
                      className={cn(
                        'grid grid-cols-[auto_auto_1fr] items-start gap-2 rounded-lg px-2 py-1.5 text-xs',
                        current ? 'bg-sky-500/10 ring-1 ring-sky-400/40' : reached ? 'bg-mh-slate-900/60' : 'bg-transparent',
                      )}
                    >
                      <RarityBadge rarity={t.rarity} className={cn(!reached && 'opacity-70')} />
                      <span className={cn('w-8 font-mono font-bold', reached ? 'text-mh-slate-100' : 'text-amber-300')}>Lv{t.level}</span>
                      <span className={cn('leading-snug', reached ? 'text-mh-slate-300' : 'text-mh-slate-500')}>
                        {s?.descByLevel[t.level] ?? '—'}
                        {!reached && <Lock size={10} className="ml-1 inline text-amber-400" />}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
        {pieceSkillKeys(piece).length === 0 && <p className="text-sm italic text-mh-slate-500">This piece has no skills.</p>}

        {bonus && (
          <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-orange-300">
              <Flame size={13} /> Set bonus · wear {bonus.pieces} pieces of {piece.setName}
            </p>
            <p className="mt-1 text-mh-slate-200">
              +{bonus.level} {bonusSkill?.name ?? bonus.skillKey}
            </p>
            {bonusSkill?.descByLevel[bonus.level] && <p className="mt-0.5 text-mh-slate-400">{bonusSkill.descByLevel[bonus.level]}</p>}
          </section>
        )}

        {/* The rest of the set, in the usual order */}
        {set && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-mh-slate-400">{set.name}</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {LAB_SLOTS.map(({ id, label }) => {
                const p = set.pieces[id];
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!p}
                    onClick={() => p && setCurrentId(p.id)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-xl border p-1.5 text-[10px] font-bold uppercase text-mh-gold-400',
                      p?.id === piece.id ? 'border-mh-gold-400 bg-mh-gold-500/10' : 'border-mh-slate-800 hover:border-mh-slate-500',
                    )}
                  >
                    <PieceIcon piece={p} slot={id} size={36} className="border-0 bg-transparent" />
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

/** Equip / rarity / track buttons for the popup */
export function PieceActions({ piece, data, myRarity, tracker }: {
  piece: LabPiece;
  data: LabData;
  myRarity: number;
  tracker: ReturnType<typeof useTrackPiece>;
}) {
  const { build, equip, unequip, setSlotRarity } = useArmourLabStore();
  const entry = build[piece.slot];
  const equipped = entry?.pieceId === piece.id;
  const tracked = tracker.isTracked(piece.id);
  return (
    <>
      <button
        type="button"
        onClick={() => (equipped ? unequip(piece.slot) : equip(piece.slot, piece.id))}
        className={cn(
          'flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold',
          equipped ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-mh-gold-400 bg-mh-gold-500 text-black hover:brightness-110',
        )}
      >
        {equipped ? <Check size={14} /> : <Plus size={14} />}
        {equipped ? 'Equipped — tap to remove' : entry ? `Replace ${slotLabel(piece.slot)}` : `Equip ${slotLabel(piece.slot)}`}
      </button>
      {equipped && (
        <label className="flex items-center justify-between gap-1.5 text-[11px] text-mh-slate-400">
          This piece is upgraded to
          <select
            value={entry?.rarity ?? ''}
            onChange={(e) => setSlotRarity(piece.slot, e.target.value ? Number(e.target.value) : null)}
            className="h-8 rounded-lg border border-mh-slate-700 bg-mh-slate-950 px-1 font-mono text-xs font-bold text-mh-slate-100"
          >
            <option value="">My rarity (R{clampRarity(piece, myRarity)})</option>
            {Array.from({ length: piece.maxRarity - piece.rarity + 1 }, (_, i) => piece.rarity + i).map((v) => (
              <option key={v} value={v}>
                R{v}
              </option>
            ))}
          </select>
        </label>
      )}
      {tracked ? (
        <Link to="/challenges" className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 px-3 py-2 text-xs font-bold text-emerald-300">
          <CheckCircle2 size={14} /> Tracked
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => tracker.track(piece, data.setsByKey.get(piece.setKey)?.maxRarity ?? piece.maxRarity)}
          disabled={tracker.pending}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-600/50 px-3 py-2 text-xs font-bold text-sky-300 hover:bg-sky-900/50 disabled:opacity-50"
        >
          <ChallengeIcon size={16} /> {tracker.justAdded === piece.id ? 'Added!' : 'Track to craft'}
        </button>
      )}
      {tracker.error && <p className="w-full text-[11px] text-rose-400">{tracker.error}</p>}
    </>
  );
}
