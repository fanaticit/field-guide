// ─────────────────────────────────────────────────────────────
// BuddyEditModal — Create or edit an MHO Companion Buddy
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Upload,
  Swords,
  Zap,
  Heart,
  Sparkles,
} from 'lucide-react';
import {
  type DBBuddy,
  type BuddyUpsert,
  TIER_CONFIG,
  ROLE_CONFIG,
  BUDDY_TIERS,
  BUDDY_ROLES,
} from '../../../data/schemas/buddy';
import { useUpsertBuddy, useDeleteBuddy } from '../../../hooks/useAdminBuddies';
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
  slug,
}: {
  label: string;
  subLabel: string;
  value: string | null;
  onChange: (url: string | null) => void;
  slug: string;
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
      const cleanSlug = slug.trim() ? slug : 'buddy';
      const path = `${cleanSlug}_portrait_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('buddies')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from('buddies').getPublicUrl(path);
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
          <div className="flex w-full items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center shadow-md bg-mh-slate-900">
              <img
                src={value}
                alt={label}
                className="h-full w-full object-cover rounded-2xl"
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
                  className="flex items-center gap-1 rounded bg-mh-slate-700 px-2.5 py-1 text-[11px] font-semibold text-mh-slate-200 hover:bg-mh-slate-600 transition-colors"
                >
                  <Upload size={12} />
                  Change Portrait
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
                  Upload Buddy Image
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

function emptyForm(): BuddyUpsert {
  return {
    id: '',
    name: '',
    name_ja: null,
    tier: 'SSR',
    role: 'Assault',
    core_passive: null,
    image: null,
    is_active: true,
    notes: null,
    sort_order: 0,
  };
}

const ROLE_ICONS = {
  Assault: Swords,
  Disruptor: Zap,
  Support: Heart,
};

interface Props {
  buddy: DBBuddy | null;
  open: boolean;
  onClose: () => void;
}

export default function BuddyEditModal({ buddy, open, onClose }: Props) {
  const isNew = buddy === null;
  const [form, setForm] = useState<BuddyUpsert>(emptyForm());
  const [idTouched, setIdTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upsert = useUpsertBuddy();
  const remove = useDeleteBuddy();

  useEffect(() => {
    if (open) {
      if (buddy) {
        setForm({
          id: buddy.id,
          name: buddy.name,
          name_ja: buddy.name_ja ?? null,
          tier: buddy.tier ?? 'SSR',
          role: buddy.role ?? 'Assault',
          core_passive: buddy.core_passive ?? null,
          image: buddy.image ?? null,
          is_active: buddy.is_active,
          notes: buddy.notes ?? null,
          sort_order: buddy.sort_order ?? 0,
        });
        setIdTouched(true);
      } else {
        setForm(emptyForm());
        setIdTouched(false);
      }
      setConfirmDelete(false);
      setErrorMsg(null);
    }
  }, [open, buddy]);

  if (!open) return null;

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      id: !idTouched && isNew ? toSlug(name) : prev.id,
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setErrorMsg('Buddy name is required.');
      return;
    }
    if (!form.id.trim()) {
      setErrorMsg('Buddy ID is required.');
      return;
    }

    try {
      setErrorMsg(null);
      await upsert.mutateAsync(form);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to save Buddy.');
    }
  }

  async function handleDelete() {
    if (!buddy) return;
    try {
      setErrorMsg(null);
      await remove.mutateAsync(buddy.id);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to delete Buddy.');
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
                {isNew ? 'Add Companion Buddy' : `Edit "${form.name}"`}
              </h2>
              <p className="text-xs text-mh-slate-400">
                Monster Hunter Outlanders (MHO) Buddy
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
                Buddy Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Palico Hero"
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mh-slate-300 mb-1.5">
                Buddy ID / Slug <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.id}
                readOnly={!isNew}
                onChange={(e) => {
                  setIdTouched(true);
                  setForm((p) => ({ ...p, id: toSlug(e.target.value) }));
                }}
                placeholder="e.g. palico_hero"
                className={cn(
                  'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm font-mono text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50',
                  !isNew && 'opacity-60 cursor-not-allowed bg-mh-slate-800/50',
                )}
              />
            </div>
          </div>

          {/* Row 2: Japanese Name */}
          <div>
            <label className="block text-xs font-medium text-mh-slate-400 mb-1.5">
              Japanese Name (optional)
            </label>
            <input
              type="text"
              value={form.name_ja ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, name_ja: e.target.value || null }))}
              placeholder="e.g. オトモアイルー"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-sm text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          {/* Row 3: Tier & Role Selectors */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tier */}
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Buddy Tier / Rarity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BUDDY_TIERS.map((t) => {
                  const cfg = TIER_CONFIG[t];
                  const isSelected = form.tier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, tier: t }))}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-bold transition-all',
                        isSelected
                          ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-1 ring-current/40`
                          : 'border-mh-slate-750 bg-mh-slate-800 text-mh-slate-400 hover:text-white',
                      )}
                    >
                      <span>{t}</span>
                      {isSelected && <Check size={12} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role */}
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Combat Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BUDDY_ROLES.map((r) => {
                  const cfg = ROLE_CONFIG[r];
                  const Icon = ROLE_ICONS[r];
                  const isSelected = form.role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, role: r }))}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-xs font-bold transition-all',
                        isSelected
                          ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-1 ring-current/40`
                          : 'border-mh-slate-750 bg-mh-slate-800 text-mh-slate-400 hover:text-white',
                      )}
                    >
                      <Icon size={14} />
                      <span className="text-[11px]">{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 4: Core Passive Textarea */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Core Passive Ability
            </label>
            <p className="text-[11px] text-mh-slate-500">
              The unique passive effect or support ability provided by this Buddy.
            </p>
            <textarea
              rows={3}
              value={form.core_passive ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, core_passive: e.target.value || null }))}
              placeholder="e.g. When hunter's health is below 40%, automatically restores 25% HP and grants a defense boost for 15s."
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50 leading-relaxed"
            />
          </div>

          {/* Row 5: Image Uploader */}
          <ImageUploadField
            label="Buddy Portrait / Artwork"
            subLabel="Clean portrait image with softened borders"
            value={form.image}
            onChange={(url) => setForm((p) => ({ ...p, image: url }))}
            slug={form.id}
          />

          {/* Row 6: Active Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-mh-slate-750 bg-mh-slate-800/40 p-4">
            <div>
              <p className="text-xs font-bold text-mh-slate-200">Active in Field Guide</p>
              <p className="text-[11px] text-mh-slate-500">
                Inactive buddies are hidden from public views.
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
                  Delete Buddy
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
              {isNew ? 'Create Buddy' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
