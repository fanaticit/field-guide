// Route module for the previous armour page (/armory/armour_old).
// Kept for hunters who prefer it. Browser-only: not pre-rendered, not in the
// sitemap, and public/_redirects serves the app shell for it.
import { Link } from 'react-router';
import ArmourGuide from '../pages/investigation-notes/ArmourGuide';
import { buildMeta } from '../seo/meta';

export function meta() {
  return buildMeta({
    title: 'Armour (old page)',
    description: 'The previous version of the Monster Hunter Outlanders armour page.',
    path: '/armory/armour_old',
    noindex: true,
  });
}

export async function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return null;
}

export default function Route() {
  return (
    <div className="px-1 sm:px-6 pb-6 pt-2 sm:pt-3 lg:px-8 lg:pb-8 lg:pt-4 min-h-full">
      <p className="mx-4 mt-2 rounded-xl border border-mh-gold-500/40 bg-mh-gold-500/10 px-3 py-2 text-xs text-mh-slate-200 lg:mx-6">
        You&apos;re on the old armour page.{' '}
        <Link to="/armory/armour" className="font-semibold text-mh-gold-400 underline hover:text-mh-gold-300">
          Go to the new armour page
        </Link>{' '}
        — set your rarity once, see which pieces have your skills at a glance, and get suggestions for what else fits.
      </p>
      <ArmourGuide />
    </div>
  );
}
