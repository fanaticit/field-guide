// MHO build calculator – reference implementation (plain JavaScript, no libraries).
// Reads MHO_build_planner.json and turns a saved build into an "effective damage" score.
// Use it as the source of truth for how the planner must add things up.
'use strict';

const ELEMENTS = ['Water', 'Fire', 'Ice', 'Thunder', 'Dragon'];

// ---- Unknown game constants: keep them as user-editable settings in the site ----
const DEFAULT_SETTINGS = {
  basePhysCritPct: 25,   // extra physical damage on a crit before any bonus. NOT confirmed in game yet.
  baseElemCritPct: 0,    // extra elemental damage on a crit before any bonus. NOT confirmed in game yet.
  baseAffinityPct: 0,    // hidden base affinity. The base-stat table hints at 15 – NOT confirmed in game yet.
  includeConditional: false, // false = steady score (always-on only); true = best case (every condition met)
  includeTags: [],       // conditional effects to switch on one by one, matched by condition text, e.g. ['weak point (hitzone >= 45)']
  monster: null,         // optional { cut|impact|shot hitzone (0-100), element hitzones {Fire: 20, ...} }
  physType: 'Cut',       // 'Cut' | 'Impact' | 'Shot' – which physical hitzone column to use
};

function indexData(data) {
  const byEntry = new Map(data.skills.map(s => [s.entry_id, s]));
  const byTypeLevel = new Map();
  for (const s of data.skills) {
    if (s.skill_type_id == null) continue;
    byTypeLevel.set(`${s.skill_type_id}:${s.level}`, s);
  }
  return {
    byEntry, byTypeLevel,
    weapons: new Map(data.weapons.map(w => [w.id, w])),
    armour: new Map(data.armour.map(a => [a.id, a])),
    decos: new Map(data.decorations.map(d => [d.id, d])),
    sets: new Map(data.armour_sets.map(s => [s.id, s])),
    visages: new Map(data.visages.map(v => [v.id, v])),
    visageSets: new Map(data.visage_sets.map(s => [s.id, s])),
    pools: data.visage_random_pools,
    buddies: new Map(data.buddies.map(b => [b.id, b])),
    maxLevels: data.skill_max_levels,
  };
}

const atRarity = (rows, r) => rows.find(x => x.rarity === r) || rows[rows.length - 1];
const pick = (values, level) => values == null ? null : values[Math.min(Math.max(level, 1), values.length) - 1];

