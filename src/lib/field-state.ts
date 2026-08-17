/**
 * Field — private local progress for Bedrock (not optional chrome).
 *
 * Keys · stations · paths · stand (The Line) · lock (Pain Interrupt).
 * Device-local only (localStorage). No IP, no server required.
 */

export const FIELD_STORAGE_KEY = 'bedrock.field'
export const FIELD_VERSION = 1 as const

/** Calendar day in local timezone YYYY-MM-DD */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface StationMark {
  openedAt: number
  heldAt?: number
  prayedAt?: number
}

export interface PathProgress {
  /** 0-based highest stage index reached */
  stageIndex: number
  chamberId: string
  lastAt: number
  completedAt?: number
}

export interface KeyMark {
  openedAt: number
  lastAt: number
  count: number
}

export interface StandState {
  /** Last day stood (local YYYY-MM-DD) */
  lastDay: string | null
  /** Distinct days with at least one stand */
  daysStood: number
  totalStands: number
}

export interface LockState {
  count: number
  lastAt?: number
}

export interface FieldState {
  v: typeof FIELD_VERSION
  stations: Record<string, StationMark>
  paths: Record<string, PathProgress>
  /** Key entry ids (key-marriage, key-wounded, …) */
  keys: Record<string, KeyMark>
  stand: StandState
  locks: LockState
}

