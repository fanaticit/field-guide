// ─────────────────────────────────────────────────────────────
// PollPrompt — a single-line poll that sits inline in a toolbar (e.g. the floating
// header on the Visage Card Checker). Shows the question with answer
// buttons; after voting shows the results or a thank-you message, as set
// in src/data/polls.ts. Voters can close it, and it stays closed.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { MessageCircleQuestion, X } from 'lucide-react';
import { getPoll } from '../../data/polls';
import { dismissPoll, getLocalVote, isPollDismissed, usePollResults, useVote } from '../../hooks/usePolls';
import { cn } from '../../lib/utils';

export default function PollPrompt({ pollId, className }: { pollId: string; className?: string }) {
  const poll = getPoll(pollId);
  // Read browser storage after mount (the page may be pre-rendered).
  const [vote, setVote] = useState<string | null>(null);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setVote(getLocalVote(pollId));
    setHidden(isPollDismissed(pollId));
  }, [pollId]);

  const voteMutation = useVote(pollId);
  const showResults = Boolean(vote) && poll?.after === 'results';
  const { data: counts } = usePollResults(pollId, showResults);

  if (!poll || !poll.active || hidden) return null;

  const close = () => {
    dismissPoll(pollId);
    setHidden(true);
  };

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div
      role="group"
      aria-label="Quick poll"
      className={cn(
        'flex min-w-0 items-center gap-2 whitespace-nowrap rounded-lg border border-mh-gold-500/30 bg-mh-gold-500/[0.08] px-2 py-1 text-xs',
        className,
      )}
    >
      <MessageCircleQuestion size={14} className="shrink-0 text-mh-gold-400" aria-hidden="true" />
      {/* The question shortens with "…" when space is tight; hover shows it in full */}
      <span className="min-w-0 flex-1 truncate font-semibold text-mh-slate-100" title={poll.question}>
        {poll.question}
      </span>

      {!vote ? (
        <span className="flex shrink-0 items-center gap-1.5">
          {poll.answers.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={voteMutation.isPending}
              onClick={() => voteMutation.mutate(a.id, { onSuccess: (ans) => setVote(ans) })}
              className="rounded-md border border-mh-gold-500/40 bg-mh-gold-500/15 px-2.5 py-0.5 font-bold text-mh-gold-200 transition-colors hover:bg-mh-gold-500 hover:text-mh-slate-950 disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
          {voteMutation.isError && <span className="text-red-300" title="Couldn’t save your vote – try again">!</span>}
        </span>
      ) : showResults ? (
        <span className="flex shrink-0 items-center gap-2 text-mh-slate-300" aria-live="polite">
          {poll.answers.map((a) => {
            const n = counts?.[a.id] ?? 0;
            const pct = total ? Math.round((n / total) * 100) : 0;
            return (
              <span key={a.id} className={cn('inline-flex items-center gap-1.5', a.id === vote && 'font-bold text-white')}>
                {a.label}
                <span className="relative hidden h-1.5 w-10 overflow-hidden rounded-full bg-white/10 sm:inline-block">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-mh-gold-400" style={{ width: `${pct}%` }} />
                </span>
                {counts ? `${pct}%` : '…'}
              </span>
            );
          })}
          {counts && <span className="hidden text-mh-slate-500 md:inline">({total} vote{total === 1 ? '' : 's'})</span>}
        </span>
      ) : (
        <span className="min-w-0 truncate font-semibold text-emerald-300" aria-live="polite" title={poll.thanksMessage}>
          {poll.thanksMessage ?? 'Thanks for voting!'}
        </span>
      )}

      <button
        type="button"
        onClick={close}
        aria-label="Close poll"
        title="Close"
        className="shrink-0 rounded p-0.5 text-mh-slate-500 hover:bg-white/10 hover:text-white"
      >
        <X size={13} />
      </button>
    </div>
  );
}
