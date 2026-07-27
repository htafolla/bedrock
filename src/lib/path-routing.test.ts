import { describe, expect, it } from 'vitest'
import {
  chamberAppHref,
  chamberPath,
  parseChamberFromLocation,
} from './path-routing'

describe('path-routing', () => {
  it('builds canonical and app hrefs', () => {
    expect(chamberPath('god-first')).toBe('/c/god-first')
    expect(chamberAppHref('god-first')).toBe('/?c=god-first')
  })

  it('parses ?c= query', () => {
    expect(parseChamberFromLocation('?c=addiction', '/')).toBe('addiction')
    expect(parseChamberFromLocation('?c=God-First', '/')).toBe('god-first')
  })

  it('parses /c/:id path', () => {
    expect(parseChamberFromLocation('', '/c/jealousy')).toBe('jealousy')
    expect(parseChamberFromLocation('', '/c/walk-by-the-spirit/')).toBe('walk-by-the-spirit')
  })

  it('rejects junk', () => {
    expect(parseChamberFromLocation('?c=../etc', '/')).toBeNull()
    expect(parseChamberFromLocation('', '/about')).toBeNull()
  })
})