// ---------------------------------------------------------------------------
// build = {
//   weapon: { id, rarity, apexAwakenings: [entry_id per slot, optional] },
//   armour: [{ id, rarity, decorations: [deco ids] }],      // up to 5 pieces
//   weaponDecorations: [deco ids],
//   visages: [{ id, level, baseChoices: [entry_id per base slot], randomChoices: [{ entry_id, value }] }],
//   buddy: { id, phase }                                     // phase = Ascension phase 1..3
// }
// ---------------------------------------------------------------------------
function collect(data, idx, build) {
  const effects = [];            // { source, name, effect, value }
  const skillLevels = new Map(); // skill_type_id -> { level, sources[] }
  const addSkill = (entryId, source) => {
    const s = idx.byEntry.get(entryId);
    if (!s || s.skill_type_id == null) return;
    const cur = skillLevels.get(s.skill_type_id) || { level: 0, sources: [] };
    cur.level += s.level;
    cur.sources.push(`${source} (+${s.level})`);
    skillLevels.set(s.skill_type_id, cur);
  };
  const addEffects = (list, source, name, level) => {
    for (const e of list || []) {
      const value = pick(e.values, level);
      if (value == null) continue;
      effects.push({ source, name, effect: e, value });
    }
  };

  // weapon
  const w = idx.weapons.get(build.weapon.id);
  const wr = atRarity(w.rarities, build.weapon.rarity);
  for (const d of build.weaponDecorations || []) for (const s of idx.decos.get(d)?.skills || []) addSkill(s.entry_id, `Decoration ${idx.decos.get(d).name}`);
  if (w.apex) {
    const intr = w.apex.intrinsic;
    if (intr) intr.skill_entry_id ? addSkill(intr.skill_entry_id, `Apex ${intr.name}`) : addEffects(intr.effects, 'Apex intrinsic', intr.name, 1);
    (build.weapon.apexAwakenings || []).forEach((eid, i) => {
      if (eid == null) return;
      if ((w.apex.awakening_unlock_rarities[i] || 0) > build.weapon.rarity) return; // slot not unlocked yet
      const opt = (w.apex.awakening_slots[i] || []).find(o => o.entry_id === eid);
      if (!opt) return;
      opt.skill_entry_id ? addSkill(opt.skill_entry_id, `Apex awakening ${opt.name}`) : addEffects(opt.effects, 'Apex awakening', opt.name, 1);
    });
  }

  // armour + decorations + set pieces
  const setPieces = new Map();
  for (const p of build.armour || []) {
    const a = idx.armour.get(p.id);
    for (const s of atRarity(a.rarities, p.rarity).skills) addSkill(s.entry_id, a.name);
    for (const d of p.decorations || []) for (const s of idx.decos.get(d)?.skills || []) addSkill(s.entry_id, `Decoration ${idx.decos.get(d).name}`);
    for (const sid of a.set_bonus_ids || []) setPieces.set(sid, (setPieces.get(sid) || 0) + 1);
  }
  for (const [sid, n] of setPieces) {
    for (const t of idx.sets.get(sid)?.tiers || []) if (n >= t.pieces) addSkill(t.entry_id, `${idx.sets.get(sid).name} ${t.pieces}-piece`);
  }

  // skills -> effects (cap at max level, use the entry of that level)
  const skillsUsed = [];
  for (const [typeId, info] of skillLevels) {
    const max = idx.maxLevels[String(typeId)] || info.level;
    const lvl = Math.min(info.level, max);
    let s = null;
    for (let l = lvl; l >= 1 && !s; l--) s = idx.byTypeLevel.get(`${typeId}:${l}`);
    if (!s) continue;
    skillsUsed.push({ skill: s.skill, level: s.level, capped_from: info.level > max ? info.level : null, sources: info.sources, note: s.data_note || '' });
    addEffects(s.effects, 'Skill', `${s.skill} Lv${s.level}`, 1);
  }

  // visages
  const setCount = new Map();
  for (const pv of build.visages || []) {
    const v = idx.visages.get(pv.id);
    for (const c of v.core_effect) addEffects(c.effects, 'Visage core', v.name, pv.level);
    v.base_attribute_slots.forEach((slot, i) => {
      const chosen = slot.find(o => o.entry_id === (pv.baseChoices || [])[i]);
      if (chosen) addEffects([{ ...chosen, target: 'self', always_on: true, conditions: [] }], 'Visage base stat', `${v.name} ${chosen.effect}`, pv.level);
    });
    for (const rc of pv.randomChoices || []) {
      const opt = Object.values(idx.pools).flat().find(o => o.entry_id === rc.entry_id);
      if (opt) effects.push({ source: 'Visage random effect', name: `${v.name} ${opt.effect}`, effect: { ...opt, target: 'self', always_on: true, conditions: [] }, value: rc.value });
    }
    for (const sid of v.set_ids) setCount.set(sid, (setCount.get(sid) || 0) + 1);
  }
  for (const [sid, n] of setCount) {
    const vs = idx.visageSets.get(sid);
    for (const t of vs?.tiers || []) if (n >= t.pieces) addEffects(t.effects, 'Visage set', `${vs.name} ${t.pieces}-piece`, 1);
  }

  // buddy
  if (build.buddy) {
    const b = idx.buddies.get(build.buddy.id);
    addEffects(b.effects, 'Buddy core passive', b.name, build.buddy.phase || 1);
  }
  return { weapon: w, weaponRarity: wr, effects, skillsUsed };
}

