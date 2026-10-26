// ─────────────────────────────────────────────────────────────
// useVisageBuilds — CRUD for shared Visage Builds (mho_visage_builds)
// ─────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { loadoutToColumns, type VisageBuildRow, type VisageLoadout } from '../lib/visageBuild';

export const VISAGE_BUILDS_KEY = 'mho_visage_builds';

const SELECT = '*, author:profiles!mho_visage_builds_author_id_fkey(username)';

/** Published builds plus (if signed in) the user's own drafts — RLS handles visibility. */
export function useVisageBuildsList() {
  return useQuery({
    queryKey: [VISAGE_BUILDS_KEY, 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mho_visage_builds')
        .select(SELECT)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as VisageBuildRow[];
    },
    staleTime: 1000 * 30,
  });
}

export function useVisageBuild(id: string | null | undefined) {
  return useQuery({
    queryKey: [VISAGE_BUILDS_KEY, 'one', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('mho_visage_builds').select(SELECT).eq('id', id!).single();
      if (error) throw error;
      return data as VisageBuildRow;
    },
    enabled: Boolean(id),
  });
}

export interface SaveVisageBuildInput {
  id?: string | null;
  authorId: string;
  title: string;
  description: string;
  isPublished: boolean;
  loadout: VisageLoadout;
}

export function useSaveVisageBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveVisageBuildInput) => {
      const payload = {
        author_id: input.authorId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        is_published: input.isPublished,
        ...loadoutToColumns(input.loadout),
      };
      const q = input.id
        ? supabase.from('mho_visage_builds').update(payload).eq('id', input.id)
        : supabase.from('mho_visage_builds').insert(payload);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [VISAGE_BUILDS_KEY] }),
  });
}

export function useDeleteVisageBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mho_visage_builds').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [VISAGE_BUILDS_KEY] }),
  });
}

// ─────────────────────────────────────────────────────────────
// useUserVisageFavorites — Favoriting shared visage builds
// ─────────────────────────────────────────────────────────────
export function useUserVisageFavorites() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const queryKey = [VISAGE_BUILDS_KEY, 'favorites', user?.id ?? 'guest'];

  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) {
        try {
          const raw = localStorage.getItem('mho_visage_build_favorites_guest');
          return raw ? (JSON.parse(raw) as string[]) : [];
        } catch {
          return [];
        }
      }
      const { data, error } = await supabase
        .from('user_visage_build_favorites')
        .select('visage_build_id')
        .eq('user_id', user.id);
      if (error) {
        console.warn('Failed to fetch visage favorites from DB, falling back to local storage', error);
        try {
          const raw = localStorage.getItem(`mho_visage_build_favorites_${user.id}`);
          return raw ? (JSON.parse(raw) as string[]) : [];
        } catch {
          return [];
        }
      }
      const ids = (data ?? []).map((r) => r.visage_build_id as string);
      try {
        localStorage.setItem(`mho_visage_build_favorites_${user.id}`, JSON.stringify(ids));
      } catch {}
      return ids;
    },
    staleTime: 1000 * 60,
  });

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ buildId, makeFavorite }: { buildId: string; makeFavorite: boolean }) => {
      if (!user) {
        const current = new Set(favorites);
        if (makeFavorite) current.add(buildId);
        else current.delete(buildId);
        const arr = Array.from(current);
        try {
          localStorage.setItem('mho_visage_build_favorites_guest', JSON.stringify(arr));
        } catch {}
        return arr;
      }

      if (makeFavorite) {
        const { error } = await supabase
          .from('user_visage_build_favorites')
          .insert({ user_id: user.id, visage_build_id: buildId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('user_visage_build_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('visage_build_id', buildId);
        if (error) throw error;
      }

      const next = new Set(favorites);
      if (makeFavorite) next.add(buildId);
      else next.delete(buildId);
      const arr = Array.from(next);
      try {
        localStorage.setItem(`mho_visage_build_favorites_${user.id}`, JSON.stringify(arr));
      } catch {}
      return arr;
    },
    onMutate: async ({ buildId, makeFavorite }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<string[]>(queryKey) ?? [];
      const next = new Set(previous);
      if (makeFavorite) next.add(buildId);
      else next.delete(buildId);
      qc.setQueryData(queryKey, Array.from(next));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const toggleFavorite = (buildId: string) => {
    const isFav = favoritesSet.has(buildId);
    return toggleFavoriteMutation.mutateAsync({ buildId, makeFavorite: !isFav });
  };

  const addFavorite = (buildId: string) => {
    if (favoritesSet.has(buildId)) return Promise.resolve(favorites);
    return toggleFavoriteMutation.mutateAsync({ buildId, makeFavorite: true });
  };

  const removeFavorite = (buildId: string) => {
    if (!favoritesSet.has(buildId)) return Promise.resolve(favorites);
    return toggleFavoriteMutation.mutateAsync({ buildId, makeFavorite: false });
  };

  return {
    favorites,
    favoritesSet,
    isFavorite: (id: string) => favoritesSet.has(id),
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isLoading: toggleFavoriteMutation.isPending || isLoadingFavorites,
  };
}
