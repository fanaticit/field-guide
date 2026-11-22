// /llms.txt — a plain-text map of the site for AI assistants and agents
// (see https://llmstxt.org). Generated at build time.
import { PAGES, REFERENCE, REFERENCE_KINDS } from '../seo/pages';
import { publicData } from '../seo/publicData';
import { absoluteUrl, canonicalPath, SITE_NAME } from '../seo/site';

export async function loader() {
  const ds = publicData();
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${PAGES.home.description}`,
    '',
    'An unofficial, community-made companion site for the mobile game Monster Hunter Outlanders. Not affiliated with Capcom or TiMi Studio Group. Game data is kept up to date with each game patch; reference pages include the date the data was last updated.',
    '',
    '## Tools',
    '',
  ];
  for (const p of Object.values(PAGES)) {
    if (p.section === 'Home' || p.section === 'About') continue;
    lines.push(`- [${p.heading}](${absoluteUrl(canonicalPath(p.path))}): ${p.description}`);
  }
  lines.push(`- [Game Updates](${absoluteUrl(canonicalPath(PAGES.updates.path))}): ${PAGES.updates.description}`);

  for (const kind of REFERENCE_KINDS) {
    const ref = REFERENCE[kind];
    const entries = await ds.index(kind);
    lines.push('', `## ${ref.plural}`, '', `- [All ${ref.plural.toLowerCase()}](${absoluteUrl(`/${kind}/`)}): ${ref.description}`);
    for (const e of entries) {
      lines.push(`- [${e.name}](${absoluteUrl(`/${kind}/${e.slug}/`)})${e.facts.length ? `: ${e.facts.join(', ')}` : ''}`);
    }
  }

  lines.push('', '## Optional', '');
  lines.push(`- [Privacy Policy](${absoluteUrl(canonicalPath(PAGES.privacy.path))})`);
  lines.push(`- [Terms of Service](${absoluteUrl(canonicalPath(PAGES.terms.path))})`);

  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
