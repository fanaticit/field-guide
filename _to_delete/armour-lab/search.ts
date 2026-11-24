// ─────────────────────────────────────────────────────────────
// Armour Lab — set searcher used by armour v3.
//
// Finds the 5-piece combinations that reach the most of the wanted skill
// levels at a given rarity. Pieces that add nothing to the wanted skills
// are left as "free slots" — the hunter can put anything there, and the
// page suggests what fits best.
//
// Depth-first search with branch-and-bound pruning: a branch is dropped
// when even its best possible finish cannot beat the current top results.
// ─────────────────────────────────────────────────────────────
import {
  LAB_SLOTS,
  computeBuild,
  defenceAt,
  diffBuilds,
  isAboveRarity,
  skillsAt,
  targetScore,
  type BuildResult,
  type LabBuild,
  type LabData,
  type LabPiece,
  type LabSlot,
  type LabTarget,
} from './logic';

export interface SearchOptions {
  targets: LabTarget[];
  rarity: number;
  /** Also use armour that starts above the hunter's rarity */
  allowAbove: boolean;
  /** Slots the hunter wants to keep as they are */
  locked?: LabBuild;
  maxResults?: number;
  /** Safety cap on the number of combinations looked at */
  maxNodes?: number;
}

export interface SearchHit {
  build: LabBuild;
  result: BuildResult;
  score: number;
  maxScore: number;
  met: number;
  freeSlots: LabSlot[];
}

export interface SearchOutcome {
  hits: SearchHit[];
  explored: number;
  truncated: boolean;
}

interface Cand {
  piece: LabPiece | null;
  vec: number[];
  bonusSet: string | null;
}

