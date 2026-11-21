import { Link } from 'react-router';
import { REFERENCE, REFERENCE_KINDS } from '../../seo/pages';

export default function NotFoundView({ message }: { message?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <div className="mho-panel px-6 py-10 shadow-xl">
        <p className="font-display text-5xl font-black text-mh-gold-400">404</p>
        <h1 className="mt-2 font-display text-xl font-bold uppercase tracking-wide text-white">Page not found</h1>
        <p className="mt-3 text-sm text-mh-slate-400">
          {message ?? 'This page has wandered off the map. It may have moved, or the link may be wrong.'}
        </p>
        <nav aria-label="Popular pages" className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
          <Link to="/" className="btn-mho-gold rounded-lg !px-4 !py-2 font-semibold">
            Back to the Field Guide
          </Link>
          {REFERENCE_KINDS.map((k) => (
            <Link
              key={k}
              to={`/${k}/`}
              className="rounded-lg border border-white/15 px-3 py-2 text-mh-slate-300 hover:border-mh-gold-400 hover:text-mh-gold-400"
            >
              {REFERENCE[k].plural}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
