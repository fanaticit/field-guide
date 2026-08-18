// ─────────────────────────────────────────────────────────────
// MHN Driftstones
// ─────────────────────────────────────────────────────────────
import type { DriftstoneSkillPool, DriftstoneMonsterDrop } from '../../schemas/index.js';
import driftstoneSkillsRaw from '../../../../hc_data/driftstone-skills.json';
import driftstoneMonstersRaw from '../../../../hc_data/driftstone-monsters.json';

type RawDriftstoneSkill = {
  id: string;
  name: string;
  nameJa?: string;
  sources: string[];
  icon: string;
};

function buildSkillPools(): DriftstoneSkillPool[] {
  const stoneMap = new Map<string, { icon: string; skills: Array<{ id: string; maxLevel: number }> }>();

  for (const skill of driftstoneSkillsRaw.driftstoneSkills as RawDriftstoneSkill[]) {
    for (const source of skill.sources) {
      if (!stoneMap.has(source)) {
        stoneMap.set(source, { icon: skill.icon, skills: [] });
      }
      stoneMap.get(source)!.skills.push({ id: skill.id, maxLevel: 5 });
    }
  }

  return Array.from(stoneMap.entries()).map(([stoneType, data]) => ({
    stoneType,
    stoneIcon: data.icon,
    skills: data.skills,
  }));
}

export const MHN_DRIFTSTONE_SKILL_POOLS: DriftstoneSkillPool[] = buildSkillPools();

export const MHN_DRIFTSTONE_MONSTER_DROPS: DriftstoneMonsterDrop[] =
  (driftstoneMonstersRaw.driftstoneDrops as Array<{ stone: string; icon: string; monsters: string[] }>).map(
    (d) => ({ stoneType: d.stone, stoneIcon: d.icon, monsterIds: d.monsters })
  );

export function getMHNDriftstoneSkillPools(): DriftstoneSkillPool[] { return MHN_DRIFTSTONE_SKILL_POOLS; }
export function getMHNDriftstoneMonsterDrops(): DriftstoneMonsterDrop[] { return MHN_DRIFTSTONE_MONSTER_DROPS; }

export function getStonesDroppedBy(monsterId: string): string[] {
  return MHN_DRIFTSTONE_MONSTER_DROPS.filter((d) => d.monsterIds.includes(monsterId)).map((d) => d.stoneType);
}

export function getMonstersDropping(stoneType: string): string[] {
  return MHN_DRIFTSTONE_MONSTER_DROPS.find((d) => d.stoneType === stoneType)?.monsterIds ?? [];
}
