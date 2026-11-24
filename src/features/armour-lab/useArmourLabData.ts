// ─────────────────────────────────────────────────────────────
// Loads armour, upgrade steps, skills and monsters from Supabase and
// shapes them with buildLabData(). Uses the same queries (and cache)
// as the classic armour page.
// ─────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { useArmourPieces, useAllArmourUpgradeTiers } from '../../hooks/useArmourPieces';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useAdminSkills } from '../../hooks/useAdminSkills';
import { useAuthStore } from '../../store/authStore';
import { buildLabData, type LabData } from './logic';

export function useArmourLabData(): { data: LabData | null; isLoading: boolean; error: unknown } {
  const profile = useAuthStore((s) => s.profile);
  const showSpoilers = Boolean(profile?.show_spoilers);
  const gender = profile?.equipment_gender === 'female' ? 'female' : 'male';

  const pieces = useArmourPieces({ isActive: true, showSpoilers });
  const tiers = useAllArmourUpgradeTiers();
  const monsters = useAdminMonsters({ game: 'mho', isActive: true });
  const skills = useAdminSkills({ isActive: true });

  const isLoading = pieces.isLoading || tiers.isLoading || skills.isLoading || monsters.isLoading;
  const error = pieces.error ?? tiers.error ?? skills.error ?? null;

  const data = useMemo(() => {
    if (!pieces.data || !tiers.data || !skills.data) return null;
    const monsterMap = new Map((monsters.data ?? []).map((m) => [m.id, { name: m.name, icon: m.icon }]));
    return buildLabData({
      skills: skills.data,
      pieces: pieces.data,
      tiers: tiers.data,
      monsters: monsterMap,
      gender,
      showSpoilers,
    });
  }, [pieces.data, tiers.data, skills.data, monsters.data, gender, showSpoilers]);

  return { data, isLoading, error };
}
