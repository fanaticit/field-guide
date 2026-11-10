import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useBuildPlannerStore } from '../../store/buildPlannerStore';
import type { Visage, VisageSlot } from '../../store/buildPlannerStore';
import { getInkConfig, DEFAULT_VISAGE_RARITY, VISAGE_SELECT, normalizeVisageRow } from '../../data/schemas/visage';
import VisageIcon from '../visage/VisageIcon';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { useUserVisageCollection } from '../../hooks/useVisageSets';
import { cn } from '../../lib/utils';


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
  sleep:      [ { pieces: 2, description: 'Sleep buildup increased. Wake-up hit damage +10%.' }, { pieces: 4, description: 'Sleep buildup greatly increased. Wake-up hit damage +25%.' } ],
  raw:        [ { pieces: 2, description: 'Raw damage +5%. Affinity +5%.' }, { pieces: 4, description: 'Raw damage +10%. Affinity +15%.' } ],
  combat:     [ { pieces: 2, description: 'Raw damage +5%. Affinity +5%.' }, { pieces: 4, description: 'Raw damage +10%. Affinity +15%.' } ],
};

function CoreMonsterBackdrop({
  src,
  className,
  alt = '',
}: {
  src?: string | null;
  className: string;
  alt?: string;
}) {
  if (!src) return null;
  const isSketch = src.includes('sketch') || src.includes('Sketch');
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'absolute pointer-events-none object-contain transition-all duration-300 filter',
        isSketch ? 'invert brightness-125 contrast-125' : 'drop-shadow-lg',
        className
      )}
    />
  );
}

