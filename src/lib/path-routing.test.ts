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
    expect(journeyAppHref('marriage-shaken')).toBe('/?j=marriage-shaken')
    expect(journeyAppHref('marriage-shaken', 'god-on-marriage')).toBe(
      '/?j=marriage-shaken&c=god-on-marriage',
    )
    // Legacy alias resolves to preferred id
    expect(journeyAppHref('spouse-left')).toBe('/?j=marriage-shaken')
  })

  it('buildAppHref orders journey then chamber and home', () => {
    expect(buildAppHref({})).toBe('/')
    expect(buildAppHref({ chamberId: 'loss' })).toBe('/?c=loss')
    expect(buildAppHref({ journeyId: 'marriage-shaken', chamberId: 'god-on-marriage' })).toBe(
      '/?j=marriage-shaken&c=god-on-marriage',
    )
  })

  it('parses ?c= query', () => {
    expect(parseChamberFromLocation('?c=addiction', '/')).toBe('addiction')
    expect(parseChamberFromLocation('?c=God-First', '/')).toBe('god-first')
  })

  it('parses ?j= journey query', () => {
    expect(parseJourneyFromLocation('?j=marriage-shaken')).toBe('marriage-shaken')
    expect(parseJourneyFromLocation('?j=spouse-left')).toBe('marriage-shaken')
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
