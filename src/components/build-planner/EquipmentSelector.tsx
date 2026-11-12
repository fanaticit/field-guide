import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Globe, Package, ArrowLeftRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore, armourPieceIcon, type Weapon, type ArmourPiece } from '../../store/buildPlannerStore';
import { useAuthStore } from '../../store/authStore';
import { useUserWeaponCollection } from '../../hooks/useUserWeaponCollection';
import { useAdminSkills, type DBSkill } from '../../hooks/useAdminSkills';
import { buildSkillIndex } from '../../lib/skillIndex';
import { cn } from '../../lib/utils';
import { getWeaponMaxName, type DBWeapon } from '../../data/schemas/weapon';

type PlannerSlot = 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves';
// Slot names of the game data
const GAME_SLOT: Record<PlannerSlot, string> = {
  helm: 'Head',
  chest: 'Chest',
  gloves: 'Arms',
  waist: 'Waist',
  greaves: 'Legs',
};
const SLOT_LABEL: Record<PlannerSlot, string> = {
  helm: 'Helm',
  chest: 'Chest',
  gloves: 'Arms',
  waist: 'Coil',
  greaves: 'Greaves',
};
// The game's skill categories use the colours of the closest legacy category
const CATEGORY_ALIASES: Record<string, string> = {
  'Hunt (General)': 'attack',
  'Hunt (Ranged)': 'critical',
  'Weapon-specific': 'utility',
  Attributes: 'defense',
  Resistance: 'status',
  Survival: 'survival',
  Exploration: 'general',
};

function getSetBonusDisplay(
  setBonus: { pieces: number; skill_id: string } | null | undefined,
  byId: Map<string, DBSkill>
) {
  if (!setBonus) return null;
  const sk = byId.get(setBonus.skill_id);
  const name = sk?.name || 'Set Bonus';
  let desc = sk?.description;

  if (!desc && sk?.set_thresholds?.length) {
    const matchingTier =
      sk.set_thresholds.find((t) => typeof t === 'object' && t.pieces === setBonus.pieces) ||
      sk.set_thresholds[0];
    if (matchingTier && typeof matchingTier === 'object') {
      if (matchingTier.description) {
        desc = matchingTier.description;
      } else if (matchingTier.granted_skill_id) {
        const granted = byId.get(matchingTier.granted_skill_id);
        desc = granted
          ? `${granted.name} Lv. ${matchingTier.granted_skill_level ?? 1}${
              granted.description ? ` (${granted.description})` : ''
            }`
          : null;
      }
    }
  }

  return {
    pieces: setBonus.pieces,
    name,
    description: desc,
  };
}

