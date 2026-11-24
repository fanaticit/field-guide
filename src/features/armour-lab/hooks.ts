// ─────────────────────────────────────────────────────────────
// Armour Lab — actions that talk to the rest of the site:
// sending a build to the Build Planner, importing one from it,
// and tracking a piece in Hunter's Challenges.
// ─────────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useBuildPlannerStore, type Adventurer } from '../../store/buildPlannerStore';
import { useArmourPieces } from '../../hooks/useArmourPieces';
import { useAddArmourChallenge, useHunterChallenges, getArmourPieceChallenge } from '../../hooks/useHunterChallenges';
import { LAB_SLOTS, type LabBuild, type LabData, type LabPiece } from './logic';

/** Copies the build's armour into the Build Planner and opens it */
export function useSendToPlanner(data: LabData | null) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const { data: rawPieces = [] } = useArmourPieces({ isActive: true, showSpoilers: Boolean(profile?.show_spoilers) });

  return useCallback(
    async (build: LabBuild) => {
      const store = useBuildPlannerStore.getState();
      if (!store.adventurer) {
        try {
          const { data: adv } = await supabase.from('adventurers').select('*').eq('is_default', true).eq('is_active', true).maybeSingle();
          if (adv) store.setAdventurer(adv as Adventurer);
        } catch {
          // the planner works without a default adventurer
        }
      }
      for (const { id } of LAB_SLOTS) {
        const entry = build[id];
        const raw = entry ? rawPieces.find((p) => p.id === entry.pieceId) : undefined;
        const piece = entry ? data?.piecesById.get(entry.pieceId) : undefined;
        store.setArmour(id, raw && piece ? { ...raw, monster_name: piece.monsterName } : null);
      }
      const { buildId } = useBuildPlannerStore.getState();
      navigate(buildId ? `/armory/planner/${buildId}` : '/armory/planner');
    },
    [data, navigate, rawPieces],
  );
}

/** The armour currently in the Build Planner, as a lab build */
export function plannerArmour(data: LabData): LabBuild {
  const planner = useBuildPlannerStore.getState();
  const build: LabBuild = {};
  for (const { id } of LAB_SLOTS) {
    const pieceId = planner[id]?.id;
    if (pieceId && data.piecesById.has(pieceId)) build[id] = { pieceId, rarity: null };
  }
  return build;
}

/** Track a piece in Hunter's Challenges (asks guests to sign in) */
export function useTrackPiece() {
  const user = useAuthStore((s) => s.user);
  const { data: challenges = [] } = useHunterChallenges(user?.id);
  const add = useAddArmourChallenge();
  const [needsLogin, setNeedsLogin] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTracked = useCallback((pieceId: string) => Boolean(getArmourPieceChallenge(challenges, pieceId)), [challenges]);

  const track = useCallback(
    async (piece: LabPiece, maxRarity: number) => {
      if (!user) {
        setNeedsLogin(true);
        return;
      }
      setError(null);
      try {
        const res = await add.mutateAsync({
          userId: user.id,
          game: 'mho',
          armourPieceId: piece.id,
          monsterId: piece.hasMonster ? piece.monsterId : null,
          armourSlot: piece.slot,
          setVariant: piece.variant,
          setName: piece.setName,
          pieceImage: piece.image,
          setIcon: piece.setIcon,
          monsterName: piece.monsterName,
          craftRarity: piece.rarity || 1,
          maxRarity,
        });
        if (!res.wasAlreadyTracked) {
          setJustAdded(piece.id);
          setTimeout(() => setJustAdded(null), 2500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add the challenge.');
      }
    },
    [user, add],
  );

  return { track, isTracked, justAdded, error, pending: add.isPending, needsLogin, closeLogin: () => setNeedsLogin(false) };
}
