// ─────────────────────────────────────────────────────────────
// WeaponCompareModal — Side-by-Side Weapon Comparison Across Rarity Tiers
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo } from 'react';
import {
  X,
  Sword,
  ArrowLeftRight,
  ChevronsLeft,
  ChevronsRight,
  Equal,
} from 'lucide-react';
import {
  type DBWeapon,
  type DBWeaponUpgrade,
  WEAPON_SOURCE_CONFIG,
  WEAPON_ELEMENT_CONFIG,
  WEAPON_SHARPNESS_ICONS,
  getRarityBadgeStyle,
  getWeaponDisplayName,
} from '../../data/schemas/weapon';
import { WEAPON_TYPES } from '../../data/core/weapon-types';
import { useAdminMonsters } from '../../hooks/useAdminMonsters';
import { useWeaponUpgrades } from '../../hooks/useAdminWeapons';
import { cn } from '../../lib/utils';
import ElementIcon from '../../components/ElementIcon';

interface Props {
  weapon1: DBWeapon;
  weapon2: DBWeapon;
  open: boolean;
  onClose: () => void;
  onClearBoth?: () => void;
}

export default function WeaponCompareModal({
  weapon1,
  weapon2,
  open,
  onClose,
  onClearBoth,
}: Props) {
  const { data: monsters = [] } = useAdminMonsters({ isActive: true });
  const monstersMap = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);

  const { data: rawUpgrades1 = [], isLoading: loading1 } = useWeaponUpgrades(open && weapon1 ? weapon1.id : null);
  const { data: rawUpgrades2 = [], isLoading: loading2 } = useWeaponUpgrades(open && weapon2 ? weapon2.id : null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Fallback to base weapon stats if no upgrades exist in the database table
  const upgrades1 = useMemo<DBWeaponUpgrade[]>(() => {
    if (rawUpgrades1.length > 0) return rawUpgrades1;
    return [
      {
        weapon_id: weapon1.id,
        rarity: weapon1.rarity || 1,
        attack: weapon1.attack,
        affinity: weapon1.affinity,
        element_type: weapon1.element_type,
        element_damage: weapon1.element_damage,
        stats: {},
        sharpness: weapon1.sharpness,
        gains: {},
        materials: [],
        money: null,
        required_level: null,
      },
    ];
  }, [rawUpgrades1, weapon1]);

  const upgrades2 = useMemo<DBWeaponUpgrade[]>(() => {
    if (rawUpgrades2.length > 0) return rawUpgrades2;
    return [
      {
        weapon_id: weapon2.id,
        rarity: weapon2.rarity || 1,
        attack: weapon2.attack,
        affinity: weapon2.affinity,
        element_type: weapon2.element_type,
        element_damage: weapon2.element_damage,
        stats: {},
        sharpness: weapon2.sharpness,
        gains: {},
        materials: [],
        money: null,
        required_level: null,
      },
    ];
  }, [rawUpgrades2, weapon2]);

  const u1Map = useMemo(() => new Map(upgrades1.map((u) => [u.rarity, u])), [upgrades1]);
  const u2Map = useMemo(() => new Map(upgrades2.map((u) => [u.rarity, u])), [upgrades2]);

  // All distinct rarity levels between the two weapons
  const allRarities = useMemo(() => {
    const set = new Set<number>();
    upgrades1.forEach((u) => set.add(u.rarity));
    upgrades2.forEach((u) => set.add(u.rarity));
    if (weapon1.rarity) set.add(weapon1.rarity);
    if (weapon1.max_rarity) set.add(weapon1.max_rarity);
    if (weapon2.rarity) set.add(weapon2.rarity);
    if (weapon2.max_rarity) set.add(weapon2.max_rarity);
    return Array.from(set).sort((a, b) => a - b);
  }, [upgrades1, upgrades2, weapon1, weapon2]);

  if (!open) return null;

  const wt1 = WEAPON_TYPES.find((w) => w.id === weapon1.weapon_type_id);
  const wt2 = WEAPON_TYPES.find((w) => w.id === weapon2.weapon_type_id);

  const monster1 = weapon1.monster_id ? monstersMap.get(weapon1.monster_id) : null;
  const monster2 = weapon2.monster_id ? monstersMap.get(weapon2.monster_id) : null;

  const src1 = WEAPON_SOURCE_CONFIG[weapon1.source_type] || WEAPON_SOURCE_CONFIG.unknown;
  const src2 = WEAPON_SOURCE_CONFIG[weapon2.source_type] || WEAPON_SOURCE_CONFIG.unknown;

  const elemCfg1 = WEAPON_ELEMENT_CONFIG[weapon1.element_type] || WEAPON_ELEMENT_CONFIG.raw;
  const elemCfg2 = WEAPON_ELEMENT_CONFIG[weapon2.element_type] || WEAPON_ELEMENT_CONFIG.raw;

  const isLoading = loading1 || loading2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-5xl rounded-3xl border border-mh-slate-750 bg-mh-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header Toolbar ── */}
        <div className="flex items-center justify-between border-b border-mh-slate-800 bg-mh-slate-950/90 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-mh-gold-500/15 border border-mh-gold-500/30 text-mh-gold-400">
              <ArrowLeftRight size={16} />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-white tracking-wide">
                Weapon Comparison
              </h2>
              <p className="text-[11px] text-mh-slate-400">
                Comparing stats across all available rarity tiers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-mh-slate-400 hover:bg-mh-slate-800 hover:text-white transition-colors"
              title="Close comparison"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Weapon Overview Cards (Sticky Header) ── */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 border-b border-mh-slate-800 bg-mh-slate-950/70 p-3 sm:p-4 shrink-0">
          {/* Left Weapon 1 Header */}
          <div className="flex items-center gap-3 min-w-0 bg-mh-slate-900/90 rounded-2xl border border-mh-slate-750 p-2.5 sm:p-3">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-750 p-1">
              {weapon1.image ? (
                <img
                  src={weapon1.image}
                  alt={weapon1.name}
                  className="h-full w-full object-contain filter drop-shadow"
                />
              ) : (
                <Sword size={22} className="text-mh-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded bg-mh-slate-800 border border-mh-slate-750 px-1.5 py-0.5 text-[9px] font-bold text-mh-slate-300">
                  {wt1?.name || weapon1.weapon_type_id}
                </span>
                <span className="font-mono text-[9px] font-bold text-mh-gold-400">
                  R{weapon1.rarity || 1} &rarr; R{weapon1.max_rarity || 14}
                </span>
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {weapon1.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-mh-slate-400 truncate mt-0.5">
                {monster1 ? (
                  <span className="text-orange-400 font-semibold truncate">{monster1.name}</span>
                ) : (
                  <span className={cn('truncate', src1.text)}>{src1.label}</span>
                )}
                <span>&bull;</span>
                <span className={cn('inline-flex items-center gap-1', elemCfg1.text)}>
                  <ElementIcon element={weapon1.element_type} size={11} />
                  <span>{elemCfg1.label}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Central VS Badge */}
          <div className="flex flex-col items-center justify-center px-1 sm:px-2">
            <span className="rounded-full bg-mh-gold-500/20 border border-mh-gold-500/40 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-mh-gold-400 shadow-sm">
              VS
            </span>
          </div>

          {/* Right Weapon 2 Header */}
          <div className="flex items-center gap-3 min-w-0 bg-mh-slate-900/90 rounded-2xl border border-mh-slate-750 p-2.5 sm:p-3">
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                <span className="font-mono text-[9px] font-bold text-mh-gold-400">
                  R{weapon2.rarity || 1} &rarr; R{weapon2.max_rarity || 14}
                </span>
                <span className="rounded bg-mh-slate-800 border border-mh-slate-750 px-1.5 py-0.5 text-[9px] font-bold text-mh-slate-300">
                  {wt2?.name || weapon2.weapon_type_id}
                </span>
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {weapon2.name}
              </h3>
              <div className="flex items-center justify-end gap-1.5 text-[10px] text-mh-slate-400 truncate mt-0.5">
                <span className={cn('inline-flex items-center gap-1', elemCfg2.text)}>
                  <ElementIcon element={weapon2.element_type} size={11} />
                  <span>{elemCfg2.label}</span>
                </span>
                <span>&bull;</span>
                {monster2 ? (
                  <span className="text-orange-400 font-semibold truncate">{monster2.name}</span>
                ) : (
                  <span className={cn('truncate', src2.text)}>{src2.label}</span>
                )}
              </div>
            </div>
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-750 p-1">
              {weapon2.image ? (
                <img
                  src={weapon2.image}
                  alt={weapon2.name}
                  className="h-full w-full object-contain filter drop-shadow"
                />
              ) : (
                <Sword size={22} className="text-mh-slate-500" />
              )}
            </div>
          </div>
        </div>

        {/* ── Main Comparison Table / Rows ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-mh-gold-400 border-t-transparent" />
            </div>
          ) : (
            allRarities.map((r) => {
              const u1 = u1Map.get(r);
              const u2 = u2Map.get(r);

              const rarityStyle = getRarityBadgeStyle(r);

              // Attack comparison
              const atk1 = u1?.attack ?? null;
              const atk2 = u2?.attack ?? null;
              const hasBothAtk = atk1 !== null && atk2 !== null;
              const atkDiff = hasBothAtk ? atk1 - atk2 : 0;
              const isAtk1Higher = hasBothAtk && atkDiff > 0;
              const isAtk2Higher = hasBothAtk && atkDiff < 0;

              // Elements at this tier
              const elem1 = u1?.element_type ?? weapon1.element_type;
              const elemDmg1 = u1?.element_damage ?? null;
              const elemCfgRow1 = WEAPON_ELEMENT_CONFIG[elem1] || WEAPON_ELEMENT_CONFIG.raw;

              const elem2 = u2?.element_type ?? weapon2.element_type;
              const elemDmg2 = u2?.element_damage ?? null;
              const elemCfgRow2 = WEAPON_ELEMENT_CONFIG[elem2] || WEAPON_ELEMENT_CONFIG.raw;

              // Element comparison
              const hasBothRows = Boolean(u1 && u2);
              const elemVal1 = u1 && elem1 !== 'raw' ? (elemDmg1 !== null && elemDmg1 !== undefined ? elemDmg1 : 1) : 0;
              const elemVal2 = u2 && elem2 !== 'raw' ? (elemDmg2 !== null && elemDmg2 !== undefined ? elemDmg2 : 1) : 0;
              const elemDiff = elemVal1 - elemVal2;
              const isElem1Higher = hasBothRows && elemDiff > 0;
              const isElem2Higher = hasBothRows && elemDiff < 0;

              // Sharpness
              const sharp1 = u1?.sharpness ?? null;
              const sharp2 = u2?.sharpness ?? null;

              const name1AtRarity = u1?.name ?? getWeaponDisplayName(weapon1, r);
              const name2AtRarity = u2?.name ?? getWeaponDisplayName(weapon2, r);

              return (
                <div
                  key={r}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 rounded-2xl border border-mh-slate-800 bg-mh-slate-850/70 p-2 sm:p-3 hover:border-mh-slate-700 transition-colors"
                >
                  {/* ── LEFT: Weapon 1 Stats at Rarity r ── */}
                  <div className="min-w-0">
                    {u1 ? (
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Weapon 1 Image Thumbnail */}
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-750 p-1">
                          {weapon1.image ? (
                            <img
                              src={weapon1.image}
                              alt={name1AtRarity}
                              className="h-full w-full object-contain filter drop-shadow"
                            />
                          ) : (
                            <Sword size={16} className="text-mh-slate-500" />
                          )}
                        </div>

                        {/* Stats Stack */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-[11px] font-semibold text-mh-slate-200 truncate" title={name1AtRarity}>
                            {name1AtRarity}
                          </p>
                          {/* Attack & Advantage */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                'font-mono text-xs sm:text-sm font-bold',
                                isAtk1Higher
                                  ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                                  : 'text-mh-slate-100',
                              )}
                            >
                              ATK {atk1 ?? '—'}
                            </span>
                            {isAtk1Higher && (
                              <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1 py-0.2 text-[10px] font-bold text-emerald-300">
                                +{atkDiff}
                              </span>
                            )}
                            {u1.affinity !== null && u1.affinity !== 0 && (
                              <span className="text-[10px] font-mono text-mh-slate-400">
                                {u1.affinity > 0 ? `+${u1.affinity / 100}%` : `${u1.affinity / 100}%`}
                              </span>
                            )}
                          </div>

                          {/* Element & Sharpness */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            {elem1 !== 'raw' && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono font-bold border',
                                  elemCfgRow1.bg,
                                  elemCfgRow1.text,
                                  elemCfgRow1.border,
                                )}
                              >
                                <ElementIcon element={elem1} size={11} />
                                <span>{elemCfgRow1.label}{elemDmg1 ? ` ${elemDmg1}` : ''}</span>
                              </span>
                            )}

                            {sharp1 && WEAPON_SHARPNESS_ICONS[sharp1] && (
                              <img
                                src={WEAPON_SHARPNESS_ICONS[sharp1]}
                                alt={sharp1}
                                title={`${sharp1} Sharpness`}
                                className="h-3 w-auto"
                              />
                            )}

                            {/* Gains if any */}
                            {u1.gains?.Attack ? (
                              <span className="text-[9px] text-emerald-400/90 font-mono">
                                +{u1.gains.Attack} Atk
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Weapon 1 not available at this rarity */
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-mh-slate-800 bg-mh-slate-900/40 p-2.5 text-[11px] text-mh-slate-500">
                        <Sword size={14} className="shrink-0 text-mh-slate-600" />
                        <span className="truncate">
                          {r < (weapon1.rarity || 1)
                            ? `Crafts at R${weapon1.rarity || 1}`
                            : `Maxed at R${weapon1.max_rarity || 14}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── CENTER: Rarity Level Badge & Delta Indicator ── */}
                  <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0">
                    <span
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-mono font-bold border shadow-sm',
                        rarityStyle.badge,
                      )}
                    >
                      {rarityStyle.label}
                    </span>

                    {/* Quick difference indicators */}
                    <div className="mt-1.5 flex flex-col items-center gap-1">
                      {/* Attack difference: double sign pointing to bigger */}
                      {hasBothAtk && (
                        <div
                          className="flex items-center justify-center gap-1 text-[11px]"
                          title={
                            isAtk1Higher
                              ? `${name1AtRarity} has higher Attack (+${atkDiff})`
                              : isAtk2Higher
                              ? `${name2AtRarity} has higher Attack (+${Math.abs(atkDiff)})`
                              : 'Attack is equal'
                          }
                        >
                          <Sword size={11} className="text-mh-slate-400 shrink-0" />
                          {isAtk1Higher ? (
                            <ChevronsLeft size={14} className="text-emerald-400 stroke-[2.5]" />
                          ) : isAtk2Higher ? (
                            <ChevronsRight size={14} className="text-emerald-400 stroke-[2.5]" />
                          ) : (
                            <Equal size={12} className="text-mh-slate-500" />
                          )}
                        </div>
                      )}

                      {/* Element / Status difference: double sign pointing to bigger in element color */}
                      {hasBothRows && (
                        <div
                          className="flex items-center justify-center gap-1 text-[11px]"
                          title={
                            isElem1Higher
                              ? `${name1AtRarity} has higher ${elemCfgRow1.label}${elemDmg1 ? ` (${elemDmg1})` : ''}`
                              : isElem2Higher
                              ? `${name2AtRarity} has higher ${elemCfgRow2.label}${elemDmg2 ? ` (${elemDmg2})` : ''}`
                              : elemVal1 > 0
                              ? `Element is equal (${elemCfgRow1.label}${elemDmg1 ? ` ${elemDmg1}` : ''})`
                              : 'Neither weapon has an element'
                          }
                        >
                          <ElementIcon
                            element={isElem1Higher ? elem1 : isElem2Higher ? elem2 : (elem1 !== 'raw' ? elem1 : elem2)}
                            size={11}
                            className="shrink-0"
                          />
                          {isElem1Higher ? (
                            <ChevronsLeft size={14} className={cn(elemCfgRow1.color, 'stroke-[2.5]')} />
                          ) : isElem2Higher ? (
                            <ChevronsRight size={14} className={cn(elemCfgRow2.color, 'stroke-[2.5]')} />
                          ) : (
                            <Equal size={12} className={elemVal1 > 0 ? elemCfgRow1.color : 'text-mh-slate-600'} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT: Weapon 2 Stats at Rarity r ── */}
                  <div className="min-w-0">
                    {u2 ? (
                      <div className="flex items-center justify-end gap-2.5 sm:gap-3 text-right">
                        {/* Stats Stack */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-[11px] font-semibold text-mh-slate-200 truncate" title={name2AtRarity}>
                            {name2AtRarity}
                          </p>
                          {/* Attack & Advantage */}
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isAtk2Higher && (
                              <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1 py-0.2 text-[10px] font-bold text-emerald-300">
                                +{Math.abs(atkDiff)}
                              </span>
                            )}
                            <span
                              className={cn(
                                'font-mono text-xs sm:text-sm font-bold',
                                isAtk2Higher
                                  ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                                  : 'text-mh-slate-100',
                              )}
                            >
                              ATK {atk2 ?? '—'}
                            </span>
                            {u2.affinity !== null && u2.affinity !== 0 && (
                              <span className="text-[10px] font-mono text-mh-slate-400">
                                {u2.affinity > 0 ? `+${u2.affinity / 100}%` : `${u2.affinity / 100}%`}
                              </span>
                            )}
                          </div>

                          {/* Element & Sharpness */}
                          <div className="flex items-center justify-end gap-1.5 flex-wrap text-[10px]">
                            {/* Gains if any */}
                            {u2.gains?.Attack ? (
                              <span className="text-[9px] text-emerald-400/90 font-mono">
                                +{u2.gains.Attack} Atk
                              </span>
                            ) : null}

                            {sharp2 && WEAPON_SHARPNESS_ICONS[sharp2] && (
                              <img
                                src={WEAPON_SHARPNESS_ICONS[sharp2]}
                                alt={sharp2}
                                title={`${sharp2} Sharpness`}
                                className="h-3 w-auto"
                              />
                            )}

                            {elem2 !== 'raw' && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono font-bold border',
                                  elemCfgRow2.bg,
                                  elemCfgRow2.text,
                                  elemCfgRow2.border,
                                )}
                              >
                                <ElementIcon element={elem2} size={11} />
                                <span>{elemCfgRow2.label}{elemDmg2 ? ` ${elemDmg2}` : ''}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Weapon 2 Image Thumbnail */}
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-mh-slate-800 border border-mh-slate-750 p-1">
                          {weapon2.image ? (
                            <img
                              src={weapon2.image}
                              alt={name2AtRarity}
                              className="h-full w-full object-contain filter drop-shadow"
                            />
                          ) : (
                            <Sword size={16} className="text-mh-slate-500" />
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Weapon 2 not available at this rarity */
                      <div className="flex items-center justify-end gap-2 rounded-xl border border-dashed border-mh-slate-800 bg-mh-slate-900/40 p-2.5 text-[11px] text-mh-slate-500 text-right">
                        <span className="truncate">
                          {r < (weapon2.rarity || 1)
                            ? `Crafts at R${weapon2.rarity || 1}`
                            : `Maxed at R${weapon2.max_rarity || 14}`}
                        </span>
                        <Sword size={14} className="shrink-0 text-mh-slate-600" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-mh-slate-800 bg-mh-slate-950/90 px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-mh-slate-400 truncate">
            Exiting leaves <span className="text-mh-gold-300 font-bold">{weapon1.name}</span> selected at the top.
          </p>

          <div className="flex items-center gap-2">
            {onClearBoth && (
              <button
                type="button"
                onClick={onClearBoth}
                className="rounded-xl border border-mh-slate-700 bg-mh-slate-800/80 px-3 py-1.5 text-xs font-semibold text-mh-slate-300 hover:bg-mh-slate-750 hover:text-white transition-colors"
              >
                Clear Selection
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-mh-gold-500 hover:bg-mh-gold-400 px-4 py-1.5 text-xs font-bold text-slate-950 transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
