// ─────────────────────────────────────────────────────────────
// GuestSaveNotice — tells logged-out visitors their collection is only
// saved in this browser and offers to log in. Dismissible; it comes back
// once they've added a few more items.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { CloudOff, LogIn, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import LoginModal from './LoginModal';
import SafeBoundary from './SafeBoundary';

const SHOW_AGAIN_AFTER = 5; // extra items before a dismissed notice returns

interface GuestSaveNoticeProps {
  /** Which collection, used for the dismiss memory. */
  collection: 'visage' | 'buddy' | 'adventurer';
  /** How many items the visitor has saved in this browser. */
  count: number;
  /** Plural noun for the items, e.g. "cards", "buddies". */
  noun: string;
  className?: string;
}

function Notice({ collection, count, noun, className }: GuestSaveNoticeProps) {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const storageKey = `fg_guest_notice_dismissed_${collection}`;
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setDismissedAt(v ? Number(v) || 0 : null);
    } catch {
      setDismissedAt(null);
    }
  }, [storageKey]);

  if (user || authLoading || count <= 0) {
    return <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />;
  }
  const hidden = dismissedAt !== null && count < dismissedAt + SHOW_AGAIN_AFTER;

  const dismiss = () => {
    setDismissedAt(count);
    try {
      localStorage.setItem(storageKey, String(count));
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <>
      {!hidden && (
        <div
          className={
            'flex items-start sm:items-center gap-3 rounded-xl border border-sky-500/40 bg-sky-950/40 px-3.5 py-2.5 text-sky-100 ' +
            (className ?? '')
          }
        >
          <CloudOff size={18} className="text-sky-300 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs leading-relaxed flex-1">
            <span className="font-bold">
              Your {count} {noun} {count === 1 ? 'is' : 'are'} only saved in this browser.
            </span>{' '}
            Clearing browser data, private browsing or switching devices will lose them, and iPhone browsers can
            clear them after a week away. Log in to keep them safe and use them on any device.
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 border border-sky-400/50 px-2.5 py-1.5 text-xs font-bold text-sky-100 hover:bg-sky-500/30 transition-colors"
            >
              <LogIn size={13} />
              Log in
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              title="Hide for now"
              className="p-1 text-sky-200/60 hover:text-sky-100 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

/** Wrapped so a bug in the notice can never break the collection page. */
export default function GuestSaveNotice(props: GuestSaveNoticeProps) {
  return (
    <SafeBoundary name="GuestSaveNotice">
      <Notice {...props} />
    </SafeBoundary>
  );
}
