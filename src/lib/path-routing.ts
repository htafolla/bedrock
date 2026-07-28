/**
 * SPA deep links for chambers and core journeys.
 * SEO/AI canonical pages live at /c/:id (static HTML).
 * Interactive field guide opens via /?c=:id (SPA).
 * Journeys: /?j=:journeyId opens the door chamber and keeps journey context.
 */

export const CHAMBER_QUERY = 'c'
export const JOURNEY_QUERY = 'j'

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

function isSlugId(v: string): boolean {
  return ID_RE.test(v.trim())
}

export function chamberPath(id: string): string {
  return `/c/${id}`
}

export function chamberAppHref(id: string): string {
  return `/?${CHAMBER_QUERY}=${encodeURIComponent(id)}`
}

/** Shareable SPA link into a core journey (opens door chamber). */
export function journeyAppHref(journeyId: string, chamberId?: string): string {
  const params = new URLSearchParams()
  params.set(JOURNEY_QUERY, journeyId)
  if (chamberId) params.set(CHAMBER_QUERY, chamberId)
  return `/?${params.toString()}`
}

/** Parse chamber id from location search or path. */
export function parseChamberFromLocation(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
): string | null {
  try {
    const q = new URLSearchParams(search).get(CHAMBER_QUERY)
    if (q && isSlugId(q)) {
      return q.trim().toLowerCase()
    }
  } catch {
    /* ignore */
  }
  const m = pathname.match(/^\/c\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i)
  if (m?.[1]) return m[1].toLowerCase()
  return null
}

/** Parse core journey id from ?j= */
export function parseJourneyFromLocation(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  try {
    const q = new URLSearchParams(search).get(JOURNEY_QUERY)
    if (q && isSlugId(q)) return q.trim().toLowerCase()
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Keep shareable ?c= / ?j= in sync with open chamber + journey.
 * Canonical /c/:id is static HTML for AI/SEO — SPA stays on /.
 */
export function setChamberQuery(
  id: string | null,
  opts?: { journeyId?: string | null },
): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (id) url.searchParams.set(CHAMBER_QUERY, id)
  else url.searchParams.delete(CHAMBER_QUERY)

  if (opts && 'journeyId' in opts) {
    if (opts.journeyId) url.searchParams.set(JOURNEY_QUERY, opts.journeyId)
    else url.searchParams.delete(JOURNEY_QUERY)
  }

  if (url.pathname.startsWith('/c/')) {
    url.pathname = '/'
  }
  window.history.replaceState(
    { chamberId: id, journeyId: opts?.journeyId ?? null },
    '',
    url.pathname + url.search + url.hash,
  )
}

export function setJourneyQuery(journeyId: string | null): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (journeyId) url.searchParams.set(JOURNEY_QUERY, journeyId)
  else url.searchParams.delete(JOURNEY_QUERY)
  if (url.pathname.startsWith('/c/')) url.pathname = '/'
  window.history.replaceState(
    { journeyId },
    '',
    url.pathname + url.search + url.hash,
  )
}
