// ─────────────────────────────────────────────────────────────
// siteMetadata.ts — typed loader for root METADATA.json
// Supports structured change objects, legacy change strings,
// video aspect ratios, and historical release notes.
// ─────────────────────────────────────────────────────────────
import rawMetadata from '../../METADATA.json';

export interface SiteChangeItem {
  title: string;
  description: string;
  page_url?: string | null;
  page_label?: string | null;
}

export interface ReleaseItem {
  version: string;
  update?: string;
  date?: string;
  title: string;
  description?: string;
  youtube_url?: string | null;
  video_aspect?: 'shorts' | 'standard' | string;
  changes: SiteChangeItem[];
}

export interface SiteMetadata {
  name: string;
  version: string;
  update?: string;
  date?: string;
  title?: string;
  description?: string;
  youtube_url?: string | null;
  video_aspect?: 'shorts' | 'standard' | string;
  changes: SiteChangeItem[];
  releases: ReleaseItem[];
}

function parseChange(item: unknown): SiteChangeItem {
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>;
    return {
      title: String(obj.title || ''),
      description: String(obj.description || ''),
      page_url: typeof obj.page_url === 'string' ? obj.page_url : null,
      page_label: typeof obj.page_label === 'string' ? obj.page_label : null,
    };
  }

  const str = String(item || '');
  const colonIdx = str.indexOf(':');
  const title = colonIdx !== -1 ? str.slice(0, colonIdx).trim() : 'Update';
  const desc = colonIdx !== -1 ? str.slice(colonIdx + 1).trim() : str;

  let page_url: string | null = null;
  let page_label: string | null = null;
  const linkMatch = desc.match(/\(((\/[a-zA-Z0-9_\-/]+))\)/);
  if (linkMatch) {
    page_url = linkMatch[1];
    if (page_url.includes('collection')) page_label = 'Visage Collection';
    else if (page_url.includes('monsters')) page_label = 'Monster Guide';
    else if (page_url.includes('planner')) page_label = 'Build Planner';
    else if (page_url.includes('armour')) page_label = 'Armour Guide';
    else if (page_url.includes('set')) page_label = 'Visage Set Builder';
    else page_label = 'View Page';
  }

  return { title, description: desc, page_url, page_label };
}

function parseRelease(r: Record<string, unknown>): ReleaseItem {
  return {
    version: String(r.version || ''),
    update: r.update ? String(r.update) : undefined,
    date: r.date ? String(r.date) : undefined,
    title: String(r.title || ''),
    description: r.description ? String(r.description) : undefined,
    youtube_url: typeof r.youtube_url === 'string' ? r.youtube_url : null,
    video_aspect: typeof r.video_aspect === 'string' ? r.video_aspect : undefined,
    changes: Array.isArray(r.changes) ? r.changes.map(parseChange) : [],
  };
}

const parsedChanges = Array.isArray(rawMetadata.changes) ? rawMetadata.changes.map(parseChange) : [];

const parsedReleases: ReleaseItem[] = Array.isArray((rawMetadata as Record<string, unknown>).releases)
  ? ((rawMetadata as Record<string, unknown>).releases as Record<string, unknown>[]).map(parseRelease)
  : [
      {
        version: rawMetadata.version || '1.2.0',
        update: rawMetadata.update || rawMetadata.version || '1.2.0',
        date: rawMetadata.date,
        title: rawMetadata.title || rawMetadata.description || 'Latest Updates',
        description: rawMetadata.description,
        youtube_url: rawMetadata.youtube_url || null,
        video_aspect: (rawMetadata as Record<string, unknown>).video_aspect as string || undefined,
        changes: parsedChanges,
      },
    ];

export const siteMetadata: SiteMetadata = {
  name: rawMetadata.name || 'monster_hunter_field_guide',
  version: rawMetadata.version || '1.2.0',
  update: rawMetadata.update || rawMetadata.version || '1.2.0',
  date: rawMetadata.date,
  title: rawMetadata.title || rawMetadata.description || 'Latest Updates',
  description: rawMetadata.description,
  youtube_url: rawMetadata.youtube_url || null,
  video_aspect: (rawMetadata as Record<string, unknown>).video_aspect as string || undefined,
  changes: parsedChanges,
  releases: parsedReleases,
};
