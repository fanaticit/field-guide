// ─────────────────────────────────────────────────────────────
// AdventurerModal — Detailed Inspection Dialog for MHO Adventurers
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  X,
  User,
  Swords,
  Zap,
  Heart,
  Sparkles,
  Info,
  CheckCircle2,
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

interface AdventurerModalProps {
  adventurer: DBAdventurer | null;
  open: boolean;
  onClose: () => void;
  isRecruited?: boolean;
  onToggleRecruit?: () => void;
  onSelectWeapon?: (weapon: string) => void;
}

export default function AdventurerModal({
  adventurer,
  open,
  onClose,
  isRecruited = false,
  onToggleRecruit,
  onSelectWeapon,
}: AdventurerModalProps) {
  const [imageError, setImageError] = useState(false);

  if (!open || !adventurer) return null;

  const roleKey = (adventurer.role === 'Disruptor' ? 'Disrupter' : adventurer.role) as 'Assault' | 'Disrupter' | 'Support';
  const roleCfg = ADVENTURER_ROLE_CONFIG[roleKey] || ADVENTURER_ROLE_CONFIG.Assault;
  const RoleIcon = ROLE_ICONS[roleKey] || Swords;
  const elemCfg = ELEMENT_OPTIONS[adventurer.element_specialization || 'raw'] || ELEMENT_OPTIONS.raw;
  const activeWeaponObj = WEAPON_TYPES.find((w) => w.id === adventurer.weapon_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-150',
          'bg-gradient-to-b from-[#161a26] to-[#0f121a]',
          isRecruited
            ? 'border-mh-gold-500/50 shadow-mh-gold-500/10'
            : 'border-mh-slate-800 shadow-black/50',
        )}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-mh-slate-800 bg-mh-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            {adventurer.is_default && (
              <span className="flex items-center gap-1 rounded-lg bg-mh-gold-500 px-2.5 py-1 text-xs font-black text-mh-slate-950 shadow-sm">
                <Sparkles size={13} />
                <span>Your Hunter</span>
              </span>
            )}

            {/* Role Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border shadow-sm',
                roleCfg.bg,
                roleCfg.text,
                roleCfg.border,
              )}
            >
              <RoleIcon size={13} />
              <span>{roleCfg.label}</span>
            </span>

            {/* Element Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border',
                elemCfg.bg,
                elemCfg.text,
                elemCfg.border,
              )}
            >
              <span>{elemCfg.label} Affinity</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Identity & Portrait */}
          <div className="flex items-center gap-5">
            <div
              className={cn(
                'relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-md',
                isRecruited
                  ? 'border-mh-gold-500/40 bg-black/50 ring-2 ring-mh-gold-500/20'
                  : 'border-mh-slate-800 bg-black/30',
              )}
            >
              {adventurer.image && !imageError ? (
                <img
                  src={adventurer.image}
                  alt={adventurer.name}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <User size={42} className={isRecruited ? 'text-mh-gold-400' : 'text-mh-slate-600'} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-bold text-mh-slate-100">
                  {adventurer.name}
                </h2>
                {adventurer.name_ja && (
                  <span className="text-sm text-mh-slate-400 font-medium">
                    ({adventurer.name_ja})
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-mh-slate-500 mt-1">
                Identifier: <span className="text-mh-slate-400">{adventurer.id}</span>
              </p>
              <p className="text-xs text-mh-slate-400 mt-1">
                Aesoland Adventurer &bull; Monster Hunter Outlanders
              </p>
            </div>
          </div>

          {/* Hunter Recruitment Status Card */}
          <div className="rounded-xl border border-mh-gold-500/30 bg-mh-slate-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-gold-400">
                <CheckCircle2 size={15} className="text-mh-gold-400" />
                <span>Hunter Roster Status</span>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                  isRecruited
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-mh-slate-800 text-mh-slate-400 border border-mh-slate-700',
                )}
              >
                {adventurer.is_default
                  ? 'Active Player Character'
                  : isRecruited
                    ? 'Recruited to Roster'
                    : 'Not Recruited'}
              </span>
            </div>

            {!adventurer.is_default && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-mh-slate-800">
                <p className="text-xs text-mh-slate-400">
                  {isRecruited
                    ? 'This adventurer is marked as recruited in your personal field guide.'
                    : 'Mark this adventurer as recruited when unlocked in Monster Hunter Outlanders.'}
                </p>

                <button
                  type="button"
                  onClick={onToggleRecruit}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0',
                    isRecruited
                      ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
                      : 'bg-mh-gold-500 text-mh-slate-950 hover:bg-mh-gold-400 shadow-sm',
                  )}
                >
                  {isRecruited ? (
                    <>
                      <X size={13} />
                      <span>Unrecruit</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Mark Recruited</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Tactical Role Analysis */}
          <div className={cn('rounded-xl border p-4 space-y-1.5', roleCfg.bg, roleCfg.border)}>
            <div className="flex items-center gap-2">
              <RoleIcon size={16} className={roleCfg.text} />
              <h4 className={cn('text-xs font-bold uppercase tracking-wider', roleCfg.text)}>
                Tactical Role: {roleCfg.label}
              </h4>
            </div>
            <p className="text-xs text-mh-slate-300 leading-relaxed">
              {roleCfg.description}
            </p>
          </div>

          {/* Weapon Discipline */}
          <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-mh-gold-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-200">
                  Weapon Discipline
                </h4>
              </div>
              {adventurer.is_default && (
                <span className="text-[11px] font-bold text-mh-gold-400">
                  All 14 Weapons Available
                </span>
              )}
            </div>

            {adventurer.is_default ? (
              <div className="space-y-2">
                <p className="text-xs text-mh-slate-400">
                  As your customizable hunter, select your active weapon discipline:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1">
                  {WEAPON_TYPES.map((w) => {
                    const isSelected = w.id === adventurer.weapon_type;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onSelectWeapon?.(w.id)}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all',
                          isSelected
                            ? 'border-mh-gold-400 bg-mh-gold-500 text-mh-slate-950 font-bold shadow-sm'
                            : 'border-mh-slate-700 bg-mh-slate-800 text-mh-slate-300 hover:border-mh-gold-500/40 hover:text-white',
                        )}
                      >
                        <span className="truncate">{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-mh-slate-200 font-bold">
                    Primary: {activeWeaponObj?.name || adventurer.weapon_type || 'Unspecified'}
                  </span>
                  <span className="rounded bg-mh-slate-800 px-2 py-0.5 text-[10px] font-semibold text-mh-slate-400 border border-mh-slate-700">
                    Discipline
                  </span>
                </div>
                {adventurer.allowed_weapon_types && adventurer.allowed_weapon_types.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {adventurer.allowed_weapon_types.map((wt) => {
                      const weaponObj = WEAPON_TYPES.find((w) => w.id === wt);
                      return (
                        <span
                          key={wt}
                          className="rounded-md bg-mh-slate-800/90 border border-mh-slate-700 px-2 py-0.5 text-[11px] font-medium text-mh-slate-300"
                        >
                          {weaponObj?.name || wt}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Character Lore & Description */}
          {adventurer.description && (
            <div className="rounded-xl border border-mh-slate-750 bg-mh-slate-900/60 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-mh-slate-400 uppercase tracking-wider">
                <Info size={13} />
                <span>Character Lore &amp; Background</span>
              </div>
              <p className="text-xs text-mh-slate-300 leading-relaxed whitespace-pre-line">
                {adventurer.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {adventurer.notes && (
            <div className="rounded-xl border border-mh-slate-800 bg-mh-slate-950/50 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-mh-slate-400 uppercase tracking-wider">
                <Sparkles size={12} className="text-mh-gold-400" />
                <span>Field Guide Notes</span>
              </div>
              <p className="text-xs text-mh-slate-400 leading-relaxed">
                {adventurer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-mh-slate-800 bg-mh-slate-950/90 px-6 py-3 flex items-center justify-between text-xs text-mh-slate-500">
          <span>Monster Hunter Outlanders Adventurer</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-mh-slate-800 px-4 py-1.5 text-xs font-bold text-mh-slate-200 hover:bg-mh-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
