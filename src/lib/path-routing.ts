/**
 * SPA deep links for chambers.
 * SEO/AI canonical pages live at /c/:id (static HTML).
 * Interactive field guide opens via /?c=:id (SPA).
 */

export const CHAMBER_QUERY = 'c'

export function chamberPath(id: string): string {
  return `/c/${id}`
}

export function chamberAppHref(id: string): string {
  return `/?${CHAMBER_QUERY}=${encodeURIComponent(id)}`
}

/** Parse chamber id from location search or path. */
export function parseChamberFromLocation(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
): string | null {
  try {
    const q = new URLSearchParams(search).get(CHAMBER_QUERY)
    if (q && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(q.trim())) {
      return q.trim().toLowerCase()
    }
  } catch {
    /* ignore */
  }
  const m = pathname.match(/^\/c\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i)
  if (m?.[1]) return m[1].toLowerCase()
  return null
}

/** Keep SPA URL shareable without leaving the app shell. */
export function setChamberQuery(id: string | null): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (id) url.searchParams.set(CHAMBER_QUERY, id)
  else url.searchParams.delete(CHAMBER_QUERY)
  // Stay on / for SPA; canonical /c/:id is the static page
  if (url.pathname.startsWith('/c/')) {
    url.pathname = '/'
  }
  window.history.replaceState({ chamberId: id }, '', url.pathname + url.search + url.hash)
}
