/**
 * Core journeys loader for the Node server (same SSOT as src/content/journeys.json).
 * Keep match/format logic aligned with src/lib/journeys.ts.
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

/** @type {{ meta: Record<string, unknown>, journeys: Journey[] } | null} */
let cached = null

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   family: string,
 *   wave: number,
 *   summary: string,
 *   plainSpeech: string[],
 *   doorChamberId: string,
 *   distinctFrom?: string[],
 *   keyIds?: string[],
 *   loopStageIds?: string[],
 *   stages: { id: string, role: string, label: string, chamberId: string, note?: string }[],
 * }} Journey
 */

function loadJourneysDoc() {
  if (cached) return cached
  const candidates = [
    join(root, 'src/content/journeys.json'),
    join(root, 'public/export/journeys.json'),
    join(root, 'dist/content/journeys.json'),
  ]
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue
      const raw = JSON.parse(readFileSync(p, 'utf8'))
      if (Array.isArray(raw.journeys)) {
        cached = raw
        return cached
      }
    } catch {
      /* try next */
    }
  }
  cached = { meta: { count: 0 }, journeys: [] }
  return cached
}

export function listJourneys() {
  return loadJourneysDoc().journeys
}

export function getJourneysMeta() {
  return loadJourneysDoc().meta
}

/** Legacy path aliases → preferred journey id */
const JOURNEY_ALIASES = {
  'spouse-left': 'marriage-shaken',
  'marriage-under-fire': 'marriage-shaken',
}

export function resolveJourneyId(id) {
  const raw = String(id || '')
    .trim()
    .toLowerCase()
  if (!raw) return raw
  return JOURNEY_ALIASES[raw] || raw
}

export function getJourney(id) {
  const resolved = resolveJourneyId(id)
  return listJourneys().find((j) => j.id === resolved) || null
}

/**
 * @param {string} text
 * @returns {Journey | null}
 */
export function matchJourneyFromText(text) {
  const raw = String(text || '')
    .trim()
    .toLowerCase()
  // Greetings / micro-utterances are Mode A — not journey entry
  if (!raw || raw.length < 4) return null
  if (/^(hi|hey|hello|thanks|thank you|ok|okay|yo)\b/.test(raw) && raw.length < 24) {
    return null
  }

  /** @type {{ journey: Journey, score: number } | null} */
  let best = null

  for (const journey of listJourneys()) {
    for (const phrase of journey.plainSpeech || []) {
      const p = String(phrase).toLowerCase().trim()
      if (p.length < 4) continue
      const exact = raw === p
      const userHasPhrase = raw.includes(p)
      const tokens = p.split(/\s+/).filter((t) => t.length > 2)
      const fuzzy =
        tokens.length >= 2 &&
        tokens.every((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(raw))
      if (!exact && !userHasPhrase && !fuzzy) continue
      let score = p.length
      if (userHasPhrase) score += 20
      if (exact) score += 40
      if (fuzzy && !userHasPhrase) score += 5
      score += (4 - (journey.wave || 3)) * 2
      if (!best || score > best.score) best = { journey, score }
    }
  }
  return best?.journey ?? null
}

/**
 * @param {Journey} journey
 * @param {string} chamberId
 * @param {number} [limit]
 */
export function nextStages(journey, chamberId, limit = 4) {
  const id = String(chamberId || '')
    .trim()
    .toLowerCase()
  const stages = journey.stages || []
  const idx = stages.findIndex((s) => s.chamberId === id)
  if (idx < 0) return stages.slice(0, limit)
  return stages.slice(idx + 1, idx + 1 + limit)
}

/**
 * @param {Journey} journey
 * @param {{ chamberId?: string | null }} [opts]
 */
export function formatJourneyContextLine(journey, opts = {}) {
  const chamberId = (opts.chamberId || journey.doorChamberId || '').trim() || journey.doorChamberId
  const stage = (journey.stages || []).find((s) => s.chamberId === chamberId)
  const next = nextStages(journey, chamberId, 4)
  const nextLabels = next.map((s) => `${s.label} (${s.chamberId})`).join(' → ')
  const distinct =
    journey.distinctFrom?.length ? ` Distinct from: ${journey.distinctFrom.join(', ')}.` : ''
  const stagePart = stage
    ? ` Current stage: ${stage.label} [${stage.role}] — ${stage.note || stage.chamberId}.`
    : ` Enter at door: ${journey.doorChamberId}.`
  return (
    `Visitor is on journey "${journey.title}" (${journey.id}, family=${journey.family}).` +
    ` Summary: ${journey.summary}` +
    stagePart +
    (nextLabels ? ` Next stations: ${nextLabels}.` : ' Journey terminus near.') +
    distinct +
    ` Use Mode B mini-card for counsel; Connected truth should prefer next stations on this journey.`
  )
}

/**
 * @param {string} chamberId
 * @returns {Journey[]}
 */
export function journeysForChamber(chamberId) {
  const id = String(chamberId || '')
    .trim()
    .toLowerCase()
  if (!id) return []
  return listJourneys().filter(
    (j) => j.doorChamberId === id || (j.stages || []).some((s) => s.chamberId === id),
  )
}
