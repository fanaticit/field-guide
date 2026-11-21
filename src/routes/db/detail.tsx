// ─────────────────────────────────────────────────────────────
// Reference detail pages: /monsters/:slug/, /weapons/:slug/, …
//
// • Build time: `loader` reads public game data and the page is
//   written to static HTML (what search engines and AI crawlers see).
// • In the browser: `clientLoader` loads the same data from Supabase
//   for client-side navigation, and the component refreshes in the
//   background so visitors always end up with current data.
// No user data is ever read here.
// ─────────────────────────────────────────────────────────────
import { data, useLoaderData, useRouteError, isRouteErrorResponse } from 'react-router';
import type { LoaderFunctionArgs, MetaArgs } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { publicData, type DetailPage } from '../../seo/publicData';
import { REFERENCE } from '../../seo/pages';
import { kindFromPath, loaderPath } from '../../seo/reference';
import { breadcrumbJsonLd, buildMeta } from '../../seo/meta';
import { absoluteUrl, GAME_NAME } from '../../seo/site';
import {
  AdventurerDetail,
  BuddyDetail,
  MonsterDetail,
  VisageDetail,
  WeaponDetail,
} from '../../components/reference/details';
import {
  adventurerSummary,
  buddySummary,
  monsterSummary,
  visageSummary,
  weaponSummary,
} from '../../seo/summaries';
import NotFoundView from '../../components/seo/NotFoundView';

const KIND_SEGMENT = {
  monster: 'monsters',
  weapon: 'weapons',
  adventurer: 'adventurers',
  buddy: 'buddies',
  visage: 'visages',
} as const satisfies Record<DetailPage['kind'], string>;

async function loadPage(args: LoaderFunctionArgs): Promise<DetailPage> {
  const kind = kindFromPath(loaderPath(args));
  const slug = args.params.slug;
  if (!kind || !slug) throw data('Not found', { status: 404 });
  const page = await publicData().page(kind, slug);
  if (!page) throw data('Not found', { status: 404 });
  return page;
}

export async function loader(args: LoaderFunctionArgs) {
  return loadPage(args);
}

export async function clientLoader(args: LoaderFunctionArgs) {
  return loadPage(args);
}

function describe(page: DetailPage): { name: string; title: string; summary: string; image: string | null } {
  switch (page.kind) {
    case 'monster':
      return {
        name: page.monster.name,
        title: `${page.monster.name} – Weaknesses, Hitzones & Stats | ${GAME_NAME}`,
        summary: monsterSummary(page),
        image: page.monster.icon,
      };
    case 'weapon':
      return {
        name: page.weapon.name,
        title: `${page.weapon.name} – Stats & Upgrades | ${GAME_NAME}`,
        summary: weaponSummary(page),
        image: page.weapon.image,
      };
    case 'adventurer':
      return {
        name: page.adventurer.name,
        title: `${page.adventurer.name} – Skills, Role & Weapon | ${GAME_NAME}`,
        summary: adventurerSummary(page),
        image: page.adventurer.image,
      };
    case 'buddy':
      return {
        name: page.buddy.name,
        title: `${page.buddy.name} – Buddy Skills & Passive | ${GAME_NAME}`,
        summary: buddySummary(page),
        image: page.buddy.image,
      };
    case 'visage':
      return {
        name: page.visage.name,
        title: `${page.visage.name} Visage Card – Core Effect & Inks | ${GAME_NAME}`,
        summary: visageSummary(page),
        image: page.monster?.icon ?? null,
      };
  }
}

export function meta({ loaderData, location }: MetaArgs<typeof loader>) {
  const kind = kindFromPath(location.pathname) ?? 'monsters';
  if (!loaderData) return buildMeta({ title: 'Not found', noindex: true });
  const info = describe(loaderData);
  const path = `/${kind}/${loaderData.slug}`;
  return buildMeta({
    title: info.title,
    rawTitle: true,
    description: info.summary,
    path,
    image: info.image,
    type: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: info.title,
        description: info.summary,
        url: absoluteUrl(`${path}/`),
        dateModified: loaderData.fetchedAt,
        isPartOf: { '@type': 'WebSite', name: 'Monster Hunter Outlanders Field Guide', url: absoluteUrl('/') },
        about: { '@type': 'VideoGame', name: GAME_NAME },
        mainEntity: {
          '@type': 'Thing',
          name: info.name,
          description: info.summary,
          ...(info.image ? { image: absoluteUrl(info.image) } : {}),
        },
      },
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: REFERENCE[kind].plural, path: `/${kind}` },
        { name: info.name, path },
      ]),
    ],
  });
}

export function HydrateFallback() {
  return <div className="p-8 text-center text-sm text-mh-slate-500">Loading…</div>;
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundView message="We couldn't find that entry. It may have been renamed or removed from the game." />;
  }
  return <NotFoundView message="Something went wrong loading this page. Please try again in a moment." />;
}

export default function ReferenceDetail() {
  const initial = useLoaderData<typeof loader>();
  const kind = KIND_SEGMENT[initial.kind];

  // Show the build-time data immediately, then refresh it from Supabase in the background.
  const { data: page } = useQuery({
    queryKey: ['public-page', kind, initial.slug],
    queryFn: async () => (await publicData().page(kind, initial.slug)) ?? initial,
    initialData: initial,
    initialDataUpdatedAt: Date.parse(initial.fetchedAt),
    staleTime: 5 * 60 * 1000,
  });

  switch (page.kind) {
    case 'monster':
      return <MonsterDetail page={page} />;
    case 'weapon':
      return <WeaponDetail page={page} />;
    case 'adventurer':
      return <AdventurerDetail page={page} />;
    case 'buddy':
      return <BuddyDetail page={page} />;
    case 'visage':
      return <VisageDetail page={page} />;
  }
}
