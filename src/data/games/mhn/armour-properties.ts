// ─────────────────────────────────────────────────────────────
// MHN Armour Properties (Driftsmelt slot config)
// ─────────────────────────────────────────────────────────────
import type { ArmourSlot, DriftsmeltSlotCount } from '../../schemas/index.js';
import rawData from '../../../../hc_data/armor-properties.json';

export interface MHNDriftsmeltConfig {
  monsterId: string;
  slot: ArmourSlot;
  driftsmeltSlots: DriftsmeltSlotCount;
}

type RawSlotConfig = {
  noDriftSlots: string[];
  singleDriftSlot: string[];
  dualDriftSlots: string[];
};

function buildDriftsmeltConfigs(): MHNDriftsmeltConfig[] {
  const configs: MHNDriftsmeltConfig[] = [];
  const slotConfig = rawData.armorSlotConfiguration as Record<string, RawSlotConfig>;

  for (const [slot, config] of Object.entries(slotConfig)) {
    const armourSlot = slot as ArmourSlot;
    for (const monsterId of config.noDriftSlots) {
      configs.push({ monsterId, slot: armourSlot, driftsmeltSlots: 0 });
    }
    for (const monsterId of config.singleDriftSlot) {
      configs.push({ monsterId, slot: armourSlot, driftsmeltSlots: 1 });
    }
    for (const monsterId of config.dualDriftSlots) {
      configs.push({ monsterId, slot: armourSlot, driftsmeltSlots: 2 });
    }
  }
  return configs;
}

export const MHN_DRIFTSMELT_CONFIGS: MHNDriftsmeltConfig[] = buildDriftsmeltConfigs();

export function getMHNDriftsmeltConfigs(): MHNDriftsmeltConfig[] { return MHN_DRIFTSMELT_CONFIGS; }

export function getDriftsmeltSlots(monsterId: string, slot: ArmourSlot): DriftsmeltSlotCount {
  return (
    MHN_DRIFTSMELT_CONFIGS.find((c) => c.monsterId === monsterId && c.slot === slot)
      ?.driftsmeltSlots ?? 0
  );
}
