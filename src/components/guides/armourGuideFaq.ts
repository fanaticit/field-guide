// FAQ for the Armour page (/armory/armour/). Shown on the page and sent to
// search engines as FAQPage data. `{sets}` / `{pieces}` are filled with the
// live counts at build time.

export const ARMOUR_FAQ: { q: string; a: string }[] = [
  {
    q: 'Where can I see all the armour pieces in Monster Hunter Outlanders?',
    a: 'The Field Guide Armour page lists every armour set in Monster Hunter Outlanders – {sets} sets and {pieces} pieces – grouped by monster. Each piece shows its skills, the rarity each skill level unlocks at, and the set bonus. Set the rarity your gear is at, then tap any piece to see every skill level.',
  },
  {
    q: 'Is there a skill builder or skill simulator for Monster Hunter Outlanders?',
    a: 'Yes. On the Armour page, add the skills you want and it shows which pieces have them, then build an example set at your rarity to see how the skills add up, which are capped, and what the next upgrade adds. For a full loadout, the Build Planner totals skills and set bonuses from your adventurer, weapon, armour, buddy and Visage Cards.',
  },
  {
    q: 'Where can I find Monster Hunter Outlanders builds?',
    a: 'Community Builds has gear builds shared by other hunters. Filter by weapon type, role (main or support) or ink, or search by adventurer, and open any build in the Build Planner to copy and change it.',
  },
  {
    q: 'How do armour set bonuses work in Monster Hunter Outlanders?',
    a: 'Wearing enough pieces from the same armour set activates its set bonus, which grants an extra skill. The Armour page shows how many pieces each bonus needs and which skill it gives, and the example build tells you when a bonus is active.',
  },
  {
    q: 'Do armour skills get stronger when I upgrade armour?',
    a: 'Yes. Each piece unlocks higher skill levels as you upgrade it to higher rarities. The Armour page shows the rarity every skill level unlocks at, so you can see what your next upgrade will add before spending materials.',
  },
];

export function fillArmourFaq(sets: number, pieces: number) {
  return ARMOUR_FAQ.map((f) => ({ q: f.q, a: f.a.replace('{sets}', String(sets)).replace('{pieces}', String(pieces)) }));
}
