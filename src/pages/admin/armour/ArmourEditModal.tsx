// ─────────────────────────────────────────────────────────────
// ArmourEditModal — create / edit one armour piece
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Trash2, AlertTriangle, Plus } from 'lucide-react';
import {
  ARMOUR_SLOT_OPTIONS,
  useApplySetBonus,
  useDeleteArmourPieceById,
  useUpsertArmourPiece,
  type ArmourPiece,
  type ArmourPieceUpsert,
} from '../../../hooks/useArmourPieces';
import type { DBMonster } from '../../../hooks/useAdminMonsters';
import type { DBSkill } from '../../../hooks/useAdminSkills';
import { getRarityBadgeStyle } from '../../../data/schemas/armour';
import { cn } from '../../../lib/utils';

const inputCls =
  'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50';
const labelCls = 'block text-xs font-medium text-mh-slate-400 mb-1.5';

export function skillLabel(skill: DBSkill | undefined, id: string) {
  if (!skill) return `Unknown skill (${id})`;
  return skill.max_levels > 1 ? `${skill.name} Lv${skill.level}` : skill.name;
}

function emptyForm(): ArmourPieceUpsert {
  return {
    id: '',
    monster_id: '',
    slot: 'Head',
    skills: [],
    set_name: null,
    set_variant: 'I',
    rarity: 1,
    max_rarity: null,
    deco_slots: [1, 1],
    set_bonus: null,
    icon_m: null,
    icon_f: null,
    set_icon: null,
    is_active: true,
    notes: null,
  };
}

