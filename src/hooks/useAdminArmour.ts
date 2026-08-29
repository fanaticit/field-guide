// ─────────────────────────────────────────────────────────────
// React Query hooks for Admin Armour Piece Management
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ArmourSlot, ArmourSkill } from '../data/schemas/armour';

export interface DBArmourPiece {
  id: string;
  game: string;
  monster_id: string;
  slot: ArmourSlot;
  skills: ArmourSkill[];
  driftsmelt_slots: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ARMOUR_PIECES_KEY = 'admin-armour-pieces';

// ── Query ─────────────────────────────────────────────────────

export function useAdminArmourPieces(game: string = 'mhn') {
  return useQuery({
    queryKey: [ARMOUR_PIECES_KEY, game],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('armour_pieces')
        .select('*')
        .eq('game', game);

      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        skills: (Array.isArray(row.skills) ? row.skills : []) as ArmourSkill[],
      })) as DBArmourPiece[];
    },
    staleTime: 1000 * 30,
  });
}

// ── Shared Cache Patcher ──────────────────────────────────────

function patchCachedPiece(
  qc: ReturnType<typeof useQueryClient>,
  game: string,
  monsterId: string,
  slot: ArmourSlot,
  skills: ArmourSkill[],
) {
  qc.setQueriesData(
    { queryKey: [ARMOUR_PIECES_KEY], exact: false },
    (old: unknown) => {
      if (!Array.isArray(old)) return old;
      const pieceId = `${game}:${monsterId}:${slot}`;
      const exists = (old as DBArmourPiece[]).some((p) => p.id === pieceId || (p.game === game && p.monster_id === monsterId && p.slot === slot));

      if (exists) {
        return (old as DBArmourPiece[]).map((p) =>
          (p.id === pieceId || (p.game === game && p.monster_id === monsterId && p.slot === slot))
            ? { ...p, skills }
            : p,
        );
      } else {
        const newPiece: DBArmourPiece = {
          id: pieceId,
          game,
          monster_id: monsterId,
          slot,
          skills,
          driftsmelt_slots: 0,
          is_active: true,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [...(old as DBArmourPiece[]), newPiece];
      }
    },
  );
}

// ── Mutations ─────────────────────────────────────────────────

export function useSaveArmourPieceSkills() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      slot,
      skills,
    }: {
      game: string;
      monsterId: string;
      slot: ArmourSlot;
      skills: ArmourSkill[];
    }) => {
      const id = `${game}:${monsterId}:${slot}`;
      const { data, error } = await supabase
        .from('armour_pieces')
        .upsert(
          {
            id,
            game,
            monster_id: monsterId,
            slot,
            skills,
          },
          { onConflict: 'game,monster_id,slot' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as DBArmourPiece;
    },

    onMutate: async ({ game, monsterId, slot, skills }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      const snapshot = qc.getQueriesData<DBArmourPiece[]>({
        queryKey: [ARMOUR_PIECES_KEY],
        exact: false,
      });

      patchCachedPiece(qc, game, monsterId, slot, skills);
      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] });
    },
  });
}

export function useAddSkillToPiece() {
  const savePiece = useSaveArmourPieceSkills();

  return {
    ...savePiece,
    mutate: ({
      game,
      monsterId,
      slot,
      currentSkills,
      skillId,
      level,
    }: {
      game: string;
      monsterId: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
      level: number;
    }) => {
      const existingIdx = currentSkills.findIndex((s) => s.id === skillId);
      let newSkills: ArmourSkill[];
      if (existingIdx >= 0) {
        newSkills = currentSkills.map((s, idx) =>
          idx === existingIdx ? { ...s, level } : s,
        );
      } else {
        newSkills = [...currentSkills, { id: skillId, level }];
      }

      return savePiece.mutate({ game, monsterId, slot, skills: newSkills });
    },
    mutateAsync: ({
      game,
      monsterId,
      slot,
      currentSkills,
      skillId,
      level,
    }: {
      game: string;
      monsterId: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
      level: number;
    }) => {
      const existingIdx = currentSkills.findIndex((s) => s.id === skillId);
      let newSkills: ArmourSkill[];
      if (existingIdx >= 0) {
        newSkills = currentSkills.map((s, idx) =>
          idx === existingIdx ? { ...s, level } : s,
        );
      } else {
        newSkills = [...currentSkills, { id: skillId, level }];
      }

      return savePiece.mutateAsync({ game, monsterId, slot, skills: newSkills });
    },
  };
}

export function useRemoveSkillFromPiece() {
  const savePiece = useSaveArmourPieceSkills();

  return {
    ...savePiece,
    mutate: ({
      game,
      monsterId,
      slot,
      currentSkills,
      skillId,
    }: {
      game: string;
      monsterId: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
    }) => {
      const newSkills = currentSkills.filter((s) => s.id !== skillId);
      return savePiece.mutate({ game, monsterId, slot, skills: newSkills });
    },
    mutateAsync: ({
      game,
      monsterId,
      slot,
      currentSkills,
      skillId,
    }: {
      game: string;
      monsterId: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
    }) => {
      const newSkills = currentSkills.filter((s) => s.id !== skillId);
      return savePiece.mutateAsync({ game, monsterId, slot, skills: newSkills });
    },
  };
}

export function useApplySkillToPieces() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      slots,
      skillId,
      level,
      currentPiecesMap,
    }: {
      game: string;
      monsterId: string;
      slots: ArmourSlot[];
      skillId: string;
      level: number;
      currentPiecesMap: Map<ArmourSlot, DBArmourPiece | undefined>;
    }) => {
      const upsertRows = slots.map((slot) => {
        const piece = currentPiecesMap.get(slot);
        const currentSkills = piece?.skills ?? [];
        const existingIdx = currentSkills.findIndex((s) => s.id === skillId);
        let nextSkills: ArmourSkill[];
        if (existingIdx >= 0) {
          nextSkills = currentSkills.map((s, i) => (i === existingIdx ? { ...s, level } : s));
        } else {
          nextSkills = [...currentSkills, { id: skillId, level }];
        }
        return {
          id: `${game}:${monsterId}:${slot}`,
          game,
          monster_id: monsterId,
          slot,
          skills: nextSkills,
        };
      });

      const { data, error } = await supabase
        .from('armour_pieces')
        .upsert(upsertRows, { onConflict: 'game,monster_id,slot' })
        .select();

      if (error) throw error;
      return data;
    },

    onMutate: async ({ game, monsterId, slots, skillId, level, currentPiecesMap }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      const snapshot = qc.getQueriesData<DBArmourPiece[]>({
        queryKey: [ARMOUR_PIECES_KEY],
        exact: false,
      });

      slots.forEach((slot) => {
        const piece = currentPiecesMap.get(slot);
        const currentSkills = piece?.skills ?? [];
        const existingIdx = currentSkills.findIndex((s) => s.id === skillId);
        let nextSkills: ArmourSkill[];
        if (existingIdx >= 0) {
          nextSkills = currentSkills.map((s, i) => (i === existingIdx ? { ...s, level } : s));
        } else {
          nextSkills = [...currentSkills, { id: skillId, level }];
        }
        patchCachedPiece(qc, game, monsterId, slot, nextSkills);
      });

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] });
    },
  });
}
