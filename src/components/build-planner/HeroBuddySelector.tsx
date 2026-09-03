import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore, type Adventurer, type WeaponType, type Buddy } from '../../store/buildPlannerStore';

export function HeroBuddySelector() {
  const { adventurer, setAdventurer, weaponType, setWeaponType, buddy, setBuddy } = useBuildPlannerStore();
  const [showAdvList, setShowAdvList] = useState(false);
  const [showBuddyList, setShowBuddyList] = useState(false);
  const [showWtList, setShowWtList] = useState(false);

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

  const forcedWeaponType = !adventurer?.is_default && adventurer?.allowed_weapon_types?.[0] 
    ? weaponTypes?.find(wt => wt.id === adventurer.allowed_weapon_types[0])
    : null;

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-2">
      
      {/* Adventurer Section */}
      <div className="flex flex-col gap-3 relative items-center md:items-start">
        <label className="text-sm font-semibold text-mh-slate-400">Adventurer</label>
        <button 
          onClick={() => { setShowAdvList(!showAdvList); setShowBuddyList(false); setShowWtList(false); }}
          className="relative w-[90px] h-[110px] bg-mh-slate-800 border-2 border-mh-slate-700 rounded-lg overflow-hidden flex items-center justify-center hover:border-rarity-3 transition-colors group shrink-0"
        >
          {adventurer ? (
            <>
              {adventurer.image ? (
                <img src={adventurer.image} alt={adventurer.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-mh-slate-300 text-center">{adventurer.name}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-bold drop-shadow-md">Change</span>
              </div>
            </>
          ) : (
            <span className="text-mh-slate-500 font-bold text-xs text-center">Select</span>
          )}
        </button>

        {adventurer && (
          <div className="w-[90px] text-center mt-1">
            <span className="text-sm font-bold text-mh-slate-200 block truncate" title={adventurer.name}>{adventurer.name}</span>
          </div>
        )}

        {showAdvList && (
          <div className="absolute top-[180px] left-0 w-64 p-3 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto grid grid-cols-4 gap-2">
            {adventurers?.map(adv => (
              <button
                key={adv.id}
                title={adv.name}
                onClick={() => { setAdventurer(adv); setShowAdvList(false); }}
                className={`w-12 h-12 rounded overflow-hidden border ${adventurer?.id === adv.id ? 'border-rarity-3 ring-2 ring-rarity-3/50' : 'border-mh-slate-700 hover:border-mh-slate-400'} flex items-center justify-center bg-mh-slate-800`}
              >
                {adv.image ? <img src={adv.image} alt={adv.name} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-mh-slate-400">{adv.name.substring(0,3)}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Weapon Type Selector */}
        <div className="w-[180px] mt-2">
          {adventurer?.is_default ? (
            <div className="relative">
              <label className="text-[10px] font-bold text-mh-slate-400 uppercase tracking-wider mb-1 block">Weapon Type <span className="text-red-400">*</span></label>
              <button
                onClick={() => { setShowWtList(!showWtList); setShowAdvList(false); setShowBuddyList(false); }}
                className="w-full p-2 rounded bg-mh-slate-800 border border-mh-slate-700 text-mh-slate-200 flex items-center justify-between hover:bg-mh-slate-700 transition-colors"
              >
                {weaponType ? (
                  <div className="flex items-center gap-2">
                    {weaponType.icon ? <img src={weaponType.icon} alt={weaponType.name} className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 bg-mh-slate-700 rounded" />}
                    <span className="text-sm truncate">{weaponType.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-mh-slate-400">Select weapon type</span>
                )}
                <span className="text-xs text-mh-slate-500">▼</span>
              </button>

              {showWtList && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b2e] border border-mh-slate-700 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto flex flex-col p-1">
                  {weaponTypes?.map(wt => (
                    <button
                      key={wt.id}
                      onClick={() => { setWeaponType(wt); setShowWtList(false); }}
                      className={`p-2 rounded flex items-center gap-3 hover:bg-white/5 transition-colors ${weaponType?.id === wt.id ? 'bg-white/10' : ''}`}
                    >
                      <div className="w-8 h-8 rounded bg-black/20 flex items-center justify-center border border-white/5">
                        {wt.icon && <img src={wt.icon} alt={wt.name} className="w-6 h-6 object-contain opacity-80" />}
                      </div>
                      <span className="text-sm text-white font-medium">{wt.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            adventurer && (
              <div>
                <label className="text-[10px] font-bold text-mh-slate-400 uppercase tracking-wider mb-1 block">Weapon Type <span className="text-red-400">*</span></label>
                <div className="w-full p-2 rounded bg-mh-slate-900 border border-mh-slate-800 flex items-center gap-2">
                  {forcedWeaponType?.icon ? (
                    <img src={forcedWeaponType.icon} alt={forcedWeaponType.name} className="w-5 h-5 object-contain opacity-70" />
                  ) : (
                    <div className="w-5 h-5 bg-mh-slate-800 rounded" />
                  )}
                  <span className="text-sm text-mh-slate-400 truncate">{forcedWeaponType?.name || adventurer.allowed_weapon_types?.[0]}</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Buddy Section */}
      <div className="flex flex-col gap-3 relative items-center md:items-start">
        <label className="text-sm font-semibold text-mh-slate-400">Buddy</label>
        <button 
          onClick={() => { setShowBuddyList(!showBuddyList); setShowAdvList(false); setShowWtList(false); }}
          className="relative w-[90px] h-[110px] bg-mh-slate-800 border-2 border-mh-slate-700 rounded-lg overflow-hidden flex items-center justify-center hover:border-rarity-5 transition-colors group shrink-0"
        >
          {buddy ? (
            <>
              {buddy.image ? (
                <img src={buddy.image} alt={buddy.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-mh-slate-300 text-center">{buddy.name}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-bold drop-shadow-md">Change</span>
              </div>
            </>
          ) : (
            <span className="text-mh-slate-500 font-bold text-xs text-center">Select</span>
          )}
        </button>

        {buddy && (
          <div className="w-[90px] text-center mt-1">
            <span className="text-sm font-bold text-mh-slate-200 block truncate" title={buddy.name}>{buddy.name}</span>
          </div>
        )}

        {showBuddyList && (
          <div className="absolute top-[180px] left-0 w-64 p-3 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto grid grid-cols-4 gap-2">
            {buddies?.map(b => (
              <button
                key={b.id}
                title={b.name}
                onClick={() => { setBuddy(b); setShowBuddyList(false); }}
                className={`w-12 h-12 rounded overflow-hidden border ${buddy?.id === b.id ? 'border-rarity-5 ring-2 ring-rarity-5/50' : 'border-mh-slate-700 hover:border-mh-slate-400'} flex items-center justify-center bg-mh-slate-800`}
              >
                {b.image ? <img src={b.image} alt={b.name} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-mh-slate-400">{b.name.substring(0,3)}</span>}
              </button>
            ))}
          </div>
        )}
        
        {/* Buddy passive preview */}
        {buddy && (
          <div className="w-[180px] p-2 rounded bg-mh-slate-900 border border-mh-slate-800 text-mh-slate-400 mt-2 text-xs text-center line-clamp-2" title={buddy.core_passive}>
            {buddy.core_passive || 'No passive ability'}
          </div>
        )}
      </div>

    </div>
  );
}