function ArmourPieceTooltip({
  piece,
  slot,
  byId,
  align = 'center',
}: {
  piece: ArmourPiece | null | undefined;
  slot: PlannerSlot;
  byId: Map<string, DBSkill>;
  align?: 'left' | 'center' | 'right';
}) {
  if (!piece) return null;

  const pieceName = ((piece.set_name ?? piece.monster_name ?? 'Armour') + ' ' + (piece.set_variant ?? '')).trim();
  const skills = (piece.skills ?? [])
    .map((idOrObj: unknown) => {
      const id = typeof idOrObj === 'string' ? idOrObj : (idOrObj as { id?: string })?.id;
      return id ? byId.get(id) : null;
    })
    .filter(Boolean) as DBSkill[];
  const setBonus = getSetBonusDisplay(piece.set_bonus, byId);

  const alignClasses =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className={`absolute bottom-full mb-2 ${alignClasses} w-64 sm:w-72 max-w-[calc(100vw-2rem)] p-2.5 rounded-lg bg-mh-slate-900/95 backdrop-blur-md border border-mh-slate-700 shadow-2xl z-50 pointer-events-none flex flex-col gap-2 text-left animate-in fade-in zoom-in-95 duration-150`}
    >
      {/* Header */}
      <div className="border-b border-mh-slate-800 pb-1.5 flex items-start justify-between gap-1">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-white leading-tight truncate">{pieceName}</span>
          <span className="text-[10px] text-mh-slate-400 leading-tight">
            {SLOT_LABEL[slot]} · Rarity {piece.rarity ?? 1}
          </span>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-mh-slate-400 uppercase tracking-wider">Skills</span>
          {skills.map((sk) => {
            const cat = CATEGORY_ALIASES[sk.category] ?? sk.category;
            const catColor =
              cat === 'attack' ? 'text-red-400' :
              cat === 'critical' ? 'text-purple-400' :
              cat === 'defense' ? 'text-blue-400' :
              cat === 'survival' ? 'text-orange-400' :
              cat === 'status' ? 'text-emerald-400' :
              cat === 'utility' ? 'text-yellow-400' :
              cat === 'health' ? 'text-green-400' :
              'text-mh-slate-300';

            return (
              <div key={sk.id} className="flex flex-col gap-0.5 bg-black/40 p-1.5 rounded border border-white/5">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[11px] font-bold ${catColor}`}>{sk.name}</span>
                  <span className={`text-[10px] font-display font-black ${catColor}`}>Lv. {sk.level}</span>
                </div>
                {sk.description && (
                  <span className="text-[10px] text-mh-slate-300 leading-tight">{sk.description}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Set Bonus */}
      {setBonus && (
        <div className="flex flex-col gap-1 pt-1 border-t border-mh-slate-800/80">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Set Bonus</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {setBonus.pieces}pc
            </span>
          </div>
          <div className="flex flex-col gap-0.5 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
            <span className="text-[11px] font-bold text-amber-300">
              {setBonus.name}
            </span>
            {setBonus.description && (
              <span className="text-[10px] text-mh-slate-200 leading-tight">{setBonus.description}</span>
            )}
          </div>
        </div>
      )}

      {skills.length === 0 && !setBonus && (
        <span className="text-[10px] text-mh-slate-500 italic">No skills or set bonus on this piece.</span>
      )}
    </div>
  );
}

// ─── Shared Searchable Dropdown ──────────────────────────────────────────────

interface DropdownItem {
  id: string;
  primaryLabel: string;   // Monster/material name — shown bold
  secondaryLabel?: string; // Set name — shown smaller
  icon?: string;
  image?: string;
  badge?: string;
}

export interface DropdownFooterButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'amber' | 'gold' | 'cyan' | 'default';
  title?: string;
}

interface SearchableDropdownProps {
  label: string;
  items: DropdownItem[];
  selectedId?: string;
  selectedImage?: string;
  placeholderIcon?: string;
  placeholder?: string;
  isLoading?: boolean;
  highlightClasses?: string;
  emptyMessage?: string;
  footerButton?: DropdownFooterButton;
  footerButtons?: DropdownFooterButton[];
  tooltipContent?: React.ReactNode;
  onChange: (id: string | null) => void;
}

function SearchableDropdown({
  label, items, selectedId, selectedImage, placeholderIcon, placeholder, isLoading, highlightClasses, emptyMessage, footerButton, footerButtons, tooltipContent, onChange,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find(i => i.id === selectedId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const filtered = query.trim()
    ? items.filter(i =>
        i.primaryLabel.toLowerCase().includes(query.toLowerCase()) ||
        (i.secondaryLabel?.toLowerCase().includes(query.toLowerCase()))
      )
    : items;

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Left: Placeholder Icon */}
      {placeholderIcon ? (
        <div className="w-8 h-8 shrink-0 opacity-60">
          <img src={placeholderIcon} alt={label} className="w-full h-full object-contain filter grayscale invert opacity-70 brightness-200" />
        </div>
      ) : (
        <div className="w-8 h-8 shrink-0" /> // spacer for weapon if it doesn't have one
      )}

      {/* Center: Dropdown Button */}
      <div ref={containerRef} className="relative flex-1 min-w-0">
        <button
          onClick={() => !isLoading && setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={isLoading}
          className={`w-full flex items-center justify-between bg-mh-slate-800/80 hover:bg-mh-slate-700 border rounded-lg p-2 px-3 transition-colors text-left h-[50px] ${highlightClasses ? highlightClasses : 'border-mh-slate-700'}`}
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-rarity-3 uppercase tracking-wider mb-0.5">{label}</span>
            {isLoading ? (
              <span className="text-xs text-mh-slate-500 animate-pulse">Loading...</span>
            ) : selected ? (
              <>
                <span className="text-sm font-bold text-white leading-tight truncate">{selected.primaryLabel}</span>
                {selected.secondaryLabel && (
                  <span className="text-[10px] text-mh-slate-400 leading-tight truncate">{selected.secondaryLabel}</span>
                )}
              </>
            ) : (
              <span className="text-xs text-mh-slate-500">{placeholder || `Select...`}</span>
            )}
          </div>
          <span className="text-[10px] text-mh-slate-600 shrink-0 ml-2">▼</span>
        </button>

        {/* Hover Tooltip when dropdown is closed */}
        {!isOpen && isHovered && tooltipContent}

        {/* Dropdown panel */}
        {isOpen && (
          <div data-dropdown-open="true" className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b2e] border border-mh-slate-700 rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden" style={{ minWidth: '220px' }}>
            <div className="p-2 border-b border-mh-slate-700/60">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full bg-mh-slate-900 border border-mh-slate-700 rounded px-2 py-1.5 text-xs text-mh-slate-200 placeholder-mh-slate-600 outline-none focus:border-mh-slate-500"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              <button
                onClick={() => { onChange(null); setIsOpen(false); setQuery(''); }}
                className="w-full px-3 py-2 text-left text-xs text-mh-slate-500 hover:bg-white/5 flex items-center gap-2 border-b border-mh-slate-800"
              >
                <span className="text-mh-slate-600">✕</span> None
              </button>
              {filtered.length === 0 ? (
                <div className="p-3 text-center">
                  <p className="text-xs text-mh-slate-400 italic">
                    {query ? `No results for "${query}"` : emptyMessage || 'No items found'}
                  </p>
                </div>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onChange(item.id); setIsOpen(false); setQuery(''); }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-white/5 transition-colors ${item.id === selectedId ? 'bg-white/10' : ''}`}
                  >
                    <div className="w-8 h-8 rounded bg-black/20 border border-white/5 flex items-center justify-center shrink-0 p-0.5">
                      {item.icon ? (
                        <img src={item.icon} alt={item.primaryLabel} className="w-full h-full object-contain opacity-90" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-mh-slate-700" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-white leading-tight truncate">{item.primaryLabel}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.secondaryLabel && (
                        <span className="text-[10px] text-mh-slate-400 leading-tight truncate">{item.secondaryLabel}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            {(() => {
              const effectiveButtons = footerButtons ?? (footerButton ? [footerButton] : []);
              if (effectiveButtons.length === 0) return null;
              return (
                <div className="flex items-stretch border-t border-mh-slate-750 divide-x divide-mh-slate-750 bg-mh-slate-900/95">
                  {effectiveButtons.map((btn, idx) => (
                    <button
                      key={idx}
                      type="button"
                      title={btn.title}
                      onClick={() => btn.onClick()}
                      className={cn(
                        'flex-1 py-2 px-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0',
                        btn.variant === 'gold'
                          ? 'text-mh-gold-400 hover:text-mh-gold-300 bg-mh-gold-500/10 hover:bg-mh-gold-500/20'
                          : btn.variant === 'cyan'
                          ? 'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20'
                          : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20',
                      )}
                    >
                      {btn.icon && <span className="shrink-0">{btn.icon}</span>}
                      <span className="truncate">{btn.label}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Right: Selected image preview */}
      <div className="w-[50px] h-[50px] rounded bg-mh-slate-900 border border-mh-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden p-0">
        {selectedImage ? (
          <img src={selectedImage} alt={selected?.primaryLabel || 'Selected'} className="w-[46px] h-[46px] object-contain drop-shadow-md" />
        ) : (
          <div className="w-4 h-4 bg-mh-slate-800 rounded-full" />
        )}
      </div>
    </div>
  );
}

// ─── Equipment Selector ───────────────────────────────────────────────────────


const getHighlightClasses = (cat: string | null | undefined) => {
  const resolved = cat ? (CATEGORY_ALIASES[cat] ?? cat) : 'general';
  switch (resolved) {
    case 'attack': return 'border-red-500 ring-2 ring-red-500/50 bg-red-500/20 shadow-lg shadow-red-500/30';
    case 'critical': return 'border-purple-500 ring-2 ring-purple-500/50 bg-purple-500/20 shadow-lg shadow-purple-500/30';
    case 'defense': return 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-500/20 shadow-lg shadow-blue-500/30';
    case 'survival': return 'border-orange-500 ring-2 ring-orange-500/50 bg-orange-500/20 shadow-lg shadow-orange-500/30';
    case 'status': return 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-500/20 shadow-lg shadow-emerald-500/30';
    case 'utility': return 'border-yellow-500 ring-2 ring-yellow-500/50 bg-yellow-500/20 shadow-lg shadow-yellow-500/30';
    case 'health': return 'border-green-500 ring-2 ring-green-500/50 bg-green-500/20 shadow-lg shadow-green-500/30';
    case 'general':
    default: return 'border-rarity-3 ring-2 ring-rarity-3/50 bg-rarity-3/20 shadow-lg shadow-rarity-3/30';
  }
};

export function EquipmentSelector() {
  const {
    adventurer, weaponType, weapon, setWeapon, helm, chest, gloves, waist, greaves, setArmour,
    hoveredSkillId, hoveredSkillCategory, useMine,
  } = useBuildPlannerStore();
  const profile = useAuthStore((st) => st.profile);
  const catalog = useBuildPlannerStore((st) => st.skillCatalog);
  const gender = profile?.equipment_gender ?? 'male';
  const { isCrafted } = useUserWeaponCollection();
  const [showAllWeapons, setShowAllWeapons] = useState(false);
  const [showArmourPieces, setShowArmourPieces] = useState(false);
  const [hoveredArmourSlot, setHoveredArmourSlot] = useState<PlannerSlot | null>(null);

  const { data: skillsData = [] } = useAdminSkills({ isActive: true });
  const { byId } = useMemo(() => buildSkillIndex(skillsData), [skillsData]);

  // When useMine toggle changes, reset the local showAllWeapons override
  useEffect(() => {
    setShowAllWeapons(false);
  }, [useMine]);

  const navigate = useNavigate();
  const isReady = !!adventurer;

  const activeWeaponTypeId = adventurer?.is_default
    ? (weaponType?.id || weapon?.weapon_type_id)
    : adventurer?.allowed_weapon_types?.[0];

  const handleGoToCompare = () => {
    const params = new URLSearchParams();
    if (activeWeaponTypeId) {
      params.set('type', activeWeaponTypeId);
    }
    if (weapon?.id) {
      params.set('compare', weapon.id);
    }
    const query = params.toString();
    navigate(`/challenges/weapons${query ? `?${query}` : ''}`);
  };

  const { data: weapons, isLoading: isWepLoading } = useQuery({
    queryKey: ['weapons', activeWeaponTypeId],
    queryFn: async () => {
      let q = supabase
        .from('weapons')
        .select('*')
        .eq('weapon_type_id', activeWeaponTypeId)
        .eq('is_active', true)
        .eq('is_spoiler', false)
        .limit(1000);
      const { data, error } = await q;
      if (error) throw error;
      return data as Weapon[];
    },
    enabled: !!activeWeaponTypeId
  });

  // Fetch armour and monsters separately since the DB foreign key was dropped
  const { data: armours, isLoading: isArmourLoading } = useQuery({
    queryKey: ['armours_mho'],
    queryFn: async () => {
      // 1. Fetch the armour pieces (never show spoiler items in planner)
      const { data: armourData, error: armourError } = await supabase
        .from('armour_pieces')
        .select('*')
        .eq('is_active', true)
        .eq('is_spoiler', false)
        .limit(1000);
      if (armourError) throw armourError;

      // 2. Fetch all active monsters
      const { data: monsterData, error: monsterError } = await supabase
        .from('monsters')
        .select('id, name, icon')
        .eq('is_active', true);
      if (monsterError) throw monsterError;

      // Create a lookup map for monsters
      const monsterMap = new Map<string, { name: string; icon: string | null }>();
      monsterData.forEach(m => monsterMap.set(m.id, m));

      // 3. Client-side join
      return (armourData as ArmourPiece[]).map(piece => {
        const monster = monsterMap.get(piece.monster_id);
        return {
          ...piece,
          monster_name: monster?.name ?? piece.monster_id, // not linked to a monster yet: the stored name
          monster_icon: monster?.icon ?? null,
        };
      }) as (ArmourPiece & { monster_name: string; monster_icon?: string })[];
    }
  });

  if (!isReady) return null;

  const isOnlyCrafted = useMine && !showAllWeapons;
  const filteredWeapons = isOnlyCrafted
    ? (weapons || []).filter(w => isCrafted(w.id) || w.id === weapon?.id)
    : (weapons || []);

  const totalWeaponsCount = weapons?.length || 0;
  const craftedWeaponsCount = (weapons || []).filter(w => isCrafted(w.id)).length;

  // Convert weapons to dropdown items (sorted by rarity descending, then max name)
  const weaponItems: DropdownItem[] = [...filteredWeapons]
    .sort((a, b) => {
      const nameA = getWeaponMaxName(a as DBWeapon);
      const nameB = getWeaponMaxName(b as DBWeapon);
      return (b.rarity ?? 1) - (a.rarity ?? 1) || nameA.localeCompare(nameB);
    })
    .map(w => {
      const maxName = getWeaponMaxName(w as DBWeapon);
      const hasDifferentBase = maxName && maxName.toLowerCase() !== w.name.toLowerCase();
      return {
        id: w.id,
        primaryLabel: maxName,
        badge: isCrafted(w.id) ? '✓ Crafted' : undefined,
        secondaryLabel: [
          hasDifferentBase ? `Base: ${w.name}` : (w.series ?? null),
          'R' + (w.rarity ?? 1) + (w.max_rarity && w.max_rarity > (w.rarity ?? 1) ? '→R' + w.max_rarity : ''),
          w.attack ? 'ATK ' + w.attack : null,
          w.element_type && w.element_type !== 'raw'
            ? w.element_type[0].toUpperCase() + w.element_type.slice(1) + (w.element_damage ? ' ' + w.element_damage : '')
            : null,
        ].filter(Boolean).join(' · '),
        icon: w.image ?? undefined,
      };
    });

  // Convert armour pieces to dropdown items per slot (highest rarity first)
  const armourItems = (slot: PlannerSlot): DropdownItem[] =>
    (armours || [])
      .filter(a => a.slot === GAME_SLOT[slot])
      .sort((a, b) => (b.rarity ?? 1) - (a.rarity ?? 1) || String(a.set_name).localeCompare(String(b.set_name)))
      .map((a: ArmourPiece & { monster_name: string; monster_icon?: string }) => ({
        id: a.id,
        primaryLabel: ((a.set_name ?? a.monster_name) + ' ' + (a.set_variant ?? '')).trim(),
        secondaryLabel: SLOT_LABEL[slot] + ' · R' + (a.rarity ?? 1),
        icon: armourPieceIcon(a, gender) ?? a.monster_icon,
      }));

  // Pieces whose skills (or set bonus) include the skill hovered in the summary
  const highlightSlots = new Set<PlannerSlot>();
  if (hoveredSkillId) {
    (['helm', 'chest', 'gloves', 'waist', 'greaves'] as const).forEach((slot) => {
      const piece = { helm, chest, gloves, waist, greaves }[slot];
      const ids = [...(piece?.skills ?? []), ...(piece?.set_bonus ? [piece.set_bonus.skill_id] : [])];
      if (ids.some((id) => catalog.get(id)?.baseId === hoveredSkillId)) highlightSlots.add(slot);
    });
  }

  return (
    // Lift the whole panel above its siblings while a dropdown is open
    <div className="mho-panel relative isolate has-[[data-dropdown-open]]:relative has-[[data-dropdown-open]]:z-50 p-4 flex flex-col gap-4">
      {/* Background Weapon Artwork */}
      {weapon?.image && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
          <img
            src={weapon.image}
            alt=""
            className="absolute -right-4 top-1/2 -translate-y-1/2 h-[140%] max-h-[380px] w-auto max-w-none object-contain opacity-20 filter drop-shadow-2xl transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#131622]/95 via-[#131622]/75 to-[#131622]/20" />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white flex items-center gap-2 mr-auto">
          <span className="text-[#FFD700] text-xs">❖</span>Equipment
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/armory/armour')}
            className="btn-mho-panel !px-3 !py-1.5 !text-xs !border-[var(--theme-accent)] !text-[var(--theme-accent)] !bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] hover:!text-white cursor-pointer"
            title="Browse armour sets and send one back to this build"
          >
            Make an Armour Set
          </button>
          <button
            type="button"
            onClick={() => setShowArmourPieces((prev) => !prev)}
            className={`btn-mho-panel !px-3 !py-1.5 !text-xs transition-all cursor-pointer ${
              showArmourPieces
                ? '!border-rarity-3 !text-white !bg-rarity-3/20 shadow-sm'
                : '!border-mh-slate-700 text-mh-slate-300 hover:text-white'
            }`}
          >
            {showArmourPieces ? "Hide Armour Pieces" : "I'll Select My Own Armour Pieces"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <SearchableDropdown
          label="Weapon"
          placeholderIcon="/images/weapons/great_sword.png"
          items={weaponItems}
          selectedId={weapon?.id}
          selectedImage={weapon?.image ?? undefined}
          isLoading={isWepLoading}
          emptyMessage={isOnlyCrafted ? 'No crafted weapons found for this type.' : undefined}
          footerButtons={[
            ...(isOnlyCrafted
              ? [{
                  label: `Load All Weapons (${totalWeaponsCount})`,
                  onClick: () => setShowAllWeapons(true),
                  icon: <Globe size={13} />,
                  variant: 'amber' as const,
                }]
              : useMine
              ? [{
                  label: `Show Only Crafted (${craftedWeaponsCount})`,
                  onClick: () => setShowAllWeapons(false),
                  icon: <Package size={13} />,
                  variant: 'amber' as const,
                }]
              : []),
            {
              label: 'Compare Weapons',
              onClick: handleGoToCompare,
              icon: <ArrowLeftRight size={13} />,
              variant: 'gold' as const,
              title: 'Go to Weapons Comparison',
            },
          ]}
          onChange={id => setWeapon(weapons?.find(w => w.id === id) || null)}
        />
        {showArmourPieces ? (
          (['helm', 'chest', 'gloves', 'waist', 'greaves'] as const).map(slot => {
            const current = { helm, chest, gloves, waist, greaves }[slot];
            const slotLabel = SLOT_LABEL[slot];
            // find the monster_icon for the current piece
            const currentPieceWithMonster = (armours || []).find(a => a.id === current?.id) as (ArmourPiece & { monster_icon?: string }) | undefined;
            
            const slotIconPath = `/images/armor/${slot}.png`;
            return (
              <SearchableDropdown
                key={slot}
                label={slotLabel}
                highlightClasses={hoveredSkillId && highlightSlots.has(slot) ? getHighlightClasses(hoveredSkillCategory) : undefined}
                placeholderIcon={slotIconPath}
                items={armourItems(slot)}
                selectedId={current?.id}
                selectedImage={armourPieceIcon(current, gender) || currentPieceWithMonster?.monster_icon || undefined}
                isLoading={isArmourLoading}
                tooltipContent={current ? <ArmourPieceTooltip piece={current} slot={slot} byId={byId} align="left" /> : undefined}
                onChange={id => {
                  const piece = armours?.find(a => a.id === id) || null;
                  setArmour(slot, piece);
                }}
              />
            );
          })
        ) : (helm || chest || gloves || waist || greaves) ? (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-mh-slate-700/60 bg-mh-slate-800/40">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-mh-slate-400 font-medium">
                Equipped Armour ({[helm, chest, gloves, waist, greaves].filter(Boolean).length}/5)
              </span>
              <button
                type="button"
                onClick={() => setShowArmourPieces(true)}
                className="text-[11px] text-[var(--theme-accent)] hover:underline font-medium cursor-pointer"
              >
                Customize Pieces
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {(['helm', 'chest', 'gloves', 'waist', 'greaves'] as const).map((slot) => {
                const current = { helm, chest, gloves, waist, greaves }[slot];
                const currentPieceWithMonster = (armours || []).find((a) => a.id === current?.id) as (ArmourPiece & { monster_icon?: string }) | undefined;
                const icon = armourPieceIcon(current, gender) || currentPieceWithMonster?.monster_icon || `/images/armor/${slot}.png`;
                const pieceName = current ? ((current.set_name ?? current.monster_name ?? 'Armour') + ' ' + (current.set_variant ?? '')).trim() : null;
                const isHighlighted = Boolean(hoveredSkillId && highlightSlots.has(slot));
                const isHovered = hoveredArmourSlot === slot;
                const align = slot === 'helm' || slot === 'chest' ? 'left' : slot === 'waist' || slot === 'greaves' ? 'right' : 'center';

                return (
                  <div
                    key={slot}
                    className={`relative ${isHovered ? 'z-30' : ''}`}
                    onMouseEnter={() => setHoveredArmourSlot(slot)}
                    onMouseLeave={() => setHoveredArmourSlot(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setShowArmourPieces(true)}
                      className={`w-full flex flex-col items-center p-1.5 rounded border text-center transition-all group cursor-pointer ${
                        isHighlighted
                          ? `${getHighlightClasses(hoveredSkillCategory)} scale-[1.04] z-10`
                          : 'border-mh-slate-700/60 bg-mh-slate-800/80 hover:border-mh-slate-500'
                      }`}
                      title={!current ? `${SLOT_LABEL[slot]}: Empty` : undefined}
                    >
                      <img src={icon} alt={SLOT_LABEL[slot]} className="w-6 h-6 object-contain" />
                      <span className={`text-[10px] font-bold uppercase mt-1 leading-none ${isHighlighted ? 'text-white' : 'text-mh-slate-400'}`}>
                        {SLOT_LABEL[slot]}
                      </span>
                      <span className={`text-[10px] truncate w-full mt-0.5 ${isHighlighted ? 'text-white font-semibold' : 'text-mh-slate-300 group-hover:text-white'}`}>
                        {pieceName ?? <span className="text-mh-slate-500">None</span>}
                      </span>
                    </button>
                    {isHovered && current && (
                      <ArmourPieceTooltip piece={current} slot={slot} byId={byId} align={align} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-mh-slate-700/60 bg-mh-slate-800/20 text-center text-xs text-mh-slate-400">
            Armour piece selection is hidden. Click{' '}
            <button
              type="button"
              onClick={() => setShowArmourPieces(true)}
              className="text-[var(--theme-accent)] hover:underline font-medium cursor-pointer"
            >
              I'll Select My Own Armour Pieces
            </button>{' '}
            or{' '}
            <button
              type="button"
              onClick={() => navigate('/armory/armour')}
              className="text-[var(--theme-accent)] hover:underline font-medium cursor-pointer"
            >
              Make an Armour Set
            </button>
            .
          </div>
        )}
      </div>
    </div>
  );
}
