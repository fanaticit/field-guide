// ─────────────────────────────────────────────────────────────
// ArmourGuide — Investigation Notes Armour Explorer & Simulation
// Left-aligned layout, combined skill levels, highlighted set effects, and clean reference format.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  Sparkles,
  Layers,
  Lock,
  Unlock,
  Flame,
  Swords,
  Target,
  CheckCircle2,
  LogIn,
  Plus,
} from 'lucide-react';
import {
  type ArmourSlot,
  type ArmourSkill,
} from '../../data/schemas/armour';
import { useAdminArmourPieces, type DBArmourPiece } from '../../hooks/useAdminArmour';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useAdminSkills, type DBSkill } from '../../hooks/useAdminSkills';
import { getRarityBadgeStyle } from '../admin/armour/MonsterArmourBuilder';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import {
  useHunterChallenges,
  useAddArmourChallenge,
  useIncrementChallenge,
  getArmourPieceChallenge,
  isArmourPieceTracked,
} from '../../hooks/useHunterChallenges';
import LoginModal from '../../components/auth/LoginModal';

// Canonical 5 Armour Slots in order
export const SLOTS_ORDER: Array<{
  id: ArmourSlot;
  label: string;
  subLabel: string;
  defaultIcon: string;
}> = [
  { id: 'helm', label: 'Helm', subLabel: 'Headwear', defaultIcon: '/images/armor/helm.png' },
  { id: 'chest', label: 'Chest', subLabel: 'Mail', defaultIcon: '/images/armor/chest.png' },
  { id: 'gloves', label: 'Arms', subLabel: 'Gauntlets', defaultIcon: '/images/armor/gloves.png' },
  { id: 'waist', label: 'Coil', subLabel: 'Waist', defaultIcon: '/images/armor/waist.png' },
  { id: 'greaves', label: 'Greaves', subLabel: 'Legs', defaultIcon: '/images/armor/greaves.png' },
];

export interface GroupedArmourSet {
  id: string; // e.g. "rathalos:I"
  monsterId: string;
  monsterName: string;
  setVariant: string;
  setName: string;
  displayName: string;
  setIcon: string | null;
  rarity: number;
  isMonster: boolean;
  pieces: Record<ArmourSlot, DBArmourPiece | undefined>;
  allSkills: ArmourSkill[];
  distinctUnlockRarities: number[];
  maxRarity: number;
}

