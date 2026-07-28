/**
 * xAI OAuth (SuperGrok / X Premium+) — server-side access + refresh.
 *
 * Pattern: Postalocity MCP `src/lib/xai-oauth.ts` + `railway-oauth-sync.ts` +
 * `xai-oauth-redis.ts` (device-code on the running service, not localhost PKCE).
 *
 * Auth flow that works in production (verbatim Postalocity):
 *   POST /oauth/initiate → device code → user opens verification_uri_complete
 *   Production process polls token URL → saveTokens → Redis + Railway env (skipDeploys)
 *
 * Load order (SSOT-aware):
 *   1. Redis (REDIS_URL) — survives redeploys
 *   2. File  (XAI_OAUTH_PATH or data/xai-oauth-tokens.json)
 *   3. Env   XAI_OAUTH_TOKENS | XAI_OAUTH_JSON | XAI_OAUTH_B64
 *   4. Local Hermes/Grok auth files (dev)
 *
 * After every successful refresh / device-code approval:
 *   memory + env · file · Redis · optional Railway env mirror (RAILWAY_API_TOKEN + skipDeploys)
 *
 * NOTE: Railway *project* tokens (RAILWAY_TOKEN) often 403 on variableUpsert.
 * Use an *account/workspace* token as RAILWAY_API_TOKEN for env backup.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  initOAuthRedis,
  isOAuthRedisAvailable,
  readOAuthTokensFromRedis,
  writeOAuthTokensToRedis,
  deleteOAuthTokensFromRedis,
} from './xai-oauth-redis.mjs'

const XAI_AUTH_SERVER = 'https://auth.x.ai'
export const XAI_TOKEN_URL = `${XAI_AUTH_SERVER}/oauth2/token`
export const XAI_DEVICE_CODE_URL = `${XAI_AUTH_SERVER}/oauth2/device/code`
/** Public PKCE / device-code client (Hermes · Grok CLI · Postalocity MCP). */
export const XAI_CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828'
export const XAI_OAUTH_SCOPES = 'openid profile email offline_access grok-cli:access api:access'
export const XAI_OAUTH_RAILWAY_ENV_VAR = 'XAI_OAUTH_TOKENS'

/** Proactive refresh window (Postalocity default 5 min). */
const HEADROOM_MS = Number(
  process.env.XAI_OAUTH_REFRESH_BUFFER_MS ||
    (Number(process.env.XAI_OAUTH_REFRESH_BUFFER_SECS || 300) * 1000),
)
const REFRESH_BUFFER_SECS = Math.floor(HEADROOM_MS / 1000)
const REFRESH_INTERVAL_MS = Number(process.env.XAI_OAUTH_REFRESH_INTERVAL_MS || 60 * 1000)
const REFRESH_MAX_ATTEMPTS = 3
const RAILWAY_GRAPHQL = 'https://backboard.railway.com/graphql/v2'
const RAILWAY_DEBOUNCE_MS = 3_000
const DEVICE_CODE_PARAMS = {
  plan: 'generic',
  referrer: process.env.XAI_OAUTH_REFERRER?.trim() || 'bedrock',
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_TOKEN_FILE = join(__dirname, '..', 'data', 'xai-oauth-tokens.json')

/**
 * @typedef {{
 *   access_token: string,
 *   refresh_token?: string,
 *   expires_at: number,
 *   token_type?: string,
 *   scope?: string,
 *   obtained_at?: number,
 *   expires_in?: number,
 * }} OAuthTokens
 */

/** @type {OAuthTokens | null} */
let tokens = null
/** @type {ReturnType<typeof setInterval> | null} */
let timer = null
/** @type {Promise<OAuthTokens | null> | null} */
let refreshInFlight = null
let refreshQuarantined = false
/** @type {ReturnType<typeof setTimeout> | null} */
let railwayDebounce = null
let lastRailwaySyncJson = null
/** @type {DeviceCodeInfo | null} */
let pendingDeviceCode = null

// ── JWT / normalize ──────────────────────────────────────────────────────────

function decodeJwtExp(accessToken) {
  try {
    const part = accessToken.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null
  } catch {
    return null
  }
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function parseExpiresAt(v) {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v)
  }
  if (typeof v === 'string' && v.trim()) {
    const ms = Date.parse(v)
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000)
  }
  return null
}

