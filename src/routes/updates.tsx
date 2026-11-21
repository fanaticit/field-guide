import GameUpdates from '../pages/GameUpdates';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';

const page = PAGES.updates;

export function meta() {
  return buildMeta({ title: page.title, description: page.description, path: page.path, type: 'article' });
}

export default function Route() {
  return <GameUpdates />;
}
