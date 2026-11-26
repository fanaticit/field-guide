// ─────────────────────────────────────────────────────────────
// Armour Lab — pure logic shared by the armour v2 / v3 / v4 pages.
//
// Everything here is plain TypeScript with no React or Supabase, so it
// can be tested on its own. Rarity rules follow the game data:
//   • A piece starts at `rarity` and upgrades up to `maxRarity`.
//   • At a given rarity a piece has the skills of its last upgrade step
//     at or below that rarity.
//   • Skill levels from every source add up, then cap at the skill's
//     max level (the extra levels are wasted).
//   • A set bonus ("2pc: Insight +1") adds its skill once enough pieces
//     of that set are equipped.
// ─────────────────────────────────────────────────────────────

export type LabSlot = 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves';

export const LAB_SLOTS: Array<{ id: LabSlot; label: string; gameSlot: string; icon: string }> = [
  { id: 'helm', label: 'Helm', gameSlot: 'Head', icon: '/images/armor/helm.png' },
  { id: 'chest', label: 'Chest', gameSlot: 'Chest', icon: '/images/armor/chest.png' },
  { id: 'gloves', label: 'Arms', gameSlot: 'Arms', icon: '/images/armor/gloves.png' },
  { id: 'waist', label: 'Coil', gameSlot: 'Waist', icon: '/images/armor/waist.png' },
  { id: 'greaves', label: 'Greaves', gameSlot: 'Legs', icon: '/images/armor/greaves.png' },
];

export const SLOT_FROM_GAME: Record<string, LabSlot> = Object.fromEntries(
  LAB_SLOTS.map((s) => [s.gameSlot, s.id]),
) as Record<string, LabSlot>;

export const slotLabel = (slot: LabSlot) => LAB_SLOTS.find((s) => s.id === slot)?.label ?? slot;

/** One skill (all of its levels together) */
export interface LabSkill {
  /** Stable key: the id of the skill's lowest level row */
  key: string;
  name: string;
  category: string;
  maxLevel: number;
  icon: string | null;
  /** Description of each level (1-based) */
  descByLevel: Record<number, string | null>;
  skill_description?: string | null;
  active?: string | null;
  trigger?: string | null;
  trigger_note?: string | null;
  conditions?: string | null;
  duration_s?: number | null;
}

/** One upgrade step of a piece */
export interface LabStep {
  rarity: number;
  defence: number | null;
  /** Skill levels the piece has at this rarity, by skill key */
  skills: Record<string, number>;
  /** What changed compared with the previous step */
  gained: Array<{ key: string; from: number; to: number }>;
}

export interface LabSetBonus {
  pieces: number;
  skillKey: string;
  level: number;
}

export interface LabPiece {
  id: string;
  slot: LabSlot;
  setKey: string;
  setName: string;
  /** Set variant (I, II …) */
  variant: string;
  monsterId: string;
  monsterName: string;
  /** False for sets with no monster row (Alloy, Bone …) */
  hasMonster: boolean;
  /** Set icon (falls back to the monster icon) */
  setIcon: string | null;
  /** The monster's own icon, when the set comes from a monster */
  monsterIcon: string | null;
  rarity: number;
  maxRarity: number;
  image: string | null;
  decoSlots: number[];
  setBonus: LabSetBonus | null;
  comingSoon: boolean;
  statusReason: string | null;
  notes: string | null;
  /** Upgrade steps, lowest rarity first (never empty) */
  steps: LabStep[];
}

export interface LabSet {
  key: string;
  name: string;
  monsterId: string;
  monsterName: string;
  monsterIcon: string | null;
  hasMonster: boolean;
  icon: string | null;
  rarity: number;
  maxRarity: number;
  setBonus: LabSetBonus | null;
  comingSoon: boolean;
  pieces: Partial<Record<LabSlot, LabPiece>>;
}

export interface LabData {
  pieces: LabPiece[];
  piecesById: Map<string, LabPiece>;
  sets: LabSet[];
  setsByKey: Map<string, LabSet>;
  skills: Map<string, LabSkill>;
  /** Highest rarity of any piece (14 at the moment) */
  maxRarity: number;
  /** Lowest starting rarity of any piece */
  minRarity: number;
}

// ── Raw inputs (shapes of the Supabase rows we read) ─────────

export interface RawSkillRow {
  id: string;
  name: string;
  category: string;
  level: number;
  max_levels: number;
  skill_type_id: number | null;
  description: string | null;
  icon: string | null;
  skill_description?: string | null;
  active?: string | null;
  trigger?: string | null;
  trigger_note?: string | null;
  conditions?: string | null;
  duration_s?: number | null;
}

