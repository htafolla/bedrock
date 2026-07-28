import type { NavMode } from '../components/experience/NavModes'

export const NAV_MODE_STORAGE_KEY = 'bedrock.navMode'
export const DEFAULT_NAV_MODE: NavMode = 'keys'

const VALID: ReadonlySet<string> = new Set(['keys', 'journeys', 'map', 'toc'])

export function isNavMode(value: unknown): value is NavMode {
  return typeof value === 'string' && VALID.has(value)
}

/** Read preferred nav mode from localStorage (SSR / private mode safe). */
export function readNavModePreference(): NavMode {
  if (typeof window === 'undefined') return DEFAULT_NAV_MODE
  try {
    const raw = window.localStorage.getItem(NAV_MODE_STORAGE_KEY)
    // Legacy: Backstory was briefly a header tab — map it off the chrome.
    if (raw === 'backstory') return DEFAULT_NAV_MODE
    if (isNavMode(raw)) return raw
  } catch {
    // ignore quota / privacy mode
  }
  return DEFAULT_NAV_MODE
}

/** Persist preferred nav mode (Keys · Journeys · Map · Contents). */
export function writeNavModePreference(mode: NavMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NAV_MODE_STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}