export function searchBuilds(data: LabData, opts: SearchOptions): SearchOutcome {
  const { targets, rarity } = opts;
  const K = opts.maxResults ?? 20;
  const maxNodes = opts.maxNodes ?? 2_000_000;
  const T = targets.length;
  if (T === 0) return { hits: [], explored: 0, truncated: false };
  const keyIndex = new Map(targets.map((t, i) => [t.key, i]));
  const maxScore = targets.reduce((n, t) => n + t.level, 0);

  // Set bonuses that give a wanted skill
  const bonusOf = new Map<string, { idx: number; pieces: number; level: number }>();
  for (const set of data.sets) {
    const b = set.setBonus;
    if (b && keyIndex.has(b.skillKey)) bonusOf.set(set.key, { idx: keyIndex.get(b.skillKey)!, pieces: b.pieces, level: b.level });
  }

  const vecOf = (p: LabPiece) => {
    const sk = skillsAt(p, rarity);
    return targets.map((t) => Math.min(sk[t.key] ?? 0, t.level));
  };

  // Candidates per slot
  const slots = LAB_SLOTS.map(({ id }) => {
    const locked = opts.locked?.[id];
    if (locked) {
      const p = data.piecesById.get(locked.pieceId);
      if (p) return { id, cands: [{ piece: p, vec: vecOf(p), bonusSet: bonusOf.has(p.setKey) ? p.setKey : null }] as Cand[] };
    }
    const contributors: Cand[] = [];
    for (const p of data.pieces) {
      if (p.slot !== id) continue;
      if (!opts.allowAbove && isAboveRarity(p, rarity)) continue;
      const vec = vecOf(p);
      const bonusSet = bonusOf.has(p.setKey) ? p.setKey : null;
      if (vec.some((v) => v > 0) || bonusSet) contributors.push({ piece: p, vec, bonusSet });
    }
    // Drop pieces another piece beats on every wanted skill (only when set bonuses don't matter)
    const def = (c: Cand) => defenceAt(c.piece!, rarity) ?? 0;
    const beats = (b: Cand, a: Cand) => {
      if (b === a || b.bonusSet !== null) return false;
      if (!b.vec.every((v, i) => v >= a.vec[i])) return false;
      if (b.vec.some((v, i) => v > a.vec[i])) return true;
      return def(b) > def(a) || (def(b) === def(a) && b.piece!.id < a.piece!.id);
    };
    const kept = contributors.filter((a) => a.bonusSet !== null || !contributors.some((b) => beats(b, a)));
    kept.sort((a, b) => b.vec.reduce((s, v) => s + v, 0) - a.vec.reduce((s, v) => s + v, 0));
    kept.push({ piece: null, vec: new Array(T).fill(0), bonusSet: null });
    return { id, cands: kept };
  }).sort((a, b) => a.cands.length - b.cands.length);

  // Best each remaining slot could add, per wanted skill (for the bound)
  const remMax: number[][] = [];
  for (let i = slots.length; i >= 0; i--) {
    const next = i < slots.length ? slots[i].cands.reduce((m, c) => m.map((v, j) => Math.max(v, c.vec[j])), new Array(T).fill(0)) : new Array(T).fill(0);
    remMax[i] = i === slots.length ? next : remMax[i + 1].map((v, j) => v + next[j]);
  }
  const bonusMax = new Array(T).fill(0);
  for (const b of bonusOf.values()) bonusMax[b.idx] += b.level;

  const top: Array<{ score: number; free: number; picks: Array<Cand> }> = [];
  const worst = () => (top.length < K ? -1 : top[top.length - 1].score);
  const sums = new Array(T).fill(0);
  const setCount = new Map<string, number>();
  const picks: Cand[] = [];
  let explored = 0;
  let truncated = false;

  const scoreNow = () => {
    const lv = sums.slice();
    for (const [setKey, n] of setCount) {
      const b = bonusOf.get(setKey);
      if (b && n >= b.pieces) lv[b.idx] += b.level;
    }
    return lv.reduce((s, v, i) => s + Math.min(v, targets[i].level), 0);
  };

  const dfs = (i: number) => {
    if (truncated) return;
    if (++explored > maxNodes) {
      truncated = true;
      return;
    }
    if (i === slots.length) {
      const score = scoreNow();
      const free = picks.filter((p) => p.piece === null).length;
      if (score <= 0) return;
      const w = worst();
      if (top.length >= K && (score < w || (score === w && free <= top[top.length - 1].free))) return;
      top.push({ score, free, picks: picks.slice() });
      top.sort((a, b) => b.score - a.score || b.free - a.free);
      if (top.length > K) top.pop();
      return;
    }
    // Bound
    let bound = 0;
    for (let j = 0; j < T; j++) bound += Math.min(targets[j].level, sums[j] + remMax[i][j] + bonusMax[j]);
    if (top.length >= K && bound < worst()) return;

    for (const c of slots[i].cands) {
      for (let j = 0; j < T; j++) sums[j] += c.vec[j];
      if (c.bonusSet) setCount.set(c.bonusSet, (setCount.get(c.bonusSet) ?? 0) + 1);
      picks.push(c);
      dfs(i + 1);
      picks.pop();
      if (c.bonusSet) setCount.set(c.bonusSet, setCount.get(c.bonusSet)! - 1);
      for (let j = 0; j < T; j++) sums[j] -= c.vec[j];
    }
  };
  dfs(0);

  const hits: SearchHit[] = top.map((t) => {
    const build: LabBuild = {};
    const freeSlots: LabSlot[] = [];
    t.picks.forEach((c, i) => {
      const slot = slots[i].id;
      if (c.piece) build[slot] = { pieceId: c.piece.id, rarity: opts.locked?.[slot]?.rarity ?? null };
      else freeSlots.push(slot);
    });
    const result = computeBuild(data, build, rarity);
    const met = targets.filter((tg) => (result.skillLevel[tg.key] ?? 0) >= tg.level).length;
    return { build, result, score: targetScore(result, targets), maxScore, met, freeSlots };
  });
  hits.sort((a, b) => b.score - a.score || b.freeSlots.length - a.freeSlots.length || b.result.defence - a.result.defence);
  return { hits, explored, truncated };
}

/** Pieces for a free slot that add the most other skills without costing any wanted level */
export function freeSlotFillers(data: LabData, build: LabBuild, slot: LabSlot, rarity: number, targets: LabTarget[], allowAbove: boolean, limit = 6) {
  const base = computeBuild(data, build, rarity);
  const baseScore = targetScore(base, targets);
  const out = [];
  for (const p of data.pieces) {
    if (p.slot !== slot) continue;
    if (!allowAbove && isAboveRarity(p, rarity)) continue;
    const after = computeBuild(data, { ...build, [slot]: { pieceId: p.id, rarity: null } }, rarity);
    if (targetScore(after, targets) < baseScore) continue;
    const d = diffBuilds(base, after);
    const gains = d.skills.filter((s) => s.to > s.from);
    const extra = gains.reduce((n, s) => n + s.to - s.from, 0);
    out.push({ piece: p, gains, extra, defence: defenceAt(p, rarity) ?? 0 });
  }
  out.sort((a, b) => b.extra - a.extra || b.defence - a.defence);
  return out.slice(0, limit);
}

/** Lowest rarity at which every wanted skill can be reached (null if never) */
export function lowestRarityForAll(data: LabData, opts: Omit<SearchOptions, 'rarity'>, from: number): number | null {
  const full = (r: number) => {
    const res = searchBuilds(data, { ...opts, rarity: r, maxResults: 1, maxNodes: 300_000 });
    return res.hits[0] && res.hits[0].score === res.hits[0].maxScore;
  };
  if (!full(data.maxRarity)) return null;
  let lo = from + 1;
  let hi = data.maxRarity;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (full(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
