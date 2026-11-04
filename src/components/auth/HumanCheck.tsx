// ─────────────────────────────────────────────────────────────
// HumanCheck — lightweight "are you human?" arithmetic challenge.
// Client-side only: deters casual bots, not a replacement for server-side
// captcha (e.g. Cloudflare Turnstile via Supabase).
// ─────────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Challenge {
  question: string;
  answer: number;
}

function createChallenge(): Challenge {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  return Math.random() < 0.5
    ? { question: `${a} + ${b}`, answer: a + b }
    : { question: `${a + b} − ${b}`, answer: a };
}

export function useHumanCheck() {
  const [challenge, setChallenge] = useState<Challenge>(createChallenge);
  const [answer, setAnswer] = useState('');

  const reset = useCallback(() => {
    setChallenge(createChallenge());
    setAnswer('');
  }, []);

  /** Returns true when the answer is correct; otherwise issues a new challenge. */
  const verify = useCallback(() => {
    const ok = Number(answer.trim()) === challenge.answer && answer.trim() !== '';
    if (!ok) reset();
    return ok;
  }, [answer, challenge, reset]);

  return { challenge, answer, setAnswer, reset, verify };
}

interface HumanCheckProps {
  id: string;
  question: string;
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
}

export default function HumanCheck({ id, question, value, onChange, onRefresh }: HumanCheckProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-mh-slate-400">
          Are you human? What is <span className="font-bold text-mh-slate-200">{question}</span>?
        </label>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="New question"
          className="text-mh-slate-600 transition-colors hover:text-mh-slate-400"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer"
        className={cn(
          'w-full rounded-lg border border-mh-slate-700 bg-mh-slate-800 px-3 py-2.5',
          'text-sm text-mh-slate-200 placeholder-mh-slate-600',
          'outline-none transition-colors focus:border-mh-gold-500/60 focus:ring-1 focus:ring-mh-gold-500/30',
        )}
      />
    </div>
  );
}
