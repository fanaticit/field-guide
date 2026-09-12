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
  set_icon?: string | null; // set/material build icon/image URL
  rarity?: number; // Starting equipment rarity / grade of the set/piece (e.g. 1 to 12)
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
        rarity: p.rarity ?? 1,
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
  setIcon?: string | null,
  rarity?: number,
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
                set_icon: setIcon !== undefined ? setIcon : p.set_icon,
                rarity: rarity !== undefined ? rarity : (p.rarity ?? 1),
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
          set_icon: setIcon ?? null,
          rarity: rarity ?? 1,
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
      setIcon,
      rarity,
      image,
      slot,
      skills,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      setName?: string | null;
      setIcon?: string | null;
      rarity?: number;
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
      if (setIcon !== undefined) payload.set_icon = setIcon;
      if (rarity !== undefined) payload.rarity = rarity;
      if (image !== undefined) payload.image = image;

      const { data, error } = await supabase
        .from('armour_pieces')
        .upsert(payload, { onConflict: 'game,monster_id,set_variant,slot' })
        .select()
        .single();

      if (error) throw error;
      return data as DBArmourPiece;
    },

    onMutate: async ({ game, monsterId, setVariant = 'I', setName, setIcon, rarity, image, slot, skills }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      const snapshot = qc.getQueriesData<DBArmourPiece[]>({
        queryKey: [ARMOUR_PIECES_KEY],
        exact: false,
      });

      patchCachedPiece(qc, game, monsterId, setVariant, slot, skills, setName, image, setIcon, rarity);
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
              : null) === cleanUR &&
          s.level === level,
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
              : null) === cleanUR &&
          s.level === level,
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

export function useDeleteArmourPiece() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      game,
      monsterId,
      setVariant,
      slot,
    }: {
      id?: string;
      game?: string;
      monsterId?: string;
      setVariant?: string;
      slot?: ArmourSlot;
    }) => {
      // 1. Clear any foreign key references in mho_builds so deletion doesn't fail with FK restrict
      if (id) {
        await Promise.allSettled([
          supabase.from('mho_builds').update({ helm_piece_id: null }).eq('helm_piece_id', id),
          supabase.from('mho_builds').update({ chest_piece_id: null }).eq('chest_piece_id', id),
          supabase.from('mho_builds').update({ gloves_piece_id: null }).eq('gloves_piece_id', id),
          supabase.from('mho_builds').update({ waist_piece_id: null }).eq('waist_piece_id', id),
          supabase.from('mho_builds').update({ greaves_piece_id: null }).eq('greaves_piece_id', id),
        ]);
      }

      // 2. Perform deletion - match by ID AND by (game, monster_id, set_variant, slot)
      let deletedCount = 0;
      if (id) {
        const { error, count } = await supabase
          .from('armour_pieces')
          .delete({ count: 'exact' })
          .eq('id', id);
        if (error) throw error;
        deletedCount = count ?? 0;
      }

      if (deletedCount === 0 && game && monsterId && slot) {
        const { error } = await supabase
          .from('armour_pieces')
          .delete()
          .eq('game', game)
          .eq('monster_id', monsterId)
          .eq('set_variant', setVariant || 'I')
          .eq('slot', slot);
        if (error) throw error;
      }
    },
    onMutate: async ({ id, game, monsterId, setVariant, slot }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      const prevData = game ? qc.getQueryData([ARMOUR_PIECES_KEY, game]) : undefined;

      qc.setQueriesData(
        { queryKey: [ARMOUR_PIECES_KEY], exact: false },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as DBArmourPiece[]).filter((p) => {
            if (id && p.id === id) return false;
            if (
              game &&
              monsterId &&
              slot &&
              p.game === game &&
              p.monster_id === monsterId &&
              (p.set_variant || 'I') === (setVariant || 'I') &&
              p.slot === slot
            ) {
              return false;
            }
            return true;
          });
        },
      );

      return { prevData };
    },
    onError: (_err, { game }, context) => {
      if (context?.prevData && game) {
        qc.setQueryData([ARMOUR_PIECES_KEY, game], context.prevData);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.game) {
        qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY, variables.game] });
      }
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

