// ─────────────────────────────────────────────────────────────
// SkillArmourMappingView — "By Skill" Reverse Mapping View
// Search and sort by skill to see which armour pieces have that skill,
// and easily correct assignments by removing, changing levels, or adding pieces.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { Search, Plus, X, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAdminSkills, type DBSkill } from '../../../hooks/useAdminSkills';
import { useAdminMonsters, type DBMonster } from '../../../hooks/useAdminMonsters';
import {
  useAdminArmourPieces,
  useAddSkillToPiece,
  useSaveArmourPieceSkills,
  type DBArmourPiece,
} from '../../../hooks/useAdminArmour';
import type { ArmourSlot, ArmourSkill } from '../../../data/schemas/armour';
import { CATEGORY_CONFIG, CATEGORY_OPTIONS } from '../skills/SkillEditModal';
import { ARMOUR_SLOTS_DEF } from './MonsterArmourBuilder';
import { cn } from '../../../lib/utils';

interface Props {
  game: string;
}

type SkillSortKey = 'name' | 'pieces_count' | 'category';
type SortDir = 'asc' | 'desc';

// ── Assign Skill to Piece Modal / Popover ─────────────────────
function AssignToPieceModal({
  game,
  skill,
  monsters,
  armourPieces,
  onClose,
}: {
  game: string;
  skill: DBSkill;
  monsters: DBMonster[];
  armourPieces: DBArmourPiece[];
  onClose: () => void;
}) {
  const [monsterSearch, setMonsterSearch] = useState('');
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>(
    monsters[0]?.id ?? '',
  );
  const [selectedSetVariant, setSelectedSetVariant] = useState<string>('I');
  const [selectedSlot, setSelectedSlot] = useState<ArmourSlot>('helm');
  const [level, setLevel] = useState<number>(1);
  const [unlockRarity, setUnlockRarity] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addSkill = useAddSkillToPiece();

  const allSources = useMemo(() => {
    const list = monsters.map((m) => ({ id: m.id, name: m.name, isMonster: true }));
    const monsterIdSet = new Set(monsters.map((m) => m.id));
    const nonMonsterMap = new Map<string, string>();
    armourPieces
      .filter((p) => p.game === game && !monsterIdSet.has(p.monster_id))
      .forEach((p) => {
        if (!nonMonsterMap.has(p.monster_id)) {
          const name = p.set_name ? p.set_name.replace(/\s+Set$/i, '') : p.monster_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          nonMonsterMap.set(p.monster_id, name);
        }
      });
    nonMonsterMap.forEach((name, id) => {
      list.push({ id, name, isMonster: false });
    });
    return list;
  }, [monsters, armourPieces, game]);

  const filteredMonsters = useMemo(() => {
    if (!monsterSearch) return allSources;
    const q = monsterSearch.toLowerCase();
    return allSources.filter((m) => m.name.toLowerCase().includes(q) || m.id.includes(q));
  }, [allSources, monsterSearch]);

  const availableSetsForMonster = useMemo(() => {
    const set = new Set<string>();
    armourPieces
      .filter((p) => p.monster_id === selectedMonsterId && p.game === game)
      .forEach((p) => set.add(p.set_variant || 'I'));
    if (set.size === 0) set.add('I');
    return Array.from(set).sort();
  }, [armourPieces, selectedMonsterId, game]);

  const maxAllowedLevel = skill.max_levels[game] ?? 5;

  // Find existing piece
  const targetPiece = armourPieces.find(
    (p) =>
      p.monster_id === selectedMonsterId &&
      (p.set_variant || 'I') === selectedSetVariant &&
      p.slot === selectedSlot &&
      p.game === game,
  );
  const currentSkills = targetPiece?.skills ?? [];

  async function handleAssign() {
    if (!selectedMonsterId) {
      setErrorMsg('Please select a monster.');
      return;
    }

    try {
      setErrorMsg(null);
      await addSkill.mutateAsync({
        game,
        monsterId: selectedMonsterId,
        setVariant: selectedSetVariant,
        slot: selectedSlot,
        currentSkills,
        skillId: skill.id,
        level,
        unlockRarity,
      });
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMsg(e?.message ?? 'Failed to assign skill to piece.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="flex flex-col w-full max-w-md rounded-xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-700 px-5 py-4 bg-mh-slate-850">
          <div>
            <h3 className="font-display text-sm font-bold text-mh-slate-100">
              Assign Skill to Piece
            </h3>
            <p className="text-xs text-mh-gold-400 font-semibold">{skill.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Monster Picker */}
          <div>
            <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
              Target Monster
            </label>
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500" />
              <input
                type="text"
                value={monsterSearch}
                onChange={(e) => setMonsterSearch(e.target.value)}
                placeholder="Search monster…"
                className="w-full rounded border border-mh-slate-700 bg-mh-slate-800 py-1 pl-7 pr-2 text-xs text-mh-slate-200 outline-none focus:border-mh-gold-500/50"
              />
            </div>
            <select
              value={selectedMonsterId}
              onChange={(e) => setSelectedMonsterId(e.target.value)}
              className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 outline-none focus:border-mh-gold-500/50"
            >
              {filteredMonsters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>

          {/* Set Variant Picker */}
          <div>
            <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
              Armour Set Variant
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedSetVariant}
                onChange={(e) => setSelectedSetVariant(e.target.value)}
                className="flex-1 rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2 text-xs text-mh-slate-100 outline-none focus:border-mh-gold-500/50"
              >
                {availableSetsForMonster.map((s) => (
                  <option key={s} value={s}>
                    Set {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Slot Picker */}
          <div>
            <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
              Armour Slot
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {ARMOUR_SLOTS_DEF.map((slot) => {
                const isSelected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all',
                      isSelected
                        ? 'border-mh-gold-500/50 bg-mh-gold-500/10 text-mh-gold-300 ring-1 ring-mh-gold-500/30'
                        : 'border-mh-slate-750 bg-mh-slate-800/60 text-mh-slate-400 hover:border-mh-slate-600',
                    )}
                  >
                    <img
                      src={slot.icon}
                      alt={slot.label}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="text-[10px] font-bold">{slot.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level Picker (only for non-set-bonus skills) */}
          {skill.is_set_bonus ? (
            <div>
              <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
                Set Effect
              </label>
              <div className="rounded-lg bg-mh-gold-500/15 border border-mh-gold-500/30 px-3 py-2 text-xs font-bold text-mh-gold-300">
                Inherent Set Effect (Adds 1 piece contribution towards set bonus)
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
                Skill Level on Piece
              </label>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxAllowedLevel }, (_, i) => i + 1).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={cn(
                      'h-8 flex-1 rounded text-xs font-bold transition-all',
                      level === lvl
                        ? 'bg-mh-gold-500 text-mh-slate-950 shadow-sm'
                        : 'border border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-700',
                    )}
                  >
                    Lv {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unlock Rarity Selector */}
          <div>
            <label className="block text-xs font-semibold text-mh-slate-400 mb-1.5">
              Unlock at Rarity Level
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Base (None)', val: null },
                { label: 'R6', val: 6 },
                { label: 'R8', val: 8 },
                { label: 'R9', val: 9 },
                { label: 'R12', val: 12 },
                { label: 'R13', val: 13 },
                { label: 'R14', val: 14 },
                { label: 'R15', val: 15 },
                { label: 'R16', val: 16 },
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-mh-slate-700 px-5 py-3 bg-mh-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-mh-slate-400 hover:bg-mh-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={addSkill.isPending}
            onClick={handleAssign}
            className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-4 py-1.5 text-xs font-bold text-mh-slate-950 hover:bg-mh-gold-400 disabled:opacity-50 transition-colors"
          >
            {addSkill.isPending && <Loader2 size={13} className="animate-spin" />}
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single Skill Mapping Row / Card ──────────────────────────
function SkillMappingCard({
  game,
  skill,
  monsters,
  piecesWithSkill,
  onAssignToPiece,
}: {
  game: string;
  skill: DBSkill;
  monsters: DBMonster[];
  piecesWithSkill: Array<{ piece: DBArmourPiece; skill: ArmourSkill }>;
  onAssignToPiece: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const saveSkills = useSaveArmourPieceSkills();

  const categoryCfg = CATEGORY_CONFIG[skill.category] ?? CATEGORY_CONFIG.general;
  const CatIcon = categoryCfg.icon;

  const monstersMap = useMemo(
    () => new Map(monsters.map((m) => [m.id, m])),
    [monsters],
  );

  const slotMap = useMemo(
    () => new Map(ARMOUR_SLOTS_DEF.map((s) => [s.id, s])),
    [],
  );

  function handleLevelChange(piece: DBArmourPiece, targetSkill: ArmourSkill, newLevel: number) {
    const targetUR = targetSkill.unlockRarity ?? targetSkill.unlock_rarity ?? null;
    const updatedSkills = piece.skills.map((s) => {
      const sUR = s.unlockRarity ?? s.unlock_rarity ?? null;
      return s.id === skill.id && sUR === targetUR ? { ...s, level: newLevel } : s;
    });
    saveSkills.mutate({
      game,
      monsterId: piece.monster_id,
      setVariant: piece.set_variant || 'I',
      setName: piece.set_name,
      slot: piece.slot,
      skills: updatedSkills,
    });
  }

  function handleUnlockRarityChange(piece: DBArmourPiece, targetSkill: ArmourSkill, newRarity: number | null) {
    const cleanUR = newRarity && newRarity > 1 ? Number(newRarity) : null;
    const targetUR = targetSkill.unlockRarity ?? targetSkill.unlock_rarity ?? null;
    const updatedSkills = piece.skills.map((s) => {
      const sUR = s.unlockRarity ?? s.unlock_rarity ?? null;
      return s.id === skill.id && sUR === targetUR
        ? { ...s, unlock_rarity: cleanUR, unlockRarity: cleanUR }
        : s;
    });
    saveSkills.mutate({
      game,
      monsterId: piece.monster_id,
      setVariant: piece.set_variant || 'I',
      setName: piece.set_name,
      slot: piece.slot,
      skills: updatedSkills,
    });
  }

  function handleRemove(piece: DBArmourPiece, targetSkill: ArmourSkill) {
    const targetUR = targetSkill.unlockRarity ?? targetSkill.unlock_rarity ?? null;
    let removed = false;
    const updatedSkills = piece.skills.filter((s) => {
      const sUR = s.unlockRarity ?? s.unlock_rarity ?? null;
      if (!removed && s.id === skill.id && sUR === targetUR) {
        removed = true;
        return false;
      }
      return true;
    });
    saveSkills.mutate({
      game,
      monsterId: piece.monster_id,
      setVariant: piece.set_variant || 'I',
      setName: piece.set_name,
      slot: piece.slot,
      skills: updatedSkills,
    });
  }

  const maxLv = skill.max_levels[game] ?? 5;

  return (
    <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-850 shadow-sm transition-all hover:border-mh-slate-650 overflow-hidden">
      {/* Skill Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-mh-slate-850/90 border-b border-mh-slate-750">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
              categoryCfg.bg,
              categoryCfg.text,
              categoryCfg.border,
            )}
          >
            <CatIcon size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold text-mh-slate-100">
                {skill.name}
              </span>
              {skill.is_set_bonus && (
                <span className="rounded bg-mh-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-mh-gold-400 border border-mh-gold-500/40">
                  Set Bonus ({skill.set_thresholds?.map((t) => t.pieces).join(', ') || '2, 4'} pcs)
                </span>
              )}
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-semibold border',
                  categoryCfg.bg,
                  categoryCfg.text,
                  categoryCfg.border,
                )}
              >
                {categoryCfg.label}
              </span>
            </div>
            <p className="text-[11px] font-mono text-mh-slate-500">
              {skill.id} • {skill.is_set_bonus ? `${skill.set_thresholds?.length || 2} Tiers` : `Max Level ${maxLv}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-mh-slate-800 px-3 py-1 text-xs font-semibold text-mh-slate-300 border border-mh-slate-700">
            {piecesWithSkill.length}{' '}
            {piecesWithSkill.length === 1 ? 'armour piece' : 'armour pieces'}
          </span>

          <button
            onClick={onAssignToPiece}
            className="flex items-center gap-1 rounded-lg bg-mh-gold-500/10 px-3 py-1.5 text-xs font-bold text-mh-gold-400 ring-1 ring-mh-gold-500/30 hover:bg-mh-gold-500/20 transition-all"
          >
            <Plus size={13} />
            <span>Assign to Piece</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1.5 text-mh-slate-500 hover:bg-mh-slate-800 hover:text-mh-slate-300 transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Pieces Grid */}
      {isExpanded && (
        <div className="p-4 bg-mh-slate-900/30">
          {piecesWithSkill.length === 0 ? (
            <p className="py-2 text-center text-xs text-mh-slate-500">
              No armour pieces currently grant this skill. Click "Assign to Piece" to add it to a monster armour part.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {piecesWithSkill.map(({ piece, skill: pieceSkill }) => {
                const monster = monstersMap.get(piece.monster_id);
                const slotDef = slotMap.get(piece.slot);
                const unlockR = pieceSkill.unlockRarity ?? pieceSkill.unlock_rarity ?? null;
                const isLocked = unlockR !== null && unlockR > 1;

                return (
                  <div
                    key={piece.id || `${piece.monster_id}-${piece.set_variant || 'I'}-${piece.slot}`}
                    className="flex items-center justify-between rounded-lg border border-mh-slate-750 bg-mh-slate-800/90 p-2.5 transition-colors hover:border-mh-slate-650"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {slotDef && (
                        <img
                          src={slotDef.icon}
                          alt={slotDef.label}
                          className="h-7 w-7 shrink-0 object-contain rounded bg-mh-slate-900 p-0.5"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="truncate text-xs font-bold text-mh-slate-200">
                            {monster?.name ?? piece.set_name?.replace(/\s+Set$/i, '') ?? piece.monster_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                          <span className="shrink-0 rounded bg-mh-gold-500/15 px-1 py-0.2 text-[9px] font-bold text-mh-gold-300 border border-mh-gold-500/30">
                            {piece.set_name || `Set ${piece.set_variant || 'I'}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-mh-slate-400 font-medium">
                          {slotDef?.label ?? piece.slot}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Unlock Rarity Selector */}
                      <select
                        value={unlockR ?? ''}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          handleUnlockRarityChange(piece, pieceSkill, isNaN(v) || v <= 1 ? null : v);
                        }}
                        title="Required armour upgrade rarity to unlock"
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-bold outline-none transition-colors',
                          isLocked
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-mh-slate-900 text-mh-slate-400 border-mh-slate-700',
                        )}
                      >
                        <option value="">Base</option>
                        <option value="6">R6</option>
                        <option value="8">R8</option>
                        <option value="9">R9</option>
                        <option value="12">R12</option>
                        <option value="13">R13</option>
                        <option value="14">R14</option>
                        <option value="15">R15</option>
                        <option value="16">R16</option>
                      </select>

                      {skill.is_set_bonus ? (
                        <span className="rounded bg-mh-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-mh-gold-300 border border-mh-gold-500/40">
                          Set Effect
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-mh-slate-400">Lv</span>
                          <select
                            value={pieceSkill.level}
                            onChange={(e) =>
                              handleLevelChange(piece, pieceSkill, parseInt(e.target.value, 10))
                            }
                            className="rounded border border-mh-slate-700 bg-mh-slate-900 px-1.5 py-0.5 text-xs font-bold text-mh-gold-400 outline-none"
                          >
                            {Array.from({ length: maxLv }, (_, i) => i + 1).map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        onClick={() => handleRemove(piece, pieceSkill)}
                        title="Remove skill from this piece"
                        className="rounded p-1 text-mh-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Skill Armour Mapping View ───────────────────────────
export default function SkillArmourMappingView({ game }: Props) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'' | 'skill' | 'set'>('');
  const [sortKey, setSortKey] = useState<SkillSortKey>('pieces_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [assigningSkill, setAssigningSkill] = useState<DBSkill | null>(null);

  const skillFilters = useMemo(() => ({ game, isActive: true }), [game]);
  const monsterFilters = useMemo(() => ({ game, isActive: true }), [game]);

  const { data: skills = [], isLoading: loadingSkills } = useAdminSkills(skillFilters);
  const { data: monsters = [] } = useAdminMonsters(monsterFilters);
  const { data: armourPieces = [], isLoading: loadingPieces } = useAdminArmourPieces(game);

  // Map of skillId -> Array of { piece, skill }
  const skillToPiecesMap = useMemo(() => {
    const map = new Map<string, Array<{ piece: DBArmourPiece; skill: ArmourSkill }>>();
    armourPieces.forEach((piece) => {
      piece.skills.forEach((s) => {
        const list = map.get(s.id) ?? [];
        list.push({ piece, skill: s });
        map.set(s.id, list);
      });
    });
    return map;
  }, [armourPieces]);

  const filteredSkills = useMemo(() => {
    let list = [...skills];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.name_ja ?? '').toLowerCase().includes(q),
      );
    }

    if (filterCategory) {
      list = list.filter((s) => s.category === filterCategory);
    }

    if (filterType === 'skill') {
      list = list.filter((s) => !s.is_set_bonus);
    }
    if (filterType === 'set') {
      list = list.filter((s) => s.is_set_bonus);
    }

    list.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sortKey === 'name') {
        av = a.name;
        bv = b.name;
      } else if (sortKey === 'category') {
        av = a.category;
        bv = b.category;
      } else if (sortKey === 'pieces_count') {
        av = skillToPiecesMap.get(a.id)?.length ?? 0;
        bv = skillToPiecesMap.get(b.id)?.length ?? 0;
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [skills, search, filterCategory, filterType, sortKey, sortDir, skillToPiecesMap]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-mh-slate-700 bg-mh-slate-900/40 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[220px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills to see matching armour…"
                className="w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 py-1.5 pl-9 pr-3 text-xs text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-gold-500/50"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as '' | 'skill' | 'set')}
              className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 outline-none"
            >
              <option value="">All Types</option>
              <option value="skill">Skills Only</option>
              <option value="set">Set Bonuses Only</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>

            <select
              value={`${sortKey}_${sortDir}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split('_') as [SkillSortKey, SortDir];
                setSortKey(key);
                setSortDir(dir);
              }}
              className="rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-1.5 text-xs text-mh-slate-300 outline-none"
            >
              <option value="pieces_count_desc">Most Armour Pieces</option>
              <option value="pieces_count_asc">Least Armour Pieces</option>
              <option value="name_asc">Skill Name (A-Z)</option>
              <option value="name_desc">Skill Name (Z-A)</option>
              <option value="category_asc">Category (A-Z)</option>
            </select>
          </div>

          <span className="text-xs text-mh-slate-500">
            {filteredSkills.length} skills found
          </span>
        </div>
      </div>

      {/* Main List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
        {loadingSkills || loadingPieces ? (
          <div className="flex h-48 items-center justify-center text-xs text-mh-slate-500">
            <Loader2 size={18} className="animate-spin mr-2" />
            Loading skill armour mappings…
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center text-xs text-mh-slate-500">
            <Sparkles size={32} className="mb-2 opacity-40" />
            No skills matching your search criteria.
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <SkillMappingCard
              key={skill.id}
              game={game}
              skill={skill}
              monsters={monsters}
              piecesWithSkill={skillToPiecesMap.get(skill.id) ?? []}
              onAssignToPiece={() => setAssigningSkill(skill)}
            />
          ))
        )}
      </div>

      {/* Assign Modal */}
      {assigningSkill && (
        <AssignToPieceModal
          game={game}
          skill={assigningSkill}
          monsters={monsters}
          armourPieces={armourPieces}
          onClose={() => setAssigningSkill(null)}
        />
      )}
    </div>
  );
}
