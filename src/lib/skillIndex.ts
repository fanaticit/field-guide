import type { DBSkill } from '../hooks/useAdminSkills';

/**
 * Every level of a skill has its own id in the game data. This groups the rows of one skill
 * (same name, category and max level) so the rest of the app can work with one id per skill
 * (the level 1 row) plus a level.
 */
export function buildSkillIndex(skills: DBSkill[]) {
  const groupKey = (sk: DBSkill) => `${sk.name}|${sk.category}|${sk.max_levels}`;

  const firstRow = new Map<string, DBSkill>();
  for (const sk of skills) {
    const cur = firstRow.get(groupKey(sk));
    if (!cur || sk.level < cur.level) firstRow.set(groupKey(sk), sk);
  }

  const baseIdOf = new Map<string, string>();
  const byId = new Map<string, DBSkill>();
  const levelRows = new Map<string, Map<number, DBSkill>>();
  for (const sk of skills) {
    const baseId = firstRow.get(groupKey(sk))!.id;
    baseIdOf.set(sk.id, baseId);
    byId.set(sk.id, sk);
    if (!levelRows.has(baseId)) levelRows.set(baseId, new Map());
    levelRows.get(baseId)!.set(sk.level, sk);
  }

  return { baseIdOf, byId, levelRows };
}
