import { describe, expect, it } from 'vitest'
import { KEY_ENTRIES } from './key-entries'
import { SPINE_ORDER } from './spine'

describe('KEY_ENTRIES', () => {
  it('starts with two solid doors — God then Marriage — then the storm — then love', () => {
    expect(KEY_ENTRIES.map((k) => k.label)).toEqual([
      'God',
      'Marriage',
      'Patience',
      'Trust',
      'Grief',
      'Wounded',
      'Obsession',
      'Addiction',
      'Fear',
      'Jealousy',
      'Control',
      'Sexual sin',
      'Love',
    ])
    // 13 doors → carousel pages of 3 (last page Love alone is fine)
    expect(KEY_ENTRIES.length).toBe(13)
  })

  it('keeps wounded on Keys; addiction replaces regret (regret stays on Map)', () => {
    expect(KEY_ENTRIES.find((k) => k.id === 'key-wounded')?.chamberId).toBe('wounded')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-addiction')?.chamberId).toBe('addiction')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-addiction')?.hint).toBe('It owns me')
    expect(KEY_ENTRIES.some((k) => k.chamberId === 'regret')).toBe(false)
  })

  it('names Patience as the positive for “can’t force it” (fruit chamber)', () => {
    const door = KEY_ENTRIES.find((k) => k.id === 'key-patience')
    expect(door?.label).toBe('Patience')
    expect(door?.hint).toBe("Can't force it")
    expect(door?.chamberId).toBe('patience')
  })

  it('names Obsession in plain speech (not Loops / Rumination)', () => {
    const door = KEY_ENTRIES.find((k) => k.id === 'key-obsession')
    expect(door?.label).toBe('Obsession')
    expect(door?.hint.toLowerCase()).not.toMatch(/ruminat/)
    expect(door?.chamberId).toBe('rumination')
  })

  it('closes with Jealousy · Control · Sexual sin · Love', () => {
    expect(KEY_ENTRIES.find((k) => k.id === 'key-jealousy')?.chamberId).toBe('jealousy')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-control')?.chamberId).toBe('control')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-control')?.hint).toBe('Open hand')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-sexual-sin')?.chamberId).toBe('adultery')
    expect(KEY_ENTRIES.find((k) => k.id === 'key-love')?.chamberId).toBe('love')
    // Witchcraft stays on Map/Contents, not Keys
    expect(KEY_ENTRIES.some((k) => k.chamberId === 'pharmakeia')).toBe(false)
  })

  it('does not put syllabus / map-path chips on the first screen', () => {
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
      'Out of control',
      'Loops',
      'Rumination',
      'Faith',
      'Hope',
      'Persecution',
      'War',
      'Witchcraft',
      'Regret',
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
})
