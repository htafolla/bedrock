/**
 * Durable privacy-first traffic store (Postalocity-style Redis SSOT).
 *
 * When REDIS_URL is set:
 *   - counters + unique visitor sets live in Redis (survive redeploys)
 *   - recent events as a capped list
 *   - JSONL still appended as audit log when disk is writable
 *   - server access hits by class (ai/social/search/human) — bots never run JS
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
  // Server access (middleware) — separate from client pageviews
  accessTotal: 'bedrock:telemetry:access:total',
  accessClass: 'bedrock:telemetry:access:class', // hash class -> count
  accessKind: 'bedrock:telemetry:access:kind', // hash kind -> count
  accessPaths: 'bedrock:telemetry:access:paths', // hash path -> count
  accessBots: 'bedrock:telemetry:access:bots', // hash bot name -> count
  accessDay: (d) => `bedrock:telemetry:access:day:${d}`, // hash class -> count that day
  accessRecent: 'bedrock:telemetry:access:recent',
}

const RECENT_CAP = 400
const ACCESS_RECENT_CAP = 80
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
  accessTotal: 0,
  /** @type {Map<string, number>} */
  accessClass: new Map(),
  /** @type {Map<string, number>} */
  accessKind: new Map(),
  /** @type {Map<string, number>} */
  accessPaths: new Map(),
  /** @type {Map<string, number>} */
  accessBots: new Map(),
  /** @type {Map<string, Map<string, number>>} day -> class -> count */
  accessByDay: new Map(),
  accessRecent: /** @type {Array<Record<string, unknown>>} */ ([]),
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
function bumpMap(map, key, n = 1) {
  if (!key) return
  map.set(key, (map.get(key) || 0) + n)
}

