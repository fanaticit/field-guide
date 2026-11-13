import { create } from 'zustand';
import { chooseBestInk } from '../data/schemas/visage';

// Basic Types based on Database schema
export interface Adventurer {
  id: string;
  name: string;
  is_default: boolean;
  allowed_weapon_types: string[];
  image?: string;
  background_image?: string | null;
}

export interface WeaponType {
  id: string;
  name: string;
  icon?: string | null;
}

/** A row of public.weapons (weapons carry no skills in the game data) */
export interface Weapon {
  id: string;
  name: string;
  weapon_type_id: string;
  element_type?: string; // e.g. 'fire', 'thunder', 'water', 'raw'
  element_damage?: number | null;
  attack?: number | null;
  image?: string | null;
  rarity?: number;
  max_rarity?: number;
  series?: string | null;
  monster_id?: string | null;
  max_name?: string | null;
  rarity_names?: Record<string | number, string> | null;
}

/** A row of public.armour_pieces */
export interface ArmourPiece {
  id: string;
  /** Slot name of the game data: Head, Chest, Arms, Waist or Legs */
  slot: string;
  set_name?: string | null;
  set_variant?: string;
  rarity?: number;
  /** monsters.id, or the name of a monster that is not linked yet */
  monster_id: string;
  monster_name?: string; // joined from monsters table
  /** Skill ids at the highest rarity — every skill level has its own id */
  skills: string[];
  set_bonus?: { pieces: number; skill_id: string } | null;
  icon_m?: string | null;
  icon_f?: string | null;
}

/** The male or female icon of a piece; male is the default */
export function armourPieceIcon(piece: ArmourPiece | null | undefined, gender: 'male' | 'female' = 'male'): string | undefined {
  if (!piece) return undefined;
  return ((gender === 'female' ? piece.icon_f : piece.icon_m) ?? piece.icon_m ?? piece.icon_f) ?? undefined;
}

/** How a skills-table id maps to the skill it belongs to: the level 1 id of the skill and the level it grants */
export interface SkillCatalogEntry {
  baseId: string;
  level: number;
}

export interface Buddy {
  id: string;
  name: string;
  core_passive: string;
  image?: string;
  tier?: 'R' | 'SR' | 'SSR';
}

export interface Visage {
  id: string;
  name: string;
  points: number;
  core_effect: string;
  ink_types: string[];
  monster_id?: string | null;
  monster_name?: string | null;
  monster_icon?: string | null;
  monster_sketch?: string | null;
  status?: 'in_game' | 'not_in_game';
  status_reason?: string | null;
  is_spoiler?: boolean;
}

// Which ink type a given slot has selected (only relevant when card has 2+ ink types)
export type VisageSlot = 'core' | 2 | 3 | 4 | 5;

interface BuildPlannerState {
  buildId: string | null;
  title: string;
  description: string;
  youtubeUrl: string;
  buildRole: 'main' | 'support';
  author_id: string | null;
  is_published: boolean;
  upvotes: number;
  hoveredSkillId: string | null;
  hoveredSkillCategory: string | null;
  /** skills.id -> skill + level; loaded by the planner so equipment skill ids can be added up */
  skillCatalog: Map<string, SkillCatalogEntry>;
  // Selections
  adventurer: Adventurer | null;
  weaponType: WeaponType | null;
  weapon: Weapon | null;
  helm: ArmourPiece | null;
  chest: ArmourPiece | null;
  gloves: ArmourPiece | null;
  waist: ArmourPiece | null;
  greaves: ArmourPiece | null;
  buddy: Buddy | null;
  coreVisage: Visage | null;
  visage2: Visage | null;
  visage3: Visage | null;
  visage4: Visage | null;
  visage5: Visage | null;
  // Selected ink type per slot (auto-set, user can override)
  selectedInkTypes: Record<string, string>;

