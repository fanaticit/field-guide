// Route module for the armour page (/armory/armour). /armour redirects here.
// The armour tool needs the visitor's own data, so it only renders in the
// browser (after the page loads). At build time the page summary, a guide/FAQ
// and the full list of armour sets (from public game data) are pre-rendered, so search engines and
// AI assistants can read them. The guide is also shown under the tool.
// The previous version of this page lives at /armory/armour_old.
import { useLoaderData } from 'react-router';
import { useHydrated } from '../hooks/useHydrated';
import ArmourExplorer from '../features/armour-lab/ArmourV2';
import ToolFallback from '../components/seo/ToolFallback';
import ArmourPageGuide from '../components/guides/ArmourPageGuide';
import { fillArmourFaq } from '../components/guides/armourGuideFaq';
import { publicData, type ArmourGuideData } from '../seo/publicData';
import { PAGES } from '../seo/pages';
import { breadcrumbJsonLd, buildMeta } from '../seo/meta';
import { absoluteUrl, canonicalPath } from '../seo/site';

const page = PAGES.armour;

/** Build time: public armour sets and weapon types for the guide. */
export async function loader(): Promise<ArmourGuideData> {
  return publicData().armourGuide();
}

/**
 * Browser navigation: load the guide data straight from Supabase (public data
 * only), like the reference pages. Never block the armour tool on it.
 */
export async function clientLoader(): Promise<ArmourGuideData | null> {
  try {
    return await publicData().armourGuide();
  } catch {
    return null;
  }
}

export function meta({ loaderData }: { loaderData?: ArmourGuideData | null }) {
  const faq = fillArmourFaq(loaderData?.sets.length ?? 0, loaderData?.pieceCount ?? 0);
  return buildMeta({
    title: page.title,
    rawTitle: true,
    description: page.description,
    path: page.path,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        url: absoluteUrl(canonicalPath(page.path)),
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Monster Hunter Outlanders Armour & Skill Builder',
        url: absoluteUrl(canonicalPath(page.path)),
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        description: page.description,
      },
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Armour', path: page.path },
      ]),
    ],
  });
}

export default function Route() {
  const data = useLoaderData<typeof clientLoader>();
  // The armour tool uses browser-only data, so it appears once the page has
  // loaded; until then (and in the pre-rendered HTML) the summary shows instead.
  const hydrated = useHydrated();
  return (
    <>
      {hydrated ? (
        <ArmourExplorer />
      ) : (
        <div className="px-1 sm:px-6 pt-2 sm:pt-3 lg:px-8 lg:pt-4">
          <ToolFallback page={page} />
        </div>
      )}
      <ArmourPageGuide data={data ?? null} />
    </>
  );
}
