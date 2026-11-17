// ─────────────────────────────────────────────────────────────
// VisageCardChecker — "Check my Card" page
// Evaluates base effects drop tiers and calculates resketch roll odds.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { useAdminVisages } from '../../hooks/useAdminVisages';
import { useVisageCalculatorEngine } from '../../hooks/useVisageCalculatorData';
import {
  type DBVisage,
  type VisageRarity,
  getInkConfig,
  DEFAULT_VISAGE_RARITY,
} from '../../data/schemas/visage';
import VisageIcon from '../../components/visage/VisageIcon';
import { InkIconComponent } from './VisageCard';
import { cn } from '../../lib/utils';
import { pct } from '../../lib/visageCalc';

type QualityOption = 'Superior' | 'Epic' | 'Rare';

interface WeightPreset {
  id: string;
  label: string;
  weights: Record<string, number>;
}

const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'physical',
    label: 'Physical Attack',
    weights: {
      'Physical Attack': 1,
      Damage: 15,
      'Elemental Critical Damage': 5,
    },
  },
  {
    id: 'elemental',
    label: 'Elemental Attack',
    weights: {
      'Water Attack': 1,
      'Fire Attack': 1,
      'Ice Attack': 1,
      'Thunder Attack': 1,
      'Dragon Attack': 1,
      Damage: 15,
      'Elemental Critical Damage': 10,
    },
  },
  {
    id: 'all_attack',
    label: 'All Offensive',
    weights: {
      'Physical Attack': 1,
      'Water Attack': 1,
      'Fire Attack': 1,
      'Ice Attack': 1,
      'Thunder Attack': 1,
      'Dragon Attack': 1,
      Damage: 15,
      'Elemental Critical Damage': 10,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced (incl. Defense)',
    weights: {
      'Physical Attack': 1,
      Damage: 15,
      'Elemental Critical Damage': 8,
      Defense: 4,
    },
  },
];

// ── Cookie Persistence ──
const COOKIE_NAME = 'mho_visage_checker_state';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SavedCheckerState {
  m?: string; // monsterId
  i?: string; // ink
  q?: QualityOption; // quality
  l?: number; // level
  b?: Array<{ effect: string; value: string }>; // baseRolls
  s?: Array<{ effect: string; value: number | '' }>; // resketchSlots
  p?: string; // preset
  w?: Record<string, number>; // customWeights
}

function readCheckerCookie(): SavedCheckerState | null {
  try {
    const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    return JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)));
  } catch {
    return null;
  }
}

function writeCheckerCookie(data: SavedCheckerState) {
  try {
    const serialized = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${COOKIE_NAME}=${serialized}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch (err) {
    console.warn('Could not write visage checker cookie', err);
  }
}

function clearCheckerCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// ── Consumable Icons ──
export const BRUSH_CONFIG = {
  Superior: {
    name: 'Radiant Brush',
    icon: '/images/comsume/ItemIcon_TalismanInfusion_Gold.png',
  },
  Epic: {
    name: 'Unusual Brush',
    icon: '/images/comsume/ItemIcon_TalismanInfusion_Purple.png',
  },
  Rare: {
    name: 'Pure Brush',
    icon: '/images/comsume/ItemIcon_TalismanInfusion_Blue.png',
  },
} as const;

export const ZENNY_ICON = '/images/comsume/CurrencyIcon_Silver_01.png';

export function getRarityTheme(rarity: 'Superior' | 'Epic' | 'Rare' | null | undefined) {
  switch (rarity) {
    case 'Superior':
      return {
        border: 'border-amber-500/60 hover:border-amber-400',
        bg: 'bg-amber-500/10',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.22)]',
        text: 'text-amber-300',
        badge: 'bg-amber-400 text-slate-950 font-bold border border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
      };
    case 'Epic':
      return {
        border: 'border-purple-500/60 hover:border-purple-400',
        bg: 'bg-purple-500/10',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.22)]',
        text: 'text-purple-300',
        badge: 'bg-purple-500/30 text-purple-200 border border-purple-400/50 font-bold',
      };
    case 'Rare':
      return {
        border: 'border-sky-500/60 hover:border-sky-400',
        bg: 'bg-sky-500/10',
        glow: 'shadow-[0_0_15px_rgba(56,189,248,0.22)]',
        text: 'text-sky-300',
        badge: 'bg-sky-500/30 text-sky-200 border border-sky-400/50 font-bold',
      };
    default:
      return {
        border: 'border-white/10 hover:border-white/20',
        bg: 'bg-white/5',
        glow: '',
        text: 'text-mh-slate-400',
        badge: 'bg-white/10 text-mh-slate-400',
      };
  }
}

