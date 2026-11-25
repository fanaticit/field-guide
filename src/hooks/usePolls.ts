// Poll voting and results. Votes are stored in the shared poll_votes table.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const VOTER_KEY = 'fg_poll_voter';
const VOTED_PREFIX = 'fg_poll_';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** A random id for this browser, so anonymous visitors can only vote once per poll. */
function browserVoterKey(): string {
  const s = storage();
  let key = s?.getItem(VOTER_KEY) ?? null;
  if (!key) {
    key = `anon:${crypto.randomUUID()}`;
    s?.setItem(VOTER_KEY, key);
  }
  return key;
}

export function getLocalVote(pollId: string): string | null {
  return storage()?.getItem(`${VOTED_PREFIX}${pollId}`) ?? null;
}

function setLocalVote(pollId: string, answer: string) {
  storage()?.setItem(`${VOTED_PREFIX}${pollId}`, answer);
}

export function isPollDismissed(pollId: string): boolean {
  return storage()?.getItem(`${VOTED_PREFIX}${pollId}:hidden`) === '1';
}

export function dismissPoll(pollId: string) {
  storage()?.setItem(`${VOTED_PREFIX}${pollId}:hidden`, '1');
}

export type PollCounts = Record<string, number>;

export function usePollResults(pollId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['poll-results', pollId],
    enabled,
    queryFn: async (): Promise<PollCounts> => {
      const { data, error } = await supabase.rpc('poll_results', { p_poll_id: pollId });
      if (error) throw error;
      const counts: PollCounts = {};
      for (const row of (data ?? []) as { answer: string; votes: number }[]) counts[row.answer] = Number(row.votes);
      return counts;
    },
    staleTime: 1000 * 30,
  });
}

export function useVote(pollId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  return useMutation({
    mutationFn: async (answer: string) => {
      const voterKey = userId ? `user:${userId}` : browserVoterKey();
      const { error } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        answer,
        voter_key: voterKey,
        user_id: userId,
        page: typeof window !== 'undefined' ? window.location.pathname : null,
      });
      // 23505 = already voted on this poll: treat as success.
      if (error && error.code !== '23505') throw error;
      setLocalVote(pollId, answer);
      return answer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poll-results', pollId] }),
  });
}

export interface PollVoteRow {
  poll_id: string;
  answer: string;
  user_id: string | null;
  created_at: string;
}

/** Admin only (RLS): every vote, for the admin Polls tab. */
export function useAllPollVotes() {
  return useQuery({
    queryKey: ['admin-poll-votes'],
    queryFn: async (): Promise<PollVoteRow[]> => {
      const rows: PollVoteRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('poll_votes')
          .select('poll_id, answer, user_id, created_at')
          .order('created_at', { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...((data ?? []) as PollVoteRow[]));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
    staleTime: 1000 * 30,
  });
}
