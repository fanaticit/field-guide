// ─────────────────────────────────────────────────────────────
// MHN Armour Skills
// Typed wrapper around hc_data/armor-equipment-skills.json
// ─────────────────────────────────────────────────────────────
import type { ArmourSkill, WeaponTalentSkill } from '../../schemas/index.js';
import rawData from '../../../../hc_data/armor-equipment-skills.json';

type RawSkillRef = { id: string; level: number };
type RawMonsterSkills = {
  helm?: RawSkillRef[];
  chest?: RawSkillRef[];
  gloves?: RawSkillRef[];
  waist?: RawSkillRef[];
  greaves?: RawSkillRef[];
  great_sword?: RawSkillRef[];
  long_sword?: RawSkillRef[];
  sword_shield?: RawSkillRef[];
  dual_blades?: RawSkillRef[];
  hammer?: RawSkillRef[];
  hunting_horn?: RawSkillRef[];
  lance?: RawSkillRef[];
  gunlance?: RawSkillRef[];
  switch_axe?: RawSkillRef[];
  charge_blade?: RawSkillRef[];
  insect_glaive?: RawSkillRef[];
  bow?: RawSkillRef[];
  light_bowgun?: RawSkillRef[];
  heavy_bowgun?: RawSkillRef[];
};

export const ARMOUR_SLOT_KEYS = ['helm', 'chest', 'gloves', 'waist', 'greaves'] as const;
export const WEAPON_SKILL_KEYS = [
  'great_sword', 'long_sword', 'sword_shield', 'dual_blades', 'hammer',
  'hunting_horn', 'lance', 'gunlance', 'switch_axe', 'charge_blade',
  'insect_glaive', 'bow', 'light_bowgun', 'heavy_bowgun',
] as const;

export interface MHNArmourSkillEntry {
  monsterId: string;
  helm: ArmourSkill[];
  chest: ArmourSkill[];
  gloves: ArmourSkill[];
  waist: ArmourSkill[];
  greaves: ArmourSkill[];
  weaponSkills: WeaponTalentSkill[];
}

function buildArmourSkillEntries(
  raw: Record<string, RawMonsterSkills>
): MHNArmourSkillEntry[] {
  return Object.entries(raw).map(([monsterId, data]) => {
    const weaponSkills: WeaponTalentSkill[] = WEAPON_SKILL_KEYS.flatMap((wk) => {
      const skills = data[wk];
      if (!skills || skills.length === 0) return [];
      return [{ monsterId, weaponTypeId: wk, skills }];
    });
    return {
      monsterId,
      helm: data.helm ?? [],
      chest: data.chest ?? [],
      gloves: data.gloves ?? [],
      waist: data.waist ?? [],
      greaves: data.greaves ?? [],
      weaponSkills,
    };
  });
}

export const MHN_ARMOUR_SKILLS: MHNArmourSkillEntry[] = buildArmourSkillEntries(
  rawData.armorEquipmentSkills as Record<string, RawMonsterSkills>
);

export const MHN_ARMOUR_SKILL_MAP = new Map<string, MHNArmourSkillEntry>(
  MHN_ARMOUR_SKILLS.map((e) => [e.monsterId, e])
);

export function getMHNArmourSkills(): MHNArmourSkillEntry[] { return MHN_ARMOUR_SKILLS; }
export function getMHNArmourSkillMap(): Map<string, MHNArmourSkillEntry> { return MHN_ARMOUR_SKILL_MAP; }
export function getMHNArmourSkillsForMonster(id: string): MHNArmourSkillEntry | undefined {
  return MHN_ARMOUR_SKILL_MAP.get(id);
}
