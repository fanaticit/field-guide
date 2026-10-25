import { chooseBestInk } from '../data/schemas/visage';

export const FALLBACK_MONSTER_ICONS: Record<string, { name: string; icon: string }> = {
  bone: { name: 'Bone', icon: '/images/monsters/MHNow-Bone_Icon.png' },
  high_metal: { name: 'Alloy / High Metal', icon: '/images/monsters/MHNow-Alloy_Icon.png' },
  alloy: { name: 'Alloy', icon: '/images/monsters/MHNow-Alloy_Icon.png' },
  leather: { name: 'Leather', icon: '/images/monsters/MHNow-Leather_Icon.png' },
  rath_heart: { name: 'Pink Rathian', icon: '/images/monsters/MHNow-Pink_Rathian_Icon.png' },
  pink_rathian: { name: 'Pink Rathian', icon: '/images/monsters/MHNow-Pink_Rathian_Icon.png' },
};

export interface MonsterLookup {
  name: string;
  icon: string | null;
}

export interface BuildPiece {
  id: string;
  slot: string;
  monster_id?: string | null;
}

export interface BuildWeapon {
  id: string;
  name: string;
  monster_id?: string | null;
  image?: string | null;
  element_type?: string | null;
}

export interface BuildVisage {
  id: string;
  name: string;
  ink_types?: string[] | null;
}

export interface ArmoryBuild {
  id: string;
  title: string;
  description?: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  author_id?: string | null;
  author?: { username?: string | null } | null;
  adventurer?: { id: string; name: string; image?: string | null; role?: string | null } | null;
  buddy?: { id: string; name: string; image?: string | null } | null;
  weapon_type?: { id: string; name: string; icon?: string | null } | null;
  weapon?: BuildWeapon | null;
  helm?: BuildPiece | null;
  chest?: BuildPiece | null;
  gloves?: BuildPiece | null;
  waist?: BuildPiece | null;
  greaves?: BuildPiece | null;
  core_visage?: BuildVisage | null;
  visage_2?: BuildVisage | null;
  visage_3?: BuildVisage | null;
  visage_4?: BuildVisage | null;
  visage_5?: BuildVisage | null;
}

export interface HighestInkResult {
  isTie: boolean;
  inks: string[];
  count: number;
}

export function getBuildInkCounts(build: ArmoryBuild): Record<string, number> {
  let savedInks: Record<string, string> = {};
  if (build.description) {
    const inkMatch = build.description.match(/(?:\n\n)?<!-- inks:(.*?) -->/);
    if (inkMatch) {
      try {
        savedInks = JSON.parse(inkMatch[1]);
      } catch (e) {
        console.error('Failed to parse saved inks', e);
      }
    }
  }

  const inkCounts: Record<string, number> = {};
  const visageSlots: { slot: string; v?: BuildVisage | null }[] = [
    { slot: 'core', v: build.core_visage },
    { slot: '2', v: build.visage_2 },
    { slot: '3', v: build.visage_3 },
    { slot: '4', v: build.visage_4 },
    { slot: '5', v: build.visage_5 },
  ];

  visageSlots.forEach(({ slot, v }) => {
    if (!v) return;
    const rawInk = savedInks[slot] || chooseBestInk(v.ink_types, build.weapon?.element_type);
    if (rawInk) {
      const ink = rawInk.toLowerCase().replace(/^ink_of_/, '');
      inkCounts[ink] = (inkCounts[ink] || 0) + 1;
    }
  });

  return inkCounts;
}

export function getHighestLevelInk(build: ArmoryBuild): HighestInkResult | null {
  const inkCounts = getBuildInkCounts(build);
  const sortedInks = Object.entries(inkCounts).sort((a, b) => b[1] - a[1]);
  if (sortedInks.length === 0) return null;

  const maxCount = sortedInks[0][1];
  const topInks = sortedInks.filter(([_, count]) => count === maxCount);

  if (topInks.length >= 2) {
    return {
      isTie: true,
      inks: [topInks[0][0], topInks[1][0]],
      count: maxCount,
    };
  }

  return {
    isTie: false,
    inks: [topInks[0][0]],
    count: maxCount,
  };
}
