// ─────────────────────────────────────────────────────────────
// publicData.ts — Read-only access to the PUBLIC game data that
// the reference pages (/monsters, /weapons, /adventurers, /buddies,
// /visages) are built from.
//
// • Used at build time (pre-rendering) and in the browser for
//   client-side navigation between reference pages.
// • Uses its own anonymous Supabase client with no session, so it can
//   never see or return user data (collections, challenges, profile…).
// • Only active, non-spoiler, non-debug rows are ever returned, so
//   content gated behind "Show Spoilers" never ends up in static HTML.
// ─────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────

export type DataKind = 'monsters' | 'weapons' | 'adventurers' | 'buddies' | 'visages';

type Row = Record<string, unknown>;

export interface IndexEntry {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  /** Short facts shown under the name on index pages */
  facts: string[];
  /** Grouping label on index pages (species, weapon type, role…) */
  group: string;
}

export interface LinkRef {
  name: string;
  slug: string;
}

export interface MonsterPage {
  kind: 'monster';
  fetchedAt: string;
  slug: string;
  monster: {
    id: string;
    name: string;
    name_ja: string | null;
    species: string | null;
    tier: string | null;
    elements: string[];
    weaknesses: string[];
    icon: string | null;
    is_variant: boolean;
    is_radiant: boolean;
  };
  parent: LinkRef | null;
  variants: LinkRef[];
  hitzones: {
    part: string;
    state: string | null;
    cut: number;
    impact: number;
    shot: number;
    fire: number;
    water: number;
    thunder: number;
    ice: number;
    dragon: number;
    weak_point_stars: number;
  }[];
  levels: {
    content: string;
    hunt_difficulty: number | null;
    monster_level: number | null;
    suggested_hunt_power: number | null;
    health: number;
    attack: number;
  }[];
  weapons: (LinkRef & { weapon_type_id: string; element_type: string | null; rarity: number | null })[];
  visages: LinkRef[];
  armourSets: { name: string; variant: string | null; slots: string[] }[];
}

export interface WeaponPage {
  kind: 'weapon';
  fetchedAt: string;
  slug: string;
  weapon: {
    id: string;
    name: string;
    name_ja: string | null;
    max_name: string | null;
    weapon_type_id: string;
    series: string | null;
    source_type: string | null;
    source_detail: string | null;
    element_type: string | null;
    element_damage: number | null;
    attack: number | null;
    affinity: number | null;
    sharpness: string | null;
    deco_slots: number[];
    rarity: number | null;
    max_rarity: number | null;
    is_apex: boolean;
    apex_season: string | null;
    image: string | null;
    description: string | null;
  };
  monster: LinkRef | null;
  upgrades: {
    rarity: number;
    name: string | null;
    attack: number | null;
    affinity: number | null;
    element_type: string | null;
    element_damage: number | null;
    required_level: number | null;
  }[];
}

export interface AdventurerPage {
  kind: 'adventurer';
  fetchedAt: string;
  slug: string;
  adventurer: {
    id: string;
    name: string;
    name_ja: string | null;
    title: string | null;
    image: string | null;
    weapon_type: string | null;
    allowed_weapon_types: string[];
    element_specialization: string | null;
    role: string | null;
    rarity: string | null;
    description: string | null;
    playstyle: string | null;
    default_buddy: string | null;
    traits: { name: string; description: string }[];
    status: string | null;
    status_reason: string | null;
  };
  skills: { name: string; skill_type: string | null; description: string | null }[];
  defaultBuddy: LinkRef | null;
}

export interface BuddyPage {
  kind: 'buddy';
  fetchedAt: string;
  slug: string;
  buddy: {
    id: string;
    name: string;
    name_ja: string | null;
    tier: string | null;
    role: string | null;
    species: string | null;
    core_passive: string | null;
    description: string | null;
    image: string | null;
    status: string | null;
    status_reason: string | null;
  };
  skills: { kind: string; name: string; description: string | null }[];
  defaultOf: LinkRef | null;
}

