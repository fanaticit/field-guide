// ─────────────────────────────────────────────────────────────
// VisageCardChecker — "Check my Card" page
// Evaluates base effects drop tiers and calculates resketch roll odds.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import PollPrompt from '../../components/polls/PollPrompt';
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
  Plus,
  X,
  User,
  UserX,
  Check,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SECTION_THEMES, type RarityTheme } from '../../config/themes';
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
import { pct, baseTierRarity, type RollRarity } from '../../lib/visageCalc';
import {
  visagePower,
  visagePowerByElement,
  toPowerElement,
  LEVEL_POINTS,
  EFFECT_POINTS,
  POWER_ELEMENTS,
  type ElementName,
  type WearerElement,
} from '../../lib/visagePower';
import { usePublicAdventurers } from '../../hooks/useAdminAdventurers';
import { useUserAdventurerCollection } from '../../hooks/useUserAdventurerCollection';
import { useAuthStore } from '../../store/authStore';
import { type DBAdventurer } from '../../data/schemas/adventurer';

type QualityOption = 'Superior' | 'Epic' | 'Rare';
type SelectionMode = 'monster' | 'ink';

interface BaseRollInput {
  effect: string;
  /** Tier picked from the pool (values change with level, the tier does not). */
  tier: number | '';
}

interface SlotRollInput {
  effect: string;
  value: number | '';
}

/** Every card can show up to 2 base effects; leave one blank if the card only has one. */
const MAX_BASE_SLOTS = 2;
const EMPTY_BASE_ROLLS = (): BaseRollInput[] => [
  { effect: '', tier: '' },
  { effect: '', tier: '' },
];
const EMPTY_SLOTS = (): SlotRollInput[] =>
  Array.from({ length: 5 }, () => ({ effect: '', value: '' as const }));

const RARITY_ORDER: Record<RollRarity, number> = { Rare: 0, Epic: 1, Superior: 2 };

/** Some visages store the flames ink as 'fire'. */
const normInk = (raw: string) => (raw === 'fire' ? 'flames' : raw);

/** Weights used when an adventurer is picked: their element's Attack 85%, Damage / Defense / Physical 5% each. */
const elementPresetId = (el: ElementName) => `element:${el}`;
const elementFromPresetId = (id: string): ElementName | null =>
  id.startsWith('element:') ? toPowerElement(id.slice('element:'.length)) : null;
const elementWeights = (el: ElementName): Record<string, number> => ({
  [`${el} Attack`]: 85,
  Damage: 5,
  Defense: 5,
  'Physical Attack': 5,
});

const ADVENTURER_RARITY_SORT: Record<string, number> = { superior: 0, epic: 1, rare: 2 };

interface WeightPreset {
  id: string;
  label: string;
  weights: Record<string, number>;
}

/**
 * Presets split 100% across the stats that matter for that playstyle.
 * Each slot is scored against the best possible roll of its stat, so the shares are
 * directly comparable between stats with different units (Attack vs Damage %).
 */
const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'physical',
    label: 'Physical Attack',
    weights: {
      'Physical Attack': 40,
      Damage: 40,
      'Elemental Critical Damage': 20,
    },
  },
  {
    id: 'elemental',
    label: 'Elemental Attack',
    weights: {
      'Water Attack': 12,
      'Fire Attack': 12,
      'Ice Attack': 12,
      'Thunder Attack': 12,
      'Dragon Attack': 12,
      Damage: 25,
      'Elemental Critical Damage': 15,
    },
  },
  {
    id: 'all_attack',
    label: 'All Offensive',
    weights: {
      'Physical Attack': 10,
      'Water Attack': 10,
      'Fire Attack': 10,
      'Ice Attack': 10,
      'Thunder Attack': 10,
      'Dragon Attack': 10,
      Damage: 25,
      'Elemental Critical Damage': 15,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced (incl. Defense)',
    weights: {
      'Physical Attack': 35,
      Damage: 30,
      'Elemental Critical Damage': 20,
      Defense: 15,
    },
  },
];

const totalShare = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + (b > 0 ? b : 0), 0);

/** Scale shares so they add up to exactly 100 (largest-remainder rounding). */
function balanceTo100(w: Record<string, number>): Record<string, number> {
  const entries = Object.entries(w).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total <= 0) return w;
  const raw = entries.map(([k, v]) => ({ k, exact: (v * 100) / total }));
  const out: Record<string, number> = {};
  raw.forEach((r) => (out[r.k] = Math.floor(r.exact)));
  let left = 100 - Object.values(out).reduce((a, b) => a + b, 0);
  [...raw].sort((x, y) => (y.exact % 1) - (x.exact % 1)).forEach((r) => {
    if (left > 0) {
      out[r.k] += 1;
      left -= 1;
    }
  });
  return out;
}

// ── Cookie Persistence ──
const COOKIE_NAME = 'mho_visage_checker_state';
const COOKIE_VERSION = 3; // v2: base rolls saved by tier; v3: weights saved as % shares
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SavedCheckerState {
  v?: number; // cookie format version
  sm?: SelectionMode; // selection mode
  m?: string; // monsterId
  i?: string; // ink
  q?: QualityOption; // quality
  l?: number; // level
  b?: BaseRollInput[]; // baseRolls
  s?: SlotRollInput[]; // resketchSlots
  p?: string; // preset
  w?: Record<string, number>; // customWeights
  a?: string; // wearer adventurer id ('' = none, base power)
  he?: ElementName | 'None'; // Hunter (Fated Adventurer) weapon element
}

function readCheckerCookie(): SavedCheckerState | null {
  try {
    const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1))) as SavedCheckerState;
    // v1 cookies stored base rolls by value, which can't be mapped back to a tier reliably — drop them.
    if (!parsed.v || parsed.v < 2) delete parsed.b;
    // Before v3 weights were per-unit multipliers; fall back to the saved preset's shares.
    if (!parsed.v || parsed.v < 3) delete parsed.w;
    if (parsed.b && (!Array.isArray(parsed.b) || parsed.b.some((r) => !r || !('tier' in r)))) delete parsed.b;
    if (parsed.s && (!Array.isArray(parsed.s) || parsed.s.length !== 5)) delete parsed.s;
    return parsed;
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

