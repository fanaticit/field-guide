// ─────────────────────────────────────────────────────────────
// ArmourGuide — Investigation Notes Armour Explorer & Simulation
// Left-aligned layout, combined skill levels, highlighted set effects, and clean reference format.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Trash2,
  X,
  User,
  Crosshair,
  HeartPulse,
  Skull,
  Sliders,
  Heart,
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

// Skill Category Color Themes
export const SKILL_CATEGORY_THEMES: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    ring: string;
    badge: string;
    hoverBg: string;
    chipBg: string;
    chipBorder: string;
    chipText: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  attack: {
    label: 'Attack',
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    border: 'border-red-400',
    ring: 'ring-red-400/60',
    badge: 'bg-red-500 text-white border-red-400',
    hoverBg: 'hover:bg-red-500/30',
    chipBg: 'bg-red-500/15',
    chipBorder: 'border-red-500/40',
    chipText: 'text-red-300',
    icon: Swords,
  },
  critical: {
    label: 'Critical',
    bg: 'bg-pink-500/20',
    text: 'text-pink-300',
    border: 'border-pink-400',
    ring: 'ring-pink-400/60',
    badge: 'bg-pink-500 text-white border-pink-400',
    hoverBg: 'hover:bg-pink-500/30',
    chipBg: 'bg-pink-500/15',
    chipBorder: 'border-pink-500/40',
    chipText: 'text-pink-300',
    icon: Crosshair,
  },
  defense: {
    label: 'Defense',
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    border: 'border-blue-400',
    ring: 'ring-blue-400/60',
    badge: 'bg-blue-500 text-white border-blue-400',
    hoverBg: 'hover:bg-blue-500/30',
    chipBg: 'bg-blue-500/15',
    chipBorder: 'border-blue-500/40',
    chipText: 'text-blue-300',
    icon: Shield,
  },
  survival: {
    label: 'Survival',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-400',
    ring: 'ring-emerald-400/60',
    badge: 'bg-emerald-500 text-white border-emerald-400',
    hoverBg: 'hover:bg-emerald-500/30',
    chipBg: 'bg-emerald-500/15',
    chipBorder: 'border-emerald-500/40',
    chipText: 'text-emerald-300',
    icon: HeartPulse,
  },
  status: {
    label: 'Status',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-400',
    ring: 'ring-amber-400/60',
    badge: 'bg-amber-500 text-slate-950 border-amber-400',
    hoverBg: 'hover:bg-amber-500/30',
    chipBg: 'bg-amber-500/15',
    chipBorder: 'border-amber-500/40',
    chipText: 'text-amber-300',
    icon: Skull,
  },
  utility: {
    label: 'Utility',
    bg: 'bg-teal-500/20',
    text: 'text-teal-300',
    border: 'border-teal-400',
    ring: 'ring-teal-400/60',
    badge: 'bg-teal-500 text-slate-950 border-teal-400',
    hoverBg: 'hover:bg-teal-500/30',
    chipBg: 'bg-teal-500/15',
    chipBorder: 'border-teal-400',
    chipText: 'text-teal-300',
    icon: Sliders,
  },
  health: {
    label: 'Health',
    bg: 'bg-lime-500/20',
    text: 'text-lime-300',
    border: 'border-lime-400',
    ring: 'ring-lime-400/60',
    badge: 'bg-lime-500 text-slate-950 border-lime-400',
    hoverBg: 'hover:bg-lime-500/30',
    chipBg: 'bg-lime-500/15',
    chipBorder: 'border-lime-400',
    chipText: 'text-lime-300',
    icon: Heart,
  },
  general: {
    label: 'General',
    bg: 'bg-purple-500/20',
    text: 'text-purple-300',
    border: 'border-purple-400',
    ring: 'ring-purple-400/60',
    badge: 'bg-purple-500 text-white border-purple-400',
    hoverBg: 'hover:bg-purple-500/30',
    chipBg: 'bg-purple-500/15',
    chipBorder: 'border-purple-500/40',
    chipText: 'text-purple-300',
    icon: Sparkles,
  },
  set_bonus: {
    label: 'Set Bonus',
    bg: 'bg-orange-500/20',
    text: 'text-orange-300',
    border: 'border-orange-400',
    ring: 'ring-orange-400/60',
    badge: 'bg-orange-500 text-slate-950 border-orange-400',
    hoverBg: 'hover:bg-orange-500/30',
    chipBg: 'bg-orange-500/15',
    chipBorder: 'border-orange-500/40',
    chipText: 'text-orange-300',
    icon: Flame,
  },
};

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

