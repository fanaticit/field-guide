// ─────────────────────────────────────────────────────────────
// pages.ts — Titles, descriptions and summary text for every
// public page. Used for <title>/<meta>, the pre-rendered summary
// that appears while an interactive tool loads, the sitemap and
// llms.txt. Edit the wording here; it is not tied to the UI code.
// ─────────────────────────────────────────────────────────────

export interface PageInfo {
  path: string;
  /** <title> text (site name is appended automatically) */
  title: string;
  /** On-page heading in the pre-rendered summary */
  heading: string;
  description: string;
  /** Extra paragraphs for the pre-rendered summary */
  intro?: string[];
  /** Related reference pages shown as links in the summary */
  related?: { label: string; path: string }[];
  /** Section label used for grouping in llms.txt */
  section: 'Home' | 'Armory' | 'Gallery' | 'Challenges' | 'Reference' | 'About';
}

const REFERENCE_LINKS = {
  monsters: { label: 'Monster list', path: '/monsters/' },
  weapons: { label: 'Weapon list', path: '/weapons/' },
  adventurers: { label: 'Adventurer list', path: '/adventurers/' },
  buddies: { label: 'Buddy list', path: '/buddies/' },
  visages: { label: 'Visage Card list', path: '/visages/' },
};

export const PAGES = {
  home: {
    path: '/',
    title: 'Monster Hunter Outlanders Field Guide – Builds, Visage Cards & Monster Data',
    heading: 'Monster Hunter Outlanders Field Guide',
    description:
      'Free Monster Hunter Outlanders tools: build planner, Visage Card checker and collection tracker, plus monster weaknesses, hitzones, weapons and adventurers.',
    section: 'Home',
  },
  updates: {
    path: '/updates',
    title: 'Monster Hunter Outlanders Game Updates & Patch Notes',
    heading: 'Game Updates',
    description:
      'Monster Hunter Outlanders patch notes and game update summaries, plus what changed on the Field Guide with each update.',
    section: 'Home',
  },
  armory: {
    path: '/armory',
    title: 'Community Builds – Monster Hunter Outlanders Gear Builds',
    heading: 'Community Builds',
    description:
      'Browse Monster Hunter Outlanders gear builds shared by other hunters. Filter by role, weapon type or ink and open any build in the Build Planner.',
    intro: [
      'Search by title, author, hunter or weapon, filter by role, weapon type or ink, and open any build to see its equipment, Visage Cards and skills.',
    ],
    related: [REFERENCE_LINKS.weapons, REFERENCE_LINKS.adventurers],
    section: 'Armory',
  },
  planner: {
    path: '/armory/planner',
    title: 'Build Planner – Monster Hunter Outlanders Loadout Calculator',
    heading: 'Build Planner',
    description:
      'Plan a Monster Hunter Outlanders loadout: pick an adventurer, weapon, armour, buddy and Visage Cards and see every active skill and set bonus add up.',
    intro: [
      'Choose an adventurer and weapon, fill each armour slot, add a buddy and up to five Visage Cards, and the planner totals your skills, set bonuses and ink effects. Save builds to share with the community or export them as an image.',
    ],
    related: [REFERENCE_LINKS.weapons, REFERENCE_LINKS.adventurers, REFERENCE_LINKS.buddies, REFERENCE_LINKS.visages],
    section: 'Armory',
  },
  armour: {
    path: '/armory/armour',
    title: 'Armour Sets & Skills – Monster Hunter Outlanders',
    heading: 'Armour',
    description:
      'Every Monster Hunter Outlanders armour set by monster, with each piece’s defence, skills and set bonuses at any rank. Filter by skill to plan combinations.',
    intro: [
      'Search for a monster or skill, filter by the skills you want, and pin pieces into an example build to see how the skills add up.',
    ],
    related: [REFERENCE_LINKS.monsters],
    section: 'Armory',
  },
  gallery: {
    path: '/gallery',
    title: 'Visage Sets – Community Visage Card Builds for Monster Hunter Outlanders',
    heading: 'Visage Sets',
    description:
      'Browse Visage Card sets shared by the community and see which ones you can assemble with the cards you own. Filter by ink set and favourite builds.',
    related: [REFERENCE_LINKS.visages],
    section: 'Gallery',
  },
  visageSet: {
    path: '/gallery/set',
    title: 'Visage Set Builder – Monster Hunter Outlanders',
    heading: 'Visage Set Builder',
    description:
      'Build a Monster Hunter Outlanders Visage Card set: combine core and support cards, see active ink set bonuses and core effects, and share your set.',
    related: [REFERENCE_LINKS.visages],
    section: 'Gallery',
  },
  visageCollection: {
    path: '/gallery/collection',
    title: 'Visage Card Collection Tracker – Monster Hunter Outlanders',
    heading: 'Visage Collection',
    description:
      'Track your Monster Hunter Outlanders Visage Card collection, see which monsters to hunt for the cards you are missing, and search every card skill.',
    related: [REFERENCE_LINKS.visages, REFERENCE_LINKS.monsters],
    section: 'Gallery',
  },
  visageCheck: {
    path: '/gallery/check',
    title: 'Visage Card Checker – Should You Upgrade or Resketch? | Monster Hunter Outlanders',
    heading: 'Visage Card Checker',
    description:
      'Is your Monster Hunter Outlanders Visage Card good? Rate its base tiers and resketch rolls, see every option and value range, and know when to upgrade.',
    intro: [
      'Enter your card’s base effects and resketch slots to see the tier of each roll and the chance a resketch would beat your current set. The guide below explains base effect tiers, resketch roll quality odds, value ranges and costs.',
    ],
    related: [REFERENCE_LINKS.visages],
    section: 'Gallery',
  },
  challenges: {
    path: '/challenges',
    title: 'Hunter’s Challenges – Monster Hunter Outlanders Collection Goals',
    heading: 'Hunter’s Challenges',
    description:
      'Set collection goals for weapons, armour, Visage Cards, adventurers and buddies in Monster Hunter Outlanders and see which monsters to hunt next.',
    related: [REFERENCE_LINKS.monsters, REFERENCE_LINKS.weapons],
    section: 'Challenges',
  },
  challengeAdventurers: {
    path: '/challenges/adventurers',
    title: 'Adventurers Roster Tracker – Monster Hunter Outlanders',
    heading: 'Adventurers',
    description:
      'Every playable Monster Hunter Outlanders adventurer with role, weapon and element. Track who you have recruited and inspect skills and traits.',
    related: [REFERENCE_LINKS.adventurers],
    section: 'Challenges',
  },
  challengeBuddies: {
    path: '/challenges/buddies',
    title: 'Buddies Collection Tracker – Monster Hunter Outlanders',
    heading: 'Buddies',
    description:
      'Every Monster Hunter Outlanders buddy with rarity, combat role, core passive and abilities. Track your companions and their tier levels.',
    related: [REFERENCE_LINKS.buddies],
    section: 'Challenges',
  },
  challengeMonsters: {
    path: '/challenges/monsters',
    title: 'Monster Field Guide & Study Tracker – Monster Hunter Outlanders',
    heading: 'Monster Field Guide',
    description:
      'Monster Hunter Outlanders monsters with species, elements, weaknesses, hitzones and combat stats. Track your Monster Study progress for each monster.',
    related: [REFERENCE_LINKS.monsters],
    section: 'Challenges',
  },
  challengeWeapons: {
    path: '/challenges/weapons',
    title: 'Weapons Collection Tracker – Monster Hunter Outlanders',
    heading: 'Weapons Collection',
    description:
      'Every Monster Hunter Outlanders weapon with attack, element, sharpness and upgrade materials. Compare weapons and track the ones you are crafting.',
    related: [REFERENCE_LINKS.weapons],
    section: 'Challenges',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy',
    heading: 'Privacy Policy',
    description: 'How the Monster Hunter Outlanders Field Guide collects, uses and protects your information.',
    section: 'About',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service',
    heading: 'Terms of Service',
    description: 'Terms of use for the Monster Hunter Outlanders Field Guide, an unofficial community fan project.',
    section: 'About',
  },
} satisfies Record<string, PageInfo>;

