import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  emptyFieldState,
  localDayKey,
  markKeyOpened,
  markLockUsed,
  markPathStage,
  markStandToday,
  markStationHeld,
  markStationOpened,
  markStationPrayed,
  parseFieldState,
  pathResumeChamberId,
  readFieldState,
  stoodToday,
  summarizeField,
  writeFieldState,
  FIELD_STORAGE_KEY,
} from './field-state'

function memStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
  }
}

describe('field-state', () => {
  beforeEach(() => {
    const storage = memStorage()
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('window', { localStorage: storage })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('starts empty', () => {
    expect(readFieldState()).toEqual(emptyFieldState())
  })

  it('marks station open / held / prayed once', () => {
    const t0 = 1_000
    markStationOpened('wounded', t0)
    markStationOpened('wounded', t0 + 50)
    markStationHeld('wounded', t0 + 100)
    markStationHeld('wounded', t0 + 200)
    markStationPrayed('wounded', t0 + 300)

    const s = readFieldState().stations.wounded!
    expect(s.openedAt).toBe(t0)
    expect(s.heldAt).toBe(t0 + 100)
    expect(s.prayedAt).toBe(t0 + 300)
  })

  it('manages keys by key id with count', () => {
    markKeyOpened('key-marriage', 10)
    markKeyOpened('key-marriage', 20)
    markKeyOpened('key-wounded', 30)
    const s = readFieldState()
    expect(s.keys['key-marriage']?.count).toBe(2)
    expect(s.keys['key-marriage']?.openedAt).toBe(10)
    expect(s.keys['key-marriage']?.lastAt).toBe(20)
    expect(s.keys['key-wounded']?.count).toBe(1)
  })

  it('advances path and completes on last stage', () => {
    markPathStage('marriage-shaken', 0, 'god-on-marriage', 4, 100)
    markPathStage('marriage-shaken', 2, 'fear', 4, 200)
    let p = readFieldState().paths['marriage-shaken']!
    expect(p.stageIndex).toBe(2)
    expect(p.chamberId).toBe('fear')
    expect(p.completedAt).toBeUndefined()

    markPathStage('marriage-shaken', 3, 'hope-of-glory', 4, 300)
    p = readFieldState().paths['marriage-shaken']!
    expect(p.stageIndex).toBe(3)
    expect(p.completedAt).toBe(300)
    expect(pathResumeChamberId('marriage-shaken', 'god-on-marriage')).toBe('hope-of-glory')
  })

  it('stand is once per local day for daysStood', () => {
    const day = localDayKey(new Date('2026-08-17T12:00:00'))
    vi.setSystemTime(new Date('2026-08-17T12:00:00'))
    markStandToday(Date.now())
    markStandToday(Date.now() + 1000)
    let s = readFieldState()
    expect(s.stand.lastDay).toBe(day)
    expect(s.stand.daysStood).toBe(1)
    expect(s.stand.totalStands).toBe(2)
    expect(stoodToday(s)).toBe(true)

    vi.setSystemTime(new Date('2026-08-18T09:00:00'))
    markStandToday(Date.now())
    s = readFieldState()
    expect(s.stand.daysStood).toBe(2)
    expect(stoodToday(s)).toBe(true)
    vi.useRealTimers()
  })

  it('lock counts uses', () => {
    markLockUsed(1)
    markLockUsed(2)
    expect(readFieldState().locks.count).toBe(2)
  })

  it('summarize and parse tolerate junk', () => {
    writeFieldState(emptyFieldState())
    markStationOpened('a', 1)
    markStationHeld('a', 2)
    markKeyOpened('key-god', 3)
    const sum = summarizeField()
    expect(sum.stationsOpened).toBe(1)
    expect(sum.stationsHeld).toBe(1)
    expect(sum.keysUsed).toBe(1)

    expect(parseFieldState(null)).toEqual(emptyFieldState())
    expect(parseFieldState({ v: 1, stations: { x: { bad: true } } }).stations).toEqual({})
    expect(FIELD_STORAGE_KEY).toBe('bedrock.field')
  })
})
