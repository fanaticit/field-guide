// ─────────────────────────────────────────────────────────────
// YouTube URL utilities — parser, embed builder, and validator
// ─────────────────────────────────────────────────────────────

/**
 * Extracts the 11-character YouTube video ID from various URL formats,
 * including watch, share (youtu.be), embed, shorts, and raw IDs.
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Direct 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL patterns
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

/**
 * Extracts start time in seconds from YouTube URLs supporting formats like:
 * ?t=120, &t=120s, ?t=1m30s, ?t=1h2m3s, ?start=90, #t=45
 */
export function extractYouTubeStartTime(url: string | null | undefined): number | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/[?&#](?:start|t)=([0-9hms]+)/i);
  if (!match) return null;

  const raw = match[1];
  // Pure integer seconds (e.g. 120 or 120s)
  if (/^\d+s?$/i.test(raw)) {
    return parseInt(raw, 10);
  }

  // Composite format like 1h2m3s, 2m30s, 45s
  let totalSeconds = 0;
  const hours = raw.match(/(\d+)h/i);
  const minutes = raw.match(/(\d+)m/i);
  const seconds = raw.match(/(\d+)s/i);

  if (hours) totalSeconds += parseInt(hours[1], 10) * 3600;
  if (minutes) totalSeconds += parseInt(minutes[1], 10) * 60;
  if (seconds) totalSeconds += parseInt(seconds[1], 10);

  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Builds a privacy-enhanced YouTube embed URL (youtube-nocookie.com)
 * with recommended player options and optional start timestamp.
 */
export function getYouTubeEmbedUrl(urlOrId: string | null | undefined): string | null {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;

  const startTime = extractYouTubeStartTime(urlOrId);
  const startParam = startTime && startTime > 0 ? `&start=${startTime}` : '';

  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0${startParam}`;
}

/**
 * Returns true if the string resolves to a valid YouTube video ID.
 */
export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeId(url) !== null;
}

