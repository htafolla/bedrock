/**
 * Durable privacy-first traffic store (Postalocity-style Redis SSOT).
 *
 * When REDIS_URL is set:
 *   - counters + unique visitor sets live in Redis (survive redeploys)
 *   - recent events as a capped list
 *   - JSONL still appended as audit log when disk is writable
 *
 * Without Redis: in-memory + JSONL (current behavior).
 *
 * No IP addresses. Anonymous vid from the client only.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs'
import { dirname } from 'node:path'

const KEY = {
  total: 'bedrock:telemetry:total',
  pageviews: 'bedrock:telemetry:pageviews',
  doors: 'bedrock:telemetry:doors', // hash chamberId -> count
  paths: 'bedrock:telemetry:paths', // hash path -> count
  uniquesAll: 'bedrock:telemetry:uniques', // set of vid
  uniquesDay: (d) => `bedrock:telemetry:uniques:${d}`, // set per day
  recent: 'bedrock:telemetry:recent', // list of JSON rows (capped)
}

const RECENT_CAP = 400
const VID_RE = /^[a-zA-Z0-9_-]{8,80}$/

/** @type {import('ioredis').default | null} */
let redis = null
let redisReady = false

// In-memory fallback
const mem = {
  total: 0,
  pageviews: 0,
  doors: new Map(),
  paths: new Map(),
  uniquesAll: new Set(),
  /** @type {Map<string, Set<string>>} */
  uniquesByDay: new Map(),
  recent: /** @type {Array<Record<string, unknown>>} */ ([]),
}

export function dayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10)
}

/**
 * @returns {Promise<void>}
 */
export async function initTelemetryStore() {
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    console.log('[telemetry] REDIS_URL unset — using memory + JSONL only')
    return
  }
  try {
    const { default: Redis } = await import('ioredis')
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      connectTimeout: 8_000,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 1500)
      },
    })
    await redis.connect()
    await redis.ping()
    redisReady = true
    console.log('[telemetry] Redis connected — durable uniques/pageviews ready')
  } catch (err) {
    redis = null
    redisReady = false
    console.warn(
      '[telemetry] Redis unavailable — memory/JSONL fallback:',
      err instanceof Error ? err.message : err,
    )
  }
}

export function isTelemetryRedisReady() {
  return redisReady && redis != null
}

/**
 * Seed memory maps from JSONL (used when Redis is cold or as dual source on boot).
 * @param {string} telemetryPath
 */
export function hydrateFromJsonl(telemetryPath) {
  if (!existsSync(telemetryPath)) return
  try {
    const lines = readFileSync(telemetryPath, 'utf8').split('\n').filter(Boolean)
    const slice = lines.slice(-20_000)
    for (const line of slice) {
      try {
        applyRowToMemory(JSON.parse(line), { silent: true })
      } catch {
        /* skip */
      }
    }
  } catch (err) {
    console.warn('[telemetry] JSONL hydrate failed', err instanceof Error ? err.message : err)
  }
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ silent?: boolean }} [opts]
 */
function applyRowToMemory(row, opts = {}) {
  const event = String(row.event || '')
  const t = typeof row.t === 'number' ? row.t : Date.now()
  mem.total += 1
  if (event === 'pageview') mem.pageviews += 1
  if (
    typeof row.chamberId === 'string' &&
    (event === 'open_chamber' || event === 'key_tap')
  ) {
    mem.doors.set(row.chamberId, (mem.doors.get(row.chamberId) || 0) + 1)
  }
  if (typeof row.path === 'string' && event === 'pageview') {
    mem.paths.set(row.path, (mem.paths.get(row.path) || 0) + 1)
  }
  if (typeof row.vid === 'string' && VID_RE.test(row.vid)) {
    mem.uniquesAll.add(row.vid)
    const d = dayKey(t)
    if (!mem.uniquesByDay.has(d)) mem.uniquesByDay.set(d, new Set())
    mem.uniquesByDay.get(d).add(row.vid)
  }
  if (!opts.silent) {
    mem.recent.push({
      t,
      event,
      chamberId: row.chamberId,
      source: row.source,
      nav: row.nav,
      path: row.path,
      vid: typeof row.vid === 'string' ? `${row.vid.slice(0, 8)}…` : undefined,
    })
    while (mem.recent.length > RECENT_CAP) mem.recent.shift()
  }
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} telemetryPath
 */
