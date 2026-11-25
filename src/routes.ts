// ─────────────────────────────────────────────────────────────
// routes.ts — Route config for React Router framework mode.
// (Replaces the old src/router.tsx.)
//
// Which paths are pre-rendered at build time is set in
// react-router.config.ts. Everything else is served by the SPA
// fallback and renders in the browser exactly as before.
// ─────────────────────────────────────────────────────────────
import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  // Machine-readable files, generated at build time
  route('robots.txt', 'routes/robots.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('llms.txt', 'routes/llms.ts'),

  layout('Layout.tsx', [
    index('routes/home.tsx'),
    route('updates', 'routes/updates.tsx'),
    route('spoilers', 'routes/spoilers.tsx'),

    // ── 1. Hunter's Armory ──
    route('armory', 'routes/armory.tsx'),
    route('armory/planner', 'routes/planner.tsx', { id: 'planner' }),
    route('armory/planner/:buildId', 'routes/planner.tsx', { id: 'planner-build' }),
    route('armory/armour', 'routes/armour.tsx'),
    // The previous armour page, kept for hunters who prefer it (browser-only)
    route('armory/armour_old', 'routes/armour-old.tsx'),
    // Old preview link of the new armour page → /armory/armour
    route('armory/armour_v2', 'routes/armour-v2.tsx'),
    // Other armour layouts explored during the redesign (browser-only, not in the sitemap)
    route('armory/armour_v3', 'routes/armour-v3.tsx'),
    route('armory/armour_v4', 'routes/armour-v4.tsx'),

    // ── 2. Gallery ──
    route('gallery', 'routes/gallery.tsx'),
    route('gallery/set', 'routes/visage-set.tsx', { id: 'visage-set' }),
    route('gallery/set/:buildId', 'routes/visage-set.tsx', { id: 'visage-set-build' }),
    route('gallery/collection', 'routes/visage-collection.tsx'),
    route('gallery/check', 'routes/visage-check.tsx'),

    // ── 3. Challenges ──
    route('challenges', 'routes/challenges.tsx'),
    route('challenges/adventurers', 'routes/challenges-adventurers.tsx'),
    route('challenges/buddies', 'routes/challenges-buddies.tsx'),
    route('challenges/monsters', 'routes/challenges-monsters.tsx'),
    route('challenges/weapons', 'routes/challenges-weapons.tsx'),

    // ── 4. Reference pages (pre-rendered game data) ──
    route('monsters', 'routes/db/index.tsx', { id: 'ref-monsters' }),
    route('monsters/:slug', 'routes/db/detail.tsx', { id: 'ref-monster' }),
    route('weapons', 'routes/db/index.tsx', { id: 'ref-weapons' }),
    route('weapons/:slug', 'routes/db/detail.tsx', { id: 'ref-weapon' }),
    route('adventurers', 'routes/db/index.tsx', { id: 'ref-adventurers' }),
    route('adventurers/:slug', 'routes/db/detail.tsx', { id: 'ref-adventurer' }),
    route('buddies', 'routes/db/index.tsx', { id: 'ref-buddies' }),
    route('buddies/:slug', 'routes/db/detail.tsx', { id: 'ref-buddy' }),
    route('visages', 'routes/db/index.tsx', { id: 'ref-visages' }),
    route('visages/:slug', 'routes/db/detail.tsx', { id: 'ref-visage' }),

    // ── User & Admin (browser only) ──
    route('settings', 'routes/settings.tsx'),
    route('admin/:subPage', 'routes/admin.tsx'),

    // ── Legal / Footer ──
    route('privacy', 'routes/privacy.tsx'),
    route('terms', 'routes/terms.tsx'),

    // ── Legacy redirects ──
    ...[
      'admin',
      'armory/builds',
      'armory/visages',
      'armory/build-planner',
      'armory/build-planner/:buildId',
      'build-planner',
      'build-planner/:buildId',
      'gallery/sets',
      'investigation-notes',
      'investigation-notes/:subPage',
      'community-hub',
      'home/spoilers',
      'armour',
      'reset-password',
    ].map((path) => route(path, 'routes/redirect.tsx', { id: `legacy:${path}` })),

    // Unknown URLs → proper not-found page
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig;