export interface RawPieceRow {
  id: string;
  monster_id: string;
  slot: string;
  set_name: string | null;
  set_variant: string;
  rarity: number;
  max_rarity: number | null;
  deco_slots: number[];
  set_bonus: { pieces: number; skill_id: string } | null;
  icon_m: string | null;
  icon_f: string | null;
  set_icon: string | null;
  status: string;
  status_reason: string | null;
  is_spoiler: boolean;
  notes: string | null;
}

export interface RawTierRow {
  armour_piece_id: string;
  rarity: number;
  defence: number | null;
  skills: string[];
}

export interface BuildLabDataInput {
  skills: RawSkillRow[];
  pieces: RawPieceRow[];
  tiers: RawTierRow[];
  monsters: Map<string, { name: string; icon: string | null }>;
  gender: 'male' | 'female';
  showSpoilers: boolean;
}

/** Game text sometimes keeps its plural code: "1|plural(one=time, other=times)" → "1 time" */
export function cleanGameText(text: string | null): string | null {
  if (!text) return text;
  return text.replace(/(\d+)\|plural\(one=([^,()]*),\s*other=([^()]*)\)/g, (_m, n: string, one: string, other: string) => `${n} ${Number(n) === 1 ? one.trim() : other.trim()}`);
}

const titleCase = (id: string) =>
  id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** Shape the raw rows into pieces, sets and skills. */
