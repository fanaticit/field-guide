// Admin panel: browser-only, never pre-rendered, hidden from search engines.
import AdminPage from '../pages/admin/AdminPage';
import { buildMeta } from '../seo/meta';

export function meta() {
  return buildMeta({ title: 'Admin', noindex: true });
}

export default function Route() {
  return <AdminPage />;
}