export function emptyFieldState(): FieldState {
  return {
    v: FIELD_VERSION,
    stations: {},
    paths: {},
    keys: {},
    stand: { lastDay: null, daysStood: 0, totalStands: 0 },
    locks: { count: 0 },
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Parse and sanitize stored JSON. Never throws. */
export function parseFieldState(raw: unknown): FieldState {
  const base = emptyFieldState()
  if (!isRecord(raw)) return base

  if (isRecord(raw.stations)) {
    for (const [id, mark] of Object.entries(raw.stations)) {
      if (!id || !isRecord(mark) || typeof mark.openedAt !== 'number') continue
      const m: StationMark = { openedAt: mark.openedAt }
      if (typeof mark.heldAt === 'number') m.heldAt = mark.heldAt
      if (typeof mark.prayedAt === 'number') m.prayedAt = mark.prayedAt
      base.stations[id] = m
    }
  }

  if (isRecord(raw.paths)) {
    for (const [id, p] of Object.entries(raw.paths)) {
      if (!id || !isRecord(p)) continue
      if (typeof p.stageIndex !== 'number' || typeof p.chamberId !== 'string') continue
      if (typeof p.lastAt !== 'number') continue
      const prog: PathProgress = {
        stageIndex: Math.max(0, Math.floor(p.stageIndex)),
        chamberId: p.chamberId,
        lastAt: p.lastAt,
      }
      if (typeof p.completedAt === 'number') prog.completedAt = p.completedAt
      base.paths[id] = prog
    }
  }

  if (isRecord(raw.keys)) {
    for (const [id, k] of Object.entries(raw.keys)) {
      if (!id || !isRecord(k)) continue
      if (typeof k.openedAt !== 'number' || typeof k.count !== 'number') continue
      base.keys[id] = {
        openedAt: k.openedAt,
        lastAt: typeof k.lastAt === 'number' ? k.lastAt : k.openedAt,
        count: Math.max(1, Math.floor(k.count)),
      }
    }
  }

  if (isRecord(raw.stand)) {
    base.stand = {
      lastDay: typeof raw.stand.lastDay === 'string' ? raw.stand.lastDay : null,
      daysStood:
        typeof raw.stand.daysStood === 'number' ? Math.max(0, Math.floor(raw.stand.daysStood)) : 0,
      totalStands:
        typeof raw.stand.totalStands === 'number'
          ? Math.max(0, Math.floor(raw.stand.totalStands))
          : 0,
    }
  }

  if (isRecord(raw.locks)) {
    base.locks = {
      count: typeof raw.locks.count === 'number' ? Math.max(0, Math.floor(raw.locks.count)) : 0,
      lastAt: typeof raw.locks.lastAt === 'number' ? raw.locks.lastAt : undefined,
    }
  }

  return base
}

export function readFieldState(): FieldState {
  if (typeof window === 'undefined') return emptyFieldState()
  try {
    const raw = window.localStorage.getItem(FIELD_STORAGE_KEY)
    if (!raw) return emptyFieldState()
    return parseFieldState(JSON.parse(raw) as unknown)
  } catch {
    return emptyFieldState()
  }
}

export function writeFieldState(state: FieldState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FIELD_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota / private mode
  }
}

function mutate(fn: (s: FieldState) => void): FieldState {
  const s = readFieldState()
  fn(s)
  writeFieldState(s)
  return s
}

export function markStationOpened(chamberId: string, now = Date.now()): FieldState {
  const id = chamberId.trim()
  if (!id) return readFieldState()
  return mutate((s) => {
    const prev = s.stations[id]
    if (prev) {
      // keep first openedAt
      s.stations[id] = prev
    } else {
      s.stations[id] = { openedAt: now }
    }
  })
}

export function markStationHeld(chamberId: string, now = Date.now()): FieldState {
  const id = chamberId.trim()
  if (!id) return readFieldState()
  return mutate((s) => {
    const prev = s.stations[id]
    if (prev) {
      s.stations[id] = { ...prev, heldAt: prev.heldAt ?? now }
    } else {
      s.stations[id] = { openedAt: now, heldAt: now }
    }
  })
}

export function markStationPrayed(chamberId: string, now = Date.now()): FieldState {
  const id = chamberId.trim()
  if (!id) return readFieldState()
  return mutate((s) => {
    const prev = s.stations[id]
    if (prev) {
      s.stations[id] = { ...prev, prayedAt: prev.prayedAt ?? now }
    } else {
      s.stations[id] = { openedAt: now, prayedAt: now }
    }
  })
}

/** Storm key triage — managed in the same local Field bag. */
export function markKeyOpened(keyId: string, now = Date.now()): FieldState {
  const id = keyId.trim()
  if (!id) return readFieldState()
  return mutate((s) => {
    const prev = s.keys[id]
    if (prev) {
      s.keys[id] = { ...prev, lastAt: now, count: prev.count + 1 }
    } else {
      s.keys[id] = { openedAt: now, lastAt: now, count: 1 }
    }
  })
}

/**
 * Record path progress. stageIndex is 0-based.
 * Completes when stageIndex reaches last stage (stageCount - 1).
 * Furthest stage wins; lastAt always updates on visit.
 */
export function markPathStage(
  journeyId: string,
  stageIndex: number,
  chamberId: string,
  stageCount: number,
  now = Date.now(),
): FieldState {
  const jid = journeyId.trim()
  const cid = chamberId.trim()
  if (!jid || !cid || stageCount < 1) return readFieldState()
  const idx = Math.max(0, Math.min(stageCount - 1, Math.floor(stageIndex)))
  return mutate((s) => {
    const prev = s.paths[jid]
    const advance = !prev || idx >= prev.stageIndex
    const nextIndex = advance ? idx : prev.stageIndex
    const nextChamber = advance ? cid : prev.chamberId
    const completedAt =
      nextIndex >= stageCount - 1 ? (prev?.completedAt ?? now) : prev?.completedAt
    s.paths[jid] = {
      stageIndex: nextIndex,
      chamberId: nextChamber,
      lastAt: now,
      ...(completedAt != null ? { completedAt } : {}),
    }
  })
}

/** Stand on The Line for today (local day). Idempotent per day for daysStood. */
export function markStandToday(now = Date.now()): FieldState {
  const day = localDayKey(new Date(now))
  return mutate((s) => {
    const firstToday = s.stand.lastDay !== day
    s.stand.totalStands += 1
    if (firstToday) {
      s.stand.daysStood += 1
      s.stand.lastDay = day
    }
  })
}

export function stoodToday(state: FieldState = readFieldState(), now = Date.now()): boolean {
  return state.stand.lastDay === localDayKey(new Date(now))
}

export function markLockUsed(now = Date.now()): FieldState {
  return mutate((s) => {
    s.locks.count += 1
    s.locks.lastAt = now
  })
}

export function getStationMark(
  chamberId: string,
  state: FieldState = readFieldState(),
): StationMark | null {
  return state.stations[chamberId.trim()] ?? null
}

export function getPathProgress(
  journeyId: string,
  state: FieldState = readFieldState(),
): PathProgress | null {
  return state.paths[journeyId.trim()] ?? null
}

export function getKeyMark(keyId: string, state: FieldState = readFieldState()): KeyMark | null {
  return state.keys[keyId.trim()] ?? null
}

export interface FieldSummary {
  stationsOpened: number
  stationsHeld: number
  stationsPrayed: number
  pathsStarted: number
  pathsCompleted: number
  keysUsed: number
  daysStood: number
  stoodToday: boolean
  locksUsed: number
}

export function summarizeField(state: FieldState = readFieldState()): FieldSummary {
  const stations = Object.values(state.stations)
  const paths = Object.values(state.paths)
  return {
    stationsOpened: stations.length,
    stationsHeld: stations.filter((s) => s.heldAt != null).length,
    stationsPrayed: stations.filter((s) => s.prayedAt != null).length,
    pathsStarted: paths.length,
    pathsCompleted: paths.filter((p) => p.completedAt != null).length,
    keysUsed: Object.keys(state.keys).length,
    daysStood: state.stand.daysStood,
    stoodToday: stoodToday(state),
    locksUsed: state.locks.count,
  }
}

/**
 * Resume chamber for a path — progress chamber or door.
 * @param stages Optional path stages; used to validate + migrate stale progress
 *   (e.g. old marriage-shaken door was wounded, now god-on-marriage).
 */
export function pathResumeChamberId(
  journeyId: string,
  doorChamberId: string,
  state: FieldState = readFieldState(),
  stages?: ReadonlyArray<{ chamberId: string }>,
): string {
  const p = state.paths[journeyId.trim()]
  if (!p?.chamberId) return doorChamberId

  const onPath = stages?.some((s) => s.chamberId === p.chamberId) ?? true
  if (!onPath) return doorChamberId

  // Only ever opened the *old* door (stage 0) and door has since moved — start at new door.
  if (p.stageIndex <= 0 && p.chamberId !== doorChamberId) {
    return doorChamberId
  }

  return p.chamberId
}