export async function recordTelemetryEvent(row, telemetryPath) {
  // Always update memory (fast summary even if Redis lags)
  applyRowToMemory(row)

  // JSONL audit trail when disk works
  try {
    mkdirSync(dirname(telemetryPath), { recursive: true })
    appendFileSync(telemetryPath, JSON.stringify(row) + '\n', { mode: 0o600 })
  } catch (err) {
    console.warn('[telemetry] JSONL append failed', err instanceof Error ? err.message : err)
  }

  if (!redisReady || !redis) return

  try {
    const pipe = redis.pipeline()
    pipe.incr(KEY.total)
    if (row.event === 'pageview') pipe.incr(KEY.pageviews)
    if (
      typeof row.chamberId === 'string' &&
      (row.event === 'open_chamber' || row.event === 'key_tap')
    ) {
      pipe.hincrby(KEY.doors, row.chamberId, 1)
    }
    if (typeof row.path === 'string' && row.event === 'pageview') {
      pipe.hincrby(KEY.paths, row.path, 1)
    }
    if (typeof row.vid === 'string' && VID_RE.test(row.vid)) {
      pipe.sadd(KEY.uniquesAll, row.vid)
      const d = dayKey(typeof row.t === 'number' ? row.t : Date.now())
      pipe.sadd(KEY.uniquesDay(d), row.vid)
      // expire daily unique sets after 90 days
      pipe.expire(KEY.uniquesDay(d), 90 * 86_400)
    }
    // recent list — store without full vid for privacy in summaries
    const recentRow = {
      t: row.t,
      event: row.event,
      chamberId: row.chamberId,
      source: row.source,
      nav: row.nav,
      path: row.path,
      vid: typeof row.vid === 'string' ? `${row.vid.slice(0, 8)}…` : undefined,
    }
    pipe.lpush(KEY.recent, JSON.stringify(recentRow))
    pipe.ltrim(KEY.recent, 0, RECENT_CAP - 1)
    await pipe.exec()
  } catch (err) {
    console.warn('[telemetry] Redis write failed', err instanceof Error ? err.message : err)
  }
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getTelemetrySummary() {
  const today = dayKey()

  if (redisReady && redis) {
    try {
      const [total, pageviews, doors, paths, uniquesAll, uniquesToday, recentRaw] =
        await Promise.all([
          redis.get(KEY.total),
          redis.get(KEY.pageviews),
          redis.hgetall(KEY.doors),
          redis.hgetall(KEY.paths),
          redis.scard(KEY.uniquesAll),
          redis.scard(KEY.uniquesDay(today)),
          redis.lrange(KEY.recent, 0, 39),
        ])

      const last7 = []
      for (let i = 6; i >= 0; i--) {
        const d = dayKey(Date.now() - i * 86_400_000)
        // eslint-disable-next-line no-await-in-loop
        const n = await redis.scard(KEY.uniquesDay(d))
        last7.push({ day: d, uniques: n })
      }

      const topDoors = Object.entries(doors || {})
        .map(([chamberId, count]) => ({ chamberId, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30)

      const topPaths = Object.entries(paths || {})
        .map(([path, count]) => ({ path, count: Number(count) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30)

      const recent = (recentRaw || [])
        .map((s) => {
          try {
            return JSON.parse(s)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      return {
        total: Number(total) || 0,
        pageviews: Number(pageviews) || 0,
        uniqueVisitors: uniquesAll || 0,
        uniqueVisitorsToday: uniquesToday || 0,
        uniqueDoors: topDoors.length,
        topDoors,
        topPaths,
        uniquesLast7Days: last7,
        recent,
        durable: true,
        backend: 'redis',
        note: 'Privacy-first: anonymous localStorage vid · no IP · Redis SSOT',
      }
    } catch (err) {
      console.warn('[telemetry] Redis summary failed, falling back to memory', err)
    }
  }

  // Memory fallback
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = dayKey(Date.now() - i * 86_400_000)
    last7.push({ day: d, uniques: mem.uniquesByDay.get(d)?.size || 0 })
  }
  const topDoors = [...mem.doors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([chamberId, count]) => ({ chamberId, count }))
  const topPaths = [...mem.paths.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([path, count]) => ({ path, count }))

  return {
    total: mem.total,
    pageviews: mem.pageviews,
    uniqueVisitors: mem.uniquesAll.size,
    uniqueVisitorsToday: mem.uniquesByDay.get(today)?.size || 0,
    uniqueDoors: mem.doors.size,
    topDoors,
    topPaths,
    uniquesLast7Days: last7,
    recent: mem.recent.slice(-40).reverse(),
    durable: false,
    backend: 'memory+jsonl',
    note: 'Privacy-first: anonymous vid · no IP · set REDIS_URL for durable uniques across redeploys',
  }
}

export function validateVid(raw) {
  return typeof raw === 'string' && VID_RE.test(raw.trim()) ? raw.trim() : undefined
}

export async function shutdownTelemetryStore() {
  if (!redis) return
  try {
    await redis.quit()
  } catch {
    /* ignore */
  }
  redis = null
  redisReady = false
}