/**
 * @param {unknown} blob
 * @returns {OAuthTokens | null}
 */
export function normalizeTokenBlob(blob) {
  if (!blob || typeof blob !== 'object') return null
  const b = /** @type {Record<string, unknown>} */ (blob)
  const access =
    typeof b.access_token === 'string'
      ? b.access_token
      : typeof b.key === 'string'
        ? b.key
        : null
  if (!access) return null
  const refresh = typeof b.refresh_token === 'string' ? b.refresh_token : undefined

  let expires_in =
    typeof b.expires_in === 'number' && b.expires_in > 0 ? Math.floor(b.expires_in) : undefined
  let obtained_at =
    typeof b.obtained_at === 'number' && b.obtained_at > 0 ? Math.floor(b.obtained_at) : undefined
  let expires_at = parseExpiresAt(b.expires_at)

  if (!expires_at && expires_in && obtained_at) {
    expires_at = obtained_at + expires_in
  }
  if (!expires_at && expires_in) {
    expires_at = Math.floor(Date.now() / 1000) + expires_in
    obtained_at = Math.floor(Date.now() / 1000)
  }
  if (!expires_at) {
    const jwtExp = decodeJwtExp(access)
    expires_at = jwtExp || Math.floor(Date.now() / 1000) + 3600
  }
  if (!obtained_at) {
    const jwtExp = decodeJwtExp(access)
    obtained_at = jwtExp && expires_in ? jwtExp - expires_in : Math.floor(Date.now() / 1000)
  }
  if (!expires_in) {
    expires_in = Math.max(60, expires_at - obtained_at)
  }

  // Prefer earlier of computed expiry vs JWT exp
  const jwtExp = decodeJwtExp(access)
  if (jwtExp && jwtExp < expires_at) expires_at = jwtExp

  return {
    access_token: access,
    refresh_token: refresh,
    expires_at,
    obtained_at,
    expires_in,
    token_type: typeof b.token_type === 'string' ? b.token_type : 'Bearer',
    scope: typeof b.scope === 'string' ? b.scope : undefined,
  }
}

function isAccessExpired(t, headroomMs = HEADROOM_MS) {
  if (!t?.expires_at) return true
  return Date.now() >= t.expires_at * 1000 - headroomMs
}

// ── Load sources ─────────────────────────────────────────────────────────────

function tokenFilePath() {
  return process.env.XAI_OAUTH_PATH?.trim() || DEFAULT_TOKEN_FILE
}

/**
 * @param {unknown} data
 * @returns {OAuthTokens | null}
 */
