import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_THEME,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  isThemeMode,
  readThemePreference,
  writeThemePreference,
} from './theme-preference'

describe('theme-preference', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('validates theme modes', () => {
    expect(isThemeMode('dark')).toBe(true)
    expect(isThemeMode('light')).toBe(true)
    expect(isThemeMode('auto')).toBe(false)
    expect(isThemeMode(null)).toBe(false)
  })

  it('defaults to dark', () => {
    expect(DEFAULT_THEME).toBe('dark')
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: vi.fn(),
      },
    })
    expect(readThemePreference()).toBe('dark')
  })

  it('reads stored light preference', () => {
    const store = new Map<string, string>([[THEME_STORAGE_KEY, 'light']])
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
      },
    })
    expect(readThemePreference()).toBe('light')
  })

  it('falls back on invalid values', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'sepia',
        setItem: vi.fn(),
      },
    })
    expect(readThemePreference()).toBe(DEFAULT_THEME)
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
    writeThemePreference('light')
    expect(store.get(THEME_STORAGE_KEY)).toBe('light')
  })

  it('applies data-theme and meta to the document', () => {
    const themeColor = { setAttribute: vi.fn() }
    const colorScheme = { setAttribute: vi.fn() }
    const docEl = {
      setAttribute: vi.fn(),
      style: { colorScheme: '' } as { colorScheme: string },
    }
    vi.stubGlobal('document', {
      documentElement: docEl,
      querySelector: (sel: string) => {
        if (sel === 'meta[name="theme-color"]') return themeColor
        if (sel === 'meta[name="color-scheme"]') return colorScheme
        return null
      },
    })

    applyThemeToDocument('light')
    expect(docEl.setAttribute).toHaveBeenCalledWith('data-theme', 'light')
    expect(docEl.style.colorScheme).toBe('light')
    expect(themeColor.setAttribute).toHaveBeenCalledWith('content', THEME_COLORS.light)
    expect(colorScheme.setAttribute).toHaveBeenCalledWith('content', 'light')
  })
})
