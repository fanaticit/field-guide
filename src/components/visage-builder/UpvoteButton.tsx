import { ArrowBigUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UpvoteButtonProps {
  count: number;
  voted: boolean;
  /** When set the button is disabled and this is shown as its tooltip */
  disabledReason?: string | null;
  onClick: () => void;
  className?: string;
}

export default function UpvoteButton({ count, voted, disabledReason, onClick, className }: UpvoteButtonProps) {
  return (
    <button
      type="button"
      disabled={Boolean(disabledReason)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={disabledReason ?? (voted ? 'Remove your upvote' : 'Upvote this set')}
      aria-pressed={voted}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-1 text-xs font-bold transition-colors shrink-0',
        voted
          ? 'border-[#FFD700]/60 bg-[#FFD700]/15 text-[#FFD700]'
          : 'border-[var(--border-subtle)] bg-black/30 text-[var(--text-secondary)] hover:text-[#FFD700] hover:border-[#FFD700]/50',
        disabledReason && !voted && 'opacity-60 cursor-not-allowed hover:text-[var(--text-secondary)] hover:border-[var(--border-subtle)]',
        className,
      )}
    >
      <ArrowBigUp size={16} className={cn(voted && 'fill-[#FFD700]')} />
      <span className="font-mono tabular-nums">{count}</span>
    </button>
  );
}