export interface VisagePage {
  kind: 'visage';
  fetchedAt: string;
  slug: string;
  visage: {
    id: string;
    name: string;
    name_ja: string | null;
    monster_type: string | null;
    points: number | null;
    max_levels: number[];
    ink_types: string[];
    core_effect: string | null;
    status: string | null;
    status_reason: string | null;
  };
  monster: (LinkRef & { icon: string | null }) | null;
}

export type DetailPage = MonsterPage | WeaponPage | AdventurerPage | BuddyPage | VisagePage;

// ── Helpers ───────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'item';
}

/**
 * Gives every row a URL slug based on its name. When two rows share a
 * name, the one with the lowest id keeps the plain slug and the others
 * get "-<id>" added, so slugs are stable and unique.
 */
export function assignSlugs<T extends { id: string; name: string }>(rows: T[]): Map<string, string> {
  const byBase = new Map<string, T[]>();
  for (const row of rows) {
    const base = slugify(row.name);
    const list = byBase.get(base) ?? [];
    list.push(row);
    byBase.set(base, list);
  }
  const slugs = new Map<string, string>();
  for (const [base, list] of byBase) {
    list
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))
      .forEach((row, i) => slugs.set(String(row.id), i === 0 ? base : `${base}-${slugify(String(row.id))}`));
  }
  return slugs;
}

const str = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v));
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const arr = <T = string>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const bool = (v: unknown): boolean => v === true || v === 'true';

/** Public visibility rules — mirror the logged-out view of the site. */
const IS_PUBLIC: Record<string, (r: Row) => boolean> = {
  monsters: (r) => bool(r.is_active),
  weapons: (r) => bool(r.is_active) && !bool(r.is_spoiler),
  adventurers: (r) => bool(r.is_active) && !bool(r.is_spoiler) && !bool(r.is_debug),
  buddies: (r) => bool(r.is_active) && !bool(r.is_spoiler) && !bool(r.is_debug),
  visages: (r) => bool(r.is_active) && !bool(r.is_spoiler),
  armour_pieces: (r) => r.is_active !== false && !bool(r.is_spoiler),
};

/** Server-side filters matching IS_PUBLIC, so less data crosses the wire. */
const PUBLIC_FILTERS: Record<string, [string, unknown][]> = {
  monsters: [['is_active', true]],
  weapons: [['is_active', true], ['is_spoiler', false]],
  adventurers: [['is_active', true], ['is_spoiler', false]],
  buddies: [['is_active', true], ['is_spoiler', false]],
  visages: [['is_active', true], ['is_spoiler', false]],
  armour_pieces: [['is_spoiler', false]],
};

const sortRows = (rows: Row[]) =>
  rows.slice().sort(
    (a, b) =>
      (num(a.sort_order) ?? 9999) - (num(b.sort_order) ?? 9999) ||
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
  );

