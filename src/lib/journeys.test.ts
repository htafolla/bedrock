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

  it('ships exactly 14 core journeys matching meta.count', () => {
    expect(journeys.length).toBe(14)
    expect(journeysDoc.meta.count).toBe(14)
    expect(new Set(journeys.map((j) => j.id)).size).toBe(14)
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
      expect(j.stages.length).toBeLessThanOrEqual(12)
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

  it('death and spouse-left are distinct and do not share door', () => {
    const death = getJourney('death-of-loved-one')!
    const left = getJourney('spouse-left')!
    expect(death.doorChamberId).toBe('loss')
    expect(left.doorChamberId).toBe('wounded')
    expect(death.distinctFrom).toContain('spouse-left')
    expect(left.distinctFrom).toContain('death-of-loved-one')
  })

  it('matches plain speech with precision', () => {
    expect(matchJourneyFromText('my husband left me')?.id).toBe('spouse-left')
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
    expect(stageByChamber(j, 'hope-of-glory')?.label).toMatch(/Pain and glory/i)
  })

  it('journeysForChamber finds loss and wounded doors', () => {
    expect(journeysForChamber('loss').some((j) => j.id === 'death-of-loved-one')).toBe(true)
    expect(journeysForChamber('wounded').some((j) => j.id === 'spouse-left')).toBe(true)
  })

  it('keyIds point at real Keys when set', () => {
    const keySet = new Set(KEY_ENTRIES.map((k) => k.id))
    for (const j of journeys) {
      for (const kid of j.keyIds || []) {
        expect(keySet.has(kid)).toBe(true)
      }
    }
    expect(journeyForKey('key-loss')?.id).toBe('death-of-loved-one')
    expect(journeyForKey('key-addiction')?.id).toBe('addiction')
  })

  it('formatJourneyContextLine includes next stations and distinctness', () => {
    const j = getJourney('spouse-left')!
    const line = formatJourneyContextLine(j, { chamberId: 'wounded' })
    expect(line).toMatch(/spouse-left/)
    expect(line).toMatch(/Next stations/)
    expect(line).toMatch(/death-of-loved-one/)
  })

  it('wave-1 set is complete for ground-shaking ship order', () => {
    const wave1 = journeys.filter((j) => j.wave === 1).map((j) => j.id).sort()
    expect(wave1).toEqual(
      [
        'addiction',
        'death-of-loved-one',
        'forced-waiting',
        'i-fell',
        'obsession',
        'spouse-left',
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
