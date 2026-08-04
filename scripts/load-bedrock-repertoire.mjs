#!/usr/bin/env node
/**
 * Load Bedrock product context into Repertoire curated signals.
 *
 * Repertoire MCP has no batch-load tool — this is the project-side bulk upsert.
 * Tags all rows with `bedrock` so memory routing can filter / match this product.
 *
 * Usage (from bedrock repo root):
 *   node scripts/load-bedrock-repertoire.mjs
 *   node scripts/load-bedrock-repertoire.mjs --dry-run
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')

const journeysPath = join(root, 'src/content/journeys.json')
const bedrockPath = join(root, 'src/content/bedrock.json')
const keyEntriesPath = join(root, 'src/lib/key-entries.ts')

// Sibling repertoire install (same layout as features.json memory_routing)
const signalsPath =
  process.env.CURATED_SIGNALS_PATH ||
  join(root, '../repertoire/data/curated_signals.json')

const now = new Date().toISOString()
const today = now.slice(0, 10)
const TAG = 'bedrock'
const SOURCE_BATCH = 'bedrock-load-2026-07-28'

/**
 * @param {Partial<import('../../repertoire/src/types.ts').CuratedSignal> & { name: string, definition: string }} partial
 */
function signal(partial) {
  return {
    name: partial.name,
    definition: partial.definition,
    example_inference_snippet: partial.example_inference_snippet || partial.definition.slice(0, 200),
    tags: Array.from(
      new Set([TAG, 'product-context', 'field-guide', ...(partial.tags || [])]),
    ),
    batches: partial.batches || [SOURCE_BATCH],
    first_seen: partial.first_seen || today,
    status: partial.status || 'validated',
    priority: partial.priority || 'high',
    evaluation_criteria:
      partial.evaluation_criteria ||
      'Task or user language matches this Bedrock product primitive or journey entry speech.',
    validation_experiment:
      partial.validation_experiment ||
      'Route a Bedrock task describing this state; matched signal should appear in get_task_confidence / search_primitives.',
    master_index_integration:
      partial.master_index_integration ||
      'Bedrock SSOT: src/content/journeys.json + bedrock.json; surface via Keys and /api/journeys.',
    implementation_notes:
      partial.implementation_notes ||
      'Prefer journey path over single chamber when ground-shaking life is described.',
    observation_stats: {
      observation_count: 5,
      avg_confidence: 0.88,
      max_confidence: 0.95,
      last_seen: now,
      governance_forced_count: 1,
    },
  }
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function extractKeyEntries(tsSource) {
  /** @type {{ id: string, label: string, hint: string, chamberId: string, journeyId?: string }[]} */
  const entries = []
  const block = tsSource.match(/export const KEY_ENTRIES[^=]*=\s*\[([\s\S]*?)\]\s*$/m)
  if (!block) return entries
  const re =
    /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*hint:\s*((?:'[^']*')|(?:"[^"]*")),\s*chamberId:\s*'([^']+)',(?:\s*journeyId:\s*'([^']+)',)?/g
  let m
  while ((m = re.exec(block[1]))) {
    entries.push({
      id: m[1],
      label: m[2],
      hint: m[3].replace(/^['"]|['"]$/g, ''),
      chamberId: m[4],
      journeyId: m[5],
    })
  }
  return entries
}

function buildBedrockSignals() {
  const journeysDoc = loadJson(journeysPath)
  const bedrockDoc = loadJson(bedrockPath)
  const keys = existsSync(keyEntriesPath)
    ? extractKeyEntries(readFileSync(keyEntriesPath, 'utf8'))
    : []

  /** @type {ReturnType<typeof signal>[]} */
  const out = []

  // —— Product spine ——
  out.push(
    signal({
      name: 'bedrock-field-guide',
      definition:
        'Bedrock is a hitchhiker field guide to Love · Living · Enduring: 75 Scripture-rooted first-principle chambers (Truth · Under fire · Prayer), storm Keys, and multi-stage journeys for ground-shaking life. Motto: Do Better. Be Better. Trust God. Chat is companion, not pastor or crisis hotline.',
      tags: ['bedrock', 'product', 'atlas', 'motto'],
      priority: 'high',
      example_inference_snippet:
        'User building or counseling in Bedrock — stay steel, short under fire, chamber/journey SSOT not generic Christian AI fluff.',
    }),
  )

  out.push(
    signal({
      name: 'bedrock-journey-not-chamber',
      definition:
        'Ground-shaking life is a multi-stage journey (blow → near → spiral → fork → long_middle → remain), not one chamber card. Spouse left ≠ death. Connected truth must prefer next stations on the matched journey.',
      tags: ['bedrock', 'journey', 'architecture', 'path'],
      priority: 'high',
      evaluation_criteria:
        'Proposal or chat routing treats leave vs death distinctly and uses ordered stages.',
    }),
  )

  out.push(
    signal({
      name: 'bedrock-chat-mode-a-b',
      definition:
        'Guide chat Mode A: greetings/small talk → short plain prose, no First principle mini-card. Mode B: real counsel → full mini field card. Never open God First card for hi.',
      tags: ['bedrock', 'chat', 'ux', 'mode-a', 'mode-b'],
      priority: 'high',
    }),
  )

  out.push(
    signal({
      name: 'bedrock-oauth-device-code',
      definition:
        'xAI SuperGrok OAuth must run device-code on the production server (POST /oauth/initiate), persist Redis SSOT + Railway XAI_OAUTH_TOKENS skipDeploys — not localhost PKCE alone. invalid_grant clears Redis quarantine until reauth.',
      tags: ['bedrock', 'oauth', 'xai', 'ops', 'postalocity-pattern'],
      priority: 'high',
    }),
  )

  out.push(
    signal({
      name: 'bedrock-death-vs-leave',
      definition:
        'Death of a loved one opens journey death-of-loved-one door Loss. Spouse left / divorce opens spouse-left door Wounded. Never dual-pack or swap these doors.',
      tags: ['bedrock', 'journey', 'loss', 'wounded', 'pastoral'],
      priority: 'high',
      example_inference_snippet:
        'my husband left → spouse-left/wounded; we buried them → death-of-loved-one/loss',
    }),
  )

  // —— Journeys ——
  for (const j of journeysDoc.journeys || []) {
    const path = (j.stages || []).map((s) => `${s.label}[${s.role}]=${s.chamberId}`).join(' → ')
    const speech = (j.plainSpeech || []).slice(0, 8).join(' | ')
    out.push(
      signal({
        name: `bedrock-journey-${j.id}`,
        definition: `Bedrock core journey "${j.title}" (${j.id}, family=${j.family}, wave=${j.wave}). ${j.summary} Door: ${j.doorChamberId}. Path: ${path}. Plain speech: ${speech}.${j.distinctFrom?.length ? ` Distinct from: ${j.distinctFrom.join(', ')}.` : ''}`,
        tags: [
          'bedrock',
          'journey',
          j.family,
          `wave-${j.wave}`,
          j.id,
          j.doorChamberId,
          ...(j.plainSpeech || []).slice(0, 4).map((p) => p.replace(/\s+/g, '-').slice(0, 40)),
        ],
        priority: j.wave === 1 ? 'high' : 'medium',
        example_inference_snippet: speech || j.summary,
        evaluation_criteria: `User says one of: ${speech}`,
        master_index_integration: `GET /api/journeys/${j.id}; SPA ?j=${j.id}; door chamber /c/${j.doorChamberId}`,
        implementation_notes: `Stages: ${path}`,
      }),
    )
  }

  // —— Keys ——
  for (const k of keys) {
    out.push(
      signal({
        name: `bedrock-key-${k.id}`,
        definition: `Bedrock Key door "${k.label}" (hint: ${k.hint}) → chamber ${k.chamberId}${k.journeyId ? ` → journey ${k.journeyId}` : ' (no journey; formation/fruit)'}.`,
        tags: ['bedrock', 'keys', k.chamberId, k.id, ...(k.journeyId ? [k.journeyId, 'journey'] : [])],
        priority: 'medium',
        example_inference_snippet: `User taps Keys: ${k.label} — ${k.hint}`,
      }),
    )
  }

  // —— Wave-1 door chambers (short summaries) ——
  const doorIds = new Set(
    (journeysDoc.journeys || []).filter((j) => j.wave === 1).map((j) => j.doorChamberId),
  )
  doorIds.add('loss')
  doorIds.add('wounded')
  doorIds.add('hope-of-glory')
  for (const c of bedrockDoc.chambers || []) {
    if (!doorIds.has(c.id)) continue
    out.push(
      signal({
        name: `bedrock-chamber-${c.id}`,
        definition: `Chamber "${c.title}" (${c.id}): ${c.summary} Under fire: ${(c.hacks || []).slice(0, 2).join(' · ')}`,
        tags: ['bedrock', 'chamber', c.id, 'wave-1-door'],
        priority: 'medium',
        master_index_integration: `/c/${c.id}`,
      }),
    )
  }

  out.push(
    signal({
      name: 'bedrock-governance-dynamo',
      definition:
        'Major Bedrock product decisions use 0xRay inference_governance + Dynamo Solar (GOVERNANCE_ENDPOINT). features.json inference_governance.enabled true; memory_routing repertoire enabled.',
      tags: ['bedrock', 'governance', 'dynamo', '0xray'],
      priority: 'medium',
    }),
  )

  out.push(
    signal({
      name: 'bedrock-rubric-kill-flesh-walk-spirit',
      definition:
        'Bedrock operational rubric: Kill the Flesh. Walk in the Spirit. Thought capture; combat fear with Peace + Shield of Faith; refuse works of the flesh; self-control; love without self-erasure; honest trust assessment; contact boundaries; return to your side of the street; redirect statements; success is staying in the Spirit — not their return. Emotional state is your own — not dependent on them. Chamber id: kill-the-flesh-walk-in-the-spirit.',
      tags: [
        'bedrock',
        'rubric',
        'walk-by-the-spirit',
        'works-of-the-flesh',
        'side-of-the-street',
        'healing',
        'under-fire',
      ],
      priority: 'high',
      example_inference_snippet:
        'return to your side of the street · kill the flesh · refuse the remote · shield of faith · no contact is protection',
      evaluation_criteria:
        'User under fire in marriage/limbo/jealousy/control/fear needs a forged rule-set, not only abstract truth.',
      master_index_integration: '/c/kill-the-flesh-walk-in-the-spirit · journeys spouse-left + control-grip',
    }),
  )

  return out
}

function main() {
  if (!existsSync(journeysPath) || !existsSync(bedrockPath)) {
    console.error('Missing bedrock content SSOT (journeys.json / bedrock.json)')
    process.exit(1)
  }
  if (!existsSync(signalsPath)) {
    console.error('Missing curated signals file:', signalsPath)
    process.exit(1)
  }

  const incoming = buildBedrockSignals()
  const file = loadJson(signalsPath)
  const before = file.signals.length

  // Drop previous bedrock-load rows (idempotent re-run)
  const kept = file.signals.filter(
    (s) =>
      !(
        (Array.isArray(s.tags) && s.tags.includes(TAG) && s.name?.startsWith('bedrock-')) ||
        (Array.isArray(s.batches) && s.batches.includes(SOURCE_BATCH))
      ),
  )
  const removed = before - kept.length

  // Upsert by name
  const byName = new Map(kept.map((s) => [s.name, s]))
  let added = 0
  let updated = 0
  for (const s of incoming) {
    if (byName.has(s.name)) {
      byName.set(s.name, s)
      updated++
    } else {
      byName.set(s.name, s)
      added++
    }
  }

  const next = {
    ...file,
    last_updated: now,
    source: `${file.source || 'curated'} + ${SOURCE_BATCH}`,
    signals: Array.from(byName.values()),
  }

  console.log(
    JSON.stringify(
      {
        signalsPath,
        dryRun,
        before,
        removedPriorBedrock: removed,
        incoming: incoming.length,
        added,
        updated,
        after: next.signals.length,
        sample: incoming.slice(0, 3).map((s) => s.name),
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    console.log('Dry run — no write')
    return
  }

  mkdirSync(dirname(signalsPath), { recursive: true })
  // backup
  const bak = `${signalsPath}.bak-${today}`
  writeFileSync(bak, JSON.stringify(file, null, 2))
  writeFileSync(signalsPath, JSON.stringify(next, null, 2) + '\n')
  console.log('Wrote', signalsPath)
  console.log('Backup', bak)

  // Project-local mirror for audits
  const mirror = join(root, 'data/repertoire-bedrock-signals.json')
  mkdirSync(dirname(mirror), { recursive: true })
  writeFileSync(
    mirror,
    JSON.stringify(
      {
        description: 'Bedrock product signals last loaded into Repertoire curated_signals.json',
        loaded_at: now,
        count: incoming.length,
        signals: incoming,
      },
      null,
      2,
    ) + '\n',
  )
  console.log('Mirror', mirror)
}

main()
