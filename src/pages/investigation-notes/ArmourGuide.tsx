// ─────────────────────────────────────────────────────────────
// ArmourGuide — Investigation Notes Armour Explorer & Simulation
// Left-aligned layout, combined skill levels, highlighted set effects, and clean reference format.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  Sparkles,
  Layers,
  Lock,
  Flame,
  Swords,
  CheckCircle2,
  LogIn,
  Plus,
  Trash2,
  X,
  User,
  Crosshair,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Skull,
  Sliders,
  Heart,
} from 'lucide-react';
import {
  type ArmourSlot,
  type ArmourSkill,
  getRarityBadgeStyle,
} from '../../data/schemas/armour';
import {
  useArmourPieces,
  useAllArmourUpgradeTiers,
  useArmourSetUpgrades,
  type ArmourSetBonus,
} from '../../hooks/useArmourPieces';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useAdminSkills, type DBSkill } from '../../hooks/useAdminSkills';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES } from '../../config/themes';
import ChallengeIcon from '../../components/ChallengeIcon';
import PageTitlePanel from '../../components/layout/PageTitlePanel';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import {
  useHunterChallenges,
  useAddArmourChallenge,
  getArmourPieceChallenge,
  isArmourPieceTracked,
} from '../../hooks/useHunterChallenges';
import LoginModal from '../../components/auth/LoginModal';

const INTRO_HIDDEN_KEY = 'armour-intro-hidden';
const BUILD_COLLAPSED_KEY = 'armour-build-collapsed';

/** Slot names of the game data -> the slot ids used on this page and in the build planner */
const SLOT_FROM_GAME: Record<string, ArmourSlot> = {
  Head: 'helm',
  Chest: 'chest',
  Arms: 'gloves',
  Waist: 'waist',
  Legs: 'greaves',
};

/**
 * An armour piece shaped for this page. `skills` is expanded from the upgrade steps into
 * unlock tiers: one entry per skill level gained, with the rarity it is unlocked at.
 */
export interface DBArmourPiece {
  id: string;
  monster_id: string;
  set_variant: string;
  set_name: string | null;
  set_icon: string | null;
  /** Rarity the piece starts at */
  rarity: number;
  max_rarity: number;
  slot: ArmourSlot;
  /** Male or female icon, following the equipment setting of the profile */
  image: string | null;
  skills: ArmourSkill[];
  deco_slots: number[];
  set_bonus: ArmourSetBonus | null;
  status: 'in_game' | 'not_in_game';
  status_reason: string | null;
  is_spoiler: boolean;
  notes: string | null;
  is_active: boolean;
}

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

// The game's own skill categories reuse the colours of the closest legacy theme
const GAME_CATEGORY_THEMES: Record<string, string> = {
  'Hunt (General)': 'attack',
  'Hunt (Ranged)': 'critical',
  'Weapon-specific': 'utility',
  Attributes: 'defense',
  Resistance: 'status',
  Survival: 'survival',
  Exploration: 'general',
};
for (const [category, legacy] of Object.entries(GAME_CATEGORY_THEMES)) {
  SKILL_CATEGORY_THEMES[category] = { ...SKILL_CATEGORY_THEMES[legacy], label: category };
}

