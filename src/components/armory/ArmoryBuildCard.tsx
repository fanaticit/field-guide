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

interface ArmoryBuildCardProps {
  build: ArmoryBuild;
  monsterMap: Map<string, MonsterLookup>;
}

export function ArmoryBuildCard({ build, monsterMap }: ArmoryBuildCardProps) {
  let desc = build.description || '';
  let role = 'main';
  if (/<!-- role:support -->/.test(desc)) {
    role = 'support';
    desc = desc.replace(/(?:\r?\n\r?\n)?<!-- role:support -->/, '');
  }
  const inkMatch = desc.match(/(?:\r?\n\r?\n)?<!-- inks:(.*?) -->/);
  if (inkMatch) {
    desc = desc.replace(inkMatch[0], '');
  }
  desc = desc.trim();

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

  // Highest level ink (single or blended tie)
  const highestInk = getHighestLevelInk(build);

  return (
    <Link
      to={`/armory/planner/${build.id}`}
      className="mho-panel mho-panel-interactive group cursor-pointer flex flex-col p-3 shadow-md"
    >
      {/* ── TOP: Character Trio & Build Title (No nested panel box!) ── */}
      <div className="flex items-start gap-2.5">
        {/* Character Trio: Adventurer -> Buddy -> Weapon Type */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Adventurer Icon */}
          <div
            title={`Adventurer: ${build.adventurer?.name || 'Default'}`}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-mh-slate-800 border border-mh-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 shadow-sm group-hover:border-rarity-5/60 transition-colors"
          >
            {build.adventurer?.image ? (
              <img
                src={build.adventurer.image}
                alt={build.adventurer?.name || 'Adventurer'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[9px] text-mh-slate-500 font-bold uppercase tracking-wider">Adv</span>
            )}
          </div>

          {/* Buddy Icon */}
          <div
            title={`Buddy: ${build.buddy?.name || 'None'}`}
            className="w-8 h-8 rounded-md bg-mh-slate-800 border border-mh-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 shadow-sm group-hover:border-rarity-4/50 transition-colors"
          >
            {build.buddy?.image ? (
              <img
                src={build.buddy.image}
                alt={build.buddy?.name || 'Buddy'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[7px] text-mh-slate-600 font-bold uppercase">Buddy</span>
            )}
          </div>

          {/* Weapon Type Icon */}
          <div
            title={build.weapon_type?.name ? `Weapon Type: ${build.weapon_type.name}` : 'Weapon Type'}
            className="w-6 h-6 rounded bg-mh-slate-800 border border-mh-slate-700/80 p-0.5 flex items-center justify-center shrink-0 shadow-sm"
          >
            {build.weapon_type?.icon ? (
              <img
                src={build.weapon_type.icon}
                alt={build.weapon_type.name}
                className="w-full h-full object-contain filter drop-shadow"
              />
            ) : (
              <Sword size={11} className="text-mh-slate-400" />
            )}
          </div>
        </div>

        {/* Title, Role, Author */}
        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            {role === 'main' ? (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0 text-[8px] font-bold uppercase tracking-wider shrink-0">
                Main
              </span>
            ) : (
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0 text-[8px] font-bold uppercase tracking-wider shrink-0">
                Support
              </span>
            )}
            <span className="text-xs font-bold text-rarity-3 shrink-0 flex items-center gap-0.5">
              <span>↑</span> {build.upvotes}
            </span>
          </div>

          <h3 className="font-display font-bold text-sm text-mh-slate-100 group-hover:text-white transition-colors truncate">
            {build.title}
          </h3>
          <p className="text-[10px] text-mh-slate-400 truncate">
            by <span className="text-mh-slate-300 font-medium">{build.author?.username || 'Unknown Hunter'}</span>
          </p>
        </div>
      </div>

      {/* ── MIDDLE: Equipment Monster Showcase & Highest Ink Strip (No nested panel box!) ── */}
      <div className="mt-2.5 pt-2 border-t border-mh-slate-750/60 flex items-center justify-between gap-1">
        {/* Equipment monster icons */}
        <div className="flex items-center gap-1 min-w-0 flex-1 justify-between">
          {/* Weapon Slot */}
          <div
            title={weaponTitle}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center p-0.5 relative border transition-all ${
              weaponIcon
                ? 'bg-mh-slate-800/90 border-mh-slate-700/80 shadow-sm'
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
              <Sword size={12} className="text-mh-slate-600" />
            )}
            <span className="absolute bottom-0 right-0 text-[6px] font-black text-mh-slate-400/80 bg-black/60 rounded px-0.5 leading-none pointer-events-none">
              W
            </span>
          </div>

          {/* Armor Slots (Helm, Chest, Gloves, Waist, Greaves) */}
          {armorSlots.map((slot) => {
            const m = resolveMonster(slot.piece?.monster_id);
            const slotTitle = slot.piece
              ? `${slot.name}: ${m?.name || slot.piece.id}`
              : `${slot.name}: Empty`;

            return (
              <div
                key={slot.slotKey}
                title={slotTitle}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center p-0.5 relative border transition-all ${
                  m?.icon
                    ? 'bg-mh-slate-800/90 border-mh-slate-700/80 shadow-sm'
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
                    className="w-3.5 h-3.5 object-contain opacity-20 filter grayscale"
                  />
                )}
                <span className="absolute bottom-0 right-0 text-[6px] font-black text-mh-slate-400/80 bg-black/60 rounded px-0.5 leading-none pointer-events-none">
                  {slot.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider before Ink */}
        <div className="h-5 w-[1px] bg-mh-slate-700 mx-0.5 shrink-0" />

        {/* Highest Level Ink Symbol at the End (Clean symbol, blended on ties) */}
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
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-md relative overflow-hidden border border-mh-slate-700/90 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${cfgA.glowColor.replace('0.4', '0.25')} 0%, ${cfgA.glowColor.replace('0.4', '0.25')} 48%, rgba(100, 116, 139, 0.5) 50%, ${cfgB.glowColor.replace('0.4', '0.25')} 52%, ${cfgB.glowColor.replace('0.4', '0.25')} 100%)`,
                    }}
                  >
                    {/* Top-left icon for Ink A */}
                    <div className="absolute top-0.5 left-0.5">
                      <InkIconComponent iconName={cfgA.iconName} size={10} className={cfgA.text} />
                    </div>
                    {/* Bottom-right icon for Ink B */}
                    <div className="absolute bottom-0.5 right-0.5">
                      <InkIconComponent iconName={cfgB.iconName} size={10} className={cfgB.text} />
                    </div>
                  </div>
                );
              })()
            ) : (
              // Single highest ink symbol (pure symbol, no level text)
              (() => {
                const cfg = getInkConfig(highestInk.inks[0]);
                return (
                  <div
                    title={`${cfg.name} (${highestInk.count} pieces)`}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center border relative shadow-sm ${cfg.bg} ${cfg.border}`}
                  >
                    <InkIconComponent iconName={cfg.iconName} size={14} className={cfg.text} />
                  </div>
                );
              })()
            )
          ) : (
            <div
              title="No visages or inks active"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center border border-dashed border-mh-slate-750 bg-mh-slate-850/30"
            >
              <Sparkles size={11} className="text-mh-slate-600" />
            </div>
          )}
        </div>
      </div>

      {/* Description Snippet */}
      {desc ? (
        <p className="text-[11px] text-mh-slate-300 mt-2 line-clamp-1 leading-normal">
          {desc}
        </p>
      ) : null}

      {/* ── BOTTOM: Date & Navigation hint ─────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-mh-slate-750/40 text-[10px] text-mh-slate-500">
        <span>{new Date(build.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        <span className="text-rarity-5/80 font-bold group-hover:text-rarity-5 flex items-center gap-0.5 transition-colors">
          View Build <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}
