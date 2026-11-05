import { useEffect } from 'react';
import { useAdminSkills } from './useAdminSkills';
import { buildSkillIndex } from '../lib/skillIndex';
import { useBuildPlannerStore } from '../store/buildPlannerStore';

/** Loads the skills table into the build planner store so equipment skill ids can be added up. */
export function useSkillCatalogLoader() {
  const { data: skills = [] } = useAdminSkills({ isActive: true, isSetBonus: false });
  const setSkillCatalog = useBuildPlannerStore((s) => s.setSkillCatalog);

  useEffect(() => {
    if (skills.length === 0) return;
    const { baseIdOf, byId } = buildSkillIndex(skills);
    const catalog = new Map<string, { baseId: string; level: number }>();
    byId.forEach((sk, id) => catalog.set(id, { baseId: baseIdOf.get(id)!, level: sk.level }));
    setSkillCatalog(catalog);
  }, [skills, setSkillCatalog]);
}
