import { Link } from 'react-router-dom';
import { getInkConfig } from '../../data/schemas/visage';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { Sparkles, Sword } from 'lucide-react';
import {
  FALLBACK_MONSTER_ICONS,
  getHighestLevelInk,
  type ArmoryBuild,
  type MonsterLookup,
} from '../../types/armory';

interface ArmoryBuildRowProps {
  build: ArmoryBuild;
  monsterMap: Map<string, MonsterLookup>;
}

export function ArmoryBuildRow({ build, monsterMap }: ArmoryBuildRowProps) {
  let role = 'main';
  if (build.description && /<!-- role:support -->/.test(build.description)) {
    role = 'support';
  }

  // Helper to resolve monster icon and name
  const resolveMonster = (monsterId?: string | null) => {
    if (!monsterId) return null;
    const fromMap = monsterMap.get(monsterId);
    if (fromMap && fromMap.icon) return fromMap;
    const fallback = FALLBACK_MONSTER_ICONS[monsterId];
    if (fallback) return fallback;
    return { name: fromMap?.name || monsterId, icon: null };
  };

  // Weapon display info
  const weaponMonster = resolveMonster(build.weapon?.monster_id);
  const weaponIcon = weaponMonster?.icon || build.weapon?.image || build.weapon_type?.icon || null;
  const weaponTitle = build.weapon?.name 
    ? `Weapon: ${build.weapon.name}${weaponMonster?.name ? ` (${weaponMonster.name})` : ''}`
    : build.weapon_type?.name 
      ? `Weapon Type: ${build.weapon_type.name}` 
      : 'No weapon selected';

  // Armor pieces info
  const armorSlots = [
    {
      slotKey: 'helm',
      label: 'H',
      name: 'Helm',
      piece: build.helm,
      placeholder: '/images/ui/armor/helm.svg',
    },
    {
      slotKey: 'chest',
      label: 'C',
      name: 'Chest',
      piece: build.chest,
      placeholder: '/images/ui/armor/chest.svg',
    },
    {
      slotKey: 'gloves',
      label: 'G',
      name: 'Gloves',
      piece: build.gloves,
      placeholder: '/images/ui/armor/gloves.svg',
    },
    {
      slotKey: 'waist',
      label: 'W',
      name: 'Waist',
      piece: build.waist,
      placeholder: '/images/ui/armor/belt.svg',
    },
    {
      slotKey: 'greaves',
      label: 'L',
      name: 'Greaves',
      piece: build.greaves,
      placeholder: '/images/ui/armor/legs.svg',
    },
  ];

  // Highest level ink
  const highestInk = getHighestLevelInk(build);

  return (
    <Link
      to={`/armory/planner/${build.id}`}
      className="mho-panel mho-panel-interactive group cursor-pointer flex flex-col sm:flex-row sm:items-center landscape:flex-row landscape:items-center justify-between px-2.5 sm:px-3 py-1.5 gap-1.5 sm:gap-2.5 landscape:gap-2.5 shadow-sm"
    >
      {/* ── Top (Portrait Mobile) / Left (Desktop & Landscape Horizontal): Character Trio + Title/Role ── */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Character Trio: Adventurer -> Buddy -> Weapon Type */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Adventurer Icon */}
          <div
            title={`Adventurer: ${build.adventurer?.name || 'Default'}`}
            className="w-7 h-7 sm:w-8 sm:h-8 landscape:w-8 landscape:h-8 rounded-md bg-mh-slate-800 border border-mh-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 shadow-sm"
          >
            {build.adventurer?.image ? (
              <img
                src={build.adventurer.image}
                alt={build.adventurer?.name || 'Adventurer'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[8px] text-mh-slate-500 font-bold uppercase">Adv</span>
            )}
          </div>

          {/* Buddy Icon */}
          <div
            title={`Buddy: ${build.buddy?.name || 'None'}`}
            className="w-5 h-5 sm:w-6 sm:h-6 landscape:w-6 landscape:h-6 rounded bg-mh-slate-800 border border-mh-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 shadow-sm"
          >
            {build.buddy?.image ? (
              <img
                src={build.buddy.image}
                alt={build.buddy?.name || 'Buddy'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[6px] text-mh-slate-600 font-bold">B</span>
            )}
          </div>

          {/* Weapon Type Icon */}
          <div
            title={build.weapon_type?.name ? `Weapon Type: ${build.weapon_type.name}` : 'Weapon Type'}
            className="w-4 h-4 sm:w-5 sm:h-5 landscape:w-5 landscape:h-5 rounded bg-mh-slate-800 border border-mh-slate-700/80 p-0.5 flex items-center justify-center shrink-0 shadow-sm"
          >
            {build.weapon_type?.icon ? (
              <img
                src={build.weapon_type.icon}
                alt={build.weapon_type.name}
                className="w-full h-full object-contain filter drop-shadow"
              />
            ) : (
              <Sword size={9} className="text-mh-slate-400" />
            )}
          </div>
        </div>

        {/* Title, Role badge, Author */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <h3 className="font-display font-bold text-xs sm:text-sm landscape:text-sm text-mh-slate-100 group-hover:text-white transition-colors truncate">
            {build.title}
          </h3>
          {role === 'main' ? (
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1 py-0 text-[7px] sm:text-[8px] font-bold uppercase tracking-wider shrink-0">
              Main
            </span>
          ) : (
            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1 py-0 text-[7px] sm:text-[8px] font-bold uppercase tracking-wider shrink-0">
              Support
            </span>
          )}
          <span className="text-[10px] text-mh-slate-400 truncate hidden min-[420px]:inline">
            · {build.author?.username || 'Unknown'}
          </span>
        </div>

        {/* Mobile Upvotes displayed on Top Row in Portrait */}
        <div className="sm:hidden landscape:hidden flex items-center gap-1 text-[11px] font-bold text-rarity-3 shrink-0 ml-auto">
          <span>↑</span> {build.upvotes}
        </div>
      </div>

      {/* ── Bottom (Portrait Mobile) / Right (Desktop & Horizontal View): Details as Icons in a Row ── */}
      <div className="flex items-center justify-between sm:justify-end landscape:justify-end gap-2 sm:gap-3 landscape:gap-3 shrink-0">
        {/* Row of Equipment Monster Icons + Ink */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Weapon Slot */}
          <div
            title={weaponTitle}
            className={`w-6 h-6 sm:w-7 sm:h-7 landscape:w-7 landscape:h-7 rounded flex items-center justify-center p-0.5 relative border transition-all shrink-0 ${
              weaponIcon
                ? 'bg-mh-slate-800/80 border-mh-slate-700/80'
                : 'bg-mh-slate-850/40 border-dashed border-mh-slate-750'
            }`}
          >
            {weaponIcon ? (
              <img
                src={weaponIcon}
                alt={build.weapon?.name || 'Weapon'}
                className="w-full h-full object-contain filter drop-shadow"
              />
            ) : (
              <Sword size={10} className="text-mh-slate-600" />
            )}
            <span className="absolute bottom-0 right-0 text-[5px] font-black text-mh-slate-400/80 bg-black/60 rounded px-0.5 leading-none pointer-events-none">
              W
            </span>
          </div>

          {/* Armor Slots */}
          {armorSlots.map((slot) => {
            const m = resolveMonster(slot.piece?.monster_id);
            const slotTitle = slot.piece
              ? `${slot.name}: ${m?.name || slot.piece.id}`
              : `${slot.name}: Empty`;

            return (
              <div
                key={slot.slotKey}
                title={slotTitle}
                className={`w-6 h-6 sm:w-7 sm:h-7 landscape:w-7 landscape:h-7 rounded flex items-center justify-center p-0.5 relative border transition-all shrink-0 ${
                  m?.icon
                    ? 'bg-mh-slate-800/80 border-mh-slate-700/80'
                    : 'bg-mh-slate-850/40 border-dashed border-mh-slate-750'
                }`}
              >
                {m?.icon ? (
                  <img
                    src={m.icon}
                    alt={m.name}
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                ) : (
                  <img
                    src={slot.placeholder}
                    alt={slot.name}
                    className="w-3 h-3 object-contain opacity-20 filter grayscale"
                  />
                )}
                <span className="absolute bottom-0 right-0 text-[5px] font-black text-mh-slate-400/80 bg-black/60 rounded px-0.5 leading-none pointer-events-none">
                  {slot.label}
                </span>
              </div>
            );
          })}

          {/* Thin Divider before Ink */}
          <div className="h-4 w-[1px] bg-mh-slate-700 mx-0.5 shrink-0" />

          {/* Highest Level Ink at the End (Clean symbol, blended on ties) */}
          <div className="shrink-0">
            {highestInk ? (
              highestInk.isTie ? (
                // Blended dual-ink icon for ties
                (() => {
                  const cfgA = getInkConfig(highestInk.inks[0]);
                  const cfgB = getInkConfig(highestInk.inks[1]);
                  return (
                    <div
                      title={`Tied Inks: ${cfgA.name} & ${cfgB.name} (${highestInk.count} pieces each)`}
                      className="w-6 h-6 sm:w-7 sm:h-7 landscape:w-7 landscape:h-7 rounded relative overflow-hidden border border-mh-slate-700/90 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${cfgA.glowColor.replace('0.4', '0.25')} 0%, ${cfgA.glowColor.replace('0.4', '0.25')} 48%, rgba(100, 116, 139, 0.5) 50%, ${cfgB.glowColor.replace('0.4', '0.25')} 52%, ${cfgB.glowColor.replace('0.4', '0.25')} 100%)`,
                      }}
                    >
                      <div className="absolute top-0.5 left-0.5">
                        <InkIconComponent iconName={cfgA.iconName} size={9} className={cfgA.text} />
                      </div>
                      <div className="absolute bottom-0.5 right-0.5">
                        <InkIconComponent iconName={cfgB.iconName} size={9} className={cfgB.text} />
                      </div>
                    </div>
                  );
                })()
              ) : (
                // Single highest ink symbol
                (() => {
                  const cfg = getInkConfig(highestInk.inks[0]);
                  return (
                    <div
                      title={`${cfg.name} (${highestInk.count} pieces)`}
                      className={`w-6 h-6 sm:w-7 sm:h-7 landscape:w-7 landscape:h-7 rounded flex items-center justify-center border relative shadow-sm ${cfg.bg} ${cfg.border}`}
                    >
                      <InkIconComponent iconName={cfg.iconName} size={13} className={cfg.text} />
                    </div>
                  );
                })()
              )
            ) : (
              <div
                title="No visages or inks active"
                className="w-6 h-6 sm:w-7 sm:h-7 landscape:w-7 landscape:h-7 rounded flex items-center justify-center border border-dashed border-mh-slate-750 bg-mh-slate-850/30"
              >
                <Sparkles size={10} className="text-mh-slate-600" />
              </div>
            )}
          </div>
        </div>

        {/* Desktop & Landscape Horizontal View: Upvotes & Date */}
        <div className="hidden sm:flex landscape:flex items-center gap-2.5 text-xs text-mh-slate-400 shrink-0">
          <span className="font-bold text-rarity-3 flex items-center gap-0.5">
            <span>↑</span> {build.upvotes}
          </span>
          <span className="text-[10px] text-mh-slate-500">
            {new Date(build.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
          </span>
          <span className="text-rarity-5/80 font-bold group-hover:text-rarity-5 transition-transform group-hover:translate-x-0.5 text-xs">
            →
          </span>
        </div>

        {/* Mobile Portrait Date */}
        <span className="sm:hidden landscape:hidden text-[9px] text-mh-slate-500">
          {new Date(build.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </Link>
  );
}
