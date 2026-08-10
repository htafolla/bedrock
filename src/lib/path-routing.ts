/**
 * SPA deep links for chambers and core journeys.
 * SEO/AI canonical pages live at /c/:id (static HTML).
 * Journey/path pages (share + OG) live at /j/:id (static HTML).
 * Interactive field guide opens via /?c=:id (SPA).
 * Journeys: /?j=:journeyId opens the door chamber and keeps journey context.
 *
 * History: pushState on real navigation so the browser Back button works.
 * replaceState only for first paint / no-op same URL.
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

/** Canonical crawlable journey page (static OG for social share). */
export function journeyPath(id: string): string {
  return `/j/${id}`
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

export type HistoryWriteMethod = 'push' | 'replace'

export interface AppLocationState {
  chamberId: string | null
  journeyId: string | null
  /** Experience mode for popstate restore */
  mode?: 'arrival' | 'constellation' | 'chamber'
}

/** Build path+search for the SPA shell (always under /). */
export function buildAppHref(opts: {
  chamberId?: string | null
  journeyId?: string | null
}): string {
  const params = new URLSearchParams()
  if (opts.journeyId) params.set(JOURNEY_QUERY, opts.journeyId)
  if (opts.chamberId) params.set(CHAMBER_QUERY, opts.chamberId)
  const q = params.toString()
  return q ? `/?${q}` : '/'
}

/**
 * Write SPA location. Use push for user navigation (Back works).
 * Use replace for initial seed or identical URL updates.
 * Omitted chamberId/journeyId fields keep the current URL values.
 */
export function writeAppLocation(
  opts: {
    chamberId?: string | null
    journeyId?: string | null
    mode?: AppLocationState['mode']
    method?: HistoryWriteMethod
  } = {},
): void {
  if (typeof window === 'undefined') return

  const chamberId =
    'chamberId' in opts ? (opts.chamberId ?? null) : parseChamberFromLocation()
  const journeyId =
    'journeyId' in opts ? (opts.journeyId ?? null) : parseJourneyFromLocation()
  const href = buildAppHref({ chamberId, journeyId })
  const state: AppLocationState = {
    chamberId,
    journeyId,
    mode: opts.mode,
  }

  const nextUrl = new URL(href, window.location.origin)
  const currentKey = window.location.pathname + window.location.search
  const nextKey = nextUrl.pathname + nextUrl.search
  const prev = (window.history.state || {}) as AppLocationState
  const modeChanged = Boolean(opts.mode && opts.mode !== prev.mode)
  const urlChanged = currentKey !== nextKey
  const method =
    opts.method ?? (urlChanged || modeChanged ? 'push' : 'replace')

  // Push when URL or experience mode changes so Back can reverse the step
  // (e.g. arrival → Keys both use `/` but different mode in history.state).
  if (method === 'push' && (urlChanged || modeChanged)) {
    window.history.pushState(state, '', nextKey)
  } else {
    window.history.replaceState(state, '', nextKey)
  }
}

/** Keep shareable ?c= / ?j= in sync with open chamber + journey. */
export function setChamberQuery(
  id: string | null,
  opts?: { journeyId?: string | null; method?: HistoryWriteMethod; mode?: AppLocationState['mode'] },
): void {
  const payload: Parameters<typeof writeAppLocation>[0] = {
    chamberId: id,
    method: opts?.method,
    mode: opts?.mode,
  }
  if (opts && 'journeyId' in opts) {
    payload.journeyId = opts.journeyId ?? null
  }
  writeAppLocation(payload)
}

export function setJourneyQuery(journeyId: string | null, method: HistoryWriteMethod = 'replace'): void {
  if (typeof window === 'undefined') return
  const chamberId = parseChamberFromLocation()
  writeAppLocation({ chamberId, journeyId, method })
}

/** Read location from URL (source of truth on popstate). */
export function readAppLocationFromUrl(): AppLocationState {
  return {
    chamberId: parseChamberFromLocation(),
    journeyId: parseJourneyFromLocation(),
  }
}
