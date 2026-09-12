// ─────────────────────────────────────────────────────────────
// useHunterChallenges — React Query hooks for the personal
// Hunter's Challenge tracker.
//
// Supports both Armour Piece & Weapon challenges. Status evolves in-place:
//   crafting → upgrading → completed / abandoned
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────

export type ChallengeStatus = 'crafting' | 'upgrading' | 'completed' | 'abandoned';
export type ChallengeType   = 'armour_piece' | 'weapon' | 'visage_set' | 'full_build';

export interface HunterChallenge {
  id:               string;
  user_id:          string;
  challenge_type:   ChallengeType;
  game:             string;

  // Armour-specific (denormalised for quick reads)
  armour_piece_id:  string | null;
  monster_id:       string | null;
  armour_slot:      string | null;
  set_variant:      string | null;
  set_name:         string | null;
  piece_image:      string | null;
  set_icon:         string | null;
  monster_name:     string | null;

  // Weapon-specific
  weapon_id:        string | null;
  weapon_type_id:   string | null;
  element_type:     string | null;
  special_skill:    string | null;

  // Rarity progression (supports up to max 16)
  craft_rarity:     number;
  current_rarity:   number;
  max_rarity:       number;

  // Status
  status:           ChallengeStatus;
  completed_at:     string | null;

  // Meta
  sort_order:       number;
  notes:            string | null;
  created_at:       string;
  updated_at:       string;
}

export interface AddArmourChallengePayload {
  userId:          string;
  game:            string;
  armourPieceId:   string;
  monsterId:       string | null;
  armourSlot:      string;
  setVariant:      string;
  setName:         string | null;
  pieceImage:      string | null;
  setIcon:         string | null;
  monsterName:     string | null;
  craftRarity:     number;  // default 1
  maxRarity?:      number;  // default 16
}

export interface AddWeaponChallengePayload {
  userId:          string;
  game:            string;
  weaponId:        string;
  weaponName:      string;
  weaponTypeId:    string;
  monsterId:       string | null;
  monsterName:     string | null;
  elementType?:    string | null;
  specialSkill?:   string | null;
  pieceImage:      string | null;
  setIcon:         string | null;
  craftRarity?:    number;  // default 1
  maxRarity?:      number;  // default 16
}

export interface UpdateChallengeStatusPayload {
  challengeId:    string;
  status:         ChallengeStatus;
  currentRarity?: number;
  craftRarity?:   number;
  maxRarity?:     number;
  completedAt?:   string | null;
}

// ── Query Key ────────────────────────────────────────────────

export const HUNTER_CHALLENGES_KEY = 'hunter-challenges';

// ── useHunterChallenges ───────────────────────────────────────

export function useHunterChallenges(userId: string | null | undefined) {
  return useQuery({
    queryKey: [HUNTER_CHALLENGES_KEY, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hunter_challenges')
        .select('*')
        .eq('user_id', userId!)
        .order('status', { ascending: true })       // crafting first
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as HunterChallenge[];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}

// ── useAddArmourChallenge ─────────────────────────────────────

export function useAddArmourChallenge() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddArmourChallengePayload) => {
      // First check if an active challenge already exists for this piece
      const { data: existing } = await supabase
        .from('hunter_challenges')
        .select('id, status, created_at')
        .eq('user_id', payload.userId)
        .eq('armour_piece_id', payload.armourPieceId)
        .in('status', ['crafting', 'upgrading'])
        .maybeSingle();

      if (existing) {
        return { challenge: existing as unknown as HunterChallenge, wasAlreadyTracked: true };
      }

      const row = {
        user_id:         payload.userId,
        challenge_type:  'armour_piece' as const,
        game:            payload.game,
        armour_piece_id: payload.armourPieceId,
        monster_id:      payload.monsterId,
        armour_slot:     payload.armourSlot,
        set_variant:     payload.setVariant,
        set_name:        payload.setName,
        piece_image:     payload.pieceImage,
        set_icon:        payload.setIcon,
        monster_name:    payload.monsterName,
        craft_rarity:    payload.craftRarity ?? 1,
        current_rarity:  0,
        max_rarity:      payload.maxRarity ?? 16,
        status:          'crafting' as const,
      };

      const { data, error } = await supabase
        .from('hunter_challenges')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return { challenge: data as HunterChallenge, wasAlreadyTracked: false };
    },

    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [HUNTER_CHALLENGES_KEY, variables.userId] });
    },
  });
}

