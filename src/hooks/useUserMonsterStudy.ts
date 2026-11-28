// ─────────────────────────────────────────────────────────────
// useUserMonsterStudy — Hook for tracking monster research & study progress
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useInvestigationJourney, monstersToAutoUnlock } from './useInvestigationJourney';

const STORAGE_KEY = 'field-guide-user-monster-study-v1';
/** Monsters the Investigation Journey has already ticked "Unlocked" on (so a manual untick sticks) */
const AUTO_UNLOCKED_KEY = 'field-guide-journey-auto-unlocked-v1';

function readAutoUnlocked(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(AUTO_UNLOCKED_KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

function rememberAutoUnlocked(ids: string[]) {
  if (typeof window === 'undefined' || !ids.length) return;
  try {
    const set = readAutoUnlocked();
    ids.forEach((id) => set.add(id));
    localStorage.setItem(AUTO_UNLOCKED_KEY, JSON.stringify([...set]));
  } catch {
    /* storage full or blocked */
  }
}
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
  miniature_crown: boolean;
  giant_crown: boolean;
  finished: boolean;
  custom_tasks: CustomStudyTask[];
  /** Investigation Notes studies finished on this monster (mostly from free hunts) */
  free_hunt_studies: number;
}

export type StandardStudyKey =
  | 'unlocked'
  | 'photo_taken'
  | 'witnessed_behavior'
  | 'hunted_10_plus'
  | 'miniature_crown'
  | 'giant_crown'
  | 'finished';

const DEFAULT_RECORD = (monsterId: string): MonsterStudyRecord => ({
  monster_id: monsterId,
  unlocked: false,
  photo_taken: false,
  witnessed_behavior: false,
  hunted_10_plus: false,
  miniature_crown: false,
  giant_crown: false,
  finished: false,
  custom_tasks: [],
  free_hunt_studies: 0,
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
          miniature_crown: Boolean(row.miniature_crown),
          giant_crown: Boolean(row.giant_crown),
          finished: Boolean(row.finished),
          custom_tasks: Array.isArray(row.custom_tasks) ? row.custom_tasks : [],
          free_hunt_studies: Math.max(0, Number(row.free_hunt_studies) || 0),
        };
      }
    }
    return map;
  }, [user, dbRecords, localMap]);

  // Mutation to persist a record
  const saveMutation = useMutation({
    mutationFn: async (record: MonsterStudyRecord) => {
      if (!user) return;
      const upsert = (row: Record<string, unknown>) =>
        supabase.from('user_monster_study').upsert(row, { onConflict: 'user_id,monster_id' });
      const row: Record<string, unknown> = {
            user_id: user.id,
            monster_id: record.monster_id,
            unlocked: record.unlocked,
            photo_taken: record.photo_taken,
            witnessed_behavior: record.witnessed_behavior,
            hunted_10_plus: record.hunted_10_plus,
            miniature_crown: record.miniature_crown,
            giant_crown: record.giant_crown,
            finished: record.finished,
            custom_tasks: record.custom_tasks,
            free_hunt_studies: record.free_hunt_studies ?? 0,
            updated_at: new Date().toISOString(),
      };
      let { error } = await upsert(row);
      // Before the free_hunt_studies migration is applied, save without it
      if (error && (error.code === 'PGRST204' || error.code === '42703' || /free_hunt_studies/.test(error.message ?? ''))) {
        const { free_hunt_studies: _f, ...rest } = row;
        ({ error } = await upsert(rest));
      }
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

  const { data: journey = [] } = useInvestigationJourney();

  /**
   * Save a record. When it gives the Investigation Journey's required monster enough
   * studies, the monster that step unlocks gets "Unlocked" ticked as well.
   * Returns the monsters that were unlocked this way.
   */
  const commit = useCallback(
    async (updated: MonsterStudyRecord): Promise<string[]> => {
      const nextMap = { ...studyMap, [updated.monster_id]: updated };
      const already = readAutoUnlocked();
      const toUnlock = monstersToAutoUnlock(journey, (id) => nextMap[id])
        .filter((id) => id !== updated.monster_id && !already.has(id));
      const extra = toUnlock.map((id) => ({ ...(nextMap[id] ?? DEFAULT_RECORD(id)), unlocked: true }));
      for (const r of extra) nextMap[r.monster_id] = r;
      saveLocal(nextMap);
      rememberAutoUnlocked(toUnlock);
      if (user) {
        await saveMutation.mutateAsync(updated);
        for (const r of extra) await saveMutation.mutateAsync(r);
      }
      return toUnlock;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studyMap, journey, user, saveMutation],
  );

  /** Tick "Unlocked" on journey monsters whose required studies are already logged (e.g. older data). */
  const syncJourneyUnlocks = useCallback(async (): Promise<string[]> => {
    const already = readAutoUnlocked();
    const toUnlock = monstersToAutoUnlock(journey, (id) => studyMap[id]).filter((id) => !already.has(id));
    if (!toUnlock.length) return [];
    const nextMap = { ...studyMap };
    const extra = toUnlock.map((id) => ({ ...(nextMap[id] ?? DEFAULT_RECORD(id)), unlocked: true }));
    for (const r of extra) nextMap[r.monster_id] = r;
    saveLocal(nextMap);
    rememberAutoUnlocked(toUnlock);
    if (user) for (const r of extra) await saveMutation.mutateAsync(r);
    return toUnlock;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMap, journey, user, saveMutation]);

  /** Set how many Free Hunt (Investigation Notes) studies are finished on a monster. */
  const setFreeHuntStudies = useCallback(
    async (monsterId: string, count: number) => {
      const current = getMonsterStudy(monsterId);
      return commit({ ...current, free_hunt_studies: Math.max(0, Math.round(count)) });
    },
    [getMonsterStudy, commit],
  );

  const toggleStandardTask = useCallback(
    async (monsterId: string, taskKey: StandardStudyKey, isElder: boolean = false) => {
      const current = getMonsterStudy(monsterId);
      let updated: MonsterStudyRecord;

      if (taskKey === 'finished') {
        const nextFinished = !current.finished;
        if (nextFinished) {
          // If user clicks Finished, all applicable tasks are finished!
          updated = {
            ...current,
            unlocked: true,
            photo_taken: !isElder,
            witnessed_behavior: !isElder,
            hunted_10_plus: !isElder,
            miniature_crown: !isElder,
            giant_crown: !isElder,
            finished: true,
            custom_tasks: current.custom_tasks.map((t) => ({ ...t, completed: true })),
          };
        } else {
          updated = {
            ...current,
            finished: false,
            ...(isElder ? { unlocked: false } : {}),
          };
        }
      } else {
        const nextVal = !current[taskKey];
        updated = {
          ...current,
          [taskKey]: nextVal,
        };

        if (isElder) {
          // Elder dragons only have Unlocked study progress
          const allCustom = updated.custom_tasks.every((t) => t.completed);
          if (taskKey === 'unlocked') {
            updated.finished = nextVal && allCustom;
          } else if (!nextVal && current.finished) {
            updated.finished = false;
          }
        } else {
          // Standard large monsters
          const allStandard =
            (taskKey === 'unlocked' ? nextVal : updated.unlocked) &&
            (taskKey === 'photo_taken' ? nextVal : updated.photo_taken) &&
            (taskKey === 'witnessed_behavior' ? nextVal : updated.witnessed_behavior) &&
            (taskKey === 'hunted_10_plus' ? nextVal : updated.hunted_10_plus) &&
            (taskKey === 'miniature_crown' ? nextVal : updated.miniature_crown) &&
            (taskKey === 'giant_crown' ? nextVal : updated.giant_crown);
          const allCustom = updated.custom_tasks.every((t) => t.completed);

          if (allStandard && allCustom) {
            updated.finished = true;
          } else if (!nextVal && current.finished) {
            updated.finished = false;
          }
        }
      }

      await commit(updated);
    },
    [getMonsterStudy, commit],
  );

  const setFinished = useCallback(
    async (monsterId: string, finished: boolean, isElder: boolean = false) => {
      const current = getMonsterStudy(monsterId);
      let updated: MonsterStudyRecord;
      if (finished) {
        updated = {
          ...current,
          unlocked: true,
          photo_taken: !isElder,
          witnessed_behavior: !isElder,
          hunted_10_plus: !isElder,
          miniature_crown: !isElder,
          giant_crown: !isElder,
          finished: true,
          custom_tasks: current.custom_tasks.map((t) => ({ ...t, completed: true })),
        };
      } else {
        updated = {
          ...current,
          finished: false,
          ...(isElder ? { unlocked: false } : {}),
        };
      }
      await commit(updated);
    },
    [getMonsterStudy, commit],
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
        // New uncompleted task means monster is no longer finished
        finished: false,
      };
      await commit(updated);
    },
    [getMonsterStudy, commit],
  );

  const toggleCustomTask = useCallback(
    async (monsterId: string, taskId: string) => {
      const current = getMonsterStudy(monsterId);
      const updatedTasks = current.custom_tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t,
      );
      const allStandard =
        current.unlocked &&
        current.photo_taken &&
        current.witnessed_behavior &&
        current.hunted_10_plus &&
        current.miniature_crown &&
        current.giant_crown;
      const allCustom = updatedTasks.every((t) => t.completed);
      const isUnchecking = !updatedTasks.find((t) => t.id === taskId)?.completed;

      const updated: MonsterStudyRecord = {
        ...current,
        custom_tasks: updatedTasks,
        finished: allStandard && allCustom ? true : isUnchecking && current.finished ? false : current.finished,
      };
      await commit(updated);
    },
    [getMonsterStudy, commit],
  );

  const deleteCustomTask = useCallback(
    async (monsterId: string, taskId: string) => {
      const current = getMonsterStudy(monsterId);
      const updated: MonsterStudyRecord = {
        ...current,
        custom_tasks: current.custom_tasks.filter((t) => t.id !== taskId),
      };
      await commit(updated);
    },
    [getMonsterStudy, commit],
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
    setFreeHuntStudies,
    syncJourneyUnlocks,
    journey,
  };
}
