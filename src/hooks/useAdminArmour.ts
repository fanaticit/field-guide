// ─────────────────────────────────────────────────────────────
// React Query hooks for Admin Armour Piece Management
// Supports multiple armour set variants per monster (e.g. Set I, Set VII, Alpha, Beta),
// custom set display names, and piece images.
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { type ArmourSlot, type ArmourSkill, sortArmourSkills } from '../data/schemas/armour';

export interface DBArmourPiece {
  id: string;
  game: string;
  monster_id: string;
  set_variant: string; // e.g. 'I', 'VII', 'alpha', 'beta'. Defaults to 'I'
  set_name: string | null; // e.g. 'Set I', 'Set VII', 'Rathalos Alpha+', 'High Rank Set'
  slot: ArmourSlot;
  image: string | null; // piece-specific image/icon
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
        .eq('game', game)
        .order('monster_id', { ascending: true })
        .order('slot', { ascending: true });

      if (error) throw error;
      const pieces = (data as DBArmourPiece[]) ?? [];
      return pieces.map((p) => ({
        ...p,
        skills: sortArmourSkills(p.skills ?? []),
      }));
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ── Shared optimistic patcher ────────────────────────────────

function patchCachedPiece(
  qc: ReturnType<typeof useQueryClient>,
  game: string,
  monsterId: string,
  setVariant: string = 'I',
  slot: ArmourSlot,
  skills: ArmourSkill[],
  setName?: string | null,
  image?: string | null,
) {
  const pieceId = `${game}:${monsterId}:${setVariant}:${slot}`;
  const sortedSkills = sortArmourSkills(skills);

  qc.setQueriesData(
    { queryKey: [ARMOUR_PIECES_KEY], exact: false },
    (old: unknown) => {
      if (!Array.isArray(old)) return old;
      const exists = (old as DBArmourPiece[]).some(
        (p) =>
          p.id === pieceId ||
          (p.game === game &&
            p.monster_id === monsterId &&
            (p.set_variant || 'I') === setVariant &&
            p.slot === slot),
      );

      if (exists) {
        return (old as DBArmourPiece[]).map((p) =>
          p.id === pieceId ||
          (p.game === game &&
            p.monster_id === monsterId &&
            (p.set_variant || 'I') === setVariant &&
            p.slot === slot)
            ? {
                ...p,
                skills: sortedSkills,
                set_name: setName !== undefined ? setName : p.set_name,
                image: image !== undefined ? image : p.image,
              }
            : p,
        );
      } else {
        const newPiece: DBArmourPiece = {
          id: pieceId,
          game,
          monster_id: monsterId,
          set_variant: setVariant,
          set_name: setName ?? null,
          slot,
          image: image ?? null,
          skills: sortedSkills,
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
      setVariant = 'I',
      setName,
      image,
      slot,
      skills,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      setName?: string | null;
      image?: string | null;
      slot: ArmourSlot;
      skills: ArmourSkill[];
    }) => {
      const id = `${game}:${monsterId}:${setVariant}:${slot}`;
      const sortedSkills = sortArmourSkills(skills);
      const payload: Record<string, unknown> = {
        id,
        game,
        monster_id: monsterId,
        set_variant: setVariant,
        slot,
        skills: sortedSkills,
      };
      if (setName !== undefined) payload.set_name = setName;
      if (image !== undefined) payload.image = image;

      const { data, error } = await supabase
        .from('armour_pieces')
        .upsert(payload, { onConflict: 'game,monster_id,set_variant,slot' })
        .select()
        .single();

      if (error) throw error;
      return data as DBArmourPiece;
    },

    onMutate: async ({ game, monsterId, setVariant = 'I', setName, image, slot, skills }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      const snapshot = qc.getQueriesData<DBArmourPiece[]>({
        queryKey: [ARMOUR_PIECES_KEY],
        exact: false,
      });

      patchCachedPiece(qc, game, monsterId, setVariant, slot, skills, setName, image);
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

export function useUpdateArmourPieceImage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      setVariant = 'I',
      slot,
      image,
      currentSkills = [],
      setName,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slot: ArmourSlot;
      image: string | null;
      currentSkills?: ArmourSkill[];
      setName?: string | null;
    }) => {
      const id = `${game}:${monsterId}:${setVariant}:${slot}`;
      const payload: Record<string, unknown> = {
        id,
        game,
        monster_id: monsterId,
        set_variant: setVariant,
        slot,
        image,
        skills: currentSkills,
      };
      if (setName !== undefined) payload.set_name = setName;

      const { data, error } = await supabase
        .from('armour_pieces')
        .upsert(payload, { onConflict: 'game,monster_id,set_variant,slot' })
        .select()
        .single();

      if (error) throw error;
      return data as DBArmourPiece;
    },

    onMutate: async ({ game, monsterId, setVariant = 'I', slot, image, currentSkills = [], setName }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      patchCachedPiece(qc, game, monsterId, setVariant, slot, currentSkills, setName, image);
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
      setVariant = 'I',
      slot,
      currentSkills,
      skillId,
      level,
      unlockRarity,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
      level: number;
      unlockRarity?: number | null;
    }) => {
      const cleanUR = unlockRarity && unlockRarity > 1 ? Number(unlockRarity) : null;
      const existingIdx = currentSkills.findIndex(
        (s) =>
          s.id === skillId &&
          (s.unlock_rarity !== undefined && s.unlock_rarity !== null
            ? Number(s.unlock_rarity)
            : s.unlockRarity !== undefined && s.unlockRarity !== null
              ? Number(s.unlockRarity)
              : null) === cleanUR,
      );
      let newSkills: ArmourSkill[];
      if (existingIdx >= 0) {
        newSkills = currentSkills.map((s, idx) =>
          idx === existingIdx
            ? { ...s, level, unlock_rarity: cleanUR, unlockRarity: cleanUR }
            : s,
        );
      } else {
        newSkills = [
          ...currentSkills,
          { id: skillId, level, unlock_rarity: cleanUR, unlockRarity: cleanUR },
        ];
      }

      return savePiece.mutate({ game, monsterId, setVariant, slot, skills: newSkills });
    },
    mutateAsync: ({
      game,
      monsterId,
      setVariant = 'I',
      slot,
      currentSkills,
      skillId,
      level,
      unlockRarity,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
      level: number;
      unlockRarity?: number | null;
    }) => {
      const cleanUR = unlockRarity && unlockRarity > 1 ? Number(unlockRarity) : null;
      const existingIdx = currentSkills.findIndex(
        (s) =>
          s.id === skillId &&
          (s.unlock_rarity !== undefined && s.unlock_rarity !== null
            ? Number(s.unlock_rarity)
            : s.unlockRarity !== undefined && s.unlockRarity !== null
              ? Number(s.unlockRarity)
              : null) === cleanUR,
      );
      let newSkills: ArmourSkill[];
      if (existingIdx >= 0) {
        newSkills = currentSkills.map((s, idx) =>
          idx === existingIdx
            ? { ...s, level, unlock_rarity: cleanUR, unlockRarity: cleanUR }
            : s,
        );
      } else {
        newSkills = [
          ...currentSkills,
          { id: skillId, level, unlock_rarity: cleanUR, unlockRarity: cleanUR },
        ];
      }

      return savePiece.mutateAsync({ game, monsterId, setVariant, slot, skills: newSkills });
    },
  };
}

