// ─────────────────────────────────────────────────────────────
// WeaponCard — Interactive grid card for Weapons in Investigation Notes
// Horizontal split design with full-height left-side weapon image showcase.
// Supports User Weapon Crafting & Rarity Level tracking (Visage Card style).
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sword,
  Sparkles,
  CheckCircle2,
  ArrowLeftRight,
  Shield,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  Skull,
  LogIn,
  Hammer,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponElementType,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  WEAPON_SHARPNESS_ICONS,
  getRarityBadgeStyle,
} from '../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import { cn } from '../../lib/utils';
import ChallengeIcon from '../../components/ChallengeIcon';

const ELEMENT_ICONS: Record<WeaponElementType, React.ComponentType<{ size?: number; className?: string }>> = {
  raw: Shield,
  fire: Flame,
  water: Droplets,
  thunder: Zap,
  ice: Snowflake,
  dragon: Sparkles,
  poison: Skull,
  paralysis: Zap,
  blast: Flame,
  sleep: Snowflake,
  stun: Zap,
};

const ELEMENT_GLOWS: Record<WeaponElementType, string> = {
  raw: 'from-mh-gold-500/10 via-mh-slate-900 to-mh-slate-950',
  fire: 'from-orange-600/15 via-red-950/20 to-mh-slate-950',
  water: 'from-blue-600/15 via-cyan-950/20 to-mh-slate-950',
  thunder: 'from-yellow-500/15 via-amber-950/20 to-mh-slate-950',
  ice: 'from-cyan-400/15 via-blue-950/20 to-mh-slate-950',
  dragon: 'from-red-600/20 via-purple-950/20 to-mh-slate-950',
  poison: 'from-purple-600/15 via-fuchsia-950/20 to-mh-slate-950',
  paralysis: 'from-yellow-500/15 via-amber-950/20 to-mh-slate-950',
  blast: 'from-rose-600/15 via-orange-950/20 to-mh-slate-950',
  sleep: 'from-indigo-500/15 via-blue-950/20 to-mh-slate-950',
  stun: 'from-yellow-400/15 via-amber-950/20 to-mh-slate-950',
};

interface Props {
  weapon: DBWeapon;
  challenge?: HunterChallenge;
  isLoggedIn: boolean;
  onAddChallenge: (weapon: DBWeapon) => void;
  onOpenLogin: () => void;
  onInspect: () => void;
  isAddingChallenge?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: (weapon: DBWeapon) => void;
  // User Weapon Crafting & Level Tracking Props
  isCrafted?: boolean;
  craftedRarity?: number | null;
  onSetCraftedRarity?: (weaponId: string, rarity: number) => void;
  onRemoveCrafted?: (weaponId: string) => void;
}

