// ─────────────────────────────────────────────────────────────
// guestCollections — collections saved in the browser while logged out
//
// Logged-out visitors' Visage, Buddy and Adventurer collections live in
// localStorage (this browser only). After they log in, mergeGuestCollections()
// copies anything there into their account, keeping whichever entry is better
// when the account already has the same item, then clears the browser copy.
//
// FAIL-SAFE RULES (please keep these if you change this file):
//  • Nothing here may throw to the caller or block login / sign-up.
//  • The browser copy is only cleared after its rows are safely written.
//    Until then the collection hooks keep showing it on top of account data.
//  • One bad item (e.g. a card later removed from the site, so the database
//    rejects it) must not block the rest: failed batches are retried row by row.
//  • A backup of whatever was cleared is kept in the browser for 30 days.
//  • Browser data we can't read (e.g. an old or future format) is left untouched.
// ─────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import { clampBuddyTierLevel } from '../data/schemas/buddy';
import { clampInsightLevel } from '../data/schemas/adventurer';

export const GUEST_STORAGE_KEYS = {
  visage: 'mho_visage_user_collection_v2',
  buddy: 'field-guide-user-buddy-collection',
  adventurer: 'field-guide-user-adventurer-collection',
  adventurerInsight: 'field-guide-user-adventurer-insight',
} as const;

/** Fired on window whenever a browser copy changes outside its hook, so hooks reload it. */
export const GUEST_COLLECTIONS_CHANGED_EVENT = 'fg:guest-collections-changed';

export type GuestCollectionKind = 'visage' | 'buddy' | 'adventurer';

const BACKUP_SUFFIX = '__imported_backup';
const BACKUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

// ── Small safe helpers ───────────────────────────────────────
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function readGuestJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeKey(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

function notifyChanged() {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(GUEST_COLLECTIONS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Keep a raw copy of browser data before clearing it, so nothing is ever lost outright. */
function backupThenClear(...keys: string[]) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) writeKey(key + BACKUP_SUFFIX, { savedAt: Date.now(), raw });
    } catch {
      /* storage unavailable */
    }
    removeKey(key);
  }
}

function pruneOldBackups() {
  for (const key of Object.values(GUEST_STORAGE_KEYS)) {
    const b = readGuestJson<{ savedAt?: number }>(key + BACKUP_SUFFIX);
    if (b && (!b.savedAt || Date.now() - b.savedAt > BACKUP_MAX_AGE_MS)) removeKey(key + BACKUP_SUFFIX);
  }
}

function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ── Reading the browser copies (validated) ───────────────────
const RARITY_RANK: Record<string, number> = { fine: 0, rare: 1, epic: 2, superior: 3 };

export interface GuestVisageEntry {
  rarity: 'fine' | 'rare' | 'epic' | 'superior';
  quantity: number;
}

/** Valid browser-saved Visage entries keyed by `${visageId}:${ink}`. Invalid entries are ignored. */
export function readGuestVisages(): Record<string, GuestVisageEntry> {
  const raw = readGuestJson<unknown>(GUEST_STORAGE_KEYS.visage);
  const out: Record<string, GuestVisageEntry> = {};
  if (!isPlainObject(raw)) return out;
  for (const [key, entry] of Object.entries(raw)) {
    const split = key.lastIndexOf(':');
    if (split <= 0 || split === key.length - 1 || !isPlainObject(entry)) continue;
    const rarity = String(entry.rarity ?? '');
    if (!(rarity in RARITY_RANK)) continue;
    out[key.slice(0, split) + ':' + key.slice(split + 1).toLowerCase()] = {
      rarity: rarity as GuestVisageEntry['rarity'],
      quantity: Math.min(5, Math.max(1, Number(entry.quantity) || 1)),
    };
  }
  return out;
}

/** Valid browser-saved Buddy tiers keyed by buddy id. */
export function readGuestBuddies(): Record<string, number> {
  const raw = readGuestJson<unknown>(GUEST_STORAGE_KEYS.buddy);
  const out: Record<string, number> = {};
  if (!isPlainObject(raw)) return out;
  for (const [id, entry] of Object.entries(raw)) {
    if (!id) continue;
    out[id] = clampBuddyTierLevel(isPlainObject(entry) ? Number(entry.tier_level) || 0 : 0);
  }
  return out;
}

/** Valid browser-saved Adventurer insight levels keyed by adventurer id (recruited = at least 1). */
export function readGuestAdventurers(): Record<string, number> {
  const set = readGuestJson<unknown>(GUEST_STORAGE_KEYS.adventurer);
  const insight = readGuestJson<unknown>(GUEST_STORAGE_KEYS.adventurerInsight);
  const out: Record<string, number> = {};
  if (Array.isArray(set)) for (const id of set) if (typeof id === 'string' && id) out[id] = 1;
  if (isPlainObject(insight)) for (const [id, lvl] of Object.entries(insight)) if (id) out[id] = clampInsightLevel(lvl);
  return out;
}

