// ─────────────────────────────────────────────────────────────
// useChallengeProjects — group challenges into projects.
//
// A project is usually one build from the planner: its weapon, 5 armour pieces,
// adventurer, buddy and visage cards. Each project item links to a hunter_challenges
// row and has its own target level ("done for this project"), so one challenge can be
// in several projects with different goals.
//
//   challenge_projects       id, user_id, name, build_id, default targets
//   challenge_project_items  project_id, challenge_id, slot, target_level, added_by_project
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ADVENTURER_MAX_INSIGHT } from '../data/schemas/adventurer';
import { ARMOUR_FORGE_MATERIALS, WEAPON_FORGE_MATERIALS, type GearMaterialRequirement } from '../data/core/gear-materials';
import {
  HUNTER_CHALLENGES_KEY,
  VISAGE_RARITY_INDEX,
  type ChallengeStatus,
  type HunterChallenge,
} from './useHunterChallenges';
import { USER_WEAPON_COLLECTION_QUERY_KEY } from './useUserWeaponCollection';

// ── Types ────────────────────────────────────────────────────

export type ProjectSlot =
  | 'weapon' | 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves'
  | 'adventurer' | 'buddy'
  | 'core_visage' | 'visage_2' | 'visage_3' | 'visage_4' | 'visage_5';

export const PROJECT_SLOT_ORDER: ProjectSlot[] = [
  'weapon', 'helm', 'chest', 'gloves', 'waist', 'greaves',
  'adventurer', 'buddy', 'core_visage', 'visage_2', 'visage_3', 'visage_4', 'visage_5',
];

export const PROJECT_SLOT_LABELS: Record<ProjectSlot, string> = {
  weapon: 'Weapon', helm: 'Helm', chest: 'Chest', gloves: 'Gloves', waist: 'Waist', greaves: 'Greaves',
  adventurer: 'Adventurer', buddy: 'Buddy',
  core_visage: 'Core Visage', visage_2: 'Visage 2', visage_3: 'Visage 3', visage_4: 'Visage 4', visage_5: 'Visage 5',
};

export interface ChallengeProjectItem {
  project_id: string;
  challenge_id: string;
  user_id: string;
  slot: ProjectSlot | null;
  target_level: number;
  added_by_project: boolean;
  sort_order: number;
}

export interface ChallengeProject {
  id: string;
  user_id: string;
  name: string;
  build_id: string | null;
  weapon_target_rarity: number | null;
  armour_target_rarity: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  items: ChallengeProjectItem[];
}

export const CHALLENGE_PROJECTS_KEY = 'challenge-projects';

const isMissingTable = (err: { message?: string; code?: string } | null) =>
  Boolean(err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message ?? '')));

/**
 * A readable message for any error thrown here. Supabase errors are plain objects
 * ({ message, details, hint, code }), not Error instances, so String(err) gives "[object Object]".
 */
export function projectErrorMessage(err: unknown): string {
  if (!err) return 'Something went wrong.';
  if (typeof err === 'string') return err;
  const e = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
  const code = typeof e.code === 'string' ? e.code : undefined;
  const message = typeof e.message === 'string' ? e.message : '';
  if ((code === '42P01' || code === 'PGRST205') && /challenge_project/i.test(message + String(e.details ?? ''))) {
    return 'The projects tables are not in the database yet. Apply the challenge projects migration first.';
  }
  const parts = [message, typeof e.details === 'string' ? e.details : '', typeof e.hint === 'string' ? e.hint : '']
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(' — ') + (code ? ` (${code})` : '');
  try { return JSON.stringify(err); } catch { return 'Something went wrong.'; }
}

// ── Status helpers ───────────────────────────────────────────

export function statusFor(current: number, target: number): ChallengeStatus {
  if (current >= target) return 'completed';
  return current > 0 ? 'upgrading' : 'crafting';
}

/** True when the challenge has reached this project's target. */
export function isProjectItemDone(item: ChallengeProjectItem, challenge: HunterChallenge | undefined): boolean {
  if (!challenge) return false;
  return (challenge.current_rarity ?? 0) >= item.target_level;
}

