// ─────────────────────────────────────────────────────────────
// Admin → Polls. Results of every poll from the shared poll_votes
// table. Questions come from src/data/polls.ts; votes for poll ids that
// are no longer in that file are still listed.
// ─────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Target } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { POLLS, type PollDef } from '../../../data/polls';
import { useAllPollVotes, type PollVoteRow } from '../../../hooks/usePolls';
import { cn } from '../../../lib/utils';

interface PollStats {
  poll: PollDef | null;
  pollId: string;
  total: number;
  counts: Record<string, number>;
  loggedIn: number;
  last: string | null;
  last7Days: number;
}

function buildStats(votes: PollVoteRow[]): PollStats[] {
  const byPoll = new Map<string, PollVoteRow[]>();
  for (const v of votes) byPoll.set(v.poll_id, [...(byPoll.get(v.poll_id) ?? []), v]);
  const ids = [...new Set([...POLLS.map((p) => p.id), ...byPoll.keys()])];
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  return ids.map((id) => {
    const rows = byPoll.get(id) ?? [];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.answer] = (counts[r.answer] ?? 0) + 1;
    return {
      poll: POLLS.find((p) => p.id === id) ?? null,
      pollId: id,
      total: rows.length,
      counts,
      loggedIn: rows.filter((r) => r.user_id).length,
      last: rows[0]?.created_at ?? null,
      last7Days: rows.filter((r) => Date.parse(r.created_at) >= weekAgo).length,
    };
  });
}

export default function PollManager() {
  const qc = useQueryClient();
  const { data: votes = [], isLoading, error, isFetching } = useAllPollVotes();
  const stats = useMemo(() => buildStats(votes), [votes]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Polls</h2>
          <p className="text-xs text-mh-slate-400">
            Every poll’s votes are in one table. Add or close polls in <code className="text-mh-slate-300">src/data/polls.ts</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ['admin-poll-votes'] })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-mh-slate-200 hover:bg-white/10"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-mh-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading votes…
        </p>
      )}
      {error && <p className="text-sm text-red-300">Couldn’t load votes: {(error as Error).message}</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {stats.map((s) => {
          const answers = s.poll?.answers ?? Object.keys(s.counts).map((id) => ({ id, label: id }));
          const goal = s.poll?.goal;
          const goalPct = goal && s.total ? Math.round(((s.counts[goal.answer] ?? 0) / s.total) * 100) : 0;
          const goalMet = Boolean(goal && s.total && goalPct >= goal.percent);
          return (
            <section key={s.pollId} className="mho-panel space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">{s.poll?.question ?? s.pollId}</h3>
                  <p className="mt-0.5 text-[11px] text-mh-slate-500">
                    <code>{s.pollId}</code>
                    {s.poll && <> · {s.poll.page} · started {s.poll.started}</>}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    s.poll?.active ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-white/5 text-mh-slate-400',
                  )}
                >
                  {s.poll ? (s.poll.active ? 'Running' : 'Closed') : 'Not in polls.ts'}
                </span>
              </div>

              <div className="space-y-2">
                {answers.map((a) => {
                  const n = s.counts[a.id] ?? 0;
                  const pct = s.total ? Math.round((n / s.total) * 100) : 0;
                  return (
                    <div key={a.id}>
                      <div className="flex justify-between text-xs text-mh-slate-300">
                        <span className="font-semibold text-white">{a.label}</span>
                        <span className="tabular-nums">
                          {n} · {pct}%
                        </span>
                      </div>
                      <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-mh-gold-400" style={{ width: `${pct}%` }} />
                        {goal?.answer === a.id && (
                          <div className="absolute inset-y-0 w-0.5 bg-white/70" style={{ left: `${goal.percent}%` }} title={`Target ${goal.percent}%`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-mh-slate-400">
                {s.total} vote{s.total === 1 ? '' : 's'} · {s.loggedIn} from logged-in users · {s.last7Days} in the last 7 days
                {s.last && <> · last {new Date(s.last).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</>}
              </p>

              {goal && (
                <div
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-2.5 text-xs',
                    goalMet ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-black/30 text-mh-slate-300',
                  )}
                >
                  {goalMet ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <Target size={15} className="mt-0.5 shrink-0" />}
                  <span>
                    <strong>
                      {goalMet ? 'Target reached' : 'Target not reached yet'}: {goalPct}% “{answers.find((a) => a.id === goal.answer)?.label ?? goal.answer}” (needs {goal.percent}%).
                    </strong>{' '}
                    {goal.note}
                  </span>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