// ── useAddWeaponChallenge ─────────────────────────────────────

export function useAddWeaponChallenge() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddWeaponChallengePayload) => {
      // First check if an active challenge already exists for this weapon
      const { data: existing } = await supabase
        .from('hunter_challenges')
        .select('id, status, created_at')
        .eq('user_id', payload.userId)
        .eq('weapon_id', payload.weaponId)
        .in('status', ['crafting', 'upgrading'])
        .maybeSingle();

      if (existing) {
        return { challenge: existing as unknown as HunterChallenge, wasAlreadyTracked: true };
      }

      const row = {
        user_id:         payload.userId,
        challenge_type:  'weapon' as const,
        game:            payload.game,
        weapon_id:       payload.weaponId,
        weapon_type_id:  payload.weaponTypeId,
        monster_id:      payload.monsterId,
        set_name:        payload.weaponName,
        piece_image:     payload.pieceImage,
        set_icon:        payload.setIcon,
        monster_name:    payload.monsterName,
        element_type:    payload.elementType ?? null,
        special_skill:   payload.specialSkill ?? null,
        craft_rarity:    payload.craftRarity ?? 1,
        current_rarity:  0,
        max_rarity:      payload.maxRarity ?? 16,
        status:          'crafting' as const,
      };

      const { data, error } = await supabase
        .from('hunter_challenges')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return { challenge: data as HunterChallenge, wasAlreadyTracked: false };
    },

    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [HUNTER_CHALLENGES_KEY, variables.userId] });
    },
  });
}

// ── useIncrementChallenge ─────────────────────────────────────
// Increments rarity: from 0 (crafting) -> craft_rarity (or 1), then +1 until max_rarity.

export function useIncrementChallenge() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (challenge: HunterChallenge) => {
      const cur = challenge.current_rarity ?? 0;
      const craft = challenge.craft_rarity || 1;
      const newRarity = cur === 0 ? craft : cur + 1;
      const maxR = challenge.max_rarity || 16;
      const isComplete = newRarity >= maxR;
      const newStatus: ChallengeStatus = isComplete ? 'completed' : 'upgrading';

      const updates: Record<string, unknown> = {
        current_rarity: newRarity,
        status:         newStatus,
      };
      if (isComplete) updates.completed_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('hunter_challenges')
        .update(updates)
        .eq('id', challenge.id)
        .select()
        .single();

      if (error) throw error;
      return data as HunterChallenge;
    },

    onMutate: async (challenge) => {
      await qc.cancelQueries({ queryKey: [HUNTER_CHALLENGES_KEY] });
      const cur = challenge.current_rarity ?? 0;
      const craft = challenge.craft_rarity || 1;
      const newRarity = cur === 0 ? craft : cur + 1;
      const maxR = challenge.max_rarity || 16;
      const isComplete = newRarity >= maxR;

      qc.setQueriesData(
        { queryKey: [HUNTER_CHALLENGES_KEY], exact: false },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as HunterChallenge[]).map((c) =>
            c.id === challenge.id
              ? {
                  ...c,
                  current_rarity: newRarity,
                  status:         isComplete ? 'completed' : 'upgrading',
                  completed_at:   isComplete ? new Date().toISOString() : c.completed_at,
                }
              : c,
          );
        },
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [HUNTER_CHALLENGES_KEY] });
    },
  });
}

// ── useUpdateChallengeStatus ──────────────────────────────────

