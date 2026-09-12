// ─────────────────────────────────────────────────────────────
// WeaponCard — Interactive grid card for Weapons in Investigation Notes
// Horizontal split design with full-height left-side weapon image showcase.
// ─────────────────────────────────────────────────────────────
import {
  Sword,
  Sparkles,
  CheckCircle2,
  Plus,
  Shield,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  Skull,
  Target,
  LogIn,
} from 'lucide-react';
import {
  type DBWeapon,
  type WeaponElementType,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  getRarityBadgeStyle,
} from '../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useAdminSkills } from '../../hooks/useAdminSkills';
import {
  type HunterChallenge,
  useIncrementChallenge,
} from '../../hooks/useHunterChallenges';
import { cn } from '../../lib/utils';

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
};

interface Props {
  weapon: DBWeapon;
  challenge?: HunterChallenge;
  isLoggedIn: boolean;
  onAddChallenge: (weapon: DBWeapon) => void;
  onOpenLogin: () => void;
  onInspect: () => void;
  isAddingChallenge?: boolean;
}

export default function WeaponCard({
  weapon,
  challenge,
  isLoggedIn,
  onAddChallenge,
  onOpenLogin,
  onInspect,
  isAddingChallenge,
}: Props) {
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: dbSkills = [] } = useAdminSkills({ isActive: true });
  const incrementChallenge = useIncrementChallenge();

  const weaponTypeObj = WEAPON_TYPES.find((w) => w.id === weapon.weapon_type_id);
  const monsterObj = weapon.monster_id ? monsters.find((m) => m.id === weapon.monster_id) : null;
  const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.general;
  const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
  const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;
  const glowTheme = ELEMENT_GLOWS[weapon.element_type] || ELEMENT_GLOWS.raw;

  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isCompleted = challenge?.status === 'completed';
  const isCrafted = (challenge?.current_rarity ?? 0) > 0;

  return (
    <div
      onClick={onInspect}
      className={cn(
        'group relative flex flex-col sm:flex-row rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-mh-gold-500/10',
        isTracked
          ? isCompleted
            ? 'border-emerald-500/40 bg-mh-slate-900 hover:border-emerald-500/60'
            : 'border-blue-500/40 bg-mh-slate-900 hover:border-blue-500/60'
          : 'border-mh-slate-750 bg-mh-slate-900 hover:border-mh-slate-600',
      )}
    >
      {/* ═══════════════════════════════════════════════════════
          LEFT SIDE: Full Weapon Showcase Image in Grid Box
         ═══════════════════════════════════════════════════════ */}
      <div
        className={cn(
          'w-full sm:w-[40%] md:w-[42%] shrink-0 min-h-[180px] sm:min-h-[220px] flex flex-col items-center justify-between p-3.5 relative overflow-hidden bg-gradient-to-b border-b sm:border-b-0 sm:border-r border-mh-slate-750/80',
          glowTheme,
        )}
      >
        {/* Subtle Ambient Radial Light */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-black/50" />

        {/* Top Badges over Left Image */}
        <div className="relative z-10 w-full flex items-center justify-between gap-1.5 flex-wrap">
          {/* Starting Rarity Badge */}
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-bold border font-mono shadow-sm',
              getRarityBadgeStyle(weapon.rarity || 1).badge,
            )}
          >
            {getRarityBadgeStyle(weapon.rarity || 1).label}
          </span>

          {/* Weapon Type Pill */}
          <span className="rounded bg-mh-slate-900/90 border border-mh-slate-750 px-2 py-0.5 text-[10px] font-bold text-mh-slate-300 shadow-sm">
            {weaponTypeObj?.name || weapon.weapon_type_id}
          </span>
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
      <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 min-w-0 bg-mh-slate-850/90">
        <div className="space-y-2">
          {/* Wrapped Weapon Title */}
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-mh-slate-100 group-hover:text-mh-gold-300 transition-colors break-words leading-tight">
              {weapon.name}
            </h3>

            {weapon.upgraded_name && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-300 font-medium break-words mt-1">
                <span className="text-mh-slate-500 text-[10px]">▲ Upgrades:</span>
                <span className="font-bold text-amber-200">{weapon.upgraded_name}</span>
                {weapon.upgrade_level && (
                  <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] px-1 py-0.2 font-mono">
                    Lv {weapon.upgrade_level}
                  </span>
                )}
              </div>
            )}

            {weapon.name_ja && !weapon.upgraded_name && (
              <p className="text-[11px] text-mh-slate-500 font-medium break-words mt-0.5">
                {weapon.name_ja}
              </p>
            )}
          </div>

          {/* Challenge Tracking Progress Status (if actively tracked) */}
          {isTracked && challenge && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-1.5 text-blue-300 min-w-0 truncate">
                  <Target size={13} className="text-blue-400 shrink-0" />
                  <span className="truncate">
                    {isCompleted
                      ? `✓ R${challenge.max_rarity} Mastered`
                      : isCrafted
                      ? `R${challenge.current_rarity} / R${challenge.max_rarity}`
                      : `Craft Goal (R${challenge.craft_rarity})`}
                  </span>
                </div>
                <span className="font-mono text-blue-400 shrink-0 ml-1">
                  {isCompleted ? '100%' : `${Math.round(((challenge.current_rarity || 0) / (challenge.max_rarity || 16)) * 100)}%`}
                </span>
              </div>
            </div>
          )}

          {/* Special Skill Tag */}
          {weapon.special_skill && (
            <div className="flex items-center gap-1.5 rounded-lg bg-mh-gold-500/10 border border-mh-gold-500/20 px-2 py-1 text-xs font-semibold text-mh-gold-400">
              <Sparkles size={12} className="shrink-0" />
              <span className="break-words leading-snug text-[11px]">{weapon.special_skill}</span>
            </div>
          )}

          {/* Attached Passive Skills */}
          {weapon.skills && weapon.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {weapon.skills.map((s, idx) => {
                const meta = dbSkills.find((d) => d.id === s.id);
                const ur = s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-mh-slate-900 border border-mh-slate-750 px-1.5 py-0.5 text-[10px] text-mh-slate-300"
                  >
                    <span>{meta?.name ?? s.id}</span>
                    <span className="font-bold text-mh-gold-400 font-mono">Lv{s.level}</span>
                    {ur && ur > 1 && (
                      <span className="rounded bg-amber-500/20 text-amber-300 px-1 py-0.2 text-[9px] font-bold border border-amber-500/40 font-mono">
                        Lv{ur}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Card Footer: Challenge Action Buttons */}
        <div className="mt-3 pt-2.5 border-t border-mh-slate-800 flex items-center justify-between gap-2">
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLogin();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-mh-slate-800 hover:bg-mh-slate-700 px-2.5 py-1 text-xs font-bold text-mh-slate-300 transition-all"
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
          ) : isTracked && challenge ? (
            isCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Mastered</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  incrementChallenge.mutateAsync(challenge);
                }}
                disabled={incrementChallenge.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 px-2.5 py-1 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <Plus size={13} />
                <span>{isCrafted ? `R${challenge.current_rarity + 1}` : `Craft (R${challenge.craft_rarity})`}</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddChallenge(weapon);
              }}
              disabled={isAddingChallenge}
              className="inline-flex items-center gap-1.5 rounded-xl bg-mh-gold-500/15 hover:bg-mh-gold-500/25 border border-mh-gold-500/30 text-mh-gold-300 px-2.5 py-1 text-xs font-bold transition-all"
            >
              <Target size={13} />
              <span>+ Challenge</span>
            </button>
          )}

          <span className="text-[11px] text-mh-slate-500 font-medium group-hover:text-mh-slate-300 shrink-0">
            Inspect &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}