export function useUpdateSkillUnlockRarity() {
  const savePiece = useSaveArmourPieceSkills();

  return {
    ...savePiece,
    mutate: ({
      game,
      monsterId,
      setVariant = 'I',
      slot,
      currentSkills,
      skillId,
      unlockRarity,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
      unlockRarity: number | null;
    }) => {
      const cleanUR = unlockRarity && unlockRarity > 1 ? Number(unlockRarity) : null;
      const newSkills = currentSkills.map((s) =>
        s.id === skillId ? { ...s, unlock_rarity: cleanUR, unlockRarity: cleanUR } : s,
      );
      return savePiece.mutate({ game, monsterId, setVariant, slot, skills: newSkills });
    },
    mutateAsync: ({
      game,
      monsterId,
      setVariant = 'I',
      slot,
      currentSkills,
      skillId,
      unlockRarity,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
      unlockRarity: number | null;
    }) => {
      const cleanUR = unlockRarity && unlockRarity > 1 ? Number(unlockRarity) : null;
      const newSkills = currentSkills.map((s) =>
        s.id === skillId ? { ...s, unlock_rarity: cleanUR, unlockRarity: cleanUR } : s,
      );
      return savePiece.mutateAsync({ game, monsterId, setVariant, slot, skills: newSkills });
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
      setVariant = 'I',
      slot,
      currentSkills,
      skillId,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
    }) => {
      const newSkills = currentSkills.filter((s) => s.id !== skillId);
      return savePiece.mutate({ game, monsterId, setVariant, slot, skills: newSkills });
    },
    mutateAsync: ({
      game,
      monsterId,
      setVariant = 'I',
      slot,
      currentSkills,
      skillId,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slot: ArmourSlot;
      currentSkills: ArmourSkill[];
      skillId: string;
    }) => {
      const newSkills = currentSkills.filter((s) => s.id !== skillId);
      return savePiece.mutateAsync({ game, monsterId, setVariant, slot, skills: newSkills });
    },
  };
}

