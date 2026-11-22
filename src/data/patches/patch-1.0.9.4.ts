// Update 1.0.9.4 — from import/Changes/MHO_patch_1.0.9.4.json.
// Nergigante details and unreleased content are on the Spoilers page
// (General tab), not here.
import type { PatchNotes } from './types';

const fmt = (n: number) => n.toLocaleString('en-GB');
const pct = (o: number, n: number) => `${Math.round(((n - o) / o) * 100)}%`;

const HEALTH_CUTS: [string, number, number, number, number, number][] = [
  ['Radiant Anjanath', 15, 1068850, 739973, 1450, 1410],
  ['Anjanath', 15, 217623, 158271, 1380, 1380],
  ['Radiant Jyuratodus', 15, 566469, 398626, 1380, 1340],
  ['Jyuratodus', 15, 248629, 165753, 1380, 1340],
  ['Radiant Barroth', 16, 1135650, 799161, 1450, 1410],
  ['Radiant Great Jagras', 16, 2119137, 1412758, 1450, 1410],
  ['Radiant Diablos', 16, 1450702, 600291, 1590, 1530],
  ['Diablos', 16, 646574, 222957, 1590, 1530],
  ['Radiant Legiana', 16, 3543035, 1181012, 1590, 1530],
  ['Radiant Paolumu', 16, 2738635, 730303, 1590, 1530],
  ['Radiant Paolumu', 16, 1615680, 1136960, 1590, 1550],
  ['Radiant Great Jagras', 16, 3153688, 2102459, 1590, 1550],
  ['Radiant Diablos', 16, 1567818, 1103279, 1590, 1550],
  ['Radiant Jyuratodus', 16, 1406787, 937858, 1590, 1550],
  ['Radiant Legiana', 16, 3553646, 1539913, 1590, 1550],
  ['Radiant Barroth', 16, 3078542, 1128799, 1590, 1550],
  ['Radiant Black Diablos', 16, 3380072, 1464698, 1605, 1565],
  ['Radiant Diablos', 16, 2101134, 770416, 1605, 1565],
];

const AR_EXP: [number, number, number][] = [
  [56, 351600, 407100],
  [57, 370800, 695100],
  [58, 390000, 1775100],
  [59, 409200, 3935100],
  [60, 428400, 9999999],
];

