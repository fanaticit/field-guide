// Route module for an interactive tool page.
// The tool itself needs the visitor's own data, so it only renders in the
// browser. At build time the page's summary (ToolFallback) is pre-rendered
// instead, so search engines and AI crawlers can read what the page is.
import type { MetaArgs } from 'react-router';
import VisageSetBuilder from '../pages/investigation-notes/VisageSetBuilder';
import ToolFallback from '../components/seo/ToolFallback';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';

const page = PAGES.visageSet;

export function meta({ location }: MetaArgs) {
  return buildMeta({ title: page.title, description: page.description, path: location.pathname });
}

// No data to load — this only tells React Router to render the tool in the
// browser and to pre-render HydrateFallback at build time.
export async function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return <ToolFallback page={page} />;
}

export default function Route() {
  return <div className="p-0 sm:p-2 lg:p-4 flex-1 flex flex-col min-h-0"><VisageSetBuilder /></div>;
}