export function buildLabData(input: BuildLabDataInput): LabData {
  // Skills: every level is its own row. Group them by skill type (falls back to name).
  const groupKey = (s: RawSkillRow) =>
    s.skill_type_id !== null && s.skill_type_id !== undefined
      ? `t${s.skill_type_id}`
      : `${s.name}|${s.category}|${s.max_levels}`;
  const firstRow = new Map<string, RawSkillRow>();
  for (const s of input.skills) {
    const cur = firstRow.get(groupKey(s));
    if (!cur || s.level < cur.level) firstRow.set(groupKey(s), s);
  }
  const skills = new Map<string, LabSkill>();
  const rowToSkill = new Map<string, { key: string; level: number }>();
  for (const s of input.skills) {
    const base = firstRow.get(groupKey(s))!;
    let skill = skills.get(base.id);
    if (!skill) {
      skill = {
        key: base.id,
        name: base.name,
        category: base.category,
        maxLevel: Math.max(1, base.max_levels),
        icon: base.icon,
        descByLevel: {},
        skill_description: base.skill_description ?? null,
        active: base.active ?? null,
        trigger: base.trigger ?? null,
        trigger_note: base.trigger_note ?? null,
        conditions: base.conditions ?? null,
        duration_s: base.duration_s ?? null,
      };
      skills.set(base.id, skill);
    }
    if (!skill.skill_description && s.skill_description) skill.skill_description = s.skill_description;
    if (!skill.active && s.active) skill.active = s.active;
    if (!skill.trigger && s.trigger) skill.trigger = s.trigger;
    if (!skill.trigger_note && s.trigger_note) skill.trigger_note = s.trigger_note;
    if (!skill.conditions && s.conditions) skill.conditions = s.conditions;
    if (skill.duration_s == null && s.duration_s != null) skill.duration_s = s.duration_s;
    skill.descByLevel[s.level] = cleanGameText(s.description);
    skill.maxLevel = Math.max(skill.maxLevel, s.level);
    rowToSkill.set(s.id, { key: base.id, level: s.level });
  }

  const tiersByPiece = new Map<string, RawTierRow[]>();
  for (const t of input.tiers) {
    let list = tiersByPiece.get(t.armour_piece_id);
    if (!list) tiersByPiece.set(t.armour_piece_id, (list = []));
    list.push(t);
  }

  const pieces: LabPiece[] = [];
  for (const p of input.pieces) {
    const slot = SLOT_FROM_GAME[p.slot];
    if (!slot) continue;
    if (p.is_spoiler && !input.showSpoilers) continue;

    const monster = input.monsters.get(p.monster_id);
    const monsterName = monster?.name ?? titleCase(p.monster_id);
    const variant = p.set_variant || 'I';
    const setName = `${p.set_name ?? monsterName} ${variant}`.trim();

    const rawTiers = [...(tiersByPiece.get(p.id) ?? [])].sort((a, b) => a.rarity - b.rarity);
    const steps: LabStep[] = [];
    let prev: Record<string, number> = {};
    for (const t of rawTiers) {
      const lv: Record<string, number> = {};
      for (const id of t.skills ?? []) {
        const m = rowToSkill.get(id);
        if (!m) continue;
        lv[m.key] = Math.max(lv[m.key] ?? 0, m.level);
      }
      const gained: LabStep['gained'] = [];
      for (const [key, to] of Object.entries(lv)) {
        const from = prev[key] ?? 0;
        if (to > from) gained.push({ key, from, to });
      }
      steps.push({ rarity: t.rarity, defence: t.defence, skills: lv, gained });
      prev = lv;
    }
    if (steps.length === 0) {
      steps.push({ rarity: p.rarity, defence: null, skills: {}, gained: [] });
    }

    let setBonus: LabSetBonus | null = null;
    if (p.set_bonus) {
      const m = rowToSkill.get(p.set_bonus.skill_id);
      if (m) setBonus = { pieces: p.set_bonus.pieces, skillKey: m.key, level: m.level };
    }

    const image = (input.gender === 'female' ? p.icon_f : p.icon_m) ?? p.icon_m ?? p.icon_f;
    pieces.push({
      id: p.id,
      slot,
      setKey: `${p.set_name ?? p.monster_id}:${variant}`,
      setName,
      variant,
      monsterId: p.monster_id,
      monsterName,
      hasMonster: Boolean(monster),
      setIcon: p.set_icon || monster?.icon || null,
      monsterIcon: monster?.icon ?? null,
      rarity: p.rarity || steps[0].rarity,
      maxRarity: Math.max(p.max_rarity ?? 0, steps[steps.length - 1].rarity, p.rarity || 1),
      image,
      decoSlots: p.deco_slots ?? [],
      setBonus,
      comingSoon: p.status === 'not_in_game' || p.is_spoiler,
      statusReason: p.status_reason,
      notes: p.notes,
      steps,
    });
  }

  const setsByKey = new Map<string, LabSet>();
  for (const p of pieces) {
    let set = setsByKey.get(p.setKey);
    if (!set) {
      set = {
        key: p.setKey,
        name: p.setName,
        monsterId: p.monsterId,
        monsterName: p.monsterName,
        monsterIcon: p.monsterIcon,
        hasMonster: p.hasMonster,
        icon: p.setIcon,
        rarity: p.rarity,
        maxRarity: p.maxRarity,
        setBonus: p.setBonus,
        comingSoon: p.comingSoon,
        pieces: {},
      };
      setsByKey.set(p.setKey, set);
    }
    set.pieces[p.slot] = p;
    if (!set.icon && p.setIcon) set.icon = p.setIcon;
    set.rarity = Math.max(set.rarity, p.rarity);
    set.maxRarity = Math.max(set.maxRarity, p.maxRarity);
    if (!set.setBonus && p.setBonus) set.setBonus = p.setBonus;
    if (p.comingSoon) set.comingSoon = true;
  }
  const sets = [...setsByKey.values()].sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name));

  const maxRarity = pieces.reduce((m, p) => Math.max(m, p.maxRarity), 1);
  const minRarity = pieces.reduce((m, p) => Math.min(m, p.rarity), maxRarity);

  return {
    pieces,
    piecesById: new Map(pieces.map((p) => [p.id, p])),
    sets,
    setsByKey,
    skills,
    maxRarity,
    minRarity,
  };
}

// ── Rarity helpers ───────────────────────────────────────────

/** The rarity a piece is actually at when the hunter is at `rarity` */
export function clampRarity(piece: LabPiece, rarity: number): number {
  return Math.min(Math.max(rarity, piece.rarity), piece.maxRarity);
}

/** True when the piece starts above the hunter's rarity (not reachable yet) */
export function isAboveRarity(piece: Pick<LabPiece, 'rarity'>, rarity: number): boolean {
  return piece.rarity > rarity;
}

export function stepAt(piece: LabPiece, rarity: number): LabStep {
  const r = clampRarity(piece, rarity);
  let best = piece.steps[0];
  for (const s of piece.steps) {
    if (s.rarity <= r) best = s;
    else break;
  }
  return best;
}

export function skillsAt(piece: LabPiece, rarity: number): Record<string, number> {
  return stepAt(piece, rarity).skills;
}

export function defenceAt(piece: LabPiece, rarity: number): number | null {
  return stepAt(piece, rarity).defence;
}

/** Skill levels the piece still gains above `rarity`, with the rarity each arrives at */
export function upcomingUnlocks(piece: LabPiece, rarity: number) {
  const r = clampRarity(piece, rarity);
  return piece.steps
    .filter((s) => s.rarity > r && s.gained.length > 0)
    .map((s) => ({ rarity: s.rarity, gained: s.gained }));
}

