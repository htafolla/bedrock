import { describe, expect, it } from 'vitest'
import { KEY_ENTRIES } from './key-entries'
import { SPINE_ORDER } from './spine'
import { getJourney, journeyForKey } from './journeys'

describe('KEY_ENTRIES', () => {
  it('solid first, then fire plan, then extra storms — no Love fruit on Keys', () => {
    expect(KEY_ENTRIES.map((k) => k.label)).toEqual([
      'God',
      'Marriage',
      'Out of control',
      'Trust',
      'Grief',
      'Wounded',
      'Obsession',
      'Regret',
      'Fear',
      'Addiction',
      'Jealousy',
      'Control',
      'Sexual sin',
      'Witchcraft',
      'Persecution',
    ])
    expect(KEY_ENTRIES.length).toBe(15)
    expect(KEY_ENTRIES.some((k) => k.id === 'key-love')).toBe(false)
    expect(KEY_ENTRIES.some((k) => k.id === 'key-patience')).toBe(false)
  })

  it('puts Regret on Keys (aggressor door) and Wounded on Keys (victim door)', () => {
    expect(KEY_ENTRIES.find((k) => k.id === 'key-regret')?.chamberId).toBe('regret')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-regret')?.hint).toBe('I blew it')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-regret')?.journeyId).toBe('stuck-regret')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-wounded')?.chamberId).toBe('wounded')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-addiction')?.chamberId).toBe('addiction')
  })

  it('names Out of control with Wait chamber (not Patience fruit)', () => {
    const door = KEY_ENTRIES.find((k) => k.id === 'key-wait')
    expect(door?.label).toBe('Out of control')
    expect(door?.hint).toBe("Can't force it")
    expect(door?.chamberId).toBe('wait-on-the-lord')
    expect(door?.journeyId).toBe('forced-waiting')
  })

  it('names Obsession in plain speech (not Loops / Rumination)', () => {
    const door = KEY_ENTRIES.find((k) => k.id === 'key-obsession')
    expect(door?.label).toBe('Obsession')
    expect(door?.hint.toLowerCase()).not.toMatch(/ruminat/)
    expect(door?.chamberId).toBe('rumination')
  })

  it('closes flesh/war keys without attaching mismatched paths', () => {
    expect(KEY_ENTRIES.find((k) => k.id === 'key-witchcraft')?.chamberId).toBe('pharmakeia')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-witchcraft')?.journeyId).toBeUndefined()
    expect(KEY_ENTRIES.find((k) => k.id === 'key-persecution')?.chamberId).toBe('persecution')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-control')?.chamberId).toBe('control')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-god')?.journeyId).toBeUndefined()
    expect(KEY_ENTRIES.find((k) => k.id === 'key-marriage')?.journeyId).toBeUndefined()
    expect(KEY_ENTRIES.find((k) => k.id === 'key-trust')?.journeyId).toBeUndefined()
  })

  it('does not put syllabus chips on the first screen', () => {
    const labels = new Set(KEY_ENTRIES.map((k) => k.label))
    for (const syllabus of [
      'I fell',
      'Forgive',
      'Hatred',
      'Grace',
      'Spirit fruit',
      'Confess',
      'Armor',
      'The Cross',
      'Loops',
      'Rumination',
      'Faith',
      'Hope',
      'War',
      'Love',
      'Patience',
    ]) {
      expect(labels.has(syllabus)).toBe(false)
    }
  })

  it('every chamberId exists on the spine pilgrimage', () => {
    const spine = new Set(SPINE_ORDER)
    for (const k of KEY_ENTRIES) {
      expect(spine.has(k.chamberId as (typeof SPINE_ORDER)[number])).toBe(true)
    }
  })

  it('journeyId only when key chamber is that path’s door', () => {
    for (const k of KEY_ENTRIES) {
      if (!k.journeyId) continue
      const j = getJourney(k.journeyId)
      expect(j, `${k.id} journey ${k.journeyId}`).toBeTruthy()
      expect(j!.doorChamberId).toBe(k.chamberId)
      expect(journeyForKey(k.id)?.id).toBe(k.journeyId)
    }
  })

  it('storm Keys link to core journey ids when set', () => {
    expect(KEY_ENTRIES.find((k) => k.id === 'key-loss')?.journeyId).toBe('death-of-loved-one')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-wounded')?.journeyId).toBe('spouse-left')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-addiction')?.journeyId).toBe('addiction')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-wait')?.journeyId).toBe('forced-waiting')
  })
})
