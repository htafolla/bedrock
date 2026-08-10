/**
 * Dynamic Open Graph / social share cards as SVG (1200×630).
 * Used by GET /api/og?layer=&id=&title=&subtitle=
 */

const W = 1200
const H = 630

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapLines(text, maxChars, maxLines) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
      if (lines.length >= maxLines) break
    } else {
      cur = next
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = last.length > 3 ? `${last.slice(0, maxChars - 1)}…` : last
  }
  return lines.slice(0, maxLines)
}

const LAYER_KICKER = {
  door: 'DOOR · KEYS',
  station: 'STATION · CHAMBER',
  path: 'PATH · JOURNEY',
  standard: 'STANDARD · RUBRIC',
}

/**
 * @param {{ layer: string, title: string, subtitle?: string, motto?: string }} opts
 */
export function buildOgSvg(opts) {
  const layer = ['door', 'station', 'path', 'standard'].includes(opts.layer)
    ? opts.layer
    : 'station'
  const kicker = LAYER_KICKER[layer]
  const titleLines = wrapLines(opts.title || 'Bedrock', 28, 3)
  const subLines = wrapLines(opts.subtitle || '', 48, 3)
  const motto = opts.motto || 'Do Better. Be Better. Trust God.'

  const titleY = 220
  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${titleY + i * 64}" fill="#f5e6c8" font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="600">${esc(line)}</text>`,
    )
    .join('\n')

  const subY = titleY + titleLines.length * 64 + 28
  const subSvg = subLines
    .map(
      (line, i) =>
        `<text x="80" y="${subY + i * 36}" fill="#a89884" font-family="system-ui, -apple-system, sans-serif" font-size="28">${esc(line)}</text>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1410"/>
      <stop offset="55%" stop-color="#0c0a09"/>
      <stop offset="100%" stop-color="#120e0b"/>
    </linearGradient>
    <linearGradient id="ember" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e8a050"/>
      <stop offset="100%" stop-color="#c4a574"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="${H}" fill="url(#ember)"/>
  <circle cx="1080" cy="120" r="180" fill="#e8a050" fill-opacity="0.06"/>
  <circle cx="980" cy="520" r="220" fill="#c4a574" fill-opacity="0.05"/>
  <text x="80" y="100" fill="#c4a574" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" letter-spacing="4">${esc(kicker)}</text>
  ${titleSvg}
  ${subSvg}
  <text x="80" y="560" fill="#f5e6c8" font-family="Georgia, serif" font-size="26" font-style="italic">${esc(motto)}</text>
  <text x="80" y="598" fill="#6a5c4e" font-family="system-ui, sans-serif" font-size="20">bedrock.rippel.ai</text>
</svg>`
}
