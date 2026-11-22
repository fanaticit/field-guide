import GameUpdates from '../pages/GameUpdates';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';
import { absoluteUrl, canonicalPath, GAME_NAME } from '../seo/site';
import { PATCHES } from '../data/patches';

const page = PAGES.updates;

export function meta() {
  const latest = PATCHES[0];
  const description = `${GAME_NAME} update ${latest.version} patch notes: ${latest.headlines
    .slice(0, 3)
    .map((h) => h.replace(/\.$/, ''))
    .join('; ')}.`;
  return buildMeta({
    title: `${GAME_NAME} Update ${latest.version} Patch Notes`,
    description,
    path: page.path,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${GAME_NAME} update ${latest.version} patch notes`,
      description,
      datePublished: latest.date,
      dateModified: latest.date,
      url: absoluteUrl(canonicalPath(page.path)),
      about: { '@type': 'VideoGame', name: GAME_NAME },
    },
  });
}

export default function Route() {
  return <GameUpdates />;
}
