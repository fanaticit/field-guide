import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Lock, User, Swords, PawPrint, Check, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBuildPlannerStore, type Adventurer, type WeaponType, type Buddy } from '../../store/buildPlannerStore';
import { useUserBuddyCollection } from '../../hooks/useUserBuddyCollection';
import { useAdminWeaponTypes } from '../../hooks/useAdminWeapons';
import RoleIcon from '../RoleIcon';
import { ADVENTURER_ROLE_CONFIG } from '../../data/schemas/adventurer';

const BUDDY_TIER_THEMES: Record<string, {
  border: string;
  borderHover: string;
  nameText: string;
  nameHover: string;
  selectedRing: string;
  selectedBg: string;
  badgeBg: string;
  tagBorder: string;
  tagBg: string;
}> = {
  SSR: {
    border: 'border-amber-500/50',
    borderHover: 'hover:border-amber-400',
    nameText: 'text-amber-300',
    nameHover: 'group-hover:text-amber-200',
    selectedRing: 'border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/20',
    selectedBg: 'bg-amber-500/20',
    badgeBg: 'bg-amber-400 text-black',
    tagBorder: 'border-amber-500/60',
    tagBg: 'bg-amber-500/20 text-amber-300',
  },
  SR: {
    border: 'border-purple-500/45',
    borderHover: 'hover:border-purple-400',
    nameText: 'text-purple-300',
    nameHover: 'group-hover:text-purple-200',
    selectedRing: 'border-purple-400 ring-2 ring-purple-400/60 shadow-purple-500/20',
    selectedBg: 'bg-purple-500/20',
    badgeBg: 'bg-purple-500 text-white',
    tagBorder: 'border-purple-500/60',
    tagBg: 'bg-purple-500/20 text-purple-300',
  },
  R: {
    border: 'border-blue-500/40',
    borderHover: 'hover:border-blue-400',
    nameText: 'text-blue-300',
    nameHover: 'group-hover:text-blue-200',
    selectedRing: 'border-blue-400 ring-2 ring-blue-400/60 shadow-blue-500/20',
    selectedBg: 'bg-blue-500/20',
    badgeBg: 'bg-blue-500 text-white',
    tagBorder: 'border-blue-500/50',
    tagBg: 'bg-blue-500/20 text-blue-300',
  },
};

const getBuddyTheme = (tier?: string) => BUDDY_TIER_THEMES[tier || 'R'] || BUDDY_TIER_THEMES.R;

