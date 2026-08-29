// ─────────────────────────────────────────────────────────────
// VisageEditModal — Create or edit an MHO Visage Card
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Loader2, Sparkles, Check, AlertCircle, Upload } from 'lucide-react';
import {
  type DBVisage,
  type VisageUpsert,
  type InkType,
  INK_CONFIG,
  INK_OPTIONS,
} from '../../../data/schemas/visage';
import { useUpsertVisage, useDeleteVisage } from '../../../hooks/useAdminVisages';
import { useAdminSkills } from '../../../hooks/useAdminSkills';
import { useAdminMonsters } from '../../../hooks/useAdminMonsters';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Direct Supabase Storage Image Uploader ──────────────────
function ImageUploadField({
  label,
  subLabel,
  value,
  onChange,
  aspect = 'portrait',
  slug,
  fieldKey,
}: {
  label: string;
  subLabel: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: 'portrait' | 'square';
  slug: string;
  fieldKey: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const cleanSlug = slug.trim() ? slug : 'visage';
      const path = `${cleanSlug}_${fieldKey}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('visages')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from('visages').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: unknown) {
      setUploadError((err as Error).message || 'Failed to upload image to Supabase storage.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-mh-gold-400 hover:text-mh-gold-300 underline"
        >
          {showUrlInput ? 'Hide URL field' : 'Enter URL manually'}
        </button>
      </div>
      <p className="text-[11px] text-mh-slate-500">{subLabel}</p>

      {uploadError && (
        <p className="text-[11px] text-red-400 font-medium">{uploadError}</p>
      )}

      {/* Upload Dropzone / Preview Container */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all p-3',
          value
            ? 'border-mh-slate-700 bg-mh-slate-850'
            : 'border-mh-slate-700 hover:border-mh-gold-500/50 bg-mh-slate-800/40 hover:bg-mh-slate-800/80',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {value ? (
          <div className="flex w-full items-center gap-3">
            <div
              className={cn(
                'relative shrink-0 overflow-hidden rounded-lg border border-mh-slate-700 bg-mh-slate-900 p-1 flex items-center justify-center',
                aspect === 'portrait' ? 'h-24 w-16' : 'h-16 w-16',
              )}
            >
              <img
                src={value}
                alt={label}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold text-mh-slate-200 truncate">
                {value.split('/').pop()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded bg-mh-slate-700 px-2 py-1 text-[11px] font-semibold text-mh-slate-200 hover:bg-mh-slate-600 transition-colors"
                >
                  <Upload size={12} />
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="rounded p-1 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  title="Remove image"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-3">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 size={24} className="animate-spin text-mh-gold-400" />
                <span className="text-xs font-semibold text-mh-slate-300">Uploading to Supabase…</span>
              </div>
            ) : (
              <>
                <Upload size={22} className="text-mh-slate-500 mb-1.5" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3 py-1 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 transition-all shadow-sm mb-1"
                >
                  Upload File to Supabase
                </button>
                <p className="text-[10px] text-mh-slate-500">or drag and drop here (PNG, JPG, WebP)</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Manual URL Input */}
      {showUrlInput && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="https://... or /images/..."
          className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
        />
      )}
    </div>
  );
}

function emptyForm(): VisageUpsert {
  return {
    id: '',
    name: '',
    name_ja: null,
    monster_id: null,
    monster_type: 'small',
    points: 1,
    rarity: 1,
    ink_types: ['thunder'],
    image_large: null,
    image_small: null,
    set_bonus_id: null,
    is_active: true,
    description: null,
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

  const { data: setBonuses = [] } = useAdminSkills({ isSetBonus: true, isActive: true });
  const { data: monsters = [] } = useAdminMonsters({ game: 'mho', isActive: true });

  const upsert = useUpsertVisage();
  const remove = useDeleteVisage();

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
          rarity: visage.rarity ?? 1,
          ink_types: visage.ink_types && visage.ink_types.length > 0 ? visage.ink_types : ['thunder'],
          image_large: visage.image_large ?? null,
          image_small: visage.image_small ?? null,
          set_bonus_id: visage.set_bonus_id ?? null,
          is_active: visage.is_active,
          description: visage.description ?? null,
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
    setForm((prev) => ({
      ...prev,
      name,
      id: !idTouched && isNew ? toSlug(name) : prev.id,
    }));
  }

  function toggleInk(ink: InkType) {
    setForm((prev) => {
      const exists = prev.ink_types.includes(ink);
      if (exists) {
        // Must have at least 1 ink
        if (prev.ink_types.length <= 1) return prev;
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

  const selectedSet = setBonuses.find((s) => s.id === form.set_bonus_id);

  async function handleSave() {
    if (!form.name.trim()) {
      setErrorMsg('Visage name is required.');
      return;
    }
    if (!form.id.trim()) {
      setErrorMsg('Visage ID is required.');
      return;
    }
    if (form.ink_types.length === 0) {
      setErrorMsg('Visage must have at least 1 possible ink type.');
      return;
    }

    try {
      setErrorMsg(null);
      await upsert.mutateAsync(form);
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

          {/* ── Ink Types Pool Selector ── */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-mh-slate-200">
                  Possible Ink Types ({form.ink_types.length}/3 selected)
                </p>
                <p className="text-[11px] text-mh-slate-500">
                  When obtained in MHO, this card rolls randomly as one of these 1 to 3 ink types.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INK_OPTIONS.map((ink) => {
                const cfg = INK_CONFIG[ink];
                const isSelected = form.ink_types.includes(ink);
                return (
                  <button
                    key={ink}
                    type="button"
                    onClick={() => toggleInk(ink)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                      isSelected
                        ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-1 ring-current/40`
                        : 'border-mh-slate-750 bg-mh-slate-800/60 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', cfg.dotColor)} />
                      <span>{cfg.name}</span>
                    </div>
                    {isSelected && <Check size={13} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Linked Set Bonus ── */}
          <div className="rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/5 p-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-gold-300">
              Linked Set Bonus (from Skills & Sets)
            </label>
            <select
              value={form.set_bonus_id ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, set_bonus_id: e.target.value || null }))}
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-900 px-3 py-2 text-sm text-mh-slate-100 outline-none focus:border-mh-gold-500/50"
            >
              <option value="">(None / No Set Bonus)</option>
              {setBonuses.map((sb) => (
                <option key={sb.id} value={sb.id}>
                  {sb.name} — {sb.set_thresholds?.map((t) => `${t.pieces} pcs`).join(', ') || 'Set Bonus'}
                </option>
              ))}
            </select>

            {/* Set Bonus Live Preview */}
            {selectedSet && (
              <div className="pt-2 border-t border-mh-gold-500/20 space-y-1.5">
                <p className="text-[11px] font-bold text-mh-slate-300 uppercase tracking-wider">
                  Active Set Effects:
                </p>
                <div className="space-y-1">
                  {(selectedSet.set_thresholds || []).map((tier, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded bg-mh-slate-900/90 px-2.5 py-1.5 text-xs border border-mh-slate-750"
                    >
                      <span className="rounded bg-mh-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-mh-gold-400 shrink-0">
                        {tier.pieces} Pieces
                      </span>
                      <span className="text-mh-slate-200">
                        {tier.description || (tier.granted_skill_id ? `Grants +${tier.granted_skill_level || 1} ${tier.granted_skill_id}` : `Tier ${idx + 1}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Image Uploaders */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageUploadField
              label="Large Card Art"
              subLabel="Detailed full card artwork"
              value={form.image_large}
              onChange={(url) => setForm((p) => ({ ...p, image_large: url }))}
              aspect="portrait"
              slug={form.id}
              fieldKey="large"
            />

            <ImageUploadField
              label="Small Collection Icon"
              subLabel="Compact icon for sets/collection view"
              value={form.image_small}
              onChange={(url) => setForm((p) => ({ ...p, image_small: url }))}
              aspect="square"
              slug={form.id}
              fieldKey="icon"
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