export default function VisageCardChecker() {
  const { data: dbVisages = [], isLoading: isLoadingVisages } = useAdminVisages({
    isActive: true,
    showSpoilers: true,
  });

  const { calc, baseEffects, resketchDataset, isLoading: isLoadingCalc } = useVisageCalculatorEngine();

  // Load initial cookie once
  const initialCookie = useMemo(() => readCheckerCookie(), []);

  // Selection states
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>(initialCookie?.m || '');
  const [selectedInk, setSelectedInk] = useState<string>(initialCookie?.i || '');
  const [cardQuality, setCardQuality] = useState<QualityOption>(initialCookie?.q || 'Superior');
  const [cardLevel, setCardLevel] = useState<number>(initialCookie?.l ?? 10);

  // Selected base rolls: array of { effect: string, value: string }
  const [baseRolls, setBaseRolls] = useState<Array<{ effect: string; value: string }>>(
    initialCookie?.b || [
      { effect: '', value: '' },
      { effect: '', value: '' },
    ],
  );

  // Selected 5 resketch slots: array of { effect: string, value: number | '' }
  const [resketchSlots, setResketchSlots] = useState<Array<{ effect: string; value: number | '' }>>(
    initialCookie?.s || [
      { effect: '', value: '' },
      { effect: '', value: '' },
      { effect: '', value: '' },
      { effect: '', value: '' },
      { effect: '', value: '' },
    ],
  );

  // Weight customization
  const [activePreset, setActivePreset] = useState<string>(initialCookie?.p || 'physical');
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(
    initialCookie?.w || WEIGHT_PRESETS[0].weights,
  );
  const [showWeightSliders, setShowWeightSliders] = useState<boolean>(false);

  // Persist state changes to cookie
  useEffect(() => {
    if (!selectedMonsterId) return;
    writeCheckerCookie({
      m: selectedMonsterId,
      i: selectedInk,
      q: cardQuality,
      l: cardLevel,
      b: baseRolls,
      s: resketchSlots,
      p: activePreset,
      w: customWeights,
    });
  }, [selectedMonsterId, selectedInk, cardQuality, cardLevel, baseRolls, resketchSlots, activePreset, customWeights]);

  // Initialize selected monster with Great Jagras or first available
  useEffect(() => {
    if (dbVisages.length > 0 && !selectedMonsterId) {
      const defaultCard = dbVisages.find((v) => v.name.includes('Great Jagras')) || dbVisages[0];
      if (defaultCard) {
        setSelectedMonsterId(defaultCard.id);
        const firstInk = defaultCard.ink_types[0] === 'fire' ? 'flames' : defaultCard.ink_types[0] || 'flames';
        setSelectedInk(firstInk);
      }
    }
  }, [dbVisages, selectedMonsterId]);

  const currentCard: DBVisage | undefined = useMemo(() => {
    return dbVisages.find((v) => v.id === selectedMonsterId);
  }, [dbVisages, selectedMonsterId]);

  // Determine effective base pool ID
  const effectiveBasePoolId = useMemo(() => {
    if (!currentCard?.base_effect_pools) return undefined;
    const qKey = cardQuality.toLowerCase() as 'rare' | 'epic' | 'superior';
    return currentCard.base_effect_pools[qKey];
  }, [currentCard, cardQuality]);

  // Load the base pool definitions for this card and quality
  const currentBasePool = useMemo(() => {
    if (!effectiveBasePoolId || baseEffects.length === 0) return null;
    return baseEffects.find((p) => p.pool_id === effectiveBasePoolId) || null;
  }, [effectiveBasePoolId, baseEffects]);

  // Resketch data for current quality
  const currentQualityResketch = useMemo(() => {
    return resketchDataset[cardQuality] || null;
  }, [resketchDataset, cardQuality]);

  // Number of base slots according to quality and pool
  const maxBaseSlots = useMemo(() => {
    if (effectiveBasePoolId === 111) return 2; // Elders always 2
    if (cardQuality === 'Rare') return 1;
    return 2; // Epic & Superior have 2
  }, [effectiveBasePoolId, cardQuality]);

  // Number of unlocked resketch slots according to card level
  const unlockedResketchCount = useMemo(() => {
    if (cardLevel < 2) return 0;
    if (cardLevel < 4) return 1;
    if (cardLevel < 6) return 2;
    if (cardLevel < 8) return 3;
    if (cardLevel < 10) return 4;
    return 5;
  }, [cardLevel]);

  // Reset rolls when card or quality changes
  const handleMonsterChange = (newId: string) => {
    setSelectedMonsterId(newId);
    const card = dbVisages.find((v) => v.id === newId);
    if (card && card.ink_types.length > 0) {
      const ink = card.ink_types[0] === 'fire' ? 'flames' : card.ink_types[0];
      setSelectedInk(ink);
    }
    setBaseRolls([
      { effect: '', value: '' },
      { effect: '', value: '' },
    ]);
  };

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const found = WEIGHT_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomWeights(found.weights);
    }
  };

  // Base effects evaluation via calc
  const evaluatedBase = useMemo(() => {
    if (!calc || !effectiveBasePoolId) return [];
    return baseRolls.slice(0, maxBaseSlots).map((roll) => {
      if (!roll.effect || !roll.value) return null;
      return calc.baseValue(effectiveBasePoolId, roll.effect, roll.value, cardLevel);
    });
  }, [calc, effectiveBasePoolId, baseRolls, maxBaseSlots, cardLevel]);

  // Resketch analysis calculation
  const resketchAnalysis = useMemo(() => {
    if (!calc || unlockedResketchCount === 0) return null;
    const hasAnyInput = resketchSlots.slice(0, unlockedResketchCount).some((s) => s.effect && s.value !== '');
    if (!hasAnyInput) return null;

    return calc.analyseCard({
      quality: cardQuality,
      level: cardLevel,
      unlockedSlots: unlockedResketchCount,
      basePool: effectiveBasePoolId,
      base: baseRolls.filter((b) => b.effect && b.value),
      slots: resketchSlots.slice(0, unlockedResketchCount).map((s) => ({ effect: s.effect, value: s.value })),
      weights: customWeights,
    });
  }, [calc, cardQuality, cardLevel, effectiveBasePoolId, baseRolls, resketchSlots, unlockedResketchCount, customWeights]);

  // List of distinct effects in resketch pool for the current quality
  const possibleResketchEffects = useMemo(() => {
    if (!currentQualityResketch) return [];
    return Array.from(new Set(currentQualityResketch.pool.map((p) => p.effect)));
  }, [currentQualityResketch]);

  // Helper to get available values for a chosen effect
  const getValuesForEffect = (effectName: string) => {
    if (!currentQualityResketch || !effectName) return [];
    const entries = currentQualityResketch.pool.filter((p) => p.effect === effectName);
    const vals: Array<{ value: number; rollQuality: string; raw: string }> = [];
    entries.forEach((e) => {
      e.values.forEach((v) => {
        vals.push({
          value: parseFloat(v.replace('%', '')),
          rollQuality: e.roll_quality,
          raw: v,
        });
      });
    });
    return vals.sort((a, b) => a.value - b.value);
  };

  // Determine roll quality for a specific resketch slot
  const getSlotRollQuality = (effect: string, value: number | ''): 'Superior' | 'Epic' | 'Rare' | null => {
    if (!effect || value === '' || !currentQualityResketch) return null;
    const entries = currentQualityResketch.pool.filter((p) => p.effect === effect);
    for (const entry of entries) {
      for (const v of entry.values) {
        if (Math.abs(parseFloat(v.replace('%', '')) - (value as number)) < 1e-4) {
          return entry.roll_quality as 'Superior' | 'Epic' | 'Rare';
        }
      }
    }
    return null;
  };

  // Overall live card score rating and rank
  const cardRating = useMemo(() => {
    const activeResketchSlots = resketchSlots
      .slice(0, unlockedResketchCount)
      .filter((s) => s.effect && s.value !== '');

    const activeBaseRolls = evaluatedBase.filter(Boolean);

    if (activeResketchSlots.length === 0 && activeBaseRolls.length === 0) {
      return {
        rank: 'Unranked' as const,
        scoreDisplay: '—',
        subText: 'Enter rolls below',
        theme: getRarityTheme(null),
      };
    }

    if (resketchAnalysis && activeResketchSlots.length > 0) {
      const qualities = activeResketchSlots.map((s) => getSlotRollQuality(s.effect, s.value));
      const hasSuperior = qualities.includes('Superior');
      const hasEpic = qualities.includes('Epic');
      const betterThan = resketchAnalysis.currentSetIsBetterThan;

      let rank: 'Superior' | 'Epic' | 'Rare' = 'Rare';
      if (betterThan >= 0.85 || hasSuperior) {
        rank = 'Superior';
      } else if (betterThan >= 0.45 || hasEpic) {
        rank = 'Epic';
      } else {
        rank = 'Rare';
      }

      const percentileTop = Math.max(0.1, 100 - betterThan * 100).toFixed(1);

      return {
        rank,
        scoreDisplay: `${resketchAnalysis.currentScore.toFixed(1)} Pts`,
        subText: `Top ${percentileTop}%`,
        theme: getRarityTheme(rank),
      };
    }

    const maxTier = Math.max(...activeBaseRolls.map((b) => b!.tier));
    let rank: 'Superior' | 'Epic' | 'Rare' = 'Rare';
    if (maxTier === 4) rank = 'Superior';
    else if (maxTier === 3) rank = 'Epic';
    else rank = 'Rare';

    return {
      rank,
      scoreDisplay: `Tier ${maxTier} Drop`,
      subText: maxTier === 4 ? '5% Top Base' : maxTier === 3 ? '15% High Base' : '40% Standard Base',
      theme: getRarityTheme(rank),
    };
  }, [resketchSlots, unlockedResketchCount, evaluatedBase, resketchAnalysis, getSlotRollQuality]);

  // Cost per resketch for current quality & unlocked slots
  const currentCost = useMemo(() => {
    if (!calc || unlockedResketchCount === 0) {
      return { item: BRUSH_CONFIG[cardQuality].name, count: 2, zenny: 16000 };
    }
    return calc.costPerResketch(cardQuality, unlockedResketchCount);
  }, [calc, cardQuality, unlockedResketchCount]);

  // Clear all inputs and cookie
  const handleClearAll = () => {
    clearCheckerCookie();
    setBaseRolls([
      { effect: '', value: '' },
      { effect: '', value: '' },
    ]);
    setResketchSlots([
      { effect: '', value: '' },
      { effect: '', value: '' },
      { effect: '', value: '' },
      { effect: '', value: '' },
      { effect: '', value: '' },
    ]);
    setCardLevel(10);
    setCardQuality('Superior');
    setActivePreset('physical');
    const found = WEIGHT_PRESETS.find((p) => p.id === 'physical');
    if (found) {
      setCustomWeights(found.weights);
    }
  };

  const inkConfig = getInkConfig(selectedInk);

  if (isLoadingVisages || isLoadingCalc) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-mh-slate-400 gap-3">
        <Sparkles className="animate-spin text-amber-400" size={32} />
        <p className="font-display text-sm tracking-wide">Loading Visage Calculator Data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header Bar ── */}
      <div className="mho-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/gallery"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-mh-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Gallery
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-[#FFD700] text-lg">❖</span>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-wide uppercase text-white">
              Check My Card
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
              Calculator
            </span>
          </div>
        </div>

        {/* Live Card Score Rating Badge & Clear Button */}
        <div className="flex items-center gap-3 ml-auto sm:ml-0 flex-wrap">
          <div
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border transition-all duration-300',
              cardRating.theme.bg,
              cardRating.theme.border,
              cardRating.theme.glow,
            )}
          >
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-mh-slate-400 tracking-wider">
                Card Roll Rating
              </span>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs sm:text-sm font-display font-black tracking-wide uppercase', cardRating.theme.text)}>
                  {cardRating.rank}
                </span>
                {cardRating.scoreDisplay !== '—' && (
                  <span className="text-xs font-mono font-bold text-white">
                    {cardRating.scoreDisplay}
                  </span>
                )}
                {cardRating.subText && (
                  <span className="text-[10px] font-mono text-mh-slate-300 hidden md:inline">
                    ({cardRating.subText})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClearAll}
            title="Clear all inputs and reset to default"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-xs font-semibold text-red-300 hover:text-red-200 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Card Selection & Artwork Preview ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="mho-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-mh-gold-400 border-b border-white/10 pb-2 flex items-center justify-between">
              <span>Card Selection</span>
              <span className="text-[10px] text-mh-slate-400 font-mono">Step 1</span>
            </h2>

            {/* Monster Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-mh-slate-300 flex items-center justify-between">
                <span>Select Monster</span>
                <span className="text-[10px] text-mh-slate-500">56 Available</span>
              </label>
              <div className="relative">
                <select
                  value={selectedMonsterId}
                  onChange={(e) => handleMonsterChange(e.target.value)}
                  className="w-full bg-mh-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white appearance-none pr-8 focus:outline-none focus:border-mh-gold-400 cursor-pointer"
                >
                  {dbVisages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name.replace(/^Visage:\s*/, '')} ({v.monster_type === 'large' ? 'Large' : 'Small'})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-mh-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Ink Type Selector */}
            {currentCard && currentCard.ink_types.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-mh-slate-300">Ink Variation</label>
                <div className="flex flex-wrap gap-2">
                  {currentCard.ink_types.map((rawInk) => {
                    const inkKey = rawInk === 'fire' ? 'flames' : rawInk;
                    const cfg = getInkConfig(inkKey);
                    const isSelected = selectedInk === inkKey;
                    return (
                      <button
                        key={inkKey}
                        type="button"
                        onClick={() => setSelectedInk(inkKey)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                          isSelected
                            ? cn(cfg.bg, cfg.border, cfg.text, 'shadow-[0_0_12px_rgba(255,215,0,0.2)]')
                            : 'bg-white/5 border-white/10 text-mh-slate-400 hover:text-white',
                        )}
                      >
                        <InkIconComponent iconName={cfg.iconName} size={12} />
                        <span>{cfg.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Card Quality Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-mh-slate-300">Card Rarity Quality</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Superior', 'Epic', 'Rare'] as QualityOption[]).map((q) => {
                  const isSelected = cardQuality === q;
                  const colorClass =
                    q === 'Superior'
                      ? 'border-amber-500/70 text-amber-300 bg-amber-500/20'
                      : q === 'Epic'
                        ? 'border-purple-500/70 text-purple-300 bg-purple-500/20'
                        : 'border-sky-500/70 text-sky-300 bg-sky-500/20';
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setCardQuality(q)}
                      className={cn(
                        'py-1.5 rounded-xl text-xs font-bold border transition-all text-center',
                        isSelected ? colorClass : 'bg-white/5 border-white/10 text-mh-slate-400 hover:text-white',
                      )}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Level Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-mh-slate-300">Card Level</span>
                <span className="font-mono font-bold text-amber-400">Lv. {cardLevel} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={cardLevel}
                onChange={(e) => setCardLevel(parseInt(e.target.value, 10))}
                className="w-full accent-mh-gold-400 h-1.5 bg-mh-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-mh-slate-500 font-mono">
                <span>Lv. 1</span>
                <span>Lv. 5</span>
                <span>Lv. 10 (Max)</span>
              </div>
            </div>

            {/* Rendered Visage Card Artwork */}
            {currentCard && (
              <div className="pt-2 flex flex-col items-center">
                <div
                  className={cn(
                    'relative w-44 rounded-2xl overflow-hidden border-2 shadow-2xl flex flex-col',
                    cardQuality === 'Superior'
                      ? 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : cardQuality === 'Epic'
                        ? 'border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                        : 'border-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.25)]',
                  )}
                >
                  {/* Top Art Canvas */}
                  <div className="relative w-full aspect-[4/5] bg-gradient-to-b from-[#1c2230] to-[#0e121a] flex items-center justify-center p-3">
                    <VisageIcon visage={currentCard} rarity={(cardQuality.toLowerCase() as VisageRarity) || DEFAULT_VISAGE_RARITY} />
                    <div className="absolute top-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white border border-white/20">
                      {currentCard.points} Pts
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/20">
                      <InkIconComponent iconName={inkConfig.iconName} size={11} />
                      <span className="text-[9px]">{inkConfig.shortName}</span>
                    </div>
                  </div>

                  {/* Bottom Strip */}
                  <div className="bg-black/90 p-2.5 border-t border-white/10 text-center space-y-1">
                    <h3 className="font-display text-xs font-bold text-white truncate">{currentCard.name}</h3>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-mh-slate-400 font-mono">
                      <span>Pool #{effectiveBasePoolId || '—'}</span>
                      <span>•</span>
                      <span>{unlockedResketchCount}/5 Slots</span>
                    </div>
                  </div>
                </div>

                {/* Overall Card Rating Badge right below artwork */}
                <div
                  className={cn(
                    'mt-3 p-3 rounded-xl border flex items-center justify-between transition-all duration-300 w-full',
                    cardRating.theme.bg,
                    cardRating.theme.border,
                    cardRating.theme.glow,
                  )}
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-mh-slate-400 block tracking-wider">
                      Live Roll Rating
                    </span>
                    <span className={cn('text-xs sm:text-sm font-display font-black tracking-wide uppercase', cardRating.theme.text)}>
                      {cardRating.rank} Roll
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs sm:text-sm font-bold text-white">{cardRating.scoreDisplay}</div>
                    <div className="text-[10px] font-mono text-mh-slate-400">{cardRating.subText}</div>
                  </div>
                </div>

                {currentCard.core_effect && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 w-full text-[11px] text-mh-slate-300">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide block mb-0.5">
                      Core Inherent Effect:
                    </span>
                    {currentCard.core_effect}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Evaluations & Calculations ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* ══════════════════════════════════════════════════════
              SECTION 1: BASE EFFECTS EVALUATOR
             ══════════════════════════════════════════════════════ */}
          <div className="mho-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">✦</span>
                <h2 className="font-display text-sm font-bold tracking-wide uppercase text-white">
                  Base Effects Assessment
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-mh-slate-300">
                  {maxBaseSlots} Slot{maxBaseSlots > 1 ? 's' : ''} (Pool #{effectiveBasePoolId})
                </span>
              </div>
              <span className="text-[11px] text-mh-slate-400 hidden sm:inline">
                Evaluates if your initial drop tier is worth upgrading
              </span>
            </div>

            {/* Possible Drop Pool Overview */}
            {currentBasePool && (
              <div className="p-3 rounded-xl bg-mh-slate-900/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-mh-slate-300">
                  <span>Possible Drops in Pool #{currentBasePool.pool_id} ({cardQuality}):</span>
                  <span className="text-[10px] text-mh-slate-500 font-normal">Tiers scale up to Level 10</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from(new Set(currentBasePool.effects.map((e) => e.effect))).map((effName) => {
                    const tiers = currentBasePool.effects.filter((e) => e.effect === effName).sort((a, b) => a.tier - b.tier);
                    const topTier = tiers[tiers.length - 1];
                    const minTier = tiers[0];
                    return (
                      <div key={effName} className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1 text-xs">
                        <div className="font-bold text-white truncate">{effName}</div>
                        <div className="text-[10px] text-mh-slate-400 flex justify-between">
                          <span>T1: {minTier.values_by_level[0]}</span>
                          <span className="text-amber-300 font-semibold">T4 (Max): {topTier.values_by_level[9]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Base Slots Input */}
            <div className="space-y-3">
              <p className="text-xs text-mh-slate-300">
                Enter the base effect{maxBaseSlots > 1 ? 's' : ''} and value{maxBaseSlots > 1 ? 's' : ''} rolled on your card:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: maxBaseSlots }).map((_, slotIdx) => {
                  const currentRoll = baseRolls[slotIdx] || { effect: '', value: '' };
                  const evalResult = evaluatedBase[slotIdx];
                  const distinctEffects = currentBasePool ? Array.from(new Set(currentBasePool.effects.map((e) => e.effect))) : [];

                  // Available values for selected effect in this pool
                  const availableTiers = currentBasePool && currentRoll.effect
                    ? currentBasePool.effects.filter((e) => e.effect === currentRoll.effect)
                    : [];

                  const baseSlotRarity: 'Superior' | 'Epic' | 'Rare' | null = evalResult
                    ? evalResult.tier === 4
                      ? 'Superior'
                      : evalResult.tier === 3
                        ? 'Epic'
                        : 'Rare'
                    : null;
                  const baseTheme = getRarityTheme(baseSlotRarity);

                  return (
                    <div
                      key={slotIdx}
                      className={cn(
                        'p-3 rounded-xl border transition-all duration-200 space-y-2',
                        baseTheme.bg,
                        baseTheme.border,
                        baseTheme.glow,
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-mh-slate-300">
                        <span className={baseTheme.text}>Base Slot #{slotIdx + 1}</span>
                        {evalResult && (
                          <span
                            className={cn('text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase', baseTheme.badge)}
                          >
                            Tier {evalResult.tier} ({evalResult.tierChance} Drop Rate)
                          </span>
                        )}
                      </div>

                      {/* Dropdown for effect */}
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={currentRoll.effect}
                          onChange={(e) => {
                            const newEff = e.target.value;
                            const next = [...baseRolls];
                            next[slotIdx] = { effect: newEff, value: '' };
                            setBaseRolls(next);
                          }}
                          className="bg-mh-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="">Select Effect…</option>
                          {distinctEffects.map((eff) => (
                            <option key={eff} value={eff}>
                              {eff}
                            </option>
                          ))}
                        </select>

                        {/* Dropdown for value */}
                        <select
                          value={currentRoll.value}
                          disabled={!currentRoll.effect}
                          onChange={(e) => {
                            const next = [...baseRolls];
                            next[slotIdx] = { ...next[slotIdx], value: e.target.value };
                            setBaseRolls(next);
                          }}
                          className="bg-mh-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer disabled:opacity-40"
                        >
                          <option value="">Select Value…</option>
                          {availableTiers.map((t) => {
                            const val = t.values_by_level[cardLevel - 1] || t.values_by_level[0];
                            return (
                              <option key={t.tier} value={val}>
                                Tier {t.tier}: {val} (at Lv.{cardLevel})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Evaluation stats if filled */}
                      {evalResult && (
                        <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[11px] text-mh-slate-300">
                          <div>
                            <span className="text-mh-slate-400">At Lv.10: </span>
                            <span className="font-mono font-bold text-white">{evalResult.level10}</span>
                          </div>
                          <div>
                            <span className="text-mh-slate-400">Max Possible: </span>
                            <span className="font-mono font-bold text-amber-300">{evalResult.bestPossibleLevel10}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Base Verdict Banner */}
              {evaluatedBase.some(Boolean) && (
                <div
                  className={cn(
                    'p-3 rounded-xl border flex items-start gap-3 transition-colors',
                    evaluatedBase.every((b) => b && b.tier >= 3)
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : evaluatedBase.some((b) => b && b.tier === 1)
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-blue-500/15 border-blue-500/40 text-blue-200',
                  )}
                >
                  {evaluatedBase.every((b) => b && b.tier >= 3) ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : evaluatedBase.some((b) => b && b.tier === 1) ? (
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold">
                      {evaluatedBase.every((b) => b && b.tier >= 3)
                        ? 'High-Tier Drop (Worth Upgrading & Sketching!)'
                        : evaluatedBase.some((b) => b && b.tier === 1)
                          ? 'Sub-Optimal Base Roll (Bottom 40%)'
                          : 'Decent Baseline Stats'}
                    </p>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {evaluatedBase.every((b) => b && b.tier >= 3)
                        ? 'Your card rolled top-tier base values. It will reach near-maximum base stats at Lv. 10 and is definitely safe to invest brushes into.'
                        : evaluatedBase.some((b) => b && b.tier === 1)
                          ? 'At least one roll is Tier 1 (40% drop probability). If you have spare hunt tickets or drop boxes, consider farming another copy before spending rare Radiant Brushes on resketching.'
                          : 'Average roll tiers. It is usable, but keep an eye out for a higher Tier 3 or 4 drop in the future.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              SECTION 2: RESKETCH SLOTS & PROBABILITY CALCULATOR
             ══════════════════════════════════════════════════════ */}
          <div className="mho-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[#FFD700] text-sm">❖</span>
                <h2 className="font-display text-sm font-bold tracking-wide uppercase text-white">
                  Resketch Slots & Reroll Evaluation
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-mh-slate-300">
                  {unlockedResketchCount} / 5 Unlocked (Lv. {cardLevel})
                </span>
              </div>

              {/* Resketch Cost Preview Pill */}
              <div className="flex items-center gap-3 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                <span className="text-mh-slate-400 text-[10px]">Cost / Attempt:</span>
                <div className="flex items-center gap-1 text-white font-bold">
                  <img
                    src={BRUSH_CONFIG[cardQuality].icon}
                    alt={BRUSH_CONFIG[cardQuality].name}
                    className="w-4 h-4 object-contain"
                  />
                  <span>{currentCost.count}x {currentCost.item}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-300 font-bold">
                  <img
                    src={ZENNY_ICON}
                    alt="Zenny"
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span>{currentCost.zenny.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Weight Presets Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-mh-slate-300">What stats are you aiming for?</span>
                <button
                  type="button"
                  onClick={() => setShowWeightSliders((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  <Sliders size={12} />
                  {showWeightSliders ? 'Hide Sliders' : 'Customize Weights'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {WEIGHT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={cn(
                      'px-3 py-1 rounded-xl text-xs font-semibold border transition-all',
                      activePreset === preset.id
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-white/5 border-white/10 text-mh-slate-400 hover:text-white',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Weight Sliders (if opened) */}
              {showWeightSliders && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2.5 animate-in fade-in duration-150">
                  <div className="text-[11px] text-mh-slate-400">
                    Adjust how much each effect is worth to you (higher = more desired, 0 = unwanted):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {possibleResketchEffects.map((eff) => (
                      <div key={eff} className="flex items-center justify-between gap-2 p-1.5 rounded bg-white/5">
                        <span className="truncate text-mh-slate-300">{eff}</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="50"
                          value={customWeights[eff] ?? 0}
                          onChange={(e) => {
                            setActivePreset('custom');
                            setCustomWeights({
                              ...customWeights,
                              [eff]: parseFloat(e.target.value) || 0,
                            });
                          }}
                          className="w-16 bg-mh-slate-900 border border-white/20 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5 Resketch Slots Grid */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, slotIdx) => {
                  const isUnlocked = slotIdx < unlockedResketchCount;
                  const slotData = resketchSlots[slotIdx] || { effect: '', value: '' };
                  const availableValues = getValuesForEffect(slotData.effect);
                  const rollQuality = getSlotRollQuality(slotData.effect, slotData.value);
                  const slotTheme = getRarityTheme(rollQuality);
                  const slotDesc = resketchAnalysis?.slots.find((s) => s.slot === slotIdx + 1);

                  return (
                    <div
                      key={slotIdx}
                      className={cn(
                        'p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition-all duration-200',
                        isUnlocked
                          ? cn(slotTheme.bg, slotTheme.border, slotTheme.glow)
                          : 'bg-black/20 border-white/5 opacity-40',
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className={slotTheme.text}>Slot #{slotIdx + 1}</span>
                        {!isUnlocked && (
                          <span className="text-[9px] text-mh-slate-500 font-mono">Lv. {(slotIdx + 1) * 2}</span>
                        )}
                        {rollQuality && (
                          <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded uppercase', slotTheme.badge)}>
                            {rollQuality}
                          </span>
                        )}
                      </div>

                      {isUnlocked ? (
                        <div className="space-y-1.5">
                          {/* Effect Select */}
                          <select
                            value={slotData.effect}
                            onChange={(e) => {
                              const newEff = e.target.value;
                              const next = [...resketchSlots];
                              next[slotIdx] = { effect: newEff, value: '' };
                              setResketchSlots(next);
                            }}
                            className="w-full bg-mh-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none cursor-pointer truncate"
                          >
                            <option value="">Select Effect…</option>
                            {possibleResketchEffects.map((eff) => (
                              <option key={eff} value={eff}>
                                {eff}
                              </option>
                            ))}
                          </select>

                          {/* Value Select */}
                          <select
                            value={slotData.value}
                            disabled={!slotData.effect}
                            onChange={(e) => {
                              const next = [...resketchSlots];
                              next[slotIdx] = {
                                ...next[slotIdx],
                                value: e.target.value === '' ? '' : parseFloat(e.target.value),
                              };
                              setResketchSlots(next);
                            }}
                            className="w-full bg-mh-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none cursor-pointer disabled:opacity-40 font-mono"
                          >
                            <option value="">Select Value…</option>
                            {availableValues.map((v, i) => (
                              <option key={i} value={v.value}>
                                {v.raw} ({v.rollQuality})
                              </option>
                            ))}
                          </select>

                          {/* Individual slot rank */}
                          {slotDesc && slotDesc.rank && (
                            <div className="text-[10px] text-mh-slate-400 flex items-center justify-between pt-1 border-t border-white/5 font-mono">
                              <span>Rank {slotDesc.rank}/{slotDesc.ofValues}</span>
                              <span className="text-amber-400 font-bold">Max: {slotDesc.best}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-mh-slate-600 text-[10px]">
                          <span>🔒 Locked</span>
                          <span>Unlocks at Lv. {(slotIdx + 1) * 2}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reset Slots button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setResketchSlots([
                      { effect: '', value: '' },
                      { effect: '', value: '' },
                      { effect: '', value: '' },
                      { effect: '', value: '' },
                      { effect: '', value: '' },
                    ])
                  }
                  className="flex items-center gap-1 text-[11px] text-mh-slate-400 hover:text-white transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset Slots
                </button>
              </div>
            </div>

            {/* ── Calculation Results Dashboard ── */}
            {resketchAnalysis ? (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Metric 1: Current Score */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-mh-slate-400 tracking-wider">
                      Current Set Score
                    </span>
                    <div className="font-mono text-2xl font-black text-white">
                      {resketchAnalysis.currentScore}
                    </div>
                    <span className="text-[10px] text-mh-slate-500">Weighted sum of active slots</span>
                  </div>

                  {/* Metric 2: Percentile */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-mh-slate-400 tracking-wider">
                      Percentile Rank
                    </span>
                    <div className="font-mono text-2xl font-black text-[#FFD700]">
                      {pct(resketchAnalysis.currentSetIsBetterThan, 1)}
                    </div>
                    <span className="text-[10px] text-mh-slate-400">Better than other rolls</span>
                  </div>

                  {/* Metric 3: Chance to Improve */}
                  <div
                    className={cn(
                      'p-3.5 rounded-xl border space-y-1',
                      resketchAnalysis.chanceBetterPerResketch > 0.4
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : resketchAnalysis.chanceBetterPerResketch < 0.1
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white',
                    )}
                  >
                    <span className="text-[10px] uppercase font-bold opacity-80 tracking-wider">
                      Chance Better / Roll
                    </span>
                    <div className="font-mono text-2xl font-black">
                      {pct(resketchAnalysis.chanceBetterPerResketch, 2)}
                    </div>
                    <span className="text-[10px] opacity-75">Per resketch attempt</span>
                  </div>

                  {/* Metric 4: Cost per attempt with consumable icons */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-mh-slate-400 tracking-wider block">
                      Cost Per Resketch
                    </span>
                    <div className="flex items-center gap-2 font-mono text-base font-bold text-white">
                      <img
                        src={
                          resketchAnalysis.costPerResketch.item === 'Radiant Brush'
                            ? BRUSH_CONFIG.Superior.icon
                            : resketchAnalysis.costPerResketch.item === 'Unusual Brush'
                              ? BRUSH_CONFIG.Epic.icon
                              : BRUSH_CONFIG.Rare.icon
                        }
                        alt={resketchAnalysis.costPerResketch.item}
                        className="w-5 h-5 object-contain shrink-0"
                      />
                      <span className="text-amber-300">
                        {resketchAnalysis.costPerResketch.count}x {resketchAnalysis.costPerResketch.item}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-mh-slate-300 font-mono">
                      <img
                        src={ZENNY_ICON}
                        alt="Zenny"
                        className="w-4 h-4 object-contain shrink-0"
                      />
                      <span>{resketchAnalysis.costPerResketch.zenny.toLocaleString()} Zenny</span>
                    </div>
                  </div>
                </div>

                {/* ── Actionable Verdict Banner ── */}
                <div
                  className={cn(
                    'p-4 rounded-xl border flex items-start gap-3 shadow-lg',
                    resketchAnalysis.chanceBetterPerResketch < 0.05
                      ? 'bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border-emerald-500/50 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : resketchAnalysis.chanceBetterPerResketch <= 0.2
                        ? 'bg-blue-950/50 border-blue-500/40 text-blue-100'
                        : resketchAnalysis.chanceBetterPerResketch <= 0.4
                          ? 'bg-purple-950/50 border-purple-500/40 text-purple-100'
                          : 'bg-amber-950/50 border-amber-500/40 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                  )}
                >
                  <TrendingUp size={22} className="shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm tracking-wide">
                        {resketchAnalysis.chanceBetterPerResketch < 0.05
                          ? '🏆 God Roll — Do Not Resketch!'
                          : resketchAnalysis.chanceBetterPerResketch <= 0.2
                            ? '🛡️ Strong Set — Highly Recommended to Keep'
                            : resketchAnalysis.chanceBetterPerResketch <= 0.4
                              ? '⚖️ Decent Set — Reroll Only with Surplus Materials'
                              : '⚡ Improvement Possible — Caution: High Resource Cost'}
                      </span>
                    </div>
                    <p className="opacity-90 leading-relaxed text-[11px]">
                      {resketchAnalysis.chanceBetterPerResketch < 0.05
                        ? `This set is in the top ${(100 - resketchAnalysis.currentSetIsBetterThan * 100).toFixed(1)}% of all possible combinations. Only ${pct(resketchAnalysis.chanceBetterPerResketch)} of rolls can beat it. Brushes and Zenny are extremely rare—keep this card!`
                        : resketchAnalysis.chanceBetterPerResketch <= 0.2
                          ? `Only ${pct(resketchAnalysis.chanceBetterPerResketch)} of resketch rolls will beat this score. Beating it takes an average of ${resketchAnalysis.expectedResketches.toFixed(0)} attempts (~${resketchAnalysis.expectedCost?.items.toLocaleString()} brushes). Keep it unless min-maxing end-game.`
                          : resketchAnalysis.chanceBetterPerResketch <= 0.4
                            ? `You have a ${pct(resketchAnalysis.chanceBetterPerResketch)} chance of rolling a higher score. It should take around ${resketchAnalysis.expectedResketches.toFixed(0)} attempts on average to improve. Reroll only if you have spare materials.`
                            : `While ${pct(resketchAnalysis.chanceBetterPerResketch)} of combinations score higher than your current slots, brushes and zenny are very hard to come by! Reroll prudently and prioritize your main cards.`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-black/30 border border-white/5 text-center text-xs text-mh-slate-500 space-y-1">
                <HelpCircle size={20} className="mx-auto text-mh-slate-600 mb-1" />
                <p>Select at least one effect and value in the unlocked slots above to calculate resketch odds.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
