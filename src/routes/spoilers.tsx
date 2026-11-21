// Spoilers are gated behind login and the "Show Spoilers" preference, so
// this page is never pre-rendered and is hidden from search engines.
import SpoilersPage from '../pages/SpoilersPage';
import { buildMeta } from '../seo/meta';

export function meta() {
  return buildMeta({ title: 'Spoilers', path: '/spoilers', noindex: true });
}

export default function Route() {
  return <SpoilersPage />;
}