export const SKILL_CATEGORY_FULL_PIP_CLASSES: Record<string, string> = {
  attack: 'bg-red-400 shadow-[0_0_3px_rgba(248,113,113,0.7)]',
  critical: 'bg-pink-400 shadow-[0_0_3px_rgba(244,114,182,0.7)]',
  defense: 'bg-blue-400 shadow-[0_0_3px_rgba(96,165,250,0.7)]',
  survival: 'bg-emerald-400 shadow-[0_0_3px_rgba(52,211,153,0.7)]',
  status: 'bg-amber-400 shadow-[0_0_3px_rgba(251,191,36,0.7)]',
  utility: 'bg-teal-400 shadow-[0_0_3px_rgba(45,212,191,0.7)]',
  health: 'bg-lime-400 shadow-[0_0_3px_rgba(163,230,53,0.7)]',
  general: 'bg-purple-400 shadow-[0_0_3px_rgba(192,132,252,0.7)]',
  set_bonus: 'bg-orange-400 shadow-[0_0_3px_rgba(251,146,60,0.7)]',
};
for (const [category, legacy] of Object.entries(GAME_CATEGORY_THEMES)) {
  SKILL_CATEGORY_FULL_PIP_CLASSES[category] = SKILL_CATEGORY_FULL_PIP_CLASSES[legacy];
}

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
  setBonus: ArmourSetBonus | null;
  status: 'in_game' | 'not_in_game';
  statusReason: string | null;
  isSpoiler: boolean;
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

  const armoryTheme = useUIStore((s) => s.sectionThemes['/armory'] ?? DEFAULT_SECTION_THEMES['/armory']);
  const [introHidden, setIntroHidden] = useState(() => localStorage.getItem(INTRO_HIDDEN_KEY) === '1');

  const toggleIntro = () => {
    const next = !introHidden;
    setIntroHidden(next);
    localStorage.setItem(INTRO_HIDDEN_KEY, next ? '1' : '0');
  };
  
  // Multi-skill filter
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState<string>('');

  // Example Build (5 slots)
  const [exampleBuild, setExampleBuild] = useState<ExampleBuild>({});
  // Starts hidden on short (landscape phone) screens, where the box would fill the viewport
  const [buildCollapsed, setBuildCollapsed] = useState(() => {
    const saved = localStorage.getItem(BUILD_COLLAPSED_KEY);
    return saved === null ? window.innerHeight < 500 : saved === '1';
  });
  const toggleBuildCollapsed = () => {
    const next = !buildCollapsed;
    setBuildCollapsed(next);
    localStorage.setItem(BUILD_COLLAPSED_KEY, next ? '1' : '0');
  };
  const [buildAddedSlot, setBuildAddedSlot] = useState<ArmourSlot | null>(null);

  // Selected Set & Slot state
  // selectedSlot: null = Set Icon (Combined 5-piece view), 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves' = piece view
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ArmourSlot | null>(null);

  // Interactive Rarity Level (Defaults to max upgrade level 16)
  const [sliderRarity, setSliderRarity] = useState<number>(16);

  // Mobile detail popup modal state
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // ── Challenge tracking & Auth ─────────────────────────────────
  const { user, profile } = useAuthStore();
  const showSpoilers = Boolean(profile?.show_spoilers);

  // Queries
  const { data: rawPieces = [], isLoading: isLoadingRaw } = useArmourPieces({
    isActive: true,
    showSpoilers,
  });
  const { data: upgradeTiers = [], isLoading: isLoadingTiers } = useAllArmourUpgradeTiers();
  const isLoadingPieces = isLoadingRaw || isLoadingTiers;
  const { data: monsters = [] } = useAdminMonsters({ game, isActive: true });
  const { data: dbSkills = [] } = useAdminSkills({ isActive: true, isSetBonus: false });
  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const addChallenge = useAddArmourChallenge();
  const navigate = useNavigate();

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [addedPieceId, setAddedPieceId] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const skillsMap = useMemo(() => new Map(dbSkills.map((s) => [s.id, s])), [dbSkills]);

  // Every skill level has its own id in the game data; the page works with one id per skill
  // (its level 1 row) plus a level, so the rows of one skill are grouped here.
  const { baseIdOf, levelRows } = useMemo(() => {
    const firstRow = new Map<string, DBSkill>();
    const groupKey = (sk: DBSkill) => `${sk.name}|${sk.category}|${sk.max_levels}`;
    for (const sk of dbSkills) {
      const cur = firstRow.get(groupKey(sk));
      if (!cur || sk.level < cur.level) firstRow.set(groupKey(sk), sk);
    }
    const baseIdOf = new Map<string, string>();
    const levelRows = new Map<string, Map<number, DBSkill>>();
    for (const sk of dbSkills) {
      const baseId = firstRow.get(groupKey(sk))!.id;
      baseIdOf.set(sk.id, baseId);
      if (!levelRows.has(baseId)) levelRows.set(baseId, new Map());
      levelRows.get(baseId)!.set(sk.level, sk);
    }
    return { baseIdOf, levelRows };
  }, [dbSkills]);

  const levelDescription = useCallback(
    (baseId: string, level: number) =>
      levelRows.get(baseId)?.get(level)?.description ?? skillsMap.get(baseId)?.description ?? null,
    [levelRows, skillsMap],
  );

  // The skill filter works on skill names: a skill matches whichever level (id) the piece has
  const selectedSkillNames = useMemo(
    () => new Set(selectedSkillIds.map((id) => skillsMap.get(id)?.name)),
    [selectedSkillIds, skillsMap],
  );
  const matchesSelectedSkill = useCallback(
    (id: string) => selectedSkillNames.has(skillsMap.get(id)?.name),
    [selectedSkillNames, skillsMap],
  );

  const gender = profile?.equipment_gender ?? 'male';

  const pieces = useMemo<DBArmourPiece[]>(() => {
    const tiersByPiece = new Map<string, typeof upgradeTiers>();
    for (const t of upgradeTiers) {
      if (!tiersByPiece.has(t.armour_piece_id)) tiersByPiece.set(t.armour_piece_id, []);
      tiersByPiece.get(t.armour_piece_id)!.push(t);
    }

    return rawPieces
      .filter((p) => SLOT_FROM_GAME[p.slot])
      .map((p) => {
        const skills: ArmourSkill[] = [];
        const reached = new Map<string, number>();
        for (const step of tiersByPiece.get(p.id) ?? []) {
          for (const change of step.skill_changes) {
            const row = skillsMap.get(change.skill_id);
            const baseId = baseIdOf.get(change.skill_id);
            if (!row || !baseId) continue;
            const gained = row.level - (reached.get(baseId) ?? 0);
            reached.set(baseId, row.level);
            if (gained > 0) {
              skills.push({
                id: baseId,
                level: gained,
                unlock_rarity: step.rarity > p.rarity ? step.rarity : null,
              });
            }
          }
        }
        // Male armour is the default; female only when chosen in the profile
        const image = (gender === 'female' ? p.icon_f : p.icon_m) ?? p.icon_m ?? p.icon_f;
        return {
          id: p.id,
          monster_id: p.monster_id,
          set_variant: p.set_variant,
          set_name: p.set_name,
          set_icon: p.set_icon,
          rarity: p.rarity,
          max_rarity: p.max_rarity ?? p.rarity,
          slot: SLOT_FROM_GAME[p.slot],
          image,
          skills,
          deco_slots: p.deco_slots,
          set_bonus: p.set_bonus,
          status: p.status,
          status_reason: p.status_reason,
          is_spoiler: p.is_spoiler,
          notes: p.notes,
          is_active: p.is_active,
        };
      });
  }, [rawPieces, upgradeTiers, skillsMap, baseIdOf, gender]);

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
        // Sets without a linked monster (Alloy, Bone …) have no monsters row to reference
        monsterId:     monstersMap.has(set.monsterId) ? set.monsterId : null,
        armourSlot:    piece.slot,
        setVariant:    piece.set_variant || 'I',
        setName:       set.displayName,
        pieceImage:    piece.image ?? null,
        setIcon:       set.setIcon ?? null,
        monsterName:   monster?.name ?? set.monsterName,
        craftRarity:   set.rarity || 1,
        maxRarity:     set.maxRarity,
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

  const handleSendToBuildPlanner = useCallback(async () => {
    const store = useBuildPlannerStore.getState();

    // Auto-select default adventurer if none selected so equipment selector is immediately ready
    if (!store.adventurer) {
      try {
        const { data: defaultAdv } = await supabase
          .from('adventurers')
          .select('*')
          .eq('is_default', true)
          .eq('is_active', true)
          .maybeSingle();

        if (defaultAdv) {
          store.setAdventurer(defaultAdv as any);
        }
      } catch {
        // ignore
      }
    }

    for (const slotDef of SLOTS_ORDER) {
      const equipped = exampleBuild[slotDef.id];
      if (!equipped?.piece) {
        // The example build mirrors the planner, so a slot removed here is removed there too
        store.setArmour(slotDef.id, null);
        continue;
      }
      // The planner works with the armour_pieces row itself (skills at the highest rarity)
      const raw = rawPieces.find((p) => p.id === equipped.piece.id);
      if (!raw) continue;
      store.setArmour(slotDef.id, { ...raw, monster_name: equipped.set.monsterName });
    }

    // Keep editing the same build (saved or draft) the hunter left behind
    const { buildId } = useBuildPlannerStore.getState();
    navigate(buildId ? `/armory/planner/${buildId}` : '/armory/planner');
  }, [exampleBuild, navigate, rawPieces]);

  // Group pieces into complete Armour Sets
  const allSets = useMemo(() => {
    const groupMap = new Map<string, {
      monsterId: string;
      setVariant: string;
      setName: string | null;
      setIcon: string | null;
      rarity: number;
      maxRarity: number;
      setBonus: ArmourSetBonus | null;
      pieces: Partial<Record<ArmourSlot, DBArmourPiece>>;
      isSpoiler: boolean;
      status: 'in_game' | 'not_in_game';
      statusReason: string | null;
    }>();

    for (const p of pieces) {
      if (!p.is_active) continue;
      if (p.is_spoiler && !showSpoilers) continue;
      const monsterId = p.monster_id;
      const setVariant = p.set_variant || 'I';
      const key = `${p.set_name ?? monsterId}:${setVariant}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          monsterId,
          setVariant,
          setName: p.set_name,
          setIcon: p.set_icon || null,
          rarity: p.rarity ?? 1,
          maxRarity: p.max_rarity,
          setBonus: p.set_bonus,
          pieces: {},
          isSpoiler: p.is_spoiler,
          status: p.status,
          statusReason: p.status_reason,
        });
      }

      const grp = groupMap.get(key)!;
      grp.pieces[p.slot] = p;
      if (p.set_name && !grp.setName) grp.setName = p.set_name;
      if (p.set_icon && !grp.setIcon) grp.setIcon = p.set_icon;
      if (p.rarity && p.rarity > grp.rarity) grp.rarity = p.rarity;
      if (p.max_rarity > grp.maxRarity) grp.maxRarity = p.max_rarity;
      if (p.set_bonus && !grp.setBonus) grp.setBonus = p.set_bonus;
      if (p.is_spoiler) grp.isSpoiler = true;
      if (p.status === 'not_in_game') grp.status = 'not_in_game';
      if (p.status_reason && !grp.statusReason) grp.statusReason = p.status_reason;
    }

    const result: GroupedArmourSet[] = [];

    for (const [key, grp] of groupMap.entries()) {
      const monster = monstersMap.get(grp.monsterId);
      const isMonster = Boolean(monster);

      const monsterName = monster?.name ?? grp.monsterId
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const rawSetName = `${grp.setName ?? monsterName} ${grp.setVariant}`.trim();
      const displayName = rawSetName;
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
      const maxRarity = Math.max(grp.maxRarity, ...distinctUnlockRarities);

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
        setBonus: grp.setBonus,
        status: grp.status,
        statusReason: grp.statusReason,
        isSpoiler: grp.isSpoiler,
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
  }, [pieces, monstersMap, showSpoilers]);

  // Pre-fill the example build with whatever armour the hunter already has in the Build Planner
  const seededFromPlannerRef = useRef(false);
  useEffect(() => {
    if (seededFromPlannerRef.current || allSets.length === 0) return;
    seededFromPlannerRef.current = true;

    const planner = useBuildPlannerStore.getState();
    const seeded: ExampleBuild = {};
    for (const slotDef of SLOTS_ORDER) {
      const pieceId = planner[slotDef.id]?.id;
      if (!pieceId) continue;
      const set = allSets.find((g) => g.pieces[slotDef.id]?.id === pieceId);
      const piece = set?.pieces[slotDef.id];
      if (set && piece) seeded[slotDef.id] = { piece, set };
    }
    if (Object.keys(seeded).length > 0) setExampleBuild((prev) => ({ ...seeded, ...prev }));
  }, [allSets]);

  // Sorted unselected skills available for the skill picker
  const sortedAvailableSkills = useMemo(() => {
    // One entry per skill name, whatever the number of levels (ids) it has
    const byName = new Map<string, DBSkill>();
    for (const sk of dbSkills) {
      const cur = byName.get(sk.name);
      if (!cur || sk.level < cur.level) byName.set(sk.name, sk);
    }
    let list = [...byName.values()].filter((s) => !selectedSkillNames.has(s.name));
    if (skillSearchQuery.trim()) {
      const q = skillSearchQuery.toLowerCase().trim();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [dbSkills, selectedSkillNames, skillSearchQuery]);

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
        activeTiers: number;
        requiredPieces: number;
        piecesInSet: number;
        sources: Array<{ slot: ArmourSlot | 'set_bonus'; pieceName: string; level: number }>;
      }
    >();

    // Track active set bonuses per unique set so we only grant set bonus skills once per set
    const processedSetBonusGrants = new Set<string>();
    const pendingSetBonusesToGrant: Array<{
      setName: string;
      grantedSkillId: string;
      grantedLevel: number;
      tierPieces: number;
    }> = [];

    for (const slotDef of SLOTS_ORDER) {
      const item = exampleBuild[slotDef.id];
      if (!item?.piece?.skills) continue;

      // Check unlock threshold against piece/set max rarity or slider
      const pieceMaxRarity = item.piece.max_rarity ?? item.set.maxRarity ?? 16;
      const pieceUnlockLimit = Math.min(sliderRarity, pieceMaxRarity);

      for (const s of item.piece.skills) {
        const ur = s.unlockRarity ?? s.unlock_rarity ?? 1;
        if (ur <= pieceUnlockLimit) {
          const meta = skillsMap.get(s.id);
          const isSetBonus = Boolean(meta?.is_set_bonus);

          const piecesInSet = setCountMap.get(item.set.id) || 0;
          const rawThresholds = meta?.set_thresholds && meta.set_thresholds.length > 0
            ? meta.set_thresholds
            : [{ pieces: 2, granted_skill_id: null, granted_skill_level: 1 }];
          const thresholds = [...rawThresholds].sort((a, b) => a.pieces - b.pieces);
          const requiredPieces = thresholds[0]?.pieces ?? 2;
          const maxPiecesRequired = thresholds[thresholds.length - 1]?.pieces ?? requiredPieces;
          const activeTiers = thresholds.filter((t) => piecesInSet >= t.pieces).length;

          // Check if active set bonus grants another skill
          if (isSetBonus && !processedSetBonusGrants.has(`${s.id}:${item.set.id}`)) {
            processedSetBonusGrants.add(`${s.id}:${item.set.id}`);
            for (const tier of thresholds) {
              if (piecesInSet >= tier.pieces && tier.granted_skill_id) {
                pendingSetBonusesToGrant.push({
                  setName: item.set.displayName || item.set.monsterName,
                  grantedSkillId: tier.granted_skill_id,
                  grantedLevel: tier.granted_skill_level || 1,
                  tierPieces: tier.pieces,
                });
              }
            }
          }

          const name = meta?.name ?? s.id;
          const maxLevel = isSetBonus
            ? maxPiecesRequired
            : (meta?.max_levels ?? 5);

          const current = map.get(s.id);
          if (current) {
            if (!isSetBonus) {
              current.totalLevel += s.level;
            } else {
              current.totalLevel = Math.max(current.totalLevel, piecesInSet);
              current.piecesInSet = Math.max(current.piecesInSet, piecesInSet);
              current.activeTiers = Math.max(current.activeTiers, activeTiers);
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
              totalLevel: isSetBonus ? piecesInSet : s.level,
              maxLevel,
              isSetBonus,
              activeTiers,
              requiredPieces,
              piecesInSet,
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

    // A set bonus grants its skill once enough pieces of the set are equipped
    const seenBonusSets = new Set<string>();
    for (const slotDef of SLOTS_ORDER) {
      const item = exampleBuild[slotDef.id];
      const bonus = item?.set.setBonus;
      if (!item || !bonus || seenBonusSets.has(item.set.id)) continue;
      seenBonusSets.add(item.set.id);
      const baseId = baseIdOf.get(bonus.skill_id);
      const row = skillsMap.get(bonus.skill_id);
      if (baseId && row && (setCountMap.get(item.set.id) || 0) >= bonus.pieces) {
        pendingSetBonusesToGrant.push({
          setName: item.set.displayName,
          grantedSkillId: baseId,
          grantedLevel: row.level,
          tierPieces: bonus.pieces,
        });
      }
    }

    // Apply granted skills from active set bonuses
    for (const grant of pendingSetBonusesToGrant) {
      const existing = map.get(grant.grantedSkillId);
      if (existing) {
        if (!existing.isSetBonus) {
          existing.totalLevel += grant.grantedLevel;
        }
        existing.sources.push({
          slot: 'set_bonus',
          pieceName: `${grant.setName} (${grant.tierPieces}-Pc Set Bonus)`,
          level: grant.grantedLevel,
        });
      } else {
        const meta = skillsMap.get(grant.grantedSkillId);
        const name = meta?.name ?? grant.grantedSkillId;
        const maxLevel = meta?.max_levels ?? 5;
        map.set(grant.grantedSkillId, {
          id: grant.grantedSkillId,
          name,
          meta,
          totalLevel: grant.grantedLevel,
          maxLevel,
          isSetBonus: false,
          activeTiers: 0,
          requiredPieces: 0,
          piecesInSet: 0,
          sources: [
            {
              slot: 'set_bonus',
              pieceName: `${grant.setName} (${grant.tierPieces}-Pc Set Bonus)`,
              level: grant.grantedLevel,
            },
          ],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isSetBonus !== b.isSetBonus) return a.isSetBonus ? -1 : 1;
      return b.totalLevel - a.totalLevel || a.name.localeCompare(b.name);
    });
  }, [exampleBuild, sliderRarity, skillsMap, baseIdOf]);

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
        const hasMatchingSkill = set.allSkills.some((s) => matchesSelectedSkill(s.id));
        if (!hasMatchingSkill) return false;
      }

      return true;
    });
  }, [allSets, search, selectedSkillIds, matchesSelectedSkill, monstersMap, skillsMap]);

  // Helper to find matching skill theme for a piece
  const getPieceMatchingTheme = useCallback(
    (piece: DBArmourPiece | undefined) => {
      if (!piece || !piece.skills || selectedSkillIds.length === 0) return null;
      const match = piece.skills.find((s) => matchesSelectedSkill(s.id));
      if (!match) return null;
      const meta = skillsMap.get(match.id);
      const cat = meta?.category || (meta?.is_set_bonus ? 'set_bonus' : 'general');
      return SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;
    },
    [selectedSkillIds, matchesSelectedSkill, skillsMap],
  );

  // Ensure an active set is selected
  useEffect(() => {
    if (!selectedSetId && filteredSets.length > 0) {
      setSelectedSetId(filteredSets[0].id);
      setSelectedSlot(null);
    } else if (selectedSetId && !allSets.some((s) => s.id === selectedSetId) && filteredSets.length > 0) {
      setSelectedSetId(filteredSets[0].id);
      setSelectedSlot(null);
    }
  }, [filteredSets, selectedSetId, allSets]);

  // Active selected set
  const currentSet = useMemo(() => {
    return allSets.find((s) => s.id === selectedSetId) || null;
  }, [allSets, selectedSetId]);

  // Set selection handler — preserves slider rarity level across set and piece selection
  const handleSelectSet = (setId: string, slot: ArmourSlot | null = null, openMobileModal = true) => {
    setSelectedSetId(setId);
    setSelectedSlot(slot);
    if (openMobileModal) {
      setIsMobileDetailOpen(true);
    }
  };

  // Active selected piece (if in piece view)
  const currentPiece = useMemo(() => {
    if (!currentSet || !selectedSlot) return null;
    return currentSet.pieces[selectedSlot] || null;
  }, [currentSet, selectedSlot]);

  // Full upgrade steps (materials, required level) of the inspected piece
  const { data: currentPieceSteps = [] } = useArmourSetUpgrades(currentPiece ? [currentPiece.id] : []);

  // Pre-index upgrade tiers by piece id for fast lookup
  const tiersByPieceId = useMemo(() => {
    const map = new Map<string, typeof upgradeTiers>();
    for (const t of upgradeTiers) {
      let list = map.get(t.armour_piece_id);
      if (!list) {
        list = [];
        map.set(t.armour_piece_id, list);
      }
      list.push(t);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.rarity - b.rarity);
    }
    return map;
  }, [upgradeTiers]);

  // Clamped rarity for the currently inspected set
  const effectiveCurrentRarity = useMemo(() => {
    if (!currentSet) return sliderRarity;
    return Math.min(Math.max(sliderRarity, currentSet.rarity), currentSet.maxRarity);
  }, [currentSet, sliderRarity]);

  // Defence at the simulated rarity, from the slim tiers of every piece
  const defenceAtSlider = useCallback(
    (pieceId: string) => {
      const pieceTiers = tiersByPieceId.get(pieceId);
      if (!pieceTiers || pieceTiers.length === 0) return null;

      const exact = pieceTiers.find((t) => t.rarity === sliderRarity);
      if (exact) return exact.defence;

      if (sliderRarity > pieceTiers[pieceTiers.length - 1].rarity) {
        return pieceTiers[pieceTiers.length - 1].defence;
      }
      if (sliderRarity < pieceTiers[0].rarity) {
        return pieceTiers[0].defence;
      }

      const closest = [...pieceTiers].reverse().find((t) => t.rarity <= sliderRarity);
      return closest?.defence ?? pieceTiers[0].defence;
    },
    [tiersByPieceId, sliderRarity],
  );

  // Total defence of the example build at simulated rarity
  const exampleBuildDefence = useMemo(() => {
    let total = 0;
    let hasAny = false;
    for (const slotDef of SLOTS_ORDER) {
      const equipped = exampleBuild[slotDef.id];
      if (equipped?.piece) {
        const def = defenceAtSlider(equipped.piece.id);
        if (def !== null) {
          total += def;
          hasAny = true;
        }
      }
    }
    return hasAny ? total : null;
  }, [exampleBuild, defenceAtSlider]);

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
      additionalLevel: number;
      maxLevel: number;
      unlockRarity: number;
    }> = [];

    // Scan all 5 pieces
    for (const slotDef of SLOTS_ORDER) {
      const piece = currentSet.pieces[slotDef.id];
      if (!piece?.skills) continue;

      for (const skill of piece.skills) {
        const ur = skill.unlockRarity ?? skill.unlock_rarity ?? null;
        const isActiveAtSlider = ur === null || ur <= effectiveCurrentRarity;
        const meta = skillsMap.get(skill.id);
        const maxLvl = meta?.max_levels ?? 5;

        if (isActiveAtSlider) {
          if (!activeMap.has(skill.id)) {
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
        } else if (ur !== null && ur > effectiveCurrentRarity) {
          lockedList.push({
            skillId: skill.id,
            skillName: meta?.name ?? skill.id,
            slot: slotDef.id,
            level: skill.level,
            additionalLevel: skill.level,
            maxLevel: maxLvl,
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
    const bonus = currentSet.setBonus;
    const bonusRow = bonus ? skillsMap.get(bonus.skill_id) : undefined;
    const bonusBaseId = bonus ? baseIdOf.get(bonus.skill_id) : undefined;
    const setBonusSummaries =
      bonus && bonusRow && bonusBaseId
        ? [
            {
              skillId: bonusBaseId,
              skillName: bonusRow.name,
              description: bonusRow.description,
              level: bonusRow.level,
              pieces: bonus.pieces,
            },
          ]
        : [];

    // Sort locked tiers by unlock rarity ascending
    lockedList.sort((a, b) => a.unlockRarity - b.unlockRarity);

    return { combinedActiveSkills, setBonusSummaries, lockedSkillTiers: lockedList };
  }, [currentSet, effectiveCurrentRarity, skillsMap, baseIdOf]);

  // ── Combined Skills Aggregation for Single Piece View ─────────
  const { pieceSetBonuses, pieceActiveSkills, pieceLockedSkills } = useMemo(() => {
    if (!currentPiece) return { pieceSetBonuses: [], pieceActiveSkills: [], pieceLockedSkills: [] };

    const setBonuses: Array<{ skill: ArmourSkill; meta: DBSkill | undefined; pieces: number; level: number }> = [];
    const activeSkillMap = new Map<string, { skillId: string; meta: DBSkill | undefined; totalLevel: number; maxLevel: number }>();
    const lockedSkillMap = new Map<string, { skillId: string; meta: DBSkill | undefined; additionalLevel: number; maxLevel: number; unlockRarity: number }>();

    const bonus = currentPiece.set_bonus;
    const bonusBaseId = bonus ? baseIdOf.get(bonus.skill_id) : undefined;
    const bonusRow = bonus ? skillsMap.get(bonus.skill_id) : undefined;
    if (bonus && bonusBaseId && bonusRow) {
      setBonuses.push({
        skill: { id: bonusBaseId, level: bonusRow.level },
        meta: bonusRow,
        pieces: bonus.pieces,
        level: bonusRow.level,
      });
    }

    for (const s of currentPiece.skills) {
      const ur = s.unlockRarity ?? s.unlock_rarity ?? null;
      const meta = skillsMap.get(s.id);
      const maxLvl = meta?.max_levels ?? 5;

      {
        // Regular skill
        if (ur === null || ur <= effectiveCurrentRarity) {
          // Active at slider level -> combine duplicates
          const current = activeSkillMap.get(s.id);
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
              maxLevel: maxLvl,
              unlockRarity: ur,
            });
          }
        }
      }
    }

    const pieceActiveSkills = Array.from(activeSkillMap.values());
    const pieceLockedSkills = Array.from(lockedSkillMap.values()).sort((a, b) => a.unlockRarity - b.unlockRarity);

    return { pieceSetBonuses: setBonuses, pieceActiveSkills, pieceLockedSkills };
  }, [currentPiece, effectiveCurrentRarity, skillsMap, baseIdOf]);

  // ── Render Detail Card Content (Shared between Desktop Right Pane & Mobile Mini-Window) ──
  const renderDetailCard = (isModal = false) => {
    if (!currentSet) return null;

    return (
      <div className="space-y-4">
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
                {(() => {
                  const isComing = selectedSlot === null
                    ? (currentSet.status !== 'in_game' || currentSet.isSpoiler)
                    : (currentPiece?.status !== 'in_game' || currentPiece?.is_spoiler);
                  const reason = selectedSlot === null ? currentSet.statusReason : currentPiece?.status_reason;
                  if (!isComing) return null;
                  return (
                    <span
                      className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300"
                      title={reason ?? 'Coming'}
                    >
                      Coming{reason ? ` — ${reason}` : ''}
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

          {isModal && (
            <button
              type="button"
              onClick={() => setIsMobileDetailOpen(false)}
              className="rounded-xl p-1.5 text-mh-slate-400 hover:text-white hover:bg-mh-slate-800 transition-colors shrink-0"
              title="Close details"
            >
              <X size={20} />
            </button>
          )}
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
                  <div className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-sky-700/50 bg-sky-900/40 px-3 py-2">
                    <span className="text-xs text-sky-300">Sign in to track challenge</span>
                    <button
                      type="button"
                      onClick={() => setLoginModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-yellow-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-yellow-400 transition-colors shrink-0"
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
                      'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all min-w-[170px] shadow-sm',
                      justAdded
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-sky-600/50 bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200',
                      addChallenge.isPending && 'opacity-60 cursor-wait',
                    )}
                  >
                    {addChallenge.isPending ? (
                      <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" /> Adding…</>
                    ) : justAdded ? (
                      <><CheckCircle2 size={14} /> Added to challenges!</>
                    ) : (
                      <><ChallengeIcon size={18} /> Add {slotLabel} to Challenges</>
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
                  title={`Add or replace ${slotLabel} in your example build`}
                >
                  {isJustAddedToBuild ? (
                    <><CheckCircle2 size={14} className="text-emerald-400" /> Equipped in Build!</>
                  ) : isEquippedInBuild ? (
                    <><Shield size={14} className="text-amber-400" /> Equipped in Build</>
                  ) : exampleBuild[currentPiece.slot] ? (
                    <><Plus size={14} /> Replace {slotLabel} in Build</>
                  ) : (
                    <><Plus size={14} /> Add {slotLabel} to Build</>
                  )}
                </button>
              </div>

              {challengeError && (
                <p className="mt-2 text-[11px] font-medium text-rose-400">
                  {challengeError}
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Interactive Upgrade Level (Slider) ── */}
        <div className="rounded-2xl border border-mh-slate-800 bg-mh-slate-950/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-mh-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-mh-gold-400" />
              <span>Simulate Upgrade Rarity</span>
            </span>
            <span className="font-mono text-mh-gold-400 font-bold">
              Rarity {effectiveCurrentRarity} (Max: R{currentSet.maxRarity})
            </span>
          </div>

          <input
            type="range"
            min={currentSet.rarity}
            max={currentSet.maxRarity}
            value={effectiveCurrentRarity}
            onChange={(e) => setSliderRarity(Number(e.target.value))}
            className="w-full h-1.5 bg-mh-slate-800 rounded-lg appearance-none cursor-pointer accent-mh-gold-400"
          />
        </div>

        {/* ── Defence at the simulated rarity ── */}
        {(() => {
          const slotPieces = SLOTS_ORDER.map((d) => currentSet.pieces[d.id]).filter((p): p is DBArmourPiece => Boolean(p));
          const defence = selectedSlot === null
            ? slotPieces.reduce((sum, p) => sum + (defenceAtSlider(p.id) ?? 0), 0)
            : currentPiece ? defenceAtSlider(currentPiece.id) : null;
          return (
            <div className="flex items-center justify-between rounded-2xl border border-mh-slate-800 bg-mh-slate-950/60 px-3.5 py-2.5 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-mh-slate-300">
                <Shield size={13} className="text-mh-gold-400" />
                {selectedSlot === null ? 'Total Defence' : 'Defence'} at R{effectiveCurrentRarity}
              </span>
              <span className="font-mono text-sm font-bold text-mh-slate-100">{defence ?? '—'}</span>
              {selectedSlot !== null && currentPiece && currentPiece.deco_slots.length > 0 && (
                <span className="text-mh-slate-400">Deco slots: {currentPiece.deco_slots.join(' · ')}</span>
              )}
            </div>
          );
        })()}

        {/* ── FULL SET VIEW (All 5 Pieces Combined) ── */}
        {selectedSlot === null && (
          <div className="space-y-4">
            {/* Set Bonuses */}
            {setBonusSummaries.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame size={14} />
                  <span>Set Bonuses ({setBonusSummaries.length})</span>
                </h3>

                <div className="space-y-2">
                  {setBonusSummaries.map((sb) => {
                    const isMatch = matchesSelectedSkill(sb.skillId);
                    const theme = SKILL_CATEGORY_THEMES.set_bonus;

                    return (
                      <div
                        key={sb.skillId}
                        className={cn(
                          'rounded-2xl border p-3.5 space-y-2 transition-all',
                          isMatch
                            ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                            : 'border-amber-500/30 bg-amber-500/5',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-amber-200">
                              {sb.skillName}
                            </span>
                            {isMatch && (
                              <span className={cn('rounded text-[10px] font-bold px-1.5 py-0.2', theme.badge)}>
                                Filter Match
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-amber-500/20 bg-mh-slate-950/40 p-2 text-[11px]">
                          <span className="font-bold text-amber-400 font-mono">
                            {sb.pieces}-Piece Effect: +{sb.level} {sb.skillName}
                          </span>
                          {sb.description && (
                            <p className="text-mh-slate-300 mt-0.5">{sb.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Skills Combined */}
            <div className="space-y-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-mh-gold-400 flex items-center gap-1.5">
                <Swords size={14} />
                <span>Combined Active Skills ({combinedActiveSkills.length})</span>
              </h3>

              {combinedActiveSkills.length === 0 ? (
                <p className="text-xs text-mh-slate-500 italic py-2">
                  No active skills available at Rarity {effectiveCurrentRarity}. Use the slider above to increase upgrade level.
                </p>
              ) : (
                <div className="space-y-2">
                  {combinedActiveSkills.map((entry) => {
                    const isMatch = matchesSelectedSkill(entry.id);
                    const cat = entry.meta?.category || 'general';
                    const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          'rounded-2xl border p-3.5 space-y-2 transition-all',
                          isMatch
                            ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                            : 'border-mh-slate-750 bg-mh-slate-950/60',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
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
                          </div>

                          {/* Right: +Lv.X with visual boxes */}
                          {(() => {
                            const isMaxed = entry.totalLevel >= entry.maxLevel;
                            const fullPipClass = SKILL_CATEGORY_FULL_PIP_CLASSES[cat] || 'bg-amber-400';

                            return (
                              <div
                                className={cn(
                                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold border shrink-0 transition-colors shadow-sm',
                                  isMaxed
                                    ? cn(theme.bg, theme.border, theme.text, 'ring-1', theme.ring)
                                    : 'bg-mh-slate-900/90 border-mh-slate-750 text-white',
                                )}
                              >
                                <span className={cn(isMaxed ? theme.text : 'text-sky-300')}>
                                  +Lv.{entry.totalLevel}
                                </span>
                                <div className="flex items-center gap-[2px]">
                                  {Array.from({ length: entry.maxLevel }).map((_, pipIdx) => {
                                    const isFilled = pipIdx < entry.totalLevel;
                                    return (
                                      <span
                                        key={pipIdx}
                                        className={cn(
                                          'inline-block w-1.5 h-3 rounded-[1px] transition-colors',
                                          isMaxed
                                            ? fullPipClass
                                            : isFilled
                                              ? 'bg-sky-400 shadow-[0_0_3px_rgba(56,189,248,0.5)]'
                                              : 'bg-slate-700/80 border border-slate-600/60',
                                        )}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Contributing pieces breakdown */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-mh-slate-400">
                          <span className="text-mh-slate-500">From:</span>
                          {entry.sources.map((src, sIdx) => {
                            const slotLabel = SLOTS_ORDER.find((s) => s.id === src.slot)?.label ?? src.slot;
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

            {/* Locked Skills (Unlockable at higher rarities) */}
            {lockedSkillTiers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-mh-slate-800">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Lock size={14} />
                  <span>Locked Skills (Requires Higher Upgrade Level)</span>
                </h3>

                <div className="space-y-2">
                  {lockedSkillTiers.map((tier, idx) => {
                    const slotLabel = SLOTS_ORDER.find((s) => s.id === tier.slot)?.label ?? tier.slot;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-mh-slate-200">
                              {tier.skillName}
                            </span>
                            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                              <span>+Lv.{tier.additionalLevel}</span>
                              <div className="flex items-center gap-[2px]">
                                {Array.from({ length: tier.maxLevel || 5 }).map((_, pipIdx) => {
                                  const isFilled = pipIdx < tier.additionalLevel;
                                  return (
                                    <span
                                      key={pipIdx}
                                      className={cn(
                                        'inline-block w-1.5 h-2.5 rounded-[1px] transition-colors',
                                        isFilled
                                          ? 'bg-amber-400/80'
                                          : 'bg-slate-700/70 border border-slate-600/50',
                                      )}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-mh-slate-400">
                            Unlocks on {slotLabel} at Rarity {tier.unlockRarity}
                          </p>
                        </div>

                        <span className="rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold px-2 py-0.5 border border-amber-500/40 shrink-0">
                          Unlocks at R{tier.unlockRarity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SINGLE PIECE VIEW ── */}
        {selectedSlot !== null && currentPiece && (
          <div className="space-y-4">
            {/* Piece Set Bonus */}
            {pieceSetBonuses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame size={13} />
                  <span>Set Bonus ({pieceSetBonuses.length})</span>
                </h4>

                <div className="space-y-2">
                  {pieceSetBonuses.map((sb) => {
                    const isMatch = matchesSelectedSkill(sb.skill.id);
                    const theme = SKILL_CATEGORY_THEMES.set_bonus;

                    return (
                      <div
                        key={sb.skill.id}
                        className={cn(
                          'rounded-2xl border p-3.5 space-y-2 transition-all',
                          isMatch
                            ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                            : 'border-amber-500/30 bg-amber-500/5',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-amber-200">
                            {sb.meta?.name ?? sb.skill.id}
                          </span>
                          {isMatch && (
                            <span className={cn('rounded text-[10px] font-bold px-1.5 py-0.2', theme.badge)}>
                              Filter Match
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-bold font-mono text-amber-400">
                          {sb.pieces}-Piece Effect: +{sb.level} {sb.meta?.name}
                        </p>
                        {sb.meta?.description && (
                          <p className="text-xs text-mh-slate-300 leading-relaxed">
                            {sb.meta.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Skills on this piece */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400 flex items-center gap-1.5">
                <Swords size={13} />
                <span>Active Skills ({pieceActiveSkills.length})</span>
              </h4>

              {pieceActiveSkills.length === 0 ? (
                <p className="text-xs text-mh-slate-500 italic py-2">
                  No active skills at Rarity {effectiveCurrentRarity}.
                </p>
              ) : (
                <div className="space-y-2">
                  {pieceActiveSkills.map(({ skillId, meta, totalLevel, maxLevel }) => {
                    const isMatch = matchesSelectedSkill(skillId);
                    const cat = meta?.category || 'general';
                    const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;

                    return (
                      <div
                        key={skillId}
                        className={cn(
                          'rounded-2xl border p-3.5 space-y-2 transition-all',
                          isMatch
                            ? cn(theme.border, theme.bg, 'ring-1', theme.ring)
                            : 'border-mh-slate-750 bg-mh-slate-950/60',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
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

                          {/* Right: +Lv.X with visual boxes */}
                          {(() => {
                            const isMaxed = totalLevel >= maxLevel;
                            const fullPipClass = SKILL_CATEGORY_FULL_PIP_CLASSES[cat] || 'bg-amber-400';

                            return (
                              <div
                                className={cn(
                                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold border shrink-0 transition-colors shadow-sm',
                                  isMaxed
                                    ? cn(theme.bg, theme.border, theme.text, 'ring-1', theme.ring)
                                    : 'bg-mh-slate-900/90 border-mh-slate-750 text-white',
                                )}
                              >
                                <span className={cn(isMaxed ? theme.text : 'text-sky-300')}>
                                  +Lv.{totalLevel}
                                </span>
                                <div className="flex items-center gap-[2px]">
                                  {Array.from({ length: maxLevel }).map((_, pipIdx) => {
                                    const isFilled = pipIdx < totalLevel;
                                    return (
                                      <span
                                        key={pipIdx}
                                        className={cn(
                                          'inline-block w-1.5 h-3 rounded-[1px] transition-colors',
                                          isMaxed
                                            ? fullPipClass
                                            : isFilled
                                              ? 'bg-sky-400 shadow-[0_0_3px_rgba(56,189,248,0.5)]'
                                              : 'bg-slate-700/80 border border-slate-600/60',
                                        )}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {levelDescription(skillId, totalLevel) && (
                          <p className="text-xs text-mh-slate-400 leading-relaxed">
                            {levelDescription(skillId, totalLevel)}
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
                  {pieceLockedSkills.map(({ skillId, meta, additionalLevel, maxLevel, unlockRarity }, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-mh-slate-200">
                            {meta?.name ?? skillId}
                          </span>
                          <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                            <span>+Lv.{additionalLevel}</span>
                            <div className="flex items-center gap-[2px]">
                              {Array.from({ length: maxLevel || 5 }).map((_, pipIdx) => {
                                const isFilled = pipIdx < additionalLevel;
                                return (
                                  <span
                                    key={pipIdx}
                                    className={cn(
                                      'inline-block w-1.5 h-2.5 rounded-[1px] transition-colors',
                                      isFilled
                                        ? 'bg-amber-400/80'
                                        : 'bg-slate-700/70 border border-slate-600/50',
                                    )}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-mh-slate-400">
                          Requires upgrading piece to Rarity {unlockRarity}
                        </p>
                      </div>

                      <span className="rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold px-2 py-0.5 border border-amber-500/40 shrink-0">
                        Unlocks at R{unlockRarity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {currentPieceSteps.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-mh-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-300 flex items-center gap-1.5">
                  <Layers size={13} />
                  <span>Upgrade Path</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-[10px] uppercase tracking-wider text-mh-slate-500">
                      <tr>
                        <th className="py-1 pr-2">Rarity</th>
                        <th className="py-1 pr-2">Defence</th>
                        <th className="py-1 pr-2">Lv</th>
                        <th className="py-1">Materials</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mh-slate-800">
                      {currentPieceSteps.map((u) => {
                        const rs = getRarityBadgeStyle(u.rarity);
                        return (
                          <tr key={u.rarity} className={cn(u.rarity === effectiveCurrentRarity && 'bg-mh-gold-500/10')}>
                            <td className="py-1.5 pr-2">
                              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold font-mono', rs.bg, rs.text, rs.border)}>{rs.label}</span>
                            </td>
                            <td className="py-1.5 pr-2 text-mh-slate-100">
                              {u.defence}
                              {u.defence_gain ? <span className="ml-1 text-[10px] text-emerald-400">+{u.defence_gain}</span> : null}
                            </td>
                            <td className="py-1.5 pr-2 text-mh-slate-300">{u.required_level ?? '—'}</td>
                            <td className="py-1.5 text-mh-slate-300">
                              {u.materials.length ? u.materials.map((m) => `${m.item} ×${m.count}`).join(', ') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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

        {/* ── Modal Close Button at bottom (only in mobile modal) ── */}
        {isModal && (
          <div className="pt-3 border-t border-mh-slate-800">
            <button
              type="button"
              onClick={() => setIsMobileDetailOpen(false)}
              className="w-full py-2.5 rounded-xl border border-mh-slate-750 bg-mh-slate-850 hover:bg-mh-slate-800 text-xs font-bold text-mh-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <X size={14} />
              <span>Close & Return to Armour List</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-rarity-theme={armoryTheme} className="section-theme px-4 pb-4 pt-2 lg:px-6 lg:pb-6 lg:pt-3 space-y-4 w-full">
      {/* ── Header: title & description ── */}
      <PageTitlePanel
        icon="/img/ui/Equipment%20Icon.png"
        title="Armour"
        hidden={introHidden}
        onToggleHidden={toggleIntro}
        description={
          <>
            Browse every armour set by monster, with each piece's defence, skills and set bonuses at
            any upgrade rank. Search for a monster or skill, filter by the skills you want, and pin pieces into an
            example build to see how the skills add up. Add a piece to your Hunter's Challenges and the monsters you
            need to hunt for it appear in your
            <span className="text-mh-slate-200 font-semibold"> Hunting Targets</span>. Armour is shown as{' '}
            <span className="text-mh-slate-200 font-semibold">{gender}</span> equipment — change the equipment setting
            in your{' '}
            <Link to="/settings" className="text-mh-gold-400 underline hover:text-mh-gold-300">profile settings</Link>{' '}
            to see the {gender === 'female' ? 'male' : 'female'} armour instead.
          </>
        }
      />

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
              className="rounded-xl border border-mh-slate-750 bg-mh-slate-900 py-1.5 px-2.5 text-xs text-mh-slate-200 focus:border-mh-gold-500/50 focus:outline-none max-w-[180px]"
            >
              <option value="">Select skill...</option>
              {sortedAvailableSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_set_bonus ? '(Set Bonus)' : ''}
                </option>
              ))}
            </select>

            {/* Add Skill Filter Button */}
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
              className={cn(
                'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors',
                selectedSkillToAdd
                  ? 'bg-mh-gold-500 text-slate-950 hover:bg-mh-gold-400'
                  : 'bg-mh-slate-800 text-mh-slate-500 cursor-not-allowed border border-mh-slate-750',
              )}
            >
              <Plus size={13} />
              <span>Add Filter</span>
            </button>

            {/* Armour Sets Count */}
            <span className="text-xs text-mh-slate-400 font-mono ml-1">
              {filteredSets.length} {filteredSets.length === 1 ? 'Set' : 'Sets'}
            </span>
          </div>
        </div>

        {/* Selected Skill Filter Chips */}
        {selectedSkillIds.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mh-gold-400 mr-1 flex items-center gap-1">
              <Sparkles size={11} />
              Filtering by:
            </span>
            {selectedSkillIds.map((sId) => {
              const skillMeta = skillsMap.get(sId);
              const cat = skillMeta?.category || (skillMeta?.is_set_bonus ? 'set_bonus' : 'general');
              const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;

              return (
                <span
                  key={sId}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-bold border transition-colors shadow-sm',
                    theme.chipBg,
                    theme.chipBorder,
                    theme.chipText,
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
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

      {/* ── Dual-Pane Layout (Side-by-Side on Desktop, Left Pane Only on Narrow Screens) ── */}
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
          {/* LEFT PANE: Pinned Example Build & Skills + Scrollable Sets */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 flex flex-col gap-3 sticky top-4">
            {/* ── Example Build Box (Pinned at top of left pane) ── */}
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-mh-slate-900 via-amber-950/20 to-mh-slate-900 p-2.5 shadow-lg space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Swords size={14} className="text-amber-400" />
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
                    Example Build
                  </h4>
                  <button
                    type="button"
                    onClick={toggleBuildCollapsed}
                    className="flex items-center gap-0.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
                    title={buildCollapsed ? 'Show the example build' : 'Hide the example build'}
                    aria-expanded={!buildCollapsed}
                  >
                    {buildCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                    <span>{buildCollapsed ? 'Show' : 'Hide'}</span>
                  </button>
                </div>

                {equippedBuildCount > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendToBuildPlanner}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 hover:border-amber-400 hover:text-amber-200 transition-all shadow-sm"
                      title="Send this armour loadout to the Build Planner"
                    >
                      <Layers size={11} className="text-amber-400" />
                      <span>Send to Planner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExampleBuild({})}
                      className="flex items-center gap-1 text-[11px] text-mh-slate-400 hover:text-red-400 transition-colors py-0.5 px-1"
                      title="Clear all pieces from example build"
                    >
                      <Trash2 size={11} />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>

              {!buildCollapsed && (<>
              {/* The 6 Blocks: Profile Avatar + 5 Armour Slots */}
              <div className="grid grid-cols-6 gap-1.5">
                {/* Block 1: Profile Icon (Hunter) */}
                <div
                  title={profile?.display_name || 'Hunter Profile'}
                  className="group relative flex flex-col items-center justify-center rounded-xl border border-amber-500/40 bg-mh-slate-950 p-1 aspect-square shadow-inner"
                >
                  <div className="relative w-full flex-1 min-h-0 flex items-center justify-center p-0.5">
                    {user && (profile?.avatar_url || (user.user_metadata as Record<string, unknown>)?.avatar_url) ? (
                      <img
                        src={profile?.avatar_url || ((user.user_metadata as Record<string, unknown>)?.avatar_url as string)}
                        alt={profile?.display_name || 'Hunter'}
                        className="max-h-full max-w-full aspect-square rounded-full object-cover ring-1 ring-amber-400/60"
                      />
                    ) : (
                      <div className="flex h-full w-full max-h-12 max-w-12 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40">
                        <User className="h-2/3 w-2/3 text-amber-400" />
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
                  const effectivePieceRarity = piece
                    ? Math.min(
                        Math.max(sliderRarity, piece.rarity ?? set?.rarity ?? 1),
                        piece.max_rarity ?? set?.maxRarity ?? 16,
                      )
                    : null;
                  const rarityStyle = effectivePieceRarity ? getRarityBadgeStyle(effectivePieceRarity) : null;
                  const pieceDef = piece ? defenceAtSlider(piece.id) : null;

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
                            handleSelectSet(set.id, piece.slot, true);
                          }
                        }}
                        title={
                          hasEquipped
                            ? `${set?.displayName} ${slotDef.label} (R${effectivePieceRarity}${pieceDef !== null ? ` · Def ${pieceDef}` : ''}) — Click to inspect`
                            : `Empty ${slotDef.label} slot`
                        }
                        className="h-full w-full flex flex-col items-center justify-center min-w-0"
                      >
                        <div className="relative w-full flex-1 min-h-0 flex items-center justify-center p-0.5">
                          {piece?.image ? (
                            <img
                              src={piece.image}
                              alt={slotDef.label}
                              className="max-h-full max-w-full object-contain filter brightness-100"
                            />
                          ) : (
                            <img
                              src={slotDef.defaultIcon}
                              alt={slotDef.label}
                              className={cn(
                                'max-h-full max-w-full object-contain',
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

              {/* ── Skills Summary (Directly inside Example Build Box below the slots) ── */}
              {equippedBuildCount > 0 && (
                <div className="border-t border-mh-slate-800/80 pt-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Skills Summary
                    </span>
                    <div className="flex items-center gap-2.5">
                      {exampleBuildDefence !== null && (
                        <span className="text-[10px] font-mono text-mh-slate-300 flex items-center gap-1">
                          <Shield size={11} className="text-mh-gold-400" />
                          <span>Def: <strong className="text-amber-300 font-bold">{exampleBuildDefence}</strong></span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold text-amber-400/80">
                        {exampleBuildSkills.length} {exampleBuildSkills.length === 1 ? 'Skill' : 'Skills'}
                      </span>
                    </div>
                  </div>

                  {exampleBuildSkills.length === 0 ? (
                    <p className="text-xs text-mh-slate-500 italic py-1 text-center">
                      No active skills from equipped pieces at rarity {sliderRarity}.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                      {exampleBuildSkills.map((entry) => {
                        const isSet = Boolean(entry.isSetBonus || entry.meta?.is_set_bonus);
                        const isSetActivated = isSet ? (entry.activeTiers ?? 0) > 0 : false;
                        const isMaxed = isSet ? entry.totalLevel >= entry.maxLevel : entry.totalLevel >= entry.maxLevel;
                        const cat = entry.meta?.category || (isSet ? 'set_bonus' : 'general');
                        const theme = SKILL_CATEGORY_THEMES[cat] || SKILL_CATEGORY_THEMES.general;
                        const fullPipClass = SKILL_CATEGORY_FULL_PIP_CLASSES[cat] || 'bg-amber-400';

                        return (
                          <div
                            key={entry.id}
                            title={
                              isSet
                                ? `${entry.name} Set Bonus (Equipped: ${entry.piecesInSet ?? entry.totalLevel}/${entry.maxLevel} pieces${
                                    isSetActivated ? ' - Active!' : ` - Requires ${entry.requiredPieces ?? 2} pieces to activate`
                                  })${entry.meta?.description ? `\n\n${entry.meta.description}` : ''}`
                                : `${entry.name} Lv. ${entry.totalLevel}/${entry.maxLevel}${
                                    entry.sources.length > 0
                                      ? `\nSources:\n` + entry.sources.map((src) => `• ${src.pieceName}: +${src.level}`).join('\n')
                                      : ''
                                  }${entry.meta?.description ? `\n\n${entry.meta.description}` : ''}`
                            }
                            className={cn(
                              'rounded-lg border px-2 py-1 flex flex-col items-center justify-center text-center transition-all min-h-[38px]',
                              isSet
                                ? isSetActivated
                                  ? 'border-orange-500/60 bg-orange-500/15 text-orange-300 shadow-sm ring-1 ring-orange-400/30'
                                  : 'border-orange-500/40 bg-orange-950/20 text-orange-300/90'
                                : isMaxed
                                  ? cn(theme.border, theme.bg, theme.text, 'ring-1', theme.ring, 'shadow-sm')
                                  : 'border-mh-slate-750 bg-mh-slate-950/80 text-mh-slate-200',
                            )}
                          >
                            <span
                              className={cn(
                                'text-[11px] font-semibold truncate max-w-full leading-tight',
                                isSet
                                  ? isSetActivated ? 'text-orange-300 font-bold' : 'text-orange-300/90'
                                  : isMaxed ? cn(theme.text, 'font-bold') : 'text-mh-slate-200',
                              )}
                            >
                              {entry.name}
                            </span>

                            <div
                              className={cn(
                                'flex items-center gap-1.5 mt-0.5 text-[10px] font-bold font-mono leading-none',
                                isSet
                                  ? isSetActivated ? 'text-orange-300' : 'text-orange-400/80'
                                  : isMaxed ? theme.text : 'text-white',
                              )}
                            >
                              <span>
                                {isSet
                                  ? `${entry.piecesInSet ?? entry.totalLevel}/${entry.maxLevel} Pcs`
                                  : `Lv.${entry.totalLevel}`}
                              </span>
                              <div className="flex items-center gap-[2px]">
                                {Array.from({ length: entry.maxLevel }).map((_, pipIdx) => {
                                  const isFilled = pipIdx < entry.totalLevel;
                                  return (
                                    <span
                                      key={pipIdx}
                                      className={cn(
                                        'inline-block w-1.5 h-2.5 rounded-[1px] transition-colors',
                                        isSet
                                          ? isFilled
                                            ? isSetActivated
                                              ? 'bg-orange-400 shadow-[0_0_3px_rgba(251,146,60,0.6)]'
                                              : 'bg-orange-500/70'
                                            : 'bg-orange-950/60 border border-orange-800/40'
                                          : isMaxed
                                            ? fullPipClass
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
              </>)}
            </div>

            {/* ── Scrollable Armour Sets List ── */}
            <div className={cn(
              "space-y-3 overflow-y-auto pr-1",
              buildCollapsed
                ? "max-h-[calc(100vh-150px)]"
                : equippedBuildCount > 0 ? "max-h-[calc(100vh-380px)]" : "max-h-[calc(100vh-270px)]"
            )}>
              {filteredSets.map((set) => {
                const isSetSelected = currentSet?.id === set.id;

                return (
                  <div
                    key={set.id}
                    className={cn(
                      'rounded-2xl border p-3 transition-all',
                      isSetSelected
                        ? 'border-mh-gold-500/50 bg-mh-slate-900/90 ring-1 ring-mh-gold-400/40 shadow-lg'
                        : 'border-mh-slate-800 bg-mh-slate-900/50 hover:border-mh-slate-700 hover:bg-mh-slate-900/70',
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-display font-bold text-sm text-mh-slate-100 truncate">
                          {set.displayName}
                        </span>
                        {(() => {
                          const rStyle = getRarityBadgeStyle(set.rarity);
                          return (
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.2 text-[10px] font-bold border font-mono shrink-0',
                                rStyle.bg,
                                rStyle.text,
                                rStyle.border,
                              )}
                            >
                              {rStyle.label}
                            </span>
                          );
                        })()}
                        {(set.status !== 'in_game' || set.isSpoiler) && (
                          <span
                            className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold uppercase text-amber-300 shrink-0 font-mono"
                            title={set.statusReason ?? 'Coming'}
                          >
                            Coming
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-medium text-mh-slate-400 truncate">
                        {set.monsterName}
                      </span>
                    </div>

                    {/* 6 Block Grid */}
                    <div className="grid grid-cols-6 gap-2">
                      {/* Block 1: Set Icon */}
                      <button
                        type="button"
                        onClick={() => handleSelectSet(set.id, null, true)}
                        title={`${set.displayName} (Full Set)`}
                        className={cn(
                          'group relative flex flex-col items-center justify-center rounded-xl border p-1 aspect-square transition-all',
                          isSetSelected && selectedSlot === null
                            ? 'border-mh-gold-400 bg-mh-gold-500/20 ring-2 ring-mh-gold-400/50 shadow-sm'
                            : 'border-mh-slate-750 bg-mh-slate-950/80 hover:border-mh-gold-500/40 hover:bg-mh-slate-800',
                        )}
                      >
                        <div className="relative w-full flex-1 min-h-0 flex items-center justify-center p-0.5">
                          {set.setIcon ? (
                            <img
                              src={set.setIcon}
                              alt="Set Icon"
                              className="max-h-full max-w-full object-contain filter drop-shadow"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Layers className="h-2/3 w-2/3 max-h-9 max-w-9 text-mh-gold-400" />
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
                              onClick={() => handleSelectSet(set.id, slotDef.id, true)}
                              title={
                                piece
                                  ? `${set.displayName} ${slotDef.label}${
                                      piece.status !== 'in_game' || piece.is_spoiler
                                        ? ` [Coming${piece.status_reason ? `: ${piece.status_reason}` : ''}]`
                                        : ''
                                    } (Click to inspect)`
                                  : `No ${slotDef.label}`
                              }
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
                              <div className="relative w-full flex-1 min-h-0 flex items-center justify-center p-0.5">
                                {piece?.image ? (
                                  <img
                                    src={piece.image}
                                    alt={slotDef.label}
                                    className="max-h-full max-w-full object-contain filter brightness-95"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={slotDef.defaultIcon}
                                    alt={slotDef.label}
                                    className="max-h-full max-w-full object-contain opacity-55 group-hover:opacity-85 transition-opacity"
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

                              {/* Coming Indicator */}
                              {piece && (piece.status !== 'in_game' || piece.is_spoiler) && !isSkillMatch && (
                                <span
                                  title={piece.status_reason ?? 'Coming'}
                                  className="absolute -top-1 -right-1 rounded border border-amber-500/50 bg-amber-500 px-1 py-0.2 text-[8px] font-bold uppercase text-slate-950 shadow"
                                >
                                  Coming
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
          {/* RIGHT PANE: Detail Card (Visible on Desktop / Wide screens) */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex flex-1 min-w-0 flex-col gap-3 sticky top-4">
            {currentSet ? (
              <div className="rounded-3xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl p-4 sm:p-5 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
                {renderDetailCard(false)}
              </div>
            ) : (
              <div className="rounded-3xl border border-mh-slate-800 bg-mh-slate-900/40 p-12 text-center text-xs text-mh-slate-500">
                Select an armour set or piece from the list on the left to inspect skills and simulate upgrade levels.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Mini-Window Modal (Opens when piece is clicked on narrow screens) ── */}
      {isMobileDetailOpen && currentSet && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 lg:hidden animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {renderDetailCard(true)}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal — triggered when guest tries to add a challenge */}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}
