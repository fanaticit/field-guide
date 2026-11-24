// Route module for the armour v3 preview page (/armory/armour_v3).
// Browser-only: it is not pre-rendered or listed in the sitemap, and
// public/_redirects serves the app shell for it.
import ArmourV3 from '../features/armour-lab/ArmourV3';
import { buildMeta } from '../seo/meta';
import { LabStatus } from '../features/armour-lab/ui';

export function meta() {
  return buildMeta({
    title: 'Armour Table (preview)',
    description: 'Every Monster Hunter Outlanders armour set in one table, Helm to Greaves, with each piece’s skills and the rarity they unlock.',
    path: '/armory/armour_v3',
    noindex: true,
  });
}

export async function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return <LabStatus isLoading error={null} />;
}

export default function Route() {
  return <ArmourV3 />;
}