/** Highest level of a skill on a piece (at its max rarity) and the rarity it is reached */
export function bestLevelOf(piece: LabPiece, skillKey: string): { level: number; atRarity: number | null } {
  let level = 0;
  let atRarity: number | null = null;
  for (const s of piece.steps) {
    const lv = s.skills[skillKey] ?? 0;
    if (lv > level) {
      level = lv;
      atRarity = s.rarity;
    }
  }
  return { level, atRarity };
}

// ── Builds ───────────────────────────────────────────────────

export interface LabBuildSlot {
  pieceId: string;
  /** Fixed rarity for this piece; when absent it follows the hunter's rarity */
  rarity?: number | null;
}

export type LabBuild = Partial<Record<LabSlot, LabBuildSlot>>;

export interface LabTarget {
  key: string;
  level: number;
}

export interface BuildSkillSource {
  kind: 'piece' | 'set';
  slot?: LabSlot;
  label: string;
  level: number;
}

export interface BuildSkillLine {
  key: string;
  name: string;
  category: string;
  /** Sum of every source */
  raw: number;
  /** Capped at the max level */
  level: number;
  max: number;
  sources: BuildSkillSource[];
}

export interface BuildSetLine {
  setKey: string;
  setName: string;
  count: number;
  needed: number;
  active: boolean;
  skillKey: string;
  skillName: string;
  level: number;
}

export interface BuildResult {
  skills: BuildSkillLine[];
  skillLevel: Record<string, number>;
  sets: BuildSetLine[];
  defence: number;
  pieceCount: number;
  rarityBySlot: Partial<Record<LabSlot, number>>;
}

export function rarityForSlot(data: LabData, build: LabBuild, slot: LabSlot, myRarity: number): number | null {
  const entry = build[slot];
  const piece = entry ? data.piecesById.get(entry.pieceId) : undefined;
  if (!piece) return null;
  return clampRarity(piece, entry?.rarity ?? myRarity);
}

export function computeBuild(data: LabData, build: LabBuild, myRarity: number): BuildResult {
  const lines = new Map<string, BuildSkillLine>();
  const add = (key: string, level: number, source: BuildSkillSource) => {
    if (level <= 0) return;
    let line = lines.get(key);
    if (!line) {
      const meta = data.skills.get(key);
      line = {
        key,
        name: meta?.name ?? key,
        category: meta?.category ?? 'Other',
        raw: 0,
        level: 0,
        max: meta?.maxLevel ?? 5,
        sources: [],
      };
      lines.set(key, line);
    }
    line.raw += level;
    line.sources.push(source);
  };

  let defence = 0;
  let pieceCount = 0;
  const rarityBySlot: BuildResult['rarityBySlot'] = {};
  const setCounts = new Map<string, { count: number; piece: LabPiece }>();

  for (const { id: slot, label } of LAB_SLOTS) {
    const entry = build[slot];
    const piece = entry ? data.piecesById.get(entry.pieceId) : undefined;
    if (!piece) continue;
    pieceCount++;
    const r = clampRarity(piece, entry?.rarity ?? myRarity);
    rarityBySlot[slot] = r;
    const step = stepAt(piece, r);
    defence += step.defence ?? 0;
    for (const [key, lv] of Object.entries(step.skills)) {
      add(key, lv, { kind: 'piece', slot, label, level: lv });
    }
    const cur = setCounts.get(piece.setKey);
    setCounts.set(piece.setKey, { count: (cur?.count ?? 0) + 1, piece: cur?.piece ?? piece });
  }

  const sets: BuildSetLine[] = [];
  for (const [setKey, { count, piece }] of setCounts) {
    const bonus = data.setsByKey.get(setKey)?.setBonus ?? piece.setBonus;
    if (!bonus) continue;
    const active = count >= bonus.pieces;
    const skillName = data.skills.get(bonus.skillKey)?.name ?? bonus.skillKey;
    sets.push({
      setKey,
      setName: piece.setName,
      count,
      needed: bonus.pieces,
      active,
      skillKey: bonus.skillKey,
      skillName,
      level: bonus.level,
    });
    if (active) {
      add(bonus.skillKey, bonus.level, { kind: 'set', label: `${piece.setName} set bonus`, level: bonus.level });
    }
  }

  const skills = [...lines.values()];
  const skillLevel: Record<string, number> = {};
  for (const l of skills) {
    l.level = Math.min(l.raw, l.max);
    skillLevel[l.key] = l.level;
  }
  skills.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  sets.sort((a, b) => Number(b.active) - Number(a.active) || b.count - a.count);

  return { skills, skillLevel, sets, defence, pieceCount, rarityBySlot };
}

