// Route module for an interactive tool page.
// The tool itself needs the visitor's own data, so it only renders in the
// browser. At build time the page's summary (ToolFallback) is pre-rendered
// instead, so search engines and AI crawlers can read what the page is.
import VisageCardChecker from '../pages/investigation-notes/VisageCardChecker';
import ToolFallback from '../components/seo/ToolFallback';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';

const page = PAGES.visageCheck;

export function meta() {
  return buildMeta({ title: page.title, description: page.description, path: page.path });
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
  return <div className="px-1 sm:px-6 pb-6 pt-2 sm:pt-3 lg:px-8 lg:pb-8 lg:pt-4 min-h-full"><VisageCardChecker /></div>;
}