export function useApplySkillToPieces() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      setVariant = 'I',
      slots,
      skillId,
      level,
      unlockRarity,
      currentPiecesMap,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      slots: ArmourSlot[];
      skillId: string;
      level: number;
      unlockRarity?: number | null;
      currentPiecesMap: Map<ArmourSlot, DBArmourPiece | undefined>;
    }) => {
      const cleanUR = unlockRarity && unlockRarity > 1 ? Number(unlockRarity) : null;
      const upsertRows = slots.map((slot) => {
        const piece = currentPiecesMap.get(slot);
        const currentSkills = piece?.skills ?? [];
        const existingIdx = currentSkills.findIndex(
          (s) =>
            s.id === skillId &&
            (s.unlock_rarity !== undefined && s.unlock_rarity !== null
              ? Number(s.unlock_rarity)
              : s.unlockRarity !== undefined && s.unlockRarity !== null
                ? Number(s.unlockRarity)
                : null) === cleanUR,
        );
        let nextSkills: ArmourSkill[];
        if (existingIdx >= 0) {
          nextSkills = currentSkills.map((s, i) =>
            i === existingIdx ? { ...s, level, unlock_rarity: cleanUR, unlockRarity: cleanUR } : s,
          );
        } else {
          nextSkills = [
            ...currentSkills,
            { id: skillId, level, unlock_rarity: cleanUR, unlockRarity: cleanUR },
          ];
        }
        return {
          id: `${game}:${monsterId}:${setVariant}:${slot}`,
          game,
          monster_id: monsterId,
          set_variant: setVariant,
          set_name: piece?.set_name ?? null,
          image: piece?.image ?? null,
          slot,
          skills: nextSkills,
        };
      });

      const { data, error } = await supabase
        .from('armour_pieces')
        .upsert(upsertRows, { onConflict: 'game,monster_id,set_variant,slot' })
        .select();

      if (error) throw error;
      return data;
    },

    onMutate: async ({ game, monsterId, setVariant = 'I', slots, skillId, level, unlockRarity, currentPiecesMap }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      const snapshot = qc.getQueriesData<DBArmourPiece[]>({
        queryKey: [ARMOUR_PIECES_KEY],
        exact: false,
      });

      const cleanUR = unlockRarity && unlockRarity > 1 ? Number(unlockRarity) : null;
      slots.forEach((slot) => {
        const piece = currentPiecesMap.get(slot);
        const currentSkills = piece?.skills ?? [];
        const existingIdx = currentSkills.findIndex(
          (s) =>
            s.id === skillId &&
            (s.unlock_rarity !== undefined && s.unlock_rarity !== null
              ? Number(s.unlock_rarity)
              : s.unlockRarity !== undefined && s.unlockRarity !== null
                ? Number(s.unlockRarity)
                : null) === cleanUR,
        );
        let nextSkills: ArmourSkill[];
        if (existingIdx >= 0) {
          nextSkills = currentSkills.map((s, i) =>
            i === existingIdx ? { ...s, level, unlock_rarity: cleanUR, unlockRarity: cleanUR } : s,
          );
        } else {
          nextSkills = [
            ...currentSkills,
            { id: skillId, level, unlock_rarity: cleanUR, unlockRarity: cleanUR },
          ];
        }
        patchCachedPiece(qc, game, monsterId, setVariant, slot, nextSkills, piece?.set_name, piece?.image);
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

export function useRenameArmourSet() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      setVariant,
      newSetName,
    }: {
      game: string;
      monsterId: string;
      setVariant: string;
      newSetName: string;
    }) => {
      const { error } = await supabase
        .from('armour_pieces')
        .update({ set_name: newSetName.trim() || null })
        .eq('game', game)
        .eq('monster_id', monsterId)
        .eq('set_variant', setVariant);

      if (error) throw error;
    },
    onMutate: async ({ game, monsterId, setVariant, newSetName }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      qc.setQueriesData(
        { queryKey: [ARMOUR_PIECES_KEY], exact: false },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as DBArmourPiece[]).map((p) =>
            p.game === game && p.monster_id === monsterId && (p.set_variant || 'I') === setVariant
              ? { ...p, set_name: newSetName.trim() || null }
              : p,
          );
        },
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] });
    },
  });
}

export function useDeleteArmourSet() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      setVariant,
    }: {
      game: string;
      monsterId: string;
      setVariant: string;
    }) => {
      const { error } = await supabase
        .from('armour_pieces')
        .delete()
        .eq('game', game)
        .eq('monster_id', monsterId)
        .eq('set_variant', setVariant);

      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] });
    },
  });
}

export function useDeleteEntireArmourSource() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
    }: {
      game: string;
      monsterId: string;
    }) => {
      const { error } = await supabase
        .from('armour_pieces')
        .delete()
        .eq('game', game)
        .eq('monster_id', monsterId);

      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] });
    },
  });
}
