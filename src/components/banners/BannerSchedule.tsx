// ─────────────────────────────────────────────────────────────
// BannerSchedule — the recruitment schedule on the Spoilers page,
// read from the banners table. Grouped by status worked out from the
// current time: Live now, Coming soon, Not scheduled (datamined),
// Always available and Past.
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { useBanners } from '../../hooks/useBanners';
import { useNow } from '../../hooks/useNow';
import { usePublicAdventurers } from '../../hooks/useAdminAdventurers';
import { bannerState, formatBannerDate, sortBanners, type BannerImage, type BannerState, type DBBanner } from '../../lib/banners';
import BannerCard from './BannerCard';

const GROUPS: { state: BannerState; title: string; blurb: string }[] = [
  { state: 'live', title: 'Live Now', blurb: 'Recruitments you can pull on right now.' },
  { state: 'upcoming', title: 'Coming Soon', blurb: 'Scheduled in the game files with start and end times.' },
  { state: 'unscheduled', title: 'Prepared – Not Scheduled', blurb: 'Datamined banners with no dates yet. Details may change before release.' },
  { state: 'permanent', title: 'Always Available', blurb: 'Permanent recruitments.' },
];

export default function BannerSchedule({ onImageClick }: { onImageClick: (img: BannerImage) => void }) {
  const { data: banners = [], isLoading, error } = useBanners();
  const { data: adventurers = [] } = usePublicAdventurers({ showSpoilers: true });
  const now = useNow(Date.now());
  const [showPast, setShowPast] = useState(false);

  const roles = useMemo(() => new Map(adventurers.map((a) => [a.id, a.role === 'Disruptor' ? 'Disrupter' : a.role])), [adventurers]);

  const grouped = useMemo(() => {
    const map = new Map<BannerState, DBBanner[]>();
    for (const b of banners) {
      const s = bannerState(b, now);
      map.set(s, [...(map.get(s) ?? []), b]);
    }
    for (const [s, list] of map) map.set(s, sortBanners(list, s));
    return map;
  }, [banners, now]);

  const linkFor = (b: DBBanner) =>
    b.featured_adventurer_id
      ? { to: `/challenges/adventurers?adventurer=${b.featured_adventurer_id}`, label: `View ${b.featured_name} in Adventurer Guide` }
      : b.featured_buddy_id
        ? { to: `/challenges/buddies?buddy=${b.featured_buddy_id}`, label: `View ${b.featured_name} in Buddies` }
        : null;

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-mh-slate-400">
        <Loader2 size={16} className="animate-spin" /> Loading recruitment schedule…
      </p>
    );
  }
  if (error) {
    return <p className="text-sm text-red-300">Couldn't load the recruitment schedule. Please refresh the page.</p>;
  }

  const past = grouped.get('ended') ?? [];

  return (
    <div className="space-y-10">
      {GROUPS.map(({ state, title, blurb }) => {
        const list = grouped.get(state) ?? [];
        if (!list.length) return null;
        return (
          <section key={state} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-mh-slate-700/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mh-gold-500/10 text-mh-gold-400 border border-mh-gold-500/20">
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-display">
                    {title} <span className="text-sm text-mh-slate-500">({list.length})</span>
                  </h2>
                  <p className="text-xs text-mh-slate-400">{blurb}</p>
                </div>
              </div>
              {state === 'live' && (
                <span className="text-xs text-mh-gold-400 font-mono">Now: {formatBannerDate(new Date(now).toISOString())}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-6">
              {list.map((b) => (
                <BannerCard
                  key={b.id}
                  banner={b}
                  state={state}
                  now={now}
                  compact={state === 'permanent'}
                  featuredLink={linkFor(b)}
                  featuredRole={b.featured_adventurer_id ? roles.get(b.featured_adventurer_id) : null}
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          </section>
        );
      })}

      {past.length > 0 && (
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="flex w-full items-center justify-between border-b border-mh-slate-700/80 pb-3 text-left"
            aria-expanded={showPast}
          >
            <span className="text-lg font-bold text-white font-display">
              Past Banners <span className="text-sm text-mh-slate-500">({past.length})</span>
            </span>
            <ChevronDown size={18} className={showPast ? 'rotate-180 transition-transform text-mh-slate-400' : 'transition-transform text-mh-slate-400'} />
          </button>
          {showPast && (
            <div className="grid grid-cols-1 gap-4">
              {past.map((b) => (
                <BannerCard key={b.id} banner={b} state="ended" now={now} compact featuredLink={linkFor(b)} onImageClick={onImageClick} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
