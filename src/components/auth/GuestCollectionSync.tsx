// ─────────────────────────────────────────────────────────────
// GuestCollectionSync — mounted once in Layout.
// When a visitor logs in (or signs up) with collections saved in this browser,
// copy them into their account in the background.
//
// This must never get in the way of logging in or signing up:
//  • it only starts after auth has finished, and never throws;
//  • it is wrapped in SafeBoundary, so a bug here renders nothing;
//  • if the copy fails, the browser copy stays and is still shown on the
//    collection pages; we retry a few times now and again on the next visit.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Info, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { hasGuestItems, mergeGuestCollections, type GuestMergeResult } from '../../lib/guestCollections';
import { cn } from '../../lib/utils';
import SafeBoundary from './SafeBoundary';

const RETRY_DELAYS_MS = [10_000, 60_000]; // after the first attempt; more retries happen on the next visit
const inFlight = new Set<string>(); // guards against duplicate runs (React StrictMode, fast re-renders)

const LABELS = {
  visage: ['Visage card', 'Visage cards'],
  buddy: ['Buddy', 'Buddies'],
  adventurer: ['Adventurer', 'Adventurers'],
} as const;

function describeAdded(added: GuestMergeResult['added']): string {
  const parts = (Object.keys(added) as Array<keyof typeof added>)
    .filter((k) => added[k] > 0)
    .map((k) => `${added[k]} ${LABELS[k][added[k] === 1 ? 0 : 1]}`);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Show the "still trying" note at most once per browser session per account. */
function shouldShowPendingNote(userId: string): boolean {
  try {
    const key = `fg_guest_import_note_${userId}`;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

type Message = { kind: 'done'; text: string; skipped: number } | { kind: 'pending' };

function Sync() {
  const userId = useAuthStore((s) => s.user?.id);
  const authLoading = useAuthStore((s) => s.loading);
  const qc = useQueryClient();
  const [message, setMessage] = useState<Message | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (authLoading || !userId) return;
    let cancelled = false;

    const attempt = async (n: number) => {
      if (cancelled || !hasGuestItems()) return;
      if (inFlight.has(userId)) {
        // Another run is finishing (e.g. a quick re-render); check again shortly.
        timers.current.push(window.setTimeout(() => void attempt(n), 2000));
        return;
      }
      inFlight.add(userId);
      let res: GuestMergeResult | null = null;
      try {
        res = await mergeGuestCollections(userId);
      } catch (err) {
        // mergeGuestCollections never throws, but be defensive
        console.warn('Guest collection import failed', err);
      } finally {
        inFlight.delete(userId);
      }
      if (cancelled) return;

      try {
        qc.invalidateQueries({ queryKey: ['user-visage-collection'] });
        qc.invalidateQueries({ queryKey: ['user-buddy-collection'] });
        qc.invalidateQueries({ queryKey: ['user-adventurer-collection'] });
      } catch {
        /* ignore */
      }

      const addedText = res ? describeAdded(res.added) : '';
      if (addedText) setMessage({ kind: 'done', text: addedText, skipped: res?.skipped ?? 0 });

      const stillPending = !res || res.failed.length > 0;
      if (stillPending) {
        if (!addedText && n === 0 && shouldShowPendingNote(userId)) setMessage({ kind: 'pending' });
        const delay = RETRY_DELAYS_MS[n];
        if (delay !== undefined) timers.current.push(window.setTimeout(() => void attempt(n + 1), delay));
      }
    };

    void attempt(0);
    return () => {
      cancelled = true;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [userId, authLoading, qc]);

  // Auto-hide after a while
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), message.kind === 'done' ? 9000 : 12000);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!message) return null;
  const done = message.kind === 'done';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[80] bottom-20 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto sm:max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md',
          done ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100' : 'bg-sky-950/90 border-sky-500/50 text-sky-100',
        )}
      >
        {done ? (
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <Info size={18} className="text-sky-300 shrink-0 mt-0.5" />
        )}
        <div className="text-xs leading-relaxed flex-1">
          {done ? (
            <p>
              <span className="font-bold">Collection saved to your account.</span> Added {message.text} from this
              browser.
              {message.skipped > 0 &&
                ` ${message.skipped} item${message.skipped === 1 ? " is" : 's are'} no longer on the site and ${message.skipped === 1 ? 'was' : 'were'} skipped.`}
            </p>
          ) : (
            <p>
              <span className="font-bold">You're logged in.</span> We're still copying the collection saved in this
              browser to your account. It's safe and still shows on your collection pages in the meantime.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Dismiss"
          className="text-white/50 hover:text-white transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function GuestCollectionSync() {
  return (
    <SafeBoundary name="GuestCollectionSync">
      <Sync />
    </SafeBoundary>
  );
}
