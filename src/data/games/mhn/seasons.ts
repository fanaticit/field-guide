// ─────────────────────────────────────────────────────────────
// MHN Story Seasons
// ─────────────────────────────────────────────────────────────
import s1Raw from '../../../../hc_data/season-1-story.json';
import s8Raw from '../../../../hc_data/season-8-story.json';
import s9Raw from '../../../../hc_data/season-9-story.json';

export interface SeasonBoss {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface SeasonChapter {
  number: number;
  name: string;
  description: string;
  bosses: SeasonBoss[];
}

export interface MHNSeason {
  season: number;
  name: string;
  description: string;
  chapters: SeasonChapter[];
}

export const MHN_SEASONS: MHNSeason[] = [
  s1Raw as unknown as MHNSeason,
  s8Raw as unknown as MHNSeason,
  s9Raw as unknown as MHNSeason,
].sort((a, b) => a.season - b.season);

export function getMHNSeasons(): MHNSeason[] { return MHN_SEASONS; }
export function getSeasonByNumber(n: number): MHNSeason | undefined {
  return MHN_SEASONS.find((s) => s.season === n);
}