export default function WeaponCard({
  weapon,
  challenge,
  isLoggedIn,
  onAddChallenge,
  onOpenLogin,
  onInspect,
  isAddingChallenge = false,
  isSelectedForCompare = false,
  onToggleCompare,
  isCrafted: isCraftedProp,
  craftedRarity,
  onSetCraftedRarity,
  onRemoveCrafted,
}: Props) {
  const navigate = useNavigate();
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const [showRarityMenu, setShowRarityMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const weaponTypeObj = WEAPON_TYPES.find((w) => w.id === weapon.weapon_type_id);
  const monsterObj = weapon.monster_id ? monsters.find((m) => m.id === weapon.monster_id) : null;
  const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.unknown;
  const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
  const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;
  const glowTheme = ELEMENT_GLOWS[weapon.element_type] || ELEMENT_GLOWS.raw;

  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isCompleted = challenge?.status === 'completed';

  // Crafting state: from props or fallback to challenge progression
  const isUserCrafted = Boolean(craftedRarity || isCraftedProp);
  const activeCraftedRarity = craftedRarity ?? (challenge && challenge.current_rarity > 0 ? challenge.current_rarity : null);

  // Available upgrade rarities for this weapon (from starting rarity to max_rarity)
  const minRarity = weapon.rarity || 1;
  const maxRarity = Math.max(minRarity, weapon.max_rarity || minRarity);
  const rarityOptions: number[] = [];
  for (let r = minRarity; r <= maxRarity; r++) {
    rarityOptions.push(r);
  }

  // Close rarity popup on click / touch outside
  useEffect(() => {
    if (!showRarityMenu) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRarityMenu(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
    };
  }, [showRarityMenu]);

  const craftedBadgeStyle = activeCraftedRarity ? getRarityBadgeStyle(activeCraftedRarity) : null;

  return (
    <div
      onClick={onInspect}
      className={cn(
        'group relative flex flex-col sm:flex-row rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-mh-gold-500/10',
        showRarityMenu ? 'z-50' : 'hover:z-20',
        isSelectedForCompare
          ? 'border-amber-400 ring-2 ring-amber-400/80 bg-mh-slate-850 shadow-xl shadow-amber-500/10 opacity-100 grayscale-0'
          : isUserCrafted && craftedBadgeStyle
          ? cn('bg-mh-slate-900 opacity-100 grayscale-0 ring-1', craftedBadgeStyle.border, 'hover:border-mh-gold-400')
          : isTracked
          ? isCompleted
            ? 'border-emerald-500/40 bg-mh-slate-900 opacity-100 grayscale-0 hover:border-emerald-500/60'
            : 'border-yellow-500/40 bg-mh-slate-900 opacity-100 grayscale-0 hover:border-yellow-500/60'
          : 'border-mh-slate-800 bg-mh-slate-900/90 opacity-65 grayscale hover:opacity-100 hover:grayscale-0 hover:border-mh-slate-600',
      )}
    >
      {/* ═══════════════════════════════════════════════════════
          LEFT SIDE: Full Weapon Showcase Image in Grid Box
         ═══════════════════════════════════════════════════════ */}
      <div
        className={cn(
          'w-full sm:w-[40%] md:w-[42%] shrink-0 min-h-[180px] sm:min-h-[220px] flex flex-col items-center justify-between p-3.5 relative rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl overflow-hidden bg-gradient-to-b border-b sm:border-b-0 sm:border-r border-mh-slate-750/80',
          glowTheme,
        )}
      >
        {/* Subtle Ambient Radial Light */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-black/50" />

        {/* Top Badges over Left Image */}
        <div className="relative z-10 w-full flex items-center justify-between gap-1.5 flex-wrap">
          {/* Starting / Crafted Rarity Badge & Interactive Selector */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isUserCrafted && activeCraftedRarity ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRarityMenu((prev) => !prev);
                }}
                title={`Crafted at Rarity ${activeCraftedRarity}. Click to change level.`}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border font-mono shadow-sm transition-transform hover:scale-105',
                  craftedBadgeStyle?.badge,
                )}
              >
                <Check size={10} className="stroke-[3]" />
                <span>R{activeCraftedRarity}</span>
              </button>
            ) : (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold border font-mono shadow-sm',
                  getRarityBadgeStyle(weapon.rarity || 1).badge,
                )}
                title={`Starting Rarity: R${weapon.rarity || 1}`}
              >
                {getRarityBadgeStyle(weapon.rarity || 1).label}
              </span>
            )}

            {/* Quick-Craft plus button if uncrafted */}
            {!isUserCrafted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRarityMenu((prev) => !prev);
                }}
                title="Click to select crafted rarity level"
                className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-mh-slate-500 bg-black/60 text-mh-slate-300 hover:border-mh-gold-400 hover:text-white hover:scale-110 transition-all shadow-xs"
              >
                <Plus size={11} />
              </button>
            )}
          </div>

          {/* Weapon Type Pill */}
          <span className="rounded bg-mh-slate-900/90 border border-mh-slate-750 px-2 py-0.5 text-[10px] font-bold text-mh-slate-300 shadow-sm">
            {weaponTypeObj?.name || weapon.weapon_type_id}
          </span>

          {/* Comparing Badge */}
          {isSelectedForCompare && (
            <span className="rounded bg-amber-500/30 border border-amber-400/60 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 shadow-sm">
              Comparing
            </span>
          )}
        </div>

        {/* Hero Artwork Centered */}
        <div className="relative z-10 flex-1 w-full my-2 flex items-center justify-center min-h-[100px] sm:min-h-[120px]">
          {weapon.image ? (
            <img
              src={weapon.image}
              alt={weapon.name}
              className="max-h-28 sm:max-h-36 w-full object-contain filter drop-shadow-[0_10px_16px_rgba(0,0,0,0.7)] brightness-95 group-hover:scale-108 transition-transform duration-300 ease-out"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Sword size={36} className="text-mh-slate-600" />
          )}
        </div>

        {/* Bottom Badges on Left Image */}
        <div className="relative z-10 w-full flex items-center justify-between gap-1">
          {/* Element / Status Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border shadow-sm',
              elemCfg.bg,
              elemCfg.text,
              elemCfg.border,
            )}
          >
            <ElIcon size={11} className={elemCfg.color} />
            <span>{elemCfg.label}</span>
          </span>

          {/* Source Origin */}
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-bold border shadow-sm truncate max-w-[100px]',
              srcCfg.bg,
              srcCfg.text,
              srcCfg.border,
            )}
          >
            {monsterObj ? monsterObj.name : srcCfg.label}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RIGHT SIDE: Details, Skills & Challenge Action Buttons
         ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 min-w-0 bg-mh-slate-850/90 rounded-b-2xl sm:rounded-b-none sm:rounded-r-2xl">
        <div className="space-y-2">
          {/* Wrapped Weapon Title */}
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-mh-slate-100 group-hover:text-mh-gold-300 transition-colors break-words leading-tight">
              {weapon.name}
            </h3>

            {weapon.series && (
              <p className="text-[11px] text-mh-slate-500 font-medium break-words mt-0.5">{weapon.series}</p>
            )}
            {weapon.is_spoiler && (
              <span className="mt-1 inline-block rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                Spoiler
              </span>
            )}

            {weapon.name_ja && (
              <p className="text-[11px] text-mh-slate-500 font-medium break-words mt-0.5">
                {weapon.name_ja}
              </p>
            )}
          </div>

          {/* Challenge Tracking Progress Status (if actively tracked) */}
          {isTracked && challenge && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-1.5 text-yellow-300 min-w-0 truncate">
                  <ChallengeIcon size={16} />
                  <span className="truncate">
                    {isCompleted
                      ? `✓ R${challenge.max_rarity} Mastered`
                      : activeCraftedRarity
                      ? `R${activeCraftedRarity} / R${challenge.max_rarity}`
                      : `Craft Goal (R${challenge.craft_rarity})`}
                  </span>
                </div>
                <span className="font-mono text-yellow-400 shrink-0 ml-1">
                  {isCompleted ? '100%' : `${Math.round(((activeCraftedRarity || 0) / (challenge.max_rarity || 16)) * 100)}%`}
                </span>
              </div>
            </div>
          )}

          {/* Core stats at starting rarity */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {weapon.attack !== null && (
              <span className="rounded bg-mh-slate-900 border border-mh-slate-750 px-1.5 py-0.5 font-mono text-mh-slate-200">
                ATK <span className="font-bold text-mh-gold-400">{weapon.attack}</span>
              </span>
            )}
            {weapon.affinity !== null && weapon.affinity !== 0 && (
              <span className="rounded bg-mh-slate-900 border border-mh-slate-750 px-1.5 py-0.5 font-mono text-mh-slate-300">
                AFF <span className="font-bold text-mh-slate-100">{weapon.affinity > 0 ? `+${weapon.affinity / 100}%` : `${weapon.affinity / 100}%`}</span>
              </span>
            )}
            {weapon.element_type !== 'raw' && (
              <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono', elemCfg.bg, elemCfg.text, elemCfg.border)}>
                <ElIcon size={10} />
                {elemCfg.label}{weapon.element_damage ? ` ${weapon.element_damage}` : ''}
              </span>
            )}
            {weapon.sharpness && WEAPON_SHARPNESS_ICONS[weapon.sharpness] && (
              <img src={WEAPON_SHARPNESS_ICONS[weapon.sharpness]} alt={weapon.sharpness} title={`${weapon.sharpness} sharpness`} className="h-3 w-auto" />
            )}
          </div>

          {/* Apex effect tag */}
          {weapon.apex_effect && (
            <div className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500/10 border border-mh-gold-500/20 px-2 py-1 text-xs font-semibold text-mh-gold-400">
              <Sparkles size={12} className="shrink-0" />
              <span className="break-words leading-snug text-[11px]">{weapon.apex_effect.name}</span>
            </div>
          )}
        </div>

        {/* Card Footer: Craft Button, Challenge Action Buttons & Compare Button */}
        <div className="mt-3 pt-2.5 border-t border-mh-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              {/* Interactive Craft Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRarityMenu((prev) => !prev);
                }}
                title={
                  isUserCrafted
                    ? `Crafted at Rarity ${activeCraftedRarity}. Click to change level.`
                    : 'Click to mark as crafted at a rarity level'
                }
                className={cn(
                  'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all shadow-sm',
                  isUserCrafted && craftedBadgeStyle
                    ? cn(
                        'border',
                        craftedBadgeStyle.bg,
                        craftedBadgeStyle.text,
                        craftedBadgeStyle.border,
                        'hover:brightness-125 ring-1 ring-white/10',
                      )
                    : 'border border-dashed border-mh-slate-600 bg-mh-slate-800/80 text-mh-slate-300 hover:border-mh-gold-400 hover:text-white',
                )}
              >
                <Hammer size={12} className={isUserCrafted ? 'text-current' : 'text-mh-slate-400'} />
                <span>{isUserCrafted && activeCraftedRarity ? `R${activeCraftedRarity} Crafted` : '+ Craft'}</span>
              </button>

              {/* Challenge Button */}
              {!isLoggedIn ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLogin();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-mh-slate-800 hover:bg-mh-slate-750 px-2 py-1 text-xs font-bold text-mh-slate-300 transition-all"
                >
                  <LogIn size={12} />
                  <span>Sign In</span>
                </button>
              ) : isTracked && challenge ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/challenges');
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 px-2 py-1 text-xs font-bold transition-all shadow-sm"
                >
                  <CheckCircle2 size={12} />
                  <span>Challenge ➔</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChallenge(weapon);
                  }}
                  disabled={isAddingChallenge}
                  className="inline-flex items-center gap-1 rounded-xl border border-sky-600/50 bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-500 hover:text-sky-200 px-2 py-1 text-xs font-bold transition-all shadow-sm"
                >
                  <ChallengeIcon size={14} />
                  <span>+ Goal</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-mh-slate-500 font-medium group-hover:text-mh-slate-300 shrink-0">
              Inspect &rarr;
            </span>
          </div>

          {/* Select / De-Select to Compare Button */}
          {onToggleCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(weapon);
              }}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-3 text-xs font-bold transition-all duration-150 shadow-sm',
                isSelectedForCompare
                  ? 'border border-amber-500/80 bg-amber-500/25 text-amber-300 hover:bg-amber-500/35 hover:border-amber-400'
                  : 'border border-mh-slate-700 bg-mh-slate-800/80 text-mh-slate-300 hover:bg-mh-slate-750 hover:text-white hover:border-mh-slate-600',
              )}
            >
              <ArrowLeftRight size={13} className={isSelectedForCompare ? 'text-amber-400' : 'text-mh-slate-400'} />
              <span>{isSelectedForCompare ? 'De-Select to Compare' : 'Select to Compare'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CRAFTED RARITY LEVEL SELECTION POPUP MENU (Visage Card Style)
         ═══════════════════════════════════════════════════════ */}
      {showRarityMenu && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-2 top-10 sm:left-3 w-52 rounded-2xl border border-mh-gold-500/40 bg-mh-slate-950 p-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{
            boxShadow: '0 10px 25px rgba(0,0,0,0.85), 0 0 15px rgba(234,179,8,0.2)',
          }}
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 border-b border-mh-slate-800 flex items-center justify-between">
            <span>Crafted Level</span>
            <span className="text-[9px] text-mh-gold-400">R{minRarity} - R{maxRarity}</span>
          </div>

          <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
            {rarityOptions.map((r) => {
              const rStyle = getRarityBadgeStyle(r);
              const isSelected = activeCraftedRarity === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetCraftedRarity?.(weapon.id, r);
                    setShowRarityMenu(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-bold transition-all',
                    isSelected
                      ? 'bg-mh-slate-800 text-white ring-1 ring-mh-gold-400'
                      : 'text-mh-slate-300 hover:bg-mh-slate-800/80 hover:text-white',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-mono font-bold border', rStyle.badge)}>
                      {rStyle.label}
                    </span>
                    <span>Rarity {r}</span>
                  </div>
                  {isSelected && <Check size={13} className="text-mh-gold-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {isUserCrafted && (
            <div className="pt-1.5 mt-1 border-t border-mh-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveCrafted?.(weapon.id);
                  setShowRarityMenu(false);
                }}
                className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              >
                <Trash2 size={12} className="shrink-0" />
                <span>Mark as Uncrafted</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
