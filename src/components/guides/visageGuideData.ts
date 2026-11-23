// Facts for the Visage Card guide on /gallery/check/. Taken from the game
// data exports (import/MHO_visage_resketch*.json, MHO_visage_base_effects.json)
// for game version 1.0.9.x — update these if a patch changes Visage rolls.

export const RESKETCH_EFFECTS = [
  'Physical Attack',
  'Fire Attack',
  'Water Attack',
  'Thunder Attack',
  'Ice Attack',
  'Dragon Attack',
  'Damage',
  'Elemental Critical Damage',
  'Defense',
];

/** Chance of each roll quality on one resketch slot (same for every card quality). */
export const ROLL_QUALITY_ODDS = [
  { quality: 'Rare', chance: '89%' },
  { quality: 'Epic', chance: '10%' },
  { quality: 'Superior', chance: '1%' },
];

/** Value range per effect, card quality and roll quality: [Rare roll, Epic roll, Superior roll]. */
export const RESKETCH_RANGES: { effect: string; card: string; ranges: [string, string, string] }[] = [
  { effect: 'Physical / elemental attack', card: 'Rare', ranges: ['10–15', '18–24', '26–30'] },
  { effect: 'Physical / elemental attack', card: 'Epic', ranges: ['15–23', '27–36', '38–45'] },
  { effect: 'Physical / elemental attack', card: 'Superior', ranges: ['20–30', '36–48', '51–60'] },
  { effect: 'Damage', card: 'Rare', ranges: ['0.51–0.84%', '1.01–1.35%', '1.43–1.69%'] },
  { effect: 'Damage', card: 'Epic', ranges: ['0.76–1.27%', '1.52–2.03%', '2.15–2.53%'] },
  { effect: 'Damage', card: 'Superior', ranges: ['1.01–1.69%', '2.03–2.70%', '2.87–3.38%'] },
  { effect: 'Elemental Critical Damage', card: 'Rare', ranges: ['0.76–1.27%', '1.52–2.03%', '2.15–2.53%'] },
  { effect: 'Elemental Critical Damage', card: 'Epic', ranges: ['1.14–1.90%', '2.28–3.04%', '3.23–3.80%'] },
  { effect: 'Elemental Critical Damage', card: 'Superior', ranges: ['1.52–2.53%', '3.04–4.05%', '4.30–5.06%'] },
  { effect: 'Defense', card: 'Rare', ranges: ['2–3', '4–5', '6'] },
  { effect: 'Defense', card: 'Epic', ranges: ['3–4', '5–7', '8–9'] },
  { effect: 'Defense', card: 'Superior', ranges: ['4–6', '7–9', '10–12'] },
];

/** Cost per unlocked slot, per resketch. A resketch rerolls every unlocked slot at once. */
export const RESKETCH_COSTS = [
  { card: 'Rare', brush: 'Pure Brush', perSlot: 2, zennyPerSlot: 4000 },
  { card: 'Epic', brush: 'Unusual Brush', perSlot: 2, zennyPerSlot: 8000 },
  { card: 'Superior', brush: 'Radiant Brush', perSlot: 2, zennyPerSlot: 16000 },
];

export const SLOT_UNLOCK_LEVELS = [2, 4, 6, 8, 10];

/** Base effect tiers: chance of each tier when the card drops. */
export const BASE_TIER_ODDS = [
  { tier: 4, chance: '10%', label: 'Best' },
  { tier: 3, chance: '20%', label: 'Good' },
  { tier: 2, chance: '30%', label: 'Average' },
  { tier: 1, chance: '40%', label: 'Weak' },
];

/** Resketch verdict bands used by the checker: chance that one resketch beats your current set. */
export const VERDICT_BANDS = [
  { band: 'Under 1%', verdict: 'God roll – don’t resketch' },
  { band: '1–5%', verdict: 'Excellent – keep it' },
  { band: '5–20%', verdict: 'Strong – keep unless you have spare brushes' },
  { band: '20–40%', verdict: 'Decent – only reroll with surplus materials' },
  { band: 'Over 40%', verdict: 'Improvement likely – reroll if this is a main card' },
];

export const VISAGE_FAQ: { q: string; a: string }[] = [
  {
    q: 'Should I upgrade my Visage Card?',
    a: 'Upgrade a copy whose base effects rolled well. Base effects are fixed when the card drops and can never be resketched, so a Tier 3 or Tier 4 base (30% of drops) is worth levelling, while a Tier 1 base (40% of drops) is usually worth replacing if another copy is likely to drop. Elder dragon Visages always roll the same base values, so any copy of those is fine. Levelling also unlocks resketch slots at levels 2, 4, 6, 8 and 10.',
  },
  {
    q: 'How do I know if my Visage Card is good?',
    a: 'Look at two things. First, the base effect tiers: Tier 4 is the best (10% chance), then Tier 3 (20%), Tier 2 (30%) and Tier 1 (40%). Second, the resketch slots: each slot rolls one of 9 effects with an equal chance, and a roll quality of Rare (89%), Epic (10%) or Superior (1%). The Card Checker works out how your whole set of slots compares with every possible set for the effects you care about, and tells you the chance that one more resketch would beat it.',
  },
  {
    q: 'What are the different options on Visage Cards?',
    a: 'Cards come in Fine, Rare, Epic and Superior quality; Rare and above have resketch slots. Each card has up to 2 base effects, drawn from Affinity, Ultimate Charge Rate and Elemental damage depending on the monster. Resketch slots can roll Physical Attack, Fire, Water, Thunder, Ice or Dragon Attack, Damage, Elemental Critical Damage or Defense. Every card also has its monster’s core effect and belongs to one or more ink sets that give set bonuses.',
  },
  {
    q: 'Is it worth resketching my Visage Card?',
    a: 'Only if a resketch is likely to beat what you have. A resketch rerolls every unlocked slot at once, so you can lose good rolls. If fewer than 1 in 20 resketches would beat your current set, keep it; if more than 2 in 5 would, rerolling is reasonable on a card you use. The Card Checker gives you this chance and the average number of brushes it would take.',
  },
  {
    q: 'How much does a Visage resketch cost?',
    a: 'Each resketch costs 2 brushes plus Zenny for every unlocked slot: Pure Brushes and 4,000 Zenny per slot on Rare cards, Unusual Brushes and 8,000 Zenny on Epic cards, and Radiant Brushes and 16,000 Zenny on Superior cards. A level 10 Superior card with all 5 slots costs 10 Radiant Brushes and 80,000 Zenny per resketch.',
  },
];