export const PATCH_1_0_9_4: PatchNotes = {
  version: '1.0.9.4',
  date: '2026-11-21',
  headlines: [
    'Kushala Daora event fight made easier: 15-minute time limit (was 10), health −48% and lower recommended hunt power.',
    'Big health cuts (27–73%) for level 15–16 high-tier monsters, mostly Radiant.',
    'Adventurer Rank now gets much harder from AR 56 and effectively stops at AR 60.',
    'Apex Challenge Orders now refill on Monday at 05:00 (was Friday).',
    'Festival Recruitments get their own pity counters; SSR pity no longer carries over between Featured and Festival recruitments.',
  ],
  spoilerNotice:
    'This update also adds layered gear, a style crate, Visages and event changes for an elder dragon that hasn’t arrived yet. Those details are on the Spoilers page.',
  sections: [
    {
      id: 'trials',
      title: 'Trial Expedition',
      icon: 'content',
      bullets: [
        'The Path of Expedition reset prompt was reworded and now warns if you still have uncleared Path of Trials stages, with a new “Go to Path of Trials” button.',
        'New notice: “New Path of Trials stage unlocked. Challenge now.”',
        'Bounty Trial rounds 5–8 now use different stages.',
      ],
    },
    {
      id: 'kushala-event',
      title: 'Kushala Daora Event Fight Rebalanced',
      icon: 'balance',
      summary: 'When Steelwing Descends – Steel Tremor (Hunting Demos and Limited-Time Challenge).',
      bullets: [
        'Time limit: 10 → 15 minutes',
        `Health: ${fmt(265832)} → ${fmt(139210)} (−48%); attack 1,210 → 1,144`,
        `Recommended hunt power by tier: ${[11457, 12029, 14360, 15078].map(fmt).join(' / ')} → ${[8909, 14360, 16340, 18340].map(fmt).join(' / ')}`,
      ],
    },
    {
      id: 'radiant-health',
      title: 'Level 15–16 High-Tier Monsters: Health Cut',
      icon: 'health',
      wide: true,
      summary:
        '18 high-level stat rows (mostly Radiant monsters) lose 27–73% health and up to 60 attack. Some monsters appear more than once because they have several high-level tiers; the data doesn’t say which modes use each tier.',
      table: {
        caption: 'Monster health changes in update 1.0.9.4',
        headers: ['Monster', 'Level', 'Health before', 'Health after', 'Change', 'Attack'],
        rows: HEALTH_CUTS.map(([m, lv, ho, hn, ao, an]) => [m, lv, fmt(ho), fmt(hn), pct(ho, hn), ao === an ? fmt(an) : `${fmt(ao)} → ${fmt(an)}`]),
      },
    },
    {
      id: 'adventurer-rank',
      title: 'Adventurer Rank: Steep EXP From AR 56, Cap at AR 60',
      icon: 'progression',
      summary:
        'EXP per Adventurer Rank is unchanged up to AR 55. From AR 56 it rises sharply, and AR 60 now needs 9,999,999 EXP – a practical cap. The UI now shortens “Adventurer Rank” to “AR”.',
      table: {
        caption: 'EXP needed per Adventurer Rank',
        headers: ['AR', 'Before', 'After'],
        rows: AR_EXP.map(([r, o, n]) => [r, fmt(o), fmt(n)]),
      },
    },
    {
      id: 'recruitment',
      title: 'Recruitment Changes',
      icon: 'recruitment',
      bullets: [
        'Festival Recruitments now have their own SR (10) and SSR (90) pity counters instead of sharing the Featured ones; the featured guarantee stays at 120.',
        'SSR pity now carries over only to recruitments of the same kind (Featured → Featured, Festival → Festival). Before, it carried over between Featured and Festival.',
        'Rates are now shown with four decimals (0.6000%, 50.0000%).',
      ],
    },
    {
      id: 'apex-orders',
      title: 'Apex Challenge Orders Refill Day',
      icon: 'info',
      summary: 'The 3 Apex Challenge Orders now refill every Monday at 05:00 (was Friday), up to a maximum of 6.',
    },
    {
      id: 'new-hunts',
      title: 'New Hunts',
      icon: 'content',
      summary:
        'New player-facing hunts: Kushala Daora (level 8), Ruger Aidal (level 14, two versions), Radiant Rathalos (levels 3 and 5, plus a level 10 Boss Hunt), Radiant Diablos (level 5), Radiant Pukei-Pukei (level 3) and Rathian (level 7).',
      bullets: [
        'Hunt list rewards: on 85 of the 236 hunt-list entries, the reward item changed from Hunter’s Jade to Adventurer’s Hunting Insights.',
      ],
    },
    {
      id: 'fixes',
      title: 'Fixes and Smaller Changes',
      icon: 'fixes',
      wide: true,
      bullets: [
        'Three Ruger Aidal field entries were tagged as Kushala Daora; they are now Ruger Aidal.',
        'Task fix: “Break the throat of 7★+ Anjanath” is now “Break the head”. Three part-break tasks need fewer breaks (11 → 8, 8 → 6, 8 → 6).',
        'Photo task fix: “Wigglers following the Wiggler Queen” is now “Marine Seahorses following the Marshal Seahorse”.',
        'Midori’s Keepsake explanation text tweaked.',
        'Five preset trial loadouts (try-out adventurer builds) use lower gear levels (e.g. 12 → 10, 14 → 10).',
        'Heavy Bowgun: aerial shot and perfect-dodge attack hit setting changed (3 → 2); Cluster Ammo and an upcoming adventurer’s ultimate ability files updated. Barroth AI scripts updated.',
        'Wood, Ore and Plant Gatherer buildings: one value changed 40 → 20 (possibly gather time).',
        '18 new Marathon Hunt loading screens. A reward preview no longer lists the Guild Crimson Crest Charge Blade.',
        'Not changed: weapons, armour stats, skills, decorations, adventurers, buddies, adventurer gifts and monster weaknesses.',
      ],
    },
  ],
  disclaimer:
    'Values come straight from the game files, not official patch notes. Health and attack are the game’s internal base values; in-game fights may scale them for squads.',
};
