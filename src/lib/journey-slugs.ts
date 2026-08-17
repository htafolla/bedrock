/**
 * Public journey URL ids vs stable content ids (mirrors chamber-slugs).
 *
 * Prefer human titles in the path when the old id was too narrow
 * (e.g. spouse-left → marriage-shaken).
 */

/** Internal id → preferred public path segment (when different). */
export const JOURNEY_PUBLIC_SLUG: Readonly<Record<string, string>> = {
  // no-op for now — id is already public-preferred
}

/** Public (or legacy) path segment → internal journey id. */
export const JOURNEY_SLUG_ALIASES: Readonly<Record<string, string>> = {
  // Legacy: “spouse left” was too narrow for the whole marriage path
  'spouse-left': 'marriage-shaken',
  'marriage-under-fire': 'marriage-shaken',
  'marriage-shaken': 'marriage-shaken',
}

/** Resolve any /j/ or ?j= segment to the stable content id. */
export function resolveJourneyIdFromSlug(slug: string): string {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
  if (!s) return s
  return JOURNEY_SLUG_ALIASES[s] ?? s
}

/** Preferred public path segment for links, canonical, sitemap, share. */
export function publicJourneySlug(journeyId: string): string {
  const id = String(journeyId || '')
    .trim()
    .toLowerCase()
  return JOURNEY_PUBLIC_SLUG[id] ?? id
}

/** True when this path segment is not the preferred public slug (should 301). */
export function shouldRedirectJourneySlug(pathSlug: string): boolean {
  const raw = String(pathSlug || '')
    .trim()
    .toLowerCase()
  if (!raw) return false
  const id = resolveJourneyIdFromSlug(raw)
  const preferred = publicJourneySlug(id)
  return raw !== preferred
}
