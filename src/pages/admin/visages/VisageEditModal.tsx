// ─────────────────────────────────────────────────────────────
// VisageEditModal — Create or edit an MHO Visage Card
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import {
  type DBVisage,
  type VisageUpsert,
  type InkType,
  getInkConfig,
  CUSTOM_SET_INKS,
  VISAGE_MAX_LEVEL_LABELS,
} from '../../../data/schemas/visage';
import { useUpsertVisage, useDeleteVisage, useAdminVisages } from '../../../hooks/useAdminVisages';
import { useAdminSkills, type DBSkill } from '../../../hooks/useAdminSkills';
import { useAdminMonsters } from '../../../hooks/useAdminMonsters';
import { cn } from '../../../lib/utils';

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function emptyForm(): VisageUpsert {
  return {
    id: '',
    name: '',
    name_ja: null,
    monster_id: null,
    monster_type: 'small',
    points: 1,
    max_levels: [1, 2, 3, 4, 4],
    ink_types: [],
    core_effect: null,
    is_active: true,
    notes: null,
    sort_order: 0,
  };
}

interface Props {
  visage: DBVisage | null;
  open: boolean;
  onClose: () => void;
}

export default function VisageEditModal({ visage, open, onClose }: Props) {
  const isNew = visage === null;
  const [form, setForm] = useState<VisageUpsert>(emptyForm());
  const [idTouched, setIdTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Query strictly sets from the database that start with "Ink of"
  const { data: setBonuses = [] } = useAdminSkills({
    isSetBonus: true,
    search: 'Ink of',
    isActive: true,
  });
  const { data: monsters = [] } = useAdminMonsters({ game: 'mho', isActive: true });
  const { data: allVisages = [] } = useAdminVisages();

  const upsert = useUpsertVisage();
  const remove = useDeleteVisage();

  // Check if current ID already exists in DB when adding a new card
  const existingCardMatch = useMemo(() => {
    if (!isNew || !form.id) return null;
    return allVisages.find((v: DBVisage) => v.id === form.id || v.id === toSlug(form.name));
  }, [isNew, form.id, form.name, allVisages]);

  // Only sets that start with "Ink of" (from database) + any currently selected inks
  const availableInks = useMemo<InkType[]>(() => {
    const set = new Set<InkType>();

    // Add only skills starting with "Ink of" from the database query
    setBonuses.forEach((sb: DBSkill) => {
      if (
        sb.name.toLowerCase().startsWith('ink of') ||
        sb.id.toLowerCase().startsWith('ink_of_')
      ) {
        const slug = sb.id.replace(/^ink_of_/, '').toLowerCase() as InkType;
        set.add(slug);
      }
    });

    CUSTOM_SET_INKS.forEach((i) => set.add(i));

    // Also preserve any existing inks currently selected on the card
    (form.ink_types || []).forEach((i) => {
      if (typeof i === 'string') {
        const clean = i.replace(/^ink_of_/, '').toLowerCase() as InkType;
        set.add(clean);
      }
    });

    return Array.from(set).sort((a, b) => {
      const nameA = getInkConfig(a).name;
      const nameB = getInkConfig(b).name;
      return nameA.localeCompare(nameB);
    });
  }, [setBonuses, form.ink_types]);

  useEffect(() => {
    if (open) {
      if (visage) {
        setForm({
          id: visage.id,
          name: visage.name,
          name_ja: visage.name_ja ?? null,
          monster_id: visage.monster_id ?? null,
          monster_type: visage.monster_type ?? 'small',
          points: visage.points ?? 1,
          max_levels: visage.max_levels?.length ? visage.max_levels : [1, 2, 3, 4, 4],
          ink_types: visage.ink_types ?? [],
          core_effect: visage.core_effect ?? null,
          is_active: visage.is_active,
          notes: visage.notes ?? null,
          sort_order: visage.sort_order ?? 0,
        });
        setIdTouched(true);
      } else {
        setForm(emptyForm());
        setIdTouched(false);
      }
      setConfirmDelete(false);
      setErrorMsg(null);
    }
  }, [open, visage]);

  if (!open) return null;

  function handleNameChange(name: string) {
    const targetSlug = !idTouched && isNew ? toSlug(name) : form.id;
    const match = isNew ? allVisages.find((v: DBVisage) => v.id === targetSlug) : null;

    setForm((prev) => ({
      ...prev,
      name,
      id: targetSlug,
      monster_id: match ? (match.monster_id ?? prev.monster_id) : prev.monster_id,
      monster_type: match ? (match.monster_type ?? prev.monster_type) : prev.monster_type,
      points: match ? (match.points ?? prev.points) : prev.points,
      core_effect: match ? (match.core_effect ?? prev.core_effect) : prev.core_effect,
      ink_types: match && match.ink_types && match.ink_types.length > 0
        ? Array.from(new Set([...match.ink_types, ...prev.ink_types]))
        : prev.ink_types,
    }));
  }

  function toggleInk(ink: InkType) {
    setForm((prev) => {
      const exists = prev.ink_types.includes(ink);
      if (exists) {
        return {
          ...prev,
          ink_types: prev.ink_types.filter((i) => i !== ink),
        };
      } else {
        // Max 3 inks
        if (prev.ink_types.length >= 3) return prev;
        return {
          ...prev,
          ink_types: [...prev.ink_types, ink],
        };
      }
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setErrorMsg('Visage name is required.');
      return;
    }
    if (!form.id.trim()) {
      setErrorMsg('Visage ID is required.');
      return;
    }

    try {
      setErrorMsg(null);
      // When adding a new card, mergeInks: true ensures any existing ink in DB is strictly retained
      await upsert.mutateAsync({
        ...form,
        mergeInks: isNew,
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to save Visage.');
    }
  }

  async function handleDelete() {
    if (!visage) return;
    try {
      setErrorMsg(null);
      await remove.mutateAsync(visage.id);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to delete Visage.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                {isNew ? 'Add Visage Card' : `Edit "${form.name}"`}
              </h2>
              <p className="text-xs text-mh-slate-400">
                Monster Hunter Outlanders (MHO) Visage Card
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Name & Slug ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-mh-slate-300 mb-1.5">
                Visage Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Mernos"
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mh-slate-300 mb-1.5">
                Visage ID / Slug <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.id}
                readOnly={!isNew}
                onChange={(e) => {
                  setIdTouched(true);
                  setForm((p) => ({ ...p, id: toSlug(e.target.value) }));
                }}
                placeholder="e.g. mernos"
                className={cn(
                  'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm font-mono text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50',
                  !isNew && 'opacity-60 cursor-not-allowed bg-mh-slate-800/50',
                )}
              />
            </div>
          </div>

          {/* Row 2: Japanese Name & Monster Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
                Japanese Name (optional)
              </label>
              <input
                type="text"
                value={form.name_ja ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, name_ja: e.target.value || null }))}
                placeholder="e.g. メルノス"
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
                Monster Classification
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, monster_type: 'small' }))}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-bold transition-all',
                    form.monster_type === 'small'
                      ? 'border-mh-gold-500 bg-mh-gold-500/10 text-mh-gold-300'
                      : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-400 hover:text-white',
                  )}
                >
                  Small Monster
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, monster_type: 'large' }))}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-bold transition-all',
                    form.monster_type === 'large'
                      ? 'border-mh-gold-500 bg-mh-gold-500/10 text-mh-gold-300'
                      : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-400 hover:text-white',
                  )}
                >
                  Large Monster
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Points & Optional Linked Monster */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-mh-slate-300 mb-1.5">
                Points
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={form.points}
                onChange={(e) =>
                  setForm((p) => ({ ...p, points: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                }
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm font-bold text-mh-gold-400 outline-none focus:border-mh-gold-500/50"
              />
              <p className="text-[11px] text-mh-slate-500 mt-1">
                Points allocated or required for this visage card.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
                Linked Monster (optional)
              </label>
              <select
                value={form.monster_id ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, monster_id: e.target.value || null }))}
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 outline-none focus:border-mh-gold-500/50"
              >
                <option value="">(None / Standalone Monster)</option>
                {monsters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.tier.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Max level per card rarity */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 space-y-2">
            <p className="text-xs font-bold text-mh-slate-200">Max Level by Rarity</p>
            <div className="grid grid-cols-5 gap-2">
              {VISAGE_MAX_LEVEL_LABELS.map((label, i) => (
                <div key={label}>
                  <label className="block text-[10px] font-medium text-mh-slate-400 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={form.max_levels[i] ?? 0}
                    onChange={(e) =>
                      setForm((p) => {
                        const next = VISAGE_MAX_LEVEL_LABELS.map((_, k) => p.max_levels[k] ?? 0);
                        next[i] = Math.max(0, parseInt(e.target.value, 10) || 0);
                        return { ...p, max_levels: next };
                      })
                    }
                    className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-2 py-1.5 text-sm font-bold text-mh-gold-400 outline-none focus:border-mh-gold-500/50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Ink Types Pool Selector ── */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-mh-slate-200">
                  Ink Types ({form.ink_types.length}/3 selected)
                </p>
                <p className="text-[11px] text-mh-slate-500">
                  Ink set(s) this card belongs to. Leave empty for cards without a set.
                </p>
              </div>
            </div>

            {existingCardMatch && existingCardMatch.ink_types.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-mh-gold-500/30 bg-mh-gold-500/10 p-2 text-xs text-mh-gold-300">
                <Sparkles size={14} className="shrink-0 text-mh-gold-400" />
                <span>
                  Existing card in DB found with Inks: <strong>{existingCardMatch.ink_types.map((i: InkType) => getInkConfig(i).name).join(', ')}</strong>. Any additional selected Inks will be added without removing existing ones.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableInks.map((ink) => {
                const cfg = getInkConfig(ink);
                const isSelected = form.ink_types.includes(ink);
                return (
                  <button
                    key={ink}
                    type="button"
                    onClick={() => toggleInk(ink)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                      isSelected
                        ? `${cfg?.bg ?? 'bg-mh-gold-500/15'} ${cfg?.text ?? 'text-mh-gold-300'} ${cfg?.border ?? 'border-mh-gold-500/30'} ring-1 ring-current/40`
                        : 'border-mh-slate-750 bg-mh-slate-800/60 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', cfg?.dotColor ?? 'bg-mh-gold-400')} />
                      <span>{cfg?.name || ink}</span>
                    </div>
                    {isSelected && <Check size={13} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Core Effect ── */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Core Effect
            </label>
            <p className="text-[11px] text-mh-slate-500">
              Inherent passive effect of this Visage card.
            </p>
            <textarea
              rows={2}
              value={form.core_effect ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, core_effect: e.target.value || null }))}
              placeholder="e.g. When health is above 70%, increases attack by 10%"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          {/* Row 5: Notes & Active Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-mh-slate-750 bg-mh-slate-800/40 p-4">
            <div>
              <p className="text-xs font-bold text-mh-slate-200">Active in Field Guide</p>
              <p className="text-[11px] text-mh-slate-500">
                Inactive cards are hidden from public field guide views.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
                form.is_active ? 'bg-green-500' : 'bg-mh-slate-700',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                  form.is_active ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <div>
            {!isNew && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={remove.isPending}
                    className="rounded bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-mh-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 size={13} />
                  Delete Card
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={upsert.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-sm"
            >
              {upsert.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {isNew ? 'Create Visage' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
