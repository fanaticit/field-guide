// ─────────────────────────────────────────────────────────────
// Elements & Status Effects registry
// ─────────────────────────────────────────────────────────────
import type { TrueElement, StatusElement, AnyElement } from '../schemas/index.js';

export interface ElementDef {
  id: AnyElement;
  label: string;
  emoji: string;
  /** CSS custom property token from index.css */
  colorToken: string;
  /** Brief description of what this element does */
  effect: string;
  /** Player debuff (blight) applied when a monster hits with this element */
  blight?: string;
}

export const TRUE_ELEMENTS: ElementDef[] = [
  {
    id: 'fire',
    label: 'Fire',
    emoji: '🔥',
    colorToken: 'var(--color-el-fire)',
    effect: 'Heat damage; bonus damage on every hit',
    blight: 'Fireblight — DoT damage over time',
  },
  {
    id: 'water',
    label: 'Water',
    emoji: '💧',
    colorToken: 'var(--color-el-water)',
    effect: 'Water damage; bonus damage on every hit',
    blight: 'Waterblight — stamina recovery halved',
  },
  {
    id: 'thunder',
    label: 'Thunder',
    emoji: '⚡',
    colorToken: 'var(--color-el-thunder)',
    effect: 'Lightning damage; bonus damage on every hit',
    blight: 'Thunderblight — greatly increased stagger chance',
  },
  {
    id: 'ice',
    label: 'Ice',
    emoji: '❄️',
    colorToken: 'var(--color-el-ice)',
    effect: 'Cold damage; bonus damage on every hit',
    blight: 'Iceblight — stamina max halved',
  },
  {
    id: 'dragon',
    label: 'Dragon',
    emoji: '🐉',
    colorToken: 'var(--color-el-dragon)',
    effect: 'Draconic energy; bonus damage on every hit',
    blight: "Dragonblight — nullifies hunter's weapon element",
  },
] satisfies ElementDef[];

export const STATUS_ELEMENTS: ElementDef[] = [
  {
    id: 'poison',
    label: 'Poison',
    emoji: '☠️',
    colorToken: 'var(--color-el-poison)',
    effect: 'Builds up hidden status; triggers DoT damage over ~60s',
  },
  {
    id: 'paralysis',
    label: 'Paralysis',
    emoji: '⚡',
    colorToken: 'var(--color-el-paralysis)',
    effect: 'Builds up; triggers complete immobilisation for ~10s',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    emoji: '😴',
    colorToken: 'var(--color-el-sleep)',
    effect: 'Builds up; monster falls asleep; next hit deals 3× damage',
  },
  {
    id: 'blast',
    label: 'Blast',
    emoji: '💥',
    colorToken: 'var(--color-el-blast)',
    effect: 'Builds up; explosion deals flat damage chunk + stagger',
  },
] satisfies ElementDef[];

export const ALL_ELEMENTS: ElementDef[] = [...TRUE_ELEMENTS, ...STATUS_ELEMENTS];

/** Lookup map for quick access */
export const ELEMENT_MAP = new Map<AnyElement, ElementDef>(
  ALL_ELEMENTS.map((e) => [e.id as AnyElement, e])
);

export const TRUE_ELEMENT_IDS: TrueElement[] = ['fire', 'water', 'thunder', 'ice', 'dragon'];
export const STATUS_ELEMENT_IDS: StatusElement[] = ['poison', 'paralysis', 'sleep', 'blast'];

export function isTrueElement(e: string): e is TrueElement {
  return (TRUE_ELEMENT_IDS as string[]).includes(e);
}

export function isStatusElement(e: string): e is StatusElement {
  return (STATUS_ELEMENT_IDS as string[]).includes(e);
}