function extractFromHermesAuth(data) {
  if (!data || typeof data !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (data)
  const flat = d['xai-oauth']
  if (flat && typeof flat === 'object') {
    const n = normalizeTokenBlob(flat)
    if (n) return n
  }
  const pool = /** @type {Record<string, unknown>} */ (d.credential_pool || {})
  const entries = pool['xai-oauth']
  if (Array.isArray(entries) && entries[0]) {
    const n = normalizeTokenBlob(entries[0])
    if (n) return n
  }
  const providers = /** @type {Record<string, unknown>} */ (d.providers || {})
  const prov = providers['xai-oauth']
  if (prov && typeof prov === 'object') {
    const tokensField = /** @type {Record<string, unknown>} */ (prov).tokens
    if (tokensField && typeof tokensField === 'object') return normalizeTokenBlob(tokensField)
    return normalizeTokenBlob(prov)
  }
  return null
}

/**
 * @param {unknown} data
 * @returns {OAuthTokens | null}
 */
function extractFromGrokAuth(data) {
  if (!data || typeof data !== 'object') return null
  for (const v of Object.values(/** @type {Record<string, unknown>} */ (data))) {
    if (!v || typeof v !== 'object') continue
    const row = /** @type {Record<string, unknown>} */ (v)
    if (typeof row.key === 'string' && typeof row.refresh_token === 'string') {
      return normalizeTokenBlob({
        access_token: row.key,
        refresh_token: row.refresh_token,
        expires_at: row.expires_at,
      })
    }
  }
  return null
}

function loadFromEnvOnly() {
  for (const key of ['XAI_OAUTH_TOKENS', 'XAI_OAUTH_JSON']) {
    const raw = process.env[key]?.trim()
    if (!raw) continue
    try {
      const n = normalizeTokenBlob(JSON.parse(raw))
      if (n) return n
    } catch {
      console.error(`[xai-oauth] ${key} parse failed`)
    }
  }
  const b64 = process.env.XAI_OAUTH_B64?.trim()
  if (b64) {
    try {
      return normalizeTokenBlob(JSON.parse(Buffer.from(b64, 'base64').toString('utf8')))
    } catch {
      console.error('[xai-oauth] XAI_OAUTH_B64 parse failed')
    }
  }
  return null
}

function loadFromFile() {
  const p = tokenFilePath()
  try {
    if (!existsSync(p)) return null
    return normalizeTokenBlob(JSON.parse(readFileSync(p, 'utf8')))
  } catch {
    return null
  }
}

function loadFromLocalAuthFiles() {
  for (const p of [
    join(homedir(), '.hermes', 'auth.json'),
    join(homedir(), '.grok', 'auth.json'),
  ]) {
    try {
      if (!existsSync(p)) continue
      const data = JSON.parse(readFileSync(p, 'utf8'))
      const fromHermes = extractFromHermesAuth(data)
      if (fromHermes) return fromHermes
      const fromGrok = extractFromGrokAuth(data)
      if (fromGrok) return fromGrok
    } catch {
      /* ignore */
    }
  }
  return null
}

/** Sync load (env + file + hermes) — Redis is async hydrate. */
export function loadOAuthTokensFromEnv() {
  return loadFromEnvOnly() || loadFromFile() || loadFromLocalAuthFiles()
}

// ── Persist ──────────────────────────────────────────────────────────────────

/**
 * @param {OAuthTokens} next
 */
function persistTokensLocally(next) {
  const json = JSON.stringify(next)
  process.env.XAI_OAUTH_JSON = json
  process.env.XAI_OAUTH_TOKENS = json
  process.env.XAI_OAUTH_B64 = Buffer.from(json, 'utf8').toString('base64')

  const p = tokenFilePath()
  try {
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify(next, null, 2), { mode: 0o600 })
  } catch (err) {
    console.warn('[xai-oauth] file write failed:', err instanceof Error ? err.message : err)
  }
}

/**
 * Account/workspace token only — project RAILWAY_TOKEN often 403 on variableUpsert.
 * @returns {boolean}
 */
export function isRailwayOAuthSyncEnabled() {
  if (process.env.XAI_OAUTH_RAILWAY_SYNC === 'false') return false
  const apiToken = process.env.RAILWAY_API_TOKEN?.trim()
  return Boolean(
    apiToken &&
      process.env.RAILWAY_PROJECT_ID?.trim() &&
      process.env.RAILWAY_ENVIRONMENT_ID?.trim() &&
      process.env.RAILWAY_SERVICE_ID?.trim(),
  )
}

/**
 * @param {OAuthTokens} next
 * @returns {Promise<boolean>}
 */
