/**
 * Core journeys SSOT — ordered multi-stage walks through chambers.
 * Import-only; no side effects.
 */

import journeysDoc from '../content/journeys.json'
import type {
  Journey,
  JourneyStage,
  JourneysDocument,
  JourneyStageRole,
} from '../types/journey'
import { resolveJourneyIdFromSlug } from './journey-slugs'

const doc = journeysDoc as JourneysDocument

const byId = new Map(doc.journeys.map((j) => [j.id, j]))

/** All core journeys in catalog order. */
export function listJourneys(): Journey[] {
  return doc.journeys
}

export function getJourneysMeta(): JourneysDocument['meta'] {
  return doc.meta
}

/** Resolve id or legacy alias (e.g. spouse-left → marriage-shaken). */
export function getJourney(id: string): Journey | null {
  const resolved = resolveJourneyIdFromSlug(id)
  if (!resolved) return null
  return byId.get(resolved) ?? null
}

/** Journeys whose door or any stage lands on this chamber. */
export function journeysForChamber(chamberId: string): Journey[] {
  const id = chamberId.trim().toLowerCase()
  if (!id) return []
  return doc.journeys.filter(
    (j) => j.doorChamberId === id || j.stages.some((s) => s.chamberId === id),
  )
}

/** Primary journey for a key id (first match). */
export function journeyForKey(keyId: string): Journey | null {
  const kid = keyId.trim()
  if (!kid) return null
  return doc.journeys.find((j) => j.keyIds?.includes(kid)) ?? null
}

/**
 * Score plain-speech match: longer phrase hits rank higher.
 * Prefer more specific journeys (marriage-shaken over deep-wound when both match).
 */
export function matchJourneyFromText(text: string): Journey | null {
  const raw = text.trim().toLowerCase()
  // Greetings / micro-utterances are Mode A — not journey entry
  if (!raw || raw.length < 4) return null
  if (/^(hi|hey|hello|thanks|thank you|ok|okay|yo)\b/.test(raw) && raw.length < 24) {
    return null
  }

  let best: { journey: Journey; score: number } | null = null

  for (const journey of doc.journeys) {
    for (const phrase of journey.plainSpeech) {
      const p = phrase.toLowerCase().trim()
      if (p.length < 4) continue
      // Never match short user text as substring of a longer phrase (avoids "hi" ∈ "thinking")
      const exact = raw === p
      const userHasPhrase = raw.includes(p)
      const fuzzy = fuzzyTokenMatch(raw, p)
      if (!exact && !userHasPhrase && !fuzzy) continue
      let score = p.length
      if (userHasPhrase) score += 20
      if (exact) score += 40
      if (fuzzy && !userHasPhrase) score += 5
      score += (4 - journey.wave) * 2
      if (!best || score > best.score) best = { journey, score }
    }
  }

  return best?.journey ?? null
}

function fuzzyTokenMatch(hay: string, needle: string): boolean {
  // All significant tokens of the phrase appear as whole words in user text
  const tokens = needle.split(/\s+/).filter((t) => t.length > 2)
  if (tokens.length < 2) return false
  return tokens.every((t) => new RegExp(`\\b${escapeReg(t)}\\b`, 'i').test(hay))
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function stageIndex(journey: Journey, stageId: string): number {
  return journey.stages.findIndex((s) => s.id === stageId)
}

export function stageByChamber(journey: Journey, chamberId: string): JourneyStage | null {
  const id = chamberId.trim().toLowerCase()
  return journey.stages.find((s) => s.chamberId === id) ?? null
}

/** Next stations after current chamber on this journey (skip duplicates). */
export function nextStages(
  journey: Journey,
  chamberId: string,
  limit = 4,
): JourneyStage[] {
  const idx = journey.stages.findIndex((s) => s.chamberId === chamberId.trim().toLowerCase())
  if (idx < 0) {
    // Not on path yet — return first stages from door
    return journey.stages.slice(0, limit)
  }
  const out: JourneyStage[] = []
  for (let i = idx + 1; i < journey.stages.length && out.length < limit; i++) {
    out.push(journey.stages[i])
  }
  return out
}

/** Connected-truth style titles for chat / chips. */
export function nextChamberIds(journey: Journey, chamberId: string, limit = 4): string[] {
  return nextStages(journey, chamberId, limit).map((s) => s.chamberId)
}

export function formatJourneyContextLine(
  journey: Journey,
  opts?: { chamberId?: string | null },
): string {
  const chamberId = opts?.chamberId?.trim() || journey.doorChamberId
  const stage = stageByChamber(journey, chamberId)
  const next = nextStages(journey, chamberId, 4)
  const nextLabels = next
    .map((s) => `${s.label} (${s.chamberId})`)
    .join(' → ')
  const distinct =
    journey.distinctFrom && journey.distinctFrom.length
      ? ` Distinct from: ${journey.distinctFrom.join(', ')}.`
      : ''
  const stagePart = stage
    ? ` Current stage: ${stage.label} [${stage.role}] — ${stage.note || stage.chamberId}.`
    : ` Enter at door: ${journey.doorChamberId}.`
  return (
    `Visitor is on journey "${journey.title}" (${journey.id}, family=${journey.family}).` +
    ` Summary: ${journey.summary}` +
    stagePart +
    (nextLabels ? ` Next stations: ${nextLabels}.` : ' Journey terminus near.') +
    distinct +
    ` Use Mode B mini-card; Connected truth chips should prefer next stations on this journey, not random atlas titles.`
  )
}

/** Compact catalog for system prompt (ids + titles + plain speech samples). */
export function journeysCatalogForPrompt(): string {
  return doc.journeys
    .map((j) => {
      const speech = j.plainSpeech.slice(0, 4).join(' / ')
      const path = j.stages.map((s) => s.chamberId).join(' → ')
      return `- ${j.id}: ${j.title} | say: ${speech} | door: ${j.doorChamberId} | path: ${path}`
    })
    .join('\n')
}

export function allJourneyChamberIds(): Set<string> {
  const set = new Set<string>()
  for (const j of doc.journeys) {
    set.add(j.doorChamberId)
    for (const s of j.stages) set.add(s.chamberId)
  }
  return set
}

export function isStageRole(v: string): v is JourneyStageRole {
  return (
    v === 'blow' ||
    v === 'near' ||
    v === 'spiral' ||
    v === 'fork' ||
    v === 'long_middle' ||
    v === 'remain'
  )
}

export { doc as journeysDocument }
