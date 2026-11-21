// ─────────────────────────────────────────────────────────────
// React Router framework config.
//
// ssr: false   → no server at runtime; the site is still plain static
//                files on Cloudflare Pages.
// prerender    → the paths below are rendered to HTML at build time.
//                Every other path (settings, admin, spoilers, shared
//                builds…) is served by the SPA fallback page and renders
//                in the browser, exactly as before.
// ─────────────────────────────────────────────────────────────
import type { Config } from '@react-router/dev/config';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from 'vite';
import { PublicDataSource } from './src/seo/publicData';
import { PAGES } from './src/seo/pages';

export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  ssr: false,

  async prerender() {
    const env = loadEnv(process.env.NODE_ENV === 'development' ? 'development' : 'production', process.cwd(), 'VITE_');
    const url = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Pre-rendering needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or .env.local');
    }
    const data = new PublicDataSource(url, key, { bulk: true });
    const referencePaths = await data.allPaths();
    const toolPaths = Object.values(PAGES).map((p) => p.path);
    console.log(`[prerender] ${toolPaths.length} site pages + ${referencePaths.length} reference pages`);
    return ['/robots.txt', '/sitemap.xml', '/llms.txt', ...toolPaths, ...referencePaths];
  },

  // Cloudflare Pages serves 404.html for unknown URLs. Making it a copy of the
  // app shell means unknown URLs show the in-app "Page not found" page (with a
  // real 404 status), and reference pages added since the last build still load.
  async buildEnd({ reactRouterConfig }) {
    const client = path.join(reactRouterConfig.buildDirectory, 'client');
    await copyFile(path.join(client, '__spa-fallback.html'), path.join(client, '404.html'));
  },
} satisfies Config;
