// ─────────────────────────────────────────────────────────────
// WeaponCard — Interactive card for Weapons in Investigation Notes
// Full-color cards, multiline wrapped titles, and personal hunter challenge tracking.
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

  const isTracked = Boolean(challenge && challenge.status !== 'abandoned');
  const isCompleted = challenge?.status === 'completed';
  const isCrafted = (challenge?.current_rarity ?? 0) > 0;

  return (
    <div
      onClick={onInspect}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-mh-gold-500/5',
        isTracked
          ? isCompleted
            ? 'border-emerald-500/40 bg-mh-slate-850 hover:border-emerald-500/60'
            : 'border-blue-500/40 bg-mh-slate-850 hover:border-blue-500/60'
          : 'border-mh-slate-750 bg-mh-slate-850 hover:border-mh-slate-600',
      )}
    >
      <div>
        {/* Top Header Tags */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Weapon Type Pill */}
            <span className="rounded bg-mh-slate-800 border border-mh-slate-750 px-2 py-0.5 text-[10px] font-bold text-mh-slate-300">
              {weaponTypeObj?.name || weapon.weapon_type_id}
            </span>

            {/* Starting Rarity Badge */}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-bold border font-mono',
                getRarityBadgeStyle(weapon.rarity || 1).badge,
              )}
            >
              {getRarityBadgeStyle(weapon.rarity || 1).label}
            </span>

            {/* Source Origin */}
            <span
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-bold border',
                srcCfg.bg,
                srcCfg.text,
                srcCfg.border,
              )}
            >
              {monsterObj ? monsterObj.name : srcCfg.label}
            </span>
          </div>

          {/* Element / Status Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border shrink-0',
              elemCfg.bg,
              elemCfg.text,
              elemCfg.border,
            )}
          >
            <ElIcon size={11} className={elemCfg.color} />
            <span>{elemCfg.label}</span>
          </span>
        </div>

        {/* Artwork & Wrapped Weapon Title */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mh-slate-900 border border-mh-slate-750 p-2 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-200">
            {weapon.image ? (
              <img
                src={weapon.image}
                alt={weapon.name}
                className="h-full w-full object-contain filter brightness-95"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Sword size={26} className="text-mh-slate-600" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Multiline wrapped title */}
            <h3 className="font-display text-sm sm:text-base font-bold text-mh-slate-100 group-hover:text-mh-gold-300 transition-colors break-words leading-tight">
              {weapon.name}
            </h3>

            {weapon.upgraded_name && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium break-words mt-1">
                <span className="text-mh-slate-500 text-[10px]">▲ Upgrades:</span>
                <span className="font-bold text-amber-200">{weapon.upgraded_name}</span>
                {weapon.upgrade_level && (
                  <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] px-1 py-0.2 font-mono">
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
        </div>

        {/* Challenge Tracking Progress Status (if actively tracked) */}
        {isTracked && challenge && (
          <div className="mb-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1.5 text-blue-300">
                <Target size={13} className="text-blue-400" />
                <span>
                  {isCompleted
                    ? `✓ R${challenge.max_rarity} Mastered`
                    : isCrafted
                    ? `Tracked at R${challenge.current_rarity} / R${challenge.max_rarity}`
                    : `Crafting Target (R${challenge.craft_rarity})`}
                </span>
              </div>
              <span className="font-mono text-blue-400">
                {isCompleted ? '100%' : `${Math.round(((challenge.current_rarity || 0) / (challenge.max_rarity || 16)) * 100)}%`}
              </span>
            </div>
          </div>
        )}

        {/* Special Skill Tag */}
        {weapon.special_skill && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-mh-gold-500/10 border border-mh-gold-500/20 px-2.5 py-1 text-xs font-semibold text-mh-gold-400">
            <Sparkles size={12} className="shrink-0" />
            <span className="break-words leading-snug">{weapon.special_skill}</span>
          </div>
        )}

        {/* Attached Skills */}
        {weapon.skills && weapon.skills.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex flex-wrap gap-1">
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
          </div>
        )}
      </div>

      {/* Card Footer: Challenge Action Buttons */}
      <div className="mt-4 pt-3 border-t border-mh-slate-800 flex items-center justify-between gap-2">
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
            <span>Sign In to Track</span>
          </button>
        ) : isTracked && challenge ? (
          isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-300">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Completed</span>
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
              <span>{isCrafted ? `Upgrade to R${challenge.current_rarity + 1}` : `Mark Crafted (R${challenge.craft_rarity})`}</span>
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
            <span>+ Add Challenge</span>
          </button>
        )}

        <span className="text-[11px] text-mh-slate-500 font-medium group-hover:text-mh-slate-400 shrink-0">
          Inspect &rarr;
        </span>
      </div>
    </div>
  );
}
