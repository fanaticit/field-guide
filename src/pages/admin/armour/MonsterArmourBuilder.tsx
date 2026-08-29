// ─────────────────────────────────────────────────────────────
// MonsterArmourBuilder — "By Monster" View
// Select a monster to configure skills on its 5 armour pieces.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { Search, Plus, X, Shield, ChevronRight, Loader2, Sparkles, Check } from 'lucide-react';
import { useAdminMonsters, type DBMonster } from '../../../hooks/useAdminMonsters';
import { useAdminSkills, type DBSkill } from '../../../hooks/useAdminSkills';
import {
  useAdminArmourPieces,
  useAddSkillToPiece,
  useRemoveSkillFromPiece,
  useSaveArmourPieceSkills,
  useApplySkillToPieces,
  type DBArmourPiece,
} from '../../../hooks/useAdminArmour';
import type { ArmourSlot, ArmourSkill } from '../../../data/schemas/armour';
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

interface Props {
  game: string;
  selectedMonsterId: string | null;
  onSelectMonster: (id: string) => void;
}

// ── Inline Skill Adder Component ─────────────────────────────
function AddSkillPicker({
  game,
  monsterId,
  slot,
  currentSkills,
  availableSkills,
  onClose,
}: {
  game: string;
  monsterId: string;
  slot: ArmourSlot;
  currentSkills: ArmourSkill[];
  availableSkills: DBSkill[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [level, setLevel] = useState<number>(1);

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

  async function handleAdd() {
    if (!selectedSkillId) return;
    await addSkill.mutateAsync({
      game,
      monsterId,
      slot,
      currentSkills,
      skillId: selectedSkillId,
      level,
    });
    onClose();
  }

  return (
    <div className="rounded-lg border border-mh-gold-500/30 bg-mh-slate-900/90 p-3 shadow-lg space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-mh-gold-400">Add Skill to Piece</span>
        <button
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
          placeholder="Search skills…"
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
            const isSelected = s.id === selectedSkillId;
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
                  isSelected
                    ? 'bg-mh-gold-500/20 text-mh-gold-300 ring-1 ring-mh-gold-500/40'
                    : 'text-mh-slate-300 hover:bg-mh-slate-700/60',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 rounded-full', catCfg.text.replace('text-', 'bg-'))} />
                  <span className="font-medium">{s.name}</span>
                  {s.is_set_bonus && (
                    <span className="rounded bg-mh-gold-500/20 px-1 py-0.2 text-[9px] font-bold text-mh-gold-400 border border-mh-gold-500/30">
                      Set ({s.set_thresholds?.map((t) => t.pieces).join(', ') || '2, 4'} pcs)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-mh-slate-500 font-mono">
                  {s.is_set_bonus
                    ? `${s.set_thresholds?.length || 2} Tiers`
                    : `Max Lv ${s.max_levels[game] ?? 5}`}
                </span>
              </button>
            );
          })
        )}
      </div>

      {selectedSkill && (
        <div className="flex items-center justify-between pt-1 border-t border-mh-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-mh-slate-400">
              {selectedSkill.is_set_bonus ? 'Set Tier:' : 'Level:'}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: maxAllowedLevel }, (_, i) => i + 1).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={cn(
                    'h-6 w-6 rounded text-xs font-bold transition-all',
                    level === lvl
                      ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm'
                      : 'border border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-700',
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

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
      )}
    </div>
  );
}