/** 0-1 progress of one item towards this project's target (partial upgrades count). */
export function projectItemProgress(item: ChallengeProjectItem, challenge: HunterChallenge | undefined): number {
  if (!challenge) return 0;
  const target = Math.max(1, item.target_level);
  return Math.max(0, Math.min(1, (challenge.current_rarity ?? 0) / target));
}

export interface ProjectProgress {
  /** 0-100, the average of each item's progress towards its target */
  percent: number;
  done: number;
  total: number;
}

export function projectProgress(project: ChallengeProject, challengesById: Map<string, HunterChallenge>): ProjectProgress {
  const items = project.items.filter((i) => challengesById.has(i.challenge_id));
  if (!items.length) return { percent: 0, done: 0, total: 0 };
  const sum = items.reduce((acc, i) => acc + projectItemProgress(i, challengesById.get(i.challenge_id)), 0);
  return {
    percent: Math.round((sum / items.length) * 100),
    done: items.filter((i) => isProjectItemDone(i, challengesById.get(i.challenge_id))).length,
    total: items.length,
  };
}

/**
 * The project's challenges as the page should show them: max_rarity is this project's target
 * and status is worked out against it (e.g. a weapon at R10 is "done" for a project that only
 * needs R10, even if the hunter's own challenge goes on to R16).
 */
export function projectChallenges(project: ChallengeProject, challengesById: Map<string, HunterChallenge>): HunterChallenge[] {
  const order = (i: ChallengeProjectItem) => (i.slot ? PROJECT_SLOT_ORDER.indexOf(i.slot) : 99) * 1000 + i.sort_order;
  return [...project.items]
    .sort((a, b) => order(a) - order(b))
    .flatMap((i) => {
      const c = challengesById.get(i.challenge_id);
      if (!c) return [];
      const status = statusFor(c.current_rarity ?? 0, i.target_level);
      return [{ ...c, max_rarity: i.target_level, status, completed_at: status === 'completed' ? c.completed_at ?? c.updated_at : null }];
    });
}

// ── Queries ──────────────────────────────────────────────────

