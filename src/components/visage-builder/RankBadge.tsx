import { cn } from '../../lib/utils';

/** "#1" style badge for a build's position in the community ranking. */
export default function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      title={`Ranked #${rank} by community upvotes`}
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black font-mono border',
        rank === 1
          ? 'border-[#FFD700]/60 bg-[#FFD700]/20 text-[#FFD700]'
          : rank <= 3
            ? 'border-white/30 bg-white/10 text-white'
            : 'border-[var(--border-subtle)] bg-black/30 text-[var(--text-secondary)]',
      )}
    >
      #{rank}
    </span>
  );
}
