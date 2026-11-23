// Plain-English one-paragraph summaries of reference pages. Used as the
// page's opening paragraph and its meta description — the sentence AI
// answers and search snippets are most likely to quote.
import type { AdventurerPage, BuddyPage, MonsterPage, VisagePage, WeaponPage } from './publicData';
import { labelOf, weaponTypeName } from './publicData';

const GAME = 'Monster Hunter Outlanders';
const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export function monsterSummary(p: MonsterPage): string {
  const m = p.monster;
  const parts: string[] = [];
  const species = m.species ? labelOf(m.species) : null;
  parts.push(`${m.name} is ${species ? `a ${species}` : 'a monster'} in ${GAME}${p.parent ? `, a variant of ${p.parent.name}` : ''}.`);
  if (m.elements.length) parts.push(`It uses ${list(m.elements.map(labelOf))}.`);
  if (m.weaknesses.length) parts.push(`It is weak to ${list(m.weaknesses.map(labelOf))}.`);
  const best = (key: 'cut' | 'impact' | 'shot') =>
    p.hitzones.reduce<{ part: string; value: number } | null>(
      (acc, h) => (h[key] > (acc?.value ?? -1) ? { part: h.state ? `${h.part} (${h.state})` : h.part, value: h[key] } : acc),
      null,
    );
  const cut = best('cut');
  const impact = best('impact');
  if (cut && impact) {
    parts.push(
      cut.part === impact.part
        ? `Its weakest hitzone is the ${cut.part} (cut ${cut.value}, impact ${impact.value}).`
        : `Cutting attacks do the most damage to its ${cut.part} (${cut.value}); blunt attacks to its ${impact.part} (${impact.value}).`,
    );
  }
  return parts.join(' ');
}

export function weaponSummary(p: WeaponPage): string {
  const w = p.weapon;
  const type = weaponTypeName(w.weapon_type_id);
  const parts = [`${w.name} is a ${type} in ${GAME}${p.monster ? ` made from ${p.monster.name}` : ''}.`];
  const stats: string[] = [];
  if (w.attack != null) stats.push(`${w.attack} attack`);
  if (w.element_type && w.element_type !== 'raw' && w.element_type !== 'none')
    stats.push(`${w.element_damage ?? ''} ${labelOf(w.element_type)} element`.trim());
  if (w.affinity) stats.push(`${w.affinity}% affinity`);
  if (stats.length) parts.push(`At rarity ${w.rarity ?? '?'} it has ${list(stats)}.`);
  if (w.max_rarity && w.max_rarity !== w.rarity) {
    parts.push(`It can be upgraded up to rarity ${w.max_rarity}${w.max_name && w.max_name !== w.name ? `, becoming ${w.max_name}` : ''}.`);
  }
  return parts.join(' ');
}

export function adventurerSummary(p: AdventurerPage): string {
  const a = p.adventurer;
  const parts = [
    `${a.name}${a.title ? `, "${a.title}",` : ''} is a playable adventurer in ${GAME}${a.role ? ` with the ${a.role} role` : ''}.`,
  ];
  if (a.weapon_type) parts.push(`${a.name} uses the ${weaponTypeName(a.weapon_type)}${a.element_specialization ? ` and specialises in ${labelOf(a.element_specialization)}` : ''}.`);
  if (p.skills.length) parts.push(`Skills: ${list(p.skills.map((s) => s.name))}.`);
  const favourites = p.gifts.filter((g) => g.preference === 'favourite').map((g) => g.name);
  if (favourites.length) parts.push(`Favourite gifts: ${list(favourites)}.`);
  if (a.status === 'not_in_game' && a.status_reason) parts.push(a.status_reason);
  return parts.join(' ');
}

export function buddySummary(p: BuddyPage): string {
  const b = p.buddy;
  const parts = [
    `${b.name} is ${b.tier ? `an ${b.tier}` : 'a'} ${b.species ? `${b.species} ` : ''}buddy in ${GAME}${b.role ? ` with the ${b.role} role` : ''}.`,
  ];
  if (b.core_passive) parts.push(`Core passive: ${b.core_passive}`);
  if (p.defaultOf) parts.push(`${p.defaultOf.name} starts with ${b.name}.`);
  const best = p.pairings.filter((x) => x.rating === 'best' && x.kind === 'adventurer').map((x) => x.name);
  if (best.length) parts.push(`Best adventurers for ${b.name}: ${list(best)}.`);
  return parts.join(' ');
}

export function visageSummary(p: VisagePage): string {
  const v = p.visage;
  const parts = [
    `${v.name} is a ${v.monster_type === 'small' ? 'small' : 'large'} monster Visage Card in ${GAME}${p.monster ? ` from ${p.monster.name}` : ''}.`,
  ];
  if (v.core_effect) parts.push(`Core effect: ${v.core_effect}`);
  if (v.ink_types.length) parts.push(`Ink: ${list(v.ink_types.map(labelOf))}.`);
  return parts.join(' ');
}