export function useChallengeProjects(userId: string | null | undefined) {
  return useQuery({
    queryKey: [CHALLENGE_PROJECTS_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_projects')
        .select('*, items:challenge_project_items(*)')
        .eq('user_id', userId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) {
        if (isMissingTable(error)) return [] as ChallengeProject[];
        throw error;
      }
      return ((data ?? []) as ChallengeProject[]).map((p) => ({ ...p, items: p.items ?? [] }));
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}

// ── Create a project from a build ────────────────────────────

export interface BuildProjectInput {
  userId: string;
  name: string;
  buildId?: string | null;
  /** Re-sync this existing project instead of creating a new one */
  projectId?: string | null;
  weaponId?: string | null;
  armour: Partial<Record<'helm' | 'chest' | 'gloves' | 'waist' | 'greaves', string | null>>;
  adventurerId?: string | null;
  buddyId?: string | null;
  visages: { slot: ProjectSlot; visageId: string; inkType: string | null }[];
  /** Rarity that counts as done (clamped to each item's craft/max rarity) */
  weaponTarget: number;
  armourTarget: number;
  /** 1 = Fine (own it) … 4 = Superior */
  visageTarget: number;
}

export interface BuildProjectResult {
  projectId: string;
  added: number;
  alreadyTracked: number;
  alreadyDone: number;
}

type Row = Record<string, unknown>;

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

async function selectIn(table: string, select: string, column: string, ids: string[]): Promise<Row[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from(table).select(select).in(column, ids);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

/** Plan one challenge for a build slot: the row to insert (if new) and the target. */
interface PlannedItem {
  slot: ProjectSlot;
  target: number;
  /** Level already reached according to the hunter's collections */
  owned: number;
  match: (c: HunterChallenge) => boolean;
  newRow: Record<string, unknown>;
}

export async function createProjectFromBuild(input: BuildProjectInput): Promise<BuildProjectResult> {
  const { userId } = input;
  const armourIds = Object.values(input.armour).filter(Boolean) as string[];
  const visageIds = [...new Set(input.visages.map((v) => v.visageId))];

  const [
    existingRes,
    weapons,
    armour,
    visages,
    adventurers,
    buddies,
    weaponCol,
    advCol,
    buddyCol,
    visageCol,
  ] = await Promise.all([
    supabase.from('hunter_challenges').select('*').eq('user_id', userId),
    // '*' so a renamed or dropped column (armour_pieces lost `image` for icon_m/icon_f) can't break the save
    selectIn('weapons', '*', 'id', input.weaponId ? [input.weaponId] : []),
    selectIn('armour_pieces', '*', 'id', armourIds),
    selectIn('visages', '*, monster:monsters(name,icon)', 'id', visageIds),
    selectIn('adventurers', '*', 'id', input.adventurerId ? [input.adventurerId] : []),
    selectIn('buddies', '*', 'id', input.buddyId ? [input.buddyId] : []),
    input.weaponId
      ? supabase.from('user_weapon_collection').select('weapon_id,rarity').eq('user_id', userId).eq('weapon_id', input.weaponId)
      : Promise.resolve({ data: [], error: null }),
    input.adventurerId
      ? supabase.from('user_adventurer_collection').select('adventurer_id,insight_level').eq('user_id', userId).eq('adventurer_id', input.adventurerId)
      : Promise.resolve({ data: [], error: null }),
    input.buddyId
      ? supabase.from('user_buddy_collection').select('buddy_id,tier_level').eq('user_id', userId).eq('buddy_id', input.buddyId)
      : Promise.resolve({ data: [], error: null }),
    visageIds.length
      ? supabase.from('user_visage_collection').select('visage_id,ink_type,rarity').eq('user_id', userId).in('visage_id', visageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (existingRes.error) throw existingRes.error;
  const existing = (existingRes.data ?? []) as HunterChallenge[];

  const monsterIds = [...new Set([...weapons, ...armour].map((r) => r.monster_id as string | null).filter(Boolean) as string[])];
  const monsters = await selectIn('monsters', 'id,name,icon', 'id', monsterIds);
  const monsterById = new Map(monsters.map((m) => [String(m.id), m]));

  const planned: PlannedItem[] = [];
  const base = { user_id: userId, game: 'mho' };

  // Weapon
  const w = weapons[0];
  if (w) {
    const craft = Math.max(1, num(w.rarity, 1));
    const maxR = Math.max(craft, num(w.max_rarity, 16));
    const target = clamp(input.weaponTarget, craft, maxR);
    const owned = ((weaponCol.data ?? []) as Row[])[0] ? num(((weaponCol.data ?? []) as Row[])[0].rarity, craft) : 0;
    const m = monsterById.get(String(w.monster_id ?? ''));
    planned.push({
      slot: 'weapon', target, owned,
      match: (c) => c.weapon_id === w.id,
      newRow: {
        ...base, challenge_type: 'weapon', weapon_id: w.id, weapon_type_id: w.weapon_type_id,
        monster_id: m ? m.id : null, monster_name: m?.name ?? null, set_name: w.name,
        piece_image: (w.image as string | null) ?? (w.icon as string | null) ?? null,
        set_icon: (m?.icon as string | null) ?? (w.image as string | null) ?? null,
        element_type: w.element_type ?? null,
        special_skill: (w.apex_effect as { name?: string } | null)?.name ?? null,
        craft_rarity: craft,
      },
    });
  }

  // Armour
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  for (const [slot, pieceId] of Object.entries(input.armour) as [ProjectSlot, string | null][]) {
    const p = armour.find((a) => a.id === pieceId);
    if (!p) continue;
    const craft = Math.max(1, num(p.rarity, 1));
    const maxR = Math.max(craft, num(p.max_rarity, 16));
    const target = clamp(input.armourTarget, craft, maxR);
    const m = monsterById.get(String(p.monster_id ?? ''));
    const setName = `${(p.set_name as string | null) ?? (m?.name as string | undefined) ?? ''} ${(p.set_variant as string | null) ?? 'I'}`.trim();
    planned.push({
      slot, target, owned: 0,
      match: (c) => c.armour_piece_id === p.id,
      newRow: {
        ...base, challenge_type: 'armour_piece', armour_piece_id: p.id,
        monster_id: m ? m.id : null, monster_name: (m?.name as string | undefined) ?? null,
        // The build's slot key (helm…greaves); armour_pieces.slot holds the game names (Head, Arms, Legs…)
        armour_slot: slot, set_variant: p.set_variant ?? 'I', set_name: setName,
        piece_image: str(p.icon_m) ?? str(p.icon_f) ?? str(p.image),
        set_icon: str(p.set_icon) ?? str(m?.icon),
        craft_rarity: craft,
      },
    });
  }

  // Adventurer (recruit)
  const a = adventurers[0];
  if (a) {
    const col = ((advCol.data ?? []) as Row[])[0];
    planned.push({
      slot: 'adventurer', target: 1, owned: col ? clamp(num(col.insight_level, 1), 1, ADVENTURER_MAX_INSIGHT) : 0,
      match: (c) => c.adventurer_id === a.id,
      newRow: {
        ...base, challenge_type: 'adventurer', adventurer_id: a.id, set_name: a.name,
        piece_image: a.image ?? null, set_icon: a.image ?? null, monster_name: a.name, craft_rarity: 1,
      },
    });
  }

  // Buddy (recruit)
  const b = buddies[0];
  if (b) {
    const col = ((buddyCol.data ?? []) as Row[])[0];
    planned.push({
      slot: 'buddy', target: 1, owned: col ? clamp(num(col.tier_level, 0) + 1, 1, 3) : 0,
      match: (c) => c.buddy_id === b.id,
      newRow: {
        ...base, challenge_type: 'buddy', buddy_id: b.id, set_name: b.name,
        piece_image: b.image ?? null, set_icon: b.image ?? null, monster_name: b.name, craft_rarity: 1,
      },
    });
  }

  // Visage cards
  const vCol = (visageCol.data ?? []) as Row[];
  for (const v of input.visages) {
    const card = visages.find((x) => x.id === v.visageId);
    if (!card) continue;
    const ink = (v.inkType || 'flames').toLowerCase();
    const owned = vCol
      .filter((r) => r.visage_id === v.visageId && String(r.ink_type).toLowerCase() === ink)
      .reduce((best, r) => Math.max(best, VISAGE_RARITY_INDEX[String(r.rarity)] ?? 0), 0);
    const monster = card.monster as { name?: string; icon?: string } | null;
    planned.push({
      slot: v.slot, target: clamp(input.visageTarget, 1, 4), owned,
      match: (c) => c.visage_id === v.visageId && (c.ink_type ?? '').toLowerCase() === ink,
      newRow: {
        ...base, challenge_type: 'visage_set', visage_id: card.id, ink_type: ink,
        monster_id: card.monster_id ?? null, set_name: card.name, monster_name: card.name,
        piece_image: monster?.icon ?? null, set_icon: monster?.icon ?? null, craft_rarity: 1,
      },
    });
  }

  // Create or update the project
  let projectId = input.projectId ?? null;
  if (projectId) {
    const { error } = await supabase.from('challenge_projects')
      .update({ name: input.name, build_id: input.buildId ?? null, weapon_target_rarity: input.weaponTarget, armour_target_rarity: input.armourTarget })
      .eq('id', projectId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('challenge_projects')
      .insert({ user_id: userId, name: input.name, build_id: input.buildId ?? null, weapon_target_rarity: input.weaponTarget, armour_target_rarity: input.armourTarget })
      .select('id')
      .single();
    if (error) throw error;
    projectId = (data as { id: string }).id;
  }

  // Existing links of this project (when re-syncing)
  const { data: linkData } = await supabase.from('challenge_project_items').select('*').eq('project_id', projectId);
  const links = (linkData ?? []) as ChallengeProjectItem[];

  const result: BuildProjectResult = { projectId: projectId!, added: 0, alreadyTracked: 0, alreadyDone: 0 };
  const items: Omit<ChallengeProjectItem, 'project_id'>[] = [];
  const now = new Date().toISOString();

  for (const [n, plan] of planned.entries()) {
    const found = existing.find(plan.match);
    let challengeId: string;
    let addedByProject = false;
    if (found) {
      // Keep the hunter's own challenge; only raise its goal / sync what they already own
      const current = Math.max(found.current_rarity ?? 0, plan.owned);
      const maxR = Math.max(found.max_rarity ?? 0, plan.target);
      const status = found.status === 'abandoned' || current !== found.current_rarity || maxR !== found.max_rarity
        ? statusFor(current, maxR)
        : found.status;
      if (status !== found.status || current !== found.current_rarity || maxR !== found.max_rarity) {
        const { error } = await supabase.from('hunter_challenges').update({
          current_rarity: current, max_rarity: maxR, status,
          completed_at: status === 'completed' ? found.completed_at ?? now : null,
        }).eq('id', found.id);
        if (error) throw error;
      }
      challengeId = found.id;
      addedByProject = links.find((l) => l.challenge_id === found.id)?.added_by_project ?? false;
      result.alreadyTracked += 1;
      if (current >= plan.target) result.alreadyDone += 1;
    } else {
      const status = statusFor(plan.owned, plan.target);
      const { data, error } = await supabase.from('hunter_challenges').insert({
        ...plan.newRow,
        current_rarity: plan.owned,
        max_rarity: plan.target,
        status,
        completed_at: status === 'completed' ? now : null,
      }).select('id').single();
      if (error) throw error;
      challengeId = (data as { id: string }).id;
      addedByProject = true;
      existing.push({ ...(plan.newRow as unknown as HunterChallenge), id: challengeId, current_rarity: plan.owned, max_rarity: plan.target, status });
      result.added += 1;
      if (status === 'completed') result.alreadyDone += 1;
    }
    if (!items.some((i) => i.challenge_id === challengeId)) {
      items.push({ challenge_id: challengeId, user_id: userId, slot: plan.slot, target_level: plan.target, added_by_project: addedByProject, sort_order: n });
    }
  }

  if (items.length) {
    const { error } = await supabase.from('challenge_project_items')
      .upsert(items.map((i) => ({ ...i, project_id: projectId })), { onConflict: 'project_id,challenge_id' });
    if (error) throw error;
  }
  // Items no longer in the build are unlinked (their challenges stay)
  const stale = links.filter((l) => !items.some((i) => i.challenge_id === l.challenge_id)).map((l) => l.challenge_id);
  if (stale.length) {
    await supabase.from('challenge_project_items').delete().eq('project_id', projectId).in('challenge_id', stale);
  }
  return result;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [CHALLENGE_PROJECTS_KEY] });
  qc.invalidateQueries({ queryKey: [HUNTER_CHALLENGES_KEY] });
}

export function useCreateProjectFromBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProjectFromBuild,
    onSettled: () => invalidateAll(qc),
  });
}

// ── Change an item's target ──────────────────────────────────

export function useSetProjectItemTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, challenge, target, allProjects }: {
      item: ChallengeProjectItem;
      challenge: HunterChallenge;
      target: number;
      allProjects: ChallengeProject[];
    }) => {
      const { error } = await supabase.from('challenge_project_items')
        .update({ target_level: target })
        .eq('project_id', item.project_id)
        .eq('challenge_id', item.challenge_id);
      if (error) throw error;

      // The challenge's own goal must cover every project that uses it. It is only lowered
      // when this project created the challenge (the hunter's own goals are never reduced).
      const otherTargets = allProjects
        .flatMap((p) => p.items)
        .filter((i) => i.challenge_id === item.challenge_id && i.project_id !== item.project_id)
        .map((i) => i.target_level);
      const needed = Math.max(target, ...otherTargets);
      const maxR = item.added_by_project ? needed : Math.max(challenge.max_rarity ?? 0, needed);
      if (maxR !== challenge.max_rarity) {
        const current = challenge.current_rarity ?? 0;
        const status = challenge.status === 'abandoned' ? challenge.status : statusFor(current, maxR);
        const { error: e2 } = await supabase.from('hunter_challenges').update({
          max_rarity: maxR, status,
          completed_at: status === 'completed' ? challenge.completed_at ?? new Date().toISOString() : null,
        }).eq('id', challenge.id);
        if (e2) throw e2;
      }
    },
    onSettled: () => invalidateAll(qc),
  });
}