async function persistTokensToRailway(next) {
  if (!isRailwayOAuthSyncEnabled()) return false

  const apiToken = process.env.RAILWAY_API_TOKEN.trim()
  const projectId = process.env.RAILWAY_PROJECT_ID.trim()
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID.trim()
  const serviceId = process.env.RAILWAY_SERVICE_ID.trim()

  // Postalocity: single env var XAI_OAUTH_TOKENS (JSON). Keep B64 for older scripts.
  const json = JSON.stringify({
    access_token: next.access_token,
    refresh_token: next.refresh_token || '',
    token_type: next.token_type || 'Bearer',
    expires_in: next.expires_in || Math.max(60, (next.expires_at || 0) - (next.obtained_at || 0)),
    scope: next.scope || XAI_OAUTH_SCOPES,
    obtained_at: next.obtained_at || Math.floor(Date.now() / 1000),
  })
  if (json === lastRailwaySyncJson) return true

  const mutation = `mutation variableUpsert($input: VariableUpsertInput!) {
    variableUpsert(input: $input)
  }`

  async function upsert(name, value) {
    const res = await fetch(RAILWAY_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            projectId,
            environmentId,
            serviceId,
            name,
            value,
            skipDeploys: true,
          },
        },
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || body.errors?.length) {
      const msg = body.errors?.[0]?.message || `HTTP ${res.status}`
      throw new Error(msg)
    }
  }

  try {
    await upsert(XAI_OAUTH_RAILWAY_ENV_VAR, json)
    await upsert('XAI_OAUTH_B64', Buffer.from(json, 'utf8').toString('base64'))
    lastRailwaySyncJson = json
    console.log('[xai-oauth] synced to Railway env (skipDeploys) · XAI_OAUTH_TOKENS')
    return true
  } catch (err) {
    console.warn(
      '[xai-oauth] Railway sync failed (use RAILWAY_API_TOKEN account token, not project):',
      err instanceof Error ? err.message : err,
    )
    return false
  }
}

/**
 * @param {OAuthTokens} next
 */
function scheduleRailwaySync(next) {
  if (!isRailwayOAuthSyncEnabled()) return
  if (railwayDebounce) clearTimeout(railwayDebounce)
  railwayDebounce = setTimeout(() => {
    railwayDebounce = null
    void persistTokensToRailway(next)
  }, RAILWAY_DEBOUNCE_MS)
}

/**
 * @param {OAuthTokens} next
 */
async function saveTokens(next) {
  const normalized = normalizeTokenBlob(next)
  if (!normalized) return
  tokens = normalized
  refreshQuarantined = false
  persistTokensLocally(normalized)
  const json = JSON.stringify(normalized)
  const redisOk = await writeOAuthTokensToRedis(json)
  scheduleRailwaySync(normalized)
  console.log(
    '[xai-oauth] tokens saved · expires',
    new Date(normalized.expires_at * 1000).toISOString(),
    redisOk ? '· redis' : '',
    isRailwayOAuthSyncEnabled() ? '· railway-sync-scheduled' : '',
  )
}

// ── Refresh ──────────────────────────────────────────────────────────────────

/**
 * @returns {Promise<OAuthTokens | null>}
 */
