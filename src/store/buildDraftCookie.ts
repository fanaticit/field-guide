import { supabase } from '../lib/supabase';
import { useBuildPlannerStore, type ArmourPiece } from './buildPlannerStore';

const COOKIE_NAME = 'mho_build_draft';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAX_COOKIE_CHARS = 3800;

type ArmourSlot = 'helm' | 'chest' | 'gloves' | 'waist' | 'greaves';
const ARMOUR_SLOTS: ArmourSlot[] = ['helm', 'chest', 'gloves', 'waist', 'greaves'];
const VISAGE_KEYS = ['coreVisage', 'visage2', 'visage3', 'visage4', 'visage5'] as const;

// Only ids are stored so the cookie stays far below the ~4KB browser limit.
interface DraftCookie {
  t?: string;
  d?: string;
  r?: 'main' | 'support';
  adv?: string;
  wt?: string;
  w?: string;
  a?: Partial<Record<ArmourSlot, string>>;
  b?: string;
  v?: Partial<Record<(typeof VISAGE_KEYS)[number], string>>;
  i?: Record<string, string>;
}

function readCookie(): DraftCookie | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)));
  } catch {
    return null;
  }
}

function writeCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearBuildDraft() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

function saveDraft() {
  const s = useBuildPlannerStore.getState();
  // Saved builds live in the database; only unsaved drafts go in the cookie.
  if (s.buildId) return;

  const draft: DraftCookie = {};
  if (s.title) draft.t = s.title.slice(0, 100);
  if (s.description) draft.d = s.description.slice(0, 500);
  if (s.buildRole !== 'main') draft.r = s.buildRole;
  if (s.adventurer) draft.adv = s.adventurer.id;
  if (s.weaponType) draft.wt = s.weaponType.id;
  if (s.weapon) draft.w = s.weapon.id;
  if (s.buddy) draft.b = s.buddy.id;

  const armour: DraftCookie['a'] = {};
  ARMOUR_SLOTS.forEach((slot) => {
    if (s[slot]) armour[slot] = s[slot]!.id;
  });
  if (Object.keys(armour).length) draft.a = armour;

  const visages: DraftCookie['v'] = {};
  VISAGE_KEYS.forEach((key) => {
    if (s[key]) visages[key] = s[key]!.id;
  });
  if (Object.keys(visages).length) draft.v = visages;

  if (Object.keys(s.selectedInkTypes).length) draft.i = s.selectedInkTypes;

  if (Object.keys(draft).length === 0) {
    clearBuildDraft();
    return;
  }

  let encoded = encodeURIComponent(JSON.stringify(draft));
  if (encoded.length > MAX_COOKIE_CHARS) {
    delete draft.d;
    encoded = encodeURIComponent(JSON.stringify(draft));
  }
  if (encoded.length <= MAX_COOKIE_CHARS) writeCookie(encoded);
}

async function fetchByIds<T>(table: string, ids: (string | undefined)[]): Promise<Map<string, T>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => !!id)));
  const map = new Map<string, T>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.from(table).select('*').in('id', unique);
  if (error) throw error;
  (data ?? []).forEach((row: any) => map.set(row.id, row as T));
  return map;
}

// Resolves false when the draft exists but could not be restored, so it must not be overwritten.
async function hydrateFromCookie(): Promise<boolean> {
  const draft = readCookie();
  if (!draft) return true;

  try {
    const armourIds = ARMOUR_SLOTS.map((slot) => draft.a?.[slot]);
    const visageIds = VISAGE_KEYS.map((key) => draft.v?.[key]);

    const [advs, types, weapons, armours, buddies, visages] = await Promise.all([
      fetchByIds<any>('adventurers', [draft.adv]),
      fetchByIds<any>('weapon_types', [draft.wt]),
      fetchByIds<any>('weapons', [draft.w]),
      fetchByIds<ArmourPiece>('armour_pieces', armourIds),
      fetchByIds<any>('buddies', [draft.b]),
      fetchByIds<any>('visages', visageIds),
    ]);
    const monsters = await fetchByIds<{ id: string; name: string }>(
      'monsters',
      Array.from(armours.values()).map((p) => p.monster_id),
    );

    // Never overwrite anything the hunter already picked while we were loading.
    const current = useBuildPlannerStore.getState();
    if (current.buildId) return true;

    const patch: Record<string, unknown> = {};
    if (!current.title && draft.t) patch.title = draft.t;
    if (!current.description && draft.d) patch.description = draft.d;
    if (draft.r) patch.buildRole = draft.r;
    if (!current.adventurer && draft.adv && advs.get(draft.adv)) patch.adventurer = advs.get(draft.adv);
    if (!current.weaponType && draft.wt && types.get(draft.wt)) patch.weaponType = types.get(draft.wt);
    if (!current.weapon && draft.w && weapons.get(draft.w)) patch.weapon = weapons.get(draft.w);
    if (!current.buddy && draft.b && buddies.get(draft.b)) patch.buddy = buddies.get(draft.b);

    ARMOUR_SLOTS.forEach((slot) => {
      const id = draft.a?.[slot];
      const piece = id ? armours.get(id) : undefined;
      if (!current[slot] && piece) {
        patch[slot] = { ...piece, monster_name: monsters.get(piece.monster_id)?.name ?? piece.monster_id };
      }
    });
    VISAGE_KEYS.forEach((key) => {
      const id = draft.v?.[key];
      if (!current[key] && id && visages.get(id)) patch[key] = visages.get(id);
    });
    if (draft.i && Object.keys(current.selectedInkTypes).length === 0) patch.selectedInkTypes = draft.i;

    useBuildPlannerStore.setState(patch);
    return true;
  } catch (err) {
    console.error('Failed to restore build draft', err);
    return false;
  }
}

// Restores the unsaved build from the cookie, then keeps the cookie in sync with the store.
export async function initBuildDraftPersistence() {
  if (!(await hydrateFromCookie())) return;
  saveDraft();
  useBuildPlannerStore.subscribe(saveDraft);
}