// ── Rename ───────────────────────────────────────────────────

export function useRenameProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, name }: { projectId: string; name: string }) => {
      const { error } = await supabase.from('challenge_projects').update({ name }).eq('id', projectId);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [CHALLENGE_PROJECTS_KEY] }),
  });
}

// ── Manual projects ──────────────────────────────────────────

/** The project slot a challenge fills, when it has an obvious one. */
function slotForChallenge(c: HunterChallenge): ProjectSlot | null {
  if (c.challenge_type === 'weapon') return 'weapon';
  if (c.challenge_type === 'adventurer') return 'adventurer';
  if (c.challenge_type === 'buddy') return 'buddy';
  if (c.challenge_type === 'armour_piece') {
    const s = (c.armour_slot ?? '').toLowerCase();
    return (['helm', 'chest', 'gloves', 'waist', 'greaves'] as ProjectSlot[]).find((x) => x === s) ?? null;
  }
  return null;
}

/** Create an empty project; challenges are added to it afterwards. */
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, name, sortOrder = 0 }: { userId: string; name: string; sortOrder?: number }) => {
      const { data, error } = await supabase.from('challenge_projects')
        .insert({ user_id: userId, name: name.trim() || 'New project', sort_order: sortOrder })
        .select('*')
        .single();
      if (error) throw error;
      return { ...(data as ChallengeProject), items: [] } as ChallengeProject;
    },
    // Show the new project straight away so it can be selected before the refetch lands
    onSuccess: (project) => {
      qc.setQueryData<ChallengeProject[]>([CHALLENGE_PROJECTS_KEY, project.user_id], (old) =>
        old && !old.some((p) => p.id === project.id) ? [...old, project] : old);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [CHALLENGE_PROJECTS_KEY] }),
  });
}

