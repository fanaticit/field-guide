// Personal settings: browser-only, never pre-rendered, hidden from search engines.
import SettingsPage from '../pages/Settings';
import { buildMeta } from '../seo/meta';

export function meta() {
  return buildMeta({ title: 'Profile & Settings', noindex: true });
}

export default function Route() {
  return <SettingsPage />;
}
