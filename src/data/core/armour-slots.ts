// ─────────────────────────────────────────────────────────────
// Armour slots — universal 5-piece set definition
// ─────────────────────────────────────────────────────────────
import type { ArmourSlotDef, ArmourSlot } from '../schemas/index.js';

export const ARMOUR_SLOTS: ArmourSlotDef[] = [
  {
    id: 'helm',
    hcDataKey: 'helm',
    name: 'Helm',
    displayName: 'Helmet',
    icon: '/images/ui/armor/helm.svg',
  },
  {
    id: 'chest',
    hcDataKey: 'chest',
    name: 'Chest',
    displayName: 'Mail / Chest',
    icon: '/images/ui/armor/chest.svg',
  },
  {
    id: 'gloves',
    hcDataKey: 'gloves',
    name: 'Gloves',
    displayName: 'Vambraces / Arms',
    icon: '/images/ui/armor/gloves.svg',
  },
  {
    id: 'waist',
    hcDataKey: 'waist',
    name: 'Waist',
    displayName: 'Coil / Waist',
    icon: '/images/ui/armor/belt.svg',
  },
  {
    id: 'greaves',
    hcDataKey: 'greaves',
    name: 'Greaves',
    displayName: 'Greaves / Legs',
    icon: '/images/ui/armor/legs.svg',
  },
] satisfies ArmourSlotDef[];

export const ARMOUR_SLOT_IDS: ArmourSlot[] = ARMOUR_SLOTS.map((s) => s.id);

export const ARMOUR_SLOT_MAP = new Map<ArmourSlot, ArmourSlotDef>(
  ARMOUR_SLOTS.map((s) => [s.id, s])
);
