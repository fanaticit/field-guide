// ─────────────────────────────────────────────────────────────
// AdventurerCard — Card presentation for MHO Playable Adventurers with Recruitment Tracking
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  User,
  Sparkles,
  Swords,
  Zap,
  Heart,
  ChevronDown,
  Check,
  Plus,
} from 'lucide-react';
import {
  type DBAdventurer,
  ADVENTURER_ROLE_CONFIG,
  ELEMENT_OPTIONS,
} from '../../data/schemas/adventurer';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
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
  onToggleRecruit?: () => void;
  onClick?: () => void;
  onSelectWeapon?: (weaponType: string) => void;
}

export default function AdventurerCard({
  adventurer,
  isRecruited = false,
  onToggleRecruit,
  onClick,
  onSelectWeapon,
}: AdventurerCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showWeaponDropdown, setShowWeaponDropdown] = useState(false);

  const isPlayerCharacter = adventurer.is_default;
  const activeRecruited = isPlayerCharacter || isRecruited;

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
              ? 'border-red-500/40 bg-gradient-to-b from-[#201416] via-[#161926] to-[#121520] hover:border-red-400 shadow-red-500/10'
              : roleKey === 'Disrupter'
                ? 'border-purple-500/40 bg-gradient-to-b from-[#1b1424] via-[#161926] to-[#121520] hover:border-purple-400 shadow-purple-500/10'
                : 'border-emerald-500/40 bg-gradient-to-b from-[#13201a] via-[#161926] to-[#121520] hover:border-emerald-400 shadow-emerald-500/10'
          : 'border-mh-slate-800 bg-[#131622]/80 opacity-50 grayscale hover:opacity-90 hover:grayscale-0 hover:border-mh-slate-700',
      )}
    >
      {/* Top Badges & Recruitment Status */}
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

        {/* Recruitment Check / Toggle Ball */}
        <div className="relative z-20" onClick={(e) => e.stopPropagation()}>
          {isPlayerCharacter ? (
            <span
              title="Your primary player character is always available."
              className="flex h-6 items-center justify-center rounded-full bg-mh-gold-500/20 border border-mh-gold-500/40 px-2 text-[10px] font-black text-mh-gold-300"
            >
              Default
            </span>
          ) : activeRecruited ? (
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
              className="flex h-6 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold border border-mh-slate-700 bg-mh-slate-900/90 text-mh-slate-400 shadow-sm transition-all hover:scale-105 hover:border-mh-gold-500 hover:bg-mh-gold-500/20 hover:text-mh-gold-300"
            >
              <Plus size={11} />
              <span>Recruit</span>
            </button>
          )}
        </div>
      </div>

      {/* Center: Large Portrait & Name */}
      <div className="flex items-center gap-4 my-2">
        <div
          className={cn(
            'relative h-20 w-20 shrink-0 rounded-2xl bg-mh-slate-900 border p-1.5 overflow-hidden shadow-inner flex items-center justify-center transition-colors',
            activeRecruited
              ? isPlayerCharacter
                ? 'border-mh-gold-500/50 group-hover:border-mh-gold-400'
                : 'border-mh-slate-700 group-hover:border-mh-gold-500/40'
              : 'border-mh-slate-800',
          )}
        >
          {adventurer.image && !imageError ? (
            <img
              src={adventurer.image}
              alt={adventurer.name}
              className="h-full w-full object-contain filter group-hover:scale-105 transition-transform"
              onError={() => setImageError(true)}
            />
          ) : (
            <User
              size={36}
              className={cn(
                'transition-colors',
                activeRecruited ? (isPlayerCharacter ? 'text-mh-gold-400' : roleCfg.text) : 'text-mh-slate-600',
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={cn(
              'font-display text-base font-bold transition-colors truncate',
              activeRecruited ? 'text-mh-slate-100 group-hover:text-mh-gold-300' : 'text-mh-slate-400 group-hover:text-mh-slate-200',
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

      {/* Bottom Section: Weapon Type Control */}
      <div className="mt-4 pt-3 border-t border-mh-slate-800/80">
        {isPlayerCharacter ? (
          /* Default Character Weapon Switcher */
          <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-mh-gold-400 uppercase tracking-wider">
                Active Weapon
              </span>
              <span className="text-mh-slate-500 font-semibold">Changeable (All 14)</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWeaponDropdown((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-mh-gold-500/40 bg-mh-gold-500/10 px-3 py-2 text-xs font-bold text-mh-slate-100 hover:bg-mh-gold-500/20 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <Swords size={14} className="text-mh-gold-400 shrink-0" />
                  <span className="truncate">{activeWeaponObj?.name || activeWeaponId}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-mh-gold-400 transition-transform shrink-0',
                    showWeaponDropdown ? 'rotate-180' : '',
                  )}
                />
              </button>

              {showWeaponDropdown && (
                <div className="absolute bottom-full left-0 mb-1 z-30 w-full max-h-56 overflow-y-auto rounded-xl border border-mh-slate-700 bg-mh-slate-900 p-1.5 shadow-2xl space-y-0.5">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mh-slate-400 border-b border-mh-slate-800">
                    Switch Weapon Type
                  </p>
                  {WEAPON_TYPES.map((w) => {
                    const isSelected = w.id === activeWeaponId;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          onSelectWeapon?.(w.id);
                          setShowWeaponDropdown(false);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                          isSelected
                            ? 'bg-mh-gold-500 text-mh-slate-950 font-bold'
                            : 'text-mh-slate-300 hover:bg-mh-slate-800 hover:text-white',
                        )}
                      >
                        <span>{w.name}</span>
                        {isSelected && <Check size={13} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Fixed Weapon for Companion Adventurer */
          <div className="flex items-center justify-between text-xs">
            <span className="text-mh-slate-500 font-medium">Weapon Discipline:</span>
            <span className="flex items-center gap-1.5 font-bold text-mh-slate-200">
              <Swords size={13} className="text-mh-gold-400" />
              <span>{activeWeaponObj?.name || activeWeaponId}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
