// ─────────────────────────────────────────────────────────────
// Legacy URL redirects (old bookmarks and links).
// The same redirects are also served as permanent (301) redirects by
// Cloudflare in public/_redirects, so search engines follow them too;
// this module handles them for in-app navigation and local dev.
// ─────────────────────────────────────────────────────────────
import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { loaderPath } from '../seo/reference';

const LEGACY_REDIRECTS: [RegExp, string][] = [
  [/^\/admin\/?$/, '/admin/feedback'],
  [/^\/armory\/builds\/?$/, '/armory'],
  [/^\/armory\/visages\/?$/, '/gallery'],
  [/^\/armory\/build-planner\/?$/, '/armory/planner'],
  [/^\/armory\/build-planner\/([^/]+)\/?$/, '/armory/planner/$1'],
  [/^\/build-planner\/?$/, '/armory/planner'],
  [/^\/build-planner\/([^/]+)\/?$/, '/armory/planner/$1'],
  [/^\/gallery\/sets\/?$/, '/gallery/set'],
  [/^\/investigation-notes\/armour\/?$/, '/armory/armour'],
  [/^\/investigation-notes\/visages\/?$/, '/gallery/collection'],
  [/^\/investigation-notes\/adventurers\/?$/, '/challenges/adventurers'],
  [/^\/investigation-notes\/buddies\/?$/, '/challenges/buddies'],
  [/^\/investigation-notes\/weapons\/?$/, '/challenges/weapons'],
  [/^\/investigation-notes\/monsters\/?$/, '/challenges/monsters'],
  [/^\/investigation-notes\/?$/, '/armory/armour'],
  [/^\/investigation-notes\/[^/]+\/?$/, '/challenges'],
  [/^\/community-hub\/?$/, '/armory'],
  [/^\/home\/spoilers\/?$/, '/spoilers'],
  [/^\/armour\/?$/, '/armory/armour'],
  [/^\/investigation_journey\/?$/, '/investigation-journey'],
  // Password-reset emails link here; Supabase reads the token from the URL as the app starts.
  [/^\/reset-password\/?$/, '/'],
];

function resolveLegacyPath(pathname: string): string {
  for (const [pattern, target] of LEGACY_REDIRECTS) {
    const m = pathname.match(pattern);
    if (m) return target.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
  }
  return '/';
}

export async function clientLoader(args: LoaderFunctionArgs) {
  throw redirect(resolveLegacyPath(loaderPath(args)));
}

export function HydrateFallback() {
  return null;
}

export default function LegacyRedirect() {
  return null;
}
