/**
 * Social share for Door · Station · Path · Standard.
 *
 * Platform reality:
 * - X / Facebook: share a URL; previews use Open Graph (og:image).
 * - Instagram / TikTok: no reliable web “post this link with card” API.
 *   Mobile: Web Share sheet can open those apps; desktop: copy link.
 * - Always prefer a canonical URL + content-specific OG image.
 */

import { SITE_ORIGIN, chamberCanonicalUrl } from './seo'

export type ShareLayer = 'door' | 'station' | 'path' | 'standard'

export type ShareNetwork = 'system' | 'x' | 'facebook' | 'copy' | 'instagram' | 'tiktok'

export interface SharePayload {
  layer: ShareLayer
  /** Human label for UI */
  layerLabel: string
  title: string
  text: string
  url: string
  /** Absolute OG image URL for crawlers / previews */
  ogImage: string
  /** Short line for tweet / clipboard */
  shareLine: string
}

const STANDARD_CHAMBER_ID = 'kill-the-flesh-walk-in-the-spirit'

export function layerLabel(layer: ShareLayer): string {
  switch (layer) {
    case 'door':
      return 'Door'
    case 'station':
      return 'Station'
    case 'path':
      return 'Path'
    case 'standard':
      return 'Standard'
  }
}

/** Content-specific OG card (server SVG). */
export function ogImageUrl(params: {
  layer: ShareLayer
  id?: string
  title?: string
  subtitle?: string
}): string {
  const q = new URLSearchParams()
  q.set('layer', params.layer)
  if (params.id) q.set('id', params.id)
  if (params.title) q.set('title', params.title.slice(0, 120))
  if (params.subtitle) q.set('subtitle', params.subtitle.slice(0, 160))
  return `${SITE_ORIGIN}/api/og?${q.toString()}`
}

export function buildStationShare(input: {
  chamberId: string
  title: string
  summary: string
  kind?: string
}): SharePayload {
  const isStandard = input.kind === 'rubric' || input.chamberId === STANDARD_CHAMBER_ID
  const layer: ShareLayer = isStandard ? 'standard' : 'station'
  const url = chamberCanonicalUrl(input.chamberId)
  const title = isStandard
    ? `${input.title} — Bedrock Standard`
    : `${input.title} — Bedrock`
  const text = input.summary
  return {
    layer,
    layerLabel: layerLabel(layer),
    title,
    text,
    url,
    ogImage: ogImageUrl({
      layer,
      id: input.chamberId,
      title: input.title,
      subtitle: input.summary,
    }),
    shareLine: `${title}\n${text}\n${url}`,
  }
}

export function buildPathShare(input: {
  journeyId: string
  title: string
  summary: string
}): SharePayload {
  const url = `${SITE_ORIGIN}/?j=${encodeURIComponent(input.journeyId)}`
  const title = `${input.title} — Bedrock Path`
  return {
    layer: 'path',
    layerLabel: 'Path',
    title,
    text: input.summary,
    url,
    ogImage: ogImageUrl({
      layer: 'path',
      id: input.journeyId,
      title: input.title,
      subtitle: input.summary,
    }),
    shareLine: `${title}\n${input.summary}\n${url}`,
  }
}

export function buildDoorShare(input: {
  keyId: string
  label: string
  hint: string
  chamberId: string
  journeyId?: string
}): SharePayload {
  // Door deep-links to the station (and journey when present) — shareable SPA URL
  const u = new URL(SITE_ORIGIN)
  u.searchParams.set('c', input.chamberId)
  if (input.journeyId) u.searchParams.set('j', input.journeyId)
  u.searchParams.set('door', input.keyId)
  const url = u.toString()
  const title = `${input.label} — Bedrock Door`
  const text = input.hint
  return {
    layer: 'door',
    layerLabel: 'Door',
    title,
    text,
    url,
    ogImage: ogImageUrl({
      layer: 'door',
      id: input.keyId,
      title: input.label,
      subtitle: input.hint,
    }),
    shareLine: `${title}\n${text}\n${url}`,
  }
}

export function xIntentUrl(payload: SharePayload): string {
  const params = new URLSearchParams({
    text: `${payload.title}\n${payload.text}`.slice(0, 240),
    url: payload.url,
  })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function facebookShareUrl(payload: SharePayload): string {
  const params = new URLSearchParams({ u: payload.url })
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`
}

/** Whether navigator.share can include a file (image) on this device. */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({
        files: [new File(['x'], 't.png', { type: 'image/png' })],
      })
    )
  } catch {
    return false
  }
}

export function canSystemShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * System share sheet (mobile) — best path for Instagram / TikTok / more apps.
 * Falls back to copy when unavailable.
 */
export async function systemShare(payload: SharePayload): Promise<'shared' | 'copied' | 'cancelled'> {
  if (canSystemShare()) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      })
      return 'shared'
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled'
      // fall through to copy
    }
  }
  const ok = await copyText(payload.shareLine)
  return ok ? 'copied' : 'cancelled'
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // legacy
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function openShareNetwork(network: ShareNetwork, payload: SharePayload): void {
  if (network === 'x') {
    window.open(xIntentUrl(payload), '_blank', 'noopener,noreferrer')
    return
  }
  if (network === 'facebook') {
    window.open(facebookShareUrl(payload), '_blank', 'noopener,noreferrer')
    return
  }
  // Instagram / TikTok: no web post intent — copy + instruct
  void copyText(payload.shareLine)
}
