// ─────────────────────────────────────────────────────────────
// WeaponModal — Detailed Inspection Dialog for MHO & MHN Weapons
// ─────────────────────────────────────────────────────────────
import {
  X,
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
  Info,
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
  weapon: DBWeapon | null;
  open: boolean;
  onClose: () => void;
  isCollected: boolean;
  onToggleCollected: () => void;
}

export default function WeaponModal({
  weapon,
  open,
  onClose,
  isCollected,
  onToggleCollected,
}: Props) {
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const { data: dbSkills = [] } = useAdminSkills({ isActive: true });

  if (!open || !weapon) return null;

  const weaponTypeObj = WEAPON_TYPES.find((w) => w.id === weapon.weapon_type_id);
  const monsterObj = weapon.monster_id ? monsters.find((m) => m.id === weapon.monster_id) : null;
  const srcCfg = WEAPON_SOURCE_CONFIG[weapon.source_type] || WEAPON_SOURCE_CONFIG.general;
  const elemCfg = WEAPON_ELEMENT_CONFIG[weapon.element_type] || WEAPON_ELEMENT_CONFIG.raw;
  const ElIcon = ELEMENT_ICONS[weapon.element_type] || Shield;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl rounded-3xl border border-mh-slate-700 bg-mh-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mh-slate-750 bg-mh-slate-950/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mh-gold-500/10 text-mh-gold-400 ring-1 ring-mh-gold-500/30">
              <Sword size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-mh-slate-100">
                  {weapon.name}
                </h2>
                {weapon.name_ja && (
                  <span className="text-xs text-mh-slate-500 font-medium">
                    ({weapon.name_ja})
                  </span>
                )}
              </div>

              {weapon.upgraded_name && (
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium mt-0.5">
                  <span className="text-mh-slate-400 text-[11px]">Upgrades to:</span>
                  <span className="font-bold text-amber-200">{weapon.upgraded_name}</span>
                  {weapon.upgraded_name_ja && (
                    <span className="text-mh-slate-500 text-[10px]">({weapon.upgraded_name_ja})</span>
                  )}
                  {weapon.upgrade_level && (
                    <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] px-1.5 py-0.2 font-mono font-bold">
                      Lv {weapon.upgrade_level}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-mh-slate-400">
                  {weaponTypeObj?.name || weapon.weapon_type_id}
                </span>
                <span className="text-mh-slate-600">•</span>
                <span className="font-mono text-[11px] text-mh-gold-500/80 uppercase">
                  {weapon.game}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Showcase: Artwork, Origin, Element, Collection Action */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start rounded-2xl border border-mh-slate-750 bg-gradient-to-b from-mh-slate-850 to-mh-slate-900/90 p-5">
            {/* Artwork */}
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-mh-slate-950/80 border border-mh-slate-750 p-3 shadow-inner">
              {weapon.image ? (
                <img
                  src={weapon.image}
                  alt={weapon.name}
                  className="h-full w-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Sword size={48} className="text-mh-slate-600" />
              )}
            </div>

            {/* Info & Collection button */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {/* Weapon Type */}
                <span className="rounded-lg bg-mh-slate-800 border border-mh-slate-750 px-2.5 py-1 text-xs font-bold text-mh-slate-300">
                  {weaponTypeObj?.name || weapon.weapon_type_id}
                </span>

                {/* Starting Rarity */}
                <span
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-bold border',
                    getRarityBadgeStyle(weapon.rarity || 1).badge,
                  )}
                >
                  {getRarityBadgeStyle(weapon.rarity || 1).label}
                </span>

                {/* Source Origin */}
                <span
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-bold border',
                    srcCfg.bg,
                    srcCfg.text,
                    srcCfg.border,
                  )}
                >
                  {monsterObj ? `Monster: ${monsterObj.name}` : srcCfg.label}
                </span>

                {/* Element / Status */}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border',
                    elemCfg.bg,
                    elemCfg.text,
                    elemCfg.border,
                  )}
                >
                  <ElIcon size={13} className={elemCfg.color} />
                  <span>{elemCfg.label}</span>
                </span>
              </div>

              {/* Description Lore */}
              {weapon.description && (
                <p className="text-xs text-mh-slate-300 italic leading-relaxed">
                  "{weapon.description}"
                </p>
              )}

              {/* Collection Toggle Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onToggleCollected}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md',
                    isCollected
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50 hover:bg-emerald-500/30'
                      : 'bg-mh-gold-500 text-mh-slate-950 hover:bg-mh-gold-400 font-black',
                  )}
                >
                  {isCollected ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Collected in Armory (Click to Unmark)</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>+ Mark as Collected</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Special Skill Highlight */}
          {weapon.special_skill && (
            <div className="rounded-2xl border border-mh-gold-500/30 bg-gradient-to-r from-mh-gold-500/10 via-mh-slate-900 to-mh-slate-900 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-mh-gold-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400">
                  Special Skill Finish
                </h4>
              </div>
              <p className="font-display text-sm font-bold text-mh-slate-100">
                {weapon.special_skill}
              </p>
              {weaponTypeObj?.description && (
                <p className="text-xs text-mh-slate-400 mt-1 leading-relaxed">
                  {weaponTypeObj.description}
                </p>
              )}
            </div>
          )}

          {/* Attached Weapon Skills */}
          <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-mh-gold-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-mh-slate-200">
                  Attached Passive Skills
                </h4>
              </div>
              <span className="text-[11px] text-mh-slate-500">
                {weapon.skills?.length ?? 0} Skill{(weapon.skills?.length ?? 0) === 1 ? '' : 's'}
              </span>
            </div>

            {(!weapon.skills || weapon.skills.length === 0) ? (
              <p className="text-xs text-mh-slate-500 italic py-2">
                No inherent passive skills attached to this weapon.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {weapon.skills.map((s, idx) => {
                  const meta = dbSkills.find((d) => d.id === s.id);
                  const skillName = meta?.name ?? s.id;
                  const ur = s.unlockLevel ?? s.unlock_level ?? s.unlockRarity ?? s.unlock_rarity ?? null;
                  const isLocked = Boolean(ur && ur > 1);

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-mh-slate-750 bg-mh-slate-900 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-mh-slate-100">
                            {skillName}
                          </span>
                          <span className="rounded bg-mh-gold-500/20 text-mh-gold-300 font-mono text-xs font-bold px-2 py-0.5 border border-mh-gold-500/30">
                            Level {s.level}
                          </span>
                        </div>

                        {/* Unlock Rarity / Level */}
                        {isLocked ? (
                          <span className="rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold px-2 py-0.5 border border-amber-500/40">
                            Unlocks at Lv {ur}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold px-2 py-0.5 border border-emerald-500/30">
                            Base Level
                          </span>
                        )}
                      </div>

                      {meta?.description && (
                        <p className="text-xs text-mh-slate-400 leading-relaxed">
                          {meta.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Field Notes & Weapon Styles */}
          {weapon.notes && (
            <div className="rounded-2xl border border-mh-slate-750 bg-mh-slate-950/40 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mh-slate-400">
                <Info size={13} />
                <span>Field Notes</span>
              </div>
              <p className="text-xs text-mh-slate-300 leading-relaxed">
                {weapon.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-mh-slate-750 bg-mh-slate-950/90 px-6 py-4 flex items-center justify-between">
          <p className="font-mono text-[11px] text-mh-slate-500">
            ID: {weapon.id}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-mh-slate-800 px-4 py-2 text-xs font-bold text-mh-slate-200 hover:bg-mh-slate-750 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
