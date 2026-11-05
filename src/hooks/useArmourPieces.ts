// ─────────────────────────────────────────────────────────────
// React Query hooks for the armour_pieces table (one row per armour piece,
// imported from the game data — see scripts/import_mho_armour.py)
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/** Slot names exactly as they appear in the game data */
export const ARMOUR_SLOT_OPTIONS = ['Head', 'Chest', 'Arms', 'Waist', 'Legs'] as const;

export interface ArmourSetBonus {
  /** Number of pieces of the set needed to activate the bonus */
  pieces: number;
  /** Skills table id of the skill (and level) the bonus grants */
  skill_id: string;
}

export interface ArmourPiece {
  id: string;
  /** monsters.id, or the name of the monster that could not be matched */
  monster_id: string;
  slot: string;
  /** Skill ids — every skill level has its own id */
  skills: string[];
  set_name: string | null;
  set_variant: string;
  /** Rarity the piece starts at */
  rarity: number;
  /** Highest rarity the piece can be upgraded to */
  max_rarity: number | null;
  deco_slots: number[];
  set_bonus: ArmourSetBonus | null;
  icon_m: string | null;
  icon_f: string | null;
  set_icon: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** One rarity step of an armour piece (armour_piece_upgrades table) */
export interface ArmourPieceUpgrade {
  armour_piece_id: string;
  rarity: number;
  defence: number | null;
  defence_gain: number | null;
  required_level: number | null;
  growth_points: number | null;
  money: number | null;
  progression_level: number | null;
  materials: { item_id: number; item: string; count: number }[];
  other_gains: Record<string, unknown>;
  /** Skill ids the piece has at this rarity */
  skills: string[];
  skill_changes: { type: 'new_skill' | 'level_up'; skill_id: string }[];
}

export type ArmourPieceUpsert = Omit<ArmourPiece, 'created_at' | 'updated_at'>;

export const ARMOUR_PIECES_KEY = 'armour-pieces';

export function useArmourPieces() {
  return useQuery({
    queryKey: [ARMOUR_PIECES_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armour_pieces')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((p) => ({
        ...p,
        skills: (p.skills as string[]) ?? [],
        deco_slots: (p.deco_slots as number[]) ?? [],
        set_bonus: (p.set_bonus as ArmourSetBonus | null) ?? null,
        rarity: (p.rarity as number) ?? 1,
      })) as ArmourPiece[];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useArmourPieceUpgrades(armourPieceId: string | null) {
  return useQuery({
    queryKey: [ARMOUR_PIECES_KEY, 'upgrades', armourPieceId],
    enabled: !!armourPieceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armour_piece_upgrades')
        .select('*')
        .eq('armour_piece_id', armourPieceId!)
        .order('rarity', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ArmourPieceUpgrade[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

/** The slim columns of every upgrade step — enough to know which skills a piece has at each rarity */
export type ArmourUpgradeTier = Pick<
  ArmourPieceUpgrade,
  'armour_piece_id' | 'rarity' | 'defence' | 'skills' | 'skill_changes'
>;

/** All upgrade steps of all armour pieces (paged, because the API returns at most 1000 rows per request) */
export function useAllArmourUpgradeTiers() {
  return useQuery({
    queryKey: [ARMOUR_PIECES_KEY, 'all-tiers'],
    queryFn: async () => {
      const PAGE = 1000;
      const rows: ArmourUpgradeTier[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('armour_piece_upgrades')
          .select('armour_piece_id, rarity, defence, skills, skill_changes')
          .order('armour_piece_id', { ascending: true })
          .order('rarity', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as ArmourUpgradeTier[]));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

/** Upgrade steps of several armour pieces at once (e.g. all pieces of a set) */
export function useArmourSetUpgrades(armourPieceIds: string[]) {
  const key = [...armourPieceIds].sort().join(',');
  return useQuery({
    queryKey: [ARMOUR_PIECES_KEY, 'set-upgrades', key],
    enabled: armourPieceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armour_piece_upgrades')
        .select('*')
        .in('armour_piece_id', armourPieceIds)
        .order('rarity', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ArmourPieceUpgrade[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

export function useUpsertArmourPiece() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (piece: ArmourPieceUpsert) => {
      const { error } = await supabase.from('armour_pieces').upsert(piece, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] }),
  });
}

/** Sets the same set bonus on every piece of one set (set name + variant). */
export function useApplySetBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      setName,
      setVariant,
      setBonus,
    }: {
      setName: string;
      setVariant: string;
      setBonus: ArmourSetBonus | null;
    }) => {
      const { error } = await supabase
        .from('armour_pieces')
        .update({ set_bonus: setBonus })
        .eq('set_name', setName)
        .eq('set_variant', setVariant);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] }),
  });
}

export function useDeleteArmourPieceById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('armour_pieces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] }),
  });
}
