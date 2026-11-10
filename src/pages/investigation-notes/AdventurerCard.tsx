// ─────────────────────────────────────────────────────────────
// AdventurerCard — Streamlined card for MHO Playable Adventurers
// Displays icon, name, rarity, role, with element & weapon as compact icons
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Swords,
  Check,
  Plus,
} from 'lucide-react';
import {
  type DBAdventurer,
  ADVENTURER_MAX_INSIGHT,
  ADVENTURER_ROLE_CONFIG,
  adventurerRarityBorder,
  ELEMENT_OPTIONS,
} from '../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import { cn } from '../../lib/utils';
import AdventurerRarityBadge from './AdventurerRarityBadge';
import { ChallengeGoalMenu, InsightPicker } from './AdventurerInsight';
import { ROLE_ICONS } from '../../components/RoleIcon';
import ElementIcon from '../../components/ElementIcon';

const WEAPON_ICON_MAP: Record<string, string> = {
  great_sword: '/images/weapons/ArmsIcon/ArmsIcon_Sword.png',
  long_sword: '/images/weapons/ArmsIcon/ArmsIcon_Sword.png',
  sword_shield: '/images/weapons/ArmsIcon/ArmsIcon_Knife.png',
  dual_blades: '/images/weapons/ArmsIcon/ArmsIcon_DoubleSword.png',
  hammer: '/images/weapons/ArmsIcon/ArmsIcon_Hammer.png',
  lance: '/images/weapons/ArmsIcon/ArmsIcon_LongSpear.png',
  heavy_bowgun: '/images/weapons/ArmsIcon/ArmsIcon_HeavyCatapult.png',
  charge_blade: '/images/weapons/ArmsIcon/ArmsIcon_ShieldAxe.png',
  bow: '/images/weapons/ArmsIcon/ArmsIcon_Arch.png',
  hunting_horn: '/images/weapons/ArmsIcon/ArmsIcon_Hammer.png',
  gunlance: '/images/weapons/ArmsIcon/ArmsIcon_LongSpear.png',
  switch_axe: '/images/weapons/ArmsIcon/ArmsIcon_ShieldAxe.png',
  insect_glaive: '/images/weapons/ArmsIcon/ArmsIcon_LongSpear.png',
  light_bowgun: '/images/weapons/ArmsIcon/ArmsIcon_HeavyCatapult.png',
};

interface AdventurerCardProps {
  adventurer: DBAdventurer;
  isRecruited?: boolean;
  /** 1-7 when recruited, 0 otherwise. */
  insightLevel?: number;
  challenge?: HunterChallenge;
  onToggleRecruit?: () => void;
  onSetInsight?: (level: number) => void;
  onAddChallenge?: (adventurer: DBAdventurer, targetInsight: number) => void;
  onClick?: () => void;
  onSelectWeapon?: (weaponType: string) => void;
}

