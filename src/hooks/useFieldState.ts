import { useCallback, useEffect, useState } from 'react'
import {
  type FieldState,
  type FieldSummary,
  emptyFieldState,
  getKeyMark,
  getPathProgress,
  getStationMark,
  markKeyOpened,
  markLockUsed,
  markPathStage,
  markStandToday,
  markStationHeld,
  markStationOpened,
  markStationPrayed,
  pathResumeChamberId,
  readFieldState,
  stoodToday,
  summarizeField,
  FIELD_STORAGE_KEY,
} from '../lib/field-state'

/**
 * Reactive Field bag — localStorage-backed keys, stations, paths, stand, lock.
 * Always on (not a feature flag). Key management lives here with the rest of Field.
 */
export function useFieldState() {
  const [state, setState] = useState<FieldState>(() =>
    typeof window === 'undefined' ? emptyFieldState() : readFieldState(),
  )

  const refresh = useCallback(() => {
    setState(readFieldState())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FIELD_STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  const wrap = useCallback(
    <A extends unknown[]>(fn: (...args: A) => FieldState) =>
      (...args: A) => {
        const next = fn(...args)
        setState(next)
        return next
      },
    [],
  )

  const summary: FieldSummary = summarizeField(state)

  return {
    state,
    summary,
    stoodToday: stoodToday(state),
    refresh,
    markStationOpened: wrap(markStationOpened),
    markStationHeld: wrap(markStationHeld),
    markStationPrayed: wrap(markStationPrayed),
    markKeyOpened: wrap(markKeyOpened),
    markPathStage: wrap(markPathStage),
    markStandToday: wrap(markStandToday),
    markLockUsed: wrap(markLockUsed),
    getStationMark: (id: string) => getStationMark(id, state),
    getPathProgress: (id: string) => getPathProgress(id, state),
    getKeyMark: (id: string) => getKeyMark(id, state),
    pathResumeChamberId: (journeyId: string, door: string) =>
      pathResumeChamberId(journeyId, door, state),
    storageKey: FIELD_STORAGE_KEY,
  } as const
}
