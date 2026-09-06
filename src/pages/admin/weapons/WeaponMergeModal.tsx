// ─────────────────────────────────────────────────────────────
// WeaponMergeModal — Merge two weapons (Younger/Base & Older/Upgraded)
// Consolidates upgrade names, level thresholds, skills, and migrates DB references.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react';
import {
  GitMerge,
  X,
  AlertTriangle,
  Sword,
  Sparkles,
  Layers,
  Search,
} from 'lucide-react';
import type { DBWeapon, WeaponSkill } from '../../../data/schemas/weapon';
import { useAdminSkills } from '../../../hooks/useAdminSkills';
import { useMergeWeapons, type MergeWeaponsPayload } from '../../../hooks/useAdminWeapons';
import { cn } from '../../../lib/utils';

interface Props {
  open: boolean;
  weapons: DBWeapon[];
  initialBaseWeapon?: DBWeapon | null;
  initialUpgradedWeapon?: DBWeapon | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WeaponMergeModal({
  open,
  weapons,
  initialBaseWeapon,
  initialUpgradedWeapon,
  onClose,
  onSuccess,
}: Props) {
  const [baseId, setBaseId] = useState<string>('');
  const [upgradedId, setUpgradedId] = useState<string>('');

  // Search queries for dropdowns
  const [baseSearch, setBaseSearch] = useState('');
  const [upgradedSearch, setUpgradedSearch] = useState('');

  // Merged output state
  const [upgradedName, setUpgradedName] = useState('');
  const [upgradedNameJa, setUpgradedNameJa] = useState('');
  const [upgradeLevel, setUpgradeLevel] = useState<number | null>(null);
  const [keepImageFrom, setKeepImageFrom] = useState<'base' | 'upgraded'>('upgraded');
  const [keepDescriptionFrom, setKeepDescriptionFrom] = useState<'base' | 'upgraded'>('base');
  const [mergedSkills, setMergedSkills] = useState<WeaponSkill[]>([]);

  const { data: dbSkills = [] } = useAdminSkills({ isActive: true });
  const mergeMutation = useMergeWeapons();

  const baseWeapon = useMemo(() => weapons.find((w) => w.id === baseId), [weapons, baseId]);
  const upgradedWeapon = useMemo(() => weapons.find((w) => w.id === upgradedId), [weapons, upgradedId]);

  // Set initial selections when opened
  useEffect(() => {
    if (open) {
      if (initialBaseWeapon) setBaseId(initialBaseWeapon.id);
      if (initialUpgradedWeapon) setUpgradedId(initialUpgradedWeapon.id);
    }
  }, [open, initialBaseWeapon, initialUpgradedWeapon]);

  // When base or upgraded weapon changes, recalculate default merge properties
  useEffect(() => {
    if (baseWeapon && upgradedWeapon) {
      // Upgraded name defaults to the older weapon's name (or its existing upgraded_name)
      setUpgradedName(upgradedWeapon.upgraded_name || upgradedWeapon.name);
      setUpgradedNameJa(upgradedWeapon.upgraded_name_ja || upgradedWeapon.name_ja || '');
      
      // Default upgrade level: older weapon's rarity or 5
      const suggestedLevel = upgradedWeapon.upgrade_level || upgradedWeapon.rarity || 5;
      setUpgradeLevel(suggestedLevel);

      // Default to upgraded weapon image if it exists, otherwise base
      setKeepImageFrom(upgradedWeapon.image ? 'upgraded' : 'base');
      setKeepDescriptionFrom(baseWeapon.description ? 'base' : 'upgraded');

      // Consolidate skills:
      // 1. Keep all skills from base weapon
      const combined: WeaponSkill[] = baseWeapon.skills.map((s) => ({ ...s }));

      // 2. For each skill in upgraded weapon, check if it already exists in base
      upgradedWeapon.skills.forEach((upSkill) => {
        const existingIdx = combined.findIndex((s) => s.id === upSkill.id);
        if (existingIdx === -1) {
          // New skill from upgrade: assign the suggested upgrade level
          combined.push({
            ...upSkill,
            unlock_level: upSkill.unlock_level ?? upSkill.unlock_rarity ?? suggestedLevel,
            unlock_rarity: upSkill.unlock_level ?? upSkill.unlock_rarity ?? suggestedLevel,
            unlockLevel: upSkill.unlock_level ?? upSkill.unlock_rarity ?? suggestedLevel,
            unlockRarity: upSkill.unlock_level ?? upSkill.unlock_rarity ?? suggestedLevel,
          });
        } else if (upSkill.level > combined[existingIdx].level) {
          // Higher level in upgrade: either replace or keep higher
          combined[existingIdx] = {
            ...combined[existingIdx],
            level: upSkill.level,
            unlock_level: upSkill.unlock_level ?? upSkill.unlock_rarity ?? suggestedLevel,
            unlock_rarity: upSkill.unlock_level ?? upSkill.unlock_rarity ?? suggestedLevel,
          };
        }
      });

      setMergedSkills(combined);
    } else if (baseWeapon && !upgradedWeapon) {
      setUpgradedName(baseWeapon.upgraded_name || '');
      setUpgradedNameJa(baseWeapon.upgraded_name_ja || '');
      setUpgradeLevel(baseWeapon.upgrade_level || null);
      setMergedSkills(baseWeapon.skills || []);
    }
  }, [baseWeapon, upgradedWeapon]);

  if (!open) return null;

  const filteredBaseList = weapons
    .filter((w) => w.id !== upgradedId)
    .filter((w) => !baseSearch || w.name.toLowerCase().includes(baseSearch.toLowerCase()) || w.id.toLowerCase().includes(baseSearch.toLowerCase()));

  const filteredUpgradedList = weapons
    .filter((w) => w.id !== baseId)
    .filter((w) => !upgradedSearch || w.name.toLowerCase().includes(upgradedSearch.toLowerCase()) || w.id.toLowerCase().includes(upgradedSearch.toLowerCase()));

  async function handleConfirmMerge() {
    if (!baseWeapon || !upgradedWeapon) return;
    if (!upgradedName.trim()) return;

    const payload: MergeWeaponsPayload = {
      baseWeaponId: baseWeapon.id,
      upgradedWeaponId: upgradedWeapon.id,
      upgradedName: upgradedName.trim(),
      upgradedNameJa: upgradedNameJa.trim() || null,
      upgradeLevel,
      mergedSkills,
      keepImageFrom,
      keepDescriptionFrom,
    };

    try {
      await mergeMutation.mutateAsync(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to merge weapons:', err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl rounded-3xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 bg-mh-slate-950/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
              <GitMerge size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-mh-slate-100 flex items-center gap-2">
                Merge Weapon Progression
                <span className="text-xs font-normal text-mh-slate-400 bg-mh-slate-800 border border-mh-slate-700 px-2 py-0.5 rounded-full">
                  Base + Upgraded Form
                </span>
              </h2>
              <p className="text-xs text-mh-slate-400">
                Consolidate two weapon records into a single weapon with its crafted &amp; upgraded form names.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Select Weapons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Base / Younger Weapon */}
            <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-850/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  1. Base / Crafted Form (Keep Record)
                </span>
                {baseWeapon && (
                  <span className="text-[10px] font-mono text-mh-slate-500">
                    ID: {baseWeapon.id}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
                  <input
                    type="text"
                    placeholder="Search base weapon..."
                    value={baseSearch}
                    onChange={(e) => setBaseSearch(e.target.value)}
                    className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-900 py-1 pl-7 pr-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500"
                  />
                </div>

                <select
                  value={baseId}
                  onChange={(e) => setBaseId(e.target.value)}
                  className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-900 px-3 py-2 text-xs text-mh-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Base Weapon --</option>
                  {filteredBaseList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (R{w.rarity}) [{w.id}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Base Weapon Preview */}
              {baseWeapon && (
                <div className="flex items-center gap-3 rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-3">
                  <div className="h-12 w-12 rounded-lg bg-mh-slate-950 border border-mh-slate-750 p-1 flex items-center justify-center shrink-0">
                    {baseWeapon.image ? (
                      <img src={baseWeapon.image} alt={baseWeapon.name} className="h-full w-full object-contain" />
                    ) : (
                      <Sword size={20} className="text-mh-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-mh-slate-100 truncate">{baseWeapon.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-mh-slate-400">
                      <span>Rarity {baseWeapon.rarity}</span>
                      <span>•</span>
                      <span>{baseWeapon.skills.length} skills</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upgraded / Older Weapon */}
            <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-850/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  2. Upgraded / Older Form (Merge &amp; Remove)
                </span>
                {upgradedWeapon && (
                  <span className="text-[10px] font-mono text-mh-slate-500">
                    ID: {upgradedWeapon.id}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
                  <input
                    type="text"
                    placeholder="Search upgraded weapon to merge..."
                    value={upgradedSearch}
                    onChange={(e) => setUpgradedSearch(e.target.value)}
                    className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-900 py-1 pl-7 pr-2 text-xs text-mh-slate-200 placeholder:text-mh-slate-500"
                  />
                </div>

                <select
                  value={upgradedId}
                  onChange={(e) => setUpgradedId(e.target.value)}
                  className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-900 px-3 py-2 text-xs text-mh-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Upgraded Weapon to Merge --</option>
                  {filteredUpgradedList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (R{w.rarity}) [{w.id}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Upgraded Weapon Preview */}
              {upgradedWeapon && (
                <div className="flex items-center gap-3 rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-3">
                  <div className="h-12 w-12 rounded-lg bg-mh-slate-950 border border-mh-slate-750 p-1 flex items-center justify-center shrink-0">
                    {upgradedWeapon.image ? (
                      <img src={upgradedWeapon.image} alt={upgradedWeapon.name} className="h-full w-full object-contain" />
                    ) : (
                      <Sword size={20} className="text-mh-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-mh-slate-100 truncate">{upgradedWeapon.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-mh-slate-400">
                      <span>Rarity {upgradedWeapon.rarity}</span>
                      <span>•</span>
                      <span>{upgradedWeapon.skills.length} skills</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Merge Configuration */}
          {baseWeapon && upgradedWeapon && (
            <div className="rounded-2xl border border-mh-slate-700 bg-mh-slate-950/60 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400 flex items-center gap-2">
                <Layers size={14} />
                Progression &amp; Upgrade Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Base Name (Read Only) */}
                <div>
                  <label className="block text-[11px] font-bold text-mh-slate-400 mb-1">
                    Crafted Name (Younger Form)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={baseWeapon.name}
                    className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-900 px-3 py-2 text-xs text-mh-slate-300 opacity-80 cursor-not-allowed"
                  />
                </div>

                {/* Upgraded Name (Editable) */}
                <div>
                  <label className="block text-[11px] font-bold text-mh-slate-300 mb-1">
                    Upgraded Name (Older Form) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={upgradedName}
                    onChange={(e) => setUpgradedName(e.target.value)}
                    placeholder="e.g. Wyvern Blade 'Fall'"
                    className="w-full rounded-xl border border-amber-500/50 bg-mh-slate-900 px-3 py-2 text-xs text-mh-slate-100 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Upgraded Name JA */}
                <div>
                  <label className="block text-[11px] font-bold text-mh-slate-400 mb-1">
                    Upgraded Name (Japanese - Optional)
                  </label>
                  <input
                    type="text"
                    value={upgradedNameJa}
                    onChange={(e) => setUpgradedNameJa(e.target.value)}
                    placeholder="e.g. 飛竜刀【紅葉】"
                    className="w-full rounded-xl border border-mh-slate-700 bg-mh-slate-900 px-3 py-2 text-xs text-mh-slate-300 focus:outline-none"
                  />
                </div>

                {/* Upgrade Level */}
                <div>
                  <label className="block text-[11px] font-bold text-mh-slate-300 mb-1">
                    Upgrade Level Threshold
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
                      className="w-24 rounded-xl border border-mh-slate-700 bg-mh-slate-900 px-3 py-2 text-xs text-mh-slate-200 font-mono font-bold focus:outline-none"
                    />
                    <div className="flex items-center gap-1 text-[11px]">
                      {[5, 6, 8, 10, 20].map((lvl) => (
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

              {/* Artwork & Description Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Image Selection */}
                <div>
                  <span className="block text-[11px] font-bold text-mh-slate-400 mb-2">
                    Weapon Artwork to Keep
                  </span>
                  <div className="flex items-center gap-3">
                    <label className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 flex-1 cursor-pointer transition-all',
                      keepImageFrom === 'base' ? 'border-mh-gold-500 bg-mh-gold-500/10' : 'border-mh-slate-750 bg-mh-slate-900/60',
                    )}>
                      <input
                        type="radio"
                        name="keepImage"
                        checked={keepImageFrom === 'base'}
                        onChange={() => setKeepImageFrom('base')}
                        className="text-mh-gold-500"
                      />
                      <div className="h-8 w-8 rounded bg-mh-slate-950 p-1 flex items-center justify-center shrink-0 border border-mh-slate-800">
                        {baseWeapon.image ? (
                          <img src={baseWeapon.image} alt="Base" className="h-full w-full object-contain" />
                        ) : (
                          <Sword size={14} className="text-mh-slate-600" />
                        )}
                      </div>
                      <span className="text-xs text-mh-slate-300 font-medium">Base Artwork</span>
                    </label>

                    <label className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 flex-1 cursor-pointer transition-all',
                      keepImageFrom === 'upgraded' ? 'border-mh-gold-500 bg-mh-gold-500/10' : 'border-mh-slate-750 bg-mh-slate-900/60',
                    )}>
                      <input
                        type="radio"
                        name="keepImage"
                        checked={keepImageFrom === 'upgraded'}
                        onChange={() => setKeepImageFrom('upgraded')}
                        className="text-mh-gold-500"
                      />
                      <div className="h-8 w-8 rounded bg-mh-slate-950 p-1 flex items-center justify-center shrink-0 border border-mh-slate-800">
                        {upgradedWeapon.image ? (
                          <img src={upgradedWeapon.image} alt="Upgraded" className="h-full w-full object-contain" />
                        ) : (
                          <Sword size={14} className="text-mh-slate-600" />
                        )}
                      </div>
                      <span className="text-xs text-mh-slate-300 font-medium">Upgraded Artwork</span>
                    </label>
                  </div>
                </div>

                {/* Lore Description Selection */}
                <div>
                  <span className="block text-[11px] font-bold text-mh-slate-400 mb-2">
                    Lore Description to Keep
                  </span>
                  <div className="flex items-center gap-3">
                    <label className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 flex-1 cursor-pointer transition-all',
                      keepDescriptionFrom === 'base' ? 'border-mh-gold-500 bg-mh-gold-500/10' : 'border-mh-slate-750 bg-mh-slate-900/60',
                    )}>
                      <input
                        type="radio"
                        name="keepDesc"
                        checked={keepDescriptionFrom === 'base'}
                        onChange={() => setKeepDescriptionFrom('base')}
                        className="text-mh-gold-500"
                      />
                      <span className="text-xs text-mh-slate-300 font-medium">Base Lore</span>
                    </label>

                    <label className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 flex-1 cursor-pointer transition-all',
                      keepDescriptionFrom === 'upgraded' ? 'border-mh-gold-500 bg-mh-gold-500/10' : 'border-mh-slate-750 bg-mh-slate-900/60',
                    )}>
                      <input
                        type="radio"
                        name="keepDesc"
                        checked={keepDescriptionFrom === 'upgraded'}
                        onChange={() => setKeepDescriptionFrom('upgraded')}
                        className="text-mh-gold-500"
                      />
                      <span className="text-xs text-mh-slate-300 font-medium">Upgraded Lore</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Combined Skills Preview */}
              <div className="pt-2">
                <span className="block text-[11px] font-bold text-mh-slate-400 mb-2">
                  Combined Skills Progression ({mergedSkills.length} skills)
                </span>
                <div className="space-y-1.5">
                  {mergedSkills.map((s, idx) => {
                    const meta = dbSkills.find((d) => d.id === s.id);
                    const ul = s.unlock_level ?? s.unlock_rarity ?? null;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-mh-slate-750 bg-mh-slate-900 px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={12} className="text-mh-gold-400" />
                          <span className="font-bold text-mh-slate-200">{meta?.name ?? s.id}</span>
                          <span className="text-mh-gold-400 font-mono font-bold">Lv{s.level}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-mh-slate-500">Unlocks at:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={ul ?? ''}
                            placeholder="Base"
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const cleanVal = isNaN(val) || val <= 1 ? null : val;
                              setMergedSkills((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        unlock_level: cleanVal,
                                        unlock_rarity: cleanVal,
                                        unlockLevel: cleanVal,
                                        unlockRarity: cleanVal,
                                      }
                                    : item,
                                ),
                              );
                            }}
                            className={cn(
                              'w-20 rounded border px-2 py-0.5 text-[10px] font-bold outline-none text-center',
                              ul
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-mh-slate-950 text-mh-slate-400 border-mh-slate-700',
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          {baseWeapon && upgradedWeapon && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <strong className="text-amber-300 font-bold block mb-0.5">Permanent Database Action:</strong>
                This operation will update <span className="font-bold text-white">"{baseWeapon.name}"</span> with the upgraded name, level, and merged skills. All collection tracker and saved hunter build references pointing to <span className="font-bold text-white">"{upgradedWeapon.name}" ({upgradedWeapon.id})</span> will be migrated to the base weapon, and the duplicate record will be removed.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-mh-slate-750 bg-mh-slate-950/90 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-mh-slate-700 bg-mh-slate-800 px-4 py-2 text-xs font-bold text-mh-slate-300 hover:bg-mh-slate-750 hover:text-white transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!baseWeapon || !upgradedWeapon || !upgradedName.trim() || mergeMutation.isPending}
            onClick={handleConfirmMerge}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-md',
              !baseWeapon || !upgradedWeapon || !upgradedName.trim() || mergeMutation.isPending
                ? 'bg-mh-slate-800 text-mh-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-mh-gold-500 text-slate-950 font-black hover:from-amber-400 hover:to-mh-gold-400',
            )}
          >
            <GitMerge size={14} className={mergeMutation.isPending ? 'animate-spin' : ''} />
            <span>{mergeMutation.isPending ? 'Merging Records...' : 'Confirm & Execute Merge'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