export async function refreshOAuthTokens() {
  if (refreshInFlight) return refreshInFlight
  if (refreshQuarantined) {
    console.warn('[xai-oauth] refresh quarantined — re-run xai:login')
    return tokens
  }

  refreshInFlight = (async () => {
    if (!tokens) tokens = loadOAuthTokensFromEnv()
    if (!tokens?.refresh_token) {
      console.warn('[xai-oauth] no refresh_token — re-run npm run xai:login')
      return tokens
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: XAI_CLIENT_ID,
    })

    let lastStatus = 0
    let lastText = ''
    for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt++) {
      const res = await fetch(XAI_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      lastStatus = res.status
      lastText = await res.text()

      if (res.ok) {
        let data
        try {
          data = JSON.parse(lastText)
        } catch {
          console.error('[xai-oauth] refresh JSON parse failed')
          return tokens
        }
        const next = normalizeTokenBlob({
          access_token: data.access_token,
          refresh_token: data.refresh_token || tokens.refresh_token,
          expires_in: data.expires_in,
          token_type: data.token_type,
          scope: data.scope,
          obtained_at: Math.floor(Date.now() / 1000),
        })
        if (!next) return tokens
        await saveTokens(next)
        return tokens
      }

      // invalid_grant / auth fail — quarantine (Postalocity pattern)
      if (res.status === 400 || res.status === 401) {
        let errCode = ''
        try {
          errCode = JSON.parse(lastText)?.error || ''
        } catch {
          /* ignore */
        }
        console.error('[xai-oauth] refresh failed', res.status, lastText.slice(0, 200))
        if (errCode === 'invalid_grant' || res.status === 401) {
          refreshQuarantined = true
          tokens = null
          // Drop revoked blob so redeploys do not rehydrate invalid_grant (Postalocity re-auth overwrites via device-code)
          void deleteOAuthTokensFromRedis()
          console.error(
            '[xai-oauth] REAUTH REQUIRED — POST /oauth/initiate (device-code on production) or npm run xai:login -- --device',
          )
        }
        return tokens
      }

      console.warn(
        `[xai-oauth] refresh attempt ${attempt}/${REFRESH_MAX_ATTEMPTS}`,
        res.status,
        lastText.slice(0, 120),
      )
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }

    console.error('[xai-oauth] refresh failed after retries', lastStatus, lastText.slice(0, 200))
    return tokens
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

/**
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<OAuthTokens | null>}
 */
export async function ensureFreshOAuth(opts = {}) {
  const force = Boolean(opts.force)
  if (!tokens) tokens = loadOAuthTokensFromEnv()
  if (!tokens?.access_token && !tokens?.refresh_token) return tokens

  if (!tokens.refresh_token) {
    if (isAccessExpired(tokens, 0)) {
      console.warn('[xai-oauth] access expired, no refresh_token')
    }
    return tokens
  }

  if (refreshQuarantined) return tokens

  if (force || isAccessExpired(tokens)) {
    return refreshOAuthTokens()
  }
  return tokens
}

/**
 * Drop cached access so next ensureFresh forces refresh (keep refresh_token).
 */
export function invalidateCachedAccessToken() {
  if (!tokens) return
  tokens = {
    ...tokens,
    expires_at: Math.floor(Date.now() / 1000) - 1,
    obtained_at: 0,
    expires_in: 0,
  }
}

/**
 * Bearer for OpenAI-compatible client.
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<string | null>}
 */
export async function resolveXaiBearer(opts = {}) {
  await ensureFreshOAuth({ force: Boolean(opts.forceRefresh) })
  if (tokens?.access_token && !isAccessExpired(tokens, 0)) return tokens.access_token
  if (tokens?.refresh_token && !refreshQuarantined) {
    await ensureFreshOAuth({ force: true })
    if (tokens?.access_token) return tokens.access_token
  }
  const key = process.env.XAI_API_KEY?.trim()
  return key || null
}

export function getCachedOAuthTokens() {
  return tokens
}

export function chatAuthMode() {
  if (tokens?.access_token || tokens?.refresh_token || process.env.XAI_OAUTH_B64 || process.env.XAI_OAUTH_TOKENS) {
    return 'oauth'
  }
  if (process.env.XAI_API_KEY?.trim()) return 'api_key'
  return 'none'
}

export function oauthPersistConfigured() {
  const file = Boolean(tokenFilePath())
  const redis = isOAuthRedisAvailable()
  const railway = isRailwayOAuthSyncEnabled()
  return {
    redis,
    filePath: file,
    railwayGraphQl: railway,
    ok: redis || railway || existsSync(tokenFilePath()),
  }
}

/**
 * Boot: Redis → merge with env/file → scheduler (no blind force-refresh).
 */
export async function startOAuthRefreshLoop() {
  await initOAuthRedis()

  const envTokens = loadOAuthTokensFromEnv()
  tokens = envTokens

  // Prefer newer Redis over stale env (Postalocity hydrate)
  const redisRaw = await readOAuthTokensFromRedis()
  if (redisRaw) {
    try {
      const redisTokens = normalizeTokenBlob(JSON.parse(redisRaw))
      if (redisTokens?.refresh_token) {
        const redisAt = redisTokens.obtained_at || 0
        const envAt = envTokens?.obtained_at || 0
        if (!envTokens || redisAt >= envAt) {
          tokens = redisTokens
          persistTokensLocally(redisTokens)
          console.log(
            '[xai-oauth] hydrated from Redis · expires',
            new Date(redisTokens.expires_at * 1000).toISOString(),
          )
        }
      }
    } catch {
      console.warn('[xai-oauth] Redis payload invalid — ignoring')
    }
  }

  const persist = oauthPersistConfigured()
  if (tokens?.access_token || tokens?.refresh_token) {
    console.log(
      `[xai-oauth] loaded · expires ${tokens.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : '?'} · refresh ${tokens.refresh_token ? 'yes' : 'no'} · persist redis=${persist.redis} file=${existsSync(tokenFilePath())} railway=${persist.railwayGraphQl}`,
    )
  } else if (process.env.XAI_API_KEY?.trim()) {
    console.log('[xai-oauth] using XAI_API_KEY (no OAuth blob)')
  } else {
    console.log('[xai-oauth] no credentials — set XAI_OAUTH_B64 / Redis / XAI_API_KEY')
  }

  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    ensureFreshOAuth().catch((err) => {
      console.error('[xai-oauth] refresh loop', err instanceof Error ? err.message : err)
    })
  }, REFRESH_INTERVAL_MS)

  // Soft ensure — only refresh if near/past expiry (do not force-rotate healthy tokens on every deploy)
  ensureFreshOAuth().catch((err) => {
    console.error('[xai-oauth] boot ensure failed', err instanceof Error ? err.message : err)
  })
}

