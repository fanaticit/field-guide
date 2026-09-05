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
  placeholder?: string;
  isLoading?: boolean;
  onChange: (id: string | null) => void;
}

function SearchableDropdown({
  label, items, selectedId, selectedImage, placeholder, isLoading, onChange,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find(i => i.id === selectedId);

  // Close on outside click
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

  // Focus input when opening
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
    <div ref={containerRef} className="flex flex-col gap-1.5 bg-mh-slate-800/50 p-3 rounded-lg border border-mh-slate-800">
      <label className="text-[10px] font-bold text-mh-slate-400 uppercase tracking-wider">{label}</label>

      <div className="flex items-center gap-2">
        {/* Selected image preview */}
        <div className="w-10 h-10 rounded bg-mh-slate-900 border border-mh-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {selectedImage ? (
            <img src={selectedImage} alt={selected?.primaryLabel || label} className="w-full h-full object-contain p-1" />
          ) : selected?.icon ? (
            <img src={selected.icon} alt={selected.primaryLabel} className="w-6 h-6 object-contain opacity-80" />
          ) : (
            <div className="w-5 h-5 rounded border border-mh-slate-700 bg-mh-slate-800" />
          )}
        </div>

        {/* Trigger button */}
        <div className="relative flex-1">
          <button
            onClick={() => { setIsOpen(o => !o); setQuery(''); }}
            className="w-full p-2 rounded bg-mh-slate-800 border border-mh-slate-700 text-left flex items-center justify-between hover:bg-mh-slate-700 transition-colors"
          >
            {isLoading ? (
              <span className="text-xs text-mh-slate-500">Loading...</span>
            ) : selected ? (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-mh-slate-200 truncate leading-tight">{selected.primaryLabel}</span>
                {selected.secondaryLabel && (
                  <span className="text-[10px] text-mh-slate-500 truncate leading-tight">{selected.secondaryLabel}</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-mh-slate-500">{placeholder || `Select ${label}`}</span>
            )}
            <span className="text-[10px] text-mh-slate-600 ml-2 shrink-0">▼</span>
          </button>

          {/* Dropdown panel */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b2e] border border-mh-slate-700 rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden" style={{ minWidth: '220px' }}>
              {/* Search input */}
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

              {/* List */}
              <div className="max-h-52 overflow-y-auto">
                {/* Clear option */}
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
                      {/* Icon */}
                      <div className="w-7 h-7 rounded bg-black/20 border border-white/5 flex items-center justify-center shrink-0">
                        {item.icon ? (
                          <img src={item.icon} alt={item.primaryLabel} className="w-5 h-5 object-contain opacity-80" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-mh-slate-700" />
                        )}
                      </div>
                      {/* Labels */}
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

  // Convert weapons to dropdown items
  const weaponItems: DropdownItem[] = (weapons || []).map(w => ({
    id: w.id,
    primaryLabel: w.name,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SearchableDropdown
          label="Weapon"
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
          
          return (
            <SearchableDropdown
              key={slot}
              label={slotLabel}
              items={armourItems(slot)}
              selectedId={current?.id}
              selectedImage={currentPieceWithMonster?.monster_icon} // Use monster icon for the dropdown preview
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