  // Actions
  setBuildId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setYoutubeUrl: (url: string) => void;
  setBuildRole: (role: 'main' | 'support') => void;
  setAuthorId: (id: string | null) => void;
  setIsPublished: (pub: boolean) => void;
  setUpvotes: (count: number) => void;
  setAdventurer: (adv: Adventurer | null) => void;
  setWeaponType: (type: WeaponType | null) => void;
  setWeapon: (w: Weapon | null) => void;
  setArmour: (slot: 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves', piece: ArmourPiece | null) => void;
  setBuddy: (b: Buddy | null) => void;
  setVisage: (slot: VisageSlot, v: Visage | null) => void;
  setSlotInkType: (slot: VisageSlot, ink: string) => void;
  setSelectedInkTypes: (inks: Record<string, string>) => void;
  resetBuild: () => void;
  setHoveredSkillId: (id: string | null, category?: string | null) => void;
  setSkillCatalog: (catalog: Map<string, SkillCatalogEntry>) => void;

  useMine: boolean;
  setUseMine: (useMine: boolean) => void;
  toggleUseMine: () => void;

  // Computed
  getTotalVisagePoints: () => number;
  getActiveSkills: () => { id: string; level: number }[];
}

export const useBuildPlannerStore = create<BuildPlannerState>((set, get) => ({
  buildId: null,
  title: '',
  description: '',
  youtubeUrl: '',
  buildRole: 'main',
  author_id: null,
  is_published: false,
  upvotes: 0,
  hoveredSkillId: null,
  hoveredSkillCategory: null,
  skillCatalog: new Map(),
  adventurer: null,
  weaponType: null,
  weapon: null,
  helm: null,
  chest: null,
  gloves: null,
  waist: null,
  greaves: null,
  buddy: null,
  coreVisage: null,
  visage2: null,
  visage3: null,
  visage4: null,
  visage5: null,
  selectedInkTypes: {},
  useMine: false,

  setUseMine: (useMine) => set({ useMine }),
  toggleUseMine: () => set((state) => ({ useMine: !state.useMine })),
  setBuildId: (id) => set({ buildId: id }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setYoutubeUrl: (youtubeUrl) => set({ youtubeUrl }),
  setBuildRole: (role) => set({ buildRole: role }),
  setAuthorId: (id) => set({ author_id: id }),
  setIsPublished: (pub) => set({ is_published: pub }),
  setUpvotes: (upvotes) => set({ upvotes }),
  setAdventurer: (adv) => set((state) => {
    let newWeapon = state.weapon;
    if (adv && !adv.is_default && newWeapon) {
      if (!adv.allowed_weapon_types.includes(newWeapon.weapon_type_id)) {
        newWeapon = null;
      }
    }
    return { adventurer: adv, weapon: newWeapon };
  }),
  setWeaponType: (type) => set({ weaponType: type, weapon: null }),
  setWeapon: (w) => set((state) => {
    // When weapon changes, re-evaluate all existing visage ink choices
    const newInkTypes = { ...state.selectedInkTypes };
    const slots: VisageSlot[] = ['core', 2, 3, 4, 5];
    const visageForSlot = (s: VisageSlot) =>
      s === 'core' ? state.coreVisage : state[`visage${s}` as 'visage2'];
    slots.forEach(slot => {
      const v = visageForSlot(slot);
      if (v && v.ink_types.length > 1) {
        // Only update if we haven't manually overridden (or re-apply best match)
        const key = String(slot);
        newInkTypes[key] = chooseBestInk(v.ink_types, w?.element_type);
      }
    });
    return { weapon: w, selectedInkTypes: newInkTypes };
  }),
  setArmour: (slot, piece) => set({ [slot]: piece }),
  setBuddy: (b) => set({ buddy: b }),
  setVisage: (slot, v) => {
    if (v && (v.is_spoiler || v.status === 'not_in_game')) return;
    const { weapon, selectedInkTypes } = get();
    const key = String(slot);
    const newInkTypes = { ...selectedInkTypes };
    if (v) {
      newInkTypes[key] = chooseBestInk(v.ink_types, weapon?.element_type);
    } else {
      delete newInkTypes[key];
    }
    if (slot === 'core') set({ coreVisage: v, selectedInkTypes: newInkTypes });
    else set({ [`visage${slot}`]: v, selectedInkTypes: newInkTypes });
  },
  setSelectedInkTypes: (inks) => set({ selectedInkTypes: inks }),
  setSlotInkType: (slot, ink) => set((state) => ({
    selectedInkTypes: { ...state.selectedInkTypes, [String(slot)]: ink }
  })),
  resetBuild: () => set({
    buildId: null,
    title: '',
    description: '',
    youtubeUrl: '',
    buildRole: 'main',
    author_id: null,
    is_published: false,
    upvotes: 0,
    hoveredSkillId: null,
    adventurer: null,
    weaponType: null,
    weapon: null,
    helm: null,
    chest: null,
    gloves: null,
    waist: null,
    greaves: null,
    buddy: null,
    coreVisage: null,
    visage2: null,
    visage3: null,
    visage4: null,
    visage5: null,
    selectedInkTypes: {},
    useMine: false,
  }),

  getTotalVisagePoints: () => {
    const { coreVisage, visage2, visage3, visage4, visage5 } = get();
    let total = 0;
    if (coreVisage) total += coreVisage.points;
    if (visage2) total += visage2.points;
    if (visage3) total += visage3.points;
    if (visage4) total += visage4.points;
    if (visage5) total += visage5.points;
    return total;
  },

  setHoveredSkillId: (id, category = null) => set({ hoveredSkillId: id, hoveredSkillCategory: category }),
  setSkillCatalog: (catalog) => set({ skillCatalog: catalog }),

  // Skills of the equipped armour at its highest rarity, plus the skill granted by each complete set bonus
  getActiveSkills: () => {
    const { helm, chest, gloves, waist, greaves, skillCatalog } = get();
    const skillMap = new Map<string, number>();
    const add = (skillId: string) => {
      const entry = skillCatalog.get(skillId);
      if (!entry) return;
      skillMap.set(entry.baseId, (skillMap.get(entry.baseId) || 0) + entry.level);
    };

    const equipped = [helm, chest, gloves, waist, greaves].filter((p): p is ArmourPiece => Boolean(p));
    equipped.forEach((piece) => piece.skills?.forEach(add));

    const piecesPerSet = new Map<string, { count: number; bonus: ArmourPiece['set_bonus'] }>();
    equipped.forEach((piece) => {
      const key = (piece.set_name ?? piece.monster_id) + '|' + (piece.set_variant ?? '');
      const cur = piecesPerSet.get(key) ?? { count: 0, bonus: null };
      cur.count += 1;
      cur.bonus = cur.bonus ?? piece.set_bonus ?? null;
      piecesPerSet.set(key, cur);
    });
    piecesPerSet.forEach(({ count, bonus }) => {
      if (bonus && count >= bonus.pieces) add(bonus.skill_id);
    });

    return Array.from(skillMap.entries()).map(([id, level]) => ({ id, level }));
  }
}));