export function HeroBuddySelector() {
  const navigate = useNavigate();
  const { adventurer, setAdventurer, weaponType, setWeaponType, buddy, setBuddy, tacticalRole, setTacticalRole } = useBuildPlannerStore();
  const { isOwned } = useUserBuddyCollection();
  const [showAdvList, setShowAdvList] = useState(false);
  const [showBuddyList, setShowBuddyList] = useState(false);
  const [showWtList, setShowWtList] = useState(false);
  const [showRoleList, setShowRoleList] = useState(false);
  const [buddySearch, setBuddySearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: adventurers } = useQuery({
    queryKey: ['adventurers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adventurers')
        .select('*')
        .eq('is_active', true)
        .eq('is_spoiler', false)
        .order('sort_order');
      if (error) throw error;
      return data as Adventurer[];
    }
  });

  const { data: allWeaponTypes = [] } = useAdminWeaponTypes({ isActive: true });

  // Only weapon types confirmed available in Monster Hunter Outlanders (configured in Admin Other)
  const availableWeaponTypes = useMemo(() => {
    return allWeaponTypes.filter(wt => Array.isArray(wt.games) && wt.games.includes('mho'));
  }, [allWeaponTypes]);

  const { data: buddies } = useQuery({
    queryKey: ['buddies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buddies')
        .select('*')
        .eq('is_active', true)
        .eq('is_spoiler', false)
        .order('sort_order', { ascending: true });
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
        setShowRoleList(false);
        setBuddySearch('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAdvList(false);
        setShowBuddyList(false);
        setShowWtList(false);
        setShowRoleList(false);
        setBuddySearch('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isRoleLocked = !adventurer?.is_default;
  const activeTacticalRole: 'Assault' | 'Disrupter' | 'Support' = isRoleLocked
    ? ((adventurer?.role === 'Disruptor' ? 'Disrupter' : adventurer?.role) as any || 'Assault')
    : (tacticalRole || 'Assault');

  const isWeaponLocked = !adventurer?.is_default && !!adventurer?.allowed_weapon_types?.[0];
  const forcedWeaponType = isWeaponLocked 
    ? allWeaponTypes.find(wt => wt.id === adventurer.allowed_weapon_types[0])
    : null;
  const activeWeaponType = isWeaponLocked ? (forcedWeaponType || weaponType) : weaponType;

  // Ensure Fated Adventurer always has an available MHO weapon type selected
  useEffect(() => {
    if (adventurer?.is_default && availableWeaponTypes.length > 0) {
      if (!weaponType || !availableWeaponTypes.some(wt => wt.id === weaponType.id)) {
        const defaultType =
          availableWeaponTypes.find(wt => wt.id === (adventurer as any).weapon_type) ||
          availableWeaponTypes[0];
        if (defaultType) setWeaponType(defaultType);
      }
    }
  }, [adventurer, availableWeaponTypes, weaponType, setWeaponType]);

  const handleSelectAdventurer = (adv: Adventurer) => {
    setAdventurer(adv);
    if (!adv.is_default && adv.allowed_weapon_types?.[0]) {
      const matched = allWeaponTypes.find(wt => wt.id === adv.allowed_weapon_types[0]);
      if (matched) setWeaponType(matched);
    } else if (adv.is_default) {
      if (!weaponType || !availableWeaponTypes.some(wt => wt.id === weaponType.id)) {
        const defaultType =
          availableWeaponTypes.find(wt => wt.id === (adv as any).weapon_type) ||
          availableWeaponTypes[0];
        if (defaultType) setWeaponType(defaultType);
      }
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
    setBuddySearch('');
  };

  const recruitedCount = useMemo(() => buddies?.filter(b => isOwned(b.id)).length || 0, [buddies, isOwned]);
  const hasAnyRecruited = recruitedCount > 0;

  const filteredBuddies = useMemo(() => {
    if (!buddies) return [];
    let list = buddies;
    if (buddySearch.trim()) {
      const query = buddySearch.toLowerCase().trim();
      list = list.filter(
        b => b.name?.toLowerCase().includes(query) || b.core_passive?.toLowerCase().includes(query)
      );
    }
    return [...list].sort((a, b) => {
      const aOwned = isOwned(a.id);
      const bOwned = isOwned(b.id);
      if (aOwned !== bOwned) {
        return aOwned ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [buddies, buddySearch, isOwned]);

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
            setShowRoleList(false);
          }}
          className={`w-full h-[54px] flex items-center gap-3 bg-mh-slate-850 hover:bg-mh-slate-800 border rounded-xl p-2 sm:px-3 transition-all cursor-pointer text-left shadow-sm group relative isolate overflow-hidden ${
            showAdvList
              ? 'border-rarity-3/80 ring-2 ring-rarity-3/30 bg-mh-slate-800'
              : 'border-mh-slate-750/80 hover:border-mh-slate-650'
          }`}
          title="Click to change Hunter"
        >
          {/* Background sketch/artwork */}
          {adventurer && (adventurer.background_image || adventurer.image) && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <img
                src={adventurer.background_image || adventurer.image}
                alt=""
                className="absolute right-0 top-1/2 -translate-y-1/2 h-[220%] w-auto max-w-none object-cover opacity-25 group-hover:opacity-35 transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-mh-slate-850/95 via-mh-slate-850/75 to-mh-slate-850/20" />
            </div>
          )}

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
          <div data-dropdown-open="true" className="absolute top-full left-0 mt-1.5 z-50 w-72 sm:w-80 bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
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

      {/* 2. Tactical Role / Class Tile */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            if (isRoleLocked) return;
            setShowRoleList(prev => !prev);
            setShowAdvList(false);
            setShowBuddyList(false);
            setShowWtList(false);
          }}
          className={`h-[54px] w-[54px] rounded-xl flex items-center justify-center relative border transition-all shadow-sm group ${
            isRoleLocked
              ? 'border-mh-slate-800 bg-mh-slate-900/60 cursor-default'
              : showRoleList
              ? 'border-rarity-3/80 ring-2 ring-rarity-3/30 bg-mh-slate-800 cursor-pointer'
              : 'bg-mh-slate-850 hover:bg-mh-slate-800 border-mh-slate-750/80 hover:border-mh-slate-650 cursor-pointer'
          }`}
          title={
            isRoleLocked
              ? `Class: ${activeTacticalRole} (Fixed for ${adventurer?.name || 'Hunter'})`
              : `Class: ${activeTacticalRole} (Click to change)`
          }
        >
          {/* Role Icon */}
          <RoleIcon
            role={activeTacticalRole}
            size={28}
            className="transition-transform group-hover:scale-110 object-contain drop-shadow"
          />

          {/* Lock badge if role is fixed for this adventurer */}
          {isRoleLocked && (
            <span
              className="absolute -top-1 -right-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full p-1 shadow-sm"
              title={`Class locked to ${adventurer?.name || 'Hunter'}`}
            >
              <Lock size={9} />
            </span>
          )}
        </button>

        {/* Tactical Role Dropdown Popover */}
        {showRoleList && !isRoleLocked && (
          <div data-dropdown-open="true" className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 w-64 bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-mh-slate-800 text-xs font-bold text-mh-slate-300 px-1">
              <span>Select Class / Role</span>
              <span className="text-[10px] font-normal text-mh-slate-500">Fated Adventurer</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {(['Assault', 'Disrupter', 'Support'] as const).map((r) => {
                const cfg = ADVENTURER_ROLE_CONFIG[r];
                const isSelected = activeTacticalRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setTacticalRole(r);
                      setShowRoleList(false);
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-rarity-3 bg-rarity-3/15 ring-1 ring-rarity-3/40 text-white'
                        : 'border-mh-slate-800 bg-mh-slate-850 hover:bg-mh-slate-800 hover:border-mh-slate-650 text-mh-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-mh-slate-900/90 border border-mh-slate-750 flex items-center justify-center shrink-0">
                      <RoleIcon role={r} size={22} className="object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span className={cfg.text}>{cfg.label}</span>
                      </div>
                      <div className="text-[10px] text-mh-slate-400 line-clamp-1">
                        {cfg.description}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-rarity-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Weapon Type Icon Tile */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            if (isWeaponLocked) {
              if (activeWeaponType?.id) {
                navigate(`/challenges/weapons?type=${activeWeaponType.id}`);
              }
              return;
            }
            setShowWtList(prev => !prev);
            setShowAdvList(false);
            setShowBuddyList(false);
            setShowRoleList(false);
          }}
          className={`h-[54px] w-[54px] rounded-xl flex items-center justify-center relative border transition-all shadow-sm group cursor-pointer ${
            isWeaponLocked
              ? 'border-mh-slate-800 bg-mh-slate-900/60 hover:border-amber-500/50 hover:bg-mh-slate-850'
              : showWtList
              ? 'border-rarity-3/80 ring-2 ring-rarity-3/30 bg-mh-slate-800'
              : 'bg-mh-slate-850 hover:bg-mh-slate-800 border-mh-slate-750/80 hover:border-mh-slate-650'
          }`}
          title={
            isWeaponLocked
              ? `Weapon: ${activeWeaponType?.name || 'Weapon'} (Locked to ${adventurer?.name} — Click to view in Weapons Guide)`
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
          <div data-dropdown-open="true" className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 w-72 sm:w-84 bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-mh-slate-800 text-xs font-bold text-mh-slate-300 px-1">
              <span>Select Weapon Type</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(activeWeaponType?.id ? `/challenges/weapons?type=${activeWeaponType.id}` : '/challenges/weapons')}
                  className="text-[10px] text-[var(--theme-accent)] hover:underline font-medium cursor-pointer"
                  title="View in Weapons Guide"
                >
                  Weapons Guide &rarr;
                </button>
                <span className="text-[10px] font-normal text-mh-slate-500">{availableWeaponTypes.length} available</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {availableWeaponTypes.map(wt => {
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
            setShowRoleList(false);
          }}
          className={`w-full h-[54px] flex items-center gap-3 bg-mh-slate-850 hover:bg-mh-slate-800 border rounded-xl p-2 sm:px-3 transition-all cursor-pointer text-left shadow-sm group relative isolate overflow-hidden ${
            showBuddyList
              ? 'border-rarity-5/80 ring-2 ring-rarity-5/30 bg-mh-slate-800'
              : 'border-mh-slate-750/80 hover:border-mh-slate-650'
          }`}
          title={buddy?.core_passive ? `Buddy: ${buddy.name} (${buddy.core_passive})` : 'Click to select Buddy'}
        >
          {/* Background sketch/artwork */}
          {buddy?.image && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <img
                src={buddy.image}
                alt=""
                className="absolute right-0 top-1/2 -translate-y-1/2 h-[180%] w-auto max-w-none object-contain opacity-25 group-hover:opacity-35 transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-mh-slate-850/95 via-mh-slate-850/75 to-mh-slate-850/20" />
            </div>
          )}

          {/* Avatar */}
          <div className={`w-9 h-9 rounded-lg overflow-hidden bg-mh-slate-900 border flex items-center justify-center shrink-0 transition-colors ${
            buddy?.tier ? `${getBuddyTheme(buddy.tier).border} group-hover:border-rarity-5/60` : 'border-mh-slate-700/80 group-hover:border-rarity-5/60'
          }`}>
            {buddy?.image ? (
              <img src={buddy.image} alt={buddy.name} className="w-full h-full object-cover" />
            ) : (
              <PawPrint size={18} className="text-mh-slate-500" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-1">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                buddy?.tier ? getBuddyTheme(buddy.tier).nameText : 'text-rarity-5'
              }`}>
                Buddy {buddy?.tier ? `(${buddy.tier})` : ''}
              </span>
              <span className="text-[10px] text-mh-slate-400 group-hover:text-mh-slate-200 flex items-center transition-colors">
                Change <ChevronDown size={11} className={`ml-0.5 transition-transform ${showBuddyList ? 'rotate-180' : ''}`} />
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-bold truncate leading-tight mt-0.5 ${
              buddy?.tier ? getBuddyTheme(buddy.tier).nameText : 'text-white'
            }`}>
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
          <div
            data-dropdown-open="true"
            className="absolute top-full right-0 mt-1.5 z-50 w-[320px] sm:w-[420px] max-w-[calc(100vw-2rem)] bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-mh-slate-800 text-xs font-bold text-mh-slate-300">
              <div className="flex items-center gap-2">
                <span>Select Companion</span>
                <span className="text-[10px] font-normal text-mh-slate-500">
                  {recruitedCount > 0 ? `${recruitedCount} recruited · ` : ''}{filteredBuddies.length} available
                </span>
              </div>
              {buddy && (
                <button
                  type="button"
                  onClick={() => {
                    setBuddy(null);
                    setShowBuddyList(false);
                    setBuddySearch('');
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer font-normal transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative mb-2.5">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mh-slate-500 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search companions or passives..."
                value={buddySearch}
                onChange={(e) => setBuddySearch(e.target.value)}
                className="w-full bg-mh-slate-800/90 border border-mh-slate-700 rounded-lg text-xs px-2.5 pl-8 py-1.5 text-mh-slate-200 placeholder:text-mh-slate-500 focus:outline-none focus:border-rarity-5 focus:ring-1 focus:ring-rarity-5/40 transition-all"
              />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 sm:max-h-84 overflow-y-auto pr-1">
              {filteredBuddies.map(b => {
                const isSelected = buddy?.id === b.id;
                const isRecruited = isOwned(b.id);
                const theme = getBuddyTheme(b.tier);
                return (
                  <button
                    key={b.id}
                    type="button"
                    title={
                      b.core_passive
                        ? `${b.name} [${b.tier || 'R'}]${isRecruited ? ' (Recruited)' : ''} (${b.core_passive})`
                        : `${b.name} [${b.tier || 'R'}]${isRecruited ? ' (Recruited)' : ''}`
                    }
                    onClick={() => handleSelectBuddy(b)}
                    className={`group relative flex flex-col rounded-xl border overflow-hidden transition-all text-left cursor-pointer ${
                      isSelected
                        ? `${theme.selectedRing} ${theme.selectedBg} shadow-md`
                        : `${theme.border} ${theme.borderHover} bg-mh-slate-850 hover:bg-mh-slate-800`
                    } ${hasAnyRecruited && !isRecruited ? 'opacity-70 hover:opacity-100' : ''}`}
                  >
                    <div className="relative w-full aspect-square bg-mh-slate-950 flex items-center justify-center overflow-hidden">
                      {b.image ? (
                        <img
                          src={b.image}
                          alt={b.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <PawPrint size={28} className="text-mh-slate-400" />
                      )}

                      {/* Tier badge in top-left */}
                      <span className={`absolute top-1 left-1 px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider backdrop-blur-sm border shadow-sm ${theme.tagBg} ${theme.tagBorder}`}>
                        {b.tier || 'R'}
                      </span>

                      {isSelected ? (
                        <span className={`absolute top-1 right-1 w-4 h-4 rounded-full ${theme.badgeBg} flex items-center justify-center shadow-md ring-1 ring-black/40`}>
                          <Check size={10} strokeWidth={3} />
                        </span>
                      ) : isRecruited ? (
                        <span
                          className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/60 shadow-sm"
                          title="Recruited companion"
                        />
                      ) : null}
                    </div>
                    <div className={`py-1 px-1 w-full bg-mh-slate-900/90 border-t ${theme.border} text-center transition-colors`}>
                      <span className={`text-[11px] font-semibold ${theme.nameText} ${theme.nameHover} truncate block w-full leading-tight`}>
                        {b.name}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredBuddies.length === 0 && (
                <div className="col-span-3 sm:col-span-4 py-8 text-center text-xs text-mh-slate-500">
                  No companions matched "{buddySearch}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
