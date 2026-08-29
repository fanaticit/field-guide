// ─────────────────────────────────────────────────────────────
// VisageCard — Small MHO Visage card miniature matching in-game art
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Flame,
  Droplets,
  Zap,
  Sword,
  Swords,
  Link,
  Sparkles,
  Snowflake,
  Skull,
  Moon,
  Shield,
  Activity,
  Check,
} from 'lucide-react';
import type { DBVisage } from '../../data/schemas/visage';
import { getInkConfig } from '../../data/schemas/visage';
import { cn } from '../../lib/utils';

interface VisageCardProps {
  card: DBVisage;
  currentInk?: string;
  isCollected?: boolean;
  onToggleCollected?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

export function InkIconComponent({ iconName, size = 12, className = '' }: { iconName: string; size?: number; className?: string }) {
  switch (iconName) {
    case 'sword':
      return <Sword size={size} className={className} />;
    case 'flame':
      return <Flame size={size} className={className} />;
    case 'droplet':
      return <Droplets size={size} className={className} />;
    case 'zap':
      return <Zap size={size} className={className} />;
    case 'swords':
      return <Swords size={size} className={className} />;
    case 'link':
      return <Link size={size} className={className} />;
    case 'sparkles':
      return <Sparkles size={size} className={className} />;
    case 'snowflake':
      return <Snowflake size={size} className={className} />;
    case 'skull':
      return <Skull size={size} className={className} />;
    case 'moon':
      return <Moon size={size} className={className} />;
    case 'shield':
      return <Shield size={size} className={className} />;
    case 'activity':
      return <Activity size={size} className={className} />;
    default:
      return <Flame size={size} className={className} />;
  }
}

export default function VisageCard({
  card,
  currentInk,
  isCollected = false,
  onToggleCollected,
  onClick,
}: VisageCardProps) {
  const [imageError, setImageError] = useState(false);
  const inkCfg = getInkConfig(currentInk);

  // Determine card backing tint (e.g. rare purple/blue or standard gold/parchment)
  const isSpecialBacking = card.rarity >= 5;
  const imageSrc = card.image_small || card.image_large;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${card.name} (${card.points} Pts) - Click to inspect`}
      className={cn(
        'group relative flex flex-col items-center justify-between cursor-pointer select-none transition-all duration-200',
        'w-[72px] sm:w-[84px] h-[96px] sm:h-[110px] rounded-lg p-1.5',
        'border-2 shadow-md hover:scale-105 hover:shadow-xl hover:z-20',
        isSpecialBacking
          ? 'bg-gradient-to-b from-indigo-900/60 via-slate-800 to-indigo-950/80 border-indigo-400/50 hover:border-indigo-300'
          : 'bg-gradient-to-b from-[#f3e5be] via-[#e2cf9f] to-[#cfba84] border-[#8e7646] hover:border-mh-gold-400 text-mh-slate-900',
        !isCollected && 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100',
      )}
      style={{
        boxShadow: isSpecialBacking
          ? '0 4px 12px rgba(99, 102, 241, 0.25), inset 0 0 8px rgba(129, 140, 248, 0.2)'
          : '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 6px rgba(255, 235, 170, 0.4)',
      }}
    >
      {/* Decorative Outer Corner Accents */}
      <div className="pointer-events-none absolute inset-0.5 rounded border border-amber-900/20" />

      {/* Center Art Area: Monster Portrait */}
      <div className="relative flex flex-1 w-full items-center justify-center overflow-hidden rounded">
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={card.name}
            onError={() => setImageError(true)}
            className="h-11 w-11 sm:h-13 sm:w-13 object-contain drop-shadow-md filter transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-black/20 text-amber-900 font-display font-bold text-xs">
            {card.name.slice(0, 3).toUpperCase()}
          </div>
        )}
      </div>

      {/* Bottom Row / Badges */}
      <div className="relative w-full flex items-end justify-between mt-auto">
        {/* Bottom Left Badge: Ink Icon + Points (matching in-game screenshot badge) */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded px-1 py-0.5 shadow-sm',
            'bg-black/75 border border-amber-500/40 text-white min-w-[20px]',
          )}
        >
          <div className={cn('text-xs flex items-center justify-center', inkCfg.text)}>
            <InkIconComponent iconName={inkCfg.iconName} size={11} />
          </div>
          <span className="font-display text-[10px] sm:text-[11px] font-bold leading-none text-amber-300">
            {card.points}
          </span>
        </div>

        {/* Monster Type / Collection status dot */}
        <div className="flex flex-col items-end gap-0.5">
          {card.monster_type === 'small' && (
            <span className="rounded bg-black/60 px-1 py-0.5 text-[8px] font-semibold text-amber-200/90 leading-none">
              Sm
            </span>
          )}
          {isCollected && (
            <span
              onClick={onToggleCollected}
              title="Owned in collection"
              className="h-3 w-3 rounded-full bg-green-500 text-slate-950 flex items-center justify-center shadow-sm text-[8px] font-bold hover:scale-125 transition-transform"
            >
              <Check size={8} strokeWidth={3} />
            </span>
          )}
        </div>
      </div>

      {/* Monster Name Tooltip on hover */}
      <div className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-mh-slate-950/95 px-2 py-0.5 text-[10px] font-bold text-mh-gold-300 opacity-0 shadow-lg ring-1 ring-mh-gold-500/30 transition-opacity group-hover:opacity-100 z-30">
        {card.name}
      </div>
    </div>
  );
}