export function getRarityTheme(rarity: RollRarity | null | undefined) {
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

export function getSectionThemeStyles(theme: RarityTheme | string | undefined) {
  switch (theme) {
    case 'epic':
      return {
        badgeBorder: 'border-purple-500/50',
        badgeBg: 'bg-purple-500/15',
        labelColor: 'text-purple-300',
        glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
      };
    case 'superior':
      return {
        badgeBorder: 'border-amber-400/50',
        badgeBg: 'bg-amber-400/15',
        labelColor: 'text-amber-300',
        glow: 'shadow-[0_0_12px_rgba(251,191,36,0.25)]',
      };
    case 'fine':
      return {
        badgeBorder: 'border-emerald-500/50',
        badgeBg: 'bg-emerald-500/15',
        labelColor: 'text-emerald-300',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      };
    case 'standard':
      return {
        badgeBorder: 'border-yellow-400/50',
        badgeBg: 'bg-yellow-400/15',
        labelColor: 'text-yellow-300',
        glow: 'shadow-[0_0_12px_rgba(250,204,21,0.25)]',
      };
    case 'rare':
    default:
      return {
        badgeBorder: 'border-sky-400/50',
        badgeBg: 'bg-sky-400/15',
        labelColor: 'text-sky-300',
        glow: 'shadow-[0_0_12px_rgba(56,189,248,0.25)]',
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
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(initialCookie?.sm || 'monster');
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>(initialCookie?.m || '');
  const [selectedInk, setSelectedInk] = useState<string>(initialCookie?.i || '');
  const [cardQuality, setCardQuality] = useState<QualityOption>(initialCookie?.q || 'Superior');
  const [cardLevel, setCardLevel] = useState<number>(initialCookie?.l ?? 1);

  // Selected base rolls (by tier)
  const [baseRolls, setBaseRolls] = useState<BaseRollInput[]>(initialCookie?.b || EMPTY_BASE_ROLLS());

  // Selected 5 resketch slots
  const [resketchSlots, setResketchSlots] = useState<SlotRollInput[]>(initialCookie?.s || EMPTY_SLOTS());

  // Weight customization
  const [activePreset, setActivePreset] = useState<string>(initialCookie?.p || 'physical');
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(
    initialCookie?.w ||
      WEIGHT_PRESETS.find((p) => p.id === initialCookie?.p)?.weights ||
      WEIGHT_PRESETS[0].weights,
  );
  const [showWeightSliders, setShowWeightSliders] = useState<boolean>(false);

  // Who wears the card (for Power): '' = nobody picked, so Power is the base score with no element match
  const [wearerId, setWearerId] = useState<string>(initialCookie?.a || '');
  const [hunterElement, setHunterElement] = useState<ElementName | 'None'>(initialCookie?.he || 'None');

  // UI & Theme states
  const galleryTheme = useUIStore(
    (s) => s.sectionThemes['/gallery'] ?? DEFAULT_SECTION_THEMES['/gallery'] ?? 'rare',
  );
  const galleryThemeStyle = useMemo(() => getSectionThemeStyles(galleryTheme), [galleryTheme]);
  const [showBasePoolOverride, setShowBasePoolOverride] = useState<boolean | null>(null);
  const [showAdventurerPicker, setShowAdventurerPicker] = useState<boolean>(false);
  const adventurerPickerRef = useRef<HTMLDivElement>(null);

  // Close adventurer picker on outside click / escape
  useEffect(() => {
    if (!showAdventurerPicker) return;
    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (adventurerPickerRef.current && !adventurerPickerRef.current.contains(e.target as Node)) {
        setShowAdventurerPicker(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdventurerPicker(false);
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('touchstart', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('touchstart', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [showAdventurerPicker]);

  // Ensure #app-root, body, and html use overflow-x: clip so position: sticky floats properly on scroll
  useEffect(() => {
    const root = document.getElementById('app-root');
    if (root) root.style.overflowX = 'clip';
    document.body.style.overflowX = 'clip';
    document.documentElement.style.overflowX = 'clip';
  }, []);

  // Floating header minimized state when scrolled
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Persist state changes to cookie
  useEffect(() => {
    if (!selectedMonsterId) return;
    writeCheckerCookie({
      v: COOKIE_VERSION,
      sm: selectionMode,
      m: selectedMonsterId,
      i: selectedInk,
      q: cardQuality,
      l: cardLevel,
      b: baseRolls,
      s: resketchSlots,
      p: activePreset,
      w: customWeights,
      a: wearerId,
      he: hunterElement,
    });
  }, [
    selectionMode,
    selectedMonsterId,
    selectedInk,
    cardQuality,
    cardLevel,
    baseRolls,
    resketchSlots,
    activePreset,
    customWeights,
    wearerId,
    hunterElement,
  ]);

  // ── Adventurers (who wears the card) ──
  const showSpoilers = useAuthStore((st) => Boolean(st.profile?.show_spoilers));
  const { data: adventurers = [] } = usePublicAdventurers({ showSpoilers });
  const { isRecruited } = useUserAdventurerCollection();

  /** Owned first, then not owned; within each: Fated Adventurer, SSR, SR, Rare, then A–Z. */
  const adventurerGroups = useMemo(() => {
    const list = adventurers.filter((a) => a.status !== 'not_in_game');
    const sortFn = (a: DBAdventurer, b: DBAdventurer) =>
      Number(b.is_default) - Number(a.is_default) ||
      (ADVENTURER_RARITY_SORT[a.rarity ?? ''] ?? 3) - (ADVENTURER_RARITY_SORT[b.rarity ?? ''] ?? 3) ||
      a.name.localeCompare(b.name);
    return {
      owned: list.filter((a) => isRecruited(a)).sort(sortFn),
      notOwned: list.filter((a) => !isRecruited(a)).sort(sortFn),
    };
  }, [adventurers, isRecruited]);

  const wearer = useMemo(() => adventurers.find((a) => a.id === wearerId) ?? null, [adventurers, wearerId]);
  const wearerIsHunter = Boolean(wearer?.is_default);
  /** Element used for Power: null = base score (no adventurer picked, or no element). */
  const wearerElement: WearerElement = !wearer
    ? null
    : wearerIsHunter
      ? null
      : toPowerElement(wearer.element_specialization);
  const wearerLabel = !wearer
    ? 'No adventurer: base power'
    : wearerIsHunter
      ? 'Fated Adventurer (your Hunter)'
      : `${wearer.name}${wearerElement ? ` · ${wearerElement}` : ''}`;

  const handleWearerChange = (id: string) => {
    setWearerId(id);
    const adv = adventurers.find((a) => a.id === id);
    if (!adv) return; // back to base power; weights stay as they are
    if (adv.is_default) {
      // The player's own Hunter: element and stats depend on their weapon, so let them set the weights
      setShowWeightSliders(true);
      return;
    }
    const el = toPowerElement(adv.element_specialization);
    if (el) {
      setActivePreset(elementPresetId(el));
      setCustomWeights(elementWeights(el));
    }
  };


  // Pick a default card when nothing is selected, or when a saved card no longer exists
  useEffect(() => {
    if (dbVisages.length === 0) return;
    const existing = selectedMonsterId ? dbVisages.find((v) => v.id === selectedMonsterId) : undefined;
    if (existing) {
      // Keep the ink valid for the restored card
      const inks = existing.ink_types.map(normInk);
      if (inks.length > 0 && !inks.includes(selectedInk)) setSelectedInk(inks[0]);
      return;
    }
    const defaultCard = dbVisages.find((v) => v.name.includes('Great Jagras')) || dbVisages[0];
    if (defaultCard) {
      setSelectedMonsterId(defaultCard.id);
      setSelectedInk(normInk(defaultCard.ink_types[0] || 'flames'));
      setBaseRolls(EMPTY_BASE_ROLLS());
    }
  }, [dbVisages, selectedMonsterId, selectedInk]);

  const currentCard: DBVisage | undefined = useMemo(() => {
    return dbVisages.find((v) => v.id === selectedMonsterId);
  }, [dbVisages, selectedMonsterId]);

  // All inks across every visage (for the "By Ink" flow)
  const allInks = useMemo(() => {
    const set = new Set<string>();
    dbVisages.forEach((v) => v.ink_types.forEach((ink) => set.add(normInk(ink))));
    return Array.from(set).sort((a, b) => getInkConfig(a).shortName.localeCompare(getInkConfig(b).shortName));
  }, [dbVisages]);

  // Monsters shown in the dropdown — filtered by ink in "By Ink" mode
  const monsterOptions = useMemo(() => {
    if (selectionMode !== 'ink' || !selectedInk) return dbVisages;
    return dbVisages.filter((v) => v.ink_types.map(normInk).includes(selectedInk));
  }, [dbVisages, selectionMode, selectedInk]);

  const getPoolId = (card: DBVisage | undefined, q: QualityOption) =>
    card?.base_effect_pools?.[q.toLowerCase() as 'rare' | 'epic' | 'superior'];

  // Determine effective base pool ID
  const effectiveBasePoolId = useMemo(() => getPoolId(currentCard, cardQuality), [currentCard, cardQuality]);

  // Load the base pool definitions for this card and quality
  const currentBasePool = useMemo(() => {
    if (!effectiveBasePoolId || baseEffects.length === 0) return null;
    return baseEffects.find((p) => p.pool_id === effectiveBasePoolId) || null;
  }, [effectiveBasePoolId, baseEffects]);

  // Resketch data for current quality
  const currentQualityResketch = useMemo(() => {
    return resketchDataset[cardQuality] || null;
  }, [resketchDataset, cardQuality]);

  const maxBaseSlots = MAX_BASE_SLOTS;

  // Number of unlocked resketch slots according to card level
  const unlockedResketchCount = useMemo(() => {
    if (cardLevel < 2) return 0;
    if (cardLevel < 4) return 1;
    if (cardLevel < 6) return 2;
    if (cardLevel < 8) return 3;
    if (cardLevel < 10) return 4;
    return 5;
  }, [cardLevel]);

  // Change card. In "By Ink" mode keep the chosen ink if the new card has it.
  const handleMonsterChange = (newId: string) => {
    setSelectedMonsterId(newId);
    const card = dbVisages.find((v) => v.id === newId);
    if (card && card.ink_types.length > 0) {
      const inks = card.ink_types.map(normInk);
      if (!(selectionMode === 'ink' && inks.includes(selectedInk))) setSelectedInk(inks[0]);
    }
    // Base pool can differ between monsters
    const oldPool = getPoolId(currentCard, cardQuality);
    if (getPoolId(card, cardQuality) !== oldPool) setBaseRolls(EMPTY_BASE_ROLLS());
  };

  // "By Ink" flow: pick ink first, then the monster list narrows to cards with that ink
  const handleInkPick = (ink: string) => {
    setSelectedInk(ink);
    if (selectionMode === 'ink' && currentCard && !currentCard.ink_types.map(normInk).includes(ink)) {
      const first = dbVisages.find((v) => v.ink_types.map(normInk).includes(ink));
      if (first) {
        setSelectedMonsterId(first.id);
        if (getPoolId(first, cardQuality) !== effectiveBasePoolId) setBaseRolls(EMPTY_BASE_ROLLS());
      }
    }
  };

  // Changing rarity changes both pools: keep only entries that still exist in the new pools
  const handleQualityChange = (q: QualityOption) => {
    if (q === cardQuality) return;
    setCardQuality(q);

    const newResketch = resketchDataset[q];
    setResketchSlots((prev) =>
      prev.map((slot) => {
        if (!slot.effect || slot.value === '' || !newResketch) return slot;
        const valid = newResketch.pool.some(
          (p) => p.effect === slot.effect && p.values.some((v) => Math.abs(parseFloat(v) - (slot.value as number)) < 1e-4),
        );
        return valid ? slot : { effect: slot.effect, value: '' };
      }),
    );

    const newPool = baseEffects.find((p) => p.pool_id === getPoolId(currentCard, q));
    setBaseRolls((prev) =>
      prev.map((roll) => {
        if (!roll.effect) return roll;
        if (!newPool || !newPool.effects.some((e) => e.effect === roll.effect)) return { effect: '', tier: '' };
        if (roll.tier !== '' && !newPool.effects.some((e) => e.effect === roll.effect && e.tier === roll.tier)) {
          return { effect: roll.effect, tier: '' };
        }
        return roll;
      }),
    );
  };

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const found = WEIGHT_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomWeights(found.weights);
    }
  };

  // Quick-add an effect (and optional tier) from the pool table into the first empty base slot
  const handleAddBaseEffect = (effName: string, tier?: number) => {
    // Look for the first empty slot within maxBaseSlots
    const emptyIdx = baseRolls.slice(0, maxBaseSlots).findIndex((r) => !r || !r.effect);

    if (emptyIdx !== -1) {
      let chosenTier: number | '' = tier !== undefined ? tier : '';
      if (chosenTier === '' && currentBasePool) {
        const matchingEntries = currentBasePool.effects.filter((e) => e.effect === effName);
        if (matchingEntries.length === 1) {
          chosenTier = matchingEntries[0].tier;
        }
      }
      const next = [...baseRolls];
      next[emptyIdx] = { effect: effName, tier: chosenTier };
      setBaseRolls(next);
      return;
    }

    // If all slots are filled, but an existing slot matches effName and has no tier, set its tier
    if (tier !== undefined) {
      const unfilledTierIdx = baseRolls
        .slice(0, maxBaseSlots)
        .findIndex((r) => r && r.effect === effName && (r.tier === '' || r.tier === undefined));
      if (unfilledTierIdx !== -1) {
        const next = [...baseRolls];
        next[unfilledTierIdx] = { ...next[unfilledTierIdx], tier };
        setBaseRolls(next);
      }
    }
  };

  // Base effects evaluation via calc (by tier, so values follow the card level)
  const evaluatedBase = useMemo(() => {
    if (!calc || !effectiveBasePoolId) return [];
    return baseRolls.slice(0, maxBaseSlots).map((roll) => {
      if (!roll.effect || roll.tier === '') return null;
      return calc.baseByTier(effectiveBasePoolId, roll.effect, roll.tier, cardLevel);
    });
  }, [calc, effectiveBasePoolId, baseRolls, maxBaseSlots, cardLevel]);

  const filledBase = useMemo(
    () => evaluatedBase.filter((b): b is NonNullable<typeof b> => Boolean(b)),
    [evaluatedBase],
  );

  const areBaseSlotsLoaded = filledBase.length >= maxBaseSlots;
  const isBasePoolVisible = showBasePoolOverride !== null ? showBasePoolOverride : !areBaseSlotsLoaded;

  const baseVerdict = useMemo(() => {
    if (filledBase.length === 0) return null;
    const brush = BRUSH_CONFIG[cardQuality].name;
    const fixed = filledBase.every((b) => b.maxTier <= 1);
    const allHigh = filledBase.every((b) => b.tier >= b.maxTier - 1);
    const anyLow = filledBase.some((b) => b.tier === 1);
    const kind = fixed ? 'fixed' : allHigh ? 'high' : anyLow ? 'low' : 'mid';

    const style = {
      fixed: 'bg-amber-500/10 border-amber-500/40 text-amber-100',
      high: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
      low: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
      mid: 'bg-blue-500/15 border-blue-500/40 text-blue-200',
    }[kind];

    const badgeStyle = {
      fixed: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      high: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      low: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      mid: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    }[kind];

    const shortLabel = {
      fixed: 'Fixed Elder Base',
      high: 'High-Tier Base',
      low: 'Weak Base Roll',
      mid: 'Decent Base',
    }[kind];

    const title = {
      fixed: 'Fixed Elder Base Effects',
      high: 'High-Tier Base (Worth Upgrading & Sketching)',
      low: 'Weak Base Roll',
      mid: 'Decent Base',
    }[kind];

    const body = {
      fixed:
        "Elder visages always roll the same base values, so there's nothing better to farm for. This card's quality comes down to its resketch slots.",
      high: `Your base effects rolled in the top tiers for this pool. This copy is a good home for your ${brush}es.`,
      low: `At least one base effect is Tier 1 — 40% of drops roll this low. Base effects can't be resketched, so if another copy is likely to drop, consider waiting before spending ${brush}es on this one.`,
      mid: `Middle-tier base rolls. Usable, but a higher-tier copy would be a better long-term home for your ${brush}es.`,
    }[kind];

    return { kind, style, badgeStyle, shortLabel, title, body };
  }, [filledBase, cardQuality]);

  // Filled resketch slots (only the unlocked ones count)
  const filledSlotCount = useMemo(
    () => resketchSlots.slice(0, unlockedResketchCount).filter((s) => s.effect && s.value !== '').length,
    [resketchSlots, unlockedResketchCount],
  );
  const allSlotsFilled = unlockedResketchCount > 0 && filledSlotCount === unlockedResketchCount;

  // Best possible value of each stat at this card rarity (a 100% roll)
  const statMax = useMemo(() => {
    const m: Record<string, number> = {};
    currentQualityResketch?.pool.forEach((p) =>
      p.values.forEach((v) => {
        const n = parseFloat(v);
        if (!(m[p.effect] >= n)) m[p.effect] = n;
      }),
    );
    return m;
  }, [currentQualityResketch]);

  /**
   * Convert % shares into per-point multipliers so the card score runs 0–100:
   * slot points = (value / best value) × (share / largest share) × (100 / unlocked slots).
   * A perfect card (every slot the best roll of your top stat) scores 100.
   */
  const scoreWeights = useMemo(() => {
    const n = Math.max(1, unlockedResketchCount);
    const maxShare = Math.max(0, ...Object.values(customWeights));
    const w: Record<string, number> = {};
    if (maxShare <= 0) return w;
    for (const [eff, share] of Object.entries(customWeights)) {
      if (share > 0 && statMax[eff] > 0) w[eff] = (100 * share) / (maxShare * statMax[eff] * n);
    }
    return w;
  }, [customWeights, statMax, unlockedResketchCount]);

  const isCustomWeights = activePreset === 'custom';
  const activePresetElement = elementFromPresetId(activePreset);
  const activePresetLabel = activePresetElement
    ? `${activePresetElement} adventurer`
    : WEIGHT_PRESETS.find((p) => p.id === activePreset)?.label;

  // Resketch analysis calculation
  const resketchAnalysis = useMemo(() => {
    if (!calc || unlockedResketchCount === 0 || filledSlotCount === 0) return null;
    if (Object.keys(scoreWeights).length === 0) return null; // no stat has a share yet
    const slots = resketchSlots
      .slice(0, unlockedResketchCount)
      .filter((s) => s.effect && s.value !== '')
      .map((s) => ({ effect: s.effect, value: s.value as number }));

    return calc.analyseCard({
      quality: cardQuality,
      level: cardLevel,
      // A resketch rerolls every unlocked slot, so compare against a full set of that size.
      unlockedSlots: unlockedResketchCount,
      slots,
      weights: scoreWeights,
    });
  }, [calc, cardQuality, cardLevel, resketchSlots, unlockedResketchCount, filledSlotCount, scoreWeights]);

  // List of distinct effects in resketch pool for the current quality
  const possibleResketchEffects = useMemo(() => {
    if (!currentQualityResketch) return [];
    return Array.from(new Set(currentQualityResketch.pool.map((p) => p.effect)));
  }, [currentQualityResketch]);

  // Helper to get available values for a chosen effect
  const getValuesForEffect = (effectName: string) => {
    if (!currentQualityResketch || !effectName) return [];
    const entries = currentQualityResketch.pool.filter((p) => p.effect === effectName);
    const seen = new Set<string>();
    const vals: Array<{ value: number; rollQuality: string; raw: string }> = [];
    entries.forEach((e) => {
      e.values.forEach((v) => {
        const key = `${e.roll_quality}:${v}`;
        if (seen.has(key)) return; // some pools repeat a value (e.g. Defense 6/6/6)
        seen.add(key);
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
  const getSlotRollQuality = (effect: string, value: number | ''): RollRarity | null => {
    if (!effect || value === '' || !currentQualityResketch) return null;
    const entries = currentQualityResketch.pool.filter((p) => p.effect === effect);
    for (const entry of entries) {
      for (const v of entry.values) {
        if (Math.abs(parseFloat(v.replace('%', '')) - (value as number)) < 1e-4) {
          return entry.roll_quality as RollRarity;
        }
      }
    }
    return null;
  };

  // Overall live card score rating and rank
  const cardRating = useMemo(() => {
    if (resketchAnalysis) {
      const betterThan = resketchAnalysis.currentSetIsBetterThan;
      // Rank purely on the weighted score's percentile, so stats you don't value can't inflate it.
      const rank: RollRarity = betterThan >= 0.85 ? 'Superior' : betterThan >= 0.45 ? 'Epic' : 'Rare';
      const percentileTop = Math.max(0.1, 100 - betterThan * 100).toFixed(1);

      return {
        rank: rank as RollRarity | 'Unranked',
        scoreDisplay: `${resketchAnalysis.currentScore.toFixed(1)} / 100`,
        subText: allSlotsFilled
          ? `Top ${percentileTop}%`
          : `${filledSlotCount}/${unlockedResketchCount} slots · minimum`,
        theme: getRarityTheme(rank),
      };
    }

    if (filledBase.length > 0) {
      const rarities = filledBase.map((b) => baseTierRarity(b.tier, b.maxTier));
      // A card's base is only as good as its weakest roll
      const rank = rarities.reduce((lo, r) => (RARITY_ORDER[r] < RARITY_ORDER[lo] ? r : lo), rarities[0]);
      const fixed = filledBase.every((b) => b.maxTier <= 1);
      return {
        rank: rank as RollRarity | 'Unranked',
        scoreDisplay: 'Base only',
        subText: fixed ? 'Fixed elder base' : filledBase.map((b) => `T${b.tier}/${b.maxTier}`).join(' + '),
        theme: getRarityTheme(rank),
      };
    }

    return {
      rank: 'Unranked' as RollRarity | 'Unranked',
      scoreDisplay: '—',
      subText: 'Enter rolls below',
      theme: getRarityTheme(null),
    };
  }, [resketchAnalysis, filledBase, allSlotsFilled, filledSlotCount, unlockedResketchCount]);

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
    setBaseRolls(EMPTY_BASE_ROLLS());
    setResketchSlots(EMPTY_SLOTS());
    setCardLevel(1);
    setCardQuality('Superior');
    setActivePreset('physical');
    const found = WEIGHT_PRESETS.find((p) => p.id === 'physical');
    if (found) {
      setCustomWeights(found.weights);
    }
    setWearerId('');
    setHunterElement('None');
  };

  // ── Card Power (resketch effects only; base effects never add power) ──
  const powerCard = useMemo(
    () => ({
      quality: cardQuality,
      level: cardLevel,
      randomEffects: resketchSlots
        .slice(0, unlockedResketchCount)
        .filter((sl) => sl.effect && sl.value !== '')
        .map((sl) => ({ effect: sl.effect, value: sl.value as number })),
    }),
    [cardQuality, cardLevel, resketchSlots, unlockedResketchCount],
  );
  const powerResult = useMemo(() => visagePower(powerCard, wearerElement), [powerCard, wearerElement]);
  const powerByElement = useMemo(() => visagePowerByElement(powerCard), [powerCard]);

  const scrollToPowerHelp = () => {
    document.getElementById('power-explained')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const inkConfig = getInkConfig(selectedInk);
  const scoreText = (n: number) => (Math.round(n * 10) / 10).toString();

  if (isLoadingVisages || isLoadingCalc) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-mh-slate-400 gap-3">
        <Sparkles className="animate-spin text-amber-400" size={32} />
        <p className="font-display text-sm tracking-wide">Loading Visage Calculator Data…</p>
      </div>
    );
  }

  return (
    <div data-rarity-theme={galleryTheme} className="section-theme space-y-6 max-w-7xl mx-auto pb-12 text-white">
      {/* ── Top Header Bar (Sticky floating on scroll) ── */}
      <div
        className={cn(
          'sticky top-2 sm:top-3 z-30 transition-all duration-300 border border-white/10 shadow-2xl backdrop-blur-md',
          isScrolled
            ? 'rounded-xl sm:rounded-2xl px-3 py-1.5 sm:py-2 bg-mh-slate-900/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3'
            : 'mho-panel mho-card-rarity rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-mh-slate-900/95',
        )}
      >
        {isScrolled ? (
          <Link
            to="/gallery"
            title="Back to Gallery"
            aria-label="Back to Gallery"
            className="flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-mh-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
        ) : (
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
        )}

        {/* Quick poll: in line with the floating header's buttons once the visitor scrolls.
            Phones are too narrow for everything on one line, so there it sits in a slim row underneath. */}
        {isScrolled && (
          <PollPrompt pollId="visage-card-save" className="order-last basis-full sm:order-none sm:basis-auto min-w-0 sm:flex-1" />
        )}

        {/* Live Card Score Rating Badge & Clear Button */}
        {isScrolled ? (
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Minimized Card Roll Rating Word Badge */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs uppercase transition-all duration-300 shadow-sm',
                cardRating.theme.bg,
                cardRating.theme.border,
                cardRating.theme.glow,
              )}
              title={`Card Roll Rating: ${cardRating.rank}${cardRating.scoreDisplay !== '—' ? ` (${cardRating.scoreDisplay})` : ''}`}
            >
              <span className={cn('font-display tracking-wide', cardRating.theme.text)}>
                {cardRating.rank}
              </span>
              {cardRating.scoreDisplay !== '—' && (
                <span className="text-[11px] font-mono text-white/90">({cardRating.scoreDisplay})</span>
              )}
            </div>

            {/* Minimized Card Power */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all duration-300',
                galleryThemeStyle.badgeBorder,
                galleryThemeStyle.badgeBg,
                galleryThemeStyle.glow,
              )}
              title={`Card Power: ${powerResult.power}${wearerLabel ? ` (${wearerLabel})` : ''}`}
            >
              <span className={cn('text-[10px] uppercase font-bold tracking-wider', galleryThemeStyle.labelColor)}>
                Power
              </span>
              <span className="font-black text-white text-sm">{powerResult.power}</span>
            </div>

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear all inputs and reset to default"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-xs font-semibold text-red-300 hover:text-red-200 transition-colors"
            >
              <RotateCcw size={12} />
              <span className="text-[11px]">Clear</span>
            </button>
          </div>
        ) : (
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

            {/* Card Power */}
            <div
              className={cn(
                'flex items-center gap-3 px-3.5 py-1.5 rounded-xl border transition-all duration-300',
                galleryThemeStyle.badgeBorder,
                galleryThemeStyle.badgeBg,
              )}
            >
              <div className="flex flex-col">
                <span className={cn('text-[9px] uppercase font-bold tracking-wider', galleryThemeStyle.labelColor)}>
                  Card Power
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm sm:text-base font-mono font-black text-white">{powerResult.power}</span>
                  <span className="text-[10px] text-mh-slate-400 truncate max-w-[180px]" title={wearerLabel}>
                    {wearerLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={scrollToPowerHelp}
                className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                <HelpCircle size={13} />
                How is this calculated?
              </button>
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
        )}
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

            {/* Selection order toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/30 border border-white/10">
              {(
                [
                  { id: 'monster', label: 'Monster → Ink' },
                  { id: 'ink', label: 'Ink → Monster' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectionMode(m.id)}
                  className={cn(
                    'py-1.5 rounded-lg text-xs font-bold transition-all',
                    selectionMode === m.id
                      ? 'bg-mh-gold-500/20 text-mh-gold-300 border border-mh-gold-500/40'
                      : 'text-mh-slate-400 hover:text-white border border-transparent',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {(() => {
              const inkPicker = (inks: string[], label: string) => (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-mh-slate-300">{label}</label>
                  <div className="flex flex-wrap gap-2">
                    {inks.map((inkKey) => {
                      const cfg = getInkConfig(inkKey);
                      const isSelected = selectedInk === inkKey;
                      return (
                        <button
                          key={inkKey}
                          type="button"
                          onClick={() => handleInkPick(inkKey)}
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
              );

              const monsterPicker = (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-mh-slate-300 flex items-center justify-between">
                    <span>Select Monster</span>
                    <span className="text-[10px] text-mh-slate-500">
                      {monsterOptions.length} {selectionMode === 'ink' ? `with ${inkConfig.shortName}` : 'Available'}
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMonsterId}
                      onChange={(e) => handleMonsterChange(e.target.value)}
                      className="w-full bg-mh-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white appearance-none pr-8 focus:outline-none focus:border-mh-gold-400 cursor-pointer"
                    >
                      {monsterOptions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name.replace(/^Visage:\s*/, '')} ({v.monster_type === 'large' ? 'Large' : 'Small'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-mh-slate-400 pointer-events-none" />
                  </div>
                </div>
              );

              const cardInks = currentCard ? currentCard.ink_types.map(normInk) : [];
              return selectionMode === 'ink' ? (
                <>
                  {inkPicker(allInks, 'Select Ink')}
                  {monsterPicker}
                </>
              ) : (
                <>
                  {monsterPicker}
                  {cardInks.length > 0 && inkPicker(cardInks, 'Ink Variation')}
                </>
              );
            })()}

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
                      onClick={() => handleQualityChange(q)}
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
                      {cardRating.rank === 'Unranked' ? 'Unranked' : `${cardRating.rank} Roll`}
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
            <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-400 text-sm">✦</span>
                <h2 className="font-display text-sm font-bold tracking-wide uppercase text-white">
                  Base Effects Assessment
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-mh-slate-300">
                  {maxBaseSlots} Slot{maxBaseSlots > 1 ? 's' : ''} (Pool #{effectiveBasePoolId})
                </span>
                {areBaseSlotsLoaded && baseVerdict && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider border',
                      baseVerdict.badgeStyle,
                    )}
                  >
                    {baseVerdict.shortLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {areBaseSlotsLoaded && (
                  <button
                    type="button"
                    onClick={() => setShowBasePoolOverride((prev) => (prev === null ? true : !prev))}
                    className="text-[10px] font-semibold text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                  >
                    <span>{isBasePoolVisible ? 'Hide Possible Effects' : 'Show Possible Effects'}</span>
                    <ChevronDown size={11} className={cn('transition-transform duration-200', isBasePoolVisible && 'rotate-180')} />
                  </button>
                )}
                <span className="text-[11px] text-mh-slate-400 hidden sm:inline">
                  Evaluates if your initial drop tier is worth upgrading
                </span>
              </div>
            </div>

            {/* Possible Drop Pool Overview */}
            {isBasePoolVisible &&
              currentBasePool &&
              (() => {
                const effectNames = Array.from(new Set(currentBasePool.effects.map((e) => e.effect)));
                const tiers = Array.from(new Set(currentBasePool.effects.map((e) => e.tier))).sort((a, b) => a - b);
                const maxTier = tiers[tiers.length - 1];
                const isFixed = maxTier <= 1;
                const hasEmptyBaseSlot = baseRolls.slice(0, maxBaseSlots).some((r) => !r || !r.effect);
                return (
                  <div className="p-3 rounded-xl bg-mh-slate-900/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-mh-slate-300 flex-wrap">
                      <span>
                        Possible Base Effects — Pool #{currentBasePool.pool_id} ({cardQuality})
                      </span>
                      <span className="text-[10px] text-mh-slate-500 font-normal">
                        Values at Lv. {cardLevel}
                        {cardLevel < 10 ? ' · Lv. 10 below' : ''}
                      </span>
                    </div>
                    <p className="text-[10px] text-mh-slate-400 leading-relaxed">
                      {isFixed
                        ? 'Elder visage: each base slot picks one of these effects, and the value is fixed — there is no tier roll.'
                        : 'Each base slot rolls an effect, then a tier. The % in each cell is the chance of one base slot landing on exactly that effect and tier.'}{' '}
                      <span className="text-amber-300 font-medium">
                        Click any effect or tier box to quickly add it to an empty base slot below.
                      </span>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-separate border-spacing-1">
                        <thead>
                          <tr className="text-[10px] text-mh-slate-400">
                            <th className="text-left font-semibold px-1">Effect</th>
                            {tiers.map((t) => {
                              const theme = getRarityTheme(baseTierRarity(t, maxTier));
                              const tierChance = currentBasePool.effects.find((e) => e.tier === t)?.tier_chance;
                              return (
                                <th key={t} className="font-semibold px-1">
                                  <span className={theme.text}>{isFixed ? 'Fixed' : `Tier ${t}`}</span>
                                  {!isFixed && <span className="block font-mono font-normal text-mh-slate-500">{tierChance}</span>}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {effectNames.map((effName) => (
                            <tr key={effName}>
                              <td
                                onClick={() => handleAddBaseEffect(effName)}
                                className={cn(
                                  'px-1.5 py-1 align-middle rounded-lg transition-colors group/eff select-none',
                                  hasEmptyBaseSlot ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
                                )}
                                title={
                                  hasEmptyBaseSlot
                                    ? `Click to add ${effName} to empty base slot`
                                    : 'Base slots full (clear a slot below first)'
                                }
                              >
                                <div className="font-bold text-white group-hover/eff:text-amber-300 transition-colors flex items-center justify-between gap-1">
                                  <span>{effName}</span>
                                  {hasEmptyBaseSlot && (
                                    <Plus
                                      size={11}
                                      className="opacity-0 group-hover/eff:opacity-100 text-amber-400 transition-opacity shrink-0"
                                    />
                                  )}
                                </div>
                                <div className="text-[9px] text-mh-slate-500 font-mono">
                                  {currentBasePool.effects.find((e) => e.effect === effName)?.effect_chance} effect chance
                                </div>
                              </td>
                              {tiers.map((t) => {
                                const entry = currentBasePool.effects.find((e) => e.effect === effName && e.tier === t);
                                if (!entry) return <td key={t} />;
                                const theme = getRarityTheme(baseTierRarity(t, maxTier));
                                return (
                                  <td
                                    key={t}
                                    onClick={() => handleAddBaseEffect(effName, t)}
                                    className={cn(
                                      'p-1.5 rounded-lg border text-center transition-all select-none',
                                      theme.bg,
                                      theme.border,
                                      hasEmptyBaseSlot
                                        ? 'cursor-pointer hover:scale-[1.03] hover:ring-2 hover:ring-amber-400/60 hover:shadow-lg active:scale-95'
                                        : 'cursor-default',
                                    )}
                                    title={
                                      hasEmptyBaseSlot
                                        ? `Click to add ${effName} (${isFixed ? 'Fixed' : `Tier ${t}`}) to empty base slot`
                                        : 'Base slots full (clear a slot below first)'
                                    }
                                  >
                                    <div className={cn('font-mono font-bold', theme.text)}>
                                      {entry.values_by_level[cardLevel - 1] ?? entry.values_by_level[0]}
                                    </div>
                                    {cardLevel < 10 && (
                                      <div className="text-[9px] text-mh-slate-400 font-mono">
                                        Lv10 {entry.values_by_level[9]}
                                      </div>
                                    )}
                                    <div className="text-[9px] text-mh-slate-300 font-mono">{entry.overall_chance}</div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

            {/* Base Slots Input */}
            <div className="space-y-3">
              <p className="text-xs text-mh-slate-300">
                Enter the base effects rolled on your card (leave the second blank if your card only has one):
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: maxBaseSlots }).map((_, slotIdx) => {
                  const currentRoll = baseRolls[slotIdx] || { effect: '', tier: '' };
                  const evalResult = evaluatedBase[slotIdx];
                  const distinctEffects = currentBasePool ? Array.from(new Set(currentBasePool.effects.map((e) => e.effect))) : [];

                  // Available tiers for selected effect in this pool
                  const availableTiers = currentBasePool && currentRoll.effect
                    ? currentBasePool.effects.filter((e) => e.effect === currentRoll.effect).sort((a, b) => a.tier - b.tier)
                    : [];

                  const baseSlotRarity: RollRarity | null = evalResult
                    ? baseTierRarity(evalResult.tier, evalResult.maxTier)
                    : null;
                  const baseTheme = getRarityTheme(baseSlotRarity);
                  const isFixed = evalResult ? evalResult.maxTier <= 1 : false;

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
                        <div className="flex items-center gap-2">
                          <span className={baseTheme.text}>Base Slot #{slotIdx + 1}</span>
                          {currentRoll.effect && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...baseRolls];
                                next[slotIdx] = { effect: '', tier: '' };
                                setBaseRolls(next);
                              }}
                              className="text-[10px] text-mh-slate-400 hover:text-red-300 transition-colors flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10"
                              title="Clear this slot"
                            >
                              <X size={10} />
                              <span>Clear</span>
                            </button>
                          )}
                        </div>
                        {evalResult && (
                          <span
                            className={cn('text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase', baseTheme.badge)}
                          >
                            {isFixed
                              ? 'Fixed roll'
                              : `Tier ${evalResult.tier}/${evalResult.maxTier} (${evalResult.tierChance} chance)`}
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
                            next[slotIdx] = { effect: newEff, tier: '' };
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

                        {/* Dropdown for value (stored as tier, so it follows the card level) */}
                        <select
                          value={currentRoll.tier === '' ? '' : String(currentRoll.tier)}
                          disabled={!currentRoll.effect}
                          onChange={(e) => {
                            const next = [...baseRolls];
                            next[slotIdx] = {
                              ...next[slotIdx],
                              tier: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                            };
                            setBaseRolls(next);
                          }}
                          className="bg-mh-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer disabled:opacity-40"
                        >
                          <option value="">Select Value…</option>
                          {availableTiers.map((t) => {
                            const val = t.values_by_level[cardLevel - 1] || t.values_by_level[0];
                            return (
                              <option key={t.tier} value={t.tier}>
                                {availableTiers.length === 1 ? `${val} (fixed)` : `${val} — Tier ${t.tier} (${t.tier_chance})`}
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
                            <span className="text-mh-slate-400">Best Possible: </span>
                            <span className="font-mono font-bold text-amber-300">{evalResult.bestPossibleLevel10}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Base Verdict Banner */}
              {baseVerdict && (
                <div className={cn('p-3 rounded-xl border flex items-start gap-3 transition-colors', baseVerdict.style)}>
                  {baseVerdict.kind === 'high' || baseVerdict.kind === 'fixed' ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : baseVerdict.kind === 'low' ? (
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold">{baseVerdict.title}</p>
                    <p className="text-[11px] opacity-90 leading-relaxed">{baseVerdict.body}</p>
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

              <div className="flex flex-wrap items-center gap-1.5">
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

                {/* Who will wear the card: sets Power's element and, for adventurers, the weights */}
                <div ref={adventurerPickerRef} className="relative flex items-center gap-1.5 sm:ml-auto">
                  <span className="text-[11px] font-semibold text-mh-slate-400">For</span>
                  <button
                    type="button"
                    onClick={() => setShowAdventurerPicker((prev) => !prev)}
                    className={cn(
                      'flex items-center gap-2 bg-mh-slate-900 border rounded-xl px-2 py-1 text-xs transition-all cursor-pointer focus:outline-none',
                      showAdventurerPicker
                        ? 'border-amber-400/80 ring-2 ring-amber-400/20 bg-mh-slate-800'
                        : wearerId
                          ? 'border-amber-500/60 text-amber-200 hover:border-amber-400'
                          : 'border-white/15 text-mh-slate-300 hover:border-white/30',
                    )}
                    title={
                      wearer
                        ? wearer.is_default
                          ? 'Fated Adventurer (your Hunter)'
                          : `${wearer.name} · ${wearer.element_specialization || 'Neutral'}`
                        : 'No adventurer (base power)'
                    }
                  >
                    {wearer ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md overflow-hidden bg-mh-slate-950 border border-amber-500/40 flex items-center justify-center shrink-0">
                          {wearer.image ? (
                            <img src={wearer.image} alt={wearer.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={13} className="text-amber-400" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md border border-white/20 bg-white/5 flex items-center justify-center text-mh-slate-400 shrink-0">
                          <UserX size={13} />
                        </div>
                        <span className="text-[11px] text-mh-slate-400">None</span>
                      </div>
                    )}
                    <ChevronDown
                      size={11}
                      className={cn(
                        'text-mh-slate-400 transition-transform duration-200',
                        showAdventurerPicker && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* Adventurer Icon Popover */}
                  {showAdventurerPicker && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-mh-slate-900/95 border border-white/15 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-bold text-mh-slate-300">
                        <span>Select Adventurer</span>
                        {wearerId && (
                          <button
                            type="button"
                            onClick={() => {
                              handleWearerChange('');
                              setShowAdventurerPicker(false);
                            }}
                            className="text-[10px] text-red-300 hover:text-red-200 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-red-500/10 cursor-pointer"
                          >
                            <UserX size={11} />
                            <span>Clear</span>
                          </button>
                        )}
                      </div>

                      {/* Grid of character icons */}
                      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                        {/* None button */}
                        <button
                          type="button"
                          onClick={() => {
                            handleWearerChange('');
                            setShowAdventurerPicker(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 p-1.5 rounded-xl border transition-all text-left cursor-pointer',
                            !wearerId
                              ? 'border-amber-400/80 bg-amber-500/15 ring-1 ring-amber-400/40 text-amber-200'
                              : 'border-white/10 bg-white/5 hover:bg-white/10 text-mh-slate-300 hover:text-white',
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg border border-white/20 bg-black/40 flex items-center justify-center shrink-0">
                            <UserX size={16} className="text-mh-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold">No Adventurer</div>
                            <div className="text-[10px] text-mh-slate-400">Evaluate base universal power</div>
                          </div>
                          {!wearerId && <Check size={14} className="text-amber-400 shrink-0" />}
                        </button>

                        {/* Owned Adventurers Icon Grid */}
                        {adventurerGroups.owned.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-mh-slate-400 uppercase tracking-wider block px-1">
                              Owned Characters
                            </span>
                            <div className="grid grid-cols-5 gap-1.5">
                              {adventurerGroups.owned.map((adv) => {
                                const isSelected = wearerId === adv.id;
                                const el = toPowerElement(adv.element_specialization);
                                return (
                                  <button
                                    key={adv.id}
                                    type="button"
                                    onClick={() => {
                                      handleWearerChange(adv.id);
                                      setShowAdventurerPicker(false);
                                    }}
                                    title={
                                      adv.is_default
                                        ? 'Fated Adventurer (your Hunter)'
                                        : `${adv.name}${el ? ` · ${el}` : ''}${adv.rarity ? ` (${adv.rarity})` : ''}`
                                    }
                                    className={cn(
                                      'relative group/icon p-1 rounded-xl border transition-all flex flex-col items-center cursor-pointer',
                                      isSelected
                                        ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/40'
                                        : 'border-white/10 bg-black/40 hover:bg-white/10 hover:border-white/20',
                                    )}
                                  >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-mh-slate-950 border border-white/10 flex items-center justify-center">
                                      {adv.image ? (
                                        <img
                                          src={adv.image}
                                          alt={adv.name}
                                          className="w-full h-full object-cover group-hover/icon:scale-105 transition-transform"
                                        />
                                      ) : (
                                        <span className="text-[10px] font-bold text-mh-slate-400">
                                          {adv.name.slice(0, 3)}
                                        </span>
                                      )}
                                    </div>
                                    {adv.is_default && (
                                      <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[8px] font-extrabold px-1 rounded-full shadow">
                                        YOU
                                      </span>
                                    )}
                                    {isSelected && !adv.is_default && (
                                      <span className="absolute -top-1 -right-1 bg-amber-400 text-black rounded-full p-0.5 shadow">
                                        <Check size={8} strokeWidth={3} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Not Owned Adventurers Icon Grid */}
                        {adventurerGroups.notOwned.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-white/10">
                            <span className="text-[10px] font-bold text-mh-slate-500 uppercase tracking-wider block px-1">
                              Other Characters
                            </span>
                            <div className="grid grid-cols-5 gap-1.5">
                              {adventurerGroups.notOwned.map((adv) => {
                                const isSelected = wearerId === adv.id;
                                const el = toPowerElement(adv.element_specialization);
                                return (
                                  <button
                                    key={adv.id}
                                    type="button"
                                    onClick={() => {
                                      handleWearerChange(adv.id);
                                      setShowAdventurerPicker(false);
                                    }}
                                    title={`${adv.name}${el ? ` · ${el}` : ''}${adv.rarity ? ` (${adv.rarity})` : ''} (Not owned)`}
                                    className={cn(
                                      'relative group/icon p-1 rounded-xl border transition-all flex flex-col items-center opacity-70 hover:opacity-100 cursor-pointer',
                                      isSelected
                                        ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/40 opacity-100'
                                        : 'border-white/10 bg-black/40 hover:bg-white/10 hover:border-white/20',
                                    )}
                                  >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-mh-slate-950 border border-white/10 flex items-center justify-center">
                                      {adv.image ? (
                                        <img
                                          src={adv.image}
                                          alt={adv.name}
                                          className="w-full h-full object-cover group-hover/icon:scale-105 transition-transform"
                                        />
                                      ) : (
                                        <span className="text-[10px] font-bold text-mh-slate-400">
                                          {adv.name.slice(0, 3)}
                                        </span>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <span className="absolute -top-1 -right-1 bg-amber-400 text-black rounded-full p-0.5 shadow">
                                        <Check size={8} strokeWidth={3} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {activePresetElement && (
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Weights set for a {activePresetElement} adventurer: {activePresetElement} Attack 85%, Damage, Defense
                  and Physical Attack 5% each. Other elemental attacks are Inactive on them and don't count.
                </p>
              )}
              {wearerIsHunter && (
                <p className="text-[11px] text-sky-200/90 leading-relaxed">
                  Your Hunter's useful stats depend on your weapon, so set the weights to match it below.
                </p>
              )}

              <p className="text-[10px] text-mh-slate-500 leading-relaxed">
                Weights split 100% across the stats you want. Each roll is scored against the best possible roll of that
                stat on a {cardQuality} card, so a perfect card scores 100. Players using the same preset get scores
                they can compare directly. Shares are a guide, not exact damage maths.
              </p>

              {/* Custom Weight Sliders (if opened) */}
              {showWeightSliders &&
                (() => {
                  const total = totalShare(customWeights);
                  return (
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        <span className="text-mh-slate-400">
                          Split 100% across the stats you want (0% = not counted). <b>0</b> clears a stat,{' '}
                          <b>Max</b> gives it whatever is left.
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePreset('custom');
                              setCustomWeights({});
                            }}
                            disabled={total === 0}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-white/5 border-white/15 text-mh-slate-300 hover:bg-white/10 disabled:opacity-30"
                          >
                            Zero all
                          </button>
                          <span
                          className={cn(
                            'font-mono font-bold px-2 py-0.5 rounded',
                            total === 100 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300',
                          )}
                        >
                          {total}% / 100%
                        </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={cn('h-full transition-all', total === 100 ? 'bg-emerald-400' : 'bg-amber-400')}
                          style={{ width: `${Math.min(100, total)}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {possibleResketchEffects.map((eff) => {
                          const current = customWeights[eff] ?? 0;
                          const maxForThis = 100 - (total - current);
                          const setShare = (val: number) => {
                            setActivePreset('custom');
                            setCustomWeights({ ...customWeights, [eff]: val });
                          };
                          const btn =
                            'px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
                          return (
                            <div
                              key={eff}
                              className={cn(
                                'flex items-center justify-between gap-2 p-1.5 rounded',
                                current > 0 ? 'bg-amber-500/10' : 'bg-white/5',
                              )}
                            >
                              <span className={cn('truncate', current > 0 ? 'text-white' : 'text-mh-slate-400')}>{eff}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setShare(0)}
                                  disabled={current === 0}
                                  title={`Set ${eff} to 0% (not counted)`}
                                  className={cn(btn, 'bg-white/5 border-white/15 text-mh-slate-300 hover:bg-white/10')}
                                >
                                  0
                                </button>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max={maxForThis}
                                  value={current}
                                  onChange={(e) => {
                                    const raw = Math.round(parseFloat(e.target.value) || 0);
                                    const val = Math.max(0, Math.min(raw, maxForThis));
                                    setActivePreset('custom');
                                    setCustomWeights({ ...customWeights, [eff]: val });
                                  }}
                                  className="w-14 bg-mh-slate-900 border border-white/20 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-300"
                                />
                                <span className="text-mh-slate-500 font-mono">%</span>
                                <button
                                  type="button"
                                  onClick={() => setShare(maxForThis)}
                                  disabled={current === maxForThis}
                                  title={`Give ${eff} the remaining ${100 - total}%`}
                                  className={cn(
                                    btn,
                                    'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25',
                                  )}
                                >
                                  Max
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {total !== 100 && total > 0 && (
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-amber-200">
                          <span>{100 - total}% unallocated.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePreset('custom');
                              setCustomWeights(balanceTo100(customWeights));
                            }}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 font-semibold"
                          >
                            Scale to 100%
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                  const slotFilled = isUnlocked && Boolean(slotData.effect) && slotData.value !== '';
                  const slotDesc = slotFilled && calc ? calc.describeSlot(cardQuality, slotData.effect, slotData.value) : null;
                  const slotWeight = customWeights[slotData.effect] ?? 0;
                  const slotPoints = slotFilled ? (scoreWeights[slotData.effect] ?? 0) * (slotData.value as number) : null;
                  const slotRollPct =
                    slotFilled && statMax[slotData.effect] ? ((slotData.value as number) / statMax[slotData.effect]) * 100 : null;

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

                          {/* Points this slot adds to the set score */}
                          {slotPoints !== null && (
                            <div
                              className={cn(
                                'text-[10px] font-mono font-bold text-center rounded px-1 py-0.5',
                                slotWeight > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-mh-slate-500',
                              )}
                              title={
                                slotWeight > 0
                                  ? `Roll is ${Math.round(slotRollPct ?? 0)}% of the best ${slotData.effect}; ${slotData.effect} has a ${slotWeight}% share. Each slot can add up to ${scoreText(100 / Math.max(1, unlockedResketchCount))} pts.`
                                  : `${slotData.effect} has a 0% share with the current weights, so it adds nothing to the score`
                              }
                            >
                              {slotWeight > 0
                                ? `+${scoreText(slotPoints)} pts · ${Math.round(slotRollPct ?? 0)}% roll`
                                : '0 pts · not counted'}
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
                  onClick={() => setResketchSlots(EMPTY_SLOTS())}
                  className="flex items-center gap-1 text-[11px] text-mh-slate-400 hover:text-white transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset Slots
                </button>
              </div>
            </div>

            {/* ── What the score counts ── */}
            {resketchAnalysis &&
              (() => {
                const ignored = Array.from(
                  new Set(
                    resketchSlots
                      .slice(0, unlockedResketchCount)
                      .filter((s) => s.effect && s.value !== '' && !(customWeights[s.effect] > 0))
                      .map((s) => s.effect),
                  ),
                );
                const presetLabel = activePresetLabel;
                return (
                  <div className="space-y-2">
                    {ignored.length > 0 && (
                      <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/40 text-amber-100 flex items-start gap-2.5 text-[11px] leading-relaxed">
                        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <p>
                          <span className="font-bold">{ignored.join(', ')}</span>{' '}
                          {ignored.length > 1 ? "aren't" : "isn't"} counted with{' '}
                          {presetLabel ? `the ${presetLabel} preset` : 'your custom weights'}, so changing{' '}
                          {ignored.length > 1 ? 'those values' : 'that value'} won't move the score or odds. Pick another
                          preset or use Customize Weights if you want {ignored.length > 1 ? 'them' : 'it'} counted.
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-mh-slate-500 leading-relaxed">
                      The score, percentile and odds below only use your resketch slots. Base effects can't be changed by a
                      resketch, so they're rated separately in Base Effects Assessment above.
                    </p>
                  </div>
                );
              })()}

            {/* ── Calculation Results Dashboard ── */}
            {unlockedResketchCount === 0 ? (
              <div className="p-6 rounded-xl bg-black/30 border border-white/5 text-center text-xs text-mh-slate-500 space-y-1">
                <HelpCircle size={20} className="mx-auto text-mh-slate-600 mb-1" />
                <p>Resketch slots unlock from card Lv. 2. Raise the card level above to evaluate slots.</p>
              </div>
            ) : totalShare(customWeights) === 0 ? (
              <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-200 space-y-1">
                <Sliders size={20} className="mx-auto text-amber-400 mb-1" />
                <p>Give at least one stat a share in Customize Weights (or pick a preset) to score this card.</p>
              </div>
            ) : !resketchAnalysis ? (
              <div className="p-6 rounded-xl bg-black/30 border border-white/5 text-center text-xs text-mh-slate-500 space-y-1">
                <HelpCircle size={20} className="mx-auto text-mh-slate-600 mb-1" />
                <p>
                  Enter the effect and value in each of your {unlockedResketchCount} unlocked slot
                  {unlockedResketchCount > 1 ? 's' : ''} to calculate resketch odds.
                </p>
              </div>
            ) : !allSlotsFilled ? (
              <div className="p-4 rounded-xl border bg-sky-950/40 border-sky-500/40 text-sky-100 flex items-start gap-3">
                <Info size={20} className="shrink-0 mt-0.5 text-sky-300" />
                <div className="space-y-1 text-xs">
                  <p className="font-display font-bold text-sm tracking-wide">
                    Fill all {unlockedResketchCount} unlocked slots for a reroll verdict ({filledSlotCount}/
                    {unlockedResketchCount} entered)
                  </p>
                  <p className="opacity-90 leading-relaxed text-[11px]">
                    A resketch rerolls every unlocked slot at once, so the odds compare your whole set against a new
                    full set. Blank slots count as 0, as if they held a stat you don't want, so your current{' '}
                    <span className="font-mono font-bold">{scoreText(resketchAnalysis.currentScore)} / 100</span> is a
                    minimum and your card would look worse than it really is. Enter the stats you actually have, even
                    ones you don't want.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Metric 1: Current Score */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-mh-slate-400 tracking-wider">
                      Current Set Score
                    </span>
                    <div className="font-mono text-2xl font-black text-white">
                      {scoreText(resketchAnalysis.currentScore)}
                      <span className="text-sm text-mh-slate-500 font-bold"> / 100</span>
                    </div>
                    <span className={cn('text-[10px]', isCustomWeights ? 'text-amber-300' : 'text-mh-slate-500')}>
                      {isCustomWeights
                        ? 'Custom weights: only comparable with the same weights'
                        : `${activePresetLabel} standard: comparable with other players`}
                    </span>
                  </div>

                  {/* Metric 2: Percentile */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-mh-slate-400 tracking-wider">
                      Percentile Rank
                    </span>
                    <div className="font-mono text-2xl font-black text-[#FFD700]">
                      {pct(resketchAnalysis.currentSetIsBetterThan, 1)}
                    </div>
                    <span className="text-[10px] text-mh-slate-400">Of possible sets score lower</span>
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
                        src={BRUSH_CONFIG[cardQuality].icon}
                        alt={resketchAnalysis.costPerResketch.item}
                        className="w-5 h-5 object-contain shrink-0"
                      />
                      <span className="text-amber-300">
                        {resketchAnalysis.costPerResketch.count}x {resketchAnalysis.costPerResketch.item}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-mh-slate-300 font-mono">
                      <img src={ZENNY_ICON} alt="Zenny" className="w-4 h-4 object-contain shrink-0" />
                      <span>{resketchAnalysis.costPerResketch.zenny.toLocaleString()} Zenny</span>
                    </div>
                  </div>
                </div>

                {/* ── Actionable Verdict Banner ── */}
                {(() => {
                  const p = resketchAnalysis.chanceBetterPerResketch;
                  const top = Math.max(0.1, 100 - resketchAnalysis.currentSetIsBetterThan * 100).toFixed(1);
                  const attempts = resketchAnalysis.expectedResketches.toFixed(0);
                  const brushes = resketchAnalysis.expectedCost?.items.toLocaleString();
                  const brushName = resketchAnalysis.costPerResketch.item;
                  const verdict =
                    p < 0.01
                      ? {
                          style:
                            'bg-gradient-to-r from-amber-950/60 to-amber-900/40 border-amber-400/60 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
                          title: '🏆 God Roll — Do Not Resketch!',
                          body: `Top ${top}% of all possible sets. Fewer than 1 in 100 resketches would beat it.`,
                        }
                      : p < 0.05
                        ? {
                            style:
                              'bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border-emerald-500/50 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                            title: '💎 Excellent Set — Keep It',
                            body: `Top ${top}% of possible sets. Only ${pct(p)} of resketches beat it — about ${attempts} attempts (~${brushes} ${brushName}es) on average. Not worth the materials.`,
                          }
                        : p <= 0.2
                          ? {
                              style: 'bg-blue-950/50 border-blue-500/40 text-blue-100',
                              title: '🛡️ Strong Set — Recommended to Keep',
                              body: `Only ${pct(p)} of resketches beat this score — about ${attempts} attempts (~${brushes} ${brushName}es) on average. Keep it unless you're min-maxing with spare materials.`,
                            }
                          : p <= 0.4
                            ? {
                                style: 'bg-purple-950/50 border-purple-500/40 text-purple-100',
                                title: '⚖️ Decent Set — Reroll Only with Surplus Materials',
                                body: `${pct(p)} chance a resketch beats this, around ${attempts} attempts on average. Only reroll if you have materials to spare.`,
                              }
                            : {
                                style:
                                  'bg-amber-950/50 border-amber-500/40 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                                title: '⚡ Improvement Likely — But Mind the Cost',
                                body: `${pct(p)} of resketches score higher than this set. Brushes and Zenny are very hard to come by, so spend them on your main cards first.`,
                              };
                  return (
                    <div className={cn('p-4 rounded-xl border flex items-start gap-3 shadow-lg', verdict.style)}>
                      <TrendingUp size={22} className="shrink-0 mt-0.5 text-amber-400" />
                      <div className="space-y-1 text-xs">
                        <span className="font-display font-bold text-sm tracking-wide">{verdict.title}</span>
                        <p className="opacity-90 leading-relaxed text-[11px]">{verdict.body}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CARD POWER: HOW IT'S CALCULATED
         ══════════════════════════════════════════════════════ */}
      <section
        id="power-explained"
        className="mho-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-5 shadow-xl scroll-mt-24"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[#FFD700] text-sm">❖</span>
            <h2 className="font-display text-sm font-bold tracking-wide uppercase text-white">
              Card Power: how it's calculated
            </h2>
          </div>
          <span className="text-[10px] text-mh-slate-500 font-mono">
            Game data 1.0.9.4 · checked against 12 cards read in game
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 leading-relaxed">
          <span className="font-bold">Power = level points + points from each resketch effect</span>, added up and then
          rounded down. The two base effects at the top of the card never add power. The same rules apply to every
          visage, so only the card and the element of whoever wears it matter.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* What changes power */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400">What changes a card's power</h3>
            <div className="rounded-xl border border-white/10 overflow-hidden text-xs">
              {(
                [
                  {
                    what: 'Card rarity & level',
                    how: '+45 to +300',
                    tone: 'gold',
                    note: 'The biggest part. Every level adds more, and Superior cards start highest.',
                  },
                  { what: 'Physical Attack +N', how: 'N × 1', tone: 'slate', note: 'Always counts, whoever wears the card.' },
                  {
                    what: 'Fire / Water / Ice / Thunder / Dragon Attack +N',
                    how: 'N × 2 or 0',
                    tone: 'green',
                    note: "Doubled if it matches the wearer's element. Otherwise it's Inactive and adds nothing.",
                  },
                  { what: 'Damage %', how: 'points × 1.5', tone: 'amber', note: 'Points from the value table below.' },
                  {
                    what: 'Elemental Critical Damage %',
                    how: 'points × 1.5',
                    tone: 'amber',
                    note: 'Only × 1 on a Hunter with a non-elemental weapon (shown as Inactive but still counts).',
                  },
                  { what: 'Defense', how: 'points × 1', tone: 'slate', note: 'Points from the value table below.' },
                  { what: 'Base effects (top two)', how: '0', tone: 'red', note: 'Never add power.' },
                ] as const
              ).map((row, i) => (
                <div
                  key={row.what}
                  className={cn('grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-3 py-2', i > 0 && 'border-t border-white/5')}
                >
                  <span className="font-semibold text-white">{row.what}</span>
                  <span
                    className={cn(
                      'row-span-2 self-center font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border whitespace-nowrap',
                      row.tone === 'gold' && 'bg-amber-500/15 border-amber-500/40 text-amber-300',
                      row.tone === 'green' && 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
                      row.tone === 'amber' && 'bg-orange-500/15 border-orange-500/40 text-orange-300',
                      row.tone === 'slate' && 'bg-white/5 border-white/15 text-mh-slate-200',
                      row.tone === 'red' && 'bg-red-500/10 border-red-500/30 text-red-300',
                    )}
                  >
                    {row.how}
                  </span>
                  <span className="text-[11px] text-mh-slate-400 leading-snug">{row.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400 flex flex-wrap items-baseline gap-x-2">
              <span>Your card right now</span>
              <span className="text-[10px] normal-case tracking-normal font-normal text-mh-slate-400">{wearerLabel}</span>
            </h3>
            <div className="rounded-xl border border-white/10 overflow-hidden text-xs">
              {powerResult.breakdown.map((row, i) => {
                const inactive = row.note === 'Inactive' || row.note === 'unknown value';
                const chip =
                  i === 0
                    ? 'level points'
                    : row.note === 'always'
                      ? '× 1'
                      : row.note === 'matches element ×2'
                        ? '× 2 matches element'
                        : row.note === '×1.5'
                          ? `${Math.round(row.points / 1.5)} × 1.5`
                          : row.note === 'Inactive (non-elemental weapon) ×1'
                            ? '× 1 non-elemental weapon'
                            : row.note === 'Inactive'
                              ? 'Inactive: element not matched'
                              : row.note === 'unknown value'
                                ? 'value not in table'
                                : '× 1';
                return (
                  <div
                    key={`${row.part}-${i}`}
                    className={cn('flex items-center gap-2 px-3 py-1.5', i > 0 && 'border-t border-white/5', inactive && 'opacity-60')}
                  >
                    <span className="flex-1 text-mh-slate-200 truncate">{row.part}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded',
                        row.note === 'matches element ×2'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : inactive
                            ? 'bg-red-500/10 text-red-300'
                            : 'bg-white/5 text-mh-slate-400',
                      )}
                    >
                      {chip}
                    </span>
                    <span className="w-12 text-right font-mono font-bold text-white">
                      {Number.isInteger(row.points) ? row.points : row.points.toFixed(1)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-500/30 bg-amber-500/10">
                <span className="flex-1 font-bold text-amber-200">Power (rounded down)</span>
                <span className="font-mono font-black text-amber-300 text-sm">{powerResult.power}</span>
              </div>
            </div>
            {powerCard.randomEffects.length === 0 && (
              <p className="text-[11px] text-mh-slate-500">
                Enter your resketch slots above to see what each one adds.
              </p>
            )}

            {/* Same card on each element */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-mh-slate-300">The same card worn by each element</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'base', label: 'No match', el: null },
                    ...POWER_ELEMENTS.map((el) => ({ key: el, label: el, el: el as WearerElement })),
                    { key: 'None', label: 'Hunter, non-elemental', el: 'None' as WearerElement },
                  ] as Array<{ key: keyof typeof powerByElement; label: string; el: WearerElement }>
                ).map((opt) => {
                  const value = powerByElement[opt.key];
                  const best = Math.max(...POWER_ELEMENTS.map((el) => powerByElement[el]));
                  const isCurrent = opt.el === wearerElement;
                  const isBest = opt.el !== null && opt.el !== 'None' && value === best && best > powerByElement.base;
                  return (
                    <span
                      key={opt.key}
                      className={cn(
                        'px-2 py-1 rounded-lg border text-[11px] font-mono',
                        isCurrent
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                          : isBest
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                            : 'bg-white/5 border-white/10 text-mh-slate-300',
                      )}
                      title={isCurrent ? 'Current wearer' : isBest ? 'Highest power for this card' : undefined}
                    >
                      {opt.label} <span className="font-bold text-white">{value}</span>
                      {isBest && ' ★'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Level points */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-mh-gold-400">Level points by rarity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono border-separate border-spacing-0.5">
              <thead>
                <tr className="text-mh-slate-500">
                  <th className="text-left font-semibold px-1.5">Rarity</th>
                  {Array.from({ length: 10 }, (_, i) => (
                    <th key={i} className={cn('font-semibold px-1', i + 1 === cardLevel && 'text-amber-300')}>
                      Lv {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['Superior', 'Epic', 'Rare'] as const).map((q) => {
                  const theme = getRarityTheme(q);
                  return (
                    <tr key={q}>
                      <td className={cn('px-1.5 font-sans font-bold', theme.text)}>{q}</td>
                      {LEVEL_POINTS[q].map((pts, i) => {
                        const current = q === cardQuality && i + 1 === cardLevel;
                        return (
                          <td
                            key={i}
                            className={cn(
                              'text-center rounded px-1 py-1',
                              current ? 'bg-amber-500/25 text-amber-200 font-black ring-1 ring-amber-400/70' : 'bg-white/5 text-mh-slate-300',
                            )}
                          >
                            {pts}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Value → points table for the current rarity */}
        <details className="group rounded-xl border border-white/10 bg-black/20">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-mh-slate-200 flex items-center justify-between">
            <span>Points for Damage, Elemental Critical Damage and Defense on a {cardQuality} card</span>
            <ChevronDown size={14} className="text-mh-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-3 pb-3 space-y-2">
            {Object.entries(EFFECT_POINTS[cardQuality]).map(([effect, table]) => (
              <div key={effect} className="space-y-1">
                <div className="text-[11px] font-bold text-white">
                  {effect}{' '}
                  <span className="font-normal text-mh-slate-400">
                    {effect === 'Defense' ? '(× 1)' : '(× 1.5 on the card, these are the points before it)'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(table).map(([value, pts]) => {
                    const onCard = powerCard.randomEffects.some((fx) => fx.effect === effect && String(fx.value) === value);
                    return (
                      <span
                        key={value}
                        className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                          onCard ? 'bg-amber-500/20 border-amber-500/60 text-amber-200' : 'bg-white/5 border-white/10 text-mh-slate-300',
                        )}
                      >
                        {effect === 'Defense' ? value : `${value}%`} → {pts}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-[10px] text-mh-slate-500">
              Physical and elemental Attack need no table: their points are the value shown on the card.
            </p>
          </div>
        </details>

        <ul className="text-[11px] text-mh-slate-400 leading-relaxed list-disc pl-4 space-y-0.5">
          <li>
            Picking an adventurer above uses their element. For your own Hunter, use your weapon's element, or
            non-elemental.
          </li>
          <li>The core slot bonus from Proof of Mastery isn't part of the number shown on the card.</li>
          <li>New monsters and adventurers don't change these rules; only a game rebalance would.</li>
        </ul>
      </section>
    </div>
  );
}
