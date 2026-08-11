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

/**
 * @param {{ layer: string, title: string, subtitle?: string }} opts
 * @param {string} outPath absolute path to .png
 */
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

export async function writeOgPng(opts, outPath) {
  const svg = buildOgSvg({
    layer: opts.layer,
    title: opts.title,
    subtitle: ogSubtitle(opts.subtitle || MOTTO),
    motto: MOTTO,
  })
  const png = await sharp(Buffer.from(svg))
    .resize(1200, 630, { fit: 'fill' })
    .png({ compressionLevel: 8 })
    .toBuffer()
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, png)
  return png.length
}

/**
 * @param {{
 *   chambers: Array<{ id: string, title: string, summary: string, kind?: string }>,
 *   journeys?: Array<{ id: string, title: string, summary: string }>,
 *   keys?: Array<{ id: string, label: string, hint: string }>,
 *   origin?: { subtitle?: string },
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

  // Origin · heart of Bedrock (About / sealed word)
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

  for (const c of input.chambers || []) {
    const layer = c.kind === 'rubric' ? 'standard' : 'station'
    const n = await writeOgPng(
      { layer, title: c.title, subtitle: c.summary },
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
    `# Bedrock OG cards (PNG 1200×630)\n\n` +
      `Generated on content build for social share (X, Facebook, LinkedIn, etc.).\n\n` +
      `- Stations / standards: \`/og/c/{id}.png\`\n` +
      `- Paths (journeys): \`/og/j/{id}.png\`\n` +
      `- Keys: \`/og/k/{id}.png\`\n\n` +
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
  const r = await buildAllOgCards({ chambers: doc.chambers, journeys, keys })
  console.log(
    `OG cards: ${r.count} PNGs (${r.chambers} chambers · ${r.journeys} journeys · ${r.keys} keys) → public/og/`,
  )
}
