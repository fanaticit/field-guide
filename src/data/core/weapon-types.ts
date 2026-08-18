// ─────────────────────────────────────────────────────────────
// All 14 Weapon Types — universal MH franchise data
// ─────────────────────────────────────────────────────────────
import type { WeaponType } from '../schemas/index.js';

export const WEAPON_TYPES: WeaponType[] = [
  // ── Melee ──────────────────────────────────────────────────
  {
    id: 'great_sword',
    name: 'Great Sword',
    aliases: ['GS'],
    category: 'melee',
    description: 'Massive blade with devastating charged attacks; highest single-hit damage in the game.',
    specialSkill: 'True Charged Slash',
    styles: ['Surge Slash', 'Rage Slash'],
  },
  {
    id: 'long_sword',
    name: 'Long Sword',
    aliases: ['LS'],
    category: 'melee',
    description: 'Swift katana; Spirit Gauge builds through combos and releases in a powerful finisher.',
    specialSkill: 'Spirit Helm Breaker',
    styles: ['Sacred Sheath Combo', 'Spirit Reckoning'],
  },
  {
    id: 'sword_shield',
    name: 'Sword & Shield',
    aliases: ['SnS'],
    category: 'melee',
    description: 'Versatile weapon; unique ability to use items while the weapon is drawn.',
    specialSkill: 'Perfect Rush Combo',
    styles: ['Drill Slash', 'Perfect Rush'],
  },
  {
    id: 'dual_blades',
    name: 'Dual Blades',
    aliases: ['DB'],
    category: 'melee',
    description: 'Twin blades delivering rapid multi-hits; ideal for elemental and status builds.',
    specialSkill: 'Shrouded Vault',
    styles: ['Feral Demon Mode', 'Spiral Slash'],
  },
  {
    id: 'hammer',
    name: 'Hammer',
    aliases: ['Ham', 'Hmr'],
    category: 'melee',
    description: 'Heavy impact weapon; exceptional at knocking out and stunning monsters.',
    specialSkill: 'Spinning Bludgeon',
    styles: ['Water Strike', 'Impact Crater'],
  },
  {
    id: 'hunting_horn',
    name: 'Hunting Horn',
    aliases: ['HH'],
    category: 'melee',
    description: 'Support weapon that plays melodies granting powerful party-wide buffs.',
    specialSkill: 'Earthshaker',
    styles: ['Fleeting Melody', 'Shockwave'],
  },
  {
    id: 'lance',
    name: 'Lance',
    aliases: ['Lnc'],
    category: 'melee',
    description: 'Defensive weapon combining a powerful shield with long-reach thrust attacks.',
    specialSkill: 'Charging Slash',
    styles: ['Shield Tackle', 'Insta-Block'],
  },
  {
    id: 'gunlance',
    name: 'Gunlance',
    aliases: ['GL'],
    category: 'melee',
    description: "Lance with built-in explosive shells; shelling damage bypasses monster's defence.",
    specialSkill: "Wyvern's Fire",
    styles: ['Blast Dash', 'Guard Reload'],
  },
  {
    id: 'switch_axe',
    name: 'Switch Axe',
    aliases: ['SA', 'Swag Axe'],
    category: 'melee',
    description: 'Morphing weapon swapping between wide-sweep Axe mode and fast-hitting Sword mode.',
    specialSkill: 'Invincible Gambit',
    styles: ['Elemental Burst Counter', 'Soaring Wyvern Blade'],
  },
  {
    id: 'charge_blade',
    name: 'Charge Blade',
    aliases: ['CB'],
    category: 'melee',
    description: 'Technical weapon that charges phials in Sword mode and unleashes them in Axe mode.',
    specialSkill: 'Savage Axe Slash',
    styles: ['Sword Boost', 'Axe Boost'],
  },
  {
    id: 'insect_glaive',
    name: 'Insect Glaive',
    aliases: ['IG'],
    category: 'melee',
    description: 'Aerial weapon wielded with a Kinsect companion; extracts grant stat boosts.',
    specialSkill: 'Diving Wyvern',
    // Styles added in March 2026 update; pending confirmed names
    styles: [],
  },
  // ── Ranged ─────────────────────────────────────────────────
  {
    id: 'bow',
    name: 'Bow',
    aliases: [],
    category: 'ranged',
    description: 'Rapid multi-shot ranged weapon; coatings (Power, Poison, etc.) amplify damage types.',
    specialSkill: 'Dragon Piercer',
    styles: ['Dodgebolt', 'Power Volley'],
  },
  {
    id: 'light_bowgun',
    name: 'Light Bowgun',
    aliases: ['LBG'],
    category: 'ranged',
    description: 'Mobile ranged weapon with rapid fire and a wide selection of ammo types.',
    specialSkill: 'Wyvernblast Counter',
    styles: ['Stepping Shot', 'Sliding Reload'],
  },
  {
    id: 'heavy_bowgun',
    name: 'Heavy Bowgun',
    aliases: ['HBG'],
    category: 'ranged',
    description: 'Slow but extremely powerful; capable of firing special Wyvern ammo types.',
    specialSkill: 'Wyvernheart',
    styles: ['Guard Reload', 'Crouching Shot'],
  },
] satisfies WeaponType[];

export const WEAPON_TYPE_MAP = new Map<string, WeaponType>(
  WEAPON_TYPES.map((w) => [w.id, w])
);

export const MELEE_WEAPON_IDS = WEAPON_TYPES.filter((w) => w.category === 'melee').map((w) => w.id);
export const RANGED_WEAPON_IDS = WEAPON_TYPES.filter((w) => w.category === 'ranged').map((w) => w.id);
