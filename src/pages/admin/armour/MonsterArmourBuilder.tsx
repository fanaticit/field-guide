// ─────────────────────────────────────────────────────────────
// MonsterArmourBuilder — Armour Sets & Piece Skills Editor
// Supports both Monster Armour Sets (e.g. Rathalos, Legiana) and
// Non-Monster Material Armour Sets (e.g. High Metal, Leather, Bone, Alloy, Ingot).
// Allows configuring custom Set Names, piece images, unlock rarities,
// and inherent Set Effects across all canonical pieces.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  X,
  Shield,
  ChevronRight,
  Loader2,
  Sparkles,
  Check,
  Layers,
  Trash2,
  Pencil,
  Flame,
  Upload,
  Camera,
  AlertCircle,
  Hammer,
  Copy,
} from 'lucide-react';
import { useAdminMonsters } from '../../../hooks/useAdminMonsters';
import { useAdminSkills, type DBSkill } from '../../../hooks/useAdminSkills';
import {
  useAdminArmourPieces,
  useAddSkillToPiece,
  useRemoveSkillFromPiece,
  useSaveArmourPieceSkills,
  useUpdateArmourPieceImage,
  useApplySkillToPieces,
  useRenameArmourSet,
  useDeleteArmourSet,
  useDeleteEntireArmourSource,
  type DBArmourPiece,
} from '../../../hooks/useAdminArmour';
import { supabase } from '../../../lib/supabase';
import { type ArmourSlot, type ArmourSkill, sortArmourSkills } from '../../../data/schemas/armour';
import { CATEGORY_CONFIG } from '../skills/SkillEditModal';
import { cn } from '../../../lib/utils';

export const ARMOUR_SLOTS_DEF: Array<{
  id: ArmourSlot;
  label: string;
  subLabel: string;
  icon: string;
}> = [
  { id: 'helm',    label: 'Helm',      subLabel: 'Headwear', icon: '/images/armor/helm.png'    },
  { id: 'chest',   label: 'Mail',      subLabel: 'Chest',    icon: '/images/armor/chest.png'   },
  { id: 'gloves',  label: 'Gauntlets', subLabel: 'Arms',     icon: '/images/armor/gloves.png'  },
  { id: 'waist',   label: 'Coil',      subLabel: 'Waist',    icon: '/images/armor/waist.png'   },
  { id: 'greaves', label: 'Greaves',   subLabel: 'Legs',     icon: '/images/armor/greaves.png' },
];

export const ROMAN_NUMERAL_PRESETS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'
];

export interface ArmourSetSource {
  id: string; // e.g. 'rathalos' or 'high_metal'
  name: string; // e.g. 'Rathalos' or 'High Metal'
  name_ja?: string | null;
  icon?: string | null;
  isMonster: boolean;
}

interface Props {
  game: string;
  selectedMonsterId: string | null;
  onSelectMonster: (id: string) => void;
}