function titleCase(v: string | null): string {
  if (!v) return '';
  return v.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const WEAPON_TYPE_NAMES: Record<string, string> = {
  great_sword: 'Great Sword',
  long_sword: 'Long Sword',
  sword_shield: 'Sword & Shield',
  dual_blades: 'Dual Blades',
  hammer: 'Hammer',
  hunting_horn: 'Hunting Horn',
  lance: 'Lance',
  gunlance: 'Gunlance',
  switch_axe: 'Switch Axe',
  charge_blade: 'Charge Blade',
  insect_glaive: 'Insect Glaive',
  light_bowgun: 'Light Bowgun',
  heavy_bowgun: 'Heavy Bowgun',
  bow: 'Bow',
};

export function weaponTypeName(id: string | null | undefined): string {
  if (!id) return 'Unknown';
  return WEAPON_TYPE_NAMES[id] ?? titleCase(id);
}

export function labelOf(v: string | null | undefined): string {
  return titleCase(v ?? null);
}

// ── Data source ───────────────────────────────────────────────

const BROWSER_CACHE_MS = 5 * 60 * 1000;

interface QueryOptions {
  select?: string;
  eq?: [string, unknown][];
}

export class PublicDataSource {
  private memo = new Map<string, { at: number; promise: Promise<unknown> }>();
  private client: SupabaseClient;
  /** Bulk mode loads whole tables once (build time); otherwise rows are queried individually (browser). */
  private bulk: boolean;

  constructor(url: string, anonKey: string, options: { bulk: boolean }) {
    this.client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'fg-public-data',
      },
    });
    this.bulk = options.bulk;
  }

  /**
   * Memoises a request. At build time results are kept for the whole
   * build; in the browser they expire after five minutes so returning
   * visitors pick up data changes without a reload.
   */
  private cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.memo.get(key);
    if (hit && (this.bulk || Date.now() - hit.at < BROWSER_CACHE_MS)) {
      return hit.promise as Promise<T>;
    }
    const promise = fn().catch((err) => {
      this.memo.delete(key);
      throw err;
    });
    this.memo.set(key, { at: Date.now(), promise });
    return promise;
  }

  /** Fetches rows page by page (Supabase returns at most 1000 rows per request). */
  private async fetchRows(table: string, opts: QueryOptions): Promise<Row[]> {
    const pageSize = 1000;
    const out: Row[] = [];
    for (let from = 0; ; from += pageSize) {
      let q = this.client.from(table).select(opts.select ?? '*');
      for (const [col, val] of opts.eq ?? []) q = q.eq(col, val as never);
      const { data, error } = await q.range(from, from + pageSize - 1);
      if (error) throw new Error(`[publicData] ${table}: ${error.message}`);
      const rows = (data ?? []) as unknown as Row[];
      out.push(...rows);
      if (rows.length < pageSize) break;
    }
    return out;
  }

  /** Rows of a table matching simple equality filters, with public rules applied. */
  private async rows(table: string, opts: QueryOptions = {}): Promise<Row[]> {
    const publicFilters = PUBLIC_FILTERS[table] ?? [];
    const isPublic = IS_PUBLIC[table] ?? (() => true);
    const matches = (r: Row) =>
      isPublic(r) && (opts.eq ?? []).every(([col, val]) => String(r[col]) === String(val));

    if (this.bulk) {
      const select = opts.select ?? '*';
      const all = await this.cached(`table:${table}:${select}`, () => this.fetchRows(table, { select, eq: publicFilters }));
      return all.filter(matches);
    }
    const key = `q:${table}:${opts.select ?? '*'}:${JSON.stringify(opts.eq ?? [])}`;
    return this.cached(key, async () =>
      (await this.fetchRows(table, { select: opts.select, eq: [...publicFilters, ...(opts.eq ?? [])] })).filter(matches),
    );
  }

  // ── Slug maps ──────────────────────────────────────────────

  private async listed(kind: DataKind): Promise<{ rows: Row[]; slugs: Map<string, string> }> {
    return this.cached(`listed:${kind}`, async () => {
      const select = kind === 'weapons'
        ? 'id,name,max_name,weapon_type_id,element_type,rarity,max_rarity,monster_id,image,is_active,is_spoiler,sort_order'
        : kind === 'visages'
          ? '*, monster:monsters(name, icon)'
          : '*';
      const rows = sortRows(await this.rows(kind, { select }));
      const slugs = assignSlugs(rows.map((r) => ({ id: String(r.id), name: String(r.name ?? r.id) })));
      return { rows, slugs };
    });
  }

  async slugFor(kind: DataKind, id: string | null | undefined): Promise<string | null> {
    if (!id) return null;
    const { slugs } = await this.listed(kind);
    return slugs.get(String(id)) ?? null;
  }

  private async findBySlug(kind: DataKind, slug: string): Promise<Row | null> {
    const { rows, slugs } = await this.listed(kind);
    const target = slug.toLowerCase();
    return rows.find((r) => slugs.get(String(r.id)) === target) ?? null;
  }

  private async ref(kind: DataKind, id: string | null | undefined): Promise<LinkRef | null> {
    if (!id) return null;
    const { rows, slugs } = await this.listed(kind);
    const row = rows.find((r) => String(r.id) === String(id));
    const slug = slugs.get(String(id));
    return row && slug ? { name: String(row.name), slug } : null;
  }

  // ── Index pages ────────────────────────────────────────────

  async index(kind: DataKind): Promise<IndexEntry[]> {
    const { rows, slugs } = await this.listed(kind);
    return rows.map((r) => {
      const id = String(r.id);
      const base = { id, slug: slugs.get(id)!, name: String(r.name) };
      switch (kind) {
        case 'monsters':
          return {
            ...base,
            image: str(r.icon),
            group: labelOf(str(r.species)) || 'Other',
            facts: [
              arr(r.weaknesses).length ? `Weak to ${arr(r.weaknesses).slice(0, 3).map(labelOf).join(', ')}` : '',
              str(r.tier) ? `${labelOf(str(r.tier))} tier` : '',
            ].filter(Boolean),
          };
        case 'weapons':
          return {
            ...base,
            image: str(r.image),
            group: weaponTypeName(str(r.weapon_type_id)),
            facts: [
              labelOf(str(r.element_type)) || '',
              num(r.rarity) != null ? `Rarity ${num(r.rarity)}${num(r.max_rarity) ? `–${num(r.max_rarity)}` : ''}` : '',
            ].filter(Boolean),
          };
        case 'adventurers':
          return {
            ...base,
            image: str(r.image),
            group: str(r.role) ?? 'Adventurers',
            facts: [weaponTypeName(str(r.weapon_type)), labelOf(str(r.element_specialization))].filter(Boolean),
          };
        case 'buddies':
          return {
            ...base,
            image: str(r.image),
            group: str(r.tier) ? `${str(r.tier)} buddies` : 'Buddies',
            facts: [str(r.role) ?? '', str(r.species) ?? ''].filter(Boolean),
          };
        case 'visages': {
          const monster = (r.monster ?? null) as { name?: string; icon?: string } | null;
          return {
            ...base,
            image: str(monster?.icon),
            group: str(r.monster_type) === 'small' ? 'Small monster cards' : 'Large monster cards',
            facts: [
              num(r.points) != null ? `${num(r.points)} pt` : '',
              arr(r.ink_types).map(labelOf).join(', '),
            ].filter(Boolean),
          };
        }
      }
    });
  }

  // ── Detail pages ───────────────────────────────────────────

  async page(kind: DataKind, slug: string): Promise<DetailPage | null> {
    switch (kind) {
      case 'monsters': return this.monsterPage(slug);
      case 'weapons': return this.weaponPage(slug);
      case 'adventurers': return this.adventurerPage(slug);
      case 'buddies': return this.buddyPage(slug);
      case 'visages': return this.visagePage(slug);
    }
  }

  async monsterPage(slug: string): Promise<MonsterPage | null> {
    const listedRow = await this.findBySlug('monsters', slug);
    if (!listedRow) return null;
    const id = String(listedRow.id);
    const [monsters, hitzones, levels, weapons, visages, armour] = await Promise.all([
      this.listed('monsters'),
      this.rows('monster_hitzones', { eq: [['monster_id', id]] }),
      this.rows('monster_levels', { eq: [['monster_id', id]] }),
      this.listed('weapons'),
      this.listed('visages'),
      this.rows('armour_pieces', { select: 'id,monster_id,slot,set_name,set_variant,is_active,is_spoiler', eq: [['monster_id', id]] }),
    ]);
    const bySort = (a: Row, b: Row) => (num(a.sort_order) ?? 0) - (num(b.sort_order) ?? 0);

    const sets = new Map<string, { name: string; variant: string | null; slots: string[] }>();
    for (const p of armour) {
      const name = str(p.set_name) ?? 'Armour';
      const variant = str(p.set_variant);
      const key = `${name}|${variant ?? ''}`;
      const set = sets.get(key) ?? { name, variant, slots: [] };
      const slot = str(p.slot);
      if (slot && !set.slots.includes(slot)) set.slots.push(slot);
      sets.set(key, set);
    }

    return {
      kind: 'monster',
      fetchedAt: new Date().toISOString(),
      slug,
      monster: {
        id,
        name: String(listedRow.name),
        name_ja: str(listedRow.name_ja),
        species: str(listedRow.species),
        tier: str(listedRow.tier),
        elements: arr(listedRow.elements),
        weaknesses: arr(listedRow.weaknesses),
        icon: str(listedRow.icon),
        is_variant: bool(listedRow.is_variant),
        is_radiant: bool(listedRow.is_radiant),
      },
      parent: await this.ref('monsters', str(listedRow.parent_id)),
      variants: monsters.rows
        .filter((m) => String(m.parent_id ?? '') === id)
        .map((m) => ({ name: String(m.name), slug: monsters.slugs.get(String(m.id))! })),
      hitzones: hitzones.slice().sort(bySort).map((h) => ({
        part: String(h.part ?? ''),
        state: str(h.state),
        cut: num(h.cut) ?? 0,
        impact: num(h.impact) ?? 0,
        shot: num(h.shot) ?? 0,
        fire: num(h.fire) ?? 0,
        water: num(h.water) ?? 0,
        thunder: num(h.thunder) ?? 0,
        ice: num(h.ice) ?? 0,
        dragon: num(h.dragon) ?? 0,
        weak_point_stars: num(h.weak_point_stars) ?? 0,
      })),
      levels: levels.slice().sort(bySort).map((l) => ({
        content: String(l.content ?? ''),
        hunt_difficulty: num(l.hunt_difficulty),
        monster_level: num(l.monster_level),
        suggested_hunt_power: num(l.suggested_hunt_power),
        health: num(l.health) ?? 0,
        attack: num(l.attack) ?? 0,
      })),
      weapons: weapons.rows
        .filter((w) => String(w.monster_id ?? '') === id)
        .map((w) => ({
          name: String(w.name),
          slug: weapons.slugs.get(String(w.id))!,
          weapon_type_id: String(w.weapon_type_id ?? ''),
          element_type: str(w.element_type),
          rarity: num(w.rarity),
        })),
      visages: visages.rows
        .filter((v) => String(v.monster_id ?? '') === id)
        .map((v) => ({ name: String(v.name), slug: visages.slugs.get(String(v.id))! })),
      armourSets: [...sets.values()],
    };
  }

  async weaponPage(slug: string): Promise<WeaponPage | null> {
    const listedRow = await this.findBySlug('weapons', slug);
    if (!listedRow) return null;
    const id = String(listedRow.id);
    const [[full], upgrades] = await Promise.all([
      this.rows('weapons', { eq: [['id', id]] }),
      this.rows('weapon_upgrades', {
        select: 'weapon_id,rarity,name,attack,affinity,element_type,element_damage,required_level',
        eq: [['weapon_id', id]],
      }),
    ]);
    const w = full ?? listedRow;
    return {
      kind: 'weapon',
      fetchedAt: new Date().toISOString(),
      slug,
      weapon: {
        id,
        name: String(w.name),
        name_ja: str(w.name_ja),
        max_name: str(w.max_name),
        weapon_type_id: String(w.weapon_type_id ?? ''),
        series: str(w.series),
        source_type: str(w.source_type),
        source_detail: str(w.source_detail),
        element_type: str(w.element_type),
        element_damage: num(w.element_damage),
        attack: num(w.attack),
        affinity: num(w.affinity),
        sharpness: str(w.sharpness),
        deco_slots: arr<number>(w.deco_slots),
        rarity: num(w.rarity),
        max_rarity: num(w.max_rarity),
        is_apex: bool(w.is_apex),
        apex_season: str(w.apex_season),
        image: str(w.image),
        description: str(w.description),
      },
      monster: await this.ref('monsters', str(w.monster_id)),
      upgrades: upgrades
        .slice()
        .sort((a, b) => (num(a.rarity) ?? 0) - (num(b.rarity) ?? 0))
        .map((u) => ({
          rarity: num(u.rarity) ?? 0,
          name: str(u.name),
          attack: num(u.attack),
          affinity: num(u.affinity),
          element_type: str(u.element_type),
          element_damage: num(u.element_damage),
          required_level: num(u.required_level),
        })),
    };
  }

  async adventurerPage(slug: string): Promise<AdventurerPage | null> {
    const a = await this.findBySlug('adventurers', slug);
    if (!a) return null;
    const id = String(a.id);
    const [skills, buddies] = await Promise.all([
      this.rows('adventurer_skills', { eq: [['adventurer_id', id]] }),
      this.listed('buddies'),
    ]);
    const buddyRow = buddies.rows.find((b) => String(b.default_of_adventurer_id ?? '') === id)
      ?? buddies.rows.find((b) => str(a.default_buddy) && String(b.name).toLowerCase() === String(a.default_buddy).toLowerCase());
    return {
      kind: 'adventurer',
      fetchedAt: new Date().toISOString(),
      slug,
      adventurer: {
        id,
        name: String(a.name),
        name_ja: str(a.name_ja),
        title: str(a.title),
        image: str(a.image),
        weapon_type: str(a.weapon_type),
        allowed_weapon_types: arr(a.allowed_weapon_types),
        element_specialization: str(a.element_specialization),
        role: str(a.role),
        rarity: str(a.rarity),
        description: str(a.description),
        playstyle: str(a.playstyle),
        default_buddy: str(a.default_buddy),
        traits: arr<{ name: string; description: string }>(a.traits).filter((t) => t && t.name),
        status: str(a.status),
        status_reason: str(a.status_reason),
      },
      skills: skills
        .slice()
        .sort((x, y) => (num(x.sort_order) ?? 0) - (num(y.sort_order) ?? 0))
        .map((s) => ({ name: String(s.name ?? ''), skill_type: str(s.skill_type), description: str(s.description) })),
      defaultBuddy: buddyRow ? { name: String(buddyRow.name), slug: buddies.slugs.get(String(buddyRow.id))! } : null,
    };
  }

  async buddyPage(slug: string): Promise<BuddyPage | null> {
    const b = await this.findBySlug('buddies', slug);
    if (!b) return null;
    const id = String(b.id);
    const skills = await this.rows('buddy_skills', { eq: [['buddy_id', id]] });
    return {
      kind: 'buddy',
      fetchedAt: new Date().toISOString(),
      slug,
      buddy: {
        id,
        name: String(b.name),
        name_ja: str(b.name_ja),
        tier: str(b.tier),
        role: str(b.role),
        species: str(b.species),
        core_passive: str(b.core_passive),
        description: str(b.description),
        image: str(b.image),
        status: str(b.status),
        status_reason: str(b.status_reason),
      },
      skills: skills
        .slice()
        .sort((x, y) => (num(x.sort_order) ?? 0) - (num(y.sort_order) ?? 0))
        .map((s) => ({ kind: String(s.kind ?? 'skill'), name: String(s.name ?? ''), description: str(s.description) })),
      defaultOf: await this.ref('adventurers', str(b.default_of_adventurer_id)),
    };
  }

  async visagePage(slug: string): Promise<VisagePage | null> {
    const v = await this.findBySlug('visages', slug);
    if (!v) return null;
    const monsterRef = await this.ref('monsters', str(v.monster_id));
    const joined = (v.monster ?? null) as { name?: string; icon?: string } | null;
    return {
      kind: 'visage',
      fetchedAt: new Date().toISOString(),
      slug,
      visage: {
        id: String(v.id),
        name: String(v.name),
        name_ja: str(v.name_ja),
        monster_type: str(v.monster_type),
        points: num(v.points),
        max_levels: arr<number>(v.max_levels),
        ink_types: arr(v.ink_types),
        core_effect: str(v.core_effect),
        status: str(v.status),
        status_reason: str(v.status_reason),
      },
      monster: monsterRef ? { ...monsterRef, icon: str(joined?.icon) } : null,
    };
  }

  /** Every pre-renderable reference path, for the prerender list and sitemap. */
  async allPaths(): Promise<string[]> {
    const kinds: DataKind[] = ['monsters', 'weapons', 'adventurers', 'buddies', 'visages'];
    const paths: string[] = [];
    for (const kind of kinds) {
      paths.push(`/${kind}`);
      const { slugs } = await this.listed(kind);
      for (const slug of new Set(slugs.values())) paths.push(`/${kind}/${slug}`);
    }
    return paths;
  }
}

// ── Shared instance ───────────────────────────────────────────

let shared: PublicDataSource | null = null;

/** The data source for the current environment (build time or browser). */
export function publicData(): PublicDataSource {
  if (shared) return shared;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY for public data.');
  }
  shared = new PublicDataSource(url, key, { bulk: typeof window === 'undefined' });
  return shared;
}
