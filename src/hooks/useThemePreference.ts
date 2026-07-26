import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_THEME,
  applyThemeToDocument,
  readThemePreference,
  writeThemePreference,
  type ThemeMode,
} from '../lib/theme-preference'

/**
 * Local theme preference (dark default).
 * Hydrates from localStorage; every user change is persisted + applied to <html>.
 */
export function useThemePreference() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME
    return readThemePreference()
  })

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
    writeThemePreference(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return { theme, setTheme, toggleTheme } as const
}
