// /sitemap.xml — generated at build time from the public pages and the
// reference data. Pages that are personal or gated (settings, admin,
// spoilers, shared builds) are deliberately left out.
import { PAGES } from '../seo/pages';
import { publicData } from '../seo/publicData';
import { absoluteUrl, canonicalPath } from '../seo/site';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function loader() {
  const today = new Date().toISOString().slice(0, 10);
  const staticPaths = Object.values(PAGES).map((p) => p.path);
  const referencePaths = await publicData().allPaths();
  const urls = [...new Set([...staticPaths, ...referencePaths])].map((path) => {
    const priority = path === '/' ? '1.0' : /^\/(monsters|weapons|adventurers|buddies|visages)\/?$/.test(path) ? '0.8' : '0.6';
    return `  <url><loc>${escapeXml(absoluteUrl(canonicalPath(path)))}</loc><lastmod>${today}</lastmod><priority>${priority}</priority></url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