export interface BuildDiff {
  skills: Array<{ key: string; name: string; from: number; to: number }>;
  defence: number;
}

export function diffBuilds(a: BuildResult, b: BuildResult): BuildDiff {
  const keys = new Set([...Object.keys(a.skillLevel), ...Object.keys(b.skillLevel)]);
  const names = new Map<string, string>();
  for (const l of [...a.skills, ...b.skills]) names.set(l.key, l.name);
  const skills: BuildDiff['skills'] = [];
  for (const key of keys) {
    const from = a.skillLevel[key] ?? 0;
    const to = b.skillLevel[key] ?? 0;
    if (from !== to) skills.push({ key, name: names.get(key) ?? key, from, to });
  }
  skills.sort((x, y) => y.to - y.from - (x.to - x.from) || x.name.localeCompare(y.name));
  return { skills, defence: b.defence - a.defence };
}

/** How far a build is towards the hunter's wanted skills */
export function targetProgress(result: BuildResult, targets: LabTarget[]) {
  return targets.map((t) => {
    const have = result.skillLevel[t.key] ?? 0;
    return { ...t, have: Math.min(have, t.level), met: have >= t.level };
  });
}

/** Sum of wanted levels the build reaches (each capped at its target) */
export function targetScore(result: BuildResult, targets: LabTarget[]): number {
  return targets.reduce((sum, t) => sum + Math.min(result.skillLevel[t.key] ?? 0, t.level), 0);
}

// ── Sharing ──────────────────────────────────────────────────

/** Build → compact URL query (`p=helm.chest.arms.coil.greaves&o=..&r=8`) */
export function encodeBuild(build: LabBuild, myRarity: number | null): string {
  const p = LAB_SLOTS.map((s) => build[s.id]?.pieceId ?? '').join('.');
  const o = LAB_SLOTS.map((s) => build[s.id]?.rarity ?? '').join('.');
  const parts = [`p=${encodeURIComponent(p).replace(/%2E/gi, '.')}`];
  if (o.replace(/\./g, '')) parts.push(`o=${o}`);
  if (myRarity) parts.push(`r=${myRarity}`);
  return parts.join('&');
}

export function decodeBuild(search: URLSearchParams): { build: LabBuild; rarity: number | null } | null {
  const p = search.get('p');
  if (!p) return null;
  const ids = p.split(/[.,]/);
  const overrides = (search.get('o') ?? '').split(/[.,]/);
  const build: LabBuild = {};
  LAB_SLOTS.forEach((s, i) => {
    const id = ids[i]?.trim();
    if (!id) return;
    const o = Number(overrides[i]);
    build[s.id] = { pieceId: id, rarity: Number.isFinite(o) && o > 0 ? o : null };
  });
  const r = Number(search.get('r'));
  return { build, rarity: Number.isFinite(r) && r > 0 ? r : null };
}

/**
 * Most levels of a skill armour alone could give (best piece per slot plus
 * matching set bonuses, at max rarity, capped at the skill's max level).
 * An upper bound — handy as a sensible default target.
 */
export function armourCap(data: LabData, skillKey: string): number {
  let total = 0;
  for (const { id } of LAB_SLOTS) {
    let best = 0;
    for (const p of data.pieces) if (p.slot === id) best = Math.max(best, bestLevelOf(p, skillKey).level);
    total += best;
  }
  const seen = new Set<string>();
  for (const set of data.sets) {
    if (set.setBonus?.skillKey === skillKey && !seen.has(set.key)) {
      seen.add(set.key);
      total += set.setBonus.level;
    }
  }
  return Math.min(total, data.skills.get(skillKey)?.maxLevel ?? total);
}

/** Rarities at which a skill's level changes on a piece, e.g. [{R5 Lv1}, {R9 Lv2}] */
export function skillTimeline(piece: LabPiece, skillKey: string): Array<{ rarity: number; level: number }> {
  const out: Array<{ rarity: number; level: number }> = [];
  let prev = 0;
  for (const s of piece.steps) {
    const lv = s.skills[skillKey] ?? 0;
    if (lv !== prev) out.push({ rarity: s.rarity, level: lv });
    prev = lv;
  }
  return out;
}

/** Every skill a piece ever gets, in the order it unlocks them */
export function pieceSkillKeys(piece: LabPiece): string[] {
  const order: string[] = [];
  for (const s of piece.steps) for (const k of Object.keys(s.skills)) if (!order.includes(k)) order.push(k);
  return order;
}
