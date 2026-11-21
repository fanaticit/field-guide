import PrivacyPolicy from '../pages/PrivacyPolicy';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';

const page = PAGES.privacy;

export function meta() {
  return buildMeta({ title: page.title, description: page.description, path: page.path });
}

export default function Route() {
  return <PrivacyPolicy />;
}
