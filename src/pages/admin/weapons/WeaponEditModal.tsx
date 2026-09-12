// ─────────────────────────────────────────────────────────────
// WeaponEditModal — Modal for creating & editing craftable equipment weapons
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  X,
  Sword,
  Search,
  Upload,
  Sparkles,
  Loader2,
  Plus,
  Check,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  Skull,
  Shield,
  Link as LinkIcon,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponUpsert,
  type WeaponSourceType,
  type WeaponElementType,
  type WeaponSkill,
  WEAPON_ELEMENT_CONFIG,
  getRarityBadgeStyle,
} from '../../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../../data/core/weapon-types';
import { useAdminMonsters } from '../../../hooks/useAdminMonsters';
import { useAdminSkills } from '../../../hooks/useAdminSkills';
import {
  useUpsertWeapon,
  uploadWeaponImage,
} from '../../../hooks/useAdminWeapons';
import { cn } from '../../../lib/utils';

const ELEMENT_ICONS: Record<WeaponElementType, React.ComponentType<{ size?: number; className?: string }>> = {
  raw: Shield,
  fire: Flame,
  water: Droplets,
  thunder: Zap,
  ice: Snowflake,
  dragon: Sparkles,
  poison: Skull,
  paralysis: Zap,
  blast: Flame,
  sleep: Snowflake,
};

interface Props {
  game: string;
  weapon: DBWeapon | null | 'new';
  open: boolean;
  onClose: () => void;
}

