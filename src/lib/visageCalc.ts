// ─────────────────────────────────────────────────────────────
// Visage Calculator — Monster Hunter Outlanders (game version 1.0.9+)
// Calculates exact resketch probabilities, slot scores, and base effect rolls.
// ─────────────────────────────────────────────────────────────

export const num = (v: string | number): number =>
  parseFloat(String(v).replace('%', ''));

export const pct = (p: number, d = 2): string =>
  `${(100 * p).toFixed(d)}%`;

export const near = (a: number, b: number): boolean =>
  Math.abs(a - b) < 0.006;

export interface ResketchSlotCost {
  unlocks_at_level: number;
  item: string;
  count: number;
  zenny: number;
}

export interface ResketchPoolEntry {
  entry_id: number;
  effect: string;
  roll_quality: string;
  effect_chance: string;
  roll_quality_chance: string;
  overall_chance: string;
  values: string[];
  value_chances: string[];
}

export interface QualityResketchData {
  slots: ResketchSlotCost[];
  pool: ResketchPoolEntry[];
}

export type ResketchDataset = Record<string, QualityResketchData>;

export interface BaseEffectPoolEntry {
  entry_id: number;
  effect: string;
  tier: number;
  effect_chance: string;
  tier_chance: string;
  overall_chance: string;
  values_by_level: string[];
}

export interface BaseEffectPool {
  pool_id: number;
  qualities: string;
  monsters: string[];
  effects: BaseEffectPoolEntry[];
}

export interface SlotInput {
  effect: string;
  value: string | number;
}

export interface BaseInput {
  effect: string;
  value: string | number;
}

export interface AnalyseCardParams {
  quality: 'Rare' | 'Epic' | 'Superior';
  level?: number;
  unlockedSlots?: number;
  totalSlots?: number;
  basePool?: number;
  base?: BaseInput[];
  slots?: SlotInput[];
  weights?: Record<string, number>;
  want?: string[];
}

export interface SlotDescription {
  slot: number;
  effect: string;
  value: number;
  known: boolean;
  rollQuality?: string;
  rank?: number;
  ofValues?: number;
  best?: number;
  luckWithinEffect?: number;
}

export interface BaseEffectEvaluation {
  effect: string;
  tier: number;
  tierChance: string;
  level1: string;
  atLevel: string;
  level10: string;
  bestPossibleLevel10: string;
}

export interface CardAnalysisResult {
  quality: 'Rare' | 'Epic' | 'Superior';
  weights: Record<string, number>;
  currentScore: number;
  costPerResketch: { item: string; count: number; zenny: number };
  chanceBetterPerResketch: number;
  chanceEqual: number;
  currentSetIsBetterThan: number;
  expectedResketches: number;
  expectedCost: { item: string; items: number; zenny: number } | null;
  chanceWithin: (k: number) => number;
  slots: SlotDescription[];
  base: (BaseEffectEvaluation | null)[];
}

export interface Outcome {
  effect: string;
  rollQuality: string;
  value: number;
  p: number;
}

