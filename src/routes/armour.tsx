// Route module for the armour page (/armory/armour).
// The tool itself needs the visitor's own data, so it only renders in the
// browser. At build time the page's summary (ToolFallback) is pre-rendered
// instead, so search engines and AI crawlers can read what the page is.
// The previous version of this page lives at /armory/armour_old.
import ArmourExplorer from '../features/armour-lab/ArmourV2';
import ToolFallback from '../components/seo/ToolFallback';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';

const page = PAGES.armour;

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
  return <ArmourExplorer />;
}