/** True when `a` is a better Visage entry than `b` (higher rarity, then more copies). */
export function isBetterVisage(a: GuestVisageEntry, b: { rarity: string; quantity?: number | null } | undefined | null) {
  if (!b) return true;
  const ra = RARITY_RANK[a.rarity] ?? -1;
  const rb = RARITY_RANK[b.rarity] ?? -1;
  return ra > rb || (ra === rb && a.quantity > (b.quantity ?? 1));
}

/** Number of items saved in this browser for each collection. */
export function countGuestItems(): Record<GuestCollectionKind, number> {
  return {
    visage: Object.keys(readGuestVisages()).length,
    buddy: Object.keys(readGuestBuddies()).length,
    adventurer: Object.keys(readGuestAdventurers()).length,
  };
}

export function hasGuestItems(): boolean {
  try {
    const c = countGuestItems();
    return c.visage + c.buddy + c.adventurer > 0;
  } catch {
    return false;
  }
}

/**
 * Drop one item from a browser copy. Used when a signed-in user edits an item that is
 * still waiting to be imported, so their edit (now in the account) wins.
 */
export function forgetGuestItem(kind: GuestCollectionKind, id: string) {
  try {
    if (kind === 'adventurer') {
      const set = readGuestJson<unknown>(GUEST_STORAGE_KEYS.adventurer);
      const insight = readGuestJson<unknown>(GUEST_STORAGE_KEYS.adventurerInsight);
      let changed = false;
      if (Array.isArray(set) && set.includes(id)) {
        writeKey(GUEST_STORAGE_KEYS.adventurer, set.filter((x) => x !== id));
        changed = true;
      }
      if (isPlainObject(insight) && id in insight) {
        const { [id]: _drop, ...rest } = insight;
        writeKey(GUEST_STORAGE_KEYS.adventurerInsight, rest);
        changed = true;
      }
      if (changed) notifyChanged();
      return;
    }
    const key = kind === 'visage' ? GUEST_STORAGE_KEYS.visage : GUEST_STORAGE_KEYS.buddy;
    const data = readGuestJson<unknown>(key);
    if (isPlainObject(data) && id in data) {
      const { [id]: _drop, ...rest } = data;
      writeKey(key, rest);
      notifyChanged();
    }
  } catch {
    /* never let this break an edit */
  }
}

// ── Writing to the account ───────────────────────────────────
type Row = Record<string, unknown>;

interface UpsertOutcome {
  written: number;
  skipped: number;
}

/**
 * Upsert rows as one batch; if the batch is rejected, retry row by row so one bad row
 * (e.g. an item since removed from the site) can't block the rest.
 * Throws only when nothing at all could be written (likely an outage or schema change),
 * so the browser copy is kept for a later retry.
 */
async function upsertResilient(table: string, rows: Row[], onConflict: string): Promise<UpsertOutcome> {
  if (rows.length === 0) return { written: 0, skipped: 0 };
  const batch = await withTimeout(supabase.from(table).upsert(rows, { onConflict }), `${table} upsert`);
  if (!batch.error) return { written: rows.length, skipped: 0 };

  let written = 0;
  let lastError: unknown = batch.error;
  for (const row of rows) {
    try {
      const single = await withTimeout(supabase.from(table).upsert(row, { onConflict }), `${table} row upsert`);
      if (single.error) lastError = single.error;
      else written++;
    } catch (e) {
      lastError = e;
    }
  }
  if (written === 0) throw lastError;
  console.warn(`${table}: skipped ${rows.length - written} item(s) the database rejected`, lastError);
  return { written, skipped: rows.length - written };
}

async function selectRows<T>(table: string, columns: string, userId: string): Promise<T[]> {
  const res = await withTimeout(supabase.from(table).select(columns).eq('user_id', userId), `${table} select`);
  if (res.error) throw res.error;
  return (res.data ?? []) as T[];
}

// ── Per-collection imports ───────────────────────────────────
async function importVisages(userId: string): Promise<UpsertOutcome> {
  const local = readGuestVisages();
  if (Object.keys(local).length === 0) return { written: 0, skipped: 0 }; // nothing readable: leave it alone
  const existingRows = await selectRows<{ visage_id: string; ink_type: string | null; rarity: string; quantity: number | null }>(
    'user_visage_collection',
    'visage_id, ink_type, rarity, quantity',
    userId,
  );
  const existing = new Map(existingRows.map((r) => [`${r.visage_id}:${(r.ink_type || 'flames').toLowerCase()}`, r]));

  const now = new Date().toISOString();
  const rows: Row[] = [];
  for (const [key, entry] of Object.entries(local)) {
    if (!isBetterVisage(entry, existing.get(key))) continue;
    const split = key.lastIndexOf(':');
    rows.push({
      user_id: userId,
      visage_id: key.slice(0, split),
      ink_type: key.slice(split + 1),
      rarity: entry.rarity,
      quantity: entry.quantity,
      updated_at: now,
    });
  }
  const outcome = await upsertResilient('user_visage_collection', rows, 'user_id,visage_id,ink_type');
  backupThenClear(GUEST_STORAGE_KEYS.visage);
  return outcome;
}