export function useUpdateArmourSetIcon() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      setIcon,
    }: {
      game: string;
      monsterId: string;
      setIcon: string | null;
    }) => {
      const { data, error } = await supabase
        .from('armour_pieces')
        .update({ set_icon: setIcon, updated_at: new Date().toISOString() })
        .eq('game', game)
        .eq('monster_id', monsterId)
        .select();

      if (error) throw error;
      return data;
    },

    onMutate: async ({ game, monsterId, setIcon }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      qc.setQueriesData(
        { queryKey: [ARMOUR_PIECES_KEY], exact: false },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as DBArmourPiece[]).map((p) =>
            p.game === game && p.monster_id === monsterId
              ? { ...p, set_icon: setIcon }
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

export function useUpdateArmourSetRarity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      game,
      monsterId,
      setVariant,
      rarity,
    }: {
      game: string;
      monsterId: string;
      setVariant?: string;
      rarity: number;
    }) => {
      let q = supabase
        .from('armour_pieces')
        .update({ rarity, updated_at: new Date().toISOString() })
        .eq('game', game)
        .eq('monster_id', monsterId);

      if (setVariant) {
        q = q.eq('set_variant', setVariant);
      }

      const { data, error } = await q.select();
      if (error) throw error;
      return data;
    },

    onMutate: async ({ game, monsterId, setVariant, rarity }) => {
      await qc.cancelQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      qc.setQueriesData(
        { queryKey: [ARMOUR_PIECES_KEY], exact: false },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as DBArmourPiece[]).map((p) =>
            p.game === game &&
            p.monster_id === monsterId &&
            (!setVariant || (p.set_variant || 'I') === setVariant)
              ? { ...p, rarity }
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

// ── Reassign single piece to another monster/variant ─────────
export function useReassignArmourPiece() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      game,
      currentPiece,
      targetMonsterId,
      targetSetVariant,
      targetSetName,
    }: {
      game: string;
      currentPiece: DBArmourPiece;
      targetMonsterId: string;
      targetSetVariant: string;
      targetSetName?: string | null;
    }) => {
      const newPieceId = `${game}:${targetMonsterId}:${targetSetVariant}:${currentPiece.slot}`;
      const payload: Partial<DBArmourPiece> = {
        id: newPieceId,
        game,
        monster_id: targetMonsterId,
        set_variant: targetSetVariant,
        set_name: targetSetName !== undefined ? targetSetName : currentPiece.set_name,
        set_icon: currentPiece.set_icon,
        rarity: currentPiece.rarity ?? 1,
        slot: currentPiece.slot,
        image: currentPiece.image,
        skills: currentPiece.skills,
        driftsmelt_slots: currentPiece.driftsmelt_slots,
        is_active: currentPiece.is_active,
        notes: currentPiece.notes,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('armour_pieces')
        .upsert(payload);

      if (upsertError) throw upsertError;

      if (currentPiece.id !== newPieceId) {
        const { error: delError } = await supabase
          .from('armour_pieces')
          .delete()
          .eq('id', currentPiece.id);

        if (delError) {
          console.warn('Failed to delete old piece record after move:', delError);
        }
      }

      return { newPieceId, oldPieceId: currentPiece.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      qc.invalidateQueries({ queryKey: ['user_armour_pieces'] });
    },
  });
}

// ── Reassign entire set to another monster/variant ────────────
export function useReassignArmourSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      game,
      sourceMonsterId,
      sourceSetVariant,
      targetMonsterId,
      targetSetVariant,
      targetSetName,
    }: {
      game: string;
      sourceMonsterId: string;
      sourceSetVariant: string;
      targetMonsterId: string;
      targetSetVariant: string;
      targetSetName?: string | null;
    }) => {
      const { data: pieces, error: fetchErr } = await supabase
        .from('armour_pieces')
        .select('*')
        .eq('game', game)
        .eq('monster_id', sourceMonsterId)
        .eq('set_variant', sourceSetVariant);

      if (fetchErr) throw fetchErr;
      if (!pieces || pieces.length === 0) return;

      for (const piece of pieces) {
        const newPieceId = `${game}:${targetMonsterId}:${targetSetVariant}:${piece.slot}`;
        const payload = {
          ...piece,
          id: newPieceId,
          monster_id: targetMonsterId,
          set_variant: targetSetVariant,
          set_name: targetSetName !== undefined ? targetSetName : piece.set_name,
          updated_at: new Date().toISOString(),
        };

        const { error: upErr } = await supabase.from('armour_pieces').upsert(payload);
        if (upErr) throw upErr;

        if (piece.id !== newPieceId) {
          await supabase.from('armour_pieces').delete().eq('id', piece.id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ARMOUR_PIECES_KEY] });
      qc.invalidateQueries({ queryKey: ['user_armour_pieces'] });
    },
  });
}


