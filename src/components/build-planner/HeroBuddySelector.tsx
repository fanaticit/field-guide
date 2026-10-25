import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Lock, User, Swords, PawPrint, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore, type Adventurer, type WeaponType, type Buddy } from '../../store/buildPlannerStore';

export function HeroBuddySelector() {
  const { adventurer, setAdventurer, weaponType, setWeaponType, buddy, setBuddy } = useBuildPlannerStore();
  const [showAdvList, setShowAdvList] = useState(false);
  const [showBuddyList, setShowBuddyList] = useState(false);
  const [showWtList, setShowWtList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: adventurers } = useQuery({
    queryKey: ['adventurers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('adventurers').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as Adventurer[];
    }
  });

  const { data: weaponTypes } = useQuery({
    queryKey: ['weapon_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('weapon_types').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as WeaponType[];
    }
  });

  const { data: buddies } = useQuery({
    queryKey: ['buddies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('buddies').select('*').eq('is_active', true);
      if (error) throw error;
      return data as Buddy[];
    }
  });

  // Handle click outside & escape key to dismiss all popovers
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAdvList(false);
        setShowBuddyList(false);
        setShowWtList(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAdvList(false);
        setShowBuddyList(false);
        setShowWtList(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isWeaponLocked = !adventurer?.is_default && !!adventurer?.allowed_weapon_types?.[0];
  const forcedWeaponType = isWeaponLocked 
    ? weaponTypes?.find(wt => wt.id === adventurer.allowed_weapon_types[0])
    : null;
  const activeWeaponType = isWeaponLocked ? (forcedWeaponType || weaponType) : weaponType;

  const handleSelectAdventurer = (adv: Adventurer) => {
    setAdventurer(adv);
    if (!adv.is_default && adv.allowed_weapon_types?.[0]) {
      const matched = weaponTypes?.find(wt => wt.id === adv.allowed_weapon_types[0]);
      if (matched) setWeaponType(matched);
    }
    setShowAdvList(false);
  };

  const handleSelectWeaponType = (wt: WeaponType) => {
    setWeaponType(wt);
    setShowWtList(false);
  };

  const handleSelectBuddy = (b: Buddy) => {
    setBuddy(b);
    setShowBuddyList(false);
  };

  return (
    <div ref={containerRef} className="flex items-center gap-2.5 w-full">
      
      {/* 1. Adventurer Tile */}
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => {
            setShowAdvList(prev => !prev);
            setShowBuddyList(false);
            setShowWtList(false);
          }}
          className={`w-full h-[54px] flex items-center gap-3 bg-mh-slate-850 hover:bg-mh-slate-800 border rounded-xl p-2 sm:px-3 transition-all cursor-pointer text-left shadow-sm group ${
            showAdvList
              ? 'border-rarity-3/80 ring-2 ring-rarity-3/30 bg-mh-slate-800'
              : 'border-mh-slate-750/80 hover:border-mh-slate-650'
          }`}
          title="Click to change Hunter"
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-mh-slate-900 border border-mh-slate-700/80 flex items-center justify-center shrink-0 group-hover:border-rarity-3/60 transition-colors">
            {adventurer?.image ? (
              <img src={adventurer.image} alt={adventurer.name} className="w-full h-full object-cover" />
            ) : (
              <User size={18} className="text-mh-slate-500" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rarity-3">Hunter</span>
              <span className="text-[10px] text-mh-slate-400 group-hover:text-mh-slate-200 flex items-center transition-colors">
                Change <ChevronDown size={11} className={`ml-0.5 transition-transform ${showAdvList ? 'rotate-180' : ''}`} />
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white truncate leading-tight mt-0.5">
              {adventurer ? adventurer.name : 'Select Hunter'}
            </div>
            <div className="text-[10px] text-mh-slate-400 truncate leading-tight">
              {adventurer ? (adventurer.is_default ? 'Default Archetype' : 'Character') : 'No hunter active'}
            </div>
          </div>
        </button>

        {/* Adventurer Dropdown Popover */}
        {showAdvList && (
          <div className="absolute top-full left-0 mt-1.5 z-50 w-72 sm:w-80 bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-mh-slate-800 text-xs font-bold text-mh-slate-300">
              <span>Select Hunter</span>
              <span className="text-[10px] font-normal text-mh-slate-500">{adventurers?.length || 0} available</span>
            </div>

            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
              {adventurers?.map(adv => {
                const isSelected = adventurer?.id === adv.id;
                return (
                  <button
                    key={adv.id}
                    type="button"
                    title={adv.name}
                    onClick={() => handleSelectAdventurer(adv)}
                    className={`relative flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-rarity-3 bg-rarity-3/15 ring-2 ring-rarity-3/40'
                        : 'border-mh-slate-800 bg-mh-slate-850 hover:bg-mh-slate-800 hover:border-mh-slate-650'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-md overflow-hidden bg-mh-slate-900 border border-mh-slate-700/80 flex items-center justify-center">
                      {adv.image ? (
                        <img src={adv.image} alt={adv.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-mh-slate-400">{adv.name.substring(0, 3)}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-mh-slate-300 truncate w-full text-center mt-1">
                      {adv.name}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rarity-3 flex items-center justify-center text-white">
                        <Check size={9} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Weapon Type Icon Tile */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            if (isWeaponLocked) return;
            setShowWtList(prev => !prev);
            setShowAdvList(false);
            setShowBuddyList(false);
          }}
          disabled={isWeaponLocked}
          className={`h-[54px] w-[54px] rounded-xl flex items-center justify-center relative border transition-all shadow-sm group ${
            isWeaponLocked
              ? 'opacity-90 cursor-default border-mh-slate-800 bg-mh-slate-900/60'
              : showWtList
              ? 'border-rarity-3/80 ring-2 ring-rarity-3/30 bg-mh-slate-800 cursor-pointer'
              : 'bg-mh-slate-850 hover:bg-mh-slate-800 border-mh-slate-750/80 hover:border-mh-slate-650 cursor-pointer'
          }`}
          title={
            isWeaponLocked
              ? `Weapon: ${activeWeaponType?.name || 'Weapon'} (Locked to ${adventurer?.name})`
              : `Weapon: ${activeWeaponType?.name || 'Select Weapon'} (Click to change)`
          }
        >
          {/* Icon */}
          {activeWeaponType?.icon ? (
            <img
              src={activeWeaponType.icon}
              alt={activeWeaponType.name}
              className="w-7 h-7 object-contain transition-transform group-hover:scale-110"
            />
          ) : (
            <Swords size={20} className="text-mh-slate-400 group-hover:text-white transition-colors" />
          )}

          {/* Lock badge if locked */}
          {isWeaponLocked && (
            <span
              className="absolute -top-1 -right-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full p-1 shadow-sm"
              title={`Locked to ${adventurer?.name}`}
            >
              <Lock size={9} />
            </span>
          )}
        </button>

        {/* Weapon Type Dropdown Popover */}
        {showWtList && !isWeaponLocked && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 w-72 sm:w-84 bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-mh-slate-800 text-xs font-bold text-mh-slate-300 px-1">
              <span>Select Weapon Type</span>
              <span className="text-[10px] font-normal text-mh-slate-500">{weaponTypes?.length || 0} types</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {weaponTypes?.map(wt => {
                const isSelected = activeWeaponType?.id === wt.id;
                return (
                  <button
                    key={wt.id}
                    type="button"
                    onClick={() => handleSelectWeaponType(wt)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-rarity-3 bg-rarity-3/15 ring-1 ring-rarity-3/40 text-white'
                        : 'border-mh-slate-800 bg-mh-slate-850 hover:bg-mh-slate-800 hover:border-mh-slate-650 text-mh-slate-300'
                    }`}
                  >
                    <div className="w-7 h-7 rounded bg-mh-slate-900/90 border border-mh-slate-750 flex items-center justify-center shrink-0">
                      {wt.icon ? (
                        <img src={wt.icon} alt={wt.name} className="w-5 h-5 object-contain" />
                      ) : (
                        <Swords size={12} className="text-mh-slate-400" />
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate flex-1">{wt.name}</span>
                    {isSelected && <Check size={12} className="text-rarity-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Buddy Tile */}
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => {
            setShowBuddyList(prev => !prev);
            setShowAdvList(false);
            setShowWtList(false);
          }}
          className={`w-full h-[54px] flex items-center gap-3 bg-mh-slate-850 hover:bg-mh-slate-800 border rounded-xl p-2 sm:px-3 transition-all cursor-pointer text-left shadow-sm group ${
            showBuddyList
              ? 'border-rarity-5/80 ring-2 ring-rarity-5/30 bg-mh-slate-800'
              : 'border-mh-slate-750/80 hover:border-mh-slate-650'
          }`}
          title={buddy?.core_passive ? `Buddy: ${buddy.name} (${buddy.core_passive})` : 'Click to select Buddy'}
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-mh-slate-900 border border-mh-slate-700/80 flex items-center justify-center shrink-0 group-hover:border-rarity-5/60 transition-colors">
            {buddy?.image ? (
              <img src={buddy.image} alt={buddy.name} className="w-full h-full object-cover" />
            ) : (
              <PawPrint size={18} className="text-mh-slate-500" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rarity-5">Buddy</span>
              <span className="text-[10px] text-mh-slate-400 group-hover:text-mh-slate-200 flex items-center transition-colors">
                Change <ChevronDown size={11} className={`ml-0.5 transition-transform ${showBuddyList ? 'rotate-180' : ''}`} />
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white truncate leading-tight mt-0.5">
              {buddy ? buddy.name : 'Select Buddy'}
            </div>
            <div
              className="text-[10px] text-mh-slate-400 truncate leading-tight"
              title={buddy?.core_passive || undefined}
            >
              {buddy ? (buddy.core_passive || 'No passive effect') : 'No companion equipped'}
            </div>
          </div>
        </button>

        {/* Buddy Dropdown Popover */}
        {showBuddyList && (
          <div className="absolute top-full right-0 mt-1.5 z-50 w-72 sm:w-84 bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-mh-slate-800 text-xs font-bold text-mh-slate-300">
              <span>Select Companion</span>
              <span className="text-[10px] font-normal text-mh-slate-500">{buddies?.length || 0} available</span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
              {buddies?.map(b => {
                const isSelected = buddy?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBuddy(b)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-rarity-5 bg-rarity-5/15 ring-1 ring-rarity-5/40'
                        : 'border-mh-slate-800 bg-mh-slate-850 hover:bg-mh-slate-800 hover:border-mh-slate-650'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-mh-slate-900 border border-mh-slate-750 flex items-center justify-center shrink-0 mt-0.5">
                      {b.image ? (
                        <img src={b.image} alt={b.name} className="w-full h-full object-cover" />
                      ) : (
                        <PawPrint size={14} className="text-mh-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{b.name}</span>
                        {isSelected && <Check size={12} className="text-rarity-5 shrink-0 ml-1" />}
                      </div>
                      {b.core_passive && (
                        <p className="text-[10px] text-mh-slate-400 line-clamp-2 leading-tight mt-0.5">
                          {b.core_passive}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
