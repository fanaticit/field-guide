// ─────────────────────────────────────────────────────────────
// WeaponEditModal — create / edit one weapon
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { X, Loader2, Trash2, AlertTriangle, Plus } from 'lucide-react';
import {
  useDeleteWeapon,
  useUpsertWeapon,
  useWeaponUpgrades,
} from '../../../hooks/useAdminWeapons';
import type { DBMonster } from '../../../hooks/useAdminMonsters';
import {
  WEAPON_ELEMENT_CONFIG,
  WEAPON_SHARPNESS_ICONS,
  WEAPON_SOURCE_CONFIG,
  getRarityBadgeStyle,
  type DBWeapon,
  type DBWeaponType,
  type WeaponElementType,
  type WeaponSourceType,
  type WeaponStatus,
  type WeaponUpsert,
} from '../../../data/schemas/weapon';
import { cn } from '../../../lib/utils';

const inputCls =
  'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50';
const labelCls = 'block text-xs font-medium text-mh-slate-400 mb-1.5';

const SHARPNESS_OPTIONS = ['Yellow', 'Green', 'Blue', 'White'];

function emptyForm(): WeaponUpsert {
  return {
    id: '',
    name: '',
    name_ja: null,
    weapon_type_id: 'great_sword',
    monster_id: null,
    series: null,
    source_type: 'forge',
    source_detail: null,
    element_type: 'raw',
    element_damage: null,
    attack: null,
    affinity: 0,
    sharpness: null,
    deco_slots: [1, 1],
    rarity: 1,
    max_rarity: 14,
    craftable: true,
    is_apex: false,
    apex_season: null,
    apex_effect: null,
    awakening_slots: null,
    image: null,
    description: null,
    notes: null,
    status: 'in_game',
    status_reason: null,
    is_active: true,
    is_spoiler: false,
    sort_order: 0,
  };
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-green-500' : 'bg-mh-slate-700',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

interface Props {
  weapon: DBWeapon | null;
  open: boolean;
  onClose: () => void;
  monsters: DBMonster[];
  weaponTypes: DBWeaponType[];
}

export default function WeaponEditModal({ weapon, open, onClose, monsters, weaponTypes }: Props) {
  const isNew = weapon === null;
  const [form, setForm] = useState<WeaponUpsert>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upsert = useUpsertWeapon();
  const remove = useDeleteWeapon();
  const { data: upgrades = [] } = useWeaponUpgrades(open && weapon ? weapon.id : null);

  useEffect(() => {
    if (!open) return;
    if (weapon) {
      const { created_at: _c, updated_at: _u, ...rest } = weapon;
      void _c;
      void _u;
      setForm(rest);
    } else {
      setForm(emptyForm());
    }
    setConfirmDelete(false);
    setErrorMsg(null);
  }, [open, weapon]);

  if (!open) return null;

  const patch = (p: Partial<WeaponUpsert>) => setForm((prev) => ({ ...prev, ...p }));
  const numberOrNull = (v: string) => (v === '' ? null : Number(v));
  const rStyle = getRarityBadgeStyle(form.rarity);

  async function handleSave() {
    if (!form.id.trim()) return setErrorMsg('ID is required.');
    if (!form.name.trim()) return setErrorMsg('Name is required.');
    if (form.max_rarity < form.rarity) return setErrorMsg('Max rarity cannot be lower than the starting rarity.');
    if (form.status === 'not_in_game' && !form.status_reason?.trim()) {
      return setErrorMsg('Give a reason why the weapon is not in the game.');
    }
    try {
      setErrorMsg(null);
      await upsert.mutateAsync({ ...form, id: form.id.trim(), name: form.name.trim() });
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message ?? 'Failed to save weapon.');
    }
  }

  async function handleDelete() {
    try {
      setErrorMsg(null);
      await remove.mutateAsync(form.id);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string })?.message ?? 'Failed to delete weapon.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-mh-slate-700/80 bg-mh-slate-900/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-800">
              {form.image ? (
                <img src={form.image} alt="" className="h-10 w-10 object-contain" />
              ) : (
                <span className="text-xs text-mh-slate-600">No icon</span>
              )}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                {isNew ? 'Add Weapon' : form.name}
              </h2>
              <p className="font-mono text-xs text-mh-slate-500">{form.id ? `ID: ${form.id}` : 'Enter weapon details'}</p>
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

          {/* Visibility */}
          <div className="space-y-2 rounded-xl border border-mh-slate-700/80 bg-mh-slate-800/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-mh-slate-200">Active in Field Guide</p>
                <p className="text-[11px] text-mh-slate-500">Inactive weapons are hidden from every public page.</p>
              </div>
              <Toggle checked={form.is_active} onChange={(v) => patch({ is_active: v })} />
            </div>
            <div className="flex items-center justify-between border-t border-mh-slate-800 pt-2">
              <div>
                <p className="text-xs font-semibold text-mh-slate-200">Mark as spoiler</p>
                <p className="text-[11px] text-mh-slate-500">Only shown to hunters who turned on “Show spoilers” in their profile.</p>
              </div>
              <Toggle checked={form.is_spoiler} onChange={(v) => patch({ is_spoiler: v })} />
            </div>
            <div className="grid grid-cols-1 gap-3 border-t border-mh-slate-800 pt-2 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Game status</label>
                <select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as WeaponStatus })}
                  className={inputCls}
                >
                  <option value="in_game">In game</option>
                  <option value="not_in_game">Not in game</option>
                </select>
              </div>
              {form.status === 'not_in_game' && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Reason *</label>
                  <input
                    type="text"
                    value={form.status_reason ?? ''}
                    onChange={(e) => patch({ status_reason: e.target.value || null })}
                    placeholder="e.g. Upcoming – season opens 2026-12-25"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>

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
            <div className="sm:col-span-2">
              <label className={labelCls}>Name *</label>
              <input type="text" value={form.name} onChange={(e) => patch({ name: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Weapon type</label>
              <select value={form.weapon_type_id} onChange={(e) => patch({ weapon_type_id: e.target.value })} className={inputCls}>
                {weaponTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monster</label>
              <select value={form.monster_id ?? ''} onChange={(e) => patch({ monster_id: e.target.value || null })} className={inputCls}>
                <option value="">— None —</option>
                {monsters.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Series</label>
              <input type="text" value={form.series ?? ''} onChange={(e) => patch({ series: e.target.value || null })} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Start rarity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={form.rarity}
                  onChange={(e) => patch({ rarity: Math.max(1, Number(e.target.value) || 1) })}
                  className={inputCls}
                />
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', rStyle.bg, rStyle.text, rStyle.border)}>{rStyle.label}</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Max rarity</label>
              <input
                type="number"
                min={1}
                max={16}
                value={form.max_rarity}
                onChange={(e) => patch({ max_rarity: Math.max(1, Number(e.target.value) || 1) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Attack</label>
              <input type="number" value={form.attack ?? ''} onChange={(e) => patch({ attack: numberOrNull(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Affinity</label>
              <input type="number" value={form.affinity ?? ''} onChange={(e) => patch({ affinity: numberOrNull(e.target.value) })} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Element / status</label>
              <select value={form.element_type} onChange={(e) => patch({ element_type: e.target.value as WeaponElementType })} className={inputCls}>
                {(Object.keys(WEAPON_ELEMENT_CONFIG) as WeaponElementType[]).map((el) => (
                  <option key={el} value={el}>{WEAPON_ELEMENT_CONFIG[el].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Element damage</label>
              <input
                type="number"
                disabled={form.element_type === 'raw'}
                value={form.element_damage ?? ''}
                onChange={(e) => patch({ element_damage: numberOrNull(e.target.value) })}
                className={cn(inputCls, form.element_type === 'raw' && 'opacity-40')}
              />
            </div>
            <div>
              <label className={labelCls}>Sharpness</label>
              <div className="flex items-center gap-2">
                <select value={form.sharpness ?? ''} onChange={(e) => patch({ sharpness: e.target.value || null })} className={inputCls}>
                  <option value="">—</option>
                  {SHARPNESS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {form.sharpness && WEAPON_SHARPNESS_ICONS[form.sharpness] && (
                  <img src={WEAPON_SHARPNESS_ICONS[form.sharpness]} alt="" className="h-5 w-auto" />
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <select value={form.source_type} onChange={(e) => patch({ source_type: e.target.value as WeaponSourceType })} className={inputCls}>
                {(Object.keys(WEAPON_SOURCE_CONFIG) as WeaponSourceType[]).map((s) => (
                  <option key={s} value={s}>{WEAPON_SOURCE_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>How to obtain</label>
            <input type="text" value={form.source_detail ?? ''} onChange={(e) => patch({ source_detail: e.target.value || null })} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Deco slots (size of each slot)</label>
            <div className="flex flex-wrap items-center gap-2">
              {form.deco_slots.map((size, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={size}
                    onChange={(e) => patch({ deco_slots: form.deco_slots.map((v, j) => (j === i ? Math.max(1, Number(e.target.value) || 1) : v)) })}
                    className="w-14 rounded border border-mh-slate-700 bg-mh-slate-800 px-2 py-1 text-center text-xs font-bold text-mh-slate-100 outline-none"
                  />
                  <button type="button" onClick={() => patch({ deco_slots: form.deco_slots.filter((_, j) => j !== i) })} className="text-mh-slate-500 hover:text-red-400">
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

          <div>
            <label className={labelCls}>Icon</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.image ?? ''}
                onChange={(e) => patch({ image: e.target.value || null })}
                placeholder="/images/weapons/WeaponIcon/…"
                className={cn(inputCls, 'font-mono text-xs')}
              />
              {form.image && <img src={form.image} alt="" className="h-9 w-9 shrink-0 object-contain" />}
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={2} value={form.description ?? ''} onChange={(e) => patch({ description: e.target.value || null })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} value={form.notes ?? ''} onChange={(e) => patch({ notes: e.target.value || null })} className={inputCls} />
          </div>

          {form.apex_effect && (
            <div className="rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/5 p-4 text-xs">
              <p className="font-bold text-mh-gold-300">{form.apex_effect.name}</p>
              <p className="mt-1 text-mh-slate-300">{form.apex_effect.description}</p>
              {form.apex_season && <p className="mt-1 text-[11px] text-mh-slate-500">{form.apex_season}</p>}
            </div>
          )}

          {upgrades.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-mh-slate-400">Upgrade path (read-only, from the game data)</label>
              <div className="overflow-x-auto rounded-lg border border-mh-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-mh-slate-800/60 text-[10px] uppercase tracking-wider text-mh-slate-500">
                    <tr>
                      <th className="px-2 py-1">Rarity</th>
                      <th className="px-2 py-1">Attack</th>
                      <th className="px-2 py-1">Element</th>
                      <th className="px-2 py-1">Affinity</th>
                      <th className="px-2 py-1">Lv</th>
                      <th className="px-2 py-1">Materials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mh-slate-800 text-mh-slate-300">
                    {upgrades.map((u) => (
                      <tr key={u.rarity}>
                        <td className="px-2 py-1 font-bold">R{u.rarity}</td>
                        <td className="px-2 py-1">{u.attack ?? '—'}</td>
                        <td className="px-2 py-1">{u.element_damage ? `${u.element_type} ${u.element_damage}` : '—'}</td>
                        <td className="px-2 py-1">{u.affinity ?? '—'}</td>
                        <td className="px-2 py-1">{u.required_level ?? '—'}</td>
                        <td className="px-2 py-1">{u.materials.map((m) => `${m.item} ×${m.count}`).join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isNew && (
            <div className="border-t border-mh-slate-800 pt-2">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
                  <Trash2 size={13} /> Delete this weapon permanently
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <span className="text-xs text-red-300">Are you sure? Hunter challenges and collections for it are removed too.</span>
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
            disabled={upsert.isPending}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50"
          >
            {upsert.isPending && <Loader2 size={14} className="animate-spin" />}
            {isNew ? 'Add Weapon' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
