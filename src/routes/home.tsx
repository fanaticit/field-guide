import LandingPage from '../pages/LandingPage';
import { PAGES } from '../seo/pages';
import { buildMeta } from '../seo/meta';
import { absoluteUrl, GAME_NAME, SITE_NAME, YOUTUBE_CHANNEL_URL } from '../seo/site';

const page = PAGES.home;

export function meta() {
  return buildMeta({
    title: page.title,
    rawTitle: true,
    description: page.description,
    path: page.path,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        alternateName: ['MHO Field Guide', 'Field Guide'],
        url: absoluteUrl('/'),
        description: page.description,
        inLanguage: 'en',
        about: { '@type': 'VideoGame', name: GAME_NAME },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: page.description,
        ...(YOUTUBE_CHANNEL_URL ? { sameAs: [YOUTUBE_CHANNEL_URL] } : {}),
      },
    ],
  });
}

export default function Route() {
  return <LandingPage />;
}