function SkillPicker({
  skills,
  exclude,
  onPick,
  placeholder,
}: {
  skills: DBSkill[];
  exclude?: string[];
  onPick: (id: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return skills
      .filter(
        (s) =>
          !exclude?.includes(s.id) &&
          (s.name.toLowerCase().includes(q) || s.id.includes(q)),
      )
      .slice(0, 12);
  }, [skills, query, exclude]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      {results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-mh-slate-700 bg-mh-slate-900 shadow-xl">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onPick(s.id);
                setQuery('');
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-mh-slate-800"
            >
              <span className="flex items-center gap-2 text-mh-slate-100">
                {s.icon && <img src={s.icon} alt="" className="h-4 w-4 object-contain" />}
                {skillLabel(s, s.id)}
              </span>
              <span className="font-mono text-[10px] text-mh-slate-500">{s.id} · {s.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  piece: ArmourPiece | null;
  open: boolean;
  onClose: () => void;
  monsters: DBMonster[];
  skills: DBSkill[];
}

export default function ArmourEditModal({ piece, open, onClose, monsters, skills }: Props) {
  const isNew = piece === null;
  const [form, setForm] = useState<ArmourPieceUpsert>(emptyForm());
  const [applyToSet, setApplyToSet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upsert = useUpsertArmourPiece();
  const applyBonus = useApplySetBonus();
  const remove = useDeleteArmourPieceById();

  const skillsById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const monsterMatch = monsters.find((m) => m.id === form.monster_id);

  useEffect(() => {
    if (!open) return;
    if (piece) {
      const { created_at: _c, updated_at: _u, ...rest } = piece;
      void _c;
      void _u;
      setForm(rest);
    } else {
      setForm(emptyForm());
    }
    setApplyToSet(false);
    setConfirmDelete(false);
    setErrorMsg(null);
  }, [open, piece]);

  if (!open) return null;

  const patch = (p: Partial<ArmourPieceUpsert>) => setForm((prev) => ({ ...prev, ...p }));

  async function handleSave() {
    if (!form.id.trim()) return setErrorMsg('ID is required.');
    if (!form.monster_id.trim()) return setErrorMsg('Monster is required.');
    try {
      setErrorMsg(null);
      await upsert.mutateAsync({ ...form, id: form.id.trim(), monster_id: form.monster_id.trim() });
      if (applyToSet && form.set_name) {
        await applyBonus.mutateAsync({
          setName: form.set_name,
          setVariant: form.set_variant,
          setBonus: form.set_bonus,
        });
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message ?? 'Failed to save armour piece.');
    }
  }

  async function handleDelete() {
    try {
      setErrorMsg(null);
      await remove.mutateAsync(form.id);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message ?? 'Failed to delete armour piece.');
    }
  }

  const rStyle = getRarityBadgeStyle(form.rarity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-mh-slate-700/80 bg-mh-slate-900/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-800">
              {form.icon_m ? (
                <img src={form.icon_m} alt="" className="h-10 w-10 object-contain" />
              ) : (
                <span className="text-xs text-mh-slate-600">No icon</span>
              )}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                {isNew ? 'Add Armour Piece' : `${form.set_name ?? 'Armour'} ${form.set_variant} — ${form.slot}`}
              </h2>
              <p className="font-mono text-xs text-mh-slate-500">{form.id ? `ID: ${form.id}` : 'Enter piece details'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-mh-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertTriangle size={15} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>ID *</label>
              <input
                type="text"
                value={form.id}
                readOnly={!isNew}
                onChange={(e) => patch({ id: e.target.value })}
                className={cn(inputCls, 'font-mono', !isNew && 'cursor-not-allowed opacity-60')}
              />
            </div>
            <div>
              <label className={labelCls}>Slot</label>
              <select value={form.slot} onChange={(e) => patch({ slot: e.target.value })} className={inputCls}>
                {ARMOUR_SLOT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Rarity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={form.rarity}
                  onChange={(e) => patch({ rarity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className={inputCls}
                />
                <span className={cn('rounded border px-2 py-1 text-xs font-bold', rStyle.bg, rStyle.text, rStyle.border)}>
                  {rStyle.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Series (set name)</label>
              <input
                type="text"
                value={form.set_name ?? ''}
                onChange={(e) => patch({ set_name: e.target.value || null })}
                placeholder="e.g. Great Jagras Set"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Set variant</label>
              <input
                type="text"
                value={form.set_variant}
                onChange={(e) => patch({ set_variant: e.target.value })}
                placeholder="I, II, IV…"
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Monster</label>
            <select
              value={monsterMatch ? form.monster_id : ''}
              onChange={(e) => e.target.value && patch({ monster_id: e.target.value })}
              className={inputCls}
            >
              <option value="">— Not linked to a monster —</option>
              {monsters.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
              ))}
            </select>
            <input
              type="text"
              value={form.monster_id}
              onChange={(e) => patch({ monster_id: e.target.value })}
              placeholder="Monster ID, or the name of the monster to link later"
              className={cn(inputCls, !monsterMatch && 'border-amber-500/40')}
            />
            {!monsterMatch && form.monster_id && (
              <p className="text-[11px] text-amber-400">No monster with this id yet — it is kept as a name to link later.</p>
            )}
          </div>

          {/* Skills */}
          <div className="space-y-2 rounded-xl border border-mh-slate-700/80 bg-mh-slate-800/30 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-mh-slate-400">Skills</label>
            <div className="flex flex-wrap gap-2">
              {form.skills.length === 0 && <span className="text-xs text-mh-slate-600">No skills</span>}
              {form.skills.map((id) => {
                const sk = skillsById.get(id);
                return (
                  <span
                    key={id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                      sk ? 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-100' : 'border-red-500/40 bg-red-500/10 text-red-300',
                    )}
                  >
                    {sk?.icon && <img src={sk.icon} alt="" className="h-4 w-4 object-contain" />}
                    {skillLabel(sk, id)}
                    <span className="font-mono text-[10px] text-mh-slate-500">{id}</span>
                    <button
                      type="button"
                      onClick={() => patch({ skills: form.skills.filter((s) => s !== id) })}
                      className="text-mh-slate-500 hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <SkillPicker
              skills={skills}
              exclude={form.skills}
              placeholder="Search a skill (pick the level you want)…"
              onPick={(id) => patch({ skills: [...form.skills, id] })}
            />
          </div>

          {/* Set bonus */}
          <div className="space-y-2 rounded-xl border border-mh-slate-700/80 bg-mh-slate-800/30 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-mh-slate-400">Set bonus</label>
            {form.set_bonus ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-mh-slate-400">
                  Pieces
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={form.set_bonus.pieces}
                    onChange={(e) =>
                      patch({ set_bonus: { ...form.set_bonus!, pieces: Math.max(1, parseInt(e.target.value, 10) || 1) } })
                    }
                    className="w-16 rounded border border-mh-slate-700 bg-mh-slate-800 px-2 py-1 text-center text-xs font-bold text-mh-slate-100 outline-none"
                  />
                </label>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-mh-gold-500/30 bg-mh-gold-500/10 px-2 py-1 text-xs text-mh-gold-300">
                  {skillLabel(skillsById.get(form.set_bonus.skill_id), form.set_bonus.skill_id)}
                  <span className="font-mono text-[10px] text-mh-slate-500">{form.set_bonus.skill_id}</span>
                </span>
                <button type="button" onClick={() => patch({ set_bonus: null })} className="text-xs text-red-400 hover:text-red-300">
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-xs text-mh-slate-600">No set bonus</p>
            )}
            <SkillPicker
              skills={skills}
              placeholder={form.set_bonus ? 'Change the granted skill…' : 'Search the skill the set bonus grants…'}
              onPick={(id) => patch({ set_bonus: { pieces: form.set_bonus?.pieces ?? 2, skill_id: id } })}
            />
            <label className="flex items-center gap-2 text-xs text-mh-slate-400">
              <input type="checkbox" checked={applyToSet} onChange={(e) => setApplyToSet(e.target.checked)} />
              Apply this set bonus to every piece of “{form.set_name ?? '…'} {form.set_variant}”
            </label>
          </div>

          {/* Deco slots */}
          <div>
            <label className={labelCls}>Deco slots (size of each slot)</label>
            <div className="flex flex-wrap items-center gap-2">
              {form.deco_slots.map((size, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={size}
                    onChange={(e) =>
                      patch({ deco_slots: form.deco_slots.map((v, j) => (j === i ? Math.max(1, parseInt(e.target.value, 10) || 1) : v)) })
                    }
                    className="w-14 rounded border border-mh-slate-700 bg-mh-slate-800 px-2 py-1 text-center text-xs font-bold text-mh-slate-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => patch({ deco_slots: form.deco_slots.filter((_, j) => j !== i) })}
                    className="text-mh-slate-500 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => patch({ deco_slots: [...form.deco_slots, 1] })}
                className="flex items-center gap-1 rounded border border-mh-slate-700 px-2 py-1 text-xs text-mh-slate-400 hover:text-mh-slate-200"
              >
                <Plus size={12} /> Slot
              </button>
            </div>
          </div>

          {/* Icons */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([['icon_m', 'Icon (male)'], ['icon_f', 'Icon (female)']] as const).map(([key, label]) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form[key] ?? ''}
                    onChange={(e) => patch({ [key]: e.target.value || null } as Partial<ArmourPieceUpsert>)}
                    placeholder="/images/armor/ArmourIcon/…"
                    className={cn(inputCls, 'font-mono text-xs')}
                  />
                  {form[key] && <img src={form[key]!} alt="" className="h-9 w-9 shrink-0 object-contain" />}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value || null })}
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-mh-slate-700/60 bg-mh-slate-800/40 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-mh-slate-200">Active in Field Guide</p>
              <p className="text-[11px] text-mh-slate-500">Inactive pieces are hidden from the public pages.</p>
            </div>
            <input type="checkbox" checked={form.is_active} onChange={(e) => patch({ is_active: e.target.checked })} />
          </div>

          {!isNew && (
            <div className="border-t border-mh-slate-800 pt-2">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
                  <Trash2 size={13} /> Delete this piece permanently
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <span className="text-xs text-red-300">Are you sure? Builds using this piece lose it.</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="rounded px-2.5 py-1 text-xs text-mh-slate-400 hover:bg-mh-slate-800">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={handleDelete}
                      className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {remove.isPending && <Loader2 size={12} className="animate-spin" />}
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-mh-slate-700/80 bg-mh-slate-900/80 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-mh-slate-200">
            Cancel
          </button>
          <button
            type="button"
            disabled={upsert.isPending || applyBonus.isPending}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50"
          >
            {(upsert.isPending || applyBonus.isPending) && <Loader2 size={14} className="animate-spin" />}
            {isNew ? 'Add Piece' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
