// ─────────────────────────────────────────────────────────────
// VisageBuildEffects — core effect, duplicate warning and ink set
// bonus progress for a loadout, using DB set thresholds.
// ─────────────────────────────────────────────────────────────
import { getInkConfig } from '../../data/schemas/visage';
import type { VisageSet } from '../../hooks/useVisageSets';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { getActiveSetBonuses, getDuplicateIds, type VisageLoadout } from '../../lib/visageBuild';
import { cn } from '../../lib/utils';

interface Props {
  loadout: VisageLoadout;
  sets: VisageSet[];
  onAddForInk?: (ink: string) => void;
}

export default function VisageBuildEffects({ loadout, sets, onAddForInk }: Props) {
  const bonuses = getActiveSetBonuses(loadout, sets);
  const hasDuplicates = getDuplicateIds(loadout).length > 0;

  if (bonuses.length === 0 && !hasDuplicates) {
    return (
      <p className="text-[11px] text-mh-slate-500 italic text-center py-3">
        Add cards to see active ink set bonuses.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hasDuplicates && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-amber-500/40 bg-amber-500/10">
          <span className="text-amber-400 text-sm shrink-0">⚠</span>
          <p className="text-[11px] text-amber-300 leading-snug">Set effects from Visage with the same name do not stack.</p>
        </div>
      )}

      {bonuses.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-mh-slate-500 uppercase tracking-wider">Set Bonuses</span>
          {bonuses.map((b) => {
            const c = getInkConfig(b.ink);
            const maxPips = Math.max(4, ...b.thresholds.map((t) => t.pieces));
            const milestones = new Set(b.thresholds.map((t) => t.pieces));
            return (
              <div key={b.ink} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white', c.dotColor)}>
                    <InkIconComponent iconName={c.iconName} size={10} />
                  </div>
                  <span className={cn('text-xs font-bold truncate', c.text)}>{b.name}</span>
                  {onAddForInk && (
                    <button
                      onClick={() => onAddForInk(b.ink)}
                      title={`Add a ${c.shortName} card`}
                      className="w-4 h-4 flex items-center justify-center rounded-full bg-mh-slate-700/50 hover:bg-mh-slate-600 text-mh-slate-400 hover:text-white text-[11px] leading-none"
                    >
                      +
                    </button>
                  )}
                  <div className="flex gap-1 ml-auto">
                    {Array.from({ length: maxPips }).map((_, i) => {
                      const pip = i + 1;
                      const filled = pip <= b.count;
                      const isMilestone = milestones.has(pip);
                      return (
                        <div
                          key={i}
                          className={cn(
                            'rounded-sm',
                            isMilestone ? 'w-2.5 h-4' : 'w-2 h-3',
                            filled ? c.dotColor : 'bg-mh-slate-700',
                            filled && isMilestone && 'ring-1 ring-white/30',
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                {b.thresholds.length > 0 ? (
                  <div className="flex flex-col gap-1 pl-4 border-l border-mh-slate-700/50 ml-2">
                    {b.thresholds.map((t) => {
                      const achieved = b.count >= t.pieces;
                      return (
                        <div
                          key={t.pieces}
                          className={cn('flex gap-2 items-start text-[11px] leading-snug pl-2', achieved ? 'text-mh-slate-100' : 'text-mh-slate-600')}
                        >
                          <span className={cn('shrink-0 font-black text-[10px] mt-0.5', achieved ? cn(c.text, c.bg, 'px-1 rounded') : 'text-mh-slate-700')}>
                            {t.pieces}pc
                          </span>
                          <span className={achieved ? 'font-semibold' : 'opacity-50'}>{t.description}</span>
                          {achieved && <span className="ml-auto shrink-0 text-[9px] font-bold text-green-400">✓</span>}
                        </div>
                      );
                    })}
                    {b.next && (
                      <p className="text-[10px] text-mh-slate-600 italic mt-0.5 pl-2">
                        {b.next.pieces - b.count} more card{b.next.pieces - b.count > 1 ? 's' : ''} for {b.next.pieces}-piece bonus
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-mh-slate-600 pl-4 italic ml-2 border-l border-mh-slate-700/50">Bonus data not yet available.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
