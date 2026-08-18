// ─────────────────────────────────────────────────────────────
// Skills — sourced from hc_data/skills-metadata.json
// Transforms the raw object map into a typed array with display names.
// ─────────────────────────────────────────────────────────────
import type { SkillMeta, SkillCategory } from '../schemas/index.js';

/** Convert a snake_case skill ID to a display name */
function toDisplayName(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type RawSkillEntry = { maxLevel: number; type?: string };

const RAW_SKILLS: Record<string, RawSkillEntry> = {
  rude_awakener: { maxLevel: 3, type: 'general' },
  poison_resistance: { maxLevel: 3, type: 'defense' },
  concentration: { maxLevel: 3, type: 'general' },
  critical_eye: { maxLevel: 5, type: 'critical' },
  ice_resistance: { maxLevel: 5, type: 'defense' },
  attack_boost: { maxLevel: 5, type: 'attack' },
  fire_resistance: { maxLevel: 5, type: 'defense' },
  defense_boost: { maxLevel: 5, type: 'defense' },
  thunder_resistance: { maxLevel: 5, type: 'defense' },
  health_boost: { maxLevel: 5, type: 'defense' },
  water_resistance: { maxLevel: 5, type: 'defense' },
  paralysis_resistance: { maxLevel: 3, type: 'defense' },
  earplugs: { maxLevel: 3, type: 'general' },
  tremor_resistance: { maxLevel: 3, type: 'defense' },
  lock_on: { maxLevel: 1, type: 'general' },
  windproof: { maxLevel: 5, type: 'defense' },
  firm_foothold: { maxLevel: 3, type: 'defense' },
  fighting_spirit: { maxLevel: 5, type: 'general' },
  water_attack: { maxLevel: 5, type: 'attack' },
  fortify: { maxLevel: 5, type: 'survival' },
  guts: { maxLevel: 5, type: 'survival' },
  last_stand: { maxLevel: 5, type: 'survival' },
  evade_extender: { maxLevel: 3, type: 'general' },
  sneak_attack: { maxLevel: 5, type: 'general' },
  focus: { maxLevel: 5, type: 'general' },
  poison_attack: { maxLevel: 5, type: 'attack' },
  weakness_exploit: { maxLevel: 5, type: 'critical' },
  power_prolonger: { maxLevel: 3, type: 'general' },
  skyward_striker: { maxLevel: 5, type: 'attack' },
  reload_speed: { maxLevel: 3, type: 'general' },
  recoil_down: { maxLevel: 3, type: 'general' },
  offensive_guard: { maxLevel: 5, type: 'attack' },
  guard: { maxLevel: 5, type: 'general' },
  paralysis_attack: { maxLevel: 5, type: 'attack' },
  artful_dodger: { maxLevel: 3, type: 'general' },
  thunder_attack: { maxLevel: 5, type: 'attack' },
  divine_blessing: { maxLevel: 5, type: 'defense' },
  fire_attack: { maxLevel: 5, type: 'attack' },
  special_boost: { maxLevel: 5, type: 'general' },
  peak_performance: { maxLevel: 5, type: 'attack' },
  critical_element: { maxLevel: 5, type: 'attack' },
  burst: { maxLevel: 5, type: 'attack' },
  ice_attack: { maxLevel: 5, type: 'attack' },
  heroics: { maxLevel: 5, type: 'attack' },
  slugger: { maxLevel: 5, type: 'general' },
  partbreaker: { maxLevel: 5, type: 'general' },
  resentment: { maxLevel: 5, type: 'attack' },
  dragon_attack: { maxLevel: 5, type: 'attack' },
  critical_boost: { maxLevel: 5, type: 'critical' },
  solidarity: { maxLevel: 1, type: 'general' },
  sleep_attack: { maxLevel: 5, type: 'attack' },
  sleep_resistance: { maxLevel: 3, type: 'defense' },
  bleeding_resistance: { maxLevel: 3, type: 'defense' },
  latent_power: { maxLevel: 5, type: 'attack' },
  artillery: { maxLevel: 5, type: 'attack' },
  resuscitate: { maxLevel: 3, type: 'status' },
  bubbly_dance: { maxLevel: 3, type: 'status' },
  blast_attack: { maxLevel: 5, type: 'attack' },
  blast_resistance: { maxLevel: 3, type: 'defense' },
  ballistics: { maxLevel: 3, type: 'general' },
  spare_shot: { maxLevel: 3, type: 'general' },
  aggressive_dodger: { maxLevel: 5, type: 'general' },
  dauntless: { maxLevel: 5, type: 'survival' },
  offensive_dodger: { maxLevel: 5, type: 'attack' },
  evasive_concentration: { maxLevel: 3, type: 'utility' },
  special_insurance: { maxLevel: 1, type: 'general' },
  hellfire_cloak: { maxLevel: 3, type: 'general' },
  morph_boost: { maxLevel: 3, type: 'general' },
  morph_attack_boost: { maxLevel: 3, type: 'general' },
  evading_reload: { maxLevel: 5, type: 'general' },
  frostwind: { maxLevel: 3, type: 'general' },
  // Elder Dragon set bonus skills
  teostra_powder: { maxLevel: 3, type: 'general' },
  nergigante_hunger: { maxLevel: 3, type: 'general' },
  chameleos_venomist: { maxLevel: 3, type: 'general' },
  namielle_power: { maxLevel: 3, type: 'general' },
  malzeno_crimsonblood: { maxLevel: 3, type: 'general' },
  kirin_flashstorm: { maxLevel: 3, type: 'general' },
  velkhana_aegis: { maxLevel: 3, type: 'general' },
  defensive_loading: { maxLevel: 3, type: 'general' },
  final_strike: { maxLevel: 3, type: 'general' },
  blunt_force: { maxLevel: 5, type: 'attack' },
  buildup_boost: { maxLevel: 5, type: 'status' },
  blood_cloak: { maxLevel: 3, type: 'survival' },
  perfectionist: { maxLevel: 3, type: 'utility' },
  meditation: { maxLevel: 5, type: 'utility' },
  pursuit: { maxLevel: 3, type: 'general' },
  poison_exploit: { maxLevel: 5, type: 'status' },
  paralysis_exploit: { maxLevel: 5, type: 'status' },
  critical_ferocity: { maxLevel: 5, type: 'critical' },
  critical_strength: { maxLevel: 1, type: 'critical' },
  special_partbreaker: { maxLevel: 5, type: 'general' },
  vital_thunder: { maxLevel: 3, type: 'health' },
  vital_ice: { maxLevel: 3, type: 'health' },
  vital_fire: { maxLevel: 3, type: 'health' },
  vital_water: { maxLevel: 3, type: 'health' },
  vital_dragon: { maxLevel: 3, type: 'health' },
  raw_power: { maxLevel: 5, type: 'attack' },
  quick_work: { maxLevel: 3, type: 'general' },
  fortitude: { maxLevel: 3, type: 'general' },
  litheness: { maxLevel: 3, type: 'general' },
  guard_up: { maxLevel: 1, type: 'general' },
  advanced_attack_boost: { maxLevel: 2, type: 'attack' },
  advanced_ice_attack: { maxLevel: 2, type: 'attack' },
  advanced_thunder_attack: { maxLevel: 2, type: 'attack' },
  advanced_water_attack: { maxLevel: 2, type: 'attack' },
  advanced_dragon_attack: { maxLevel: 2, type: 'attack' },
  advanced_burst: { maxLevel: 2, type: 'general' },
  dragon_boost: { maxLevel: 3, type: 'general' },
  elemental_release: { maxLevel: 5, type: 'attack' },
  attack_efficacy: { maxLevel: 3, type: 'attack' },
  // Status / elemental resistance
  rising_tide: { maxLevel: 5, type: 'attack' },
  // Ranged-specific
  slicing_ammo_boost: { maxLevel: 3, type: 'general' },
  normal_element_ammo_boost: { maxLevel: 3, type: 'general' },
  // Seasonal / event skills
  rapid_swim_2025: { maxLevel: 3, type: 'general' },
  summer_passion_2025: { maxLevel: 3, type: 'general' },
  solidarity_winter: { maxLevel: 3, type: 'general' },
  shared_sword: { maxLevel: 5, type: 'general' },
  shared_shield: { maxLevel: 3, type: 'general' },
  balloon_collision: { maxLevel: 3, type: 'general' },
  egg_burst: { maxLevel: 3, type: 'general' },
  happy_new_year: { maxLevel: 3, type: 'general' },
  hunter_unity: { maxLevel: 3, type: 'general' },
  reckless: { maxLevel: 3, type: 'general' },
  combo_master: { maxLevel: 3, type: 'general' },
  // Part-break
  tail_partbreaker: { maxLevel: 1, type: 'general' },
};

export const SKILLS: SkillMeta[] = Object.entries(RAW_SKILLS).map(([id, entry]) => ({
  id,
  displayName: toDisplayName(id),
  maxLevel: entry.maxLevel,
  category: (entry.type ?? 'general') as SkillCategory,
}));

export const SKILL_MAP = new Map<string, SkillMeta>(SKILLS.map((s) => [s.id, s]));

export function getSkillDisplayName(id: string): string {
  return SKILL_MAP.get(id)?.displayName ?? toDisplayName(id);
}
