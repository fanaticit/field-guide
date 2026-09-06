import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore, type Weapon, type ArmourPiece } from '../../store/buildPlannerStore';

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
  onChange: (id: string | null) => void;
}

function SearchableDropdown({
  label, items, selectedId, selectedImage, placeholderIcon, placeholder, isLoading, onChange,
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
          className="w-full flex items-center justify-between bg-mh-slate-800/80 hover:bg-mh-slate-700 border border-mh-slate-700 rounded-lg p-2 px-3 transition-colors text-left h-[50px]"
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
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b2e] border border-mh-slate-700 rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden" style={{ minWidth: '220px' }}>
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

export function EquipmentSelector() {
  const { adventurer, weaponType, weapon, setWeapon, helm, chest, gloves, waist, greaves, setArmour } = useBuildPlannerStore();

  const isReady = !!adventurer;

  const activeWeaponTypeId = adventurer?.is_default
    ? (weaponType?.id || weapon?.weapon_type_id)
    : adventurer?.allowed_weapon_types?.[0];

  const { data: weapons, isLoading: isWepLoading } = useQuery({
    queryKey: ['weapons', activeWeaponTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weapons')
        .select('*')
        .eq('weapon_type_id', activeWeaponTypeId)
        .eq('is_active', true);
      if (error) throw error;
      return data as Weapon[];
    },
    enabled: !!activeWeaponTypeId
  });

  // Fetch armour and monsters separately since the DB foreign key was dropped
  const { data: armours, isLoading: isArmourLoading } = useQuery({
    queryKey: ['armours_mho'],
    queryFn: async () => {
      // 1. Fetch MHO armour pieces
      const { data: armourData, error: armourError } = await supabase
        .from('armour_pieces')
        .select('*')
        .eq('game', 'mho')
        .eq('is_active', true);
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
          monster_name: monster?.name ?? piece.monster_id, // fallback to id if not a real monster
          monster_icon: monster?.icon ?? null,
        };
      }) as (ArmourPiece & { monster_name: string; monster_icon?: string })[];
    }
  });

  if (!isReady) return null;

  // Convert weapons to dropdown items (sorted by rarity descending, then name)
  const weaponItems: DropdownItem[] = [...(weapons || [])]
    .sort((a, b) => (b.rarity ?? b.grade ?? 1) - (a.rarity ?? a.grade ?? 1) || a.name.localeCompare(b.name))
    .map(w => ({
      id: w.id,
      primaryLabel: w.name,
      secondaryLabel: w.upgraded_name
        ? `Upgrades: ${w.upgraded_name} · Rarity ${w.rarity ?? w.grade ?? 1}`
        : `Rarity ${w.rarity ?? w.grade ?? 1}`,
      icon: w.image,
    }));

  // Convert armour pieces to dropdown items per slot
  const armourItems = (slot: ArmourPiece['slot']): DropdownItem[] =>
    (armours || [])
      .filter(a => a.slot === slot)
      .map((a: ArmourPiece & { monster_name: string; monster_icon?: string }) => ({
        id: a.id,
        primaryLabel: (a as any).monster_name || a.monster_id,
        secondaryLabel: a.set_name ? `${a.set_name} ${slot.charAt(0).toUpperCase() + slot.slice(1)}` : undefined,
        icon: (a as any).monster_icon,
        image: a.image,
      }));

  return (
    <div className="bg-mh-slate-800/30 border border-mh-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="font-display text-base font-bold text-mh-slate-200">Equipment</h2>

      <div className="flex flex-col gap-2.5">
        <SearchableDropdown
          label="Weapon"
          placeholderIcon="/images/weapons/great_sword.png"
          items={weaponItems}
          selectedId={weapon?.id}
          selectedImage={weapon?.image} // Weapons can keep their image or icon
          isLoading={isWepLoading}
          onChange={id => setWeapon(weapons?.find(w => w.id === id) || null)}
        />
        {(['helm', 'chest', 'gloves', 'waist', 'greaves'] as const).map(slot => {
          const current = { helm, chest, gloves, waist, greaves }[slot];
          const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1);
          // find the monster_icon for the current piece
          const currentPieceWithMonster = (armours || []).find(a => a.id === current?.id) as (ArmourPiece & { monster_icon?: string }) | undefined;
          
          const slotIconPath = `/images/armor/${slot}.png`;
            return (
              <SearchableDropdown
                key={slot}
                label={slotLabel}
                placeholderIcon={slotIconPath}
              items={armourItems(slot)}
              selectedId={current?.id}
              selectedImage={current?.image || currentPieceWithMonster?.monster_icon} // Use armour image
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
