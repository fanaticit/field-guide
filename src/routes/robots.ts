// /robots.txt — generated at build time so the Sitemap line uses the
// configured site URL (VITE_SITE_URL).
import { SITE_URL } from '../seo/site';

const RULES = `# Monster Hunter Outlanders Field Guide
# Search engines and AI assistants are welcome to read and cite this site.

User-agent: *
Allow: /
Disallow: /admin
Disallow: /settings
Disallow: /spoilers

# AI search, assistant and training crawlers — explicitly allowed
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bingbot
User-agent: DuckAssistBot
Allow: /
Disallow: /admin
Disallow: /settings
Disallow: /spoilers`;

export function loader() {
  return new Response(`${RULES}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