export function VisageSelector() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    coreVisage, visage2, visage3, visage4, visage5,
    setVisage, setSlotInkType, selectedInkTypes, getTotalVisagePoints,
    useMine, setUseMine,
  } = useBuildPlannerStore();
  const [openSlot, setOpenSlot] = useState<VisageSlot | null>(null);
  const [inkPickSlot, setInkPickSlot] = useState<VisageSlot | null>(null);
  const [filterInk, setFilterInk] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCardSlots, setShowCardSlots] = useState(true);
  const { isCollected } = useUserVisageCollection();

  const { data: visages, isLoading: isVisageLoading } = useQuery({
    queryKey: ['visages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visages')
        .select(VISAGE_SELECT)
        .eq('is_active', true)
        .eq('is_spoiler', false)
        .eq('status', 'in_game')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => normalizeVisageRow(row as Record<string, unknown>)) as Visage[];
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

  const isCardOwned = (v: Visage) => {
    if (user && ownedCollection) {
      return v.ink_types.some(ink => ownedCollection.has(`${v.id}::${ink}`));
    }
    return v.ink_types.some(ink => isCollected(v.id, ink));
  };

  const totalPoints = getTotalVisagePoints();

  const handleVisageChange = (slot: VisageSlot, id: string | null) => {
    const selected = visages?.find(v => v.id === id) || null;
    if (!selected) { setVisage(slot, null); return; }
    if (selected.is_spoiler || selected.status === 'not_in_game') {
      alert(`Cannot equip ${selected.name}. It is not released in game yet.`);
      return;
    }

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

  // Auto-enrich any slotted cards missing monster_icon or monster_sketch when the visages query loads
  useEffect(() => {
    if (!visages || visages.length === 0) return;
    const currentSlots: { slot: VisageSlot; card: Visage | null }[] = [
      { slot: 'core', card: coreVisage },
      { slot: 2, card: visage2 },
      { slot: 3, card: visage3 },
      { slot: 4, card: visage4 },
      { slot: 5, card: visage5 },
    ];
    const patch: Partial<Record<string, Visage>> = {};
    let shouldUpdate = false;

    currentSlots.forEach(({ slot, card }) => {
      if (card && (!card.monster_icon || !card.monster_sketch)) {
        const full = visages.find(v => v.id === card.id);
        if (full?.monster_icon || full?.monster_sketch) {
          const key = slot === 'core' ? 'coreVisage' : `visage${slot}`;
          patch[key] = {
            ...card,
            monster_icon: full.monster_icon ?? card.monster_icon,
            monster_sketch: full.monster_sketch ?? card.monster_sketch,
          };
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      useBuildPlannerStore.setState(patch);
    }
  }, [visages, coreVisage, visage2, visage3, visage4, visage5]);

  const renderCard = (slot: VisageSlot, label: string, selected: Visage | null, core: boolean) => {
    const card = (selected && visages ? visages.find(v => v.id === selected.id) : null) || selected;
    const slotKey = String(slot);
    const chosenInk = selectedInkTypes[slotKey];
    const inkCfg = getInkConfig(chosenInk);
    const hasMultipleInks = (card?.ink_types?.length ?? 0) > 1;
    const isInkPickOpen = inkPickSlot === slot;

    return (
      <div key={slot} className="flex flex-col items-center relative w-full">
        <label className={`text-[9px] font-bold mb-1 uppercase tracking-wider ${core ? 'text-rarity-5' : 'text-mh-slate-500'}`}>
          {label}
        </label>

        {/* Portrait button */}
        <button
          onClick={() => { setOpenSlot(openSlot === slot ? null : slot); setInkPickSlot(null);
                          setFilterInk(null); setSearchQuery(''); }}
          className={`relative w-full aspect-[4/5] bg-mh-slate-800 border-2 rounded-lg overflow-hidden flex items-center justify-center transition-colors group shrink-0 ${core ? 'border-rarity-5 hover:border-rarity-4 shadow-[0_0_10px_rgba(255,215,0,0.15)]' : 'border-mh-slate-700 hover:border-mh-slate-500'}`}
        >
          {card ? (
            <>
              <VisageIcon visage={card} rarity={DEFAULT_VISAGE_RARITY} />
              <div className="absolute top-0.5 right-0.5 bg-black/80 px-1 rounded text-[10px] font-bold text-white leading-tight">
                {card.points}
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-[12px] font-bold">✎</span>
              </div>
            </>
          ) : (
            <span className="text-mh-slate-600 text-lg sm:text-xl font-light">+</span>
          )}
        </button>

        {/* Ink type indicator circle — shown below the portrait */}
        {card && card.ink_types && card.ink_types.length > 0 && (
          <div className="relative mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasMultipleInks) {
                  setInkPickSlot(isInkPickOpen ? null : slot);
                  setOpenSlot(null);
                }
              }}
              title={chosenInk ? inkCfg.name : 'No ink'}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
                !chosenInk ? 'bg-mh-slate-700 ring-1 ring-black/40 text-white' : ''
              } ${hasMultipleInks ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            >
              {chosenInk ? <InkIconComponent iconName={inkCfg.iconName} size={15} className="drop-shadow-md" /> : '?'}
            </button>

            {/* Ink picker popover */}
            {isInkPickOpen && hasMultipleInks && (
              <div data-dropdown-open="true" className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col gap-1 p-1.5 bg-mh-slate-900 border border-mh-slate-700 rounded-lg shadow-xl z-40">
                {card.ink_types.map(ink => {
                  const c = getInkConfig(ink);
                  const isActive = chosenInk === ink;
                  return (
                    <button
                      key={ink}
                      onClick={(e) => { e.stopPropagation(); setSlotInkType(slot, ink); setInkPickSlot(null); }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${isActive ? c.dotColor + ' text-white' : 'hover:bg-mh-slate-800 text-mh-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : c.dotColor} text-white shrink-0`}>
                        <InkIconComponent iconName={c.iconName} size={10} />
                      </div>
                      {c.shortName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Visage Picker Popover */}
        {openSlot === slot && (
          <div data-dropdown-open="true" className={`absolute top-[105%] ${core ? 'left-0' : 'left-1/2 -translate-x-1/2'} w-[300px] sm:w-[320px] max-h-[400px] overflow-hidden bg-mh-slate-900 border border-mh-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-2`}>
            <div className="flex flex-col gap-2 px-1 border-b border-mh-slate-800 pb-2 mb-1 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-mh-slate-300">Select Visage</span>
                  {filterInk && (
                    <div className="flex items-center gap-1 bg-mh-slate-800 px-1.5 py-0.5 rounded border border-mh-slate-700">
                      <span className="text-[9px] font-bold text-mh-slate-400">{getInkConfig(filterInk).shortName} Only</span>
                      <button onClick={() => setFilterInk(null)} className="ml-0.5 text-mh-slate-500 hover:text-red-400 leading-none pb-0.5">&times;</button>
                    </div>
                  )}
                </div>
                {card && (
                  <button
                    onClick={() => { setVisage(slot, null); setOpenSlot(null); }}
                    className="text-[10px] text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-mh-slate-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-mh-slate-800 border border-mh-slate-700 rounded text-xs px-2 pl-6 py-1.5 text-mh-slate-200 placeholder:text-mh-slate-600 focus:outline-none focus:border-rarity-5 transition-colors"
                />
              </div>
            </div>

            {isVisageLoading ? (
              <p className="text-center text-xs text-mh-slate-500 py-4">Loading cards...</p>
            ) : (() => {
              // Group and filter
              const filtered = visages?.filter(v => {
                if (filterInk && !v.ink_types.includes(filterInk)) return false;
                if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                if (!useMine) return true;
                // If collection only, user must own AT LEAST ONE ink version of this card
                return isCardOwned(v);
              }) || [];

              return (
                <div className="grid grid-cols-4 gap-1.5 overflow-y-auto pr-1 pb-1">
                  {filtered.length === 0 ? (
                    <div className="col-span-4 py-8 text-center flex flex-col items-center gap-2">
                      <p className="text-xs text-mh-slate-400">
                        {useMine ? 'No cards in your collection match.' : 'No cards found.'}
                      </p>
                      {useMine && (
                        <button
                          type="button"
                          onClick={() => setUseMine(false)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                        >
                          Show all cards
                        </button>
                      )}
                    </div>
                  ) : (
                    filtered.map(v => {
                      const isEquippedHere = card?.id === v.id;
                      // Count if owned *at all* (for any ink)
                      const owned = isCardOwned(v);
                      // Just for display in the grid, grab the first ink's color
                      const ink = v.ink_types[0];
                      const inkC = getInkConfig(ink);

                      return (
                        <button
                          key={v.id}
                          title={v.name + (owned ? ' (In collection)' : ' (Not in collection)')}
                          onClick={() => { handleVisageChange(slot, v.id); if (filterInk && v.ink_types.includes(filterInk)) setSlotInkType(slot, filterInk); setOpenSlot(null); setFilterInk(null); }}
                          className={`relative aspect-[3/4] rounded bg-mh-slate-800 border overflow-hidden group transition-all cursor-pointer ${
                            isEquippedHere
                              ? 'border-rarity-5 ring-1 ring-rarity-5'
                              : owned
                                ? 'border-mh-slate-600 hover:border-mh-slate-400'
                                : 'border-mh-slate-750 hover:border-mh-slate-500 opacity-85 hover:opacity-100'
                          }`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <VisageIcon visage={v} rarity={DEFAULT_VISAGE_RARITY} />
                          </div>
                          {/* Ink dot in top-left */}
                          {ink && (
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center ${inkC.dotColor} text-white shadow-sm ring-1 ring-black/30`}>
                              <InkIconComponent iconName={inkC.iconName} size={8} />
                            </div>
                          )}
                          {/* Owned indicator in top-right */}
                          {owned && (
                            <span
                              className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black/60 shadow-sm"
                              title="In your collection"
                            />
                          )}
                          {/* Point cost in bottom-right */}
                          <div className="absolute bottom-0 right-0 bg-black/80 px-0.5 text-[8px] font-bold text-white">{v.points}</div>
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mho-panel relative isolate has-[[data-dropdown-open]]:relative has-[[data-dropdown-open]]:z-50 p-4 flex flex-col gap-4">
      {/* Main Core Monster Sketch Backdrop */}
      {coreVisage && (coreVisage.monster_sketch || coreVisage.monster_icon) && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
          <CoreMonsterBackdrop
            src={coreVisage.monster_sketch || coreVisage.monster_icon}
            className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[140%] max-h-[400px] w-auto max-w-none opacity-20 filter drop-shadow-xl transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#131622]/90 via-[#131622]/65 to-[#131622]/85 pointer-events-none" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mr-auto flex items-center gap-2"><span className="text-[#FFD700] text-xs">❖</span>Visage Cards</h2>
        <button
          type="button"
          onClick={() => navigate('/gallery')}
          className="btn-mho-panel !px-3 !py-1 !text-[10px] !border-[var(--theme-accent)] !text-[var(--theme-accent)] !bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] hover:!text-white cursor-pointer"
          title="Browse Visage Sets and load one into this build"
        >
          Load a Visage Set
        </button>
        <button
          type="button"
          onClick={() => setShowCardSlots((prev) => !prev)}
          className={`btn-mho-panel !px-3 !py-1 !text-[10px] transition-all cursor-pointer ${
            showCardSlots
              ? '!border-rarity-5 !text-white !bg-rarity-5/20 shadow-sm'
              : '!border-mh-slate-700 text-mh-slate-300 hover:text-white'
          }`}
        >
          {showCardSlots ? "Hide Visage Cards" : "I'll Select My Own Cards"}
        </button>
        {/* Collection toggle (both My Collection and All Cards visible side by side) */}
        <div className="flex items-center bg-mh-slate-800/90 border border-mh-slate-750 p-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setUseMine(true)}
            title="Filter to only cards in your collection"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              useMine
                ? 'bg-rarity-5/25 text-rarity-5 border border-rarity-5/50 shadow-sm'
                : 'text-mh-slate-400 hover:text-mh-slate-200 border border-transparent'
            }`}
          >
            <span>📦</span>
            <span>My Collection</span>
          </button>
          <button
            type="button"
            onClick={() => setUseMine(false)}
            title="Show all cards in the game"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              !useMine
                ? 'bg-rarity-5/25 text-rarity-5 border border-rarity-5/50 shadow-sm'
                : 'text-mh-slate-400 hover:text-mh-slate-200 border border-transparent'
            }`}
          >
            <span>🌐</span>
            <span>All Cards</span>
          </button>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${totalPoints > 12 ? 'bg-red-500/20 text-red-400' : 'bg-mh-slate-800 text-mh-slate-300'}`}>
          {totalPoints} / 12 pts
        </span>
      </div>

      {/* Card Slots or Preview */}
      {showCardSlots ? (
        /* Compact row: Core | divider | 4 slots */
        <div className="flex w-full items-start gap-2 sm:gap-3">
          <div className="w-16 shrink-0">
            {renderCard('core', 'Core', coreVisage, true)}
          </div>

          <div className="w-px self-stretch bg-mh-slate-700/50" />

          <div className="flex gap-2">
            {([[2, visage2], [3, visage3], [4, visage4], [5, visage5]] as const).map(([slot, card]) => (
              <div key={slot} className="w-16 shrink-0">
                {renderCard(slot, `Slot ${slot}`, card, false)}
              </div>
            ))}
          </div>
        </div>
      ) : equippedCards.length > 0 ? (
        <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-mh-slate-700/60 bg-mh-slate-800/40">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-mh-slate-400 font-medium">
              Equipped Visage Cards ({equippedCards.length}/5)
            </span>
            <button
              type="button"
              onClick={() => setShowCardSlots(true)}
              className="text-[11px] text-[var(--theme-accent)] hover:underline font-medium cursor-pointer"
            >
              Customize Cards
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {([
              ['Core', coreVisage, true],
              ['Slot 2', visage2, false],
              ['Slot 3', visage3, false],
              ['Slot 4', visage4, false],
              ['Slot 5', visage5, false],
            ] as const).map(([label, card, isCore], idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setShowCardSlots(true)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded bg-mh-slate-800/80 border text-xs shrink-0 cursor-pointer hover:border-mh-slate-500 transition-colors text-left ${
                  isCore ? 'border-rarity-5/50' : 'border-mh-slate-700/60'
                }`}
                title={card ? `${label}: ${card.name} (${card.points} pts)` : `${label}: Empty`}
              >
                {card?.monster_icon ? (
                  <img
                    src={card.monster_icon}
                    alt={card.name}
                    className="w-6 h-6 object-contain rounded"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-mh-slate-700/50 flex items-center justify-center text-[10px] text-mh-slate-500">
                    —
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className={`text-[10px] font-bold leading-tight ${isCore ? 'text-rarity-5' : 'text-mh-slate-400'}`}>
                    {label}
                  </span>
                  <span className="text-xs text-mh-slate-200 font-medium truncate max-w-[90px]">
                    {card?.name ?? <span className="text-mh-slate-500 font-normal">Empty</span>}
                  </span>
                </div>
                {card && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-mh-slate-700 text-mh-slate-300 font-mono">
                    {card.points}pt
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-dashed border-mh-slate-700/60 bg-mh-slate-800/20 text-center text-xs text-mh-slate-400">
          Visage card selection is hidden. Click{' '}
          <button
            type="button"
            onClick={() => setShowCardSlots(true)}
            className="text-[var(--theme-accent)] hover:underline font-medium cursor-pointer"
          >
            I'll Select My Own Cards
          </button>{' '}
          or{' '}
          <button
            type="button"
            onClick={() => navigate('/gallery')}
            className="text-[var(--theme-accent)] hover:underline font-medium cursor-pointer"
          >
            Load a Visage Set
          </button>
          .
        </div>
      )}

      {/* Duplicate warning */}
      {hasDuplicates && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-amber-500/40 bg-amber-500/10">
          <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠</span>
          <p className="text-[11px] text-amber-300 leading-snug">
            Set effects from Visage with the same name do not stack.
          </p>
        </div>
      )}

      {/* Ink Set Progress */}
      {activeInks.length > 0 && (
        <div className="flex flex-col gap-3 pt-2 border-t border-mh-slate-800">
          <span className="text-[10px] font-bold text-mh-slate-500 uppercase tracking-wider">Set Bonuses</span>
          {activeInks.map(([ink, count]) => {
            const c = getInkConfig(ink);
            const bonuses = INK_SET_BONUSES[ink];
            const MAX_PIPS = 4;

            return (
              <div key={ink} className="flex flex-col gap-2">
                {/* Name + progress bar row */}
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${c.dotColor} text-white`}>
                    <InkIconComponent iconName={c.iconName} size={10} />
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${c.text}`}>{c.name}</span>
                  {/* Plus button to add card for this ink */}
                  {(() => {
                    const firstEmptySlot = [2, 3, 4, 5].find(s => !slots.find(x => x.slot === s)?.card);
                    if (!firstEmptySlot) return null;
                    return (
                      <button
                        onClick={() => {
                          setOpenSlot(firstEmptySlot as VisageSlot);
                          setFilterInk(ink);
                          setSearchQuery('');
                          setInkPickSlot(null);
                        }}
                        title={`Add ${c.name} card`}
                        className="w-4 h-4 flex items-center justify-center rounded-full bg-mh-slate-700/50 hover:bg-mh-slate-600 text-mh-slate-400 hover:text-white transition-colors"
                      >
                        <Plus size={10} strokeWidth={3} />
                      </button>
                    );
                  })()}
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
                            filled ? c.dotColor : 'bg-mh-slate-700'
                          } ${filled && isMilestone ? 'ring-1 ring-white/30' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Bonus thresholds */}
                {bonuses && (
                  <div className="flex flex-col gap-1 pl-4 border-l border-mh-slate-700/50 ml-2">
                    {bonuses.map(({ pieces, description }) => {
                      const achieved = count >= pieces;
                      return (
                        <div
                          key={pieces}
                          className={`flex gap-2 items-start text-[11px] leading-snug transition-colors pl-2 ${
                            achieved ? 'text-mh-slate-100' : 'text-mh-slate-600'
                          }`}
                        >
                          <span className={`shrink-0 font-black text-[10px] mt-0.5 ${achieved ? c.text : 'text-mh-slate-700'} ${achieved ? c.bg + ' px-1 rounded' : ''}`}>
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
                        <p className="text-[10px] text-mh-slate-600 italic mt-0.5 pl-2">
                          {next.pieces - count} more card{next.pieces - count > 1 ? 's' : ''} for {next.pieces}-piece bonus
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Fallback if no bonus data yet */}
                {!bonuses && (
                  <p className="text-[10px] text-mh-slate-600 pl-4 italic ml-2 border-l border-mh-slate-700/50">Bonus data not yet available.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
