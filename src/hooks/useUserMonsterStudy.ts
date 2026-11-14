// ─────────────────────────────────────────────────────────────
// useUserMonsterStudy — Hook for tracking monster research & study progress
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const STORAGE_KEY = 'field-guide-user-monster-study-v1';
export const USER_MONSTER_STUDY_QUERY_KEY = 'user-monster-study';

export interface CustomStudyTask {
  id: string;
  label: string;
  completed: boolean;
}

export interface MonsterStudyRecord {
  monster_id: string;
  unlocked: boolean;
  photo_taken: boolean;
  witnessed_behavior: boolean;
  hunted_10_plus: boolean;
  finished: boolean;
  custom_tasks: CustomStudyTask[];
}

export type StandardStudyKey =
  | 'unlocked'
  | 'photo_taken'
  | 'witnessed_behavior'
  | 'hunted_10_plus'
  | 'finished';

const DEFAULT_RECORD = (monsterId: string): MonsterStudyRecord => ({
  monster_id: monsterId,
  unlocked: false,
  photo_taken: false,
  witnessed_behavior: false,
  hunted_10_plus: false,
  finished: false,
  custom_tasks: [],
});

export function useUserMonsterStudy() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Local storage for guests / offline support
  const [localMap, setLocalMap] = useState<Record<string, MonsterStudyRecord>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse local monster study data', e);
    }
    return {};
  });

  const saveLocal = (next: Record<string, MonsterStudyRecord>) => {
    setLocalMap(next);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save monster study data to local storage', e);
    }
  };

  // Live Supabase query when signed in
  const { data: dbRecords = [], isLoading } = useQuery({
    queryKey: [USER_MONSTER_STUDY_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_monster_study')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.warn('user_monster_study query error:', error);
        return [];
      }
      return (data ?? []) as (MonsterStudyRecord & { id: string; user_id: string })[];
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });

  // Combined study map
  const studyMap = useMemo<Record<string, MonsterStudyRecord>>(() => {
    const map: Record<string, MonsterStudyRecord> = { ...localMap };
    if (user && dbRecords.length > 0) {
      for (const row of dbRecords) {
        map[row.monster_id] = {
          monster_id: row.monster_id,
          unlocked: Boolean(row.unlocked),
          photo_taken: Boolean(row.photo_taken),
          witnessed_behavior: Boolean(row.witnessed_behavior),
          hunted_10_plus: Boolean(row.hunted_10_plus),
          finished: Boolean(row.finished),
          custom_tasks: Array.isArray(row.custom_tasks) ? row.custom_tasks : [],
        };
      }
    }
    return map;
  }, [user, dbRecords, localMap]);

  // Mutation to persist a record
  const saveMutation = useMutation({
    mutationFn: async (record: MonsterStudyRecord) => {
      if (!user) return;
      const { error } = await supabase
        .from('user_monster_study')
        .upsert(
          {
            user_id: user.id,
            monster_id: record.monster_id,
            unlocked: record.unlocked,
            photo_taken: record.photo_taken,
            witnessed_behavior: record.witnessed_behavior,
            hunted_10_plus: record.hunted_10_plus,
            finished: record.finished,
            custom_tasks: record.custom_tasks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,monster_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) {
        qc.invalidateQueries({ queryKey: [USER_MONSTER_STUDY_QUERY_KEY, user.id] });
      }
    },
  });

  const getMonsterStudy = useCallback(
    (monsterId: string): MonsterStudyRecord => {
      return studyMap[monsterId] || DEFAULT_RECORD(monsterId);
    },
    [studyMap],
  );

  const toggleStandardTask = useCallback(
    async (monsterId: string, taskKey: StandardStudyKey) => {
      const current = getMonsterStudy(monsterId);
      const updated: MonsterStudyRecord = {
        ...current,
        [taskKey]: !current[taskKey],
      };

      // If finished is toggled on, or if all items are complete
      if (taskKey === 'finished' && updated.finished) {
        // Auto-mark standard items if user explicitly marks Finished
        updated.unlocked = true;
      }

      const nextMap = { ...studyMap, [monsterId]: updated };
      saveLocal(nextMap);
      if (user) {
        await saveMutation.mutateAsync(updated);
      }
    },
    [getMonsterStudy, studyMap, user, saveMutation],
  );

  const setFinished = useCallback(
    async (monsterId: string, finished: boolean) => {
      const current = getMonsterStudy(monsterId);
      const updated: MonsterStudyRecord = {
        ...current,
        finished,
      };
      const nextMap = { ...studyMap, [monsterId]: updated };
      saveLocal(nextMap);
      if (user) {
        await saveMutation.mutateAsync(updated);
      }
    },
    [getMonsterStudy, studyMap, user, saveMutation],
  );

  const addCustomTask = useCallback(
    async (monsterId: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const current = getMonsterStudy(monsterId);
      const newTask: CustomStudyTask = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        label: trimmed,
        completed: false,
      };
      const updated: MonsterStudyRecord = {
        ...current,
        custom_tasks: [...current.custom_tasks, newTask],
      };
      const nextMap = { ...studyMap, [monsterId]: updated };
      saveLocal(nextMap);
      if (user) {
        await saveMutation.mutateAsync(updated);
      }
    },
    [getMonsterStudy, studyMap, user, saveMutation],
  );

  const toggleCustomTask = useCallback(
    async (monsterId: string, taskId: string) => {
      const current = getMonsterStudy(monsterId);
      const updated: MonsterStudyRecord = {
        ...current,
        custom_tasks: current.custom_tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t,
        ),
      };
      const nextMap = { ...studyMap, [monsterId]: updated };
      saveLocal(nextMap);
      if (user) {
        await saveMutation.mutateAsync(updated);
      }
    },
    [getMonsterStudy, studyMap, user, saveMutation],
  );

  const deleteCustomTask = useCallback(
    async (monsterId: string, taskId: string) => {
      const current = getMonsterStudy(monsterId);
      const updated: MonsterStudyRecord = {
        ...current,
        custom_tasks: current.custom_tasks.filter((t) => t.id !== taskId),
      };
      const nextMap = { ...studyMap, [monsterId]: updated };
      saveLocal(nextMap);
      if (user) {
        await saveMutation.mutateAsync(updated);
      }
    },
    [getMonsterStudy, studyMap, user, saveMutation],
  );

  return {
    studyMap,
    isLoading,
    getMonsterStudy,
    toggleStandardTask,
    setFinished,
    addCustomTask,
    toggleCustomTask,
    deleteCustomTask,
  };
}