export function useUpdateChallengeStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      status,
      currentRarity,
      craftRarity,
      maxRarity,
      completedAt,
    }: UpdateChallengeStatusPayload) => {
      const updates: Record<string, unknown> = { status };
      if (currentRarity !== undefined) updates.current_rarity = currentRarity;
      if (craftRarity !== undefined)   updates.craft_rarity   = craftRarity;
      if (maxRarity !== undefined)     updates.max_rarity     = maxRarity;
      if (completedAt !== undefined)   updates.completed_at   = completedAt;

      const { data, error } = await supabase
        .from('hunter_challenges')
        .update(updates)
        .eq('id', challengeId)
        .select()
        .single();

      if (error) throw error;
      return data as HunterChallenge;
    },

    onMutate: async ({ challengeId, status, currentRarity, craftRarity, maxRarity, completedAt }) => {
      await qc.cancelQueries({ queryKey: [HUNTER_CHALLENGES_KEY] });

      qc.setQueriesData(
        { queryKey: [HUNTER_CHALLENGES_KEY], exact: false },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as HunterChallenge[]).map((c) =>
            c.id === challengeId
              ? {
                  ...c,
                  status,
                  current_rarity: currentRarity !== undefined ? currentRarity : c.current_rarity,
                  craft_rarity:   craftRarity   !== undefined ? craftRarity   : c.craft_rarity,
                  max_rarity:     maxRarity     !== undefined ? maxRarity     : c.max_rarity,
                  completed_at:   completedAt   !== undefined ? completedAt   : c.completed_at,
                }
              : c,
          );
        },
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [HUNTER_CHALLENGES_KEY] });
    },
  });
}

// ── useDeleteChallenge ────────────────────────────────────────

export function useDeleteChallenge() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from('hunter_challenges')
        .delete()
        .eq('id', challengeId);

      if (error) throw error;
    },

    onMutate: async (challengeId) => {
      await qc.cancelQueries({ queryKey: [HUNTER_CHALLENGES_KEY] });
      qc.setQueriesData(
        { queryKey: [HUNTER_CHALLENGES_KEY], exact: false },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as HunterChallenge[]).filter((c) => c.id !== challengeId);
        },
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [HUNTER_CHALLENGES_KEY] });
    },
  });
}

// ── Derived helpers ───────────────────────────────────────────

/** True if this armour piece is currently active in hunter's challenges */
export function isArmourPieceTracked(
  challenges: HunterChallenge[],
  armourPieceId: string,
): boolean {
  return challenges.some(
    (c) =>
      c.armour_piece_id === armourPieceId &&
      c.status !== 'abandoned',
  );
}

/** Get the challenge for an armour piece, if one exists */
export function getArmourPieceChallenge(
  challenges: HunterChallenge[],
  armourPieceId: string,
): HunterChallenge | undefined {
  return challenges.find((c) => c.armour_piece_id === armourPieceId && c.status !== 'abandoned');
}

/** True if this weapon is currently active in hunter's challenges */
export function isWeaponTracked(
  challenges: HunterChallenge[],
  weaponId: string,
): boolean {
  return challenges.some(
    (c) =>
      c.weapon_id === weaponId &&
      c.status !== 'abandoned',
  );
}

/** Get the challenge for a weapon, if one exists */
export function getWeaponChallenge(
  challenges: HunterChallenge[],
  weaponId: string,
): HunterChallenge | undefined {
  return challenges.find((c) => c.weapon_id === weaponId && c.status !== 'abandoned');
}

/** Group active challenges by monster_id / monsterName for the Hunting Targets panel */
export function groupChallengesByMonster(
  challenges: HunterChallenge[],
): Map<string, { monsterName: string; setIcon: string | null; challenges: HunterChallenge[] }> {
  const map = new Map<string, { monsterName: string; setIcon: string | null; challenges: HunterChallenge[] }>();

  for (const c of challenges) {
    if (c.status === 'completed' || c.status === 'abandoned') continue;
    const key = c.monster_id ?? (c.monster_name || '__general__');
    if (!map.has(key)) {
      map.set(key, {
        monsterName: c.monster_name ?? (c.monster_id ? c.monster_id.replace(/_/g, ' ') : 'General / Material'),
        setIcon:     c.set_icon ?? null,
        challenges:  [],
      });
    }
    map.get(key)!.challenges.push(c);
  }

  return map;
}

/** Human-readable status label */
export function challengeStatusLabel(c: HunterChallenge): string {
  if (c.status === 'crafting')  return 'Craft';
  if (c.status === 'upgrading') return `Upgrade R${c.current_rarity} → R${c.max_rarity}`;
  if (c.status === 'completed') return 'Completed';
  return 'Abandoned';
}

/** Next rarity to unlock after current_rarity, given a list of unlock tiers */
export function nextUnlockRarity(
  currentRarity: number,
  distinctUnlockRarities: number[],
  maxRarity: number = 16,
): number | null {
  const sorted = [...new Set([...distinctUnlockRarities, maxRarity])].sort((a, b) => a - b);
  const next   = sorted.find((r) => r > currentRarity);
  return next ?? null;
}
