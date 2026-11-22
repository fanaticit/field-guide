// ─────────────────────────────────────────────────────────────
// banners.ts — Recruitment banner types and helpers shared by the
// Spoilers page (banners are never shown publicly).
//
// A banner's status is never stored: it is worked out from its start
// and end times, so it switches from Coming soon → Live → Ended on the
// day without a re-import or redeploy.
// ─────────────────────────────────────────────────────────────

export type BannerCategory = 'featured' | 'festival' | 'rotating' | 'buddy' | 'standard' | 'beginner' | 'other';

export interface BannerImage {
  src: string;
  caption: string;
}

export interface DBBanner {
  id: string;
  name: string;
  banner_type: string | null;
  category: BannerCategory;
  series: number | null;
  featured_type: string | null;
  featured_item_id: string | null;
  featured_name: string | null;
  featured_adventurer_id: string | null;
  featured_buddy_id: string | null;
  featured_monster: string | null;
  featured_weapon: string | null;
  start_at: string | null;
  end_at: string | null;
  is_permanent: boolean;
  rate_up_text: string | null;
  featured_pity: string | null;
  ssr_pool: string[];
  icon: string | null;
  hero_image: string | null;
  gallery: BannerImage[];
  is_spoiler: boolean;
  /** Optional note written by an admin, shown on the banner card */
  notes: string | null;
  sort_order: number;
}

export type BannerState = 'live' | 'upcoming' | 'ended' | 'permanent' | 'unscheduled';

export function bannerState(b: Pick<DBBanner, 'start_at' | 'end_at' | 'is_permanent'>, now: number): BannerState {
  if (b.is_permanent) return 'permanent';
  if (!b.start_at) return 'unscheduled';
  const start = Date.parse(b.start_at);
  const end = b.end_at ? Date.parse(b.end_at) : Infinity;
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'live';
}

export const STATE_LABEL: Record<BannerState, string> = {
  live: 'Live now',
  upcoming: 'Coming soon',
  ended: 'Ended',
  permanent: 'Always available',
  unscheduled: 'Not scheduled yet',
};

export const CATEGORY_INFO: Record<BannerCategory, { label: string; currency: string; accent: 'gold' | 'blue' | 'green' | 'slate' }> = {
  featured: { label: 'Featured Recruitment', currency: 'Featured Contracts', accent: 'gold' },
  festival: { label: 'Festival Recruitment', currency: 'Featured Contracts', accent: 'gold' },
  rotating: { label: 'Rotating Recruitment', currency: 'Standard Contracts', accent: 'blue' },
  buddy: { label: 'Buddy Recruitment', currency: 'Buddy recruitment', accent: 'green' },
  standard: { label: 'Standard Recruitment', currency: 'Standard Contracts', accent: 'slate' },
  beginner: { label: "Beginner's Recruitment", currency: 'Standard Contracts', accent: 'slate' },
  other: { label: 'Recruitment', currency: '', accent: 'slate' },
};

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** "27 Nov 2026, 03:00 UTC" — always UTC so the build and the browser agree. */
export function formatBannerDate(iso: string | null): string {
  if (!iso) return 'TBC';
  return `${DATE_FMT.format(new Date(iso))} UTC`;
}

/** "3d 4h", "5h 12m", "8m" */
export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "Ends in 3d 4h" / "Starts in 5d 1h" / null */
export function countdownText(b: DBBanner, state: BannerState, now: number): string | null {
  if (state === 'live' && b.end_at) return `Ends in ${formatDuration(Date.parse(b.end_at) - now)}`;
  if (state === 'upcoming' && b.start_at) return `Starts in ${formatDuration(Date.parse(b.start_at) - now)}`;
  return null;
}

/** Monster notes in the export are sometimes untranslated; only show readable ones. */
export function readable(text: string | null): string | null {
  return text && /[A-Za-z]/.test(text) ? text : null;
}

export function normalizeBanner(row: Record<string, unknown>): DBBanner {
  return {
    ...(row as unknown as DBBanner),
    ssr_pool: Array.isArray(row.ssr_pool) ? (row.ssr_pool as string[]) : [],
    gallery: Array.isArray(row.gallery) ? (row.gallery as BannerImage[]) : [],
    is_permanent: Boolean(row.is_permanent),
    is_spoiler: Boolean(row.is_spoiler),
  };
}

/** Order inside a group: live/upcoming by start date, ended newest first. */
export function sortBanners(list: DBBanner[], state: BannerState): DBBanner[] {
  const start = (b: DBBanner) => (b.start_at ? Date.parse(b.start_at) : 0);
  return list.slice().sort((a, b) =>
    state === 'ended' ? start(b) - start(a) : start(a) - start(b) || a.sort_order - b.sort_order,
  );
}
