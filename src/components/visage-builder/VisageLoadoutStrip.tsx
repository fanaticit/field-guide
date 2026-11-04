// ─────────────────────────────────────────────────────────────
// VisageLoadoutStrip — compact, read-only Core + 4 portrait row.
// ─────────────────────────────────────────────────────────────
import { getInkConfig, DEFAULT_VISAGE_RARITY } from '../../data/schemas/visage';
import VisageIcon from '../visage/VisageIcon';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { VISAGE_BUILD_SLOTS, type VisageLoadout } from '../../lib/visageBuild';
import { cn } from '../../lib/utils';

interface Props {
  loadout: VisageLoadout;
  /** keys `${visageId}:${ink}` the user is missing — rendered with a lock */
  missingKeys?: Set<string>;
}

export default function VisageLoadoutStrip({ loadout, missingKeys }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {VISAGE_BUILD_SLOTS.map((slot) => {
        const { visage, ink } = loadout[slot];
        const core = slot === 'core';
        const cfg = getInkConfig(ink);
        const missing = visage && ink && missingKeys?.has(`${visage.id}:${ink}`);
        return (
          <div key={slot} className="flex flex-col items-center gap-1">
            <div
              title={visage ? `${visage.name}${ink ? ` · ${cfg.shortName}` : ''}${missing ? ' (not owned)' : ''}` : 'Empty'}
              className={cn(
                'relative w-full aspect-[4/5] rounded-md overflow-hidden border bg-mh-slate-800 flex items-center justify-center',
                core ? 'border-rarity-5/70' : 'border-mh-slate-700',
                missing && 'opacity-50',
              )}
            >
              {visage ? (
                <VisageIcon visage={visage} rarity={DEFAULT_VISAGE_RARITY} />
              ) : (
                <span className="text-mh-slate-700 text-sm">—</span>
              )}
              {visage && (
                <div className="absolute top-0 right-0 bg-black/80 px-1 text-[9px] font-bold text-white leading-tight rounded-bl">
                  {visage.points}
                </div>
              )}
              {missing && <div className="absolute inset-0 flex items-center justify-center text-xs">🔒</div>}
            </div>
            {visage && ink ? (
              <div className="w-4 h-4 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                <InkIconComponent iconName={cfg.iconName} size={9} />
              </div>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}
