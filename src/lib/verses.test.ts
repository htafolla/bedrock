import { describe, expect, it } from 'vitest'
import {
  formatVerseRange,
  normalizeRefKey,
  parseScriptureDisplay,
  parseVerseList,
  permanentVerseUrl,
  primaryVerseUrl,
} from './verses'
import type { ScriptureRef } from '../types/content'

const sample: ScriptureRef = {
  display: 'Matthew 6:33',
  book: 'Matthew',
  chapter: 6,
  verseStart: 33,
}

describe('primaryVerseUrl', () => {
  it('points at Bible Gateway passage for the exact verse', () => {
    const url = primaryVerseUrl(sample)
    expect(url.startsWith('https://www.biblegateway.com/passage/?')).toBe(true)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('search')).toBe('Matthew 6:33')
    expect(parsed.searchParams.get('version')).toBe('NIV')
  })

  it('uses ASCII hyphen for ranges', () => {
    const url = primaryVerseUrl({
      display: 'Ephesians 6:10–18',
      book: 'Ephesians',
      chapter: 6,
      verseStart: 10,
      verseEnd: 18,
    })
    expect(new URL(url).searchParams.get('search')).toBe('Ephesians 6:10-18')
  })
})

describe('permanentVerseUrl', () => {
  it('uses local permanence route by default', () => {
    expect(permanentVerseUrl(sample)).toBe('#/permanent/verse/matthew-6-33')
  })

  it('uses IPFS gateway when cid provided', () => {
    const url = permanentVerseUrl(sample, {
      ipfsGateway: 'https://ipfs.io',
      cid: 'bafytest',
    })
    expect(url).toBe('https://ipfs.io/ipfs/bafytest/verses/matthew-6-33.json')
  })
})

describe('parseScriptureDisplay', () => {
  it('parses single verse', () => {
    const ref = parseScriptureDisplay('John 3:16')
    expect(ref).toEqual({
      display: 'John 3:16',
      book: 'John',
      chapter: 3,
      verseStart: 16,
      verseEnd: undefined,
    })
  })

  it('parses ranges and numbered books', () => {
    const ref = parseScriptureDisplay('1 Corinthians 13:4-7')
    expect(ref?.book).toBe('1 Corinthians')
    expect(ref?.verseStart).toBe(4)
    expect(ref?.verseEnd).toBe(7)
  })

  it('returns null for invalid input', () => {
    expect(parseScriptureDisplay('not a verse')).toBeNull()
  })
})

describe('normalizeRefKey / formatVerseRange', () => {
  it('normalizes keys', () => {
    expect(normalizeRefKey(sample)).toBe('matthew-6-33')
  })

  it('formats ranges with en-dash', () => {
    expect(
      formatVerseRange({
        display: 'Eph 6:10-18',
        book: 'Ephesians',
        chapter: 6,
        verseStart: 10,
        verseEnd: 18,
      }),
    ).toBe('Ephesians 6:10–18')
  })
})

describe('parseVerseList', () => {
  it('expands multi-verse tokens after a chapter', () => {
    const refs = parseVerseList('Romans 11:33, 36 · Galatians 5:16, 22-23, 25')
    expect(refs.map((r) => r.display)).toEqual([
      'Romans 11:33',
      'Romans 11:36',
      'Galatians 5:16',
      'Galatians 5:22–23',
      'Galatians 5:25',
    ])
  })
})
