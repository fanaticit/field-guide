import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface PatchReaction {
  id: string;
  patch_version: string;
  emoji: string;
  count: number;
}

export const DEFAULT_REACTION_EMOJIS = [
  { emoji: '🔥', label: 'Love it' },
  { emoji: '👍', label: 'Like it' },
  { emoji: '😐', label: 'Indifferent' },
  { emoji: '👎', label: 'Dislike it' },
];

export function usePatchReactions(patchVersion: string) {
  const queryClient = useQueryClient();
  const queryKey = ['patch_reactions', patchVersion];

  const query = useQuery<Record<string, number>>({
    queryKey,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('patch_reactions')
          .select('emoji, count')
          .eq('patch_version', patchVersion);

        if (error) {
          // If table hasn't been created yet or RPC unavailable, fall back gracefully
          console.warn('Error fetching patch reactions from supabase:', error.message);
          return getLocalFallbackCounts(patchVersion);
        }

        const counts: Record<string, number> = {};
        // Initialize defaults with 0
        for (const item of DEFAULT_REACTION_EMOJIS) {
          counts[item.emoji] = 0;
        }

        if (data) {
          for (const row of data) {
            counts[row.emoji] = (counts[row.emoji] || 0) + (row.count || 0);
          }
        }
        return counts;
      } catch (err) {
        console.warn('Network / client error fetching patch reactions:', err);
        return getLocalFallbackCounts(patchVersion);
      }
    },
    staleTime: 1000 * 30, // 30s cache
  });

  const reactMutation = useMutation({
    mutationFn: async (emoji: string) => {
      // 1. Try atomic increment RPC first
      const { data: rpcCount, error: rpcError } = await supabase.rpc('increment_patch_reaction', {
        p_patch_version: patchVersion,
        p_emoji: emoji,
      });

      if (!rpcError && typeof rpcCount === 'number') {
        return { emoji, count: rpcCount };
      }

      // 2. Fallback to direct upsert query if RPC is not present
      const { data: existing, error: selectErr } = await supabase
        .from('patch_reactions')
        .select('id, count')
        .eq('patch_version', patchVersion)
        .eq('emoji', emoji)
        .maybeSingle();

      if (!selectErr && existing) {
        const nextCount = (existing.count || 0) + 1;
        const { error: updateErr } = await supabase
          .from('patch_reactions')
          .update({ count: nextCount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (!updateErr) return { emoji, count: nextCount };
      } else if (!selectErr && !existing) {
        const { error: insertErr } = await supabase
          .from('patch_reactions')
          .insert({ patch_version: patchVersion, emoji, count: 1 });

        if (!insertErr) return { emoji, count: 1 };
      }

      // 3. Fallback to localStorage if table is not yet migrated in Supabase
      incrementLocalFallback(patchVersion, emoji);
      return { emoji, count: getLocalFallbackCounts(patchVersion)[emoji] || 1 };
    },
    onMutate: async (emoji: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Record<string, number>>(queryKey) || {};
      queryClient.setQueryData<Record<string, number>>(queryKey, {
        ...previous,
        [emoji]: (previous[emoji] || 0) + 1,
      });
      return { previous };
    },
    onError: (_err, _emoji, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    counts: query.data || getLocalFallbackCounts(patchVersion),
    isLoading: query.isLoading,
    react: reactMutation.mutate,
    isReacting: reactMutation.isPending,
  };
}

// ── Local Storage Fallback helpers ────────────────────────────
const STORAGE_KEY_PREFIX = 'mho_patch_reactions_';

function getLocalFallbackCounts(patchVersion: string): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const item of DEFAULT_REACTION_EMOJIS) {
    defaults[item.emoji] = 0;
  }
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${patchVersion}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch {
    // ignore
  }
  return defaults;
}

function incrementLocalFallback(patchVersion: string, emoji: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalFallbackCounts(patchVersion);
    current[emoji] = (current[emoji] || 0) + 1;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${patchVersion}`, JSON.stringify(current));
  } catch {
    // ignore
  }
}
