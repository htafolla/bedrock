import { describe, expect, it } from 'vitest'
import { normalizeChamberLabel, resolveChamberId } from './chamber-match'

const chambers = [
  { id: 'god-first', title: 'God First' },
  { id: 'love', title: 'Love' },
  { id: 'the-lords-prayer', title: "The Lord's Prayer" },
  { id: 'walk-by-the-spirit', title: 'Walk by the Spirit' },
]

describe('normalizeChamberLabel', () => {
  it('lowercases and collapses space', () => {
    expect(normalizeChamberLabel('  Walk  by  the Spirit ')).toBe('walk by the spirit')
  })
})

describe('resolveChamberId', () => {
  it('matches exact title case-insensitively', () => {
    expect(resolveChamberId('love', chambers)).toBe('love')
    expect(resolveChamberId('God First', chambers)).toBe('god-first')
  })

  it('matches curly apostrophe titles', () => {
    expect(resolveChamberId("The Lord's Prayer", chambers)).toBe('the-lords-prayer')
  })

  it('matches id slug form', () => {
    expect(resolveChamberId('walk-by-the-spirit', chambers)).toBe('walk-by-the-spirit')
    expect(resolveChamberId('walk by the spirit', chambers)).toBe('walk-by-the-spirit')
  })

  it('returns null when unknown', () => {
    expect(resolveChamberId('Not A Chamber', chambers)).toBeNull()
    expect(resolveChamberId('', chambers)).toBeNull()
  })
})