/**
 * Put existing challenges into a project. Each one's target starts at the challenge's own goal,
 * and the challenge itself is left as it is (it was not added by the project).
 */
export function useAddChallengesToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ project, challenges }: { project: ChallengeProject; challenges: HunterChallenge[] }) => {
      const have = new Set(project.items.map((i) => i.challenge_id));
      const fresh = challenges.filter((c) => !have.has(c.id));
      if (!fresh.length) return 0;
      const start = project.items.reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;
      const { error } = await supabase.from('challenge_project_items').insert(
        fresh.map((c, n) => ({
          project_id: project.id,
          challenge_id: c.id,
          user_id: project.user_id,
          slot: slotForChallenge(c),
          target_level: Math.max(1, c.max_rarity ?? 1),
          added_by_project: false,
          sort_order: start + n,
        })),
      );
      if (error) throw error;
      return fresh.length;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [CHALLENGE_PROJECTS_KEY] }),
  });
}

/** Take challenges out of a project. The challenges themselves stay on the page. */
export function useRemoveChallengesFromProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, challengeIds }: { projectId: string; challengeIds: string[] }) => {
      if (!challengeIds.length) return;
      const { error } = await supabase.from('challenge_project_items')
        .delete()
        .eq('project_id', projectId)
        .in('challenge_id', challengeIds);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [CHALLENGE_PROJECTS_KEY] }),
  });
}

