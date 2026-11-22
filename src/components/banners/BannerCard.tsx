// ─────────────────────────────────────────────────────────────
// BannerCard — one recruitment banner on the Spoilers page.
// Pure render: the status is passed in so
// the caller decides which clock to use.
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router';
import { ArrowRight, Calendar, Clock, Maximize2, UserCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CATEGORY_INFO,
  STATE_LABEL,
  countdownText,
  formatBannerDate,
  readable,
  type BannerImage,
  type BannerState,
  type DBBanner,
} from '../../lib/banners';

const ACCENT = {
  gold: { name: 'text-mh-gold-300', chip: 'bg-mh-gold-500/15 border-mh-gold-500/35 text-mh-gold-300 hover:bg-mh-gold-500 hover:text-mh-slate-950' },
  blue: { name: 'text-blue-300', chip: 'bg-blue-500/15 border-blue-500/35 text-blue-300 hover:bg-blue-500 hover:text-white' },
  green: { name: 'text-emerald-300', chip: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500 hover:text-white' },
  slate: { name: 'text-mh-slate-200', chip: 'bg-white/5 border-white/15 text-mh-slate-200 hover:bg-white/10' },
} as const;

export function StatusBadge({ state }: { state: BannerState }) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border';
  switch (state) {
    case 'live':
      return (
        <span className={cn(base, 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm')}>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          {STATE_LABEL.live}
        </span>
      );
    case 'upcoming':
      return (
        <span className={cn(base, 'bg-amber-500/20 text-amber-300 border-amber-500/40')}>
          <Clock size={12} />
          {STATE_LABEL.upcoming}
        </span>
      );
    case 'unscheduled':
      return <span className={cn(base, 'bg-purple-500/15 text-purple-300 border-purple-500/40')}>{STATE_LABEL.unscheduled}</span>;
    case 'permanent':
      return <span className={cn(base, 'bg-sky-500/15 text-sky-300 border-sky-500/35')}>{STATE_LABEL.permanent}</span>;
    default:
      return <span className={cn(base, 'bg-mh-slate-800 text-mh-slate-400 border-mh-slate-700')}>{STATE_LABEL.ended}</span>;
  }
}

interface BannerCardProps {
  banner: DBBanner;
  state: BannerState;
  now: number;
  /** Link to the featured adventurer or buddy */
  featuredLink?: { to: string; label: string } | null;
  featuredRole?: string | null;
  /** Smaller layout for ended / permanent banners */
  compact?: boolean;
  onImageClick?: (img: BannerImage) => void;
}

export default function BannerCard({ banner, state, now, featuredLink, featuredRole, compact, onImageClick }: BannerCardProps) {
  const info = CATEGORY_INFO[banner.category] ?? CATEGORY_INFO.other;
  const accent = ACCENT[info.accent];
  const countdown = countdownText(banner, state, now);
  const isBuddy = banner.category === 'buddy';
  const hero = banner.hero_image ?? banner.icon;
  const heroAlt = `${banner.name}${banner.featured_name ? ` – ${banner.featured_name}` : ''} banner art`;
  const monster = readable(banner.featured_monster);
  const weapon = readable(banner.featured_weapon);
  const isFeaturedRules = banner.category === 'featured' || banner.category === 'festival';

  return (
    <article
      id={`banner-${banner.id}`}
      className={cn(
        'rounded-2xl border shadow-xl relative overflow-hidden transition-all',
        compact ? 'p-4' : 'p-5 sm:p-7',
        state === 'live'
          ? 'border-emerald-500/50 bg-gradient-to-b from-mh-slate-900/95 via-mh-slate-900/90 to-mh-slate-950 ring-1 ring-emerald-500/30'
          : 'border-white/10 bg-mh-slate-900/80',
      )}
    >
      {/* Header: status, name, dates */}
      <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-white/10', compact ? 'pb-3 mb-3' : 'pb-4 mb-5')}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {banner.icon && (
            <img src={banner.icon} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-contain" loading="lazy" />
          )}
          <StatusBadge state={state} />
          <h3 className={cn('font-display font-bold text-white', compact ? 'text-lg' : 'text-xl sm:text-2xl')}>{banner.name}</h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-mh-slate-300 border border-white/10">
            {banner.banner_type || info.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {countdown && <span className="font-semibold text-amber-300">{countdown}</span>}
          {!banner.is_permanent && (
            <span className="flex items-center gap-2 text-mh-slate-300 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              <Calendar size={13} className="text-mh-gold-400" />
              <time dateTime={banner.start_at ?? undefined}>{formatBannerDate(banner.start_at)}</time>
              <span aria-hidden="true">→</span>
              <time dateTime={banner.end_at ?? undefined}>{formatBannerDate(banner.end_at)}</time>
            </span>
          )}
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-6 items-start', !compact && hero && 'lg:grid-cols-12')}>
        {/* Art */}
        {hero && !compact && (
          <div className="lg:col-span-5 space-y-3">
            <button
              type="button"
              className={cn(
                'group relative block aspect-[16/11] w-full rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-lg',
                onImageClick ? 'cursor-zoom-in' : 'cursor-default',
              )}
              onClick={() => onImageClick?.({ src: hero, caption: heroAlt })}
            >
              <img
                src={hero}
                alt={heroAlt}
                loading="lazy"
                className={cn(
                  'h-full w-full transition-transform duration-300 group-hover:scale-105',
                  isBuddy || !banner.hero_image ? 'object-contain p-3' : 'object-cover object-[50%_30%]',
                )}
              />
              {onImageClick && (
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <span className="text-xs font-semibold text-white drop-shadow">Click to inspect</span>
                  <Maximize2 size={16} className="text-white drop-shadow" />
                </span>
              )}
            </button>

            {banner.gallery.length > 0 && (
              <ul className="flex flex-wrap items-center gap-2">
                {banner.gallery.map((img) => (
                  <li key={img.src}>
                    <button
                      type="button"
                      onClick={() => onImageClick?.(img)}
                      title={img.caption}
                      className="group relative block h-16 w-16 rounded-lg overflow-hidden border border-white/10 bg-black/60 hover:border-mh-gold-500/60 transition-colors"
                    >
                      <img src={img.src} alt={img.caption} loading="lazy" className="h-full w-full object-cover object-top group-hover:scale-110 transition-transform" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Details */}
        <div className={cn('space-y-4', !compact && hero && 'lg:col-span-7')}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {banner.featured_name && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <span className="text-mh-slate-400 block text-[10px] uppercase">Featured {banner.featured_type === 'Buddy' ? 'buddy' : 'adventurer'}</span>
                <span className={cn('text-base font-bold', accent.name)}>{banner.featured_name}</span>
              </div>
            )}
            {(weapon || featuredRole || monster) && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <span className="text-mh-slate-400 block text-[10px] uppercase">{weapon ? 'Weapon' : 'Monster'}{featuredRole ? ' / Role' : ''}</span>
                <span className="text-sm font-semibold text-white">
                  {weapon ?? monster}
                  {featuredRole ? ` (${featuredRole})` : ''}
                </span>
              </div>
            )}
            {info.currency && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-mh-slate-400 block text-[10px] uppercase">Recruitment currency</span>
                <span className={cn('text-xs font-semibold', accent.name)}>{info.currency}</span>
              </div>
            )}
          </div>

          {(banner.rate_up_text || banner.notes || isFeaturedRules || banner.ssr_pool.length > 0) && (
            <div className="rounded-xl bg-black/25 p-4 border border-white/5 text-xs text-mh-slate-300 leading-relaxed space-y-2">
              {banner.rate_up_text && <p>{banner.rate_up_text}</p>}
              {banner.notes && <p className="text-mh-slate-200">{banner.notes}</p>}
              {isFeaturedRules && !compact && (
                <ul className="list-disc list-inside space-y-1 text-mh-slate-400">
                  <li>Featured SSR guarantee: within 90 recruits (50% chance the first SSR is the featured adventurer, 100% on the next).</li>
                  <li>{`Featured banner guarantee: ${banner.featured_pity || '120 recruits'}, once per banner period.`}</li>
                  <li>
                    {banner.category === 'festival'
                      ? 'Festival Recruitments have their own SR (10) and SSR (90) pity counters; SSR pity carries over only to other Festival recruitments.'
                      : 'SSR pity carries over only to other Featured recruitments (not to Festival ones).'}
                  </li>
                </ul>
              )}
              {banner.ssr_pool.length > 0 && (
                <p className="text-mh-slate-400">
                  <span className="font-semibold text-mh-slate-300">SSR pool:</span> {banner.ssr_pool.join(', ')}
                </p>
              )}
            </div>
          )}

          {featuredLink && (
            <div className="pt-1">
              <Link
                to={featuredLink.to}
                className={cn('inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all shadow-sm group', accent.chip)}
              >
                <UserCheck size={14} className="group-hover:scale-110 transition-transform" />
                <span>{featuredLink.label}</span>
                <ArrowRight size={13} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
