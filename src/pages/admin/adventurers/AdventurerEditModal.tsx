// ─────────────────────────────────────────────────────────────
// AdventurerEditModal — Create or edit an MHO Playable Adventurer
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Upload,
  User,
  Sparkles,
} from 'lucide-react';
import {
  type DBAdventurer,
  type AdventurerUpsert,
  type AdventurerRole,
  ADVENTURER_ROLE_CONFIG,
  ADVENTURER_ROLES,
  ELEMENT_OPTIONS,
} from '../../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../../data/core/weapon-types';
import { useUpsertAdventurer, useDeleteAdventurer } from '../../../hooks/useAdminAdventurers';
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
      const cleanSlug = slug.trim() ? slug : 'adventurer';
      const path = `${cleanSlug}_portrait_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('adventurers')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from('adventurers').getPublicUrl(path);
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
      <p className="text-xs text-mh-slate-500">{subLabel}</p>

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {showUrlInput ? (
        <div className="space-y-2">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value.trim() || null)}
            placeholder="https://... or /adventurers/name.png"
            className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
          />
          {value && (
            <div className="flex items-center gap-3 rounded-lg border border-mh-slate-750 bg-mh-slate-900/60 p-2">
              <img
                src={value}
                alt="Preview"
                className="h-12 w-12 rounded-lg object-contain bg-mh-slate-800 border border-mh-slate-700"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-mh-slate-300 truncate">{value}</p>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="mt-0.5 text-[11px] text-red-400 hover:text-red-300"
                >
                  Remove image
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all duration-150',
            value
              ? 'border-mh-gold-500/40 bg-mh-gold-500/5 hover:border-mh-gold-500/60'
              : 'border-mh-slate-700 bg-mh-slate-900/40 hover:border-mh-slate-600 hover:bg-mh-slate-900/60',
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

          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 size={24} className="animate-spin text-mh-gold-400" />
              <p className="text-xs text-mh-slate-400">Uploading to Supabase Storage...</p>
            </div>
          ) : value ? (
            <div className="flex w-full items-center gap-4">
              <img
                src={value}
                alt="Uploaded portrait"
                className="h-16 w-16 shrink-0 rounded-xl object-contain bg-mh-slate-800 border border-mh-gold-500/30 p-1 shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-mh-gold-300">
                  <Check size={14} className="text-mh-gold-400" />
                  <span>Portrait Attached</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-mh-slate-400">{value}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[11px] text-mh-slate-400 group-hover:text-mh-gold-400 transition-colors">
                    Click or drop new file to replace
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(null);
                    }}
                    className="text-[11px] font-medium text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mh-slate-800 text-mh-slate-400 group-hover:bg-mh-gold-500/10 group-hover:text-mh-gold-400 transition-colors">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-mh-slate-300 group-hover:text-mh-gold-400 transition-colors">
                  Upload portrait image
                </p>
                <p className="mt-0.5 text-[11px] text-mh-slate-500">
                  Drag & drop image here, or click to browse
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Adventurer Edit Modal ───────────────────────────────
interface Props {
  adventurer?: DBAdventurer | null;
  open: boolean;
  onClose: () => void;
  nextSortOrder?: number;
}

export default function AdventurerEditModal({
  adventurer,
  open,
  onClose,
  nextSortOrder = 0,
}: Props) {
  const isEditing = Boolean(adventurer);

  const [id, setId] = useState(adventurer?.id ?? '');
  const [idManual, setIdManual] = useState(false);
  const [name, setName] = useState(adventurer?.name ?? '');
  const [nameJa, setNameJa] = useState(adventurer?.name_ja ?? '');
  const [isDefault, setIsDefault] = useState(adventurer?.is_default ?? false);
  const [role, setRole] = useState<AdventurerRole>(adventurer?.role ?? 'Assault');
  const [element, setElement] = useState(adventurer?.element_specialization ?? 'raw');
  const [weaponType, setWeaponType] = useState(adventurer?.weapon_type ?? 'great_sword');
  const [image, setImage] = useState<string | null>(adventurer?.image ?? null);
  const [description, setDescription] = useState(adventurer?.description ?? '');
  const [notes, setNotes] = useState(adventurer?.notes ?? '');
  const [sortOrder, setSortOrder] = useState(adventurer?.sort_order ?? nextSortOrder);
  const [isActive, setIsActive] = useState(adventurer?.is_active ?? true);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upsertMutation = useUpsertAdventurer();
  const deleteMutation = useDeleteAdventurer();

  useEffect(() => {
    if (adventurer) {
      setId(adventurer.id);
      setIdManual(true);
      setName(adventurer.name);
      setNameJa(adventurer.name_ja ?? '');
      setIsDefault(adventurer.is_default);
      setRole(adventurer.role);
      setElement(adventurer.element_specialization ?? 'raw');
      setWeaponType(adventurer.weapon_type ?? 'great_sword');
      setImage(adventurer.image ?? null);
      setDescription(adventurer.description ?? '');
      setNotes(adventurer.notes ?? '');
      setSortOrder(adventurer.sort_order);
      setIsActive(adventurer.is_active);
    } else {
      setId('');
      setIdManual(false);
      setName('');
      setNameJa('');
      setIsDefault(false);
      setRole('Assault');
      setElement('raw');
      setWeaponType('great_sword');
      setImage(null);
      setDescription('');
      setNotes('');
      setSortOrder(nextSortOrder);
      setIsActive(true);
    }
    setConfirmDelete(false);
    setErrorMsg(null);
  }, [adventurer, open, nextSortOrder]);

  // Auto-generate slug for new records
  function handleNameChange(newName: string) {
    setName(newName);
    if (!idManual && !isEditing) {
      setId(toSlug(newName));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = id.trim();
    const cleanName = name.trim();

    if (!cleanId) {
      setErrorMsg('Adventurer ID (slug) is required.');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Adventurer Name is required.');
      return;
    }

    const allWeapons = WEAPON_TYPES.map((w) => w.id);

    const payload: AdventurerUpsert = {
      id: cleanId,
      name: cleanName,
      name_ja: nameJa.trim() || null,
      is_default: isDefault,
      role,
      element_specialization: element || null,
      weapon_type: weaponType || null,
      allowed_weapon_types: isDefault ? allWeapons : [weaponType],
      image: image || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    try {
      await upsertMutation.mutateAsync(payload);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to save adventurer.');
    }
  }

  async function handleDelete() {
    if (!adventurer) return;
    try {
      await deleteMutation.mutateAsync(adventurer.id);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to delete adventurer.');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-mh-slate-700 bg-mh-slate-850 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30">
              <User size={20} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                {isEditing ? `Edit Adventurer: ${adventurer?.name}` : 'Add New Adventurer'}
              </h2>
              <p className="text-xs text-mh-slate-500">
                Configure character portrait, combat role, element affinity &amp; weapon proficiency.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Default Character Toggle Banner */}
          <div className={cn(
            'flex items-center justify-between rounded-xl border p-3.5 transition-all',
            isDefault
              ? 'border-mh-gold-500/40 bg-mh-gold-500/10'
              : 'border-mh-slate-750 bg-mh-slate-900/60'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg ring-1',
                isDefault ? 'bg-mh-gold-500/20 text-mh-gold-300 ring-mh-gold-500/50' : 'bg-mh-slate-800 text-mh-slate-400 ring-mh-slate-700'
              )}>
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-mh-slate-200">
                  Player Character (Default Adventurer)
                </p>
                <p className="text-[11px] text-mh-slate-400">
                  If enabled, this character represents the player and can freely change weapon types during play.
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-mh-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-mh-gold-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          {/* Name & ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Adventurer Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Ouyang Varen"
                className="mt-1.5 w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                ID (Slug) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={id}
                onChange={(e) => {
                  setIdManual(true);
                  setId(toSlug(e.target.value));
                }}
                placeholder="e.g. ouyang_varen"
                className="mt-1.5 w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 font-mono text-xs text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Japanese Name & Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Japanese Name (Optional)
              </label>
              <input
                type="text"
                value={nameJa}
                onChange={(e) => setNameJa(e.target.value)}
                placeholder="e.g. オウヤン・ヴァレン"
                className="mt-1.5 w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Role (Disrupter, Assault, Support) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300 mb-1.5">
              Tactical Role <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ADVENTURER_ROLES.map((r) => {
                const cfg = ADVENTURER_ROLE_CONFIG[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all',
                      isSelected
                        ? `${cfg.border} ${cfg.bg} ring-1 ring-white/20 shadow-sm`
                        : 'border-mh-slate-750 bg-mh-slate-800/80 hover:border-mh-slate-600',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', cfg.dotColor)} />
                      <span className={cn('text-xs font-bold', isSelected ? cfg.text : 'text-mh-slate-300')}>
                        {cfg.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-mh-slate-400 line-clamp-1">{cfg.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weapon Type & Element Specialization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300 mb-1.5">
                {isDefault ? 'Default Active Weapon' : 'Fixed Weapon Type'} <span className="text-red-400">*</span>
              </label>
              <select
                value={weaponType}
                onChange={(e) => setWeaponType(e.target.value)}
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 focus:border-mh-gold-500/50 focus:outline-none"
              >
                {WEAPON_TYPES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.category.toUpperCase()})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-mh-slate-500">
                {isDefault
                  ? 'Active weapon on profile. Player can switch weapons freely.'
                  : 'Fixed weapon used by this companion adventurer.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300 mb-1.5">
                Element Specialization
              </label>
              <select
                value={element}
                onChange={(e) => setElement(e.target.value)}
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 focus:border-mh-gold-500/50 focus:outline-none"
              >
                {Object.values(ELEMENT_OPTIONS).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-mh-slate-500">
                Combat affinity or elemental synergy in party comps.
              </p>
            </div>
          </div>

          {/* Image Upload */}
          <ImageUploadField
            label="Portrait Image"
            subLabel="Upload character bust/portrait image to Supabase storage"
            value={image}
            onChange={setImage}
            slug={id || name}
          />

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Lore / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Background lore, character traits, or combat style details..."
              className="mt-1.5 w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-3">
            <div>
              <p className="text-xs font-bold text-mh-slate-300">Published Status</p>
              <p className="text-[11px] text-mh-slate-500">
                Visible to users in the public Investigation Notes Adventurer roster
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-mh-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-mh-slate-750 pt-4">
            {isEditing ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Delete adventurer?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
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
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                  <span>Delete Adventurer</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-4 py-2 text-xs font-semibold text-mh-slate-300 hover:bg-mh-slate-750"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={upsertMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-md"
              >
                {upsertMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{isEditing ? 'Save Changes' : 'Create Adventurer'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
