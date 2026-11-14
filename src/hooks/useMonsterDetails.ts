// ─────────────────────────────────────────────────────────────
// useMonsterDetails — React Query hooks for monster levels and hitzones
// ─────────────────────────────────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DBMonsterLevel {
  id: string;
  monster_id: string;
  monster_name: string | null;
  content: string;
  hunt_id: string | null;
  hunt_difficulty: number | null;
  monster_level: number | null;
  suggested_hunt_power: number | null;
  health: number;
  attack: number;
  sort_order: number;
}

export interface DBMonsterHitzone {
  id: string;
  monster_id: string;
  monster_name: string | null;
  part: string;
  state: string | null;
  cut: number;
  impact: number;
  shot: number;
  fire: number;
  water: number;
  thunder: number;
  ice: number;
  dragon: number;
  weak_point_stars: number;
  sort_order: number;
}

export const MONSTER_LEVELS_KEY = 'monster-levels';
export const MONSTER_HITZONES_KEY = 'monster-hitzones';

export function useMonsterLevels(monsterId: string | null | undefined) {
  return useQuery({
    queryKey: [MONSTER_LEVELS_KEY, monsterId],
    enabled: Boolean(monsterId),
    queryFn: async () => {
      if (!monsterId) return [];
      const { data, error } = await supabase
        .from('monster_levels')
        .select('*')
        .eq('monster_id', monsterId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('Failed to fetch monster levels:', error);
        return [];
      }
      return (data ?? []) as DBMonsterLevel[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useMonsterHitzones(monsterId: string | null | undefined) {
  return useQuery({
    queryKey: [MONSTER_HITZONES_KEY, monsterId],
    enabled: Boolean(monsterId),
    queryFn: async () => {
      if (!monsterId) return [];
      const { data, error } = await supabase
        .from('monster_hitzones')
        .select('*')
        .eq('monster_id', monsterId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('Failed to fetch monster hitzones:', error);
        return [];
      }
      return (data ?? []) as DBMonsterHitzone[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
