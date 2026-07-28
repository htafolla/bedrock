/**
 * Lightweight privacy-first telemetry transport.
 * Anonymous visitor id optional; no IP collection client-side.
 */

export type TelemetryEvent =
  | 'open_chamber'
  | 'key_tap'
  | 'nav'
  | 'enter'
  | 'guide_open'
  | 'pageview'

export interface TelemetryPayload {
  event: TelemetryEvent | string
  chamberId?: string
  source?: string
  nav?: string
  /** Path for pageviews */
  path?: string
  /** Anonymous first-party visitor id */
  vid?: string
  referrer?: string
}

/** Fire-and-forget; never throws into UI. */
export function track(payload: TelemetryPayload): void {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/telemetry', blob)
      return
    }
    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
