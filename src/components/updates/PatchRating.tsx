// Emoji rating bar for a patch. Votes are stored per patch version in the
// patch_reactions table (a new version gets its rows on the first vote).
import { useState } from 'react';
import { usePatchReactions, DEFAULT_REACTION_EMOJIS } from '../../hooks/usePatchReactions';

export default function PatchRating({ version }: { version: string }) {
  const { counts, react } = usePatchReactions(version);
  const [justClicked, setJustClicked] = useState<string | null>(null);

  const handleClick = (emoji: string) => {
    react(emoji);
    setJustClicked(emoji);
    setTimeout(() => setJustClicked(null), 600);
  };

  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-black/50 border border-white/10 p-1 shadow-inner">
      <span className="hidden sm:inline px-2 text-[10px] font-semibold uppercase tracking-wider text-mh-slate-400">Rate Patch:</span>
      {DEFAULT_REACTION_EMOJIS.map(({ emoji, label }) => {
        const count = counts[emoji] || 0;
        const isBouncing = justClicked === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleClick(emoji)}
            title={`${label} (${count})`}
            aria-label={`${label} – rate patch ${version} (${count})`}
            className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
              isBouncing
                ? 'scale-110 bg-mh-gold-500/25 border border-mh-gold-500/60 text-white'
                : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-mh-gold-500/30 text-mh-slate-300 hover:text-white'
            }`}
          >
            <span className={`text-base transition-transform group-hover:scale-125 ${isBouncing ? 'animate-bounce' : ''}`}>{emoji}</span>
            <span className="font-mono text-xs font-bold tabular-nums text-mh-gold-300">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

