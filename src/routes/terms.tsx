import TermsOfService from '../pages/TermsOfService';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';

const page = PAGES.terms;

export function meta() {
  return buildMeta({ title: page.title, description: page.description, path: page.path });
}

export default function Route() {
  return <TermsOfService />;
}
