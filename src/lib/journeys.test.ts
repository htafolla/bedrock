import { describe, expect, it } from 'vitest'
import document from '../content/bedrock.json'
import journeysDoc from '../content/journeys.json'
import { KEY_ENTRIES } from './key-entries'
import {
  allJourneyChamberIds,
  formatJourneyContextLine,
  getJourney,
  journeyForKey,
  journeysForChamber,
  listJourneys,
  matchJourneyFromText,
  nextStages,
  stageByChamber,
} from './journeys'
import type { Journey, JourneyStageRole } from '../types/journey'

const ROLES: JourneyStageRole[] = [
  'blow',
  'near',
  'spiral',
  'fork',
  'long_middle',
  'remain',
]

describe('core journeys SSOT', () => {
  const chamberIds = new Set(document.chambers.map((c) => c.id))
  const journeys = listJourneys()

  it('ships exactly 15 core journeys matching meta.count', () => {
    expect(journeys.length).toBe(15)
    expect(journeysDoc.meta.count).toBe(15)
    expect(new Set(journeys.map((j) => j.id)).size).toBe(15)
  })

  it('battlefield of the mind is distinct and walks capture → SOP → accuser → renew → stand', () => {
    const j = getJourney('battlefield-of-the-mind')!
    expect(j).toBeTruthy()
    expect(j.doorChamberId).toBe('take-every-thought-captive')
    expect(j.stages.map((s) => s.chamberId)).toContain('kill-the-flesh-walk-in-the-spirit')
    expect(j.stages.map((s) => s.chamberId)).toContain('the-adversary')
    expect(j.stages.map((s) => s.chamberId)).toContain('regret')
    expect(j.stages.map((s) => s.chamberId)).toContain('wounded')
    expect(matchJourneyFromText('condemning myself')?.id).toBe('battlefield-of-the-mind')
    expect(matchJourneyFromText('fiery darts')?.id).toBe('battlefield-of-the-mind')
  })

  it('every door and stage chamberId exists in the atlas', () => {
    const missing: string[] = []
    for (const j of journeys) {
      if (!chamberIds.has(j.doorChamberId)) missing.push(`${j.id} door:${j.doorChamberId}`)
      for (const s of j.stages) {
        if (!chamberIds.has(s.chamberId)) missing.push(`${j.id} stage:${s.id}:${s.chamberId}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('stages have valid roles, unique ids per journey, door matches first blow chamber', () => {
    for (const j of journeys) {
      expect(j.stages.length).toBeGreaterThanOrEqual(4)
      expect(j.stages.length).toBeLessThanOrEqual(16)
      const stageIds = new Set<string>()
      for (const s of j.stages) {
        expect(ROLES).toContain(s.role)
        expect(s.label.length).toBeGreaterThan(0)
        expect(stageIds.has(s.id)).toBe(false)
        stageIds.add(s.id)
      }
      const blow = j.stages.find((s) => s.role === 'blow')
      expect(blow).toBeTruthy()
      expect(blow!.chamberId).toBe(j.doorChamberId)
      expect(j.plainSpeech.length).toBeGreaterThanOrEqual(3)
      expect(j.wave).toBeGreaterThanOrEqual(1)
      expect(j.wave).toBeLessThanOrEqual(3)
    }
  })

  it('death and marriage-shaken are distinct and do not share door', () => {
    const death = getJourney('death-of-loved-one')!
    const left = getJourney('marriage-shaken')!
    expect(death.doorChamberId).toBe('loss')
    expect(left.doorChamberId).toBe('wounded')
    expect(death.distinctFrom).toContain('marriage-shaken')
    expect(left.distinctFrom).toContain('death-of-loved-one')
    // Legacy alias still resolves
    expect(getJourney('spouse-left')?.id).toBe('marriage-shaken')
  })

  it('matches plain speech with precision', () => {
    expect(matchJourneyFromText('my husband left me')?.id).toBe('marriage-shaken')
    expect(matchJourneyFromText('marriage is falling apart')?.id).toBe('marriage-shaken')
    expect(matchJourneyFromText('we buried them last week')?.id).toBe('death-of-loved-one')
    expect(matchJourneyFromText("it owns me")?.id).toBe('addiction')
    expect(matchJourneyFromText("i can't stop replaying")?.id).toBe('obsession')
    expect(matchJourneyFromText('i fell again')?.id).toBe('i-fell')
    expect(matchJourneyFromText('hi')?.id).toBeUndefined()
  })

  it('nextStages advances along the path', () => {
    const j = getJourney('death-of-loved-one')!
    const next = nextStages(j, 'loss', 3)
    expect(next.map((s) => s.chamberId)).toEqual([
      'he-is-for-you',
      'his-promises',
      'lament-and-pour-out-your-heart',
    ])
    expect(stageByChamber(j, 'hope-of-glory')?.label).toMatch(/Hope|Pain and glory/i)
  })

  it('journeysForChamber finds loss and wounded doors', () => {
    expect(journeysForChamber('loss').some((j) => j.id === 'death-of-loved-one')).toBe(true)
    expect(journeysForChamber('wounded').some((j) => j.id === 'marriage-shaken')).toBe(true)
  })

  it('keyIds point at real Keys when set; primary key door matches journey door', () => {
    const keyById = new Map(KEY_ENTRIES.map((k) => [k.id, k]))
    for (const j of journeys) {
      for (const kid of j.keyIds || []) {
        expect(keyById.has(kid)).toBe(true)
        const k = keyById.get(kid)!
        // Primary key on a journey must open this path’s door chamber
        if (k.journeyId === j.id) {
          expect(k.chamberId).toBe(j.doorChamberId)
        }
      }
    }
    expect(journeyForKey('key-loss')?.id).toBe('death-of-loved-one')
    expect(journeyForKey('key-addiction')?.id).toBe('addiction')
    expect(journeyForKey('key-wait')?.id).toBe('forced-waiting')
    expect(journeyForKey('key-regret')?.id).toBe('stuck-regret')
    expect(getJourney('forced-waiting')!.doorChamberId).toBe('wait-on-the-lord')
  })

  it('formatJourneyContextLine includes next stations and distinctness', () => {
    const j = getJourney('marriage-shaken')!
    const line = formatJourneyContextLine(j, { chamberId: 'wounded' })
    expect(line).toMatch(/marriage-shaken/)
    expect(line).toMatch(/Next stations/)
    expect(line).toMatch(/death-of-loved-one/)
  })

  it('wave-1 set is complete for ground-shaking ship order', () => {
    const wave1 = journeys.filter((j) => j.wave === 1).map((j) => j.id).sort()
    expect(wave1).toEqual(
      [
        'addiction',
        'battlefield-of-the-mind',
        'death-of-loved-one',
        'forced-waiting',
        'i-fell',
        'marriage-shaken',
        'obsession',
      ].sort(),
    )
  })

  it('allJourneyChamberIds is non-empty subset of atlas', () => {
    const used = allJourneyChamberIds()
    expect(used.size).toBeGreaterThan(20)
    for (const id of used) {
      expect(chamberIds.has(id)).toBe(true)
    }
  })

  it('families are only the four allowed', () => {
    const allowed = new Set(['body', 'will', 'conscience', 'world'])
    for (const j of journeys as Journey[]) {
      expect(allowed.has(j.family)).toBe(true)
    }
  })
})
