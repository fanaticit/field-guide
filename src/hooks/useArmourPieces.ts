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
  rarity: number;
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
