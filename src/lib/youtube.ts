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
 * Builds a privacy-enhanced YouTube embed URL (youtube-nocookie.com)
 * with recommended player options for field-guide guides.
 */
export function getYouTubeEmbedUrl(urlOrId: string | null | undefined): string | null {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

/**
 * Returns true if the string resolves to a valid YouTube video ID.
 */
export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeId(url) !== null;
}
