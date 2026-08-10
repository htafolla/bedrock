/**
 * HTML → PNG capture for social share cards.
 * Pattern from bubble-blast-retro (html-to-image / toPng).
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
  const slug = payload.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `bedrock-${payload.layer}-${slug || 'share'}.png`
}
