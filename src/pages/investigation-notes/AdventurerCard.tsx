// ─────────────────────────────────────────────────────────────
// AdventurerCard — Card presentation for MHO Playable Adventurers with Recruitment Tracking
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Sparkles,
  Swords,
  Zap,
  Heart,
  Check,
  Plus,
  Target,
} from 'lucide-react';
import {
  type DBAdventurer,
  ADVENTURER_ROLE_CONFIG,
  ELEMENT_OPTIONS,
} from '../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import type { HunterChallenge } from '../../hooks/useHunterChallenges';
import { cn } from '../../lib/utils';

const ROLE_ICONS: Record<string, typeof Swords> = {
  Assault: Swords,
  Disrupter: Zap,
  Disruptor: Zap,
  Support: Heart,
};

interface AdventurerCardProps {
  adventurer: DBAdventurer;
  isRecruited?: boolean;
  challenge?: HunterChallenge;
  onToggleRecruit?: () => void;
  onAddChallenge?: (adventurer: DBAdventurer) => void;
  onClick?: () => void;
  onSelectWeapon?: (weaponType: string) => void;
}

export default function AdventurerCard({
  adventurer,
  isRecruited = false,
  challenge,
  onToggleRecruit,
  onAddChallenge,
  onClick,
}: AdventurerCardProps) {
  const [imageError, setImageError] = useState(false);

  const isPlayerCharacter = adventurer.is_default;
  const navigate = useNavigate();

  const activeRecruited = isPlayerCharacter || isRecruited;
  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isChallengeDone = challenge?.status === 'completed';

  const roleKey = (adventurer.role === 'Disruptor' ? 'Disrupter' : adventurer.role) as 'Assault' | 'Disrupter' | 'Support';
  const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
  const RoleIcon = ROLE_ICONS[roleKey] || Swords;
  const elemCfg = ELEMENT_OPTIONS[adventurer.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;

  const activeWeaponId = adventurer.weapon_type || 'sword_shield';
  const activeWeaponObj = WEAPON_TYPES.find((w) => w.id === activeWeaponId);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`${adventurer.name} — Click to inspect`}
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
        isTracked && !isChallengeDone && !activeRecruited && 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-black',
      )}
    >
      {/* Top Badges & Recruitment / Challenge Status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isPlayerCharacter ? (
            <span className="flex items-center gap-1 rounded-lg bg-mh-gold-500 px-2.5 py-0.5 text-xs font-black text-mh-slate-950 shadow-sm">
              <Sparkles size={12} />
              <span>Your Hunter</span>
            </span>
          ) : (
            <span
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold border shadow-xs',
                roleCfg.bg,
                roleCfg.text,
                roleCfg.border,
              )}
            >
              <RoleIcon size={12} />
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
        </div>

        {/* Recruitment & Challenge Buttons */}
        <div className="relative z-20 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isPlayerCharacter ? (
            <span
              title="Your primary player character is always available."
              className="flex h-6 items-center justify-center rounded-full bg-mh-gold-500/20 border border-mh-gold-500/40 px-2 text-[10px] font-black text-mh-gold-300"
            >
              Default
            </span>
          ) : (
            <>
              {/* Challenge Button if not already recruited */}
              {!activeRecruited && (
                isTracked && !isChallengeDone ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/challenges');
                    }}
                    className="flex h-6 items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 px-2 text-[10px] font-bold shadow-xs transition-all"
                  >
                    <Check size={11} className="text-emerald-400" />
                    <span>Go to Challenge ➔</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddChallenge?.(adventurer);
                    }}
                    title="Add recruitment challenge to Hunter's Challenges"
                    className="flex h-6 items-center gap-1 rounded-full px-2 text-[10px] font-bold border border-mh-gold-500/40 bg-mh-gold-500/15 text-mh-gold-300 shadow-xs transition-all hover:scale-105 hover:bg-mh-gold-500/25 hover:border-mh-gold-400"
                  >
                    <Target size={11} className="text-mh-gold-400" />
                    <span>+ Challenge</span>
                  </button>
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
                  className="flex h-6 min-w-[24px] px-2 items-center justify-center gap-1 rounded-full text-[10px] font-black leading-none bg-emerald-500 text-slate-950 border border-emerald-300 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/50 hover:scale-105 active:scale-95 transition-transform"
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
                  className="flex h-6 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold border border-mh-slate-700 bg-mh-slate-900/90 text-mh-slate-300 shadow-sm transition-all hover:scale-105 hover:border-mh-gold-500 hover:bg-mh-gold-500/20 hover:text-mh-gold-300"
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
      <div className="flex items-center gap-4 my-2">
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

          <p className="text-[11px] text-mh-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {adventurer.description || roleCfg.description}
          </p>
        </div>
      </div>

      {/* Bottom Section: Weapon Discipline */}
      <div className="mt-4 pt-3 border-t border-mh-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-mh-slate-500 font-medium">
            {isPlayerCharacter ? 'Active Weapon:' : 'Weapon Discipline:'}
          </span>
          <span className={cn('flex items-center gap-1.5 font-bold', isPlayerCharacter ? 'text-mh-gold-300' : 'text-mh-slate-200')}>
            <Swords size={13} className="text-mh-gold-400" />
            <span>{activeWeaponObj?.name || activeWeaponId}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
