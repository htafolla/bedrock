import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

describe('analytics visitor id', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.resetModules()
    const ls = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    }
    vi.stubGlobal('localStorage', ls)
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-0001',
    })
    vi.stubGlobal('window', {
      localStorage: ls,
      location: { pathname: '/', search: '', origin: 'https://bedrock.rippel.ai' },
      crypto: { randomUUID: () => 'test-uuid-0001' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates and reuses an anonymous visitor id', async () => {
    const { getVisitorId } = await import('./analytics')
    const a = getVisitorId()
    const b = getVisitorId()
    expect(a).toBeTruthy()
    expect(a.length).toBeGreaterThanOrEqual(8)
    expect(b).toBe(a)
    expect(store.get('bedrock.vid')).toBe(a)
  })
})