// ── Close a project ──────────────────────────────────────────

export interface CloseProjectSummary {
  kept: number;
  removed: number;
}

/** Which unfinished challenges closing would remove: added by this project and not used by another project. */
export function challengesRemovedOnClose(
  project: ChallengeProject,
  allProjects: ChallengeProject[],
  challengesById: Map<string, HunterChallenge>,
): string[] {
  const usedElsewhere = new Set(
    allProjects.filter((p) => p.id !== project.id).flatMap((p) => p.items.map((i) => i.challenge_id)),
  );
  return project.items
    .filter((i) => i.added_by_project && !usedElsewhere.has(i.challenge_id))
    .filter((i) => {
      const c = challengesById.get(i.challenge_id);
      return c && (c.current_rarity ?? 0) === 0;
    })
    .map((i) => i.challenge_id);
}

/**
 * Remove the project. Everything the hunter has made progress on stays in their challenges
 * (finished weapons are also written to their weapon collection at the level reached).
 * Unstarted items the project added can be removed with it.
 */
export function useCloseProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ project, allProjects, challengesById, removeUnstarted }: {
      project: ChallengeProject;
      allProjects: ChallengeProject[];
      challengesById: Map<string, HunterChallenge>;
      removeUnstarted: boolean;
    }): Promise<CloseProjectSummary> => {
      // Weapons crafted for the project go into the weapon collection at the level reached
      for (const item of project.items) {
        const c = challengesById.get(item.challenge_id);
        if (!c?.weapon_id || (c.current_rarity ?? 0) <= 0) continue;
        const { data: col } = await supabase.from('user_weapon_collection')
          .select('rarity').eq('user_id', project.user_id).eq('weapon_id', c.weapon_id).maybeSingle();
        const rarity = Math.max(num((col as Row | null)?.rarity, 0), c.current_rarity ?? 0);
        await supabase.from('user_weapon_collection').upsert(
          { user_id: project.user_id, weapon_id: c.weapon_id, rarity, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,weapon_id' },
        );
      }

      const toRemove = removeUnstarted ? challengesRemovedOnClose(project, allProjects, challengesById) : [];
      const { error } = await supabase.from('challenge_projects').delete().eq('id', project.id);
      if (error) throw error;
      if (toRemove.length) {
        const { error: e2 } = await supabase.from('hunter_challenges').delete().in('id', toRemove);
        if (e2) throw e2;
      }
      return { kept: project.items.length - toRemove.length, removed: toRemove.length };
    },
    onSettled: () => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: [USER_WEAPON_COLLECTION_QUERY_KEY] });
    },
  });
}

