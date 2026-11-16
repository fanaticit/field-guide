// ─────────────────────────────────────────────────────────────
// siteMetadata.ts — typed loader for root METADATA.json
// Supports both structured change objects and legacy change strings.
// ─────────────────────────────────────────────────────────────
import rawMetadata from '../../METADATA.json';

export interface SiteChangeItem {
  title: string;
  description: string;
  page_url?: string | null;
  page_label?: string | null;
}

export interface SiteMetadata {
  name: string;
  version: string;
  update?: string;
  date?: string;
  title?: string;
  description?: string;
  youtube_url?: string | null;
  changes: SiteChangeItem[];
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

export const siteMetadata: SiteMetadata = {
  name: rawMetadata.name || 'monster_hunter_field_guide',
  version: rawMetadata.version || '1.1.0',
  update: rawMetadata.update || rawMetadata.version || '1.1.0',
  date: rawMetadata.date,
  title: rawMetadata.title || rawMetadata.description || 'Latest Updates',
  description: rawMetadata.description,
  youtube_url: rawMetadata.youtube_url || null,
  changes: Array.isArray(rawMetadata.changes) ? rawMetadata.changes.map(parseChange) : [],
};
