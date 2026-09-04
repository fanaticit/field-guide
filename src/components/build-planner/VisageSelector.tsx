import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useBuildPlannerStore, type Visage, type VisageSlot } from '../../store/buildPlannerStore';

// Ink type → colour for the dot/badge
const INK_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  fire:       { bg: 'bg-orange-500',   text: 'text-orange-100', ring: 'ring-orange-400'  },
  flames:     { bg: 'bg-orange-500',   text: 'text-orange-100', ring: 'ring-orange-400'  },
  water:      { bg: 'bg-blue-500',     text: 'text-blue-100',   ring: 'ring-blue-400'    },
  thunder:    { bg: 'bg-yellow-400',   text: 'text-yellow-900', ring: 'ring-yellow-300'  },
  ice:        { bg: 'bg-cyan-400',     text: 'text-cyan-900',   ring: 'ring-cyan-300'    },
  frost:      { bg: 'bg-cyan-400',     text: 'text-cyan-900',   ring: 'ring-cyan-300'    },
  dragon:     { bg: 'bg-purple-500',   text: 'text-purple-100', ring: 'ring-purple-400'  },
  poison:     { bg: 'bg-fuchsia-500',  text: 'text-fuchsia-100',ring: 'ring-fuchsia-400' },
  paralysis:  { bg: 'bg-lime-400',     text: 'text-lime-900',   ring: 'ring-lime-300'    },
  blast:      { bg: 'bg-rose-500',     text: 'text-rose-100',   ring: 'ring-rose-400'    },
  sleep:      { bg: 'bg-indigo-400',   text: 'text-indigo-100', ring: 'ring-indigo-300'  },
  raw:        { bg: 'bg-mh-slate-400', text: 'text-mh-slate-900', ring: 'ring-mh-slate-300' },
  combat:     { bg: 'bg-mh-slate-400', text: 'text-mh-slate-900', ring: 'ring-mh-slate-300' },
};
const defaultInkColor = { bg: 'bg-mh-slate-600', text: 'text-mh-slate-200', ring: 'ring-mh-slate-500' };

// Set bonus descriptions per ink type and piece threshold.
// Source of truth: update these once full skill data is seeded in the DB.
const INK_SET_BONUSES: Record<string, { pieces: number; description: string }[]> = {
  fire:       [ { pieces: 2, description: 'Fire Attack +1. Attacks have a chance to apply Fireblight.' }, { pieces: 4, description: 'Fire Attack +2. Fireblight damage over time increased.' } ],
  flames:     [ { pieces: 2, description: 'Fire Attack +1. Attacks have a chance to apply Fireblight.' }, { pieces: 4, description: 'Fire Attack +2. Fireblight damage over time increased.' } ],
  water:      [ { pieces: 2, description: 'Water Attack +1. Attacks have a chance to apply Waterblight.' }, { pieces: 4, description: 'Water Attack +2. Waterblight stamina drain increased.' } ],
  thunder:    [ { pieces: 2, description: 'Thunder Attack +1. Attacks have a chance to apply Thunderblight.' }, { pieces: 4, description: 'Thunder Attack +2. Thunderblight stun proc rate increased.' } ],
  ice:        [ { pieces: 2, description: 'Ice Attack +1. Attacks have a chance to apply Iceblight.' }, { pieces: 4, description: 'Ice Attack +2. Iceblight stamina drain increased.' } ],
  frost:      [ { pieces: 2, description: 'Ice Attack +1. Attacks have a chance to apply Iceblight.' }, { pieces: 4, description: 'Ice Attack +2. Iceblight stamina drain increased.' } ],
  dragon:     [ { pieces: 2, description: 'Dragon Attack +1. Attacks have a chance to apply Dragonblight.' }, { pieces: 4, description: 'Dragon Attack +2. Dragonblight elemental negation increased.' } ],
  poison:     [ { pieces: 2, description: 'Poison buildup increased. Poison damage per tick +10%.' }, { pieces: 4, description: 'Poison buildup greatly increased. Poison tick rate doubled.' } ],
  paralysis:  [ { pieces: 2, description: 'Paralysis buildup increased. Paralysis duration +15%.' }, { pieces: 4, description: 'Paralysis buildup greatly increased. Paralysis window widened.' } ],
  blast:      [ { pieces: 2, description: 'Blast buildup increased. Blast explosion damage +15%.' }, { pieces: 4, description: 'Blast buildup greatly increased. Blast radius increased.' } ],
  sleep:      [ { pieces: 2, description: 'Sleep buildup increased. Sleep duration +20%.' }, { pieces: 4, description: 'Sleep buildup greatly increased. Next attack after wakeup deals 3× damage.' } ],
  raw:        [ { pieces: 2, description: 'Physical Damage +5%.' }, { pieces: 4, description: 'Physical Damage +10%. Critical hits deal extra damage.' } ],
  combat:     [ { pieces: 2, description: 'Physical Damage +5%.' }, { pieces: 4, description: 'Physical Damage +10%. Critical hits deal extra damage.' } ],
};