function applyRowToMemory(row, opts = {}) {
  const event = String(row.event || '')
  const t = typeof row.t === 'number' ? row.t : Date.now()

  // Server access hits — separate counters (do not inflate client pageviews)
  if (event === 'access') {
    mem.accessTotal += 1
    if (typeof row.class === 'string') bumpMap(mem.accessClass, row.class)
    if (typeof row.kind === 'string') bumpMap(mem.accessKind, row.kind)
    if (typeof row.path === 'string') bumpMap(mem.accessPaths, row.path)
    if (typeof row.bot === 'string' && row.bot) bumpMap(mem.accessBots, row.bot)
    const d = dayKey(t)
    if (!mem.accessByDay.has(d)) mem.accessByDay.set(d, new Map())
    if (typeof row.class === 'string') bumpMap(mem.accessByDay.get(d), row.class)
    if (!opts.silent) {
      mem.accessRecent.push({
        t,
        event: 'access',
        class: row.class,
        kind: row.kind,
        path: row.path,
        bot: row.bot,
        status: row.status,
        resourceId: row.resourceId,
      })
      while (mem.accessRecent.length > ACCESS_RECENT_CAP) mem.accessRecent.shift()
    }
    return
  }

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
    const event = String(row.event || '')

    if (event === 'access') {
      pipe.incr(KEY.accessTotal)
      if (typeof row.class === 'string') pipe.hincrby(KEY.accessClass, row.class, 1)
      if (typeof row.kind === 'string') pipe.hincrby(KEY.accessKind, row.kind, 1)
      if (typeof row.path === 'string') pipe.hincrby(KEY.accessPaths, String(row.path).slice(0, 200), 1)
      if (typeof row.bot === 'string' && row.bot) pipe.hincrby(KEY.accessBots, row.bot, 1)
      const d = dayKey(typeof row.t === 'number' ? row.t : Date.now())
      if (typeof row.class === 'string') {
        pipe.hincrby(KEY.accessDay(d), row.class, 1)
        pipe.expire(KEY.accessDay(d), 90 * 86_400)
      }
      const accessRecent = {
        t: row.t,
        event: 'access',
        class: row.class,
        kind: row.kind,
        path: row.path,
        bot: row.bot,
        status: row.status,
        resourceId: row.resourceId,
      }
      pipe.lpush(KEY.accessRecent, JSON.stringify(accessRecent))
      pipe.ltrim(KEY.accessRecent, 0, ACCESS_RECENT_CAP - 1)
      await pipe.exec()
      return
    }

    pipe.incr(KEY.total)
    if (event === 'pageview') pipe.incr(KEY.pageviews)
    if (
      typeof row.chamberId === 'string' &&
      (event === 'open_chamber' || event === 'key_tap')
    ) {
      pipe.hincrby(KEY.doors, row.chamberId, 1)
    }
    if (typeof row.path === 'string' && event === 'pageview') {
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
 * Server-side hit (middleware). No IP, no cookies — UA class + path only.
 * @param {{
 *   path: string,
 *   class: string,
 *   kind: string,
 *   bot?: string | null,
 *   status?: number,
 *   resourceId?: string,
 *   referrer?: string,
 * }} hit
 * @param {string} telemetryPath
 */
export async function recordAccessHit(hit, telemetryPath) {
  const row = {
    t: Date.now(),
    event: 'access',
    path: String(hit.path || '').slice(0, 200),
    class: String(hit.class || 'other').slice(0, 20),
    kind: String(hit.kind || 'other').slice(0, 30),
    bot: hit.bot ? String(hit.bot).slice(0, 40) : undefined,
    status: typeof hit.status === 'number' ? hit.status : undefined,
    resourceId: hit.resourceId ? String(hit.resourceId).slice(0, 80) : undefined,
    referrer: hit.referrer ? String(hit.referrer).slice(0, 200) : undefined,
  }
  await recordTelemetryEvent(row, telemetryPath)
}

function mapToTop(mapOrObj, limit = 20) {
  const entries =
    mapOrObj instanceof Map
      ? [...mapOrObj.entries()]
      : Object.entries(mapOrObj || {})
  return entries
    .map(([k, v]) => ({ key: k, count: Number(v) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function accessBlockFromMaps() {
  const byClass = Object.fromEntries(mem.accessClass)
  const byKind = Object.fromEntries(mem.accessKind)
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = dayKey(Date.now() - i * 86_400_000)
    const dayMap = mem.accessByDay.get(d) || new Map()
    const classes = Object.fromEntries(dayMap)
    const hits = [...dayMap.values()].reduce((a, b) => a + b, 0)
    last7.push({ day: d, hits, ...classes })
  }
  return {
    total: mem.accessTotal,
    byClass,
    byKind,
    topPaths: mapToTop(mem.accessPaths, 25).map(({ key, count }) => ({ path: key, count })),
    topBots: mapToTop(mem.accessBots, 20).map(({ key, count }) => ({ bot: key, count })),
    last7Days: last7,
    recent: mem.accessRecent.slice(-40).reverse(),
  }
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getTelemetrySummary() {
  const today = dayKey()

  if (redisReady && redis) {
    try {
      const [
        total,
        pageviews,
        doors,
        paths,
        uniquesAll,
        uniquesToday,
        recentRaw,
        accessTotal,
        accessClass,
        accessKind,
        accessPaths,
        accessBots,
        accessRecentRaw,
      ] = await Promise.all([
        redis.get(KEY.total),
        redis.get(KEY.pageviews),
        redis.hgetall(KEY.doors),
        redis.hgetall(KEY.paths),
        redis.scard(KEY.uniquesAll),
        redis.scard(KEY.uniquesDay(today)),
        redis.lrange(KEY.recent, 0, 39),
        redis.get(KEY.accessTotal),
        redis.hgetall(KEY.accessClass),
        redis.hgetall(KEY.accessKind),
        redis.hgetall(KEY.accessPaths),
        redis.hgetall(KEY.accessBots),
        redis.lrange(KEY.accessRecent, 0, 39),
      ])

      const last7 = []
      const accessLast7 = []
      for (let i = 6; i >= 0; i--) {
        const d = dayKey(Date.now() - i * 86_400_000)
        // eslint-disable-next-line no-await-in-loop
        const n = await redis.scard(KEY.uniquesDay(d))
        last7.push({ day: d, uniques: n })
        // eslint-disable-next-line no-await-in-loop
        const dayClasses = (await redis.hgetall(KEY.accessDay(d))) || {}
        const hits = Object.values(dayClasses).reduce((a, b) => a + (Number(b) || 0), 0)
        const row = { day: d, hits }
        for (const [k, v] of Object.entries(dayClasses)) row[k] = Number(v) || 0
        accessLast7.push(row)
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

      const accessRecent = (accessRecentRaw || [])
        .map((s) => {
          try {
            return JSON.parse(s)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      const byClass = {}
      for (const [k, v] of Object.entries(accessClass || {})) byClass[k] = Number(v) || 0
      const byKind = {}
      for (const [k, v] of Object.entries(accessKind || {})) byKind[k] = Number(v) || 0

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
        access: {
          total: Number(accessTotal) || 0,
          byClass,
          byKind,
          topPaths: Object.entries(accessPaths || {})
            .map(([path, count]) => ({ path, count: Number(count) || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 25),
          topBots: Object.entries(accessBots || {})
            .map(([bot, count]) => ({ bot, count: Number(count) || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20),
          last7Days: accessLast7,
          recent: accessRecent,
        },
        durable: true,
        backend: 'redis',
        note: 'Privacy-first: client pageviews (vid) + server access (UA class) · no IP · Redis SSOT',
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
    access: accessBlockFromMaps(),
    durable: false,
    backend: 'memory+jsonl',
    note: 'Privacy-first: client pageviews + server access · set REDIS_URL for durable counters',
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