export function oauthStatus() {
  const t = tokens || loadOAuthTokensFromEnv()
  const persist = oauthPersistConfigured()
  if (!t?.access_token && !t?.refresh_token) {
    return {
      mode: process.env.XAI_API_KEY?.trim() ? 'api_key' : 'none',
      expiresAt: null,
      needsReauth: !process.env.XAI_API_KEY?.trim(),
      hasRefresh: false,
      accessExpired: true,
      persistOk: persist.ok,
      persist: persist,
      refreshQuarantined: refreshQuarantined,
    }
  }
  const expired = isAccessExpired(t, 0)
  const needsReauth =
    (refreshQuarantined || !t.refresh_token) && expired && !process.env.XAI_API_KEY?.trim()
  return {
    mode: 'oauth',
    expiresAt: t.expires_at ? new Date(t.expires_at * 1000).toISOString() : null,
    needsReauth,
    hasRefresh: Boolean(t.refresh_token) && !refreshQuarantined,
    accessExpired: expired,
    persistOk: persist.ok,
    persist,
    refreshQuarantined: refreshQuarantined,
    authMethod: 'oauth-refresh',
  }
}

export function serializeTokensForEnv(t) {
  const json = JSON.stringify(t)
  return {
    json,
    b64: Buffer.from(json, 'utf8').toString('base64'),
  }
}

export function writeHermesAuthFile(t) {
  const dir = join(homedir(), '.hermes')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'auth.json')
  const authData = {
    'xai-oauth': {
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at,
      obtained_at: t.obtained_at,
      expires_in: t.expires_in,
      token_type: t.token_type || 'Bearer',
      scope: t.scope,
    },
  }
  writeFileSync(path, JSON.stringify(authData, null, 2), { mode: 0o600 })
  return path
}

// ── Device-code flow (Postalocity MCP verbatim) ──────────────────────────────

/**
 * @typedef {{
 *   device_code: string,
 *   user_code: string,
 *   verification_uri: string,
 *   verification_uri_complete: string,
 *   expires_in: number,
 *   interval: number,
 * }} DeviceCodeInfo
 */

export function hasOAuthTokens() {
  const t = tokens || loadOAuthTokensFromEnv()
  return Boolean(t?.refresh_token) && !refreshQuarantined
}

/**
 * Export current tokens for Railway env (never log the value).
 * @returns {{ envVar: string, value: string, expiresAt: string | null } | null}
 */
export function exportTokensForRailway() {
  const t = tokens || loadOAuthTokensFromEnv()
  if (!t?.refresh_token || refreshQuarantined) return null
  const obtained_at = t.obtained_at || Math.floor(Date.now() / 1000)
  const expires_in =
    t.expires_in || Math.max(60, (t.expires_at || obtained_at + 3600) - obtained_at)
  const value = JSON.stringify({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    token_type: t.token_type || 'Bearer',
    expires_in,
    scope: t.scope || XAI_OAUTH_SCOPES,
    obtained_at,
  })
  return {
    envVar: XAI_OAUTH_RAILWAY_ENV_VAR,
    value,
    expiresAt: t.expires_at ? new Date(t.expires_at * 1000).toISOString() : null,
  }
}

/**
 * @returns {Promise<DeviceCodeInfo>}
 */
