// Route module for the armour v4 preview page (/armory/armour_v4).
// Browser-only: it is not pre-rendered or listed in the sitemap, and
// public/_redirects serves the app shell for it.
import ArmourV4 from '../features/armour-lab/ArmourV4';
import { buildMeta } from '../seo/meta';
import { LabStatus } from '../features/armour-lab/ui';

export function meta() {
  return buildMeta({
    title: 'Equipment Box (preview)',
    description: 'Pick an armour slot and compare every piece for it, with the skills each one would add or remove from your build.',
    path: '/armory/armour_v4',
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
  return <ArmourV4 />;
}