async function importBuddies(userId: string): Promise<UpsertOutcome> {
  const local = readGuestBuddies();
  if (Object.keys(local).length === 0) return { written: 0, skipped: 0 }; // nothing readable: leave it alone
  // tier_level may not exist in every environment; fall back to ownership only
  let hasTier = true;
  let existingRows: Array<{ buddy_id: string; tier_level?: number | null }>;
  try {
    existingRows = await selectRows('user_buddy_collection', 'buddy_id, tier_level', userId);
  } catch {
    hasTier = false;
    existingRows = await selectRows('user_buddy_collection', 'buddy_id', userId);
  }
  const existing = new Map(existingRows.map((r) => [r.buddy_id, r.tier_level ?? 0]));

  const now = new Date().toISOString();
  const rows: Row[] = [];
  for (const [buddyId, tier] of Object.entries(local)) {
    if (existing.has(buddyId) && (!hasTier || existing.get(buddyId)! >= tier)) continue;
    rows.push(
      hasTier
        ? { user_id: userId, buddy_id: buddyId, tier_level: tier, quantity: 1, updated_at: now }
        : { user_id: userId, buddy_id: buddyId, quantity: 1, updated_at: now },
    );
  }
  const outcome = await upsertResilient('user_buddy_collection', rows, 'user_id,buddy_id');
  backupThenClear(GUEST_STORAGE_KEYS.buddy);
  return outcome;
}

async function importAdventurers(userId: string): Promise<UpsertOutcome> {
  const local = readGuestAdventurers();
  if (Object.keys(local).length === 0) return { written: 0, skipped: 0 }; // nothing readable: leave it alone
  let hasInsight = true;
  let existingRows: Array<{ adventurer_id: string; insight_level?: number | null }>;
  try {
    existingRows = await selectRows('user_adventurer_collection', 'adventurer_id, insight_level', userId);
  } catch {
    hasInsight = false;
    existingRows = await selectRows('user_adventurer_collection', 'adventurer_id', userId);
  }
  const existing = new Map(existingRows.map((r) => [r.adventurer_id, clampInsightLevel(r.insight_level ?? 1)]));

  const now = new Date().toISOString();
  const rows: Row[] = [];
  for (const [id, level] of Object.entries(local)) {
    if (existing.has(id) && (!hasInsight || existing.get(id)! >= level)) continue;
    rows.push(
      hasInsight
        ? { user_id: userId, adventurer_id: id, insight_level: level, updated_at: now }
        : { user_id: userId, adventurer_id: id, updated_at: now },
    );
  }
  const outcome = await upsertResilient('user_adventurer_collection', rows, 'user_id,adventurer_id');
  backupThenClear(GUEST_STORAGE_KEYS.adventurer, GUEST_STORAGE_KEYS.adventurerInsight);
  return outcome;
}

export interface GuestMergeResult {
  /** Items added to (or improved in) the account, per collection. */
  added: Record<GuestCollectionKind, number>;
  /** Items the database rejected (e.g. no longer on the site). A backup is kept in the browser. */
  skipped: number;
  /** Collections that could not be copied at all; their browser copy is kept for a retry. */
  failed: GuestCollectionKind[];
}

/**
 * Copy every browser-saved collection into the signed-in account.
 * Never throws. Each collection is handled separately; a collection that fails
 * keeps its browser copy (still shown on the pages) and is retried later.
 */
export async function mergeGuestCollections(userId: string): Promise<GuestMergeResult> {
  const result: GuestMergeResult = { added: { visage: 0, buddy: 0, adventurer: 0 }, skipped: 0, failed: [] };
  try {
    pruneOldBackups();
  } catch {
    /* ignore */
  }
  const jobs: Array<[GuestCollectionKind, (id: string) => Promise<UpsertOutcome>]> = [
    ['visage', importVisages],
    ['buddy', importBuddies],
    ['adventurer', importAdventurers],
  ];
  for (const [kind, job] of jobs) {
    try {
      const { written, skipped } = await job(userId);
      result.added[kind] = written;
      result.skipped += skipped;
    } catch (err) {
      console.warn(`Could not copy browser ${kind} collection to account (kept in browser, will retry)`, err);
      result.failed.push(kind);
    }
  }
  notifyChanged();
  return result;
}
