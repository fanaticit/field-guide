// ─────────────────────────────────────────────────────────────
// MHN Weapon Elements
// ─────────────────────────────────────────────────────────────
import type { AnyElement } from '../../schemas/index.js';
import rawData from '../../../../hc_data/weapon-elements.json';

export interface MHNWeaponElement {
  monsterId: string;
  weaponTypeId: string;
  elements: AnyElement[];
}

type RawWeaponElements = {
  weaponTypes: string[];
  monsterWeaponUnavailable: Record<string, string[]>;
  elements: Record<string, Record<string, string[]>>;
};

function buildWeaponElements(): MHNWeaponElement[] {
  const raw = rawData as unknown as RawWeaponElements;
  const result: MHNWeaponElement[] = [];
  const unavailable = raw.monsterWeaponUnavailable ?? {};
  const elementData = raw.elements ?? {};

  for (const [monsterId, weaponMap] of Object.entries(elementData)) {
    const unavailableForMonster = unavailable[monsterId] ?? [];
    for (const [weaponTypeId, elements] of Object.entries(weaponMap)) {
      if (unavailableForMonster.includes(weaponTypeId)) continue;
      result.push({
        monsterId,
        weaponTypeId,
        elements: (elements ?? []) as AnyElement[],
      });
    }
  }
  return result;
}

export const MHN_WEAPON_ELEMENTS: MHNWeaponElement[] = buildWeaponElements();

export function getMHNWeaponElements(): MHNWeaponElement[] { return MHN_WEAPON_ELEMENTS; }

export function getWeaponElementsForMonster(monsterId: string): MHNWeaponElement[] {
  return MHN_WEAPON_ELEMENTS.filter((w) => w.monsterId === monsterId);
}

export function getWeaponElement(monsterId: string, weaponTypeId: string): AnyElement[] {
  return (
    MHN_WEAPON_ELEMENTS.find((w) => w.monsterId === monsterId && w.weaponTypeId === weaponTypeId)
      ?.elements ?? []
  );
}

export function getAvailableWeaponTypes(monsterId: string): string[] {
  return MHN_WEAPON_ELEMENTS.filter((w) => w.monsterId === monsterId).map((w) => w.weaponTypeId);
}
