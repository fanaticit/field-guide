/* Visage card calculator for Monster Hunter Outlanders (data: game version 1.0.9.3).
 * Needs two data files from C:\Unpack\Data:
 *   MHO_visage_resketch.json      – resketch pool and slot costs per card quality (Rare / Epic / Superior)
 *   MHO_visage_base_effects.json  – base-effect pools (the effects a card drops with)
 *
 * How a resketch works (game data + tested in game):
 *   - One resketch re-rolls ALL unlocked slots at once and costs the sum of the slot costs
 *     (Superior, 5 slots: 5 x 2 Radiant Brush = 10 brushes, 5 x 16,000 Zenny). The cost is paid either way.
 *   - Afterwards you choose: keep the new set or keep the old set.
 *   - Each slot rolls on its own:
 *       1. one of 9 effects (Damage, Elemental Critical Damage, Defense, Physical/Water/Fire/Ice/Thunder/Dragon Attack), 11.1% each
 *       2. roll quality: Rare 89%, Epic 10%, Superior 1%
 *       3. one of that roll quality's 3 values, 1/3 each
 *     so the same effect can appear several times.
 *
 * Scoring: you say how much each effect is worth to you (weights). A set's score = sum over slots of weight x value.
 *   e.g. { 'Physical Attack': 1 }                          -> score = total Physical Attack
 *        { 'Physical Attack': 1, 'Elemental Critical Damage': 10 } -> 1% ECD counts like 10 attack
 * The calculator works out the exact chance that one resketch gives a set with a higher score than the current one.
 *
 * Usage (browser or Node):
 *   const calc = VisageCalc(resketchJson, baseEffectsJson);
 *   const r = calc.analyseCard({
 *     quality: 'Superior', level: 10, basePool: 111,
 *     base:  [{ effect: 'Elemental damage', value: '4.27%' }, { effect: 'Elemental damage', value: '4.27%' }],
 *     slots: [{ effect: 'Physical Attack', value: 30 }, { effect: 'Physical Attack', value: 30 },
 *             { effect: 'Physical Attack', value: 20 }, { effect: 'Defense', value: 4 },
 *             { effect: 'Elemental Critical Damage', value: '2.53%' }],
 *     weights: { 'Physical Attack': 1 } });
 */
(function (root) {
  const num = v => parseFloat(String(v).replace('%', ''));
  const pct = (p, d = 2) => (100 * p).toFixed(d) + '%';
  const near = (a, b) => Math.abs(a - b) < 0.006;

  function VisageCalc(resketch, baseEffects) {
    // every possible result of ONE slot: { effect, rollQuality, value, p }
    function outcomes(quality) {
      const q = resketch[quality];
      if (!q) throw new Error('No resketch pool for quality ' + quality);
      const out = [];
      for (const e of q.pool) {
        const pEntry = num(e.overall_chance) / 100;                  // effect x roll quality
        const wts = e.value_chances.map(num), tw = wts.reduce((a, b) => a + b, 0);
        e.values.forEach((v, i) => out.push({ effect: e.effect, rollQuality: e.roll_quality, value: num(v), p: pEntry * wts[i] / tw }));
      }
      return out;
    }
    // how good one slot's roll is inside its own effect
    function describeSlot(quality, effect, value) {
      const all = outcomes(quality).filter(o => o.effect === effect);
      if (!all.length) return { effect, value, known: false };
      const v = num(value), hit = all.find(o => near(o.value, v));
      const sorted = [...new Set(all.map(o => o.value))].sort((a, b) => a - b);
      const pEffect = all.reduce((s, o) => s + o.p, 0);
      const pBetter = all.filter(o => o.value > v + 1e-9).reduce((s, o) => s + o.p, 0);
      return { effect, value: v, known: !!hit, rollQuality: hit ? hit.rollQuality : '?',
               rank: sorted.indexOf(hit ? hit.value : v) + 1, ofValues: sorted.length,
               best: sorted[sorted.length - 1], luckWithinEffect: 1 - pBetter / pEffect };
    }
    // exact score distribution of a whole new set of n slots (convolution, scores rounded to 0.0001)
    function setScoreDistribution(quality, n, weights) {
      const one = new Map();
      for (const o of outcomes(quality)) {
        const s = Math.round((weights[o.effect] || 0) * o.value * 1e4) / 1e4;
        one.set(s, (one.get(s) || 0) + o.p);
      }
      let dist = new Map([[0, 1]]);
      for (let i = 0; i < n; i++) {
        const nd = new Map();
        for (const [a, pa] of dist) for (const [b, pb] of one) {
          const k = Math.round((a + b) * 1e4) / 1e4;
          nd.set(k, (nd.get(k) || 0) + pa * pb);
        }
        dist = nd;
      }
      return dist;
    }
    function costPerResketch(quality, n) {
      const sl = resketch[quality].slots.slice(0, n);
      return { item: sl[0].item, count: sl.reduce((s, x) => s + x.count, 0), zenny: sl.reduce((s, x) => s + x.zenny, 0) };
    }
    function baseValue(poolId, effect, startValue, level) {
      const pool = baseEffects.find(p => p.pool_id === poolId);
      if (!pool) return null;
      const e = pool.effects.find(x => x.effect === effect && x.values_by_level.some(v => near(num(v), num(startValue))));
      if (!e) return null;
      const top = pool.effects.filter(x => x.effect === effect).sort((a, b) => b.tier - a.tier)[0];
      return { effect, tier: e.tier, tierChance: e.tier_chance, level1: e.values_by_level[0],
               atLevel: e.values_by_level[(level || 10) - 1], level10: e.values_by_level[9], bestPossibleLevel10: top.values_by_level[9] };
    }
    function analyseCard(card) {
      const weights = card.weights || Object.fromEntries((card.want || []).map(e => [e, 1]));
      const slots = card.slots || [], n = slots.length;
      const score = slots.reduce((s, x) => s + (weights[x.effect] || 0) * num(x.value), 0);
      const dist = setScoreDistribution(card.quality, n, weights);
      let pBetter = 0, pSame = 0;
      for (const [s, p] of dist) { if (s > score + 1e-6) pBetter += p; else if (Math.abs(s - score) <= 1e-6) pSame += p; }
      const cost = costPerResketch(card.quality, n);
      return {
        quality: card.quality, weights, currentScore: score,
        costPerResketch: cost,
        chanceBetterPerResketch: pBetter,                 // new set scores higher -> keep it
        chanceEqual: pSame,
        currentSetIsBetterThan: 1 - pBetter - pSame,      // share of all possible sets that score lower than yours
        expectedResketches: pBetter > 0 ? 1 / pBetter : Infinity,
        expectedCost: pBetter > 0 ? { items: cost.count / pBetter, item: cost.item, zenny: cost.zenny / pBetter } : null,
        chanceWithin: k => 1 - Math.pow(1 - pBetter, k),  // e.g. r.chanceWithin(10)
        slots: slots.map((x, i) => Object.assign({ slot: i + 1 }, describeSlot(card.quality, x.effect, x.value))),
        base: (card.base || []).map(b => baseValue(card.basePool, b.effect, b.value, card.level)),
      };
    }
    return { outcomes, describeSlot, setScoreDistribution, costPerResketch, baseValue, analyseCard, pct };
  }
  if (typeof module !== 'undefined') module.exports = VisageCalc; else root.VisageCalc = VisageCalc;
})(this);
