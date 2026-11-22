import type { PatchNotes } from './types';
import { PATCH_1_0_9_4 } from './patch-1.0.9.4';

/** Data-driven patches, newest first. (1.0.9.3 is still hand-written in GameUpdates.tsx.) */
export const PATCHES: PatchNotes[] = [PATCH_1_0_9_4];

export const LATEST_PATCH_VERSION = PATCHES[0].version;

export type { PatchNotes } from './types';

/** "21st Nov 2026" */
export function patchDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${day}${suffix} ${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${d.getUTCFullYear()}`;
}
