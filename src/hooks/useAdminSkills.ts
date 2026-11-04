// ─────────────────────────────────────────────────────────────
// React Query hooks for the admin skills table
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface SetBonusTier {
  /** Number of pieces required to activate this tier, e.g. 2 or 4 */
  pieces: number;
  /** Optional skill granted when reaching this tier, e.g. "fire_attack" */
  granted_skill_id?: string | null;
  /** Level of the granted skill, e.g. 1 or 2 */
  granted_skill_level?: number;
  /** Optional effect description or notes */
  description?: string | null;
}

export function normalizeSetThresholds(raw: unknown): SetBonusTier[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'number') {
      return { pieces: item, granted_skill_id: null, granted_skill_level: 1 };
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return {
        pieces: typeof obj.pieces === 'number' ? obj.pieces : Number(obj.pieces) || 2,
        granted_skill_id: typeof obj.granted_skill_id === 'string' ? obj.granted_skill_id : null,
        granted_skill_level: typeof obj.granted_skill_level === 'number' ? obj.granted_skill_level : 1,
        description: typeof obj.description === 'string' ? obj.description : null,
      };
    }
    return { pieces: 2, granted_skill_id: null, granted_skill_level: 1 };
  });
}

export interface DBSkill {
  id: string;
  name: string;
  name_ja: string | null;
  /** Category from the game data, e.g. "Hunt (General)" */
  category: string;
  /** The skill level this row describes (1-based) */
  level: number;
  /** Highest level of the skill this row belongs to (tier count for set bonuses) */
  max_levels: number;
  is_set_bonus: boolean;
  /** Activation thresholds and granted bonuses for each tier of the set bonus */
  set_thresholds: SetBonusTier[];
  is_active: boolean;
  icon: string | null;
  /** Per-game sort positions — e.g. { mho: 3 } */
  sort_orders: Record<string, number>;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SkillUpsert = Omit<DBSkill, 'created_at' | 'updated_at'>;

export interface SkillFilters {
  search?: string;
  category?: string;
  isSetBonus?: boolean;
  isActive?: boolean | null;
}

export const SKILLS_KEY = 'admin-skills';

// ── Queries ───────────────────────────────────────────────────

export function useAdminSkills(filters: SkillFilters = {}) {
  return useQuery({
    queryKey: [SKILLS_KEY, filters.category, filters.search, filters.isSetBonus, filters.isActive],
    queryFn: async () => {
      let q = supabase
        .from('skills')
        .select('*')
        .order('name', { ascending: true })
        .order('level', { ascending: true });

      if (filters.search) {
        q = q.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }
      if (filters.category) {
        q = q.eq('category', filters.category);
      }
      if (filters.isSetBonus !== undefined) {
        q = q.eq('is_set_bonus', filters.isSetBonus);
      }
      if (filters.isActive !== null && filters.isActive !== undefined) {
        q = q.eq('is_active', filters.isActive);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        is_set_bonus: Boolean(s.is_set_bonus),
        set_thresholds: normalizeSetThresholds(s.set_thresholds),
        level: Number(s.level) || 1,
        max_levels: Number(s.max_levels) || 1,
        sort_orders: (s.sort_orders as Record<string, number>) || {},
      })) as DBSkill[];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ── Shared optimistic patcher ────────────────────────────────
function patchCachedSkill(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<DBSkill>,
) {
  qc.setQueriesData(
    { queryKey: [SKILLS_KEY], exact: false },
    (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return (old as DBSkill[]).map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      );
    },
  );
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpsertSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (skill: SkillUpsert) => {
      const { data, error } = await supabase
        .from('skills')
        .upsert(skill, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data as DBSkill;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SKILLS_KEY] });
    },
  });
}

export function useToggleSkillActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('skills')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: [SKILLS_KEY] });
      const snapshot = qc.getQueriesData<DBSkill[]>({ queryKey: [SKILLS_KEY], exact: false });
      patchCachedSkill(qc, id, { is_active: isActive });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [SKILLS_KEY] });
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('skills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SKILLS_KEY] });
    },
  });
}
