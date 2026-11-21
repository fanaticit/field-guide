// ─────────────────────────────────────────────────────────────
// ReferenceShell — shared frame for the public reference pages
// (/monsters, /weapons, /adventurers, /buddies, /visages).
// Plain, server-renderable markup only: no user data, no browser APIs.
// ─────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { canonicalPath } from '../../seo/site';

export interface Crumb {
  label: string;
  path: string;
}

interface ReferenceShellProps {
  crumbs: Crumb[];
  title: string;
  subtitle?: ReactNode;
  image?: string | null;
  /** Link to the interactive tool for this kind of item */
  tool?: { label: string; path: string };
  updatedAt?: string;
  children: ReactNode;
}

export default function ReferenceShell({ crumbs, title, subtitle, image, tool, updatedAt, children }: ReferenceShellProps) {
  return (
    <article className="mx-auto max-w-5xl px-3 py-5 sm:px-6 lg:px-8 space-y-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] text-mh-slate-500">
        {crumbs.map((c, i) => (
          <span key={c.path} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
            {i < crumbs.length - 1 ? (
              <Link to={canonicalPath(c.path)} className="hover:text-mh-gold-400">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-mh-slate-300">
                {c.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <header className="mho-panel flex flex-wrap items-center gap-4 px-4 py-4 shadow-xl">
        {image && (
          <img
            src={image}
            alt={title}
            width={72}
            height={72}
            loading="eager"
            className="h-16 w-16 shrink-0 rounded-lg bg-black/30 object-contain sm:h-[72px] sm:w-[72px]"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold tracking-wide text-white sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-1 text-xs text-mh-slate-400 sm:text-sm">{subtitle}</div>}
        </div>
        {tool && (
          <Link
            to={tool.path}
            className="btn-mho-gold inline-flex items-center gap-2 rounded-lg !px-3 !py-2 text-xs font-semibold"
          >
            {tool.label}
            <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
      </header>

      {children}

      {updatedAt && (
        <p className="text-[11px] text-mh-slate-600">
          Data last updated{' '}
          <time dateTime={updatedAt}>{new Date(updatedAt).toISOString().slice(0, 10)}</time>. Unofficial fan
          reference for Monster Hunter Outlanders.
        </p>
      )}
    </article>
  );
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mho-panel px-4 py-4 shadow-lg">
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-mh-gold-400">{title}</h2>
      {children}
    </section>
  );
}

export function FactList({ facts }: { facts: [string, ReactNode][] }) {
  const shown = facts.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false);
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="flex gap-2 border-b border-white/5 pb-1">
          <dt className="w-36 shrink-0 text-mh-slate-500">{k}</dt>
          <dd className="text-mh-slate-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: (string | number | null)[][];
}) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-white/10 text-mh-slate-400">
            {headers.map((h) => (
              <th key={h} scope="col" className="px-2 py-1.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5 text-mh-slate-200 odd:bg-white/[0.02]">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-2 py-1.5 font-medium text-white">
                    {c ?? '–'}
                  </th>
                ) : (
                  <td key={j} className="px-2 py-1.5 tabular-nums">
                    {c ?? '–'}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkChips({ base, items }: { base: string; items: { name: string; slug: string }[] }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2 text-xs">
      {items.map((i) => (
        <li key={i.slug}>
          <Link
            to={`/${base}/${i.slug}/`}
            className="inline-block rounded-full border border-white/15 px-3 py-1 text-mh-slate-200 hover:border-mh-gold-400 hover:text-mh-gold-400"
          >
            {i.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
