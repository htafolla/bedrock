/**
 * Build static 1200×630 PNG OG cards for every chamber, journey, and key.
 * Run from build-ai-surface (content change) so social platforms always get
 * a real PNG file — not a dynamic SVG endpoint.
 *
 * Output:
 *   public/og/c/{chamberId}.png
 *   public/og/j/{journeyId}.png
 *   public/og/k/{keyId}.png
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { buildOgSvg } from '../server/og-card.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicOg = join(root, 'public', 'og')

const MOTTO = 'Do Better. Be Better. Trust God.'

/** Prefer full sentences on the card; soft-cap so wrapLines does not feel chopped. */
function ogSubtitle(text, max = 140) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  const base = sp > 40 ? cut.slice(0, sp) : cut
  return `${base.replace(/[.,;:–—-]+$/, '')}…`
}

/**
 * Optional chamber art path under public/ (e.g. /art/kill-the-flesh-pow.png).
 * Composited as a soft hero watermark on the right — keeps title readable.
 * @param {string | undefined} src
 * @returns {Promise<Buffer | null>}
 */
async function loadIllustrationOverlay(src) {
  if (!src) return null
  const rel = String(src).replace(/^\//, '')
  const illPath = join(root, 'public', rel)
  if (!existsSync(illPath)) return null
  const { data, info } = await sharp(illPath)
    .resize(540, 540, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  // Soft watermark (~38% alpha) so STATION title stays primary
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * 0.38)
  }
  return sharp(data, { raw: info }).png().toBuffer()
}

/**
 * @param {{ layer: string, title: string, subtitle?: string, illustrationSrc?: string }} opts
 * @param {string} outPath absolute path to .png
 */
export async function writeOgPng(opts, outPath) {
  const svg = buildOgSvg({
    layer: opts.layer,
    title: opts.title,
    subtitle: ogSubtitle(opts.subtitle || MOTTO),
    motto: MOTTO,
  })
  let pipeline = sharp(Buffer.from(svg)).resize(1200, 630, { fit: 'fill' })
  const overlay = await loadIllustrationOverlay(opts.illustrationSrc)
  if (overlay) {
    const meta = await sharp(overlay).metadata()
    const ow = meta.width || 540
    const oh = meta.height || 540
    const left = Math.max(0, 1200 - ow - 36)
    const top = Math.max(0, Math.round((630 - oh) / 2))
    pipeline = pipeline.composite([{ input: overlay, left, top, blend: 'over' }])
  }
  const png = await pipeline.png({ compressionLevel: 8 }).toBuffer()
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, png)
  return png.length
}

function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Word-wrap a poem line for tall share image. */
function wrapPoemLine(text, maxChars = 44) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  if (!words.length) return ['']
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/**
 * Tall sealed-poem PNG (full Backstory) — not the 1200×630 OG tile.
 * Used by “Share poem image” so social share is the poem, not About origin.
 *
 * @param {{ title?: string, lines: string[] }} opts
 * @param {string} outPath
 */
