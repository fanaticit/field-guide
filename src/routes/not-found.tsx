// Catch-all for unknown URLs. Previously these silently showed the home
// page, which search engines treat as a "soft 404". Now visitors get a
// proper not-found page that search engines are told not to index.
import NotFoundView from '../components/seo/NotFoundView';
import { buildMeta } from '../seo/meta';

export function meta() {
  return buildMeta({ title: 'Page not found', noindex: true });
}

export default function Route() {
  return <NotFoundView />;
}
