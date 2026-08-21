// ─────────────────────────────────────────────────────────────
// MonsterCard — displays a single monster's icon, name, tier,
// elements, and weaknesses in a compact card layout.
// ─────────────────────────────────────────────────────────────
import { cn } from '../lib/utils';
import type { CoreMonster } from '../data/schemas/index.js';

// ── Element / weakness colour map ────────────────────────────
const ELEMENT_COLOURS: Record<string, string> = {
  fire:       'bg-el-fire/15 text-el-fire border border-el-fire/30',
  water:      'bg-el-water/15 text-el-water border border-el-water/30',
  thunder:    'bg-el-thunder/15 text-el-thunder border border-el-thunder/30',
  ice:        'bg-el-ice/15 text-el-ice border border-el-ice/30',
  dragon:     'bg-el-dragon/15 text-el-dragon border border-el-dragon/30',
  poison:     'bg-el-poison/15 text-el-poison border border-el-poison/30',
  paralysis:  'bg-el-paralysis/15 text-el-paralysis border border-el-paralysis/30',
  sleep:      'bg-el-sleep/15 text-el-sleep border border-el-sleep/30',
  blast:      'bg-el-blast/15 text-el-blast border border-el-blast/30',
  none:       'bg-mh-slate-700/40 text-mh-slate-400 border border-mh-slate-700',
};

const ELEMENT_LABELS: Record<string, string> = {
  fire: '🔥 Fire',
  water: '💧 Water',
  thunder: '⚡ Thunder',
  ice: '❄️ Ice',
  dragon: '🐉 Dragon',
  poison: '☠️ Poison',
  paralysis: '⚡ Para',
  sleep: '💤 Sleep',
  blast: '💥 Blast',
  none: '— None',
};

// ── Tier badge config ─────────────────────────────────────────
const TIER_CONFIG: Record<string, { label: string; cls: string }> = {
  low:   { label: 'Low',   cls: 'rarity-2' },
  high:  { label: 'High',  cls: 'rarity-4' },
  elder: { label: 'Elder', cls: 'rarity-elder' },
};

// ── Component props ───────────────────────────────────────────
interface MonsterCardProps {
  monster: CoreMonster;
  icon?: string;
  sortOrder?: number;
}

function ElementChip({ el }: { el: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none',
        ELEMENT_COLOURS[el] ?? ELEMENT_COLOURS.none,
      )}
    >
      {ELEMENT_LABELS[el] ?? el}
    </span>
  );
}

export default function MonsterCard({ monster, icon, sortOrder }: MonsterCardProps) {
  const tierCfg = TIER_CONFIG[monster.tier] ?? { label: monster.tier, cls: 'rarity-1' };

  return (
    <div className="mh-card flex flex-col gap-3 p-3">
      {/* Sort order badge + icon */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="relative shrink-0">
          {icon ? (
            <img
              src={icon}
              alt={monster.name}
              className="h-14 w-14 rounded-lg object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
              }}
            />
          ) : null}
          {/* Fallback silhouette */}
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-lg bg-mh-slate-700/60 text-2xl',
              icon ? 'hidden' : '',
            )}
            aria-hidden="true"
          >
            🐾
          </div>
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {sortOrder !== undefined && (
              <span className="text-[9px] font-mono text-mh-slate-600">#{sortOrder}</span>
            )}
            <span className={`rarity-badge ${tierCfg.cls}`}>{tierCfg.label}</span>
          </div>
          <p className="mt-1 text-sm font-bold leading-tight text-mh-slate-100 truncate">
            {monster.name}
          </p>
          {monster.nameJa && (
            <p className="text-[10px] text-mh-slate-600 leading-none mt-0.5 truncate">
              {monster.nameJa}
            </p>
          )}
        </div>
      </div>

      {/* Elements */}
      {monster.elements.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-mh-slate-600">Element</p>
          <div className="flex flex-wrap gap-1">
            {monster.elements.map((el) => (
              <ElementChip key={el} el={el} />
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {monster.weaknesses.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-mh-slate-600">Weak to</p>
          <div className="flex flex-wrap gap-1">
            {monster.weaknesses.map((el) => (
              <ElementChip key={el} el={el} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
