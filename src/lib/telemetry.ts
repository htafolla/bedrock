/**
 * Lightweight privacy-first telemetry — chamber / key taps only.
 * No cookies, no IP collection client-side, no user ids.
 */

export type TelemetryEvent = 'open_chamber' | 'key_tap' | 'nav' | 'enter' | 'guide_open'

export interface TelemetryPayload {
  event: TelemetryEvent
  chamberId?: string
  source?: string
  nav?: string
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