export function createVisageCalc(resketch: ResketchDataset, baseEffects: BaseEffectPool[]) {
  /** Every possible result of ONE slot: { effect, rollQuality, value, p } */
  function outcomes(quality: string): Outcome[] {
    const q = resketch[quality];
    if (!q) throw new Error(`No resketch pool for quality ${quality}`);
    const out: Outcome[] = [];
    for (const e of q.pool) {
      const pEntry = num(e.overall_chance) / 100; // effect x roll quality
      const wts = e.value_chances.map(num);
      const tw = wts.reduce((a, b) => a + b, 0);
      e.values.forEach((v, i) => {
        out.push({
          effect: e.effect,
          rollQuality: e.roll_quality,
          value: num(v),
          p: (pEntry * wts[i]) / tw,
        });
      });
    }
    return out;
  }

  /** How good one slot's roll is inside its own effect */
  function describeSlot(quality: string, effect: string, value: string | number): Omit<SlotDescription, 'slot'> {
    if (!effect || value === '' || value === undefined) {
      return { effect: '', value: 0, known: false };
    }
    const all = outcomes(quality).filter((o) => o.effect === effect);
    if (!all.length) return { effect, value: num(value), known: false };
    const v = num(value);
    const hit = all.find((o) => near(o.value, v));
    const sorted = [...new Set(all.map((o) => o.value))].sort((a, b) => a - b);
    const pEffect = all.reduce((s, o) => s + o.p, 0);
    const pBetter = all.filter((o) => o.value > v + 1e-9).reduce((s, o) => s + o.p, 0);

    return {
      effect,
      value: v,
      known: Boolean(hit),
      rollQuality: hit ? hit.rollQuality : '?',
      rank: sorted.indexOf(hit ? hit.value : v) + 1,
      ofValues: sorted.length,
      best: sorted[sorted.length - 1],
      luckWithinEffect: pEffect > 0 ? 1 - pBetter / pEffect : 0,
    };
  }

  /** Exact score distribution of a whole new set of n slots (convolution, scores rounded to 0.0001) */
  function setScoreDistribution(quality: string, n: number, weights: Record<string, number>): Map<number, number> {
    const one = new Map<number, number>();
    for (const o of outcomes(quality)) {
      const s = Math.round((weights[o.effect] || 0) * o.value * 1e4) / 1e4;
      one.set(s, (one.get(s) || 0) + o.p);
    }
    let dist = new Map<number, number>([[0, 1]]);
    for (let i = 0; i < n; i++) {
      const nd = new Map<number, number>();
      for (const [a, pa] of dist) {
        for (const [b, pb] of one) {
          const k = Math.round((a + b) * 1e4) / 1e4;
          nd.set(k, (nd.get(k) || 0) + pa * pb);
        }
      }
      dist = nd;
    }
    return dist;
  }

  function costPerResketch(quality: string, n: number) {
    const sl = resketch[quality]?.slots.slice(0, n) || [];
    if (sl.length === 0) return { item: 'Brush', count: 0, zenny: 0 };
    return {
      item: sl[0].item,
      count: sl.reduce((s, x) => s + x.count, 0),
      zenny: sl.reduce((s, x) => s + x.zenny, 0),
    };
  }

  function baseValue(
    poolId: number | undefined,
    effect: string,
    startValue: string | number,
    level?: number,
  ): BaseEffectEvaluation | null {
    if (!poolId) return null;
    const pool = baseEffects.find((p) => p.pool_id === poolId);
    if (!pool) return null;
    const e = pool.effects.find(
      (x) => x.effect === effect && x.values_by_level.some((v) => near(num(v), num(startValue))),
    );
    if (!e) return null;
    const top = pool.effects.filter((x) => x.effect === effect).sort((a, b) => b.tier - a.tier)[0];
    return {
      effect,
      tier: e.tier,
      tierChance: e.tier_chance,
      level1: e.values_by_level[0],
      atLevel: e.values_by_level[(level || 10) - 1],
      level10: e.values_by_level[9],
      bestPossibleLevel10: top.values_by_level[9],
    };
  }

  function analyseCard(card: AnalyseCardParams): CardAnalysisResult {
    const weights = card.weights || Object.fromEntries((card.want || []).map((e) => [e, 1]));
    const slots = card.slots || [];

    // In-game resketch rerolls all currently unlocked slots on the card.
    // Determine n from card.unlockedSlots or card.level (Lv 2=1, 4=2, 6=3, 8=4, 10=5), defaulting to slots.length.
    const defaultSlotsByLevel =
      card.level !== undefined
        ? card.level < 2
          ? 0
          : card.level < 4
            ? 1
            : card.level < 6
              ? 2
              : card.level < 8
                ? 3
                : card.level < 10
                  ? 4
                  : 5
        : slots.length;
    const n = Math.max(1, card.unlockedSlots ?? card.totalSlots ?? defaultSlotsByLevel);

    const score = slots.reduce((s, x) => s + (weights[x.effect] || 0) * num(x.value), 0);
    const dist = setScoreDistribution(card.quality, n, weights);

    let pBetter = 0;
    let pSame = 0;
    for (const [s, p] of dist) {
      if (s > score + 1e-6) pBetter += p;
      else if (Math.abs(s - score) <= 1e-6) pSame += p;
    }
    const cost = costPerResketch(card.quality, n);

    return {
      quality: card.quality,
      weights,
      currentScore: score,
      costPerResketch: cost,
      chanceBetterPerResketch: pBetter,
      chanceEqual: pSame,
      currentSetIsBetterThan: Math.max(0, 1 - pBetter - pSame),
      expectedResketches: pBetter > 0 ? 1 / pBetter : Infinity,
      expectedCost:
        pBetter > 0
          ? {
              items: Math.round(cost.count / pBetter),
              item: cost.item,
              zenny: Math.round(cost.zenny / pBetter),
            }
          : null,
      chanceWithin: (k: number) => 1 - Math.pow(1 - pBetter, k),
      slots: slots.map((x, i) => ({ slot: i + 1, ...describeSlot(card.quality, x.effect, x.value) })),
      base: (card.base || []).map((b) => baseValue(card.basePool, b.effect, b.value, card.level)),
    };
  }

  return {
    outcomes,
    describeSlot,
    setScoreDistribution,
    costPerResketch,
    baseValue,
    analyseCard,
    pct,
    num,
  };
}

export type VisageCalcEngine = ReturnType<typeof createVisageCalc>;