export default function WeaponEditModal({
  game: defaultGame,
  weapon,
  open,
  onClose,
}: Props) {
  const isNew = weapon === 'new';
  const initialData = isNew ? null : weapon;

  const [game, setGame] = useState<string>(initialData?.game || defaultGame);
  const [name, setName] = useState<string>(initialData?.name || '');
  const [nameJa, setNameJa] = useState<string>(initialData?.name_ja || '');
  const [upgradedName, setUpgradedName] = useState<string>(initialData?.upgraded_name || '');
  const [upgradedNameJa, setUpgradedNameJa] = useState<string>(initialData?.upgraded_name_ja || '');
  const [upgradeLevel, setUpgradeLevel] = useState<number | null>(initialData?.upgrade_level || null);
  const [customId, setCustomId] = useState<string>(initialData?.id || '');
  const [rarity, setRarity] = useState<number>(initialData?.rarity ?? initialData?.grade ?? 1);
  const [weaponTypeId, setWeaponTypeId] = useState<string>(initialData?.weapon_type_id || 'great_sword');
  const [sourceType, setSourceType] = useState<WeaponSourceType>(initialData?.source_type || 'monster');
  const [monsterId, setMonsterId] = useState<string>(initialData?.monster_id || '');
  const [elementType, setElementType] = useState<WeaponElementType>(initialData?.element_type || 'raw');
  const [specialSkill, setSpecialSkill] = useState<string>(initialData?.special_skill || '');
  const [image, setImage] = useState<string | null>(initialData?.image || null);
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [sortOrder, setSortOrder] = useState<number>(initialData?.sort_order || 0);
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active ?? true);

  // Attached Skills state
  const [skills, setSkills] = useState<WeaponSkill[]>(initialData?.skills || []);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [newSkillId, setNewSkillId] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(1);
  const [newSkillUnlockRarity, setNewSkillUnlockRarity] = useState<number | null>(null);

  // Image Upload state with Drag & Drop
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useManualUrl, setUseManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: monsters = [] } = useAdminMonsters({ game, isActive: true });
  const { data: dbSkills = [] } = useAdminSkills({ game, isActive: true });
  const upsertMutation = useUpsertWeapon();

  // Auto-generate ID slug for new weapons
  useEffect(() => {
    if (isNew && name.trim()) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setCustomId(`${weaponTypeId}_${slug}`);
    }
  }, [isNew, name, weaponTypeId]);

  // Set default special skill from weapon type if not specified
  useEffect(() => {
    if (isNew && !specialSkill) {
      const wt = WEAPON_TYPES.find((w) => w.id === weaponTypeId);
      if (wt?.specialSkill) {
        setSpecialSkill(wt.specialSkill);
      }
    }
  }, [isNew, weaponTypeId, specialSkill]);

  if (!open) return null;

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, SVG)');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const weaponSlug = customId || 'weapon';
      const publicUrl = await uploadWeaponImage(file, weaponSlug);
      setImage(publicUrl);
    } catch (err: unknown) {
      console.error('Failed to upload weapon image:', err);
      setUploadError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  function handleAddSkill() {
    if (!newSkillId) return;
    const cleanUR = newSkillUnlockRarity && newSkillUnlockRarity > 1 ? Number(newSkillUnlockRarity) : null;
    const existingIdx = skills.findIndex(
      (s) => s.id === newSkillId && (s.unlock_rarity ?? s.unlockRarity ?? null) === cleanUR,
    );

    if (existingIdx >= 0) {
      setSkills((prev) =>
        prev.map((s, idx) =>
          idx === existingIdx ? { ...s, level: newSkillLevel, unlock_rarity: cleanUR, unlockRarity: cleanUR } : s,
        ),
      );
    } else {
      setSkills((prev) => [
        ...prev,
        { id: newSkillId, level: newSkillLevel, unlock_rarity: cleanUR, unlockRarity: cleanUR },
      ]);
    }

    setNewSkillId('');
    setNewSkillLevel(1);
    setNewSkillUnlockRarity(null);
    setShowSkillPicker(false);
  }

  function handleRemoveSkill(index: number) {
    setSkills((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleSkillLevelChange(index: number, lvl: number) {
    setSkills((prev) => prev.map((s, idx) => (idx === index ? { ...s, level: lvl } : s)));
  }

  function handleSkillUnlockRarityChange(index: number, ur: number | null) {
    const cleanUR = ur && ur > 1 ? Number(ur) : null;
    setSkills((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, unlock_rarity: cleanUR, unlockRarity: cleanUR } : s)),
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !customId.trim()) return;

    const payload: WeaponUpsert = {
      id: customId.trim(),
      game,
      name: name.trim(),
      name_ja: nameJa.trim() || null,
      upgraded_name: upgradedName.trim() || null,
      upgraded_name_ja: upgradedNameJa.trim() || null,
      upgrade_level: upgradeLevel ? Number(upgradeLevel) : null,
      weapon_type_id: weaponTypeId,
      monster_id: sourceType === 'monster' && monsterId ? monsterId : null,
      source_type: sourceType,
      element_type: elementType,
      skills,
      special_skill: specialSkill.trim() || null,
      image: image ? image.trim() : null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      rarity: Number(rarity) || 1,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
    };

    await upsertMutation.mutateAsync(payload);
    onClose();
  }

  const selectedTypeObj = WEAPON_TYPES.find((w) => w.id === weaponTypeId);
  const selectedMonsterObj = monsters.find((m) => m.id === monsterId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl rounded-2xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 bg-mh-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30">
              <Sword size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-mh-slate-100">
                {isNew ? 'Create New Weapon' : `Edit Weapon: ${initialData?.name}`}
              </h2>
              <p className="text-xs text-mh-slate-500">
                Configure equipment weapon, element/status affinity, special skill, crafting source, and attached skills.
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Game & Core Identification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Game */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-400 mb-1.5">
                Target Game
              </label>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs font-semibold text-mh-slate-200 focus:border-mh-gold-500/50 focus:outline-none"
              >
                <option value="mho">Monster Hunter Outlanders (MHO)</option>
                <option value="mhn">Monster Hunter Now (MHN)</option>
              </select>
            </div>

            {/* Weapon Type */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-400 mb-1.5">
                Weapon Type (Franchise Category)
              </label>
              <select
                value={weaponTypeId}
                onChange={(e) => setWeaponTypeId(e.target.value)}
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs font-bold text-mh-gold-400 focus:border-mh-gold-500/50 focus:outline-none"
              >
                {WEAPON_TYPES.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name} ({wt.category.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name, JP Name & ID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-400 mb-1.5">
                Crafted Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Buster Sword"
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-400 mb-1.5">
                Japanese Name
              </label>
              <input
                type="text"
                value={nameJa}
                onChange={(e) => setNameJa(e.target.value)}
                placeholder="e.g. バスターソード"
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-400 mb-1.5">
                Unique Identifier (ID) *
              </label>
              <input
                type="text"
                required
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="great_sword_buster_sword"
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs font-mono text-mh-gold-400 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Upgraded Form Progression (Optional) */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Upgraded Form Progression (Optional)
              </span>
              <span className="text-[10px] text-mh-slate-400">
                Shown when the weapon is upgraded to a higher level
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-mh-slate-300 mb-1">
                  Upgraded Form Name
                </label>
                <input
                  type="text"
                  value={upgradedName}
                  onChange={(e) => setUpgradedName(e.target.value)}
                  placeholder="e.g. Buster Blade"
                  className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-850 px-3 py-2 text-xs text-mh-slate-100 placeholder:text-mh-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mh-slate-400 mb-1">
                  Upgraded Japanese Name
                </label>
                <input
                  type="text"
                  value={upgradedNameJa}
                  onChange={(e) => setUpgradedNameJa(e.target.value)}
                  placeholder="e.g. バスターブレイド"
                  className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-850 px-3 py-2 text-xs text-mh-slate-300 placeholder:text-mh-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mh-slate-300 mb-1">
                  Upgrade Level / Grade
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={upgradeLevel ?? ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setUpgradeLevel(isNaN(val) ? null : val);
                    }}
                    placeholder="e.g. 5"
                    className="w-20 rounded-xl border border-mh-slate-700 bg-mh-slate-850 px-3 py-2 text-xs font-mono font-bold text-amber-300 placeholder:text-mh-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    {[5, 6, 8, 10].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setUpgradeLevel(lvl)}
                        className={cn(
                          'rounded px-2 py-1 text-[10px] font-bold transition-colors',
                          upgradeLevel === lvl
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-mh-slate-800 text-mh-slate-400 hover:text-white',
                        )}
                      >
                        Lv{lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drag & Drop Weapon Image Upload */}
          <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Weapon Image Artwork
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUseManualUrl((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] text-mh-slate-400 hover:text-mh-gold-400 transition-colors"
                >
                  <LinkIcon size={12} />
                  <span>{useManualUrl ? 'Use Drag & Drop Upload' : 'Enter URL instead'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImage(`/images/weapons/${weaponTypeId}.svg`)}
                  className="text-[11px] text-mh-gold-400 hover:underline"
                >
                  Use {selectedTypeObj?.name || 'Type'} Icon
                </button>
              </div>
            </div>

            {useManualUrl ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={image ?? ''}
                  onChange={(e) => setImage(e.target.value || null)}
                  placeholder="https://... or /images/weapons/great_sword.svg"
                  className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
                />
                {image && (
                  <div className="flex items-center gap-3 rounded-lg border border-mh-slate-800 bg-mh-slate-900/60 p-2">
                    <img
                      src={image}
                      alt="Weapon Preview"
                      className="h-12 w-12 rounded-lg object-contain bg-mh-slate-800 p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-emerald-400 font-semibold">Image URL Set</p>
                      <p className="text-[10px] text-mh-slate-500 truncate">{image}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all duration-150',
                  isDragging
                    ? 'border-mh-gold-400 bg-mh-gold-500/10'
                    : image
                    ? 'border-mh-gold-500/40 bg-mh-gold-500/5 hover:border-mh-gold-500/60'
                    : 'border-mh-slate-750 bg-mh-slate-900/40 hover:border-mh-slate-600 hover:bg-mh-slate-900/60',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 size={24} className="animate-spin text-mh-gold-400" />
                    <p className="text-xs text-mh-slate-400">Uploading weapon artwork to Storage...</p>
                  </div>
                ) : image ? (
                  <div className="flex w-full items-center gap-4">
                    <img
                      src={image}
                      alt="Uploaded weapon"
                      className="h-16 w-16 shrink-0 rounded-xl object-contain bg-mh-slate-800 border border-mh-gold-500/30 p-1.5 shadow-md"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-mh-gold-300">
                        <Check size={14} className="text-mh-gold-400" />
                        <span>Artwork Attached</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-mh-slate-400">{image}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[11px] text-mh-slate-400 group-hover:text-mh-gold-400 transition-colors">
                          Click or drop new image to replace
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImage(null);
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
                        Upload weapon image
                      </p>
                      <p className="mt-0.5 text-[11px] text-mh-slate-500">
                        Drag &amp; drop image here, or click to browse
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          </div>

          {/* Crafting Origin / Source Type & Associated Monster */}
          <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Crafting Source &amp; Monster Origin
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Type */}
              <div>
                <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
                  Source Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'monster', label: 'Monster Craft' },
                      { id: 'ore', label: 'Ore / Iron' },
                      { id: 'bone', label: 'Bone' },
                      { id: 'event', label: 'Event / Special' },
                      { id: 'general', label: 'General / Other' },
                    ] as const
                  ).map((s) => {
                    const isSelected = sourceType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSourceType(s.id)}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-left transition-all',
                          isSelected
                            ? 'border-mh-gold-500 bg-mh-gold-500/20 text-mh-gold-300 shadow-sm'
                            : 'border-mh-slate-750 bg-mh-slate-850 text-mh-slate-400 hover:border-mh-slate-600 hover:text-white',
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Associated Monster */}
              <div>
                <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
                  Associated Monster {sourceType !== 'monster' && '(Optional)'}
                </label>
                <select
                  value={monsterId}
                  onChange={(e) => setMonsterId(e.target.value)}
                  className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 focus:border-mh-gold-500/50 focus:outline-none"
                >
                  <option value="">No Monster (Ore / Bone / Event / General)</option>
                  {monsters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.name_ja ? `(${m.name_ja})` : ''}
                    </option>
                  ))}
                </select>
                {selectedMonsterObj && (
                  <p className="text-[11px] text-orange-400 mt-1">
                    Monster: {selectedMonsterObj.name} ({selectedMonsterObj.species || 'Large Monster'})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Starting Equipment Rarity */}
          <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                Starting Equipment Rarity
              </label>
              <span className={cn(
                'rounded px-2.5 py-0.5 text-xs font-bold border shadow-xs',
                getRarityBadgeStyle(rarity).bg,
                getRarityBadgeStyle(rarity).text,
                getRarityBadgeStyle(rarity).border,
              )}>
                Rarity {rarity} ({getRarityBadgeStyle(rarity).label})
              </span>
            </div>
            <p className="text-[11px] text-mh-slate-400">
              The starting equipment grade or rarity value (used for sorting and upgrade scaling).
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => {
                const isSelected = rarity === r;
                const rStyle = getRarityBadgeStyle(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRarity(r)}
                    className={cn(
                      'flex items-center justify-center rounded-lg border py-1.5 text-xs font-bold transition-all',
                      isSelected
                        ? `${rStyle.bg} ${rStyle.text} ${rStyle.border} ring-1 ring-current/40 shadow-xs scale-105`
                        : 'border-mh-slate-750 bg-mh-slate-850 text-mh-slate-400 hover:border-mh-slate-600 hover:text-white',
                    )}
                  >
                    R{r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Elemental & Special Skill */}
          <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              Elemental Affinity &amp; Special Skill
            </h4>

            {/* Element / Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
                Element / Status Affinity
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(Object.entries(WEAPON_ELEMENT_CONFIG) as [WeaponElementType, (typeof WEAPON_ELEMENT_CONFIG)[WeaponElementType]][]).map(
                  ([elKey, elVal]) => {
                    const isSelected = elementType === elKey;
                    const ElIcon = ELEMENT_ICONS[elKey] || Shield;
                    return (
                      <button
                        key={elKey}
                        type="button"
                        onClick={() => setElementType(elKey)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all',
                          isSelected
                            ? cn(elVal.bg, elVal.text, 'border-mh-gold-400 ring-1 ring-mh-gold-400/50 shadow-sm')
                            : 'border-mh-slate-750 bg-mh-slate-850 text-mh-slate-400 hover:border-mh-slate-600 hover:text-white',
                        )}
                      >
                        <ElIcon size={12} className={elVal.color} />
                        <span className="truncate">{elVal.label}</span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Special Skill */}
            <div>
              <label className="block text-xs font-semibold text-mh-slate-400 mb-1">
                Special Skill
              </label>
              <input
                type="text"
                value={specialSkill}
                onChange={(e) => setSpecialSkill(e.target.value)}
                placeholder="e.g. True Charged Slash, Spirit Helm Breaker"
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Attached Weapon Skills with Unlock Rarity Levels */}
          <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                  Weapon Skills &amp; Rarity Unlock Requirements
                </h4>
                <p className="text-[11px] text-mh-slate-500">
                  Attached passive skills with optional upgrade unlock rarity levels (e.g. Base, R6, R8, R9, R12).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSkillPicker(true)}
                className="flex items-center gap-1 rounded-lg border border-mh-gold-500/40 bg-mh-gold-500/10 px-2.5 py-1 text-xs font-bold text-mh-gold-400 hover:bg-mh-gold-500/20 transition-all"
              >
                <Plus size={13} />
                <span>Add Skill</span>
              </button>
            </div>

            {/* Inline Skill Adder */}
            {showSkillPicker && (
              <div className="rounded-xl border border-mh-gold-500/30 bg-mh-slate-900 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mh-gold-400">Attach Skill to Weapon</span>
                  <button
                    type="button"
                    onClick={() => setShowSkillPicker(false)}
                    className="text-mh-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search skills…"
                    className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-2.5 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:outline-none focus:border-mh-gold-500/50"
                  />
                </div>

                {/* Skill List Dropdown */}
                <div className="max-h-36 overflow-y-auto space-y-1 rounded border border-mh-slate-750 bg-mh-slate-950/50 p-1">
                  {dbSkills
                    .filter(
                      (s) =>
                        s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
                        s.id.toLowerCase().includes(skillSearch.toLowerCase()),
                    )
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setNewSkillId(s.id);
                          setNewSkillLevel(1);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors',
                          newSkillId === s.id
                            ? 'bg-mh-gold-500/20 text-mh-gold-300 font-bold'
                            : 'text-mh-slate-300 hover:bg-mh-slate-800',
                        )}
                      >
                        <span>{s.name}</span>
                        <span className="text-[10px] text-mh-slate-500 font-mono">
                          Lv Max {s.max_levels[game] ?? 5}
                        </span>
                      </button>
                    ))}
                </div>

                {/* Level and Unlock Rarity Configuration */}
                {newSkillId && (
                  <div className="space-y-2 pt-2 border-t border-mh-slate-800">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-mh-slate-400">Skill Level:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setNewSkillLevel(lvl)}
                            className={cn(
                              'h-6 w-6 rounded text-xs font-bold transition-all',
                              newSkillLevel === lvl
                                ? 'bg-mh-gold-500 text-mh-slate-950 font-black'
                                : 'bg-mh-slate-800 text-mh-slate-400 hover:bg-mh-slate-700 hover:text-white',
                            )}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-mh-slate-400">Unlock Level/Rarity:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { label: 'Base', val: null },
                          { label: 'Lv5', val: 5 },
                          { label: 'Lv6', val: 6 },
                          { label: 'Lv8', val: 8 },
                          { label: 'Lv10', val: 10 },
                          { label: 'Lv12', val: 12 },
                          { label: 'Lv13', val: 13 },
                          { label: 'Lv14', val: 14 },
                          { label: 'Lv15', val: 15 },
                          { label: 'Lv16', val: 16 },
                        ].map((r) => (
                          <button
                            key={r.label}
                            type="button"
                            onClick={() => setNewSkillUnlockRarity(r.val)}
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                              newSkillUnlockRarity === r.val
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                : 'bg-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-700',
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                        <input
                          type="number"
                          min={1}
                          max={50}
                          placeholder="Lv..."
                          value={newSkillUnlockRarity && ![5, 6, 8, 10, 12, 13, 14, 15, 16].includes(newSkillUnlockRarity) ? newSkillUnlockRarity : ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setNewSkillUnlockRarity(isNaN(val) || val <= 1 ? null : val);
                          }}
                          className="w-12 rounded border border-mh-slate-700 bg-mh-slate-900 px-1 py-0.5 text-[10px] text-mh-slate-200 text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="rounded-lg bg-mh-gold-500 px-3.5 py-1.5 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 transition-all shadow-sm"
                      >
                        Confirm Attach
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Skills List */}
            {skills.length === 0 ? (
              <p className="text-xs text-mh-slate-500 italic py-2">
                No skills currently attached to this weapon.
              </p>
            ) : (
              <div className="space-y-2">
                {skills.map((s, idx) => {
                  const meta = dbSkills.find((d) => d.id === s.id);
                  const skillName = meta?.name ?? s.id;
                  const ur = s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null;
                  const isLocked = Boolean(ur && ur > 1);

                  return (
                    <div
                      key={`${s.id}-${ur}-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-mh-slate-750 bg-mh-slate-900/80 px-3.5 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles size={13} className="text-mh-gold-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-mh-slate-200">{skillName}</span>
                          <span className="ml-1 text-[10px] font-mono text-mh-slate-500">
                            ({s.id})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Unlock Level Selector */}
                        <select
                          value={ur ?? ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handleSkillUnlockRarityChange(idx, isNaN(val) || val <= 1 ? null : val);
                          }}
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[10px] font-bold outline-none',
                            isLocked
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-mh-slate-950 text-mh-slate-400 border-mh-slate-700',
                          )}
                        >
                          <option value="">Base</option>
                          <option value="5">Lv 5</option>
                          <option value="6">Lv 6</option>
                          <option value="8">Lv 8</option>
                          <option value="10">Lv 10</option>
                          <option value="12">Lv 12</option>
                          <option value="13">Lv 13</option>
                          <option value="14">Lv 14</option>
                          <option value="15">Lv 15</option>
                          <option value="16">Lv 16</option>
                          {ur && ![5, 6, 8, 10, 12, 13, 14, 15, 16].includes(ur) && (
                            <option value={ur}>Lv {ur}</option>
                          )}
                        </select>

                        {/* Level selector */}
                        <div className="flex items-center gap-0.5 rounded bg-mh-slate-950 p-0.5 border border-mh-slate-750">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleSkillLevelChange(idx, lvl)}
                              className={cn(
                                'h-5 w-5 rounded text-[10px] font-bold transition-all',
                                s.level === lvl
                                  ? 'bg-mh-gold-500 text-mh-slate-950 font-black'
                                  : 'text-mh-slate-400 hover:text-white',
                              )}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(idx)}
                          className="rounded p-1 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description & Field Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-400 mb-1">
                Description &amp; Lore
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Weapon description or flavor lore…"
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-400 mb-1">
                Field Guide Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Extra crafting notes or upgrade details…"
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Sorting & Active Status */}
          <div className="flex items-center justify-between border-t border-mh-slate-800 pt-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold text-mh-slate-400 mb-0.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-20 rounded-lg border border-mh-slate-750 bg-mh-slate-800 px-2 py-1 text-xs font-mono text-mh-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <input
                  type="checkbox"
                  id="weaponActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-mh-slate-700 bg-mh-slate-800 text-mh-gold-500 focus:ring-0"
                />
                <label htmlFor="weaponActive" className="text-xs font-bold text-mh-slate-300 cursor-pointer">
                  Active in Field Guide
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="border-t border-mh-slate-750 bg-mh-slate-950/90 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={upsertMutation.isPending || !name.trim() || !customId.trim()}
            className="flex items-center gap-2 rounded-xl bg-mh-gold-500 px-5 py-2 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-all shadow-sm"
          >
            {upsertMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving Weapon…</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{isNew ? 'Create Weapon' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