export default function AdventurerCard({
  adventurer,
  isRecruited = false,
  insightLevel = 0,
  challenge,
  onToggleRecruit,
  onSetInsight,
  onAddChallenge,
  onClick,
}: AdventurerCardProps) {
  const [imageError, setImageError] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);

  const isPlayerCharacter = adventurer.is_default;
  const navigate = useNavigate();

  const activeRecruited = isPlayerCharacter || isRecruited;
  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isChallengeDone = challenge?.status === 'completed';
  const currentInsight = activeRecruited ? Math.max(1, insightLevel) : 0;
  const showBackground = Boolean(adventurer.background_image) && !backgroundError;

  const roleKey = (adventurer.role === 'Disruptor' ? 'Disrupter' : adventurer.role) as 'Assault' | 'Disrupter' | 'Support';
  const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
  const RoleIcon = ROLE_ICONS[roleKey] || ROLE_ICONS.Assault;
  const elemCfg = ELEMENT_OPTIONS[adventurer.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;

  const activeWeaponId = adventurer.weapon_type || 'sword_shield';
  const activeWeaponObj = WEAPON_TYPES.find((w) => w.id === activeWeaponId);
  const weaponIconSrc = WEAPON_ICON_MAP[activeWeaponId];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${adventurer.name} — Click to inspect`}
      style={adventurerRarityBorder(adventurer.rarity, activeRecruited)}
      className={cn(
        'group relative isolate overflow-hidden flex flex-col justify-between rounded-2xl border cursor-pointer select-none transition-all duration-200 p-3.5 sm:p-4 shadow-md hover:scale-[1.01] hover:shadow-xl hover:z-10 min-w-0 max-w-full',
        activeRecruited
          ? isPlayerCharacter
            ? 'border-mh-gold-500/60 bg-gradient-to-b from-[#241e15] via-[#161926] to-[#121520] hover:border-mh-gold-400 shadow-mh-gold-500/10'
            : roleKey === 'Assault'
              ? 'border-red-500/50 bg-gradient-to-b from-[#201416] via-[#161926] to-[#121520] hover:border-red-400 shadow-red-500/10'
              : roleKey === 'Disrupter'
                ? 'border-purple-500/50 bg-gradient-to-b from-[#1b1424] via-[#161926] to-[#121520] hover:border-purple-400 shadow-purple-500/10'
                : 'border-emerald-500/50 bg-gradient-to-b from-[#13201a] via-[#161926] to-[#121520] hover:border-emerald-400 shadow-emerald-500/10'
          : 'border-mh-slate-800 bg-[#131622]/90 hover:border-mh-slate-700',
        isTracked && !isChallengeDone && 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-black',
      )}
    >
      {/* Panel background art, dimmed so foreground stays clear */}
      {showBackground && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl -z-10">
          <img
            src={adventurer.background_image!}
            alt=""
            onError={() => setBackgroundError(true)}
            className={cn(
              'h-full w-full object-cover transition-all duration-300 group-hover:scale-105',
              activeRecruited ? 'opacity-40' : 'opacity-20 grayscale',
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d14] via-[#0b0d14]/70 to-[#0b0d14]/40" />
        </div>
      )}

      {/* Main Content: Portrait Icon on Left, Name & Compact Badges on Right */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Adventurer Icon / Portrait */}
        <div className="relative h-18 w-18 sm:h-22 sm:w-22 shrink-0 flex items-center justify-center">
          {adventurer.image && !imageError ? (
            <img
              src={adventurer.image}
              alt={adventurer.name}
              className="h-full w-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <User
              size={36}
              className={cn(
                'transition-colors',
                activeRecruited ? (isPlayerCharacter ? 'text-mh-gold-400' : roleCfg.text) : 'text-mh-slate-500',
              )}
            />
          )}
        </div>

        {/* Right Info: Name + Badges */}
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          {/* Name Row */}
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <h3
              className={cn(
                'font-display text-sm sm:text-base font-bold transition-colors truncate',
                activeRecruited ? 'text-mh-slate-100 group-hover:text-mh-gold-300' : 'text-mh-slate-200 group-hover:text-mh-gold-300',
              )}
            >
              {adventurer.name}
            </h3>

            {isPlayerCharacter && (
              <span className="shrink-0 rounded bg-mh-gold-500/20 border border-mh-gold-500/40 px-1.5 py-0.2 text-[9px] font-bold text-mh-gold-300 uppercase">
                You
              </span>
            )}

            {(adventurer.status === 'not_in_game' || adventurer.is_spoiler) && (
              <span
                className="shrink-0 rounded bg-amber-500/25 border border-amber-500/50 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 uppercase tracking-wider"
                title="***Spoiler***"
              >
                Coming
              </span>
            )}
          </div>

          {/* Badges: Rarity, Role, Element (icon only), Weapon (icon only) */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* Rarity */}
            <AdventurerRarityBadge rarity={adventurer.rarity} className="!rounded !px-1.5 !py-0.5 !text-[10px]" />

            {/* Role */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-bold border shadow-xs',
                roleCfg.bg,
                roleCfg.text,
                roleCfg.border,
              )}
            >
              <RoleIcon size={16} />
              <span>{roleCfg.label}</span>
            </span>

            {/* Element: Just the icon */}
            <span
              title={`Element: ${elemCfg.label}`}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-lg border shadow-xs shrink-0',
                elemCfg.bg,
                elemCfg.border,
              )}
            >
              <ElementIcon element={adventurer.element_specialization || 'raw'} size={14} />
            </span>

            {/* Weapon: Just the icon */}
            <span
              title={`Weapon: ${activeWeaponObj?.name || activeWeaponId}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-mh-slate-700 bg-mh-slate-900/90 shadow-xs shrink-0"
            >
              {weaponIconSrc ? (
                <img
                  src={weaponIconSrc}
                  alt={activeWeaponObj?.name || activeWeaponId}
                  className="h-4 w-4 object-contain brightness-110"
                />
              ) : (
                <Swords size={12} className="text-mh-gold-400" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Actions & Insight (Never extends out of panel) */}
      <div
        className="relative z-20 mt-3 pt-2.5 border-t border-mh-slate-800/80 flex items-center justify-between gap-2 flex-wrap min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Challenge or Default */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {isPlayerCharacter ? (
            <span
              title="Your primary player character is always available."
              className="flex h-6 items-center justify-center rounded-full bg-mh-gold-500/20 border border-mh-gold-500/40 px-2 text-[10px] font-black text-mh-gold-300 shrink-0"
            >
              Default
            </span>
          ) : isTracked && !isChallengeDone ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/challenges');
              }}
              className="flex h-6 items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 px-2 text-[10px] font-bold shadow-xs transition-all shrink-0 whitespace-nowrap"
            >
              <Check size={11} className="text-emerald-400" />
              <span>Challenge ➔</span>
            </button>
          ) : (
            currentInsight < ADVENTURER_MAX_INSIGHT && (
              <ChallengeGoalMenu
                currentLevel={currentInsight}
                onSelect={(target) => onAddChallenge?.(adventurer, target)}
                className="h-6 rounded-full px-2 text-[10px] hover:scale-105 shrink-0"
              />
            )
          )}
        </div>

        {/* Right: Insight Picker & Recruit Button */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {activeRecruited && (
            <InsightPicker
              level={currentInsight}
              onChange={(lvl) => onSetInsight?.(lvl)}
            />
          )}

          {!isPlayerCharacter && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRecruit?.();
              }}
              title={activeRecruited ? 'Recruited to your roster. Click to toggle.' : 'Click to recruit'}
              className={cn(
                'flex h-6 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold transition-all shrink-0 whitespace-nowrap',
                activeRecruited
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-300 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/50 hover:scale-105 active:scale-95'
                  : 'border border-mh-slate-700 bg-mh-slate-900/90 text-mh-slate-300 shadow-sm hover:scale-105 hover:border-mh-gold-500 hover:bg-mh-gold-500/20 hover:text-mh-gold-300',
              )}
            >
              {activeRecruited ? (
                <>
                  <Check size={11} strokeWidth={3} />
                  <span>Recruited</span>
                </>
              ) : (
                <>
                  <Plus size={11} />
                  <span>Recruit</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