export interface ExampleBuildItem {
  piece: DBArmourPiece;
  set: GroupedArmourSet;
}

export type ExampleBuild = Partial<Record<ArmourSlot, ExampleBuildItem>>;

export default function ArmourGuide() {
  // Game Selector (Defaults to MHO)
  const [game] = useState<string>('mho');
  const [search, setSearch] = useState('');
  
  // Multi-skill filter
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState<string>('');

  // Example Build (5 slots)
  const [exampleBuild, setExampleBuild] = useState<ExampleBuild>({});
  const [buildAddedSlot, setBuildAddedSlot] = useState<ArmourSlot | null>(null);

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

  // ── Challenge tracking & Auth ─────────────────────────────────
  const { user, profile } = useAuthStore();
  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const addChallenge = useAddArmourChallenge();
  const navigate = useNavigate();

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

  // Sorted unselected skills available for the skill picker
  const sortedAvailableSkills = useMemo(() => {
    let list = dbSkills.filter((s) => !selectedSkillIds.includes(s.id));
    if (skillSearchQuery.trim()) {
      const q = skillSearchQuery.toLowerCase().trim();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [dbSkills, selectedSkillIds, skillSearchQuery]);

  // Count equipped pieces in example build
  const equippedBuildCount = Object.values(exampleBuild).filter(Boolean).length;

  // Combined Active Skills in Example Build (Only granting set bonus benefits when required pieces are met)
  const exampleBuildSkills = useMemo(() => {
    // Count pieces per set in the build
    const setCountMap = new Map<string, number>();
    for (const slotDef of SLOTS_ORDER) {
      const item = exampleBuild[slotDef.id];
      if (item) {
        setCountMap.set(item.set.id, (setCountMap.get(item.set.id) || 0) + 1);
      }
    }

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        meta: DBSkill | undefined;
        totalLevel: number;
        maxLevel: number;
        isSetBonus: boolean;
        sources: Array<{ slot: ArmourSlot; pieceName: string; level: number }>;
      }
    >();

    for (const slotDef of SLOTS_ORDER) {
      const item = exampleBuild[slotDef.id];
      if (!item?.piece?.skills) continue;

      for (const s of item.piece.skills) {
        const ur = s.unlockRarity ?? s.unlock_rarity ?? 1;
        if (ur <= sliderRarity) {
          const meta = skillsMap.get(s.id);
          const isSetBonus = Boolean(meta?.is_set_bonus);

          // Only activate set bonus if required threshold of pieces from this set is met
          if (isSetBonus) {
            const piecesInSet = setCountMap.get(item.set.id) || 0;
            const thresholds = meta?.set_thresholds ?? [];
            const requiredPieces = thresholds[0]?.pieces ?? 2;
            if (piecesInSet < requiredPieces) {
              continue;
            }
          }

          const name = meta?.name ?? s.id;
          const maxLevel =
            meta?.max_levels?.[game] ??
            (meta?.max_levels ? Object.values(meta.max_levels)[0] : undefined) ??
            (meta?.is_set_bonus ? (meta?.set_thresholds?.length || 1) : 5);
          const current = map.get(s.id);
          if (current) {
            if (!isSetBonus) {
              current.totalLevel += s.level;
            }
            current.sources.push({
              slot: slotDef.id,
              pieceName: `${item.set.monsterName} ${slotDef.label}`,
              level: s.level,
            });
          } else {
            map.set(s.id, {
              id: s.id,
              name,
              meta,
              totalLevel: s.level,
              maxLevel,
              isSetBonus,
              sources: [
                {
                  slot: slotDef.id,
                  pieceName: `${item.set.monsterName} ${slotDef.label}`,
                  level: s.level,
                },
              ],
            });
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isSetBonus !== b.isSetBonus) return a.isSetBonus ? -1 : 1;
      return b.totalLevel - a.totalLevel || a.name.localeCompare(b.name);
    });
  }, [exampleBuild, sliderRarity, skillsMap, game]);

  // Filtered sets based on search and multi-skill filter
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

      // Multi-skill filter: set must have at least one piece with any of the selected skills
      if (selectedSkillIds.length > 0) {
        const hasMatchingSkill = set.allSkills.some((s) => selectedSkillIds.includes(s.id));
        if (!hasMatchingSkill) return false;
      }

      return true;
    });
  }, [allSets, search, selectedSkillIds, monstersMap, skillsMap]);

  // Helper to find matching skill theme for a piece
  const getPieceMatchingTheme = useCallback(
    (piece: DBArmourPiece | undefined) => {
      if (!piece || !piece.skills || selectedSkillIds.length === 0) return null;
      const match = piece.skills.find((s) => selectedSkillIds.includes(s.id));
      if (!match) return null;
      const meta = skillsMap.get(match.id);
      const cat = meta?.category || (meta?.is_set_bonus ? 'set_bonus' : 'general');
      return SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;
    },
    [selectedSkillIds, skillsMap],
  );

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
      <div className="space-y-2 border-b border-mh-slate-800 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Far Left: Search Bar */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mh-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search monsters, sets, skills…"
              className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-900 py-1.5 pl-8 pr-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
            />
          </div>

          {/* Right Controls: Type to filter skill, Skill Dropdown, Add Skill Button, Sets Count */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Skill Search Input */}
            <div className="relative min-w-[130px] max-w-[160px]">
              <input
                type="text"
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                placeholder="Find skill..."
                className="w-full rounded-xl border border-mh-slate-750 bg-mh-slate-900 py-1.5 px-3 text-xs text-mh-slate-200 placeholder:text-mh-slate-500 focus:border-mh-gold-500/50 focus:outline-none"
              />
              {skillSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSkillSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-mh-slate-500 hover:text-mh-slate-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Skill Selector Dropdown */}
            <select
              value={selectedSkillToAdd}
              onChange={(e) => setSelectedSkillToAdd(e.target.value)}
              className="rounded-xl border border-mh-slate-750 bg-mh-slate-900 px-3 py-1.5 text-xs font-semibold text-mh-slate-300 focus:border-mh-gold-500/50 focus:outline-none max-w-[200px]"
            >
              <option value="">Select skill to add…</option>
              {sortedAvailableSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_set_bonus ? '(Set Bonus)' : ''}
                </option>
              ))}
            </select>

            {/* Add Skill Button */}
            <button
              type="button"
              disabled={!selectedSkillToAdd}
              onClick={() => {
                if (selectedSkillToAdd && !selectedSkillIds.includes(selectedSkillToAdd)) {
                  setSelectedSkillIds((prev) => [...prev, selectedSkillToAdd]);
                  setSelectedSkillToAdd('');
                  setSkillSearchQuery('');
                }
              }}
              className="flex items-center gap-1 rounded-xl bg-mh-gold-500 hover:bg-mh-gold-400 disabled:opacity-40 disabled:hover:bg-mh-gold-500 text-slate-950 font-bold px-3 py-1.5 text-xs transition-all shadow-sm shrink-0"
            >
              <Plus size={13} />
              <span>Add Skill</span>
            </button>

            <span className="text-xs text-mh-slate-500 font-semibold px-1 shrink-0">
              {filteredSets.length} Sets
            </span>
          </div>
        </div>

        {/* Active Skill Filter Chips (Colored by skill category) */}
        {selectedSkillIds.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
            <span className="text-[11px] font-bold text-mh-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
              <Sparkles size={12} className="text-mh-gold-400" />
              Filter Skills ({selectedSkillIds.length}):
            </span>
            {selectedSkillIds.map((sId) => {
              const skillMeta = skillsMap.get(sId);
              const cat = skillMeta?.category || (skillMeta?.is_set_bonus ? 'set_bonus' : 'general');
              const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;
              const IconComp = theme.icon;

              return (
                <span
                  key={sId}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-bold shadow-sm',
                    theme.chipBg,
                    theme.chipBorder,
                    theme.chipText,
                  )}
                >
                  <IconComp size={12} className="opacity-80" />
                  <span>{skillMeta?.name ?? sId}</span>
                  {skillMeta?.is_set_bonus && (
                    <span className="text-[9px] opacity-75 font-normal">(Set Bonus)</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedSkillIds((prev) => prev.filter((id) => id !== sId))}
                    className="ml-0.5 rounded p-0.5 hover:bg-white/20 transition-colors"
                    title={`Remove ${skillMeta?.name ?? sId}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedSkillIds([])}
              className="text-xs text-mh-slate-500 hover:text-mh-slate-300 underline ml-1 font-semibold"
            >
              Clear all
            </button>
          </div>
        )}
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
          {/* LEFT PANE: Pinned Example Build Row + Scrollable Sets List */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 flex flex-col gap-3 sticky top-4">
            {/* ── Example Build Row (Always pinned at top of left pane) ── */}
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-mh-slate-900 via-amber-950/20 to-mh-slate-900 p-2.5 shadow-lg space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Swords size={14} className="text-amber-400" />
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
                    Example Build
                  </h4>
                  <span className="rounded bg-amber-500/20 px-2 py-0.2 text-[10px] font-bold text-amber-300 border border-amber-500/40 font-mono">
                    {equippedBuildCount}/5 Slots
                  </span>
                </div>

                {equippedBuildCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setExampleBuild({})}
                    className="flex items-center gap-1 text-[11px] text-mh-slate-400 hover:text-red-400 transition-colors"
                    title="Clear all pieces from example build"
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* The 6 Blocks: Profile Avatar + 5 Armour Slots */}
              <div className="grid grid-cols-6 gap-1.5">
                {/* Block 1: Profile Icon (Hunter) */}
                <div
                  title={profile?.display_name || 'Hunter Profile'}
                  className="group relative flex flex-col items-center justify-center rounded-xl border border-amber-500/40 bg-mh-slate-950 p-1 aspect-square shadow-inner"
                >
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center">
                    {user && (profile?.avatar_url || (user.user_metadata as Record<string, unknown>)?.avatar_url) ? (
                      <img
                        src={profile?.avatar_url || ((user.user_metadata as Record<string, unknown>)?.avatar_url as string)}
                        alt={profile?.display_name || 'Hunter'}
                        className="h-full w-full rounded-full object-cover ring-1 ring-amber-400/60"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
                        <User size={22} className="text-amber-400" />
                      </div>
                    )}
                  </div>
                  <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400 leading-none truncate max-w-full">
                    {profile?.display_name ?? profile?.username ?? 'HUNTER'}
                  </span>
                </div>

                {/* Blocks 2-6: Helm, Chest, Arms, Waist, Greaves */}
                {SLOTS_ORDER.map((slotDef) => {
                  const equipped = exampleBuild[slotDef.id];
                  const hasEquipped = Boolean(equipped);
                  const piece = equipped?.piece;
                  const set = equipped?.set;
                  const rarityStyle = piece ? getRarityBadgeStyle(piece.rarity ?? set?.rarity ?? 1) : null;

                  return (
                    <div
                      key={`example-${slotDef.id}`}
                      className={cn(
                        'group relative flex flex-col items-center justify-center rounded-xl border p-1 aspect-square transition-all',
                        hasEquipped
                          ? 'border-amber-500/60 bg-mh-slate-950/90 shadow-sm'
                          : 'border-dashed border-mh-slate-800 bg-mh-slate-950/30',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (set && piece) {
                            handleSelectSet(set.id, piece.slot);
                          }
                        }}
                        title={hasEquipped ? `${set?.displayName} ${slotDef.label} (Click to inspect)` : `Empty ${slotDef.label} slot`}
                        className="h-full w-full flex flex-col items-center justify-center min-w-0"
                      >
                        <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center">
                          {piece?.image ? (
                            <img
                              src={piece.image}
                              alt={slotDef.label}
                              className="h-full w-full object-contain filter brightness-100"
                            />
                          ) : (
                            <img
                              src={slotDef.defaultIcon}
                              alt={slotDef.label}
                              className={cn(
                                'h-full w-full object-contain',
                                hasEquipped ? 'opacity-80' : 'opacity-25',
                              )}
                            />
                          )}
                        </div>

                        <span className={cn(
                          'mt-0.5 text-[9px] font-bold truncate max-w-full leading-none',
                          hasEquipped ? 'text-amber-300' : 'text-mh-slate-600',
                        )}>
                          {hasEquipped ? (set?.monsterName || slotDef.label) : slotDef.label}
                        </span>

                        {hasEquipped && rarityStyle && (
                          <span className={cn(
                            'absolute -top-1 -left-1 flex h-3.5 px-1 items-center justify-center rounded text-[8px] font-mono font-bold border',
                            rarityStyle.bg,
                            rarityStyle.text,
                            rarityStyle.border,
                          )}>
                            {rarityStyle.label}
                          </span>
                        )}
                      </button>

                      {/* Clear single slot button on hover */}
                      {hasEquipped && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExampleBuild((prev) => {
                              const next = { ...prev };
                              delete next[slotDef.id];
                              return next;
                            });
                          }}
                          title={`Remove ${slotDef.label} from build`}
                          className="absolute -bottom-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-600 transition-colors shadow z-10"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Scrollable Armour Sets List (Only this section scrolls) ── */}
            <div className="space-y-3 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
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
                        const isTracked = piece ? isArmourPieceTracked(challenges, piece.id) : false;
                        const matchTheme = getPieceMatchingTheme(piece);
                        const isSkillMatch = Boolean(matchTheme);
                        const isEquippedInBuild = piece ? exampleBuild[slotDef.id]?.piece.id === piece.id : false;

                        return (
                          <div
                            key={slotDef.id}
                            className="relative aspect-square"
                          >
                            <button
                              type="button"
                              disabled={!hasPiece}
                              onClick={() => handleSelectSet(set.id, slotDef.id)}
                              title={piece ? `${set.displayName} ${slotDef.label} (Click to inspect)` : `No ${slotDef.label}`}
                              className={cn(
                                'group relative h-full w-full flex flex-col items-center justify-center rounded-xl border p-1 transition-all',
                                !hasPiece && 'opacity-30 border-mh-slate-800 bg-mh-slate-950/30 cursor-not-allowed',
                                hasPiece && !isPieceActive && !isSkillMatch && 'border-mh-slate-750 bg-mh-slate-950/60 hover:border-mh-slate-600 hover:bg-mh-slate-800',
                                hasPiece && !isPieceActive && isSkillMatch && matchTheme && cn(
                                  matchTheme.border,
                                  matchTheme.bg,
                                  'ring-1',
                                  matchTheme.ring,
                                  'shadow-sm',
                                  matchTheme.hoverBg,
                                ),
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

                              <span className={cn(
                                'mt-0.5 text-[9px] font-bold truncate max-w-full leading-none',
                                isSkillMatch && matchTheme ? cn(matchTheme.text, 'font-extrabold') : 'text-mh-slate-400',
                              )}>
                                {slotDef.label}
                              </span>

                              {/* Skill Match Sparkle */}
                              {isSkillMatch && matchTheme && (
                                <span
                                  title={`Has filtered skill (${matchTheme.label})`}
                                  className={cn('absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-white shadow', matchTheme.badge)}
                                >
                                  <Sparkles size={8} />
                                </span>
                              )}

                              {/* Challenge Tracker Indicator */}
                              {isTracked && (
                                <span
                                  title="Tracked in Challenges"
                                  className="absolute top-1 left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] shadow"
                                >
                                  ✓
                                </span>
                              )}
                            </button>

                            {/* Quick Equip / Remove Toggle Button on Piece Block */}
                            {hasPiece && piece && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExampleBuild((prev) => {
                                    const next = { ...prev };
                                    if (isEquippedInBuild) {
                                      delete next[slotDef.id];
                                    } else {
                                      next[slotDef.id] = { piece, set };
                                    }
                                    return next;
                                  });
                                  setBuildAddedSlot(slotDef.id);
                                  setTimeout(() => setBuildAddedSlot(null), 1200);
                                }}
                                title={isEquippedInBuild ? `Remove ${set.displayName} ${slotDef.label} from Example Build` : `Add ${set.displayName} ${slotDef.label} to Example Build`}
                                className={cn(
                                  'absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black transition-all shadow-md z-10',
                                  isEquippedInBuild
                                    ? 'bg-amber-400 text-slate-950 hover:bg-red-500 hover:text-white'
                                    : 'bg-mh-slate-800 text-amber-300 border border-amber-500/50 hover:bg-amber-500 hover:text-slate-950 opacity-80 hover:opacity-100',
                                )}
                              >
                                {isEquippedInBuild ? '✓' : '+'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* RIGHT PANE: Pinned Skills Summary + Scrollable Set Detail */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 sticky top-4">
            {/* ── Example Build Skills Panel (Pinned at top of right pane when pieces are equipped) ── */}
            {equippedBuildCount > 0 && (
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-mh-slate-900 via-amber-950/20 to-mh-slate-900 p-2.5 shadow-lg space-y-1.5 shrink-0">
                <div className="flex items-center justify-between gap-2 px-1 border-b border-mh-slate-800/80 pb-1">
                  <div className="flex items-center gap-2">
                    <Swords size={13} className="text-amber-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
                      Skills Summary
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400/80">
                    {exampleBuildSkills.length} {exampleBuildSkills.length === 1 ? 'Skill' : 'Skills'}
                  </span>
                </div>

                {exampleBuildSkills.length === 0 ? (
                  <p className="text-xs text-mh-slate-500 italic py-2 text-center">
                    No active skills from equipped pieces at rarity {sliderRarity}.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 max-h-[115px] overflow-y-auto pr-1">
                    {exampleBuildSkills.map((entry) => {
                      const isMaxed = entry.totalLevel >= entry.maxLevel;

                      return (
                        <div
                          key={entry.id}
                          title={entry.meta?.description || `${entry.name} Lv. ${entry.totalLevel}/${entry.maxLevel}`}
                          className={cn(
                            'rounded-lg border px-2 py-1 flex flex-col items-center justify-center text-center transition-all min-h-[38px]',
                            isMaxed
                              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-sm'
                              : 'border-mh-slate-750 bg-mh-slate-950/80 text-mh-slate-200',
                          )}
                        >
                          <span
                            className={cn(
                              'text-[11px] font-semibold truncate max-w-full leading-tight',
                              isMaxed ? 'text-amber-300' : 'text-mh-slate-200',
                            )}
                          >
                            {entry.name}
                          </span>

                          <div
                            className={cn(
                              'flex items-center gap-1.5 mt-0.5 text-[10px] font-bold font-mono leading-none',
                              isMaxed ? 'text-amber-300' : 'text-white',
                            )}
                          >
                            <span>Lv.{entry.totalLevel}</span>
                            <div className="flex items-center gap-[2px]">
                              {Array.from({ length: entry.maxLevel }).map((_, pipIdx) => {
                                const isFilled = pipIdx < entry.totalLevel;
                                return (
                                  <span
                                    key={pipIdx}
                                    className={cn(
                                      'inline-block w-1.5 h-2.5 rounded-[1px] transition-colors',
                                      isMaxed
                                        ? 'bg-amber-400'
                                        : isFilled
                                          ? 'bg-sky-400 shadow-[0_0_3px_rgba(56,189,248,0.5)]'
                                          : 'bg-slate-700/80 border border-slate-600/60',
                                    )}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Inspected Monster Armour Set / Piece Detail Card (Scrollable) ── */}
            {currentSet ? (
              <div className={cn(
                "rounded-3xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl p-4 sm:p-5 space-y-4 overflow-y-auto pr-1",
                equippedBuildCount > 0 ? "max-h-[calc(100vh-270px)]" : "max-h-[calc(100vh-160px)]"
              )}>
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

                {/* ── Piece Action Row (Add to Challenges + Add to Example Build) ── */}
                {selectedSlot !== null && currentPiece && (() => {
                  const challenge = getArmourPieceChallenge(challenges, currentPiece.id);
                  const justAdded = addedPieceId === currentPiece.id;
                  const slotLabel = SLOTS_ORDER.find((s) => s.id === selectedSlot)?.label ?? selectedSlot;
                  const isEquippedInBuild = exampleBuild[currentPiece.slot]?.piece.id === currentPiece.id;
                  const isJustAddedToBuild = buildAddedSlot === currentPiece.slot;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Challenge Button / Sign In Prompt */}
                        {!user ? (
                          <div className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 px-3 py-2">
                            <span className="text-xs text-mh-slate-400">Sign in to track challenge</span>
                            <button
                              type="button"
                              onClick={() => setLoginModalOpen(true)}
                              className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-mh-gold-400 transition-colors shrink-0"
                            >
                              <LogIn size={12} />
                              Sign In
                            </button>
                          </div>
                        ) : challenge ? (
                          <button
                            type="button"
                            onClick={() => navigate('/challenges')}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-all min-w-[170px]"
                          >
                            <CheckCircle2 size={14} />
                            Go to Challenge ➔
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddChallenge(currentPiece, currentSet)}
                            disabled={addChallenge.isPending}
                            className={cn(
                              'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all min-w-[170px]',
                              justAdded
                                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                                : 'border-mh-gold-500/40 bg-mh-gold-500/10 text-mh-gold-300 hover:bg-mh-gold-500/20 hover:text-mh-gold-200',
                              addChallenge.isPending && 'opacity-60 cursor-wait',
                            )}
                          >
                            {addChallenge.isPending ? (
                              <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" /> Adding…</>
                            ) : justAdded ? (
                              <><CheckCircle2 size={14} /> Added to challenges!</>
                            ) : (
                              <><Target size={14} /> Add {slotLabel} to Challenges</>
                            )}
                          </button>
                        )}

                        {/* Add to Example Build Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setExampleBuild((prev) => ({
                              ...prev,
                              [currentPiece.slot]: { piece: currentPiece, set: currentSet },
                            }));
                            setBuildAddedSlot(currentPiece.slot);
                            setTimeout(() => setBuildAddedSlot(null), 2500);
                          }}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all shrink-0',
                            isJustAddedToBuild
                              ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                              : isEquippedInBuild
                              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/20',
                          )}
                          title={`Add or replace ${slotLabel} in your example build above`}
                        >
                          {isJustAddedToBuild ? (
                            <><CheckCircle2 size={14} className="text-emerald-400" /> Equipped in Build!</>
                          ) : isEquippedInBuild ? (
                            <><Shield size={14} className="text-amber-400" /> Equipped in Build</>
                          ) : exampleBuild[currentPiece.slot] ? (
                            <><Plus size={14} /> Replace {slotLabel} in Build</>
                          ) : (
                            <><Plus size={14} /> Add {slotLabel} to Example Build</>
                          )}
                        </button>
                      </div>

                      {challengeError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
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
                          {setBonusSummaries.map((sb) => {
                            const isMatch = selectedSkillIds.includes(sb.skillId);
                            const skillMeta = skillsMap.get(sb.skillId);
                            const cat = skillMeta?.category || 'set_bonus';
                            const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.set_bonus;

                            return (
                              <div
                                key={sb.skillId}
                                className={cn(
                                  'rounded-xl border p-3 space-y-1.5',
                                  isMatch
                                    ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                                    : 'border-amber-500/30 bg-amber-500/10',
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-amber-300">
                                      {sb.skillName}
                                    </span>
                                    {isMatch && (
                                      <span className={cn('rounded text-[10px] font-bold px-1.5 py-0.2', theme.badge)}>
                                        Filter Match
                                      </span>
                                    )}
                                  </div>
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
                            );
                          })}
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
                            const isMatch = selectedSkillIds.includes(entry.id);
                            const cat = entry.meta?.category || (entry.meta?.is_set_bonus ? 'set_bonus' : 'general');
                            const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;

                            return (
                              <div
                                key={entry.id}
                                className={cn(
                                  'rounded-xl border p-3 space-y-2',
                                  isMatch
                                    ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                                    : 'border-mh-slate-750 bg-mh-slate-950/70',
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-mh-slate-100">
                                      {entry.meta?.name ?? entry.id}
                                    </span>
                                    <span className={cn(
                                      'rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase tracking-wider',
                                      theme.chipBg,
                                      theme.chipBorder,
                                      theme.chipText,
                                    )}>
                                      {theme.label}
                                    </span>
                                    {isMatch && (
                                      <span className={cn('rounded text-[10px] font-bold px-1.5 py-0.2', theme.badge)}>
                                        Filter Match
                                      </span>
                                    )}
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
                    {/* Inherent Set Effect on this Piece */}
                    {pieceSetBonuses.length > 0 && (
                      <div className="space-y-2">
                        {pieceSetBonuses.map(({ skill, meta }, idx) => {
                          const isMatch = selectedSkillIds.includes(skill.id);
                          const cat = meta?.category || 'set_bonus';
                          const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.set_bonus;

                          return (
                            <div
                              key={idx}
                              className={cn(
                                'rounded-xl border p-3 space-y-1.5 shadow-sm',
                                isMatch
                                  ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                                  : 'border-amber-500/40 bg-amber-500/15',
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Flame size={15} className="text-amber-400" />
                                  <span className="font-bold text-sm text-amber-200">
                                    Set Effect: {meta?.name ?? skill.id}
                                  </span>
                                  {isMatch && (
                                    <span className={cn('rounded text-[10px] font-bold px-1.5 py-0.2', theme.badge)}>
                                      Filter Match
                                    </span>
                                  )}
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
                          );
                        })}
                      </div>
                    )}

                    {/* Active Regular Skills on this piece */}
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
                          {pieceActiveSkills.map(({ skillId, meta, totalLevel, maxLevel }, idx) => {
                            const isMatch = selectedSkillIds.includes(skillId);
                            const cat = meta?.category || 'general';
                            const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'rounded-xl border p-3 space-y-1.5',
                                  isMatch
                                    ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                                    : 'border-mh-slate-750 bg-mh-slate-950/70',
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-mh-slate-100">
                                      {meta?.name ?? skillId}
                                    </span>
                                    <span className={cn(
                                      'rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase tracking-wider',
                                      theme.chipBg,
                                      theme.chipBorder,
                                      theme.chipText,
                                    )}>
                                      {theme.label}
                                    </span>
                                    {isMatch && (
                                      <span className={cn('rounded text-[10px] font-bold px-1.5 py-0.2', theme.badge)}>
                                        Filter Match
                                      </span>
                                    )}
                                  </div>
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
                            );
                          })}
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

                    {/* Notes */}
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
