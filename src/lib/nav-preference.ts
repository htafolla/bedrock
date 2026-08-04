import type { NavMode } from '../components/experience/NavModes'

export const NAV_MODE_STORAGE_KEY = 'bedrock.navMode'
export const DEFAULT_NAV_MODE: NavMode = 'keys'

const VALID: ReadonlySet<string> = new Set(['keys', 'journeys', 'map', 'toc', 'about'])

export function isNavMode(value: unknown): value is NavMode {
  return typeof value === 'string' && VALID.has(value)
}

/** Read preferred nav mode from localStorage (SSR / private mode safe). */
export function readNavModePreference(): NavMode {
  if (typeof window === 'undefined') return DEFAULT_NAV_MODE
  try {
    const raw = window.localStorage.getItem(NAV_MODE_STORAGE_KEY)
    // Ephemeral / legacy — never restore these as home surface
    if (raw === 'backstory' || raw === 'map' || raw === 'about') return DEFAULT_NAV_MODE
    if (isNavMode(raw) && raw !== 'about') return raw
  } catch {
    // ignore quota / privacy mode
  }
  return DEFAULT_NAV_MODE
}

/**
 * Persist preferred nav mode (Keys · Journeys · Contents only).
 * About is ephemeral — never sticky-trap visitors on About after open.
 */
export function writeNavModePreference(mode: NavMode): void {
  if (typeof window === 'undefined') return
  if (mode === 'about' || mode === 'map') return
  try {
    window.localStorage.setItem(NAV_MODE_STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}