// ── Armour Slot Card ─────────────────────────────────────────
function ArmourSlotCard({
  game,
  monsterId,
  slotDef,
  piece,
  availableSkills,
}: {
  game: string;
  monsterId: string;
  slotDef: typeof ARMOUR_SLOTS_DEF[number];
  piece?: DBArmourPiece;
  availableSkills: DBSkill[];
}) {
  const [showAdder, setShowAdder] = useState(false);
  const removeSkill = useRemoveSkillFromPiece();
  const saveSkills = useSaveArmourPieceSkills();

  const skills = piece?.skills ?? [];

  const skillMetaMap = useMemo(
    () => new Map(availableSkills.map((s) => [s.id, s])),
    [availableSkills],
  );

  function handleLevelChange(skillId: string, newLevel: number) {
    const updatedSkills = skills.map((s) =>
      s.id === skillId ? { ...s, level: newLevel } : s,
    );
    saveSkills.mutate({
      game,
      monsterId,
      slot: slotDef.id,
      skills: updatedSkills,
    });
  }

  function handleRemove(skillId: string) {
    removeSkill.mutate({
      game,
      monsterId,
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mh-slate-800 p-1.5 ring-1 ring-mh-slate-700">
            <img
              src={slotDef.icon}
              alt={slotDef.label}
              className="h-full w-full object-contain filter brightness-90"
              onError={(e) => {
                // Fallback to generic shield icon if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
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
            monsterId={monsterId}
            slot={slotDef.id}
            currentSkills={skills}
            availableSkills={availableSkills}
            onClose={() => setShowAdder(false)}
          />
        </div>
      )}

      {/* Skills list on this piece */}
      <div className="min-h-[90px] flex-1 pt-3 space-y-2">
        {skills.length === 0 ? (
          <div className="flex h-full min-h-[70px] items-center justify-center rounded-lg border border-dashed border-mh-slate-800 bg-mh-slate-900/20 text-center text-xs text-mh-slate-600">
            No skills on this armour piece yet.
          </div>
        ) : (
          skills.map((s) => {
            const meta = skillMetaMap.get(s.id);
            const category = meta?.category ?? 'general';
            const catCfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.general;
            const maxLv = meta?.max_levels[game] ?? 5;
            const isSetBonus = meta?.is_set_bonus ?? false;

            return (
              <div
                key={s.id}
                className="group flex items-center justify-between rounded-lg border border-mh-slate-750 bg-mh-slate-800/80 px-3 py-2 transition-colors hover:border-mh-slate-600"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold border',
                      isSetBonus
                        ? 'bg-mh-gold-500/15 text-mh-gold-300 border-mh-gold-500/40'
                        : `${catCfg.bg} ${catCfg.text} ${catCfg.border}`,
                    )}
                  >
                    {meta?.name ?? s.id}
                  </span>
                  {isSetBonus && (
                    <span className="rounded bg-mh-gold-500/15 px-1 py-0.5 text-[9px] font-bold text-mh-gold-400 border border-mh-gold-500/30">
                      Set ({meta?.set_thresholds?.map((t) => t.pieces).join(', ') || '2, 4'} pcs)
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-mh-slate-500">
                    {s.id}
                  </span>
                </div>

                {/* Level Stepper & Delete */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-mh-slate-400">
                      {isSetBonus ? 'Tier' : 'Lv'}
                    </span>
                    <select
                      value={s.level}
                      onChange={(e) =>
                        handleLevelChange(s.id, parseInt(e.target.value, 10))
                      }
                      className="rounded border border-mh-slate-700 bg-mh-slate-900 px-1.5 py-0.5 text-xs font-bold text-mh-gold-400 outline-none focus:border-mh-gold-500/50"
                    >
                      {Array.from({ length: maxLv }, (_, i) => i + 1).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleRemove(s.id)}
                    title="Remove skill from piece"
                    className="rounded p-1 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
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

// ── Bulk Apply Skill Modal ──────────────────────────────────
function BulkApplySkillModal({
  game,
  monster,
  availableSkills,
  monsterPiecesMap,
  open,
  onClose,
}: {
  game: string;
  monster: DBMonster;
  availableSkills: DBSkill[];
  monsterPiecesMap: Map<ArmourSlot, DBArmourPiece | undefined>;
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'' | 'skill' | 'set'>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [level, setLevel] = useState<number>(1);
  const [selectedSlots, setSelectedSlots] = useState<ArmourSlot[]>([
    'helm',
    'chest',
    'gloves',
    'waist',
    'greaves',
  ]);

  const applyMutation = useApplySkillToPieces();

  const filteredSkills = useMemo(() => {
    let list = [...availableSkills];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.name_ja ?? '').toLowerCase().includes(q),
      );
    }
    if (filterType === 'skill') list = list.filter((s) => !s.is_set_bonus);
    if (filterType === 'set') list = list.filter((s) => s.is_set_bonus);
    return list;
  }, [availableSkills, search, filterType]);

  const selectedSkill = useMemo(
    () => availableSkills.find((s) => s.id === selectedSkillId) ?? null,
    [availableSkills, selectedSkillId],
  );

  const maxAllowedLevel = selectedSkill
    ? selectedSkill.is_set_bonus
      ? (selectedSkill.set_thresholds?.length || 2)
      : (selectedSkill.max_levels[game] ?? 5)
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
      monsterId: monster.id,
      slots: selectedSlots,
      skillId: selectedSkillId,
      level,
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
                Apply Skill or Set to Multiple Pieces
              </h2>
              <p className="text-xs text-mh-slate-400">
                For {monster.name} ({game.toUpperCase()})
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

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Pick Skill / Set */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
              1. Select Skill or Set Bonus
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
                  Sets
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
                        {sk.is_set_bonus ? `${sk.set_thresholds?.length || 2} Tiers` : `Max Lv ${sk.max_levels[game] ?? 5}`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Level / Tier Stepper */}
          {selectedSkill && (
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 p-3.5 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-mh-slate-300">
                2. Select {selectedSkill.is_set_bonus ? 'Set Tier' : 'Skill Level'} to Apply
              </label>
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
                    {selectedSkill.is_set_bonus ? `Tier ${lvl}` : `Level ${lvl}`}
                  </button>
                ))}
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
                          src={slotDef.icon}
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
                            Lv {existingSkill.level} → Lv {level}
                          </span>
                        ) : (
                          <span className="text-green-400 font-semibold">
                            + Add Lv {level}
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
  const [searchMonster, setSearchMonster] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const { data: monsters = [], isLoading: loadingMonsters } = useAdminMonsters({
    game,
    isActive: true,
  });

  const { data: skills = [] } = useAdminSkills({ game, isActive: true });
  const { data: armourPieces = [] } = useAdminArmourPieces(game);

  const filteredMonsters = useMemo(() => {
    if (!searchMonster) return monsters;
    const q = searchMonster.toLowerCase();
    return monsters.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.name_ja ?? '').toLowerCase().includes(q),
    );
  }, [monsters, searchMonster]);

  // Set default selected monster if none selected
  const activeMonster = useMemo(() => {
    if (selectedMonsterId) {
      return monsters.find((m) => m.id === selectedMonsterId) ?? monsters[0] ?? null;
    }
    return monsters[0] ?? null;
  }, [monsters, selectedMonsterId]);

  // Pieces map for active monster
  const monsterPiecesMap = useMemo(() => {
    if (!activeMonster) return new Map<ArmourSlot, DBArmourPiece>();
    const map = new Map<ArmourSlot, DBArmourPiece>();
    armourPieces
      .filter((p) => p.monster_id === activeMonster.id && p.game === game)
      .forEach((p) => map.set(p.slot, p));
    return map;
  }, [armourPieces, activeMonster, game]);

  const totalSkillsCount = useMemo(() => {
    let count = 0;
    monsterPiecesMap.forEach((p) => {
      count += p.skills.length;
    });
    return count;
  }, [monsterPiecesMap]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left Monster Sidebar ── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-mh-slate-700 bg-mh-slate-900/40">
        <div className="p-3 border-b border-mh-slate-700/80">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={searchMonster}
              onChange={(e) => setSearchMonster(e.target.value)}
              placeholder="Filter monsters…"
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-8 pr-2.5 text-xs text-mh-slate-200 placeholder-mh-slate-500 outline-none focus:border-mh-gold-500/50"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-mh-slate-800/60 p-1">
          {loadingMonsters ? (
            <div className="flex items-center justify-center p-8 text-xs text-mh-slate-500">
              <Loader2 size={16} className="animate-spin mr-2" />
              Loading monsters…
            </div>
          ) : filteredMonsters.length === 0 ? (
            <p className="p-4 text-center text-xs text-mh-slate-500">No monsters found</p>
          ) : (
            filteredMonsters.map((m) => {
              const isSelected = activeMonster?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectMonster(m.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all',
                    isSelected
                      ? 'bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30'
                      : 'text-mh-slate-300 hover:bg-mh-slate-800/60 hover:text-white',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.icon ? (
                      <img
                        src={m.icon}
                        alt={m.name}
                        className="h-7 w-7 shrink-0 rounded-md object-contain bg-mh-slate-800"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-mh-slate-800 text-[10px] font-bold text-mh-slate-500">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{m.name}</p>
                      <p className="truncate text-[10px] text-mh-slate-500 font-mono">
                        {m.id}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    className={cn(
                      'shrink-0',
                      isSelected ? 'text-mh-gold-400' : 'text-mh-slate-600',
                    )}
                  />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Armour Pieces Layout ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
        {activeMonster ? (
          <>
            {/* Monster Overview Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4">
              <div className="flex items-center gap-4">
                {activeMonster.icon && (
                  <img
                    src={activeMonster.icon}
                    alt={activeMonster.name}
                    className="h-12 w-12 rounded-lg object-contain bg-mh-slate-800 p-1 border border-mh-slate-700"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-mh-slate-100">
                      {activeMonster.name}
                    </h2>
                    {activeMonster.name_ja && (
                      <span className="text-xs text-mh-slate-500">
                        ({activeMonster.name_ja})
                      </span>
                    )}
                    <span className="rounded bg-mh-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mh-gold-400 border border-mh-slate-700">
                      {game.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-mh-slate-400">
                    Armour Set: 5 canonical pieces ({totalSkillsCount} total skills configured)
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3.5 py-2 text-xs font-bold text-mh-gold-300 hover:bg-mh-gold-500/25 transition-all shadow-sm"
              >
                <Sparkles size={14} className="text-mh-gold-400" />
                <span>Add Skill / Set to All Pieces</span>
              </button>
            </div>

            {/* 5 Piece Cards Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {ARMOUR_SLOTS_DEF.map((slotDef) => (
                <ArmourSlotCard
                  key={slotDef.id}
                  game={game}
                  monsterId={activeMonster.id}
                  slotDef={slotDef}
                  piece={monsterPiecesMap.get(slotDef.id)}
                  availableSkills={skills}
                />
              ))}
            </div>

            {/* Bulk Apply Modal */}
            <BulkApplySkillModal
              game={game}
              monster={activeMonster}
              availableSkills={skills}
              monsterPiecesMap={monsterPiecesMap}
              open={showBulkModal}
              onClose={() => setShowBulkModal(false)}
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center text-mh-slate-500">
            <Shield size={48} className="mb-2 opacity-40" />
            <p className="text-sm font-semibold">Select a monster from the list</p>
            <p className="text-xs text-mh-slate-600">
              Configure skills on each of its 5 armour pieces.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
