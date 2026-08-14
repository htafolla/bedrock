/**
 * Social share for Key · Station · Path · Standard · Stance · Lock.
 *
 * Platform reality:
 * - X / Facebook: share a URL; previews use Open Graph (og:image).
 * - Instagram / TikTok: no reliable web “post this link with card” API.
 *   Mobile: Web Share sheet can open those apps; desktop: copy link.
 * - Always prefer a canonical URL + content-specific OG image.
 */

import {
  SITE_ORIGIN,
  chamberCanonicalUrl,
  doorCanonicalUrl,
  doorOgImageUrl,
  journeyCanonicalUrl,
  journeyOgImageUrl,
  staticOgImageUrl,
} from './seo'

export type ShareLayer =
  | 'door'
  | 'station'
  | 'path'
  | 'standard'
  | 'stance'
  | 'lock'
  | 'origin'
  | 'testimony'

export type ShareNetwork = 'system' | 'x' | 'facebook' | 'copy' | 'instagram' | 'tiktok' | 'image'

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
  /**
   * Full poem / sealed word lines — when set, ShareMenu captures a tall
   * poem image (not the landscape OG card).
   */
  lines?: string[]
}

const STANDARD_CHAMBER_ID = 'kill-the-flesh-walk-in-the-spirit'
const STANCE_CHAMBER_ID = 'the-line'
const LOCK_CHAMBER_ID = 'pain-interrupt'

export function layerLabel(layer: ShareLayer): string {
  switch (layer) {
    case 'door':
      return 'Key'
    case 'station':
      return 'Station'
    case 'path':
      return 'Path'
    case 'standard':
      return 'Standard'
    case 'stance':
      return 'Stance'
    case 'lock':
      return 'Lock'
    case 'origin':
      return 'Origin'
    case 'testimony':
      return 'Sealed word'
  }
}

/**
 * Content-specific OG card — static PNG built on content change:
 *   /og/c/{id}.png  station|standard
 *   /og/j/{id}.png  path
 *   /og/k/{id}.png  key
 * Falls back to /api/og only when no id (should be rare).
 */
export function ogImageUrl(params: {
  layer: ShareLayer
  id?: string
  title?: string
  subtitle?: string
}): string {
  if (params.layer === 'origin') {
    return `${SITE_ORIGIN}/og/origin.png`
  }
  if (params.layer === 'testimony') {
    return `${SITE_ORIGIN}/og/testimony-poem.png`
  }
  if (params.id) {
    const kind = params.layer === 'path' ? 'j' : params.layer === 'door' ? 'k' : 'c'
    // Versioned path (no query string) — bust FB/X caches when art/title changes
    return staticOgImageUrl(kind, params.id)
  }
  const q = new URLSearchParams()
  q.set('layer', params.layer)
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
  const isStance = input.kind === 'stance' || input.chamberId === STANCE_CHAMBER_ID
  const isLock = input.kind === 'lock' || input.chamberId === LOCK_CHAMBER_ID
  const layer: ShareLayer = isStandard
    ? 'standard'
    : isStance
      ? 'stance'
      : isLock
        ? 'lock'
        : 'station'
  const url = chamberCanonicalUrl(input.chamberId)
  const title = isStandard
    ? `${input.title} — Bedrock Standard`
    : isStance
      ? `${input.title} — Bedrock Stance`
      : isLock
        ? `${input.title} — Bedrock Lock`
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
  // Canonical /j/:id has static OG tags for crawlers (SPA ?j= only has homepage meta).
  const url = journeyCanonicalUrl(input.journeyId)
  const title = `${input.title} — Bedrock Path`
  return {
    layer: 'path',
    layerLabel: 'Path',
    title,
    text: input.summary,
    url,
    ogImage: journeyOgImageUrl({
      journeyId: input.journeyId,
      title: input.title,
      summary: input.summary,
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
  // Canonical /k/:id has static OG tags; page CTA opens SPA with door + chamber (+ journey).
  const url = doorCanonicalUrl(input.keyId)
  const title = `${input.label} — Bedrock Key`
  const text = input.hint
  return {
    layer: 'door',
    layerLabel: layerLabel('door'),
    title,
    text,
    url,
    ogImage: doorOgImageUrl({
      keyId: input.keyId,
      label: input.label,
      hint: input.hint,
    }),
    shareLine: `${title}\n${text}\n${url}`,
  }
}

/**
 * Origin · heart of Bedrock — About / sealed testimony.
 * Canonical /about has static OG + PNG card.
 */
export function buildOriginShare(input: {
  title?: string
  tagline?: string
  motto?: string
  /** One or two short heart lines (testimony / prologue) */
  heart?: string
}): SharePayload {
  const title = input.title?.trim() || 'Bedrock'
  const tagline =
    input.tagline?.trim() || "A Hitchhiker's Guide to Love · Living · Enduring"
  const motto = input.motto?.trim() || 'Do Better. Be Better. Trust God.'
  const heart =
    input.heart?.trim() ||
    'This is a testament to Him that through the fire He was always with me.'
  const url = `${SITE_ORIGIN}/about`
  const text = `${tagline}\n${motto}\n${heart}`
  return {
    layer: 'origin',
    layerLabel: layerLabel('origin'),
    title: `${title} — Origin`,
    text,
    url,
    ogImage: ogImageUrl({ layer: 'origin', title, subtitle: heart }),
    shareLine: `${title}\n${tagline}\n${motto}\n${heart}\n${url}`,
  }
}

/** Static tall poem PNG (built on content change) — not the About landscape OG. */
export const TESTIMONY_POEM_IMAGE = `${SITE_ORIGIN}/og/testimony-poem.png`

/**
 * Full sealed poem as a tall shareable image.
 * Always uses /og/testimony-poem.png — never the About origin card.
 */
export function buildTestimonyPoemShare(input: {
  title?: string
  lines: string[]
}): SharePayload {
  const lines = input.lines.map((l) => String(l).trim()).filter(Boolean)
  const title = input.title?.trim() || 'Backstory'
  const url = `${SITE_ORIGIN}/about`
  const preview = lines.slice(0, 2).join(' ')
  return {
    layer: 'testimony',
    layerLabel: layerLabel('testimony'),
    title,
    text: preview,
    lines,
    url,
    // Tall full poem — do not use /og/origin.png (About landscape)
    ogImage: TESTIMONY_POEM_IMAGE,
    shareLine: `${title}\n\n${lines.join('\n')}\n\n${url}`,
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
  // Instagram / TikTok / image: handled in ShareMenu (capture or copy)
  if (network === 'instagram' || network === 'tiktok' || network === 'image') {
    void copyText(payload.shareLine)
  }
}
