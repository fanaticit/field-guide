import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore, armourPieceIcon, type Weapon, type ArmourPiece } from '../../store/buildPlannerStore';
import { useAuthStore } from '../../store/authStore';

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

// ─── Shared Searchable Dropdown ──────────────────────────────────────────────

interface DropdownItem {
  id: string;
  primaryLabel: string;   // Monster/material name — shown bold
  secondaryLabel?: string; // Set name — shown smaller
  icon?: string;
  image?: string;
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
  onChange: (id: string | null) => void;
}

function SearchableDropdown({
  label, items, selectedId, selectedImage, placeholderIcon, placeholder, isLoading, highlightClasses, onChange,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
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
                <p className="px-3 py-3 text-xs text-mh-slate-600 italic">No results for "{query}"</p>
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
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white leading-tight truncate">{item.primaryLabel}</span>
                      {item.secondaryLabel && (
                        <span className="text-[10px] text-mh-slate-400 leading-tight truncate">{item.secondaryLabel}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
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


const getHighlightClasses = (cat: string | null) => {
  if (!cat) return '';
  switch (CATEGORY_ALIASES[cat] ?? cat) {
    case 'attack': return 'border-red-500 ring-1 ring-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/20';
    case 'critical': return 'border-purple-500 ring-1 ring-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/20';
    case 'defense': return 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20';
    case 'survival': return 'border-orange-500 ring-1 ring-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/20';
    case 'status': return 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/20';
    case 'utility': return 'border-yellow-500 ring-1 ring-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/20';
    case 'health': return 'border-green-500 ring-1 ring-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20';
    case 'general':
    default: return 'border-mh-slate-400 ring-1 ring-mh-slate-400/50 bg-mh-slate-400/10 shadow-lg shadow-mh-slate-400/20';
  }
};

export function EquipmentSelector() {
  const { adventurer, weaponType, weapon, setWeapon, helm, chest, gloves, waist, greaves, setArmour, hoveredSkillId, hoveredSkillCategory } = useBuildPlannerStore();
  const profile = useAuthStore((st) => st.profile);
  const catalog = useBuildPlannerStore((st) => st.skillCatalog);
  const gender = profile?.equipment_gender ?? 'male';

  const navigate = useNavigate();
  const isReady = !!adventurer;

  const activeWeaponTypeId = adventurer?.is_default
    ? (weaponType?.id || weapon?.weapon_type_id)
    : adventurer?.allowed_weapon_types?.[0];

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

  // Convert weapons to dropdown items (sorted by rarity descending, then name)
  const weaponItems: DropdownItem[] = [...(weapons || [])]
    .sort((a, b) => (b.rarity ?? 1) - (a.rarity ?? 1) || a.name.localeCompare(b.name))
    .map(w => ({
      id: w.id,
      primaryLabel: w.name,
      secondaryLabel: [
        'R' + (w.rarity ?? 1) + (w.max_rarity && w.max_rarity > (w.rarity ?? 1) ? '→R' + w.max_rarity : ''),
        w.attack ? 'ATK ' + w.attack : null,
        w.element_type && w.element_type !== 'raw'
          ? w.element_type[0].toUpperCase() + w.element_type.slice(1) + (w.element_damage ? ' ' + w.element_damage : '')
          : null,
      ].filter(Boolean).join(' · '),
      icon: w.image ?? undefined,
    }));

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
    <div className="mho-panel has-[[data-dropdown-open]]:relative has-[[data-dropdown-open]]:z-30 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white flex items-center gap-2"><span className="text-[#FFD700] text-xs">❖</span>Equipment</h2>
        <button
          type="button"
          onClick={() => navigate('/armory/armour')}
          className="btn-mho-panel !px-3 !py-1.5 !text-xs !border-[var(--theme-accent)] !text-[var(--theme-accent)] !bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] hover:!text-white"
          title="Browse armour sets and send one back to this build"
        >
          Make an Armour Set
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <SearchableDropdown
          label="Weapon"
          placeholderIcon="/images/weapons/great_sword.png"
          items={weaponItems}
          selectedId={weapon?.id}
          selectedImage={weapon?.image ?? undefined}
          isLoading={isWepLoading}
          onChange={id => setWeapon(weapons?.find(w => w.id === id) || null)}
        />
        {(['helm', 'chest', 'gloves', 'waist', 'greaves'] as const).map(slot => {
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
              onChange={id => {
                const piece = armours?.find(a => a.id === id) || null;
                setArmour(slot, piece);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
