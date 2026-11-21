// ─────────────────────────────────────────────────────────────
// meta.ts — Builds React Router `meta` descriptors for a page:
// title, description, canonical link, Open Graph / Twitter tags,
// optional JSON-LD and optional noindex.
// ─────────────────────────────────────────────────────────────
import type { MetaDescriptor } from 'react-router';
import {
  absoluteUrl,
  canonicalPath,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_SHORT_NAME,
} from './site';

export interface PageSeo {
  /** Page title. " | MHO Field Guide" is appended unless `rawTitle` is set. */
  title?: string;
  rawTitle?: boolean;
  description?: string;
  /** Path of the page, used for the canonical link (e.g. "/monsters/rathalos") */
  path?: string;
  image?: string | null;
  /** Hide the page from search engines (settings, admin, 404s, spoilers) */
  noindex?: boolean;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function pageTitle(title?: string, raw = false): string {
  if (!title) return DEFAULT_TITLE;
  if (raw) return title;
  return `${title} | ${SITE_SHORT_NAME}`;
}

export function buildMeta(seo: PageSeo = {}): MetaDescriptor[] {
  const title = pageTitle(seo.title, seo.rawTitle);
  const description = trimDescription(seo.description ?? DEFAULT_DESCRIPTION);
  const image = absoluteUrl(seo.image || DEFAULT_OG_IMAGE);
  const tags: MetaDescriptor[] = [
    { title },
    { name: 'description', content: description },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: seo.type ?? 'website' },
    { property: 'og:image', content: image },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ];

  if (seo.path !== undefined) {
    const url = absoluteUrl(canonicalPath(seo.path));
    tags.push({ tagName: 'link', rel: 'canonical', href: url });
    tags.push({ property: 'og:url', content: url });
  }

  if (seo.noindex) {
    tags.push({ name: 'robots', content: 'noindex, follow' });
  }

  if (seo.jsonLd) {
    const blocks = Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd];
    for (const block of blocks) {
      tags.push({ 'script:ld+json': block });
    }
  }

  return tags;
}

/** Keeps descriptions within the ~160 characters search engines display. */
export function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : cut.length).replace(/[,.;:\s]+$/, '')}…`;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(canonicalPath(item.path)),
    })),
  };
}
