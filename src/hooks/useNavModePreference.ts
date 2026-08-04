import { useCallback, useState } from 'react'
import type { NavMode } from '../components/experience/NavModes'
import {
  DEFAULT_NAV_MODE,
  readNavModePreference,
  writeNavModePreference,
} from '../lib/nav-preference'

/**
 * Local preference for Keys · Map · Contents.
 * Hydrates from localStorage; every user change is persisted.
 */
export function useNavModePreference() {
  const [navMode, setNavModeState] = useState<NavMode>(() => {
    if (typeof window === 'undefined') return DEFAULT_NAV_MODE
    return readNavModePreference()
  })

  const setNavMode = useCallback((mode: NavMode) => {
    setNavModeState(mode)
    // About is session-only; still persist Keys/Journeys/Contents
    writeNavModePreference(mode)
  }, [])

  /** Explicit leave About / force Keys (does not depend on panel mount). */
  const leaveAbout = useCallback(() => {
    setNavModeState(DEFAULT_NAV_MODE)
    writeNavModePreference(DEFAULT_NAV_MODE)
  }, [])

  return { navMode, setNavMode, leaveAbout } as const
}
