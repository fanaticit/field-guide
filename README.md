# Monster Hunter Outlanders Field Guide

Community tools for Monster Hunter Outlanders, built with React, React Router 8 (framework mode), Vite, Tailwind and Supabase, and hosted on Cloudflare Pages.

## Requirements

- Node.js 22.22 or newer
- `.env` (or `.env.local`) with:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SITE_URL=https://<your live domain>   # used for canonical links, sitemap and robots.txt
```

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (run again after pulling this change) |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Typecheck, then build and pre-render the site into `dist/client` |
| `npm run preview` | Serve `dist/client` exactly as Cloudflare Pages will (redirects, 404s, trailing slashes) on http://localhost:8788 |
| `npm run deploy` | Build and upload `dist/client` to Cloudflare Pages |

## How pages are rendered

The site is still a set of static files with no server. At build time:

- **Reference pages** (`/monsters/`, `/weapons/`, `/adventurers/`, `/buddies/`, `/visages/` and one page per item) are rendered to full HTML from the public game data in Supabase. Only active, non-spoiler, non-debug rows are used (`src/seo/publicData.ts`). In the browser they refresh from Supabase in the background.
- **Tool pages** (planner, collections, challenges, Visage tools…) pre-render only a summary: heading, description and links (`src/seo/pages.ts`). The tool itself, and all user data (collections, challenges, Monster Study, builds, profile), loads in the browser from Supabase as before. Nothing user-specific is ever in the static HTML.
- **Browser-only pages** (settings, admin, spoilers, shared build links) are not pre-rendered. `public/_redirects` points them at the app shell.
- `robots.txt`, `sitemap.xml` and `llms.txt` are generated from the same data.

Game data in the static HTML is a snapshot from the last build. After importing new game data into Supabase, run `npm run deploy` (or trigger a Cloudflare deploy hook) so search engines see the update.

## Where things live

- `src/routes.ts` – the list of routes (replaces `src/router.tsx`)
- `src/root.tsx` – the HTML document and app shell (replaces `index.html` and `src/main.tsx`)
- `react-router.config.ts` – which paths are pre-rendered
- `src/routes/` – route modules (page titles/descriptions via `meta`)
- `src/seo/` – SEO copy, meta tags, public data loading and page summaries
- `src/components/reference/` – the reference page layouts
