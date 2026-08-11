/**
 * HTML → PNG capture for social share cards.
 * Pattern from bubble-blast-retro (html-to-image / toPng).
 * Poem: prefer static /og/testimony-poem.png (never About origin card).
 */

import { toPng } from 'html-to-image'
import type { SharePayload } from './share'

/** Capture a DOM node to a PNG data URL (bubble-blast-retro options). */
export async function captureElementToPng(
  element: HTMLElement,
  options?: { pixelRatio?: number; quality?: number },
): Promise<string> {
  return toPng(element, {
    quality: options?.quality ?? 0.95,
    pixelRatio: options?.pixelRatio ?? 2,
    cacheBust: true,
    // Solid backdrop — blur alone can wash out on some capture paths
    backgroundColor: '#0c0a09',
  })
}

/** Fetch a static PNG (or any image URL) as a data URL. */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return null
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Resolve share image for a payload.
 * Testimony/poem → static tall poem PNG only (never About /og/origin.png).
 * Other layers → DOM capture of ShareCard.
 */
export async function resolveShareImageDataUrl(
  payload: SharePayload,
  captureEl: HTMLElement | null,
): Promise<string | null> {
  const isPoem =
    payload.layer === 'testimony' || Boolean(payload.lines && payload.lines.length > 0)
  if (isPoem) {
    // Prefer built tall poem; fallback to absolute ogImage if different
    const urls = [
      '/og/testimony-poem.png',
      payload.ogImage?.includes('testimony-poem') ? payload.ogImage : null,
    ].filter(Boolean) as string[]
    for (const u of urls) {
      const data = await fetchImageAsDataUrl(u)
      if (data) return data
    }
  }
  if (!captureEl) return null
  try {
    return await captureElementToPng(captureEl, { quality: 0.95, pixelRatio: 2 })
  } catch (e) {
    console.error('share capture failed', e)
    return null
  }
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: 'image/png' })
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function shareFilename(payload: SharePayload): string {
  if (payload.layer === 'testimony' || (payload.lines && payload.lines.length > 0)) {
    return 'bedrock-sealed-word-backstory.png'
  }
  const slug = payload.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `bedrock-${payload.layer}-${slug || 'share'}.png`
}
