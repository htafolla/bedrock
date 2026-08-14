import { describe, expect, it } from 'vitest'
import {
  buildAppHref,
  chamberAppHref,
  chamberPath,
  journeyAppHref,
  parseChamberFromLocation,
  parseJourneyFromLocation,
} from './path-routing'

describe('path-routing', () => {
  it('builds canonical and app hrefs', () => {
    expect(chamberPath('god-first')).toBe('/c/god-first')
    // Preferred public slug when title ≠ internal id
    expect(chamberPath('kill-the-flesh')).toBe('/c/master-the-flesh')
    expect(chamberAppHref('god-first')).toBe('/?c=god-first')
  })

  it('builds journey app hrefs', () => {
    expect(journeyAppHref('spouse-left')).toBe('/?j=spouse-left')
    expect(journeyAppHref('spouse-left', 'wounded')).toBe('/?j=spouse-left&c=wounded')
  })

  it('buildAppHref orders journey then chamber and home', () => {
    expect(buildAppHref({})).toBe('/')
    expect(buildAppHref({ chamberId: 'loss' })).toBe('/?c=loss')
    expect(buildAppHref({ journeyId: 'spouse-left', chamberId: 'wounded' })).toBe(
      '/?j=spouse-left&c=wounded',
    )
  })

  it('parses ?c= query', () => {
    expect(parseChamberFromLocation('?c=addiction', '/')).toBe('addiction')
    expect(parseChamberFromLocation('?c=God-First', '/')).toBe('god-first')
  })

  it('parses ?j= journey query', () => {
    expect(parseJourneyFromLocation('?j=spouse-left')).toBe('spouse-left')
    expect(parseJourneyFromLocation('?j=death-of-loved-one&c=loss')).toBe('death-of-loved-one')
    expect(parseJourneyFromLocation('?j=../x')).toBeNull()
  })

  it('parses /c/:id path', () => {
    expect(parseChamberFromLocation('', '/c/jealousy')).toBe('jealousy')
    expect(parseChamberFromLocation('', '/c/walk-by-the-spirit/')).toBe('walk-by-the-spirit')
    // Public alias → stable content id
    expect(parseChamberFromLocation('', '/c/master-the-flesh')).toBe('kill-the-flesh')
    expect(parseChamberFromLocation('?c=master-the-flesh', '/')).toBe('kill-the-flesh')
  })

  it('rejects junk', () => {
    expect(parseChamberFromLocation('?c=../etc', '/')).toBeNull()
    expect(parseChamberFromLocation('', '/about')).toBeNull()
  })
})
