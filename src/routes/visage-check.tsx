// Route module for the Visage Card Checker.
// The checker needs the visitor's own inputs, so it only renders in the
// browser. At build time the page summary and the Visage Card guide/FAQ are
// pre-rendered, so search engines and AI assistants can read and quote them.
// The guide is also shown under the checker for visitors.
import VisageCardChecker from '../pages/investigation-notes/VisageCardChecker';
import ToolFallback from '../components/seo/ToolFallback';
import VisageCardGuide from '../components/guides/VisageCardGuide';
import { VISAGE_FAQ } from '../components/guides/visageGuideData';
import { PAGES } from '../seo/pages';
import { breadcrumbJsonLd, buildMeta } from '../seo/meta';
import { absoluteUrl, canonicalPath } from '../seo/site';

const page = PAGES.visageCheck;

export function meta() {
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
        mainEntity: VISAGE_FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Visage Card Checker',
        url: absoluteUrl(canonicalPath(page.path)),
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        description: page.description,
      },
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Visage Card Checker', path: page.path },
      ]),
    ],
  });
}

// No data to load — this only tells React Router to render the tool in the
// browser and to pre-render HydrateFallback at build time.
export async function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return (
    <div className="px-1 sm:px-6 pb-6 pt-2 sm:pt-3 lg:px-8 lg:pb-8 lg:pt-4">
      <ToolFallback page={page} />
      <VisageCardGuide />
    </div>
  );
}

export default function Route() {
  return (
    <div className="px-1 sm:px-6 pb-6 pt-2 sm:pt-3 lg:px-8 lg:pb-8 lg:pt-4 min-h-full">
      <VisageCardChecker />
      <VisageCardGuide />
    </div>
  );
}