export async function writePoemPng(opts, outPath) {
  const W = 1080
  const padX = 72
  const padTop = 68
  const lineSize = 34
  const lineStep = 46
  const title = String(opts.title || 'Backstory')
  const rawLines = Array.isArray(opts.lines) ? opts.lines : []
  /** @type {string[]} */
  const body = []
  for (const raw of rawLines) {
    const wrapped = wrapPoemLine(raw, 44)
    for (const w of wrapped) body.push(w)
    // Extra breath after each original line (couplet rhythm)
    body.push('')
  }
  // Drop trailing blank
  while (body.length && body[body.length - 1] === '') body.pop()

  const bodyStart = padTop + 118
  const bodyH = Math.max(body.length, 1) * lineStep
  const H = bodyStart + bodyH + 140

  const textNodes = body
    .map((line, i) => {
      const y = bodyStart + i * lineStep
      if (!line) return ''
      return `<text x="${padX}" y="${y}" fill="#f0e6d8" font-family="Georgia, 'Times New Roman', serif" font-size="${lineSize}" font-weight="500">${escXml(line)}</text>`
    })
    .filter(Boolean)
    .join('\n')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#241c16"/>
      <stop offset="48%" stop-color="#0c0a09"/>
      <stop offset="100%" stop-color="#120e0b"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="10" height="${H}" fill="#e8a050"/>
  <text x="${padX}" y="${padTop + 8}" fill="#c4a574" font-family="system-ui, sans-serif" font-size="20" font-weight="600" letter-spacing="4">SEALED WORD · BEDROCK</text>
  <text x="${padX}" y="${padTop + 64}" fill="#f5e6c8" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="600">${escXml(title)}</text>
  ${textNodes}
  <text x="${padX}" y="${H - 78}" fill="#f5e6c8" font-family="Georgia, serif" font-size="26" font-style="italic">${escXml(MOTTO)}</text>
  <text x="${padX}" y="${H - 40}" fill="#6a5c4e" font-family="system-ui, sans-serif" font-size="18" letter-spacing="1">bedrock.rippel.ai/about</text>
</svg>`

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer()
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, png)
  return png.length
}

/**
 * @param {{
 *   chambers: Array<{ id: string, title: string, summary: string, kind?: string, illustration?: { src?: string } }>,
 *   journeys?: Array<{ id: string, title: string, summary: string }>,
 *   keys?: Array<{ id: string, label: string, hint: string }>,
 *   origin?: { subtitle?: string },
 *   poem?: { title?: string, lines?: string[] },
 * }} input
 */
export async function buildAllOgCards(input) {
  const cDir = join(publicOg, 'c')
  const jDir = join(publicOg, 'j')
  const kDir = join(publicOg, 'k')

  // Wipe prior cards so removed chambers/journeys don't leave stale files
  if (existsSync(publicOg)) {
    rmSync(publicOg, { recursive: true, force: true })
  }
  mkdirSync(cDir, { recursive: true })
  mkdirSync(jDir, { recursive: true })
  mkdirSync(kDir, { recursive: true })

  let bytes = 0
  let count = 0

  // Origin · heart of Bedrock (About / sealed word) — landscape OG
  {
    const n = await writeOgPng(
      {
        layer: 'origin',
        title: 'Bedrock',
        subtitle:
          input.origin?.subtitle ||
          'Through the fire He was always with me. A crucible in the rubble.',
      },
      join(publicOg, 'origin.png'),
    )
    bytes += n
    count += 1
  }

  // Full sealed poem — tall PNG for “Share poem image” (not About OG)
  if (input.poem?.lines?.length) {
    const n = await writePoemPng(
      {
        title: input.poem.title || 'Backstory',
        lines: input.poem.lines,
      },
      join(publicOg, 'testimony-poem.png'),
    )
    bytes += n
    count += 1
  }

  for (const c of input.chambers || []) {
    const layer = c.kind === 'rubric' ? 'standard' : 'station'
    const n = await writeOgPng(
      {
        layer,
        title: c.title,
        subtitle: c.summary,
        illustrationSrc: c.illustration?.src,
      },
      join(cDir, `${c.id}.png`),
    )
    bytes += n
    count += 1
  }

  for (const j of input.journeys || []) {
    const n = await writeOgPng(
      { layer: 'path', title: j.title, subtitle: j.summary },
      join(jDir, `${j.id}.png`),
    )
    bytes += n
    count += 1
  }

  for (const k of input.keys || []) {
    const n = await writeOgPng(
      { layer: 'door', title: k.label, subtitle: k.hint },
      join(kDir, `${k.id}.png`),
    )
    bytes += n
    count += 1
  }

  writeFileSync(
    join(publicOg, 'README.md'),
    `# Bedrock OG cards\n\n` +
      `Generated on content build for social share.\n\n` +
      `- Stations / standards: \`/og/c/{id}.png\` (1200×630)\n` +
      `- Paths (journeys): \`/og/j/{id}.png\`\n` +
      `- Keys: \`/og/k/{id}.png\`\n` +
      `- Origin (About): \`/og/origin.png\`\n` +
      `- Sealed poem (tall): \`/og/testimony-poem.png\`\n\n` +
      `Cards: ${count} · ~${Math.round(bytes / 1024)} KB total\n`,
  )

  return { count, bytes, chambers: (input.chambers || []).length, journeys: (input.journeys || []).length, keys: (input.keys || []).length }
}

// CLI — rebuild cards from content SSOT without full HTML surface
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { readFileSync } = await import('node:fs')
  const contentPath = join(root, 'src/content/bedrock.json')
  const journeysPath = join(root, 'src/content/journeys.json')
  const keyEntriesPath = join(root, 'src/lib/key-entries.ts')
  if (!existsSync(contentPath)) {
    console.error('Missing bedrock.json — run npm run content first')
    process.exit(1)
  }
  const doc = JSON.parse(readFileSync(contentPath, 'utf8'))
  let journeys = []
  if (existsSync(journeysPath)) {
    const jd = JSON.parse(readFileSync(journeysPath, 'utf8'))
    journeys = Array.isArray(jd.journeys) ? jd.journeys : []
  }
  /** @type {{ id: string, label: string, hint: string }[]} */
  const keys = []
  if (existsSync(keyEntriesPath)) {
    const ts = readFileSync(keyEntriesPath, 'utf8')
    const block = ts.match(/export const KEY_ENTRIES[^=]*=\s*\[([\s\S]*?)\]\s*$/m)
    if (block) {
      const re =
        /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*hint:\s*((?:'[^']*')|(?:"[^"]*")),\s*chamberId:\s*'([^']+)',(?:\s*journeyId:\s*'([^']+)',)?/g
      let m
      while ((m = re.exec(block[1]))) {
        keys.push({ id: m[1], label: m[2], hint: m[3].replace(/^['"]|['"]$/g, '') })
      }
    }
  }
  const r = await buildAllOgCards({
    chambers: doc.chambers,
    journeys,
    keys,
    poem: doc.testimony?.poem
      ? {
          title: doc.testimony.poem.title || 'Backstory',
          lines: doc.testimony.poem.lines || [],
        }
      : undefined,
  })
  console.log(
    `OG cards: ${r.count} PNGs (${r.chambers} chambers · ${r.journeys} journeys · ${r.keys} keys) → public/og/`,
  )
}
