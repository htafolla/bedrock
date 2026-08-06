/** UI theme: dark (default) | light — localStorage-backed. */

export type ThemeMode = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'bedrock.theme'
export const DEFAULT_THEME: ThemeMode = 'dark'

export const THEME_COLORS = {
  dark: '#0c0a09',
  light: '#f7f1e7',
} as const

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light'
}

/** Read preferred theme from localStorage (SSR / private mode safe). */
export function readThemePreference(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(raw)) return raw
  } catch {
    // ignore quota / privacy mode
  }
  return DEFAULT_THEME
}

/** Persist preferred theme. */
export function writeThemePreference(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}

/** Apply theme to <html> + browser chrome meta (call on hydrate and on change). */
export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute('content', THEME_COLORS[theme])
  }
  const colorScheme = document.querySelector('meta[name="color-scheme"]')
  if (colorScheme) {
    colorScheme.setAttribute('content', theme)
  }
}
