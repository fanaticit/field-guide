// ─────────────────────────────────────────────────────────────
// AdventurerCard — Card presentation for MHO Playable Adventurers with Recruitment Tracking
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Sparkles,
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

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${adventurer.name} — Click to inspect`}
      style={adventurerRarityBorder(adventurer.rarity, activeRecruited)}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border cursor-pointer select-none transition-all duration-200 p-5 shadow-md hover:scale-[1.01] hover:shadow-xl hover:z-10',
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
      {/* Panel background art, dimmed so text stays readable */}
      {showBackground && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <img
            src={adventurer.background_image!}
            alt=""
            onError={() => setBackgroundError(true)}
            className={cn(
              'h-full w-full object-cover transition-all duration-300 group-hover:scale-105',
              activeRecruited ? 'opacity-60' : 'opacity-30 grayscale',
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d14] via-[#0b0d14]/60 to-[#0b0d14]/30" />
        </div>
      )}

      {/* Top Badges & Recruitment / Challenge Status */}
      <div className="relative flex flex-wrap items-center justify-between gap-y-2 gap-x-1.5 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {isPlayerCharacter ? (
            <span className="flex items-center gap-1 rounded-lg bg-mh-gold-500 px-2.5 py-0.5 text-xs font-black text-mh-slate-950 shadow-sm">
              <Sparkles size={12} />
              <span>Your Hunter</span>
            </span>
          ) : (
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border shadow-xs',
                roleCfg.bg,
                roleCfg.text,
                roleCfg.border,
              )}
            >
              <RoleIcon size={24} />
              <span>{roleCfg.label}</span>
            </span>
          )}

          {/* Element Specialization Badge */}
          <span
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold border shadow-xs',
              elemCfg.bg,
              elemCfg.text,
              elemCfg.border,
            )}
          >
            <span>{elemCfg.label}</span>
          </span>

          <AdventurerRarityBadge rarity={adventurer.rarity} />

          {(adventurer.status === 'not_in_game' || adventurer.is_spoiler) && (
            <span
              className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-xs"
              title="***Spoiler***"
            >
              <span>Coming</span>
            </span>
          )}
        </div>

        {/* Recruitment & Challenge Buttons */}
        <div className="relative z-20 flex items-center gap-1.5 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
          {isPlayerCharacter ? (
            <span
              title="Your primary player character is always available."
              className="flex h-6 items-center justify-center rounded-full bg-mh-gold-500/20 border border-mh-gold-500/40 px-2 text-[10px] font-black text-mh-gold-300 shrink-0"
            >
              Default
            </span>
          ) : (
            <>
              {/* Challenge: go to the open one, or pick a recruit / insight goal */}
              {isTracked && !isChallengeDone ? (
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

              {/* Recruitment Toggle Button */}
              {activeRecruited ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRecruit?.();
                  }}
                  title="Recruited to your roster. Click to toggle."
                  className="flex h-6 min-w-[24px] px-2 items-center justify-center gap-1 rounded-full text-[10px] font-black leading-none bg-emerald-500 text-slate-950 border border-emerald-300 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/50 hover:scale-105 active:scale-95 transition-transform shrink-0 whitespace-nowrap"
                >
                  <Check size={11} strokeWidth={3} />
                  <span>Recruited</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRecruit?.();
                  }}
                  title="Click to mark as recruited in your personal field guide"
                  className="flex h-6 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold border border-mh-slate-700 bg-mh-slate-900/90 text-mh-slate-300 shadow-sm transition-all hover:scale-105 hover:border-mh-gold-500 hover:bg-mh-gold-500/20 hover:text-mh-gold-300 shrink-0 whitespace-nowrap"
                >
                  <Plus size={11} />
                  <span>Recruit</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Center: Large Portrait & Name (No extra border on image, more visible) */}
      <div className="relative flex items-center gap-4 my-2">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 flex items-center justify-center">
          {adventurer.image && !imageError ? (
            <img
              src={adventurer.image}
              alt={adventurer.name}
              className="h-full w-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <User
              size={44}
              className={cn(
                'transition-colors',
                activeRecruited ? (isPlayerCharacter ? 'text-mh-gold-400' : roleCfg.text) : 'text-mh-slate-500',
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={cn(
              'font-display text-base sm:text-lg font-bold transition-colors truncate',
              activeRecruited ? 'text-mh-slate-100 group-hover:text-mh-gold-300' : 'text-mh-slate-200 group-hover:text-mh-gold-300',
            )}>
              {adventurer.name}
            </h3>
            {adventurer.name_ja && (
              <span className="text-xs text-mh-slate-500 truncate font-medium">({adventurer.name_ja})</span>
            )}
          </div>

          {(adventurer.status === 'not_in_game' || adventurer.is_spoiler) ? (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className="rounded border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 shadow-xs"
                title="***Spoiler***"
              >
                Coming
              </span>
              {adventurer.title && (
                <span className="text-xs font-semibold italic text-mh-gold-300 truncate">
                  {adventurer.title}
                </span>
              )}
            </div>
          ) : adventurer.title ? (
            <p className="text-xs font-semibold italic text-mh-gold-300 truncate mt-0.5">
              {adventurer.title}
            </p>
          ) : null}

          <p className="text-[11px] text-mh-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {adventurer.description || roleCfg.description}
          </p>
        </div>
      </div>

      {/* Bottom Section: Weapon Discipline */}
      <div className="relative mt-4 pt-3 border-t border-mh-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-mh-slate-500 font-medium">
            {isPlayerCharacter ? 'Active Weapon:' : 'Weapon Discipline:'}
          </span>
          <span className={cn('flex items-center gap-1.5 font-bold', isPlayerCharacter ? 'text-mh-gold-300' : 'text-mh-slate-200')}>
            <Swords size={13} className="text-mh-gold-400" />
            <span>{activeWeaponObj?.name || activeWeaponId}</span>
          </span>
        </div>

        {activeRecruited && (
          <div className="relative z-20 mt-2 flex items-center justify-between text-xs">
            <span className="text-mh-slate-500 font-medium">Insight:</span>
            <InsightPicker level={currentInsight} onChange={(lvl) => onSetInsight?.(lvl)} />
          </div>
        )}
      </div>
    </div>
  );
}