export async function requestDeviceCode() {
  const params = new URLSearchParams({
    client_id: XAI_CLIENT_ID,
    scope: XAI_OAUTH_SCOPES,
    ...DEVICE_CODE_PARAMS,
  })
  const res = await fetch(XAI_DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Device code request failed (${res.status}): ${text}`)
  }
  return /** @type {DeviceCodeInfo} */ (await res.json())
}

/**
 * @param {DeviceCodeInfo} deviceCode
 */
function pollDeviceCodeInBackground(deviceCode) {
  let interval = deviceCode.interval || 5
  const expiresAt = Date.now() + (deviceCode.expires_in || 900) * 1000

  const poll = async () => {
    while (Date.now() < expiresAt) {
      await new Promise((r) => setTimeout(r, interval * 1000))
      try {
        const params = new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          client_id: XAI_CLIENT_ID,
          device_code: deviceCode.device_code,
        })
        const res = await fetch(XAI_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        const data = /** @type {Record<string, unknown>} */ (await res.json())

        if (res.ok && typeof data.access_token === 'string') {
          const next = normalizeTokenBlob({
            access_token: data.access_token,
            refresh_token: String(data.refresh_token || ''),
            token_type: String(data.token_type || 'Bearer'),
            expires_in: Number(data.expires_in) || 3600,
            scope: String(data.scope || XAI_OAUTH_SCOPES),
            obtained_at: Math.floor(Date.now() / 1000),
          })
          if (next) {
            await saveTokens(next)
            console.log(
              '[xai-oauth] device-code authentication successful · expires',
              new Date(next.expires_at * 1000).toISOString(),
            )
          }
          pendingDeviceCode = null
          return
        }

        if (data.error === 'authorization_pending') continue
        if (data.error === 'slow_down') {
          interval += 5
          continue
        }
        if (data.error === 'expired_token') {
          console.warn('[xai-oauth] device code expired')
          pendingDeviceCode = null
          return
        }
        if (data.error === 'access_denied') {
          console.warn('[xai-oauth] device code access denied by user')
          pendingDeviceCode = null
          return
        }
        console.warn('[xai-oauth] device poll error', String(data.error || res.status))
        pendingDeviceCode = null
        return
      } catch (err) {
        console.warn(
          '[xai-oauth] device poll network error, retrying:',
          err instanceof Error ? err.message : err,
        )
      }
    }
    console.warn('[xai-oauth] device code timed out')
    pendingDeviceCode = null
  }

  void poll()
}

/**
 * Start device-code OAuth on this process (Postalocity pattern).
 * Production polls and writes Redis + Railway — no localhost callback.
 * @returns {Promise<DeviceCodeInfo & { polling: boolean }>}
 */
export async function startDeviceCodeFlow() {
  console.log('[xai-oauth] requesting device code')
  const deviceCode = await requestDeviceCode()
  pendingDeviceCode = deviceCode
  const verificationUrl = deviceCode.verification_uri_complete || deviceCode.verification_uri
  console.log('[xai-oauth] device-code flow started')
  console.log(`[xai-oauth] Open to authorize: ${verificationUrl}`)
  if (deviceCode.user_code) {
    console.log(`[xai-oauth] user_code: ${deviceCode.user_code}`)
  }
  pollDeviceCodeInBackground(deviceCode)
  return { ...deviceCode, polling: true }
}

export function getOAuthFlowStatus() {
  const st = oauthStatus()
  return {
    pendingApproval: pendingDeviceCode !== null,
    userCode: pendingDeviceCode?.user_code || null,
    verificationUrl:
      pendingDeviceCode?.verification_uri_complete ||
      pendingDeviceCode?.verification_uri ||
      null,
    authenticated: Boolean(tokens?.refresh_token || tokens?.access_token) && !refreshQuarantined,
    tokenValid: Boolean(tokens?.access_token) && !isAccessExpired(tokens, 0) && !refreshQuarantined,
    refreshQuarantined: st.refreshQuarantined,
    expiresAt: st.expiresAt,
    refreshBufferSecs: REFRESH_BUFFER_SECS,
  }
}
