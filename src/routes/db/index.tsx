// ─────────────────────────────────────────────────────────────
// Reference index pages: /monsters/, /weapons/, /adventurers/,
// /buddies/, /visages/. Pre-rendered with public game data at build
// time; client-side navigation loads the same data from Supabase.
// ─────────────────────────────────────────────────────────────
import { Link, data, useLoaderData, useLocation } from 'react-router';
import type { LoaderFunctionArgs, MetaArgs } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { publicData, type IndexEntry } from '../../seo/publicData';
import { REFERENCE, type ReferenceKind } from '../../seo/pages';
import { kindFromPath, loaderPath } from '../../seo/reference';
import { breadcrumbJsonLd, buildMeta } from '../../seo/meta';
import { absoluteUrl } from '../../seo/site';
import ReferenceShell, { Section } from '../../components/reference/ReferenceShell';
import NotFoundView from '../../components/seo/NotFoundView';

interface IndexData {
  kind: ReferenceKind;
  entries: IndexEntry[];
  fetchedAt: string;
}

async function loadIndex(args: LoaderFunctionArgs): Promise<IndexData> {
  const kind = kindFromPath(loaderPath(args));
  if (!kind) throw data('Not found', { status: 404 });
  const entries = await publicData().index(kind);
  return { kind, entries, fetchedAt: new Date().toISOString() };
}

export async function loader(args: LoaderFunctionArgs) {
  return loadIndex(args);
}

export async function clientLoader(args: LoaderFunctionArgs) {
  return loadIndex(args);
}

export function meta({ loaderData, location }: MetaArgs<typeof loader>) {
  const kind = loaderData?.kind ?? kindFromPath(location.pathname) ?? 'monsters';
  const ref = REFERENCE[kind];
  const path = `/${kind}`;
  const entries = loaderData?.entries ?? [];
  return buildMeta({
    title: ref.title,
    rawTitle: true,
    description: ref.description,
    path,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: ref.title,
        description: ref.description,
        url: absoluteUrl(`${path}/`),
        about: { '@type': 'VideoGame', name: 'Monster Hunter Outlanders' },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: entries.length,
          itemListElement: entries.map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: e.name,
            url: absoluteUrl(`/${kind}/${e.slug}/`),
          })),
        },
      },
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: ref.plural, path },
      ]),
    ],
  });
}

export function HydrateFallback() {
  return <div className="p-8 text-center text-sm text-mh-slate-500">Loading…</div>;
}

export function ErrorBoundary() {
  return <NotFoundView />;
}

export default function ReferenceIndex() {
  const initial = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const kind = initial.kind ?? kindFromPath(pathname);
  const ref = REFERENCE[kind];

  // Show the build-time list immediately, then refresh it from Supabase in the background.
  const { data: entries } = useQuery({
    queryKey: ['public-index', kind],
    queryFn: () => publicData().index(kind),
    initialData: initial.entries,
    initialDataUpdatedAt: Date.parse(initial.fetchedAt),
    staleTime: 5 * 60 * 1000,
  });

  const groups = new Map<string, IndexEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.group) ?? [];
    list.push(e);
    groups.set(e.group, list);
  }

  return (
    <ReferenceShell
      crumbs={[
        { label: 'Home', path: '/' },
        { label: ref.plural, path: `/${kind}` },
      ]}
      title={`${ref.plural} in Monster Hunter Outlanders`}
      subtitle={`${entries.length} ${entries.length === 1 ? ref.singular : ref.plural.toLowerCase()} · ${ref.description}`}
      tool={{ label: ref.toolLabel, path: ref.toolPath }}
      updatedAt={initial.fetchedAt}
    >
      {[...groups.entries()].map(([group, items]) => (
        <Section key={group} title={`${group} (${items.length})`}>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/${kind}/${e.slug}/`}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 hover:border-mh-gold-400"
                >
                  {e.image ? (
                    <img src={e.image} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 object-contain" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded bg-white/5" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{e.name}</span>
                    {e.facts.length > 0 && (
                      <span className="block truncate text-[11px] text-mh-slate-400">{e.facts.join(' · ')}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </ReferenceShell>
  );
}