// ── Monsters to hunt for a project ───────────────────────────

export interface UpgradeStep {
  rarity: number;
  materials: GearMaterialRequirement[];
  required_level?: number | null;
}

export interface HuntMaterial {
  item: string;
  count: number;
  /** I-VI, from the material name */
  tier: string | null;
}

export interface HuntMonster {
  /** monsters.id, or '__general__' for materials no monster drops */
  monsterId: string;
  monsterName: string;
  icon: string | null;
  materials: HuntMaterial[];
  total: number;
  /** Tiers needed, lowest first */
  tiers: string[];
  /** Challenge ids that need this monster */
  challengeIds: string[];
}

export interface HuntItemPlan {
  challengeId: string;
  from: number;
  to: number;
  /** Highest hunter level the remaining steps ask for */
  requiredLevel: number | null;
  materials: GearMaterialRequirement[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const TIER_RE = /\s(VI|IV|V|III|II|I)$/;
export const tierOf = (item: string): string | null => item.match(TIER_RE)?.[1] ?? null;
export const tierNumber = (tier: string | null): number | null => (tier ? ROMAN.indexOf(tier) + 1 || null : null);

/** Materials still needed to take one weapon/armour challenge from its current rarity to the target. */
export function materialsToTarget(
  c: HunterChallenge,
  target: number,
  steps: Map<number, UpgradeStep> | undefined,
): HuntItemPlan | null {
  const isWeapon = Boolean(c.weapon_id);
  const id = (isWeapon ? c.weapon_id : c.armour_piece_id) ?? null;
  if (!id) return null;
  const current = c.current_rarity ?? 0;
  if (current >= target) return null;
  const craft = c.craft_rarity || 1;
  const mats: GearMaterialRequirement[] = [];
  let requiredLevel: number | null = null;
  if (current === 0) mats.push(...((isWeapon ? WEAPON_FORGE_MATERIALS : ARMOUR_FORGE_MATERIALS)[id] ?? []));
  for (let r = Math.max(current, craft) + 1; r <= target; r += 1) {
    const step = steps?.get(r);
    if (!step) continue;
    mats.push(...step.materials);
    if (step.required_level) requiredLevel = Math.max(requiredLevel ?? 0, step.required_level);
  }
  return { challengeId: c.id, from: current, to: target, requiredLevel, materials: mats };
}

/** Group the materials of several item plans by the monster that drops them (matched by name). */
export function groupMaterialsByMonster(
  plans: HuntItemPlan[],
  monsters: { id: string; name: string; icon?: string | null }[],
): HuntMonster[] {
  const byLength = [...monsters].sort((a, b) => b.name.length - a.name.length);
  const groups = new Map<string, HuntMonster & { mats: Map<string, HuntMaterial> }>();
  for (const plan of plans) {
    for (const m of plan.materials) {
      if (/zenny/i.test(m.item)) continue;
      const lower = m.item.toLowerCase();
      const monster = byLength.find((x) => lower.includes(x.name.toLowerCase()));
      const key = monster?.id ?? '__general__';
      if (!groups.has(key)) {
        groups.set(key, {
          monsterId: key, monsterName: monster?.name ?? 'General materials', icon: monster?.icon ?? null,
          materials: [], total: 0, tiers: [], challengeIds: [], mats: new Map(),
        });
      }
      const g = groups.get(key)!;
      const mat = g.mats.get(m.item) ?? { item: m.item, count: 0, tier: tierOf(m.item) };
      mat.count += m.count;
      g.mats.set(m.item, mat);
      g.total += m.count;
      if (!g.challengeIds.includes(plan.challengeId)) g.challengeIds.push(plan.challengeId);
    }
  }
  return [...groups.values()]
    .map(({ mats, ...g }) => {
      const materials = [...mats.values()].sort((a, b) => (tierNumber(a.tier) ?? 0) - (tierNumber(b.tier) ?? 0) || b.count - a.count);
      const tiers = [...new Set(materials.map((m) => m.tier).filter(Boolean) as string[])]
        .sort((a, b) => ROMAN.indexOf(a) - ROMAN.indexOf(b));
      return { ...g, materials, tiers };
    })
    .sort((a, b) => Number(a.monsterId === '__general__') - Number(b.monsterId === '__general__') || b.total - a.total);
}

/** Upgrade steps for many weapons at once (rarity → materials). */
export function useWeaponUpgradeSteps(weaponIds: string[]) {
  const key = [...weaponIds].sort().join(',');
  return useQuery({
    queryKey: ['weapon-upgrade-steps', key],
    enabled: weaponIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weapon_upgrades')
        .select('weapon_id, rarity, materials, required_level')
        .in('weapon_id', weaponIds);
      if (error) throw error;
      const map = new Map<string, Map<number, UpgradeStep>>();
      for (const r of (data ?? []) as { weapon_id: string; rarity: number; materials: GearMaterialRequirement[]; required_level: number | null }[]) {
        if (!map.has(r.weapon_id)) map.set(r.weapon_id, new Map());
        map.get(r.weapon_id)!.set(r.rarity, { rarity: r.rarity, materials: r.materials ?? [], required_level: r.required_level });
      }
      return map;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export interface HuntLevel {
  monster_id: string;
  hunt_difficulty: number;
  monster_level: number | null;
  suggested_hunt_power: number | null;
}

/** "Hunt" difficulty levels of some monsters (difficulty 1-6 lines up with material tiers I-VI). */
export function useMonsterHuntLevels(monsterIds: string[]) {
  const key = [...monsterIds].sort().join(',');
  return useQuery({
    queryKey: ['monster-hunt-levels', key],
    enabled: monsterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monster_levels')
        .select('monster_id, hunt_difficulty, monster_level, suggested_hunt_power')
        .eq('content', 'Hunt')
        .in('monster_id', monsterIds);
      if (error) return new Map<string, Map<number, HuntLevel>>();
      const map = new Map<string, Map<number, HuntLevel>>();
      for (const r of (data ?? []) as HuntLevel[]) {
        if (!r.hunt_difficulty) continue;
        if (!map.has(r.monster_id)) map.set(r.monster_id, new Map());
        map.get(r.monster_id)!.set(r.hunt_difficulty, r);
      }
      return map;
    },
    staleTime: 1000 * 60 * 10,
  });
}
