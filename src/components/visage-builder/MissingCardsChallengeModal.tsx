// ─────────────────────────────────────────────────────────────
// MissingCardsChallengeModal — after saving a set that uses cards the
// hunter doesn't own, offers to add them to their Personal Hunter's Challenge.
// ─────────────────────────────────────────────────────────────
import { Loader2, X } from 'lucide-react';
import { getInkConfig } from '../../data/schemas/visage';
import type { MissingCard } from '../../lib/visageBuild';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  missing: MissingCard[];
  adding: boolean;
  error: string | null;
  onConfirm: () => void;
  onDecline: () => void;
}

export default function MissingCardsChallengeModal({ open, missing, adding, error, onConfirm, onDecline }: Props) {
  if (!open || missing.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={adding ? undefined : onDecline}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mho-panel-deep w-full max-w-md border-[var(--border-active)] p-5 shadow-2xl space-y-4"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 24px var(--accent-gold-glow)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/img/ui/Challenge%20Icon.png"
              alt=""
              draggable={false}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <h3 className="font-display text-base font-bold text-[#FFD700]">Add to Personal Hunter's Challenge?</h3>
          </div>
          <button
            type="button"
            onClick={onDecline}
            disabled={adding}
            className="text-[var(--text-secondary)] hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Your set uses {missing.length === 1 ? 'a card' : `${missing.length} cards`} you don't own yet. Shall we add{' '}
          {missing.length === 1 ? 'it' : 'them'} to your Personal Hunter's Challenge so you can hunt{' '}
          {missing.length === 1 ? 'it' : 'them'} down?
        </p>

        <ul className="max-h-56 overflow-y-auto space-y-1.5">
          {missing.map((m) => {
            const cfg = getInkConfig(m.ink);
            return (
              <li
                key={`${m.visage.id}:${m.ink}`}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-white/5 px-2.5 py-1.5"
              >
                <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border', cfg.bg, cfg.border, cfg.text)}>
                  <InkIconComponent iconName={cfg.iconName} size={13} />
                </div>
                <span className="flex-1 truncate text-xs font-bold text-white">{m.visage.name}</span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {m.owned}/{m.needed} owned
                </span>
              </li>
            );
          })}
        </ul>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onDecline}
            disabled={adding}
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-white disabled:opacity-40"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={adding}
            className="btn-mho-gold !px-4 !py-1.5 disabled:opacity-50"
          >
            {adding && <Loader2 size={14} className="animate-spin" />}
            <span>Add to Challenges</span>
          </button>
        </div>
      </div>
    </div>
  );
}
