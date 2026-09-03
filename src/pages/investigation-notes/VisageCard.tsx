// ─────────────────────────────────────────────────────────────
// VisageCard — Small MHO Visage card miniature matching in-game art
// Supports 4 rarities (Fine, Rare, Epic, Superior) and quantity (1-5+)
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
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
  Plus,
  Trash2,
} from 'lucide-react';
import type { DBVisage, VisageRarity } from '../../data/schemas/visage';
import { getInkConfig, VISAGE_RARITY_CONFIG, VISAGE_RARITY_OPTIONS } from '../../data/schemas/visage';
import type { CardCollectionEntry } from '../../hooks/useVisageSets';
import { cn } from '../../lib/utils';

interface VisageCardProps {
  card: DBVisage;
  currentInk?: string;
  collectionEntry?: CardCollectionEntry | null;
  onSetRarity?: (rarity: VisageRarity, quantity?: number) => void;
  onSetQuantity?: (quantity: number) => void;
  onRemoveFromCollection?: () => void;
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
  collectionEntry,
  onSetRarity,
  onSetQuantity,
  onRemoveFromCollection,
  onClick,
}: VisageCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showRarityMenu, setShowRarityMenu] = useState(false);
  const [showQtyMenu, setShowQtyMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const qtyMenuRef = useRef<HTMLDivElement>(null);

  const inkCfg = getInkConfig(currentInk);
  const isOwned = Boolean(collectionEntry);
  const currentRarity = collectionEntry?.rarity;
  const currentQty = collectionEntry?.quantity ?? 1;

  // Close menus when clicking outside
  useEffect(() => {
    if (!showRarityMenu && !showQtyMenu) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRarityMenu(false);
      }
      if (qtyMenuRef.current && !qtyMenuRef.current.contains(e.target as Node)) {
        setShowQtyMenu(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [showRarityMenu, showQtyMenu]);

  // Rarity theme configuration
  const rarityCfg = currentRarity ? VISAGE_RARITY_CONFIG[currentRarity] : null;
  const imageSrc = card.image_small;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${card.name} (${card.points} Pts) - Click to inspect`}
      className={cn(
        'group relative flex flex-col items-center justify-between cursor-pointer select-none transition-all duration-200',
        'w-[80px] sm:w-[92px] h-[108px] sm:h-[122px] rounded-lg p-1.5',
        'border-2 shadow-md hover:scale-105 hover:shadow-xl hover:z-20',
        isOwned && rarityCfg
          ? cn(rarityCfg.bgGradient, rarityCfg.borderClass, rarityCfg.hoverBorderClass, 'text-mh-slate-900')
          : 'bg-[#151922]/90 border-mh-slate-800 text-mh-slate-300 opacity-40 grayscale hover:opacity-90 hover:grayscale-0 hover:border-mh-slate-600',
      )}
      style={{
        boxShadow: isOwned && rarityCfg
          ? `0 4px 14px rgba(0,0,0,0.5), 0 0 10px ${rarityCfg.glowColor}`
          : '0 4px 10px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Decorative Outer Corner Accents */}
      <div className="pointer-events-none absolute inset-0.5 rounded border border-black/15" />

      {/* Center Art Area: Monster Portrait */}
      <div className="relative flex flex-1 w-full items-center justify-center overflow-hidden rounded">
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={card.name}
            onError={() => setImageError(true)}
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow-md filter transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/20 text-amber-900 font-display font-bold text-xs">
            {card.name.slice(0, 3).toUpperCase()}
          </div>
        )}
      </div>

      {/* Bottom Row / Badges & Collection Controls */}
      <div className="relative w-full flex items-end justify-between mt-auto gap-1">
        {/* Bottom Left Badge: Ink Icon + Points */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded px-1 py-0.5 shadow-sm',
            'bg-black/80 border border-amber-500/40 text-white min-w-[20px]',
          )}
        >
          <div className={cn('text-xs flex items-center justify-center', inkCfg.text)}>
            <InkIconComponent iconName={inkCfg.iconName} size={10} />
          </div>
          <span className="font-display text-[10px] sm:text-[11px] font-bold leading-none text-amber-300">
            {card.points}
          </span>
        </div>

        {/* Bottom Right: Rarity Ball Selector + Quantity Circle Ball */}
        <div
          className="relative flex items-center gap-1 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Small Rarity Ball Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowQtyMenu(false);
              setShowRarityMenu((prev) => !prev);
            }}
            title={
              isOwned && currentRarity
                ? `Rarity: ${VISAGE_RARITY_CONFIG[currentRarity].name} (Click to change)`
                : 'Click to mark as owned in collection'
            }
            className={cn(
              'flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-125 focus:outline-none',
              isOwned && currentRarity
                ? cn(VISAGE_RARITY_CONFIG[currentRarity].dotClass, 'ring-1')
                : 'border border-dashed border-mh-slate-400 bg-black/50 text-mh-slate-400 hover:border-mh-gold-400 hover:text-white',
            )}
          >
            {isOwned && currentRarity ? (
              <span className="text-[8px] font-extrabold leading-none">
                {currentRarity[0].toUpperCase()}
              </span>
            ) : (
              <Plus size={9} />
            )}
          </button>

          {/* Small Quantity Circle Button (1 - 5+) */}
          {isOwned && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRarityMenu(false);
                setShowQtyMenu((prev) => !prev);
              }}
              title={`Quantity owned: ${currentQty >= 5 ? '5+' : currentQty} (Click to change)`}
              className={cn(
                'flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-125 focus:outline-none',
                'bg-black/85 border border-amber-500/40 text-amber-300 hover:border-amber-400',
              )}
            >
              <span className="text-[8px] sm:text-[9px] font-black leading-none">
                {currentQty >= 5 ? '5+' : currentQty}
              </span>
            </button>
          )}

          {/* Rarity Selection Popup Menu */}
          {showRarityMenu && (
            <div
              ref={menuRef}
              className="absolute bottom-6 right-0 z-50 w-36 rounded-xl border border-mh-gold-500/40 bg-mh-slate-950 p-1.5 shadow-2xl animate-in zoom-in-95 duration-100"
              style={{
                boxShadow: '0 10px 25px rgba(0,0,0,0.8), 0 0 15px rgba(234,179,8,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-mh-slate-400 border-b border-mh-slate-800">
                Card Rarity
              </div>

              <div className="py-1 space-y-0.5">
                {VISAGE_RARITY_OPTIONS.map((rarityKey) => {
                  const cfg = VISAGE_RARITY_CONFIG[rarityKey];
                  const isSelected = currentRarity === rarityKey;
                  return (
                    <button
                      key={rarityKey}
                      type="button"
                      onClick={() => {
                        onSetRarity?.(rarityKey, 1);
                        setShowRarityMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between rounded-lg px-2 py-1 text-[11px] font-bold transition-all',
                        isSelected
                          ? 'bg-mh-slate-800 text-white ring-1 ring-mh-gold-400'
                          : 'text-mh-slate-300 hover:bg-mh-slate-800/80 hover:text-white',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn('h-2.5 w-2.5 rounded-full shadow-sm', cfg.dotClass)} />
                        <span>{cfg.name}</span>
                      </div>
                      <span className="text-[9px] text-mh-slate-500 font-normal">
                        ({cfg.colorName})
                      </span>
                    </button>
                  );
                })}
              </div>

              {isOwned && (
                <div className="pt-1 border-t border-mh-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveFromCollection?.();
                      setShowRarityMenu(false);
                    }}
                    className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/15 transition-colors"
                  >
                    <Trash2 size={11} />
                    <span>Unown / Remove</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quantity Selection Popup Menu (1 - 5+) */}
          {showQtyMenu && isOwned && (
            <div
              ref={qtyMenuRef}
              className="absolute bottom-6 right-0 z-50 w-32 rounded-xl border border-mh-gold-500/40 bg-mh-slate-950 p-1.5 shadow-2xl animate-in zoom-in-95 duration-100"
              style={{
                boxShadow: '0 10px 25px rgba(0,0,0,0.8), 0 0 15px rgba(234,179,8,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-mh-slate-400 border-b border-mh-slate-800">
                Count Owned
              </div>

              <div className="grid grid-cols-5 gap-1 py-1.5 px-0.5">
                {[1, 2, 3, 4, 5].map((q) => {
                  const isSelected = currentQty === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        onSetQuantity?.(q);
                        setShowQtyMenu(false);
                      }}
                      className={cn(
                        'flex h-7 items-center justify-center rounded-lg text-xs font-bold transition-all border',
                        isSelected
                          ? 'bg-mh-gold-500 text-slate-950 border-mh-gold-400 font-extrabold shadow-sm'
                          : 'bg-mh-slate-900 text-mh-slate-300 border-mh-slate-750 hover:bg-mh-slate-800 hover:text-white',
                      )}
                    >
                      {q === 5 ? '5+' : q}
                    </button>
                  );
                })}
              </div>
            </div>
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