export type PageKey = keyof typeof PAGES;

/** Reference (database) section copy, keyed by URL segment. */
export const REFERENCE = {
  monsters: {
    singular: 'Monster',
    plural: 'Monsters',
    title: 'All Monsters – Weaknesses, Hitzones & Stats | Monster Hunter Outlanders',
    description:
      'Every monster in Monster Hunter Outlanders with species, elements, weaknesses, hitzone values and hunt stats. Pick a monster to see where to hit it.',
    toolPath: '/challenges/monsters',
    toolLabel: 'Open the Monster Field Guide',
  },
  weapons: {
    singular: 'Weapon',
    plural: 'Weapons',
    title: 'All Weapons – Stats & Upgrades | Monster Hunter Outlanders',
    description:
      'Every weapon in Monster Hunter Outlanders by type, with attack, element, affinity, rarity and upgrade stats, and the monster each weapon is made from.',
    toolPath: '/challenges/weapons',
    toolLabel: 'Open the Weapons Collection',
  },
  adventurers: {
    singular: 'Adventurer',
    plural: 'Adventurers',
    title: 'All Adventurers – Roles, Skills & Weapons | Monster Hunter Outlanders',
    description:
      'Every playable adventurer in Monster Hunter Outlanders with role, weapon, element, skills and traits.',
    toolPath: '/challenges/adventurers',
    toolLabel: 'Open the Adventurer tracker',
  },
  buddies: {
    singular: 'Buddy',
    plural: 'Buddies',
    title: 'All Buddies – Companion Skills & Passives | Monster Hunter Outlanders',
    description:
      'Every buddy companion in Monster Hunter Outlanders with rarity, combat role, core passive and skills.',
    toolPath: '/challenges/buddies',
    toolLabel: 'Open the Buddy tracker',
  },
  visages: {
    singular: 'Visage Card',
    plural: 'Visage Cards',
    title: 'All Visage Cards – Core Effects & Inks | Monster Hunter Outlanders',
    description:
      'Every Visage Card in Monster Hunter Outlanders with its monster, core effect, ink types, points and max levels per rarity.',
    toolPath: '/gallery/collection',
    toolLabel: 'Open the Visage Collection',
  },
} as const;

export type ReferenceKind = keyof typeof REFERENCE;
export const REFERENCE_KINDS = Object.keys(REFERENCE) as ReferenceKind[];
