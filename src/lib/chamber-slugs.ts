/**
 * Public URL slugs vs stable internal chamber ids.
 *
 * Display titles can change without rewriting related graphs, spine, OG art
 * basenames, or journey stage ids. Prefer a human slug when it differs.
 *
 * Example: title "Master the Flesh" → public /c/master-the-flesh
 *           internal id remains kill-the-flesh (related, OG, spine).
 */

/** Internal id → preferred public path segment (when different). */
export const CHAMBER_PUBLIC_SLUG: Readonly<Record<string, string>> = {
  'kill-the-flesh': 'master-the-flesh',
}

/** Public (or legacy) path segment → internal chamber id. */
export const CHAMBER_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'master-the-flesh': 'kill-the-flesh',
  // legacy path still resolves; prefer redirects to public slug on the server
  'kill-the-flesh': 'kill-the-flesh',
}

/** Resolve any path / ?c= segment to the stable content id. */
export function resolveChamberIdFromSlug(slug: string): string {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
  if (!s) return s
  return CHAMBER_SLUG_ALIASES[s] ?? s
}

/** Preferred public path segment for links, canonical, sitemap, share. */
export function publicChamberSlug(chamberId: string): string {
  const id = String(chamberId || '')
    .trim()
    .toLowerCase()
  return CHAMBER_PUBLIC_SLUG[id] ?? id
}

/** True when this path segment is not the preferred public slug (should 301). */
export function shouldRedirectChamberSlug(pathSlug: string): boolean {
  const raw = String(pathSlug || '')
    .trim()
    .toLowerCase()
  if (!raw) return false
  const id = resolveChamberIdFromSlug(raw)
  const preferred = publicChamberSlug(id)
  return raw !== preferred
}
