import { describe, expect, it } from 'vitest'
import {
  bibleGatewaySearchUrl,
  formatVerseRange,
  isScriptureCitationLine,
  normalizeRefKey,
  parseScriptureCitationLine,
  parseScriptureDisplay,
  parseVerseList,
  permanentVerseUrl,
  primaryVerseUrl,
  scriptureChipHref,
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

describe('parseScriptureCitationLine', () => {
  it('parses parenthetical multi-ref with chapter shorthand', () => {
    const refs = parseScriptureCitationLine('(Galatians 5:16, 5:24-25)')
    expect(refs.map((r) => r.display)).toEqual(['Galatians 5:16', 'Galatians 5:24–25'])
  })

  it('parses mixed books and same-chapter shorthand', () => {
    const refs = parseScriptureCitationLine('(Ephesians 4:29, 4:31)')
    expect(refs.map((r) => r.display)).toEqual(['Ephesians 4:29', 'Ephesians 4:31'])
  })

  it('parses comma-separated full books', () => {
    const line = '(2 Timothy 1:7, Ephesians 6:16, Philippians 4:6-7)'
    expect(isScriptureCitationLine(line)).toBe(true)
    const refs = parseScriptureCitationLine(line)
    expect(refs.map((r) => r.display)).toEqual([
      '2 Timothy 1:7',
      'Ephesians 6:16',
      'Philippians 4:6–7',
    ])
  })

  it('does not treat ordinary prose as a citation line', () => {
    expect(isScriptureCitationLine('When fear rises:')).toBe(false)
    expect(
      isScriptureCitationLine(
        'Kill the acts of the flesh. Walk in the Spirit. This is the path.',
      ),
    ).toBe(false)
  })
})

describe('scriptureChipHref', () => {
  it('uses passage URL when parse succeeds', () => {
    const url = scriptureChipHref('John 3:16')
    expect(url).toBe(primaryVerseUrl({
      display: 'John 3:16',
      book: 'John',
      chapter: 3,
      verseStart: 16,
    }))
  })

  it('falls back to search URL for free text', () => {
    const url = scriptureChipHref('the armor of God')
    expect(url).toBe(bibleGatewaySearchUrl('the armor of God'))
  })

  it('strips trailing notes before linking', () => {
    const url = scriptureChipHref('John 15:13 — greater love')
    expect(new URL(url).searchParams.get('search')).toBe('John 15:13')
  })
})
