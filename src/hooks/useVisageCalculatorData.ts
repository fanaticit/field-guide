// ─────────────────────────────────────────────────────────────
// useVisageCalculatorData — loads base effects & resketch pools
// from Supabase, builds the VisageCalc engine, and exposes ready-to-use
// card analysis and resketch calculation utilities.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  DBVisageBaseEffect,
  DBVisageResketchSlot,
  DBVisageResketchPoolEntry,
} from '../data/schemas/visage';
import {
  createVisageCalc,
  type BaseEffectPool,
  type ResketchDataset,
  type VisageCalcEngine,
} from '../lib/visageCalc';

export const VISAGE_BASE_EFFECTS_QUERY_KEY = 'visage-base-effects';
export const VISAGE_RESKETCH_SLOTS_QUERY_KEY = 'visage-resketch-slots';
export const VISAGE_RESKETCH_POOL_QUERY_KEY = 'visage-resketch-pool';

/** Fetches all base effect definitions from Supabase */
export function useVisageBaseEffects() {
  return useQuery({
    queryKey: [VISAGE_BASE_EFFECTS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visage_base_effects')
        .select('*')
        .order('pool_id', { ascending: true })
        .order('entry_id', { ascending: true });

      if (error) throw error;
      return (data ?? []) as DBVisageBaseEffect[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/** Fetches resketch slot costs and unlock levels */
export function useVisageResketchSlots() {
  return useQuery({
    queryKey: [VISAGE_RESKETCH_SLOTS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visage_resketch_slots')
        .select('*')
        .order('slot', { ascending: true });

      if (error) throw error;
      return (data ?? []) as DBVisageResketchSlot[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

/** Fetches the full resketch roll pool */
export function useVisageResketchPool() {
  return useQuery({
    queryKey: [VISAGE_RESKETCH_POOL_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visage_resketch_pool')
        .select('*')
        .order('entry_id', { ascending: true });

      if (error) throw error;
      return (data ?? []) as DBVisageResketchPoolEntry[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Convenience hook that loads all required calculator data and instantiates
 * a cached VisageCalc engine.
 */
export function useVisageCalculatorEngine() {
  const { data: baseEffects = [], isLoading: isLoadingBase } = useVisageBaseEffects();
  const { data: resketchSlots = [], isLoading: isLoadingSlots } = useVisageResketchSlots();
  const { data: resketchPool = [], isLoading: isLoadingPool } = useVisageResketchPool();

  const formattedBaseEffects: BaseEffectPool[] = useMemo(() => {
    if (baseEffects.length === 0) return [];
    const map = new Map<number, BaseEffectPool>();

    for (const row of baseEffects) {
      let pool = map.get(row.pool_id);
      if (!pool) {
        pool = {
          pool_id: row.pool_id,
          qualities: row.quality,
          monsters: row.monsters || [],
          effects: [],
        };
        map.set(row.pool_id, pool);
      }
      pool.effects.push({
        entry_id: row.entry_id,
        effect: row.effect,
        tier: row.tier,
        effect_chance: row.effect_chance,
        tier_chance: row.tier_chance,
        overall_chance: row.overall_chance,
        values_by_level: row.values_by_level || [],
      });
    }

    return Array.from(map.values());
  }, [baseEffects]);

  const formattedResketchDataset: ResketchDataset = useMemo(() => {
    const dataset: ResketchDataset = {};
    const qualities = ['Rare', 'Epic', 'Superior'] as const;

    for (const q of qualities) {
      const slots = resketchSlots
        .filter((s) => s.quality === q)
        .sort((a, b) => a.slot - b.slot)
        .map((s) => ({
          unlocks_at_level: s.unlock_level,
          item: s.item_name,
          count: s.item_count,
          zenny: s.zenny,
        }));

      const pool = resketchPool
        .filter((p) => p.quality === q)
        .sort((a, b) => a.entry_id - b.entry_id)
        .map((p) => ({
          entry_id: p.entry_id,
          effect: p.effect,
          roll_quality: p.roll_quality,
          effect_chance: p.effect_chance,
          roll_quality_chance: p.roll_quality_chance,
          overall_chance: p.overall_chance,
          values: p.values || [],
          value_chances: p.value_chances || [],
        }));

      dataset[q] = { slots, pool };
    }

    return dataset;
  }, [resketchSlots, resketchPool]);

  const calc: VisageCalcEngine | null = useMemo(() => {
    if (
      formattedBaseEffects.length === 0 ||
      !formattedResketchDataset.Rare ||
      !formattedResketchDataset.Epic ||
      !formattedResketchDataset.Superior ||
      formattedResketchDataset.Rare.pool.length === 0
    ) {
      return null;
    }
    return createVisageCalc(formattedResketchDataset, formattedBaseEffects);
  }, [formattedBaseEffects, formattedResketchDataset]);

  return {
    calc,
    baseEffects: formattedBaseEffects,
    resketchDataset: formattedResketchDataset,
    isLoading: isLoadingBase || isLoadingSlots || isLoadingPool,
  };
}
