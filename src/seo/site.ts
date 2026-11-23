// ─────────────────────────────────────────────────────────────
// site.ts — Site-wide SEO constants.
//
// SITE_URL is the public origin used for canonical links, Open Graph
// tags and the sitemap. Set VITE_SITE_URL in .env / .env.local
// (e.g. VITE_SITE_URL=https://www.example.com) before deploying.
// ─────────────────────────────────────────────────────────────

function readSiteUrl(): string {
  let fromEnv: string | undefined;
  try {
    fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  } catch {
    fromEnv = undefined;
  }
  if (!fromEnv && typeof process !== 'undefined') {
    fromEnv = process.env?.VITE_SITE_URL;
  }
  return (fromEnv || 'https://mhfg-field-guide.pages.dev').replace(/\/+$/, '');
}

export const SITE_URL = readSiteUrl();

export const SITE_NAME = 'Monster Hunter Outlanders Field Guide';
export const SITE_SHORT_NAME = 'MHO Field Guide';
export const GAME_NAME = 'Monster Hunter Outlanders';

export const DEFAULT_TITLE =
  'Monster Hunter Outlanders Field Guide – Builds, Visage Cards & Monster Data';
export const DEFAULT_DESCRIPTION =
  'Free Monster Hunter Outlanders tools: build planner, Visage Card checker and collection tracker, plus monster weaknesses, hitzones, weapons and adventurers.';
export const DEFAULT_OG_IMAGE = '/images/ui/banner_small.jpeg';

export const YOUTUBE_CHANNEL_URL: string | null = 'https://www.youtube.com/channel/UCHkRG0atSAJOiZ4sunHTsEA';

/**
 * Pre-rendered pages are written as folder/index.html, which Cloudflare
 * Pages serves with a trailing slash (/monsters/rathalos/). Canonical
 * links and internal links to those pages use the same form so search
 * engines never see a redirect.
 */
export function canonicalPath(path: string): string {
  if (!path || path === '/') return '/';
  const clean = path.split('?')[0].split('#')[0];
  if (/\.[a-z0-9]+$/i.test(clean)) return clean;
  return clean.endsWith('/') ? clean : `${clean}/`;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Like canonicalPath, but keeps any ?query or #hash. Used for internal
 * links so they point straight at the pre-rendered URL (no redirect).
 */
export function linkPath(to: string): string {
  const m = to.match(/^([^?#]*)(.*)$/);
  if (!m || !m[1].startsWith('/')) return to;
  return canonicalPath(m[1]) + m[2];
}
