import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_NAV_MODE,
  isNavMode,
  readNavModePreference,
  writeNavModePreference,
  NAV_MODE_STORAGE_KEY,
} from './nav-preference'

describe('nav-preference', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('validates nav modes', () => {
    expect(isNavMode('keys')).toBe(true)
    expect(isNavMode('journeys')).toBe(true)
    expect(isNavMode('map')).toBe(true)
    expect(isNavMode('toc')).toBe(true)
    expect(isNavMode('backstory')).toBe(false)
    expect(isNavMode('nope')).toBe(false)
    expect(isNavMode(null)).toBe(false)
  })

  it('migrates legacy backstory, map, and about tabs to default keys', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'backstory',
        setItem: vi.fn(),
      },
    })
    expect(readNavModePreference()).toBe(DEFAULT_NAV_MODE)
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'map',
        setItem: vi.fn(),
      },
    })
    expect(readNavModePreference()).toBe(DEFAULT_NAV_MODE)
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'about',
        setItem: vi.fn(),
      },
    })
    expect(readNavModePreference()).toBe(DEFAULT_NAV_MODE)
  })

  it('does not persist about (ephemeral surface)', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
      },
    })
    writeNavModePreference('about')
    expect(store.has(NAV_MODE_STORAGE_KEY)).toBe(false)
    writeNavModePreference('journeys')
    expect(store.get(NAV_MODE_STORAGE_KEY)).toBe('journeys')
  })

  it('reads stored preference', () => {
    const store = new Map<string, string>([[NAV_MODE_STORAGE_KEY, 'toc']])
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
      },
    })
    expect(readNavModePreference()).toBe('toc')
  })

  it('falls back to keys when missing or invalid', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'nope',
        setItem: vi.fn(),
      },
    })
    expect(readNavModePreference()).toBe(DEFAULT_NAV_MODE)
  })

  it('writes preference', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
      },
    })
    writeNavModePreference('keys')
    expect(store.get(NAV_MODE_STORAGE_KEY)).toBe('keys')
  })
})