function inkLabel(ink: string) {
  return `Ink of ${ink.charAt(0).toUpperCase() + ink.slice(1)}`;
}

function inkShort(ink: string) {
  // Abbreviate to 2-3 chars for the small circle
  const map: Record<string, string> = {
    fire: 'Fi', flames: 'Fl', water: 'Wa', thunder: 'Th', ice: 'Ic', frost: 'Fr',
    dragon: 'Dr', poison: 'Po', paralysis: 'Pa', blast: 'Bl', sleep: 'Sl',
    raw: 'Rw', combat: 'Co',
  };
  return map[ink] || ink.substring(0, 2).toUpperCase();
}

export function VisageSelector() {
  const { user } = useAuthStore();
  const {
    buddy, coreVisage, visage2, visage3, visage4, visage5,
    setVisage, setSlotInkType, selectedInkTypes, getTotalVisagePoints,
  } = useBuildPlannerStore();
  const [openSlot, setOpenSlot] = useState<VisageSlot | null>(null);
  const [inkPickSlot, setInkPickSlot] = useState<VisageSlot | null>(null);
  const [useCollectionOnly, setUseCollectionOnly] = useState(false);

  const { data: visages, isLoading: isVisageLoading } = useQuery({
    queryKey: ['visages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('visages').select('*').eq('is_active', true);
      if (error) throw error;
      return data as Visage[];
    }
  });

  // Fetch the user's owned visage collection — each row is (visage_id, ink_type)
  const { data: ownedCollection } = useQuery({
    queryKey: ['user_visage_collection', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_visage_collection')
        .select('visage_id, ink_type')
        .eq('user_id', user!.id);
      if (error) throw error;
      // Build a Set of "visageId::inkType" strings for fast lookup
      return new Set(data.map((r: { visage_id: string; ink_type: string }) => `${r.visage_id}::${r.ink_type}`));
    },
    enabled: !!user,
  });

  const totalPoints = getTotalVisagePoints();

  const handleVisageChange = (slot: VisageSlot, id: string | null) => {
    const selected = visages?.find(v => v.id === id) || null;
    if (!selected) { setVisage(slot, null); return; }

    let currentPointsForSlot = 0;
    if (slot === 'core') currentPointsForSlot = coreVisage?.points || 0;
    if (slot === 2) currentPointsForSlot = visage2?.points || 0;
    if (slot === 3) currentPointsForSlot = visage3?.points || 0;
    if (slot === 4) currentPointsForSlot = visage4?.points || 0;
    if (slot === 5) currentPointsForSlot = visage5?.points || 0;

    const newTotal = totalPoints - currentPointsForSlot + selected.points;
    if (newTotal > 12) {
      alert(`Cannot equip ${selected.name}. Point limit (12) exceeded!`);
      return;
    }
    setVisage(slot, selected);
  };

  const equippedCards = [coreVisage, visage2, visage3, visage4, visage5].filter(Boolean) as Visage[];

  // Duplicate check
  const idCounts: Record<string, number> = {};
  equippedCards.forEach(c => { idCounts[c.id] = (idCounts[c.id] || 0) + 1; });
  const hasDuplicates = Object.values(idCounts).some(n => n > 1);

  // Ink set counts — use the selectedInkType for each slot (not all ink_types)
  const inkCounts: Record<string, number> = {};
  const slots: { slot: VisageSlot; card: Visage | null }[] = [
    { slot: 'core', card: coreVisage },
    { slot: 2, card: visage2 },
    { slot: 3, card: visage3 },
    { slot: 4, card: visage4 },
    { slot: 5, card: visage5 },
  ];
  slots.forEach(({ slot, card }) => {
    if (!card) return;
    const ink = selectedInkTypes[String(slot)];
    if (ink) inkCounts[ink] = (inkCounts[ink] || 0) + 1;
  });
  const activeInks = Object.entries(inkCounts).filter(([, count]) => count > 0);

  if (!buddy) return null;

  const renderCard = (slot: VisageSlot, label: string, selected: Visage | null, core: boolean) => {
    const slotKey = String(slot);
    const chosenInk = selectedInkTypes[slotKey];
    const inkColor = chosenInk ? (INK_COLORS[chosenInk] || defaultInkColor) : defaultInkColor;
    const hasMultipleInks = (selected?.ink_types?.length ?? 0) > 1;
    const isInkPickOpen = inkPickSlot === slot;

    return (
      <div key={slot} className="flex flex-col items-center relative">
        <label className={`text-[9px] font-bold mb-1 uppercase tracking-wider ${core ? 'text-rarity-5' : 'text-mh-slate-500'}`}>
          {label}
        </label>

        {/* Portrait button */}
        <button
          onClick={() => { setOpenSlot(openSlot === slot ? null : slot); setInkPickSlot(null); }}
          className={`relative ${core ? 'w-[60px] h-[75px]' : 'w-[44px] h-[55px]'} bg-mh-slate-800 border-2 rounded-lg overflow-hidden flex items-center justify-center transition-colors group shrink-0 ${core ? 'border-rarity-5 hover:border-rarity-4 shadow-[0_0_10px_rgba(255,215,0,0.15)]' : 'border-mh-slate-700 hover:border-mh-slate-500'}`}
        >
          {selected ? (
            <>
              {selected.image_small ? (
                <img src={selected.image_small} alt={selected.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold text-mh-slate-300 text-center px-0.5 leading-tight">{selected.name}</span>
              )}
              <div className="absolute top-0.5 right-0.5 bg-black/80 px-1 rounded text-[8px] font-bold text-white leading-tight">
                {selected.points}
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-[9px] font-bold">✎</span>
              </div>
            </>
          ) : (
            <span className="text-mh-slate-600 text-[10px]">+</span>
          )}
        </button>

        {/* Ink type indicator circle — shown below the portrait */}
        {selected && selected.ink_types && selected.ink_types.length > 0 && (
          <div className="relative mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasMultipleInks) {
                  setInkPickSlot(isInkPickOpen ? null : slot);
                  setOpenSlot(null);
                }
              }}
              title={chosenInk ? inkLabel(chosenInk) : 'No ink'}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black leading-none ring-1 transition-all ${inkColor.bg} ${inkColor.text} ${inkColor.ring} ${hasMultipleInks ? 'cursor-pointer hover:scale-110 hover:ring-2' : 'cursor-default'}`}
            >
              {chosenInk ? inkShort(chosenInk) : '?'}
            </button>

            {/* Ink picker popover */}
            {isInkPickOpen && hasMultipleInks && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col gap-1 p-1.5 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-xl z-40">
                {selected.ink_types.map(ink => {
                  const c = INK_COLORS[ink] || defaultInkColor;
                  const isActive = chosenInk === ink;
                  return (
                    <button
                      key={ink}
                      onClick={(e) => { e.stopPropagation(); setSlotInkType(slot, ink); setInkPickSlot(null); }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${isActive ? `${c.bg} ${c.text}` : 'text-mh-slate-300 hover:bg-mh-slate-800'}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${c.bg}`} />
                      {inkLabel(ink)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selected && (
          <div className={`text-center mt-0.5 ${core ? 'w-[60px]' : 'w-[44px]'}`}>
            <span className="text-[9px] text-mh-slate-400 block truncate leading-tight" title={selected.name}>{selected.name}</span>
          </div>
        )}

        {/* Card picker dropdown */}
        {openSlot === slot && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-2.5 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-2xl z-30 max-h-60 overflow-y-auto">
            {/* Clear button */}
            <button
              onClick={() => { handleVisageChange(slot, null); setOpenSlot(null); }}
              className="w-full flex items-center justify-center gap-1.5 mb-2 py-1.5 bg-mh-slate-800 text-[10px] font-bold text-mh-slate-400 border border-mh-slate-700 rounded hover:border-mh-slate-500 transition-colors"
            >
              <span>✕</span> Remove Card
            </button>
            {isVisageLoading ? (
              <div className="flex items-center justify-center text-xs text-mh-slate-500 py-4">Loading...</div>
            ) : (() => {
              // Build display entries: each visage × owned ink type (or all ink types if not collection mode)
              type Entry = { visage: Visage; ink: string; owned: boolean };
              const entries: Entry[] = [];
              visages?.forEach(v => {
                const inks = v.ink_types?.length ? v.ink_types : [''];
                inks.forEach(ink => {
                  const owned = !!ownedCollection?.has(`${v.id}::${ink}`);
                  if (useCollectionOnly && !owned) return; // filter out unowned
                  entries.push({ visage: v, ink, owned });
                });
              });

              if (entries.length === 0) {
                return (
                  <p className="text-[11px] text-mh-slate-500 text-center py-3 italic">
                    No cards in your collection yet.
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-4 gap-1.5">
                  {entries.map(({ visage: v, ink, owned }) => {
                    const inkC = INK_COLORS[ink] || defaultInkColor;
                    const isSelected = selected?.id === v.id && (selectedInkTypes[String(slot)] === ink || !ink);
                    return (
                      <button
                        key={`${v.id}::${ink}`}
                        title={`${v.name}${ink ? ' · ' + inkLabel(ink) : ''} (${v.points} pts)${!owned ? ' — Not in collection' : ''}`}
                        onClick={() => {
                          handleVisageChange(slot, v.id);
                          if (ink) setSlotInkType(slot, ink);
                          setOpenSlot(null);
                        }}
                        className={`w-10 h-10 rounded overflow-hidden border flex items-center justify-center bg-mh-slate-800 relative group transition-all ${
                          isSelected
                            ? 'border-rarity-5 ring-2 ring-rarity-5/50'
                            : owned
                              ? 'border-mh-slate-600 hover:border-mh-slate-400'
                              : 'border-mh-slate-800 opacity-40 hover:opacity-70 hover:border-mh-slate-700'
                        }`}
                      >
                        {v.image_small ? (
                          <img src={v.image_small} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold text-mh-slate-400">{v.name.substring(0, 3)}</span>
                        )}
                        {/* Ink dot in top-left */}
                        {ink && (
                          <div className={`absolute top-0.5 left-0.5 w-2 h-2 rounded-full ${inkC.bg} border border-black/40`} />
                        )}
                        {/* Point cost in bottom-right */}
                        <div className="absolute bottom-0 right-0 bg-black/80 px-0.5 text-[7px] font-bold text-white">{v.points}</div>
                        {/* Not-owned lock icon */}
                        {!owned && user && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity">
                            <span className="text-[10px]">🔒</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-mh-slate-800/30 border border-mh-slate-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-display text-base font-bold text-mh-slate-200 mr-auto">Visage Cards</h2>
        {/* Collection toggle — only shown to logged-in users */}
        {user && (
          <button
            onClick={() => setUseCollectionOnly(prev => !prev)}
            title={useCollectionOnly ? 'Showing only your collection — click to show all cards' : 'Click to filter to your collection only'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
              useCollectionOnly
                ? 'bg-rarity-5/20 border-rarity-5/60 text-rarity-5'
                : 'bg-mh-slate-800 border-mh-slate-700 text-mh-slate-400 hover:text-mh-slate-300'
            }`}
          >
            <span>{useCollectionOnly ? '📦' : '🌐'}</span>
            {useCollectionOnly ? 'My Collection' : 'All Cards'}
          </button>
        )}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${totalPoints > 12 ? 'bg-red-500/20 text-red-400' : 'bg-mh-slate-800 text-mh-slate-300'}`}>
          {totalPoints} / 12 pts
        </span>
      </div>

      {/* Flat row: Core | divider | 4 slots */}
      <div className="flex items-start gap-3">
        {renderCard('core', 'Core', coreVisage, true)}
        <div className="w-px self-stretch bg-mh-slate-700/50" />
        <div className="flex items-start gap-2">
          {renderCard(2, 'Slot 2', visage2, false)}
          {renderCard(3, 'Slot 3', visage3, false)}
          {renderCard(4, 'Slot 4', visage4, false)}
          {renderCard(5, 'Slot 5', visage5, false)}
        </div>
      </div>

      {/* Duplicate warning */}
      {hasDuplicates && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-amber-500/40 bg-amber-500/10">
          <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠</span>
          <p className="text-[11px] text-amber-300 leading-snug">
            Set effects from Visage with the same name do not stack.
          </p>
        </div>
      )}

      {/* Core Visage effect */}
      {coreVisage && (
        <div className="flex flex-col gap-1 p-2.5 rounded-lg border border-rarity-5/40 bg-rarity-5/5">
          <span className="text-[10px] font-bold text-rarity-5 uppercase tracking-wider">Core Effect — {coreVisage.name}</span>
          <p className="text-xs text-mh-slate-300 leading-snug">{coreVisage.core_effect || 'No core effect listed.'}</p>
        </div>
      )}

      {/* Ink Set Progress */}
      {activeInks.length > 0 && (
        <div className="flex flex-col gap-3 pt-2 border-t border-mh-slate-800">
          <span className="text-[10px] font-bold text-mh-slate-500 uppercase tracking-wider">Set Bonuses</span>
          {activeInks.map(([ink, count]) => {
            const c = INK_COLORS[ink] || defaultInkColor;
            const bonuses = INK_SET_BONUSES[ink];
            const MAX_PIPS = 4;

            return (
              <div key={ink} className="flex flex-col gap-2">
                {/* Name + progress bar row */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${c.bg} shrink-0`} />
                  <span className="text-xs font-bold text-mh-slate-300 shrink-0">{inkLabel(ink)}</span>
                  {/* Pip progress bar */}
                  <div className="flex gap-1 ml-auto">
                    {Array.from({ length: MAX_PIPS }).map((_, i) => {
                      const pipNum = i + 1;
                      const filled = pipNum <= count;
                      // Milestone pips (2 and 4) are slightly taller
                      const isMilestone = pipNum === 2 || pipNum === 4;
                      return (
                        <div
                          key={i}
                          className={`rounded-sm transition-all ${isMilestone ? 'w-2.5 h-4' : 'w-2 h-3'} ${
                            filled ? c.bg : 'bg-mh-slate-700'
                          } ${filled && isMilestone ? 'ring-1 ' + c.ring : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Bonus thresholds */}
                {bonuses && (
                  <div className="flex flex-col gap-1 pl-4">
                    {bonuses.map(({ pieces, description }) => {
                      const achieved = count >= pieces;
                      return (
                        <div
                          key={pieces}
                          className={`flex gap-2 items-start text-[11px] leading-snug transition-colors ${
                            achieved ? 'text-mh-slate-100' : 'text-mh-slate-600'
                          }`}
                        >
                          <span className={`shrink-0 font-black text-[10px] mt-0.5 ${achieved ? c.text.replace('text-', 'text-').replace('-100', '-300').replace('-900', '-400') : 'text-mh-slate-700'} ${achieved ? c.bg.replace('bg-', 'bg-').replace('-500', '-500/20').replace('-400', '-400/20') : ''} px-1 rounded`}>
                            {pieces}pc
                          </span>
                          <span className={achieved ? 'font-semibold' : 'opacity-40'}>
                            {description}
                          </span>
                          {achieved && <span className="ml-auto shrink-0 text-[9px] font-bold text-green-400">✓</span>}
                        </div>
                      );
                    })}
                    {/* Hint for next milestone if not yet at max */}
                    {count < MAX_PIPS && (() => {
                      const next = bonuses.find(b => b.pieces > count);
                      return next ? (
                        <p className="text-[10px] text-mh-slate-600 italic mt-0.5">
                          {next.pieces - count} more card{next.pieces - count > 1 ? 's' : ''} for {next.pieces}-piece bonus
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Fallback if no bonus data yet */}
                {!bonuses && (
                  <p className="text-[10px] text-mh-slate-600 pl-4 italic">Bonus data not yet available.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
