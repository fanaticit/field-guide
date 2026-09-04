import { create } from 'zustand';

// Basic Types based on Database schema
export interface Adventurer {
  id: string;
  name: string;
  is_default: boolean;
  allowed_weapon_types: string[];
  image?: string;
}

export interface WeaponType {
  id: string;
  name: string;
  icon?: string;
}

export interface Weapon {
  id: string;
  name: string;
  weapon_type_id: string;
  element_type?: string; // e.g. 'fire', 'thunder', 'water', 'raw'
  skills: { id: string; level: number }[];
  image?: string;
}

export interface ArmourPiece {
  id: string;
  slot: 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves';
  set_name?: string;
  monster_id: string;
  monster_name?: string; // joined from monsters table
  image?: string;
  skills: { id: string; level: number }[];
}

export interface Buddy {
  id: string;
  name: string;
  core_passive: string;
  image?: string;
}

export interface Visage {
  id: string;
  name: string;
  points: number;
  core_effect: string;
  ink_types: string[];
  image_small?: string;
}

// Which ink type a given slot has selected (only relevant when card has 2+ ink types)
export type VisageSlot = 'core' | 2 | 3 | 4 | 5;

interface BuildPlannerState {
  buildId: string | null;
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
  setAdventurer: (adv: Adventurer | null) => void;
  setWeaponType: (type: WeaponType | null) => void;
  setWeapon: (w: Weapon | null) => void;
  setArmour: (slot: 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves', piece: ArmourPiece | null) => void;
  setBuddy: (b: Buddy | null) => void;
  setVisage: (slot: VisageSlot, v: Visage | null) => void;
  setSlotInkType: (slot: VisageSlot, ink: string) => void;
  resetBuild: () => void;

  // Computed
  getTotalVisagePoints: () => number;
  getActiveSkills: () => { id: string; level: number }[];
}

/** Pick the best ink for a card given the current weapon element */
function chooseBestInk(inkTypes: string[], weaponElement?: string | null): string {
  if (!inkTypes || inkTypes.length === 0) return '';
  if (inkTypes.length === 1) return inkTypes[0];
  
  // Map standard weapon elements to MHO specific ink types
  const elementToInkMap: Record<string, string[]> = {
    'fire': ['flames', 'fire'],
    'ice': ['frost', 'ice'],
    'raw': ['combat', 'raw'],
    'water': ['water'],
    'thunder': ['thunder'],
    'dragon': ['dragon'],
    'poison': ['poison'],
    'paralysis': ['paralysis'],
    'blast': ['blast'],
    'sleep': ['sleep'],
  };

  // Prefer weapon element if it exists in the card's ink types
  if (weaponElement) {
    const possibleInks = elementToInkMap[weaponElement] || [weaponElement];
    for (const ink of possibleInks) {
      if (inkTypes.includes(ink)) {
        return ink;
      }
    }
  }
  
  return inkTypes[0];
}

export const useBuildPlannerStore = create<BuildPlannerState>((set, get) => ({
  buildId: null,
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

  setBuildId: (id) => set({ buildId: id }),
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
  setSlotInkType: (slot, ink) => set((state) => ({
    selectedInkTypes: { ...state.selectedInkTypes, [String(slot)]: ink }
  })),
  resetBuild: () => set({
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

  getActiveSkills: () => {
    const { weapon, helm, chest, gloves, waist, greaves } = get();
    const skillMap = new Map<string, number>();

    const addSkills = (skills?: { id: string; level: number }[]) => {
      if (!skills) return;
      skills.forEach(s => {
        const current = skillMap.get(s.id) || 0;
        skillMap.set(s.id, current + s.level);
      });
    };

    if (weapon) addSkills(weapon.skills);
    if (helm) addSkills(helm.skills);
    if (chest) addSkills(chest.skills);
    if (gloves) addSkills(gloves.skills);
    if (waist) addSkills(waist.skills);
    if (greaves) addSkills(greaves.skills);

    return Array.from(skillMap.entries()).map(([id, level]) => ({ id, level }));
  }
}));