// ── Piece Image Upload Modal ─────────────────────────────────
function PieceImageModal({
  game,
  source,
  setVariant,
  setName,
  slotDef,
  piece,
  onClose,
}: {
  game: string;
  source: ArmourSetSource;
  setVariant: string;
  setName: string;
  slotDef: typeof ARMOUR_SLOTS_DEF[number];
  piece?: DBArmourPiece;
  onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(piece?.image ?? null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateImageMutation = useUpdateArmourPieceImage();

  useEffect(() => {
    setImageUrl(piece?.image ?? null);
  }, [piece?.image]);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    setErrorMsg(null);
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const cleanSlug = `${source.id}_${setVariant}_${slotDef.id}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const path = `${game}/${cleanSlug}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('armour')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from('armour').getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to upload image. You can enter the URL directly below.');
      setShowUrlInput(true);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    await updateImageMutation.mutateAsync({
      game,
      monsterId: source.id,
      setVariant,
      slot: slotDef.id,
      image: imageUrl,
      currentSkills: piece?.skills ?? [],
      setName,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-400">
              <Camera size={16} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                {source.name} {slotDef.label} Image
              </h2>
              <p className="text-[11px] text-mh-slate-400">
                {setName} ({slotDef.subLabel})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all',
              imageUrl
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
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />

            {imageUrl ? (
              <div className="flex w-full items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-mh-slate-700 bg-mh-slate-900 p-1 flex items-center justify-center shadow-md">
                  <img
                    src={imageUrl}
                    alt={slotDef.label}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-left">
                  <p className="text-xs font-semibold text-mh-slate-200 truncate">
                    {imageUrl.split('/').pop()}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 rounded bg-mh-slate-700 px-2.5 py-1 text-[11px] font-semibold text-mh-slate-200 hover:bg-mh-slate-600 transition-colors"
                    >
                      <Upload size={12} />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="rounded p-1 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      title="Reset to default icon"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 size={22} className="animate-spin text-mh-gold-400" />
                    <span className="text-xs font-semibold text-mh-slate-300">Uploading piece image…</span>
                  </div>
                ) : (
                  <>
                    <Upload size={20} className="text-mh-slate-500 mb-1.5" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3 py-1 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 transition-all shadow-sm mb-1"
                    >
                      Upload Piece Image
                    </button>
                    <p className="text-[10px] text-mh-slate-500">or drag and drop PNG / JPG here</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Manual URL toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-mh-slate-400 font-semibold">Image URL or Local Path</span>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] text-mh-gold-400 hover:text-mh-gold-300 underline"
              >
                {showUrlInput ? 'Hide' : 'Enter URL manually'}
              </button>
            </div>
            {showUrlInput && (
              <input
                type="text"
                value={imageUrl ?? ''}
                onChange={(e) => setImageUrl(e.target.value || null)}
                placeholder="/images/armor/... or https://..."
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={updateImageMutation.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-sm"
          >
            {updateImageMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save Piece Image
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Non-Monster Set Modal ─────────────────────────────
function CreateNonMonsterSetModal({
  game,
  existingSetIds,
  open,
  onClose,
  onCreated,
}: {
  game: string;
  existingSetIds: string[];
  open: boolean;
  onClose: () => void;
  onCreated: (setId: string) => void;
}) {
  const [name, setName] = useState('');
  const [customId, setCustomId] = useState('');
  const [useCustomId, setUseCustomId] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const savePiece = useSaveArmourPieceSkills();

  const autoId = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const targetId = useCustomId ? customId.toLowerCase().trim().replace(/[^a-z0-9_]/g, '') : autoId;

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) {
      setErrorMsg('Please enter a set name (e.g. High Metal, Bone, Leather).');
      return;
    }
    if (!targetId) {
      setErrorMsg('Please specify a valid set ID.');
      return;
    }
    if (existingSetIds.includes(targetId)) {
      setErrorMsg(`Armour set with ID '${targetId}' already exists.`);
      return;
    }

    try {
      setErrorMsg(null);
      const formattedSetName = name.trim().endsWith('Set') ? name.trim() : `${name.trim()} Set`;

      // Create placeholder piece in helm to initialize set in database
      await savePiece.mutateAsync({
        game,
        monsterId: targetId,
        setVariant: 'I',
        setName: formattedSetName,
        slot: 'helm',
        skills: [],
      });

      onCreated(targetId);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to create set.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Hammer size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                New Material / Non-Monster Set
              </h2>
              <p className="text-xs text-mh-slate-400">
                Create sets made from ore, bone, or general materials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300 mb-1.5">
              Set Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Metal, Bone, Leather, Chainmail, Alloy..."
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Set Identifier (ID)
              </label>
              <button
                type="button"
                onClick={() => setUseCustomId(!useCustomId)}
                className="text-[11px] text-mh-gold-400 hover:text-mh-gold-300 underline"
              >
                {useCustomId ? 'Auto-generate ID' : 'Custom ID'}
              </button>
            </div>
            {useCustomId ? (
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="e.g. high_metal, bone, alloy..."
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50 font-mono"
              />
            ) : (
              <div className="rounded-lg border border-mh-slate-750 bg-mh-slate-850 px-3 py-2 text-xs font-mono text-mh-gold-400">
                {targetId || '(enter set name above)'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={savePiece.isPending}
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-sm"
          >
            {savePiece.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Set
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline Skill Adder Component ─────────────────────────────
function AddSkillPicker({
  game,
  monsterId,
  setVariant = 'I',
  slot,
  currentSkills,
  availableSkills,
  onClose,
}: {
  game: string;
  monsterId: string;
  setVariant?: string;
  slot: ArmourSlot;
  currentSkills: ArmourSkill[];
  availableSkills: DBSkill[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [level, setLevel] = useState<number>(1);
  const [unlockRarity, setUnlockRarity] = useState<number | null>(null);

  const addSkill = useAddSkillToPiece();

  const filteredSkills = useMemo(() => {
    const q = search.toLowerCase();
    const assignedIds = new Set(currentSkills.map((s) => s.id));
    return availableSkills.filter(
      (s) =>
        !assignedIds.has(s.id) &&
        (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)),
    );
  }, [availableSkills, currentSkills, search]);

  const selectedSkill = availableSkills.find((s) => s.id === selectedSkillId);
  const maxAllowedLevel = selectedSkill?.max_levels[game] ?? 5;
  const isSetBonus = selectedSkill?.is_set_bonus ?? false;

  async function handleAdd() {
    if (!selectedSkillId) return;
    await addSkill.mutateAsync({
      game,
      monsterId,
      setVariant,
      slot,
      currentSkills,
      skillId: selectedSkillId,
      level: isSetBonus ? 1 : level,
      unlockRarity,
    });
    onClose();
  }

  return (
    <div className="rounded-lg border border-mh-gold-500/30 bg-mh-slate-900/90 p-3 shadow-lg space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-mh-gold-400">Add Skill or Set Effect</span>
        <button
          type="button"
          onClick={onClose}
          className="text-mh-slate-500 hover:text-mh-slate-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills & sets…"
          className="w-full rounded-md border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-2.5 text-xs text-mh-slate-200 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
          autoFocus
        />
      </div>

      {/* Skill List Dropdown */}
      <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-mh-slate-700/60 bg-mh-slate-800/50 p-1">
        {filteredSkills.length === 0 ? (
          <p className="p-2 text-center text-[11px] text-mh-slate-500">
            No matching skills available
          </p>
        ) : (
          filteredSkills.map((s) => {
            const catCfg = CATEGORY_CONFIG[s.category] ?? CATEGORY_CONFIG.general;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSkillId(s.id);
                  setLevel(1);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors',
                  s.id === selectedSkillId
                    ? 'bg-mh-gold-500/20 text-mh-gold-300'
                    : 'text-mh-slate-300 hover:bg-mh-slate-700',
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', catCfg.text.replace('text-', 'bg-'))} />
                  <span className="truncate">{s.name}</span>
                </div>
                <span className="text-[10px] text-mh-slate-500 font-mono shrink-0">
                  {s.is_set_bonus ? 'Set Effect' : `Lv Max ${s.max_levels[game] ?? 5}`}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Add Action & Level Stepper & Unlock Rarity */}
      {selectedSkill && (
        <div className="space-y-2 pt-1 border-t border-mh-slate-800">
          <div className="flex items-center justify-between">
            {isSetBonus ? (
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-mh-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-mh-gold-300 border border-mh-gold-500/40">
                  Inherent Set Effect
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-mh-slate-400">Level:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxAllowedLevel }, (_, i) => i + 1).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={cn(
                        'h-6 w-6 rounded text-xs font-bold transition-colors',
                        level === lvl
                          ? 'bg-mh-gold-500 text-mh-slate-950 font-extrabold'
                          : 'bg-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-700',
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={addSkill.isPending}
              onClick={handleAdd}
              className="flex items-center gap-1 rounded bg-mh-gold-500 px-3 py-1 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-colors"
            >
              {addSkill.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              Add
            </button>
          </div>

          {/* Unlock Rarity Selector */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-mh-slate-800/60">
            <span className="text-[11px] text-mh-slate-400">Unlock at Rarity:</span>
            <div className="flex items-center gap-1">
              {[
                { label: 'Base', val: null },
                { label: 'R6', val: 6 },
                { label: 'R8', val: 8 },
                { label: 'R9', val: 9 },
                { label: 'R12', val: 12 },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setUnlockRarity(r.val)}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                    unlockRarity === r.val
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-mh-slate-800 text-mh-slate-400 hover:bg-mh-slate-700',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unlock Rarity Dropdown Popover ────────────────────────────
function UnlockRarityPopover({
  skill,
  onChange,
}: {
  skill: ArmourSkill;
  onChange: (newRarity: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const rarity = skill.unlockRarity ?? skill.unlock_rarity ?? null;
  const isLocked = rarity !== null && rarity > 1;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Required armour upgrade rarity to unlock"
        className={cn(
          'flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold transition-all shadow-xs',
          isLocked
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
            : 'border-mh-slate-700 bg-mh-slate-900 text-mh-slate-400 hover:border-mh-slate-600 hover:text-mh-slate-200',
        )}
      >
        <span>{isLocked ? `Rarity ${rarity}` : 'Base'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-32 rounded-lg border border-mh-slate-700 bg-mh-slate-900 p-1.5 shadow-xl animate-in fade-in duration-100">
          <div className="mb-1 border-b border-mh-slate-800 pb-1 text-[9px] font-bold uppercase tracking-wider text-mh-slate-500">
            Unlock Rarity
          </div>
          <div className="space-y-0.5">
            {[
              { label: 'Base (None)', val: null },
              { label: 'Rarity 6', val: 6 },
              { label: 'Rarity 8', val: 8 },
              { label: 'Rarity 9', val: 9 },
              { label: 'Rarity 12', val: 12 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  onChange(opt.val);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] font-medium transition-colors',
                  rarity === opt.val
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-mh-slate-300 hover:bg-mh-slate-800',
                )}
              >
                <span>{opt.label}</span>
                {rarity === opt.val && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Armour Slot Card ─────────────────────────────────────────
function ArmourSlotCard({
  game,
  source,
  setVariant = 'I',
  setName,
  slotDef,
  piece,
  availableSkills,
  onOpenImageModal,
  onApplySkillToAllPieces,
}: {
  game: string;
  source: ArmourSetSource;
  setVariant?: string;
  setName: string;
  slotDef: typeof ARMOUR_SLOTS_DEF[number];
  piece?: DBArmourPiece;
  availableSkills: DBSkill[];
  onOpenImageModal: (slotDef: typeof ARMOUR_SLOTS_DEF[number]) => void;
  onApplySkillToAllPieces: (skillId: string, level: number, unlockRarity: number | null) => void;
}) {
  const [showAdder, setShowAdder] = useState(false);
  const removeSkill = useRemoveSkillFromPiece();
  const saveSkills = useSaveArmourPieceSkills();

  const skills = piece?.skills ?? [];

  const skillMetaMap = useMemo(
    () => new Map(availableSkills.map((s) => [s.id, s])),
    [availableSkills],
  );

  const sortedSkills = useMemo(() => {
    return sortArmourSkills(
      skills,
      (id) => skillMetaMap.get(id)?.is_set_bonus ?? false,
      (id) => skillMetaMap.get(id)?.name ?? id,
    );
  }, [skills, skillMetaMap]);

  function handleLevelChange(skillId: string, newLevel: number) {
    const updatedSkills = skills.map((s) =>
      s.id === skillId ? { ...s, level: newLevel } : s,
    );
    saveSkills.mutate({
      game,
      monsterId: source.id,
      setVariant,
      setName,
      slot: slotDef.id,
      skills: updatedSkills,
    });
  }

  function handleRarityChange(skillId: string, newRarity: number | null) {
    const updatedSkills = skills.map((s) =>
      s.id === skillId ? { ...s, unlockRarity: newRarity, unlock_rarity: newRarity } : s,
    );
    saveSkills.mutate({
      game,
      monsterId: source.id,
      setVariant,
      setName,
      slot: slotDef.id,
      skills: updatedSkills,
    });
  }

  function handleRemove(skillId: string) {
    removeSkill.mutate({
      game,
      monsterId: source.id,
      setVariant,
      slot: slotDef.id,
      currentSkills: skills,
      skillId,
    });
  }

  return (
    <div className="flex flex-col rounded-xl border border-mh-slate-700 bg-mh-slate-850 p-4 shadow-sm transition-all hover:border-mh-slate-600">
      {/* Slot header */}
      <div className="flex items-center justify-between border-b border-mh-slate-750 pb-3">
        <div className="flex items-center gap-3">
          {/* Piece image with camera/upload hover overlay */}
          <button
            type="button"
            onClick={() => onOpenImageModal(slotDef)}
            className="group/img relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 p-1 border border-mh-slate-700 hover:border-mh-gold-500/50 shadow-sm transition-all overflow-hidden"
            title="Click to change piece image"
          >
            <img
              src={piece?.image || slotDef.icon}
              alt={slotDef.label}
              className="h-full w-full object-contain filter brightness-90 group-hover/img:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={14} className="text-mh-gold-400" />
            </div>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-mh-slate-100">
                {slotDef.label}
              </h3>
              <span className="text-[10px] font-medium uppercase tracking-wider text-mh-slate-500">
                {slotDef.subLabel}
              </span>
            </div>
            <p className="text-[11px] text-mh-slate-500">
              {skills.length} {skills.length === 1 ? 'skill' : 'skills'} configured
            </p>
          </div>
        </div>

        {!showAdder && (
          <button
            type="button"
            onClick={() => setShowAdder(true)}
            className="flex items-center gap-1 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-2.5 py-1.5 text-xs font-semibold text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-mh-gold-400 transition-all"
          >
            <Plus size={13} />
            <span>Add Skill</span>
          </button>
        )}
      </div>

      {/* Inline skill adder */}
      {showAdder && (
        <div className="mt-3">
          <AddSkillPicker
            game={game}
            monsterId={source.id}
            setVariant={setVariant}
            slot={slotDef.id}
            currentSkills={skills}
            availableSkills={availableSkills}
            onClose={() => setShowAdder(false)}
          />
        </div>
      )}

      {/* Skills list */}
      <div className="mt-3 min-h-[90px] flex-1 space-y-2">
        {skills.length === 0 ? (
          <div className="flex h-full min-h-[90px] flex-col items-center justify-center rounded-lg border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-4 text-center">
            <p className="text-xs text-mh-slate-500">No skills assigned to this piece</p>
            <button
              type="button"
              onClick={() => setShowAdder(true)}
              className="mt-1.5 text-xs font-semibold text-mh-gold-400 hover:text-mh-gold-300 transition-colors"
            >
              + Add first skill
            </button>
          </div>
        ) : (
          sortedSkills.map((s) => {
            const meta = skillMetaMap.get(s.id);
            const name = meta?.name ?? s.id;
            const isSetBonus = meta?.is_set_bonus ?? false;
            const maxLvl = meta?.max_levels[game] ?? 5;
            const cat = meta?.category ?? 'general';
            const catCfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.general;
            const rarity = s.unlockRarity ?? s.unlock_rarity ?? null;

            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors',
                  isSetBonus
                    ? 'border-mh-gold-500/40 bg-mh-gold-500/10'
                    : 'border-mh-slate-750 bg-mh-slate-800/80',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', catCfg.text.replace('text-', 'bg-'))} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="font-semibold text-mh-slate-200 truncate">{name}</p>
                      {isSetBonus && (
                        <span className="shrink-0 rounded bg-mh-gold-500/20 px-1.5 py-0.2 text-[9px] font-bold text-mh-gold-300 border border-mh-gold-500/40">
                          Set Effect
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-mh-slate-500 font-mono truncate">{s.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Unlock Rarity Selector */}
                  <UnlockRarityPopover
                    skill={s}
                    onChange={(newRarity) => handleRarityChange(s.id, newRarity)}
                  />

                  {/* For Set Bonuses: No levels, just a clean badge */}
                  {isSetBonus ? (
                    <span className="text-[10px] font-bold text-mh-gold-400">
                      Inherent
                    </span>
                  ) : (
                    /* For Regular Skills: Level selector buttons */
                    <div className="flex items-center gap-0.5 rounded bg-mh-slate-900 p-0.5 border border-mh-slate-700">
                      {Array.from({ length: maxLvl }, (_, i) => i + 1).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => handleLevelChange(s.id, lvl)}
                          className={cn(
                            'h-5 w-5 rounded text-[10px] font-bold transition-all',
                            s.level === lvl
                              ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm font-extrabold'
                              : 'text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white',
                          )}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Copy this skill / set effect to all 5 pieces button */}
                  <button
                    type="button"
                    onClick={() => onApplySkillToAllPieces(s.id, s.level, rarity)}
                    className="rounded p-1 text-mh-slate-400 hover:bg-mh-gold-500/20 hover:text-mh-gold-300 transition-colors"
                    title={isSetBonus ? "Apply this Set Effect to all 5 armour pieces" : "Copy this skill to all 5 armour pieces"}
                  >
                    <Copy size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(s.id)}
                    className="rounded p-1 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    title="Remove skill"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Rename Set Modal ─────────────────────────────────────────
function RenameSetModal({
  game,
  source,
  setVariant,
  currentSetName,
  open,
  onClose,
}: {
  game: string;
  source: ArmourSetSource;
  setVariant: string;
  currentSetName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentSetName);
  const renameMutation = useRenameArmourSet();

  useEffect(() => {
    setName(currentSetName);
  }, [currentSetName, open]);

  if (!open) return null;

  async function handleSave() {
    await renameMutation.mutateAsync({
      game,
      monsterId: source.id,
      setVariant,
      newSetName: name,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <div>
            <h2 className="font-display text-base font-bold text-mh-slate-100">
              Rename Armour Set
            </h2>
            <p className="text-xs text-mh-slate-400">
              For {source.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300 mb-1.5">
              Set Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Set VII, High Metal Set, Rathalos Alpha+..."
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              autoFocus
            />
            <p className="text-[11px] text-mh-slate-500 mt-1.5">
              Code Identifier: <span className="font-mono font-bold text-mh-gold-400">{setVariant}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={renameMutation.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-sm"
          >
            {renameMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save Set Name
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Armour Set / Variant Modal ─────────────────────────
function DeleteArmourModal({
  game,
  source,
  currentSetVariant,
  currentSetName,
  availableSetVariants,
  open,
  onClose,
  onDeleted,
}: {
  game: string;
  source: ArmourSetSource;
  currentSetVariant: string;
  currentSetName: string;
  availableSetVariants: string[];
  open: boolean;
  onClose: () => void;
  onDeleted: (deletedEntire: boolean) => void;
}) {
  const [deleteMode, setDeleteMode] = useState<'variant' | 'entire'>(
    availableSetVariants.length > 1 ? 'variant' : 'entire',
  );
  const deleteVariantMutation = useDeleteArmourSet();
  const deleteEntireMutation = useDeleteEntireArmourSource();

  if (!open) return null;

  async function handleDelete() {
    if (deleteMode === 'variant') {
      await deleteVariantMutation.mutateAsync({
        game,
        monsterId: source.id,
        setVariant: currentSetVariant,
      });
      onDeleted(false);
    } else {
      await deleteEntireMutation.mutateAsync({
        game,
        monsterId: source.id,
      });
      onDeleted(true);
    }
    onClose();
  }

  const isPending = deleteVariantMutation.isPending || deleteEntireMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-red-500/40 bg-mh-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 px-6 py-4 bg-red-950/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Delete Armour Set
              </h2>
              <p className="text-xs text-red-300/80">
                {source.name} ({game.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {availableSetVariants.length > 1 ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                What would you like to delete?
              </label>
              <div className="grid grid-cols-1 gap-2">
                <label
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all',
                    deleteMode === 'variant'
                      ? 'border-red-500/60 bg-red-500/15 text-white ring-1 ring-red-500/30'
                      : 'border-mh-slate-750 bg-mh-slate-850 text-mh-slate-300 hover:border-mh-slate-700',
                  )}
                >
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteMode === 'variant'}
                    onChange={() => setDeleteMode('variant')}
                    className="mt-0.5 text-red-500 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold">Delete only {currentSetName}</p>
                    <p className="text-[11px] text-mh-slate-400">
                      Removes pieces for variant code '{currentSetVariant}'. Other variants will remain.
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all',
                    deleteMode === 'entire'
                      ? 'border-red-500/60 bg-red-500/15 text-white ring-1 ring-red-500/30'
                      : 'border-mh-slate-750 bg-mh-slate-850 text-mh-slate-300 hover:border-mh-slate-700',
                  )}
                >
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteMode === 'entire'}
                    onChange={() => setDeleteMode('entire')}
                    className="mt-0.5 text-red-500 focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold">Delete ENTIRE {source.name} set</p>
                    <p className="text-[11px] text-mh-slate-400">
                      Permanently removes all {availableSetVariants.length} variants and pieces from the database.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-mh-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the <strong className="text-white">{source.name}</strong> armour set ({currentSetName}) and all its piece configurations?
            </p>
          )}

          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] text-red-300">
            ⚠️ This action cannot be undone. All skills and images associated with this set will be removed.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-all shadow-sm"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleteMode === 'variant' ? `Delete ${currentSetName}` : `Delete Entire Set`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New / Clone Set Modal ────────────────────────────────────
function AddSetModal({
  game,
  source,
  existingSets,
  availableSkills,
  armourPieces,
  open,
  onClose,
  onCreated,
}: {
  game: string;
  source: ArmourSetSource;
  existingSets: string[];
  availableSkills: DBSkill[];
  armourPieces: DBArmourPiece[];
  open: boolean;
  onClose: () => void;
  onCreated: (setVariant: string) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>('II');
  const [customInput, setCustomInput] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);
  const [setNameInput, setSetNameInput] = useState<string>('');
  const [initialSkillId, setInitialSkillId] = useState<string>('');
  const [cloneFromSet, setCloneFromSet] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const savePiece = useSaveArmourPieceSkills();

  // Find next unused Roman numeral preset
  const nextAvailable = useMemo(() => {
    return ROMAN_NUMERAL_PRESETS.find((r) => !existingSets.includes(r)) || 'VII';
  }, [existingSets]);

  useEffect(() => {
    setSelectedPreset(nextAvailable);
    setSetNameInput(`Set ${nextAvailable}`);
  }, [nextAvailable, open]);

  if (!open) return null;

  const targetSetVariant = useCustom ? customInput.trim() : selectedPreset;

  async function handleCreate() {
    if (!targetSetVariant) {
      setErrorMsg('Please select or enter a Set identifier.');
      return;
    }
    if (existingSets.includes(targetSetVariant)) {
      setErrorMsg(`Set "${targetSetVariant}" already exists for ${source.name}.`);
      return;
    }

    try {
      setErrorMsg(null);
      const finalSetName = setNameInput.trim() || `Set ${targetSetVariant}`;

      // If cloning from an existing set, copy all pieces and skills
      if (cloneFromSet) {
        const sourcePieces = armourPieces.filter(
          (p) => p.monster_id === source.id && p.game === game && (p.set_variant || 'I') === cloneFromSet
        );

        for (const slotDef of ARMOUR_SLOTS_DEF) {
          const src = sourcePieces.find((p) => p.slot === slotDef.id);
          await savePiece.mutateAsync({
            game,
            monsterId: source.id,
            setVariant: targetSetVariant,
            setName: finalSetName,
            image: src?.image ?? null,
            slot: slotDef.id,
            skills: src ? [...src.skills] : [],
          });
        }
      } else if (initialSkillId) {
        // Apply initial set bonus / skill to all 5 pieces upon creation
        for (const slotDef of ARMOUR_SLOTS_DEF) {
          await savePiece.mutateAsync({
            game,
            monsterId: source.id,
            setVariant: targetSetVariant,
            setName: finalSetName,
            slot: slotDef.id,
            skills: [{ id: initialSkillId, level: 1 }],
          });
        }
      } else {
        // Create initial empty placeholder for helm or first slot to establish set in DB
        await savePiece.mutateAsync({
          game,
          monsterId: source.id,
          setVariant: targetSetVariant,
          setName: finalSetName,
          slot: 'helm',
          skills: [],
        });
      }

      onCreated(targetSetVariant);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to create set.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                Add Armour Set for {source.name}
              </h2>
              <p className="text-xs text-mh-slate-400">
                Create named sets (e.g. Set I, Set VII, Alpha, Beta, High Rank)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Preset Roman Numerals */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Select Set Code / Roman Numeral
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ROMAN_NUMERAL_PRESETS.map((num) => {
                const isUsed = existingSets.includes(num);
                const isSelected = !useCustom && selectedPreset === num;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isUsed}
                    onClick={() => {
                      setUseCustom(false);
                      setSelectedPreset(num);
                      setSetNameInput(`Set ${num}`);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-xl border py-2 text-xs font-bold transition-all',
                      isUsed
                        ? 'border-mh-slate-800 bg-mh-slate-900/60 text-mh-slate-600 cursor-not-allowed'
                        : isSelected
                        ? 'bg-mh-gold-500 border-mh-gold-400 text-mh-slate-950 shadow-md font-extrabold ring-1 ring-mh-gold-300'
                        : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-white',
                    )}
                  >
                    <span>Set {num}</span>
                    {isUsed && <span className="text-[9px] font-normal opacity-60">(Exists)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Set Code Option */}
          <div className="space-y-2 pt-2 border-t border-mh-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Or Custom Set Identifier Code
              </label>
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-[11px] text-mh-gold-400 hover:text-mh-gold-300 underline"
              >
                {useCustom ? 'Use Roman Numeral' : 'Type custom code'}
              </button>
            </div>
            {useCustom && (
              <input
                type="text"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setSetNameInput(e.target.value ? `Set ${e.target.value}` : '');
                }}
                placeholder="e.g. VII, alpha, beta, hr..."
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
              />
            )}
          </div>

          {/* Set Display Name */}
          <div className="space-y-1.5 pt-2 border-t border-mh-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Set Display Name
            </label>
            <input
              type="text"
              value={setNameInput}
              onChange={(e) => setSetNameInput(e.target.value)}
              placeholder="e.g. Set VII, High Metal Set, Rathalos Alpha+..."
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          {/* Initial Full Set Skill / Set Bonus */}
          <div className="space-y-1.5 pt-2 border-t border-mh-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-gold-400">
              ⚡ Apply Skill / Set Effect to All 5 Pieces (Optional)
            </label>
            <select
              value={initialSkillId}
              onChange={(e) => setInitialSkillId(e.target.value)}
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 outline-none focus:border-mh-gold-500/50"
            >
              <option value="">(None - start empty)</option>
              {availableSkills.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name} {sk.is_set_bonus ? '(Set Effect)' : `(Skill)`}
                </option>
              ))}
            </select>
          </div>

          {/* Clone Options */}
          {existingSets.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-mh-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Or Clone from Existing Set
              </label>
              <select
                value={cloneFromSet}
                onChange={(e) => setCloneFromSet(e.target.value)}
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 outline-none focus:border-mh-gold-500/50"
              >
                <option value="">(Don't clone)</option>
                {existingSets.map((s) => (
                  <option key={s} value={s}>
                    Clone all pieces & skills from Set {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={savePiece.isPending}
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-sm"
          >
            {savePiece.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create Set
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Apply Skill to Multiple Pieces Modal ────────────────
function BulkApplySkillModal({
  game,
  source,
  setVariant = 'I',
  setName,
  availableSkills,
  monsterPiecesMap,
  open,
  onClose,
}: {
  game: string;
  source: ArmourSetSource;
  setVariant?: string;
  setName?: string;
  availableSkills: DBSkill[];
  monsterPiecesMap: Map<ArmourSlot, DBArmourPiece | undefined>;
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'' | 'set' | 'skill'>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [level, setLevel] = useState<number>(1);
  const [unlockRarity, setUnlockRarity] = useState<number | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<ArmourSlot[]>([
    'helm', 'chest', 'gloves', 'waist', 'greaves',
  ]);

  const applyMutation = useApplySkillToPieces();

  const filteredSkills = useMemo(() => {
    let list = [...availableSkills];
    if (filterType === 'set') {
      list = list.filter((s) => s.is_set_bonus);
    } else if (filterType === 'skill') {
      list = list.filter((s) => !s.is_set_bonus);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [availableSkills, search, filterType]);

  const selectedSkill = useMemo(
    () => availableSkills.find((s) => s.id === selectedSkillId),
    [availableSkills, selectedSkillId],
  );

  const isSetBonus = selectedSkill?.is_set_bonus ?? false;
  const maxAllowedLevel = selectedSkill
    ? selectedSkill.max_levels[game] ?? 5
    : 5;

  const toggleSlot = (slot: ArmourSlot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const toggleAllSlots = () => {
    if (selectedSlots.length === ARMOUR_SLOTS_DEF.length) {
      setSelectedSlots([]);
    } else {
      setSelectedSlots(ARMOUR_SLOTS_DEF.map((s) => s.id));
    }
  };

  const handleApply = async () => {
    if (!selectedSkillId || selectedSlots.length === 0) return;
    await applyMutation.mutateAsync({
      game,
      monsterId: source.id,
      setVariant,
      slots: selectedSlots,
      skillId: selectedSkillId,
      level: isSetBonus ? 1 : level,
      unlockRarity,
      currentPiecesMap: monsterPiecesMap,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-mh-slate-100">
                Apply Skill or Set to All Pieces
              </h2>
              <p className="text-xs text-mh-slate-400">
                For {source.name} — {setName || `Set ${setVariant}`} ({game.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Pick Skill / Set */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              1. Select Skill or Set Effect
            </label>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search skills & sets…"
                  className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
                  autoFocus
                />
              </div>

              <div className="flex rounded-lg border border-mh-slate-700 bg-mh-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('')}
                  className={cn(
                    'rounded px-2.5 py-1 font-medium transition-colors',
                    filterType === '' ? 'bg-mh-gold-500 text-mh-slate-950 font-bold' : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('skill')}
                  className={cn(
                    'rounded px-2.5 py-1 font-medium transition-colors',
                    filterType === 'skill' ? 'bg-mh-gold-500 text-mh-slate-950 font-bold' : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  Skills
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('set')}
                  className={cn(
                    'rounded px-2.5 py-1 font-medium transition-colors',
                    filterType === 'set' ? 'bg-mh-gold-500 text-mh-slate-950 font-bold' : 'text-mh-slate-400 hover:text-white',
                  )}
                >
                  Sets / Inks
                </button>
              </div>
            </div>

            {/* Skills selection list */}
            <div className="max-h-44 overflow-y-auto rounded-lg border border-mh-slate-750 bg-mh-slate-800/60 p-1.5 divide-y divide-mh-slate-800/80">
              {filteredSkills.length === 0 ? (
                <p className="p-4 text-center text-xs text-mh-slate-500">No skills found.</p>
              ) : (
                filteredSkills.map((sk) => {
                  const isSelected = sk.id === selectedSkillId;
                  const catCfg = CATEGORY_CONFIG[sk.category] ?? CATEGORY_CONFIG.general;
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => {
                        setSelectedSkillId(sk.id);
                        setLevel(1);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-mh-gold-500/20 text-mh-gold-300 ring-1 ring-mh-gold-500/40'
                          : 'text-mh-slate-300 hover:bg-mh-slate-700/60',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', catCfg.text.replace('text-', 'bg-'))} />
                        <span className="font-semibold">{sk.name}</span>
                        {sk.is_set_bonus && (
                          <span className="rounded bg-mh-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold text-mh-gold-400 border border-mh-gold-500/30">
                            Set ({sk.set_thresholds?.map((t) => t.pieces).join(', ') || '2, 4'} pcs)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-mh-slate-500">
                        {sk.is_set_bonus ? `Set Effect` : `Max Lv ${sk.max_levels[game] ?? 5}`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Level / Set Effect & Unlock Rarity */}
          {selectedSkill && (
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-3.5 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                2. {isSetBonus ? 'Set Effect' : 'Select Skill Level to Apply'}
              </label>
              {isSetBonus ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-mh-gold-500/20 px-3 py-1.5 text-xs font-bold text-mh-gold-300 border border-mh-gold-500/40">
                    Inherent Set Effect (Adds 1 piece contribution per selected slot)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {Array.from({ length: maxAllowedLevel }, (_, i) => i + 1).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={cn(
                        'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                        level === lvl
                          ? 'bg-mh-gold-500 text-mh-slate-950 shadow'
                          : 'border border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-700',
                      )}
                    >
                      Level {lvl}
                    </button>
                  ))}
                </div>
              )}

              {/* Unlock Rarity Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-mh-slate-750 text-xs">
                <div className="flex items-center gap-1.5 text-mh-slate-300 font-semibold">
                  <Sparkles size={13} className="text-mh-gold-400" />
                  <span>Required Upgrade Rarity:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'Base (None)', val: null },
                    { label: 'Rarity 6', val: 6 },
                    { label: 'Rarity 8', val: 8 },
                    { label: 'Rarity 9', val: 9 },
                    { label: 'Rarity 12', val: 12 },
                  ].map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => setUnlockRarity(r.val)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
                        unlockRarity === r.val
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'border border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-700',
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={unlockRarity ?? ''}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setUnlockRarity(isNaN(v) || v <= 1 ? null : v);
                    }}
                    placeholder="Custom"
                    className="w-16 rounded-lg bg-mh-slate-800 px-2 py-1 text-xs font-mono text-mh-slate-200 border border-mh-slate-700 outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Target Slots Checkboxes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                3. Choose Armour Pieces ({selectedSlots.length}/{ARMOUR_SLOTS_DEF.length} Selected)
              </label>
              <button
                type="button"
                onClick={toggleAllSlots}
                className="text-[11px] font-semibold text-mh-gold-400 hover:text-mh-gold-300 underline"
              >
                {selectedSlots.length === ARMOUR_SLOTS_DEF.length ? 'Deselect All' : 'Select All 5 Pieces'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ARMOUR_SLOTS_DEF.map((slotDef) => {
                const isChecked = selectedSlots.includes(slotDef.id);
                const piece = monsterPiecesMap.get(slotDef.id);
                const existingSkill = piece?.skills.find((s) => s.id === selectedSkillId);

                return (
                  <label
                    key={slotDef.id}
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none',
                      isChecked
                        ? 'border-mh-gold-500/50 bg-mh-gold-500/5'
                        : 'border-mh-slate-750 bg-mh-slate-800/40 opacity-70',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSlot(slotDef.id)}
                        className="h-4 w-4 rounded border-mh-slate-700 bg-mh-slate-800 text-mh-gold-500 focus:ring-0"
                      />
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mh-slate-800 p-1 border border-mh-slate-700">
                        <img
                          src={piece?.image || slotDef.icon}
                          alt={slotDef.label}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-mh-slate-200">{slotDef.label}</p>
                        <p className="text-[10px] text-mh-slate-500">{slotDef.subLabel}</p>
                      </div>
                    </div>

                    {selectedSkillId && (
                      <span className="text-[10px] text-mh-slate-400 font-mono">
                        {existingSkill ? (
                          <span className="text-amber-400 font-semibold">
                            {isSetBonus ? 'Already Active' : `Lv ${existingSkill.level} → Lv ${level}`}
                          </span>
                        ) : (
                          <span className="text-green-400 font-semibold">
                            {isSetBonus ? '+ Add Set Effect' : `+ Add Lv ${level}`}
                          </span>
                        )}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 px-6 py-4 bg-mh-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedSkillId || selectedSlots.length === 0 || applyMutation.isPending}
            onClick={handleApply}
            className="flex items-center gap-2 rounded-lg bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-sm"
          >
            {applyMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <Check size={14} />
                Apply to {selectedSlots.length} {selectedSlots.length === 1 ? 'Piece' : 'Pieces'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Monster Armour Builder Component ────────────────────
export default function MonsterArmourBuilder({
  game,
  selectedMonsterId,
  onSelectMonster,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'monster' | 'material'>('all');
  const [selectedSetVariant, setSelectedSetVariant] = useState<string>('I');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddSetModal, setShowAddSetModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<ArmourSetSource | null>(null);
  const [showCreateNonMonsterModal, setShowCreateNonMonsterModal] = useState(false);
  const [activeSlotForImageModal, setActiveSlotForImageModal] = useState<typeof ARMOUR_SLOTS_DEF[number] | null>(null);

  const monsterFilters = useMemo(() => ({ game, isActive: true }), [game]);
  const skillFilters = useMemo(() => ({ game, isActive: true }), [game]);

  const { data: monsters = [], isLoading: loadingMonsters, error: monstersError } = useAdminMonsters(monsterFilters);
  const { data: skills = [] } = useAdminSkills(skillFilters);
  const { data: armourPieces = [], error: armourPiecesError } = useAdminArmourPieces(game);
  
  const applyMutation = useApplySkillToPieces();
  const removeSkillMutation = useRemoveSkillFromPiece();

  const monsterIdSet = useMemo(() => new Set(monsters.map((m) => m.id)), [monsters]);

  // Build unified list of all armour set sources (Monsters + Material sets)
  const allSetSources = useMemo<ArmourSetSource[]>(() => {
    const list: ArmourSetSource[] = monsters.map((m) => ({
      id: m.id,
      name: m.name,
      name_ja: m.name_ja,
      icon: m.icon,
      isMonster: true,
    }));

    // Find any non-monster set IDs present in armourPieces for current game
    const nonMonsterMap = new Map<string, string>(); // id -> display name
    armourPieces
      .filter((p) => p.game === game && !monsterIdSet.has(p.monster_id))
      .forEach((p) => {
        if (!nonMonsterMap.has(p.monster_id)) {
          const formatted = p.set_name 
            ? p.set_name.replace(/\s+Set$/i, '') 
            : p.monster_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          nonMonsterMap.set(p.monster_id, formatted);
        }
      });

    nonMonsterMap.forEach((name, id) => {
      list.push({
        id,
        name,
        name_ja: null,
        icon: null,
        isMonster: false,
      });
    });

    return list.sort((a, b) => {
      if (a.isMonster !== b.isMonster) {
        return a.isMonster ? -1 : 1; // Monsters first, then material sets
      }
      return a.name.localeCompare(b.name);
    });
  }, [monsters, armourPieces, game, monsterIdSet]);

  const filteredSources = useMemo(() => {
    let list = allSetSources;
    if (sourceFilter === 'monster') {
      list = list.filter((s) => s.isMonster);
    } else if (sourceFilter === 'material') {
      list = list.filter((s) => !s.isMonster);
    }

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.name_ja ?? '').toLowerCase().includes(q),
    );
  }, [allSetSources, searchQuery, sourceFilter]);

  // Set default selected source if none selected
  const activeSetSource = useMemo(() => {
    if (selectedMonsterId) {
      return allSetSources.find((s) => s.id === selectedMonsterId) ?? allSetSources[0] ?? null;
    }
    return allSetSources[0] ?? null;
  }, [allSetSources, selectedMonsterId]);

  // Map of Set Variant -> Set Name for active source
  const setNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!activeSetSource) return map;
    armourPieces
      .filter((p) => p.monster_id === activeSetSource.id && p.game === game)
      .forEach((p) => {
        const variant = p.set_variant || 'I';
        if (p.set_name && !map.has(variant)) {
          map.set(variant, p.set_name);
        }
      });
    return map;
  }, [armourPieces, activeSetSource, game]);

  // Available Set Variants for active source
  const availableSetVariants = useMemo(() => {
    if (!activeSetSource) return ['I'];
    const set = new Set<string>();
    armourPieces
      .filter((p) => p.monster_id === activeSetSource.id && p.game === game)
      .forEach((p) => set.add(p.set_variant || 'I'));
    if (set.size === 0) set.add('I');
    
    // Sort Roman numerals or alphanumeric
    return Array.from(set).sort((a, b) => {
      const idxA = ROMAN_NUMERAL_PRESETS.indexOf(a);
      const idxB = ROMAN_NUMERAL_PRESETS.indexOf(b);
      if (idxA >= 0 && idxB >= 0) return idxA - idxB;
      if (idxA >= 0) return -1;
      if (idxB >= 0) return 1;
      return a.localeCompare(b);
    });
  }, [armourPieces, activeSetSource, game]);

  // Ensure selectedSetVariant is valid
  const currentSetVariant = useMemo(() => {
    if (availableSetVariants.includes(selectedSetVariant)) {
      return selectedSetVariant;
    }
    return availableSetVariants[0] || 'I';
  }, [availableSetVariants, selectedSetVariant]);

  const currentSetName = setNameMap.get(currentSetVariant) || `Set ${currentSetVariant}`;

  // Pieces map for active source & active set variant
  const monsterPiecesMap = useMemo(() => {
    if (!activeSetSource) return new Map<ArmourSlot, DBArmourPiece>();
    const map = new Map<ArmourSlot, DBArmourPiece>();
    armourPieces
      .filter(
        (p) =>
          p.monster_id === activeSetSource.id &&
          p.game === game &&
          (p.set_variant || 'I') === currentSetVariant,
      )
      .forEach((p) => map.set(p.slot, p));
    return map;
  }, [armourPieces, activeSetSource, game, currentSetVariant]);

  const totalSkillsCount = useMemo(() => {
    let count = 0;
    monsterPiecesMap.forEach((p) => {
      count += p.skills.length;
    });
    return count;
  }, [monsterPiecesMap]);

  // Find skills that appear across pieces in this set (e.g. Set bonuses or full-set skills)
  const setSharedSkills = useMemo(() => {
    const counts = new Map<string, { count: number; maxLevel: number; unlockRarity: number | null }>();
    monsterPiecesMap.forEach((p) => {
      p.skills.forEach((s) => {
        const curr = counts.get(s.id) || { count: 0, maxLevel: s.level, unlockRarity: s.unlockRarity ?? s.unlock_rarity ?? null };
        counts.set(s.id, { 
          count: curr.count + 1, 
          maxLevel: Math.max(curr.maxLevel, s.level),
          unlockRarity: curr.unlockRarity ?? s.unlockRarity ?? s.unlock_rarity ?? null
        });
      });
    });

    return Array.from(counts.entries()).map(([skillId, { count, maxLevel, unlockRarity }]) => {
      const meta = skills.find((s) => s.id === skillId);
      return {
        skillId,
        name: meta?.name ?? skillId,
        isSetBonus: meta?.is_set_bonus ?? false,
        count,
        maxLevel,
        unlockRarity,
      };
    });
  }, [monsterPiecesMap, skills]);

  // Fast apply a skill to all 5 pieces
  async function handleApplySkillToAll(skillId: string, level: number = 1, unlockRarity: number | null = null) {
    if (!activeSetSource) return;
    const skillMeta = skills.find((s) => s.id === skillId);
    const finalLevel = skillMeta?.is_set_bonus ? 1 : level;

    await applyMutation.mutateAsync({
      game,
      monsterId: activeSetSource.id,
      setVariant: currentSetVariant,
      slots: ['helm', 'chest', 'gloves', 'waist', 'greaves'],
      skillId,
      level: finalLevel,
      unlockRarity,
      currentPiecesMap: monsterPiecesMap,
    });
  }

  // Fast remove a skill from all 5 pieces
  async function handleRemoveSkillFromAll(skillId: string) {
    if (!activeSetSource) return;
    for (const slotDef of ARMOUR_SLOTS_DEF) {
      const piece = monsterPiecesMap.get(slotDef.id);
      if (piece && piece.skills.some((s) => s.id === skillId)) {
        await removeSkillMutation.mutateAsync({
          game,
          monsterId: activeSetSource.id,
          setVariant: currentSetVariant,
          slot: slotDef.id,
          currentSkills: piece.skills,
          skillId,
        });
      }
    }
  }

  const hasDbError = Boolean(armourPiecesError || monstersError);
  const materialCount = allSetSources.filter((s) => !s.isMonster).length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left Set Sources Sidebar ── */}
      <div className="flex w-80 shrink-0 flex-col border-r border-mh-slate-700 bg-mh-slate-900/40">
        <div className="p-3 border-b border-mh-slate-700/80 space-y-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search monsters & material sets…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-2.5 text-xs text-mh-slate-200 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
            />
          </div>

          {/* Filter tabs & Add Set button */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex rounded-lg border border-mh-slate-750 bg-mh-slate-850 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={cn(
                  'rounded px-2 py-0.5 font-bold transition-all',
                  sourceFilter === 'all'
                    ? 'bg-mh-gold-500 text-mh-slate-950 shadow-xs'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                All ({allSetSources.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('monster')}
                className={cn(
                  'rounded px-2 py-0.5 font-bold transition-all',
                  sourceFilter === 'monster'
                    ? 'bg-mh-gold-500 text-mh-slate-950 shadow-xs'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                Monsters ({monsters.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('material')}
                className={cn(
                  'rounded px-2 py-0.5 font-bold transition-all',
                  sourceFilter === 'material'
                    ? 'bg-mh-gold-500 text-mh-slate-950 shadow-xs'
                    : 'text-mh-slate-400 hover:text-white',
                )}
              >
                Materials ({materialCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateNonMonsterModal(true)}
              className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 transition-all shadow-xs"
              title="Create a new material / non-monster armour set"
            >
              <Plus size={12} />
              <span>+ Material Set</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-mh-slate-800/60 p-1">
          {loadingMonsters ? (
            <div className="flex items-center justify-center p-8 text-xs text-mh-slate-500">
              <Loader2 size={16} className="animate-spin mr-2" />
              Loading armour sets…
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="p-6 text-center text-xs text-mh-slate-500 space-y-2">
              <p>No armour sets found matching query.</p>
              <button
                type="button"
                onClick={() => setShowCreateNonMonsterModal(true)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 underline"
              >
                + Create new material set
              </button>
            </div>
          ) : (
            filteredSources.map((source) => {
              const isSelected = activeSetSource?.id === source.id;
              return (
                <button
                  key={source.id}
                  onClick={() => {
                    onSelectMonster(source.id);
                    setSelectedSetVariant('I');
                  }}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all',
                    isSelected
                      ? 'bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                      : 'text-mh-slate-300 hover:bg-mh-slate-800/60 hover:text-white',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {source.icon ? (
                      <img
                        src={source.icon}
                        alt={source.name}
                        className="h-7 w-7 shrink-0 rounded-md object-contain bg-mh-slate-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold',
                        source.isMonster 
                          ? 'bg-mh-slate-800 text-mh-slate-400 border-mh-slate-700'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      )}>
                        {source.isMonster ? source.name.slice(0, 2).toUpperCase() : <Hammer size={13} />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <p className="truncate text-xs font-semibold">{source.name}</p>
                        {!source.isMonster && (
                          <span className="shrink-0 rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                            Material
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-mh-slate-500 font-mono">
                        {source.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!source.isMonster && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSourceToDelete(source);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 rounded text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title={`Delete ${source.name} set`}
                      >
                        <Trash2 size={13} />
                      </span>
                    )}
                    <ChevronRight
                      size={14}
                      className={cn(
                        'shrink-0',
                        isSelected ? 'text-mh-gold-400' : 'text-mh-slate-600',
                      )}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Armour Pieces Layout ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
        {hasDbError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <div>
              <p className="font-bold">Database Notice</p>
              <p className="text-red-300/80">
                {(armourPiecesError as Error)?.message || (monstersError as Error)?.message || 'Please make sure all Supabase SQL migrations have been executed.'}
              </p>
            </div>
          </div>
        )}

        {activeSetSource ? (
          <>
            {/* Source Overview Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4">
              <div className="flex items-center gap-4">
                {activeSetSource.icon ? (
                  <img
                    src={activeSetSource.icon}
                    alt={activeSetSource.name}
                    className="h-12 w-12 rounded-lg object-contain bg-mh-slate-800 p-1 border border-mh-slate-700"
                  />
                ) : (
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm',
                    activeSetSource.isMonster
                      ? 'bg-mh-slate-800 border-mh-slate-700 text-mh-gold-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  )}>
                    {activeSetSource.isMonster ? <Shield size={22} /> : <Hammer size={22} />}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-mh-slate-100">
                      {activeSetSource.name}
                    </h2>
                    {activeSetSource.name_ja && (
                      <span className="text-xs text-mh-slate-500">
                        ({activeSetSource.name_ja})
                      </span>
                    )}
                    <span className="rounded bg-mh-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mh-gold-400 border border-mh-slate-700">
                      {game.toUpperCase()}
                    </span>
                    {!activeSetSource.isMonster && (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                        Material Set
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowRenameModal(true)}
                      className="group/tag flex items-center gap-1.5 rounded bg-mh-gold-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mh-gold-300 border border-mh-gold-500/30 hover:bg-mh-gold-500/30 transition-all"
                      title="Click to rename this armour set"
                    >
                      <span>{currentSetName}</span>
                      <Pencil size={10} className="opacity-60 group-hover/tag:opacity-100" />
                    </button>
                  </div>
                  <p className="text-xs text-mh-slate-400">
                    {currentSetName}: 5 canonical pieces ({totalSkillsCount} total skills configured)
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs font-semibold text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-white transition-all shadow-sm"
                >
                  <Pencil size={13} className="text-mh-gold-400" />
                  <span>Rename Set...</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddSetModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs font-semibold text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-white transition-all shadow-sm"
                >
                  <Layers size={14} className="text-mh-gold-400" />
                  <span>+ New Set...</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-mh-gold-500/20 border border-mh-gold-500/40 px-4 py-2 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/30 transition-all shadow-md"
                >
                  <Sparkles size={15} className="text-mh-gold-400" />
                  <span>Add Skill / Set to All Pieces</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceToDelete(activeSetSource);
                    setShowDeleteModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-200 transition-all shadow-sm"
                  title="Delete armour set or set variant"
                >
                  <Trash2 size={13} className="text-red-400" />
                  <span>Delete Set...</span>
                </button>
              </div>
            </div>

            {/* Set Variant Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-750 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-mh-slate-400">
                  Select Set:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableSetVariants.map((sv) => {
                    const isSelected = currentSetVariant === sv;
                    const displayName = setNameMap.get(sv) || `Set ${sv}`;
                    const pieceCount = armourPieces.filter(
                      (p) =>
                        p.monster_id === activeSetSource.id &&
                        p.game === game &&
                        (p.set_variant || 'I') === sv &&
                        p.skills.length > 0,
                    ).length;

                    return (
                      <button
                        key={sv}
                        type="button"
                        onClick={() => setSelectedSetVariant(sv)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                          isSelected
                            ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm font-extrabold ring-1 ring-mh-gold-300'
                            : 'border border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-white',
                        )}
                      >
                        <span>{displayName}</span>
                        {pieceCount > 0 && (
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.2 text-[10px]',
                              isSelected
                                ? 'bg-mh-slate-950/20 text-mh-slate-900 font-black'
                                : 'bg-mh-slate-700 text-mh-slate-300 font-semibold',
                            )}
                          >
                            {pieceCount}/5 pcs
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Delete Variant option */}
              {availableSetVariants.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceToDelete(activeSetSource);
                    setShowDeleteModal(true);
                  }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  title={`Delete ${currentSetName}`}
                >
                  <Trash2 size={13} />
                  <span>Delete {currentSetName}</span>
                </button>
              )}
            </div>

            {/* ── Prominent Full-Set Skills & Inks Broadcaster Toolbar ── */}
            <div className="rounded-xl border border-mh-gold-500/30 bg-mh-gold-500/5 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-mh-gold-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-mh-gold-300">
                    Full-Set Inks & Shared Skills
                  </span>
                  <span className="text-[11px] text-mh-slate-400">
                    (Manage inherent set effects and skills across all 5 pieces of {currentSetName})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3.5 py-1.5 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-all shadow-sm"
                >
                  <Plus size={13} />
                  <span>+ Add Skill / Set Effect to All 5 Pieces</span>
                </button>
              </div>

              {/* Shared / Active Inks List */}
              {setSharedSkills.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {setSharedSkills.map((sk) => (
                    <div
                      key={sk.skillId}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition-all',
                        sk.count === 5
                          ? 'border-mh-gold-500/40 bg-mh-slate-900 text-mh-gold-300'
                          : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{sk.name}</span>
                        {sk.unlockRarity && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/40">
                            R{sk.unlockRarity}
                          </span>
                        )}
                        {sk.isSetBonus ? (
                          <span className="rounded bg-mh-gold-500/20 px-1 py-0.2 text-[9px] font-bold text-mh-gold-300">
                            Set Effect
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-mh-slate-400">Lv {sk.maxLevel}</span>
                        )}
                        <span
                          className={cn(
                            'rounded px-1 text-[9px] font-bold',
                            sk.count === 5
                              ? 'bg-mh-gold-500/20 text-mh-gold-300'
                              : 'bg-mh-slate-700 text-mh-slate-300',
                          )}
                        >
                          {sk.count}/5 pcs
                        </span>
                      </div>

                      {sk.count < 5 && (
                        <button
                          type="button"
                          onClick={() => handleApplySkillToAll(sk.skillId, sk.maxLevel, sk.unlockRarity)}
                          className="text-[10px] text-mh-gold-400 hover:text-mh-gold-300 underline font-semibold"
                          title="Apply to all 5 pieces"
                        >
                          Sync to all 5
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveSkillFromAll(sk.skillId)}
                        className="rounded p-0.5 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title={`Remove ${sk.name} from all pieces`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-mh-slate-500 italic">
                  No shared skills or Inks added yet. Click "+ Add Skill / Set Effect to All 5 Pieces" to broadcast an Ink or set effect across this entire set.
                </p>
              )}
            </div>

            {/* 5 Piece Cards Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {ARMOUR_SLOTS_DEF.map((slotDef) => (
                <ArmourSlotCard
                  key={slotDef.id}
                  game={game}
                  source={activeSetSource}
                  setVariant={currentSetVariant}
                  setName={currentSetName}
                  slotDef={slotDef}
                  piece={monsterPiecesMap.get(slotDef.id)}
                  availableSkills={skills}
                  onOpenImageModal={(s) => setActiveSlotForImageModal(s)}
                  onApplySkillToAllPieces={handleApplySkillToAll}
                />
              ))}
            </div>

            {/* Piece Image Modal (Single instance mounted only when active) */}
            {activeSlotForImageModal && (
              <PieceImageModal
                game={game}
                source={activeSetSource}
                setVariant={currentSetVariant}
                setName={currentSetName}
                slotDef={activeSlotForImageModal}
                piece={monsterPiecesMap.get(activeSlotForImageModal.id)}
                onClose={() => setActiveSlotForImageModal(null)}
              />
            )}

            {/* Bulk Apply Modal */}
            {showBulkModal && (
              <BulkApplySkillModal
                game={game}
                source={activeSetSource}
                setVariant={currentSetVariant}
                setName={currentSetName}
                availableSkills={skills}
                monsterPiecesMap={monsterPiecesMap}
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
              />
            )}

            {/* Add / Clone Set Modal */}
            {showAddSetModal && (
              <AddSetModal
                game={game}
                source={activeSetSource}
                existingSets={availableSetVariants}
                availableSkills={skills}
                armourPieces={armourPieces}
                open={showAddSetModal}
                onClose={() => setShowAddSetModal(false)}
                onCreated={(newVariant) => {
                  setSelectedSetVariant(newVariant);
                }}
              />
            )}

            {/* Rename Set Modal */}
            {showRenameModal && (
              <RenameSetModal
                game={game}
                source={activeSetSource}
                setVariant={currentSetVariant}
                currentSetName={currentSetName}
                open={showRenameModal}
                onClose={() => setShowRenameModal(false)}
              />
            )}

            {/* Delete Armour Modal */}
            {showDeleteModal && (
              <DeleteArmourModal
                game={game}
                source={sourceToDelete || activeSetSource}
                currentSetVariant={currentSetVariant}
                currentSetName={currentSetName}
                availableSetVariants={availableSetVariants}
                open={showDeleteModal}
                onClose={() => {
                  setShowDeleteModal(false);
                  setSourceToDelete(null);
                }}
                onDeleted={(deletedEntire) => {
                  if (deletedEntire) {
                    const remaining = allSetSources.filter(
                      (s) => s.id !== (sourceToDelete?.id || activeSetSource.id),
                    );
                    if (remaining.length > 0) {
                      onSelectMonster(remaining[0].id);
                    }
                  } else {
                    const remainingVariants = availableSetVariants.filter(
                      (v) => v !== currentSetVariant,
                    );
                    setSelectedSetVariant(remainingVariants[0] || 'I');
                  }
                }}
              />
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center text-mh-slate-500">
            <Shield size={48} className="mb-2 opacity-40" />
            <p className="text-sm font-semibold">Select an armour set from the list</p>
            <p className="text-xs text-mh-slate-600">
              Configure skills and piece images on each of its 5 armour pieces.
            </p>
          </div>
        )}
      </div>

      {/* Create Non-Monster Set Modal */}
      {showCreateNonMonsterModal && (
        <CreateNonMonsterSetModal
          game={game}
          existingSetIds={allSetSources.map((s) => s.id)}
          open={showCreateNonMonsterModal}
          onClose={() => setShowCreateNonMonsterModal(false)}
          onCreated={(newId) => {
            onSelectMonster(newId);
            setSelectedSetVariant('I');
          }}
        />
      )}
    </div>
  );
}
