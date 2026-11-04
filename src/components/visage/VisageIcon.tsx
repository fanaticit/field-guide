import { VISAGE_BACKGROUNDS } from '../../data/schemas/visage';
import type { DBVisage, VisageRarity } from '../../data/schemas/visage';
import { cn } from '../../lib/utils';

interface VisageIconProps {
  visage: Pick<DBVisage, 'name' | 'monster_icon'>;
  rarity?: VisageRarity | null;
  className?: string;
}

/** Visage card art: a rarity background with the monster icon centred on top. */
export default function VisageIcon({ visage, rarity, className }: VisageIconProps) {
  return (
    <div className={cn('relative aspect-square w-full overflow-hidden', className)}>
      <img
        src={VISAGE_BACKGROUNDS[rarity ?? 'fine']}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full -translate-x-[5%] object-contain"
      />
      {visage.monster_icon ? (
        <img
          src={visage.monster_icon}
          alt={visage.name}
          draggable={false}
          className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-md"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-display text-xs font-bold text-amber-900">
          {visage.name.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}
