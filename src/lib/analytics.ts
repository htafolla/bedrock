/**
 * Privacy-first traffic analytics for Bedrock.
 *
 * Layer 1 — First-party: anonymous visitor id (localStorage) + /api/telemetry
 *            uniques, pageviews, doors — no IP, no PII
 * Layer 2 — Plausible (optional): VITE_PLAUSIBLE_DOMAIN
 * Layer 3 — Umami (optional): VITE_UMAMI_WEBSITE_ID + VITE_UMAMI_SRC
 */

import { track as trackTelemetry, type TelemetryEvent } from './telemetry'

const VID_KEY = 'bedrock.vid'
const PLAUSIBLE_DOMAIN = (import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined)?.trim()
const PLAUSIBLE_SRC =
  (import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined)?.trim() ||
  'https://plausible.io/js/script.js'
const UMAMI_WEBSITE_ID = (import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined)?.trim()
/** Default: Umami Cloud. Override with VITE_UMAMI_SRC for self-host. */
const UMAMI_SRC =
  (import.meta.env.VITE_UMAMI_SRC as string | undefined)?.trim() ||
  (UMAMI_WEBSITE_ID ? 'https://cloud.umami.is/script.js' : '')

export type AnalyticsEvent =
  | TelemetryEvent
  | 'pageview'
  | 'guide_open'

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

/** Anonymous first-party visitor id — not a login, not shared with third parties by us. */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(VID_KEY)
    if (!id || id.length < 8 || id.length > 80) {
      id = randomId()
      localStorage.setItem(VID_KEY, id)
    }
    return id
  } catch {
    return randomId()
  }
}

function loadScript(src: string, attrs: Record<string, string>): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${src}"]`)) return
  const s = document.createElement('script')
  s.src = src
  s.async = true
  s.defer = true
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v)
  document.head.appendChild(s)
}

/** Call once at app boot. */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return

  if (PLAUSIBLE_DOMAIN) {
    loadScript(PLAUSIBLE_SRC, {
      'data-domain': PLAUSIBLE_DOMAIN,
      defer: 'true',
    })
  }

  if (UMAMI_WEBSITE_ID && UMAMI_SRC) {
    loadScript(UMAMI_SRC, {
      'data-website-id': UMAMI_WEBSITE_ID,
      defer: 'true',
    })
  }

  // First pageview for SPA
  trackPageview()
}

export function trackPageview(path?: string): void {
  if (typeof window === 'undefined') return
  const pagePath = path || window.location.pathname + window.location.search

  // First-party
  trackTelemetry({
    event: 'pageview',
    path: pagePath,
    referrer: document.referrer ? truncate(document.referrer, 200) : undefined,
    vid: getVisitorId(),
  })

  // Plausible SPA pageview
  try {
    const w = window as unknown as { plausible?: (n: string, o?: { u?: string }) => void }
    w.plausible?.('pageview', { u: window.location.origin + pagePath })
  } catch {
    /* ignore */
  }

  // Umami SPA
  try {
    const w = window as unknown as { umami?: { track: (n?: string) => void } }
    w.umami?.track()
  } catch {
    /* ignore */
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  props?: {
    chamberId?: string
    source?: string
    nav?: string
    journeyId?: string
  },
): void {
  if (typeof window === 'undefined') return

  trackTelemetry({
    event: event as TelemetryEvent,
    chamberId: props?.chamberId,
    source: props?.source,
    nav: props?.nav,
    path: window.location.pathname + window.location.search,
    vid: getVisitorId(),
  })

  try {
    const w = window as unknown as {
      plausible?: (n: string, o?: { props?: Record<string, string> }) => void
    }
    const propsOut: Record<string, string> = {}
    if (props?.chamberId) propsOut.chamber = props.chamberId
    if (props?.source) propsOut.source = props.source
    if (props?.nav) propsOut.nav = props.nav
    if (props?.journeyId) propsOut.journey = props.journeyId
    w.plausible?.(event, Object.keys(propsOut).length ? { props: propsOut } : undefined)
  } catch {
    /* ignore */
  }

  try {
    const w = window as unknown as {
      umami?: { track: (n: string, d?: Record<string, string>) => void }
    }
    w.umami?.track(event, {
      ...(props?.chamberId ? { chamber: props.chamberId } : {}),
      ...(props?.source ? { source: props.source } : {}),
    })
  } catch {
    /* ignore */
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n)
}

export function analyticsProviders(): {
  firstParty: true
  plausible: boolean
  umami: boolean
} {
  return {
    firstParty: true,
    plausible: Boolean(PLAUSIBLE_DOMAIN),
    umami: Boolean(UMAMI_WEBSITE_ID && UMAMI_SRC),
  }
}
