// ─────────────────────────────────────────────────────────────
// WeaponCard — Interactive card for Weapons in Investigation Notes
// Shows artwork, element affinity, source, special skill, attached skills, and collection status.
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
  isCollected: boolean;
  onToggleCollected: () => void;
  onInspect: () => void;
}

export default function WeaponCard({
  weapon,
  isCollected,
  onToggleCollected,
  onInspect,
}: Props) {
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: dbSkills = [] } = useAdminSkills({ isActive: true });

  const weaponTypeObj = WEAPON_TYPES.find((w) => w.id === weapon.weapon_type_id);
  const monsterObj = weapon.monster_id ? monsters.find((m) => m.id === weapon.monster_id) : null;
  const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.general;
  const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
  const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;

  return (
    <div
      onClick={onInspect}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer shadow-sm',
        isCollected
          ? 'border-mh-slate-700 bg-mh-slate-850 hover:border-mh-gold-500/50 hover:shadow-lg hover:shadow-mh-gold-500/5'
          : 'border-mh-slate-800 bg-mh-slate-900/60 opacity-60 grayscale hover:opacity-90 hover:grayscale-0 hover:border-mh-slate-700',
      )}
    >
      <div>
        {/* Top Header Tags */}
        <div className="flex items-center justify-between gap-1.5 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Weapon Type Pill */}
            <span className="rounded bg-mh-slate-800 border border-mh-slate-750 px-2 py-0.5 text-[10px] font-bold text-mh-slate-300">
              {weaponTypeObj?.name || weapon.weapon_type_id}
            </span>

            {/* Starting Rarity Badge */}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-bold border',
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
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border',
              elemCfg.bg,
              elemCfg.text,
              elemCfg.border,
            )}
          >
            <ElIcon size={11} className={elemCfg.color} />
            <span>{elemCfg.label}</span>
          </span>
        </div>

        {/* Artwork & Weapon Title */}
        <div className="flex items-center gap-3.5 mb-3">
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
            <h3 className="font-display text-base font-bold text-mh-slate-100 group-hover:text-mh-gold-300 transition-colors truncate">
              {weapon.name}
            </h3>
            {weapon.upgraded_name && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium truncate mt-0.5">
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
              <p className="text-[11px] text-mh-slate-500 font-medium truncate">
                {weapon.name_ja}
              </p>
            )}
          </div>
        </div>

        {/* Special Skill Tag */}
        {weapon.special_skill && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-mh-gold-500/10 border border-mh-gold-500/20 px-2.5 py-1 text-xs font-semibold text-mh-gold-400">
            <Sparkles size={12} className="shrink-0" />
            <span className="truncate">{weapon.special_skill}</span>
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
                      <span className="rounded bg-amber-500/20 text-amber-300 px-1 py-0.2 text-[9px] font-bold border border-amber-500/40">
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

      {/* Card Footer: Quick Collection Toggle */}
      <div className="mt-4 pt-3 border-t border-mh-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollected();
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all',
            isCollected
              ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-mh-slate-800 text-mh-slate-400 hover:bg-mh-gold-500/20 hover:text-mh-gold-300 hover:ring-1 hover:ring-mh-gold-500/40',
          )}
        >
          {isCollected ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Collected</span>
            </>
          ) : (
            <>
              <Plus size={13} />
              <span>+ Collect</span>
            </>
          )}
        </button>

        <span className="text-[11px] text-mh-slate-500 font-medium group-hover:text-mh-slate-400">
          Inspect &rarr;
        </span>
      </div>
    </div>
  );
}