export default function ArmourGuide() {
  // Game Selector (Defaults to MHO)
  const [game, setGame] = useState<string>('mho');
  const [search, setSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState<number | 'all'>('all');
  const [filterSkillId, setFilterSkillId] = useState<string>('all');

  // Selected Set & Slot state
  // selectedSlot: null = Set Icon (Combined 5-piece view), 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves' = piece view
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ArmourSlot | null>(null);

  // Interactive Rarity Level (Defaults to max upgrade level 16)
  const [sliderRarity, setSliderRarity] = useState<number>(16);

  // Queries
  const { data: pieces = [], isLoading: isLoadingPieces } = useAdminArmourPieces(game);
  const { data: monsters = [] } = useAdminMonsters({ game, isActive: true });
  const { data: dbSkills = [] } = useAdminSkills({ game, isActive: true });

  // ── Challenge tracking ────────────────────────────────────────
  const { user } = useAuthStore();
  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const addChallenge = useAddArmourChallenge();
  const incrementChallenge = useIncrementChallenge();

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [addedPieceId, setAddedPieceId] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const skillsMap = useMemo(() => new Map(dbSkills.map((s) => [s.id, s])), [dbSkills]);

  const handleAddChallenge = useCallback(async (piece: DBArmourPiece, set: GroupedArmourSet) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }

    setChallengeError(null);

    try {
      const monster = monstersMap.get(set.monsterId);
      const result = await addChallenge.mutateAsync({
        userId:        user.id,
        game,
        armourPieceId: piece.id,
        monsterId:     set.monsterId,
        armourSlot:    piece.slot,
        setVariant:    piece.set_variant || 'I',
        setName:       set.displayName,
        pieceImage:    piece.image ?? null,
        setIcon:       set.setIcon ?? null,
        monsterName:   monster?.name ?? set.monsterName,
        craftRarity:   set.rarity || 1,
        maxRarity:     set.maxRarity || 16,
      });

      if (!result.wasAlreadyTracked) {
        setAddedPieceId(piece.id);
        setTimeout(() => setAddedPieceId(null), 2500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add challenge. Please try again.';
      // Surface table-not-found clearly
      const friendlyMsg = msg.includes('does not exist') || msg.includes('relation')
        ? 'Database table not set up yet. Please apply the migration in the Supabase dashboard.'
        : msg;
      setChallengeError(friendlyMsg);
      setTimeout(() => setChallengeError(null), 6000);
    }
  }, [user, game, monstersMap, addChallenge]);


  // Group pieces into complete Armour Sets
  const allSets = useMemo(() => {
    const groupMap = new Map<string, {
      monsterId: string;
      setVariant: string;
      setName: string | null;
      setIcon: string | null;
      rarity: number;
      pieces: Partial<Record<ArmourSlot, DBArmourPiece>>;
    }>();

    for (const p of pieces) {
      if (!p.is_active) continue;
      const monsterId = p.monster_id;
      const setVariant = p.set_variant || 'I';
      const key = `${monsterId}:${setVariant}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          monsterId,
          setVariant,
          setName: p.set_name,
          setIcon: p.set_icon || null,
          rarity: p.rarity ?? 1,
          pieces: {},
        });
      }

      const grp = groupMap.get(key)!;
      grp.pieces[p.slot] = p;
      if (p.set_name && !grp.setName) grp.setName = p.set_name;
      if (p.set_icon && !grp.setIcon) grp.setIcon = p.set_icon;
      if (p.rarity && p.rarity > grp.rarity) grp.rarity = p.rarity;
    }

    const result: GroupedArmourSet[] = [];

    for (const [key, grp] of groupMap.entries()) {
      const monster = monstersMap.get(grp.monsterId);
      const isMonster = Boolean(monster);

      const monsterName = monster?.name ?? grp.monsterId
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const rawSetName = grp.setName || (grp.setVariant ? `Set ${grp.setVariant}` : 'Set I');
      const displayName = `${monsterName} — ${rawSetName}`;
      const setIcon = grp.setIcon || monster?.icon || null;

      // Extract all skills and distinct unlock rarities
      const allSkills: ArmourSkill[] = [];
      const raritiesSet = new Set<number>();
      raritiesSet.add(grp.rarity);
      raritiesSet.add(1);

      for (const slotDef of SLOTS_ORDER) {
        const piece = grp.pieces[slotDef.id];
        if (piece?.skills) {
          for (const s of piece.skills) {
            allSkills.push(s);
            const ur = s.unlockRarity ?? s.unlock_rarity;
            if (ur && ur > 1) {
              raritiesSet.add(ur);
            }
          }
        }
      }

      const distinctUnlockRarities = Array.from(raritiesSet).sort((a, b) => a - b);
      const maxRarity = Math.max(16, ...distinctUnlockRarities);

      result.push({
        id: key,
        monsterId: grp.monsterId,
        monsterName,
        setVariant: grp.setVariant,
        setName: rawSetName,
        displayName,
        setIcon,
        rarity: grp.rarity,
        isMonster,
        pieces: grp.pieces as Record<ArmourSlot, DBArmourPiece | undefined>,
        allSkills,
        distinctUnlockRarities,
        maxRarity,
      });
    }

    // Sort by Rarity Descending, then Alphabetical by displayName
    result.sort((a, b) => {
      if (b.rarity !== a.rarity) {
        return b.rarity - a.rarity;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return result;
  }, [pieces, monstersMap]);

  // Filtered sets based on search, rarity, and skill
  const filteredSets = useMemo(() => {
    return allSets.filter((set) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const monster = monstersMap.get(set.monsterId);
        const matchesName =
          set.displayName.toLowerCase().includes(q) ||
          set.monsterName.toLowerCase().includes(q) ||
          set.setName.toLowerCase().includes(q) ||
          set.monsterId.toLowerCase().includes(q) ||
          (monster?.name ?? '').toLowerCase().includes(q) ||
          (monster?.name_ja ?? '').toLowerCase().includes(q);

        const matchesSkill = set.allSkills.some((s) => {
          const meta = skillsMap.get(s.id);
          return (
            s.id.toLowerCase().includes(q) ||
            (meta?.name ?? '').toLowerCase().includes(q)
          );
        });

        if (!matchesName && !matchesSkill) return false;
      }

      // Rarity filter
      if (filterRarity !== 'all') {
        if (set.rarity !== filterRarity) return false;
      }

      // Skill filter
      if (filterSkillId !== 'all') {
        const hasSkill = set.allSkills.some((s) => s.id === filterSkillId);
        if (!hasSkill) return false;
      }

      return true;
    });
  }, [allSets, search, filterRarity, filterSkillId, monstersMap, skillsMap]);

  // Ensure an active set is selected
  useEffect(() => {
    if (!selectedSetId && filteredSets.length > 0) {
      setSelectedSetId(filteredSets[0].id);
      setSelectedSlot(null);
      setSliderRarity(filteredSets[0].maxRarity || 16);
    } else if (selectedSetId && !allSets.some((s) => s.id === selectedSetId) && filteredSets.length > 0) {
      setSelectedSetId(filteredSets[0].id);
      setSelectedSlot(null);
      setSliderRarity(filteredSets[0].maxRarity || 16);
    }
  }, [filteredSets, selectedSetId, allSets]);

  // Active selected set
  const currentSet = useMemo(() => {
    return allSets.find((s) => s.id === selectedSetId) || null;
  }, [allSets, selectedSetId]);

  // Reset slider when set changes
  const handleSelectSet = (setId: string, slot: ArmourSlot | null = null) => {
    setSelectedSetId(setId);
    setSelectedSlot(slot);
    const targetSet = allSets.find((s) => s.id === setId);
    if (targetSet) {
      setSliderRarity(targetSet.maxRarity || 16);
    }
  };

  // Active selected piece (if in piece view)
  const currentPiece = useMemo(() => {
    if (!currentSet || !selectedSlot) return null;
    return currentSet.pieces[selectedSlot] || null;
  }, [currentSet, selectedSlot]);

  // ── Combined Skills Aggregation for Full Set View ─────────────
  const { combinedActiveSkills, setBonusSummaries, lockedSkillTiers } = useMemo(() => {
    if (!currentSet) {
      return { combinedActiveSkills: [], setBonusSummaries: [], lockedSkillTiers: [] };
    }

    const activeMap = new Map<
      string,
      {
        id: string;
        meta: DBSkill | undefined;
        totalLevel: number;
        maxLevel: number;
        sources: Array<{ slot: ArmourSlot; level: number; unlockRarity: number | null }>;
      }
    >();

    const lockedList: Array<{
      skillId: string;
      skillName: string;
      slot: ArmourSlot;
      level: number;
      unlockRarity: number;
    }> = [];

    const setBonusSkillsFound = new Set<string>();

    // Scan all 5 pieces
    for (const slotDef of SLOTS_ORDER) {
      const piece = currentSet.pieces[slotDef.id];
      if (!piece?.skills) continue;

      for (const skill of piece.skills) {
        const ur = skill.unlockRarity ?? skill.unlock_rarity ?? null;
        const isActiveAtSlider = ur === null || ur <= sliderRarity;
        const meta = skillsMap.get(skill.id);

        if (meta?.is_set_bonus) {
          setBonusSkillsFound.add(skill.id);
        }

        if (isActiveAtSlider) {
          if (!activeMap.has(skill.id)) {
            const maxLvl = meta?.max_levels?.[game] ?? 5;
            activeMap.set(skill.id, {
              id: skill.id,
              meta,
              totalLevel: 0,
              maxLevel: maxLvl,
              sources: [],
            });
          }

          const entry = activeMap.get(skill.id)!;
          entry.totalLevel += skill.level;
          entry.sources.push({ slot: slotDef.id, level: skill.level, unlockRarity: ur });
        } else if (ur !== null && ur > sliderRarity) {
          lockedList.push({
            skillId: skill.id,
            skillName: meta?.name ?? skill.id,
            slot: slotDef.id,
            level: skill.level,
            unlockRarity: ur,
          });
        }
      }
    }

    // Sort active skills
    const combinedActiveSkills = Array.from(activeMap.values()).sort((a, b) => {
      const isSetA = Boolean(a.meta?.is_set_bonus);
      const isSetB = Boolean(b.meta?.is_set_bonus);
      if (isSetA !== isSetB) return isSetA ? -1 : 1;
      return (a.meta?.name ?? a.id).localeCompare(b.meta?.name ?? b.id);
    });

    // Process set bonuses (clean reference format with full description)
    const setBonusSummaries = Array.from(setBonusSkillsFound).map((skillId) => {
      const meta = skillsMap.get(skillId);
      return {
        skillId,
        skillName: meta?.name ?? skillId,
        description: meta?.description,
      };
    });

    // Sort locked tiers by unlock rarity ascending
    lockedList.sort((a, b) => a.unlockRarity - b.unlockRarity);

    return { combinedActiveSkills, setBonusSummaries, lockedSkillTiers: lockedList };
  }, [currentSet, sliderRarity, skillsMap, game]);

  // ── Combined Skills Aggregation for Single Piece View ─────────
  const { pieceSetBonuses, pieceActiveSkills, pieceLockedSkills } = useMemo(() => {
    if (!currentPiece) return { pieceSetBonuses: [], pieceActiveSkills: [], pieceLockedSkills: [] };

    const setBonuses: Array<{ skill: ArmourSkill; meta: DBSkill | undefined }> = [];
    const activeSkillMap = new Map<string, { skillId: string; meta: DBSkill | undefined; totalLevel: number; maxLevel: number }>();
    const lockedSkillMap = new Map<string, { skillId: string; meta: DBSkill | undefined; additionalLevel: number; unlockRarity: number }>();

    for (const s of currentPiece.skills) {
      const ur = s.unlockRarity ?? s.unlock_rarity ?? null;
      const meta = skillsMap.get(s.id);
      const isSetBonus = meta?.is_set_bonus ?? false;

      if (isSetBonus) {
        // Set Bonus goes to separate prominent highlight
        setBonuses.push({ skill: s, meta });
      } else {
        // Regular skill
        if (ur === null || ur <= sliderRarity) {
          // Active at slider level -> combine duplicates
          const current = activeSkillMap.get(s.id);
          const maxLvl = meta?.max_levels?.[game] ?? 5;
          if (current) {
            current.totalLevel += s.level;
          } else {
            activeSkillMap.set(s.id, {
              skillId: s.id,
              meta,
              totalLevel: s.level,
              maxLevel: maxLvl,
            });
          }
        } else {
          // Locked at slider level — key by skillId AND unlockRarity so each unlock tier is distinct
          const lockKey = `${s.id}:${ur}`;
          const current = lockedSkillMap.get(lockKey);
          if (current) {
            current.additionalLevel += s.level;
          } else {
            lockedSkillMap.set(lockKey, {
              skillId: s.id,
              meta,
              additionalLevel: s.level,
              unlockRarity: ur,
            });
          }
        }
      }
    }

    const pieceActiveSkills = Array.from(activeSkillMap.values());
    const pieceLockedSkills = Array.from(lockedSkillMap.values()).sort((a, b) => a.unlockRarity - b.unlockRarity);

    return { pieceSetBonuses: setBonuses, pieceActiveSkills, pieceLockedSkills };
  }, [currentPiece, sliderRarity, skillsMap, game]);

  return (
    <div className="p-4 lg:p-6 space-y-4 w-full">
      {/* ── Compact Top Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mh-slate-800 pb-3">
        {/* Far Left: Search Bar */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monsters, sets, skills…"
            className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-900 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
          />
        </div>

        {/* Right Controls: Rarity Filter, Skills Filter, Game Selector, Set Count */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Rarity Filter */}
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="rounded-xl border border-mh-slate-750 bg-mh-slate-900 px-3 py-1.5 text-xs font-semibold text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none"
          >
            <option value="all">All Rarities</option>
            {[16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                Rarity {r} (R{r})
              </option>
            ))}
          </select>

          {/* Skill Filter */}
          <select
            value={filterSkillId}
            onChange={(e) => setFilterSkillId(e.target.value)}
            className="rounded-xl border border-mh-slate-750 bg-mh-slate-900 px-3 py-1.5 text-xs font-semibold text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none max-w-[190px]"
          >
            <option value="all">All Skills</option>
            {dbSkills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_set_bonus ? '(Set Bonus)' : ''}
              </option>
            ))}
          </select>

          {/* Mini Game Selector */}
          <div className="flex items-center rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setGame('mho')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                game === 'mho'
                  ? 'bg-mh-gold-500 text-slate-950 shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              MHO
            </button>
            <button
              type="button"
              onClick={() => setGame('mhn')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                game === 'mhn'
                  ? 'bg-mh-gold-500 text-slate-950 shadow-sm'
                  : 'text-mh-slate-400 hover:text-white',
              )}
            >
              MHN
            </button>
          </div>

          <span className="text-xs text-mh-slate-500 font-semibold px-1">
            {filteredSets.length} Sets
          </span>
        </div>
      </div>

      {/* ── Left-Aligned Dual-Pane Layout ── */}
      {isLoadingPieces ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" />
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-mh-slate-750 bg-mh-slate-900/40 p-16 text-center">
          <Shield size={40} className="text-mh-slate-600 mb-2" />
          <p className="text-sm font-semibold text-mh-slate-300">No armour sets found</p>
          <p className="text-xs text-mh-slate-500 mt-1">Try clearing your search query or choosing another game/rarity.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
          {/* ═════════════════════════════════════════════════════════ */}
          {/* LEFT PANE: 6-Blocks-In-A-Row List (Fixed Width, Left Aligned) */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 space-y-2.5 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
            {filteredSets.map((set) => {
              const isSetSelected = currentSet?.id === set.id;
              const rarityStyle = getRarityBadgeStyle(set.rarity);
              const pieceCount = Object.values(set.pieces).filter(Boolean).length;

              return (
                <div
                  key={set.id}
                  className={cn(
                    'rounded-2xl border p-2.5 transition-all duration-150',
                    isSetSelected
                      ? 'border-mh-gold-500/60 bg-mh-slate-850 shadow-md shadow-mh-gold-500/5'
                      : 'border-mh-slate-800 bg-mh-slate-900/70 hover:border-mh-slate-700 hover:bg-mh-slate-850/60',
                  )}
                >
                  {/* Set Row Header: Monster Name — Set Name */}
                  <div className="flex items-center justify-between gap-2 mb-2 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-display text-xs sm:text-sm font-bold text-mh-slate-100 truncate">
                        {set.displayName}
                      </h3>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.2 text-[10px] font-bold border font-mono shrink-0',
                          rarityStyle.bg,
                          rarityStyle.text,
                          rarityStyle.border,
                        )}
                      >
                        {rarityStyle.label}
                      </span>
                    </div>

                    <span className="text-[10px] text-mh-slate-500 font-semibold shrink-0">
                      {pieceCount}/5 Pieces
                    </span>
                  </div>

                  {/* ── The 6 Blocks in a Row ── */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {/* Block 1: Set Icon (Monster/Material) -> Triggers Full Set View */}
                    <button
                      type="button"
                      onClick={() => handleSelectSet(set.id, null)}
                      title={`${set.displayName} (Full Set)`}
                      className={cn(
                        'group relative flex flex-col items-center justify-center rounded-xl border p-1 aspect-square transition-all',
                        isSetSelected && selectedSlot === null
                          ? 'border-mh-gold-400 bg-mh-gold-500/20 ring-2 ring-mh-gold-400/50 shadow-sm'
                          : 'border-mh-slate-750 bg-mh-slate-950/80 hover:border-mh-gold-500/40 hover:bg-mh-slate-800',
                      )}
                    >
                      <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center">
                        {set.setIcon ? (
                          <img
                            src={set.setIcon}
                            alt="Set Icon"
                            className="h-full w-full object-contain filter drop-shadow"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Layers size={24} className="text-mh-gold-400" />
                        )}
                      </div>
                      <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-mh-gold-400 leading-none">
                        SET
                      </span>
                    </button>

                    {/* Blocks 2–6: Helm, Chest, Arms, Coil, Greaves */}
                    {SLOTS_ORDER.map((slotDef) => {
                      const piece = set.pieces[slotDef.id];
                      const isPieceActive = isSetSelected && selectedSlot === slotDef.id;
                      const hasPiece = Boolean(piece);
                      const pieceSkillsCount = piece?.skills?.length ?? 0;
                      const isTracked = piece ? isArmourPieceTracked(challenges, piece.id) : false;

                      return (
                        <button
                          key={slotDef.id}
                          type="button"
                          disabled={!hasPiece}
                          onClick={() => handleSelectSet(set.id, slotDef.id)}
                          title={piece ? `${set.displayName} ${slotDef.label} (${pieceSkillsCount} Skills)` : `No ${slotDef.label}`}
                          className={cn(
                            'group relative flex flex-col items-center justify-center rounded-xl border p-1 aspect-square transition-all',
                            !hasPiece && 'opacity-30 border-mh-slate-800 bg-mh-slate-950/30 cursor-not-allowed',
                            hasPiece && !isPieceActive && 'border-mh-slate-750 bg-mh-slate-950/60 hover:border-mh-slate-600 hover:bg-mh-slate-800',
                            isPieceActive && 'border-mh-gold-400 bg-mh-gold-500/20 ring-2 ring-mh-gold-400/50 shadow-sm',
                          )}
                        >
                          <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center">
                            {piece?.image ? (
                              <img
                                src={piece.image}
                                alt={slotDef.label}
                                className="h-full w-full object-contain filter brightness-95"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <img
                                src={slotDef.defaultIcon}
                                alt={slotDef.label}
                                className="h-full w-full object-contain opacity-55 group-hover:opacity-85 transition-opacity"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>

                          <span className="mt-0.5 text-[9px] font-bold text-mh-slate-400 truncate max-w-full leading-none">
                            {slotDef.label}
                          </span>

                          {pieceSkillsCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-mh-slate-800 border border-mh-slate-650 text-[8px] font-mono font-bold text-mh-gold-400">
                              {pieceSkillsCount}
                            </span>
                          )}

                          {/* Tracking badge — shown when this piece is in hunter's challenges */}
                          {isTracked && (
                            <span className="absolute -bottom-1 -left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 border border-emerald-400/60 shadow-sm" title="In your challenges">
                              <Target size={7} className="text-white" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* RIGHT PANE: Interactive Detail Panel (Auto-Sizes to Fill) */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 sticky top-4">
            {currentSet ? (
              <div className="rounded-3xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl p-4 sm:p-5 space-y-4">
                {/* ── Detail Header ── */}
                <div className="flex items-start justify-between gap-3 border-b border-mh-slate-800 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mh-slate-950 border border-mh-slate-750 p-1.5 shadow-inner">
                      {selectedSlot === null ? (
                        currentSet.setIcon ? (
                          <img
                            src={currentSet.setIcon}
                            alt="Set Icon"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Layers size={24} className="text-mh-gold-400" />
                        )
                      ) : currentPiece?.image ? (
                        <img
                          src={currentPiece.image}
                          alt="Piece"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Shield size={24} className="text-mh-gold-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display text-base font-bold text-mh-slate-100 truncate">
                          {selectedSlot === null
                            ? currentSet.displayName
                            : `${currentSet.displayName} — ${SLOTS_ORDER.find((s) => s.id === selectedSlot)?.label}`}
                        </h2>
                        {(() => {
                          const rStyle = getRarityBadgeStyle(currentSet.rarity);
                          return (
                            <span
                              className={cn(
                                'rounded px-2 py-0.5 text-[11px] font-bold border font-mono',
                                rStyle.bg,
                                rStyle.text,
                                rStyle.border,
                              )}
                            >
                              {rStyle.label}
                            </span>
                          );
                        })()}
                      </div>

                      <p className="text-xs text-mh-gold-400 font-semibold mt-0.5">
                        {selectedSlot === null ? (
                          <span>Full Set (5 Pieces Combined)</span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span>Slot: {SLOTS_ORDER.find((s) => s.id === selectedSlot)?.subLabel}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedSlot(null)}
                              className="text-[11px] text-mh-slate-400 hover:text-white underline ml-1"
                            >
                              (Switch to Full Set)
                            </button>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Add to My Challenges CTA (piece view only) ── */}
                {selectedSlot !== null && currentPiece && (() => {
                  const challenge = getArmourPieceChallenge(challenges, currentPiece.id);
                  const justAdded = addedPieceId === currentPiece.id;
                  const slotLabel = SLOTS_ORDER.find((s) => s.id === selectedSlot)?.label ?? selectedSlot;

                  if (!user) {
                    return (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 px-3 py-2.5">
                        <span className="text-xs text-mh-slate-400">Sign in to track this piece in your challenges</span>
                        <button
                          type="button"
                          onClick={() => setLoginModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-mh-gold-400 transition-colors shrink-0"
                        >
                          <LogIn size={13} />
                          Sign In
                        </button>
                      </div>
                    );
                  }

                  if (challenge) {
                    if (challenge.status === 'completed') {
                      return (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                          <span className="text-xs font-semibold text-emerald-300">
                            {slotLabel} crafted & upgraded to R{challenge.current_rarity} (Max)
                          </span>
                        </div>
                      );
                    }

                    // Active challenge (crafting or upgrading)
                    const isCrafted = challenge.current_rarity > 0;
                    return (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Target size={15} className="text-blue-400 shrink-0" />
                          <span className="text-xs font-semibold text-blue-300">
                            {isCrafted ? `Tracked at R${challenge.current_rarity}` : 'Tracking craft goal'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => incrementChallenge.mutateAsync(challenge)}
                          disabled={incrementChallenge.isPending}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-blue-400 transition-colors shrink-0 disabled:opacity-50"
                        >
                          <Plus size={13} />
                          {isCrafted ? `Upgrade to R${challenge.current_rarity + 1}` : 'Mark Crafted (R1)'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleAddChallenge(currentPiece, currentSet)}
                        disabled={addChallenge.isPending}
                        className={cn(
                          'flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all',
                          justAdded
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                            : 'border-mh-gold-500/40 bg-mh-gold-500/10 text-mh-gold-300 hover:bg-mh-gold-500/20 hover:text-mh-gold-200',
                          addChallenge.isPending && 'opacity-60 cursor-wait',
                        )}
                      >
                        {addChallenge.isPending ? (
                          <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" /> Adding…</>
                        ) : justAdded ? (
                          <><CheckCircle2 size={14} /> Added to your challenges!</>
                        ) : (
                          <><Target size={14} /> Add {slotLabel} to My Challenges</>
                        )}
                      </button>

                      {challengeError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
                          <span className="shrink-0 mt-0.5">⚠</span>
                          <span>{challengeError}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Compact Rarity Presets Line ── */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-mh-gold-500/25 bg-mh-gold-500/5 px-3 py-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-mh-gold-400">
                    <Sparkles size={14} />
                    <span>Rarity Tier:</span>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      { label: 'Base (R1)', val: 1 },
                      { label: 'R6', val: 6 },
                      { label: 'R9', val: 9 },
                      { label: 'R12', val: 12 },
                      { label: 'R13', val: 13 },
                      { label: 'R14', val: 14 },
                      { label: 'R15', val: 15 },
                      { label: `R16 (Max)`, val: currentSet.maxRarity || 16 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setSliderRarity(btn.val)}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                          sliderRarity === btn.val
                            ? 'bg-mh-gold-500 text-slate-950 font-black shadow-sm'
                            : 'bg-mh-slate-800 text-mh-slate-300 hover:bg-mh-slate-700 hover:text-white',
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Content: Full Set or Individual Piece ── */}
                {selectedSlot === null ? (
                  /* ═══════════════════════════════════════════════════════ */
                  /* FULL SET VIEW: Combined Skills & Set Bonuses           */
                  /* ═══════════════════════════════════════════════════════ */
                  <div className="space-y-3.5">
                    {/* Inherent Set Bonuses (Clean reference format with description) */}
                    {setBonusSummaries.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <Flame size={14} />
                          <span>Set Bonus Effect</span>
                        </h4>

                        <div className="space-y-2">
                          {setBonusSummaries.map((sb) => (
                            <div
                              key={sb.skillId}
                              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-amber-300">
                                  {sb.skillName}
                                </span>
                                <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                                  Inherent Set Effect
                                </span>
                              </div>

                              {sb.description && (
                                <p className="text-xs text-mh-slate-200 leading-relaxed italic">
                                  {sb.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Combined Skills */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300 flex items-center gap-1.5">
                          <Swords size={14} className="text-mh-gold-400" />
                          <span>Combined Active Skills ({combinedActiveSkills.length})</span>
                        </h4>
                        <span className="text-[11px] text-mh-slate-500">
                          Active at R{sliderRarity}
                        </span>
                      </div>

                      {combinedActiveSkills.length === 0 ? (
                        <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/40 p-4 text-center text-xs text-mh-slate-500 italic">
                          No active skills at rarity level {sliderRarity}. Try selecting a higher rarity preset!
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                          {combinedActiveSkills.map((entry) => {
                            const pct = Math.min(100, Math.round((entry.totalLevel / entry.maxLevel) * 100));

                            return (
                              <div
                                key={entry.id}
                                className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/70 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-mh-slate-100">
                                      {entry.meta?.name ?? entry.id}
                                    </span>
                                    {entry.meta?.is_set_bonus && (
                                      <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.2 border border-amber-500/30">
                                        Set Bonus
                                      </span>
                                    )}
                                  </div>

                                  <span className="rounded bg-mh-gold-500/20 text-mh-gold-300 font-mono text-xs font-bold px-2 py-0.5 border border-mh-gold-500/30">
                                    Level {entry.totalLevel} / {entry.maxLevel}
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1.5 w-full rounded-full bg-mh-slate-800 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-mh-gold-500 to-amber-400"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>

                                {/* Piece Contributions */}
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-mh-slate-400">
                                  <span className="text-mh-slate-500">From Pieces:</span>
                                  {entry.sources.map((src, sIdx) => {
                                    const slotLabel = SLOTS_ORDER.find((s) => s.id === src.slot)?.label;
                                    return (
                                      <span
                                        key={sIdx}
                                        className="rounded bg-mh-slate-850 border border-mh-slate-750 px-1.5 py-0.2 text-mh-slate-300 font-semibold"
                                      >
                                        {slotLabel}: +{src.level}
                                      </span>
                                    );
                                  })}
                                </div>

                                {entry.meta?.description && (
                                  <p className="text-xs text-mh-slate-400 leading-relaxed pt-0.5">
                                    {entry.meta.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Locked Upgrade Tiers */}
                    {lockedSkillTiers.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-mh-slate-800">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-400 flex items-center gap-1.5">
                            <Lock size={13} className="text-amber-400" />
                            <span>Locked Skills at Higher Rarities ({lockedSkillTiers.length})</span>
                          </h4>
                          <span className="text-[10px] text-mh-slate-500">
                            Select higher preset to unlock
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {lockedSkillTiers.map((locked, lIdx) => {
                            const slotLabel = SLOTS_ORDER.find((s) => s.id === locked.slot)?.label;
                            return (
                              <div
                                key={lIdx}
                                className="rounded-xl border border-dashed border-mh-slate-750 bg-mh-slate-950/40 p-2.5 flex items-center justify-between text-xs"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-mh-slate-300 truncate">
                                    {locked.skillName} (+{locked.level})
                                  </p>
                                  <p className="text-[10px] text-mh-slate-500 truncate">
                                    on {slotLabel}
                                  </p>
                                </div>
                                <span className="rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 border border-amber-500/40 shrink-0">
                                  Unlocks at R{locked.unlockRarity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ═══════════════════════════════════════════════════════ */
                  /* SINGLE PIECE VIEW: Set Effect Highlight + Piece Skills */
                  /* ═══════════════════════════════════════════════════════ */
                  <div className="space-y-3.5">
                    {/* Orange Highlight Banner for Inherent Set Effect on this Piece */}
                    {pieceSetBonuses.length > 0 && (
                      <div className="space-y-2">
                        {pieceSetBonuses.map(({ skill, meta }, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-amber-500/40 bg-amber-500/15 p-3 space-y-1.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Flame size={15} className="text-amber-400" />
                                <span className="font-bold text-sm text-amber-200">
                                  Set Effect: {meta?.name ?? skill.id}
                                </span>
                              </div>
                              <span className="shrink-0 rounded bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/50">
                                Inherent Set Effect
                              </span>
                            </div>

                            {meta?.description && (
                              <p className="text-xs text-amber-100/90 leading-relaxed italic">
                                {meta.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Active Regular Skills on this piece (Combined duplicates) */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300 flex items-center gap-1.5">
                        <Unlock size={14} className="text-emerald-400" />
                        <span>Active Skills at Rarity {sliderRarity} ({pieceActiveSkills.length})</span>
                      </h4>

                      {pieceActiveSkills.length === 0 ? (
                        <p className="text-xs text-mh-slate-500 italic py-2">
                          No active regular skills at rarity {sliderRarity}. Select a higher rarity preset to unlock!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {pieceActiveSkills.map(({ skillId, meta, totalLevel, maxLevel }, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-mh-slate-750 bg-mh-slate-950/70 p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-mh-slate-100">
                                  {meta?.name ?? skillId}
                                </span>
                                <span className="rounded bg-mh-gold-500/20 text-mh-gold-300 font-mono text-xs font-bold px-2 py-0.5 border border-mh-gold-500/30">
                                  Level {totalLevel} / {maxLevel}
                                </span>
                              </div>

                              {meta?.description && (
                                <p className="text-xs text-mh-slate-400 leading-relaxed">
                                  {meta.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Locked Skills on this piece */}
                    {pieceLockedSkills.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-mh-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <Lock size={13} />
                          <span>Locked Skills ({pieceLockedSkills.length})</span>
                        </h4>

                        <div className="space-y-2">
                          {pieceLockedSkills.map(({ skillId, meta, additionalLevel, unlockRarity }, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold text-xs text-mh-slate-200">
                                  {meta?.name ?? skillId} (+{additionalLevel} Level)
                                </p>
                                <p className="text-[11px] text-mh-slate-400 mt-0.5">
                                  Requires upgrading piece to Rarity {unlockRarity}
                                </p>
                              </div>

                              <span className="rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold px-2 py-0.5 border border-amber-500/40">
                                Unlocks at R{unlockRarity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes & Driftsmelt */}
                    {currentPiece?.notes && (
                      <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/40 p-3 space-y-1">
                        <span className="text-[11px] font-bold text-mh-slate-400 uppercase tracking-wider">
                          Notes
                        </span>
                        <p className="text-xs text-mh-slate-300 leading-relaxed">
                          {currentPiece.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-mh-slate-800 bg-mh-slate-900/40 p-12 text-center text-xs text-mh-slate-500">
                Select an armour set or piece from the list on the left to inspect skills and simulate upgrade levels.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login Modal — triggered when guest tries to add a challenge */}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}