function score(data, build, userSettings = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...userSettings };
  const idx = indexData(data);
  const { weapon, weaponRarity, effects, skillsUsed } = collect(data, idx, build);
  const element = ELEMENTS.find(e => weaponRarity.element[e]) || null;

  const t = { atkFlat: 0, atkPct: 0, weaponAtkPct: 0, physPct: 0, dmgPct: 0, mvPct: 0, aff: 0, critPhys: 0, critElem: 0,
              elemFlat: 0, elemAtkPct: 0, elemDmgPct: 0 };
  const used = [], skipped = [];
  for (const x of effects) {
    const e = x.effect;
    const conditional = !e.always_on;
    const tagOn = (e.conditions || []).some(c => settings.includeTags.includes(c));
    if (conditional && !settings.includeConditional && !tagOn) { skipped.push(x); continue; }
    if (!['self', 'squad', 'main adventurer'].includes(e.target)) { skipped.push(x); continue; }
    const v = x.value, s = e.stat;
    const elemMatch = (stat) => {
      if (stat.startsWith('AllElement')) return element ? stat.slice('AllElement'.length) : null;
      const m = stat.match(/^(Water|Fire|Ice|Thunder|Dragon)(.*)$/);
      return m && m[1] === element ? m[2] : null;
    };
    let bucket = null;
    switch (s) {
      case 'AttackBonus': bucket = 'atkFlat'; break;
      case 'AttackPercentage': bucket = 'atkPct'; break;
      case 'AttackWeaponPercentage': bucket = 'weaponAtkPct'; break;
      case 'PhysicalDamagePercentage': bucket = 'physPct'; break;
      case 'DamagePercentage': bucket = 'dmgPct'; break;
      case 'MotionValuePercentage': bucket = 'mvPct'; break;
      case 'AffinityRate': bucket = 'aff'; break;
      case 'AffinityDamage': bucket = 'critPhys'; break;
      case 'ElementCriticalDamage': bucket = 'critElem'; break;
      default: {
        const rest = elemMatch(s);
        if (rest === 'Damage') bucket = 'elemFlat';
        else if (rest === 'DamagePercentage') bucket = 'elemAtkPct';
        else if (rest === 'DamageResultPercentage') bucket = 'elemDmgPct';
      }
    }
    if (!bucket) { skipped.push(x); continue; }
    t[bucket] += v;
    used.push({ source: x.source, name: x.name, stat: s, value: v, bucket, conditional });
  }

  const pct = v => v / 100;
  const weaponAtk = weaponRarity.attack * (1 + pct(t.weaponAtkPct));
  const phys = (weaponAtk + t.atkFlat) * (1 + pct(t.atkPct)) * (1 + pct(t.physPct));
  const elemBase = element ? weaponRarity.element[element] : 0;
  const elem = element ? (elemBase + t.elemFlat) * (1 + pct(t.elemAtkPct)) * (1 + pct(t.elemDmgPct)) : 0;
  const affinity = Math.max(-100, Math.min(100, weaponRarity.affinity_pct + settings.baseAffinityPct + t.aff));
  const critChance = Math.max(0, affinity) / 100;
  const physAvg = phys * (1 + critChance * pct(settings.basePhysCritPct + t.critPhys));
  const elemAvg = elem * (1 + critChance * pct(settings.baseElemCritPct + t.critElem));
  const common = (1 + pct(t.dmgPct)) * (1 + pct(t.mvPct));
  let physOut = physAvg * common, elemOut = elemAvg * common;
  if (settings.monster) {
    physOut *= (settings.monster[settings.physType] ?? 100) / 100;
    elemOut *= element ? (settings.monster[element] ?? 100) / 100 : 0;
  }
  return {
    weapon: `${weapon.name} (rarity ${weaponRarity.rarity})`, element,
    totals: t, affinity_pct: affinity,
    physical: +phys.toFixed(2), elemental: +elem.toFixed(2),
    effective: +(physOut + elemOut).toFixed(2),
    breakdown: { physical_avg: +(physAvg * common).toFixed(2), elemental_avg: +(elemAvg * common).toFixed(2) },
    skills: skillsUsed, used, skipped_count: skipped.length, settings,
  };
}

if (typeof module !== 'undefined') module.exports = { score, DEFAULT_SETTINGS };
