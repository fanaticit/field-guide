// ─────────────────────────────────────────────────────────────
// ToolFallback — the pre-rendered summary of an interactive page.
//
// Interactive tools (planner, collections, challenges…) depend on the
// visitor's own data, so they only render in the browser. This
// component is what is baked into their static HTML instead: the page
// heading, a plain description and links to the reference pages. It is
// what visitors see for a moment while the tool loads, and what search
// engines and AI crawlers read.
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import type { PageInfo } from '../../seo/pages';

export default function ToolFallback({ page }: { page: PageInfo }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="mho-panel px-5 py-5 shadow-xl">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide text-white">{page.heading}</h1>
        <p className="mt-2 text-sm leading-relaxed text-mh-slate-300">{page.description}</p>
        {page.intro?.map((p) => (
          <p key={p} className="mt-2 text-sm leading-relaxed text-mh-slate-400">
            {p}
          </p>
        ))}
        {page.related && page.related.length > 0 && (
          <nav aria-label="Related reference pages" className="mt-4 flex flex-wrap gap-2 text-xs">
            {page.related.map((r) => (
              <Link
                key={r.path}
                to={r.path}
                className="rounded-full border border-white/15 px-3 py-1 text-mh-slate-300 hover:border-mh-gold-400 hover:text-mh-gold-400"
              >
                {r.label}
              </Link>
            ))}
          </nav>
        )}
        <p className="mt-5 flex items-center gap-2 text-xs text-mh-slate-500" role="status">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Loading the tool…
        </p>
      </section>
    </div>
  );
}
