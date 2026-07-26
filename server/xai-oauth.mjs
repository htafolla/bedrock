/**
 * xAI OAuth (SuperGrok / X Premium+) — server-side access + refresh.
 *
 * Pattern ported from ~/dev/xray/scripts/node/setup-xai-oauth.mjs + Hermes auth.json.
 *
 * Env (pick one source of tokens):
 *   XAI_OAUTH_JSON   — raw JSON blob { access_token, refresh_token, expires_at, ... }
 *   XAI_OAUTH_B64    — base64 of that JSON (handy for Railway variables)
 *   XAI_API_KEY      — console API key fallback (no OAuth)
 *
 * Optional persist after refresh (survives restart):
 *   RAILWAY_TOKEN + RAILWAY_PROJECT_ID + RAILWAY_ENVIRONMENT_ID + RAILWAY_SERVICE_ID
 *   → GraphQL variableUpsert of XAI_OAUTH_B64
 *
 * Refresh proactively before expiry (default 45 min headroom).
 * Rotated refresh tokens must be persisted (RAILWAY_* or XAI_OAUTH_PATH)
 * or the next restart reloads a revoked blob.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const XAI_TOKEN_URL = 'https://auth.x.ai/oauth2/token'
/** Public PKCE client used by Hermes / Grok CLI / xray setup (not a secret). */
export const XAI_CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828'

/** Refresh this long before access token dies (covers long chat + clock skew). */
const HEADROOM_MS = 45 * 60 * 1000
/** Poll often enough that headroom always wins before expiry. */
const REFRESH_INTERVAL_MS = 30 * 1000
/** Transient HTTP retries for token endpoint. */
const REFRESH_MAX_ATTEMPTS = 3

/** @typedef {{ access_token: string, refresh_token?: string, expires_at: number, token_type?: string, scope?: string }} OAuthTokens */

/** @type {OAuthTokens | null} */
let tokens = null
/** @type {ReturnType<typeof setInterval> | null} */
let timer = null
let refreshInFlight = null

/**
 * @returns {OAuthTokens | null}
 */
export function loadOAuthTokensFromEnv() {
  const rawJson = process.env.XAI_OAUTH_JSON?.trim()
  if (rawJson) {
    try {
      return normalizeTokenBlob(JSON.parse(rawJson))
    } catch (err) {
      console.error('[xai-oauth] XAI_OAUTH_JSON parse failed:', err instanceof Error ? err.message : err)
    }
  }

  const b64 = process.env.XAI_OAUTH_B64?.trim()
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8')
      return normalizeTokenBlob(JSON.parse(decoded))
    } catch (err) {
      console.error('[xai-oauth] XAI_OAUTH_B64 parse failed:', err instanceof Error ? err.message : err)
    }
  }

  // Local hermes / grok CLI files (dev only)
  for (const p of [
    process.env.XAI_OAUTH_PATH?.trim(),
    join(homedir(), '.hermes', 'auth.json'),
    join(homedir(), '.grok', 'auth.json'),
  ].filter(Boolean)) {
    try {
      if (!p || !existsSync(p)) continue
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

/**
 * @param {unknown} data
 * @returns {OAuthTokens | null}
 */
function extractFromHermesAuth(data) {
  if (!data || typeof data !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (data)

  // Flat xray setup shape: { "xai-oauth": { access_token, refresh_token, expires_at } }
  const flat = d['xai-oauth']
  if (flat && typeof flat === 'object') {
    const n = normalizeTokenBlob(flat)
    if (n) return n
  }

  // Hermes pool
  const pool = /** @type {Record<string, unknown>} */ (d.credential_pool || {})
  const entries = pool['xai-oauth']
  if (Array.isArray(entries) && entries[0]) {
    const n = normalizeTokenBlob(entries[0])
    if (n) return n
  }

  // Hermes providers.xai-oauth.tokens
  const providers = /** @type {Record<string, unknown>} */ (d.providers || {})
  const prov = providers['xai-oauth']
  if (prov && typeof prov === 'object') {
    const tokensField = /** @type {Record<string, unknown>} */ (prov).tokens
    if (tokensField && typeof tokensField === 'object') {
      return normalizeTokenBlob(tokensField)
    }
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
  const d = /** @type {Record<string, unknown>} */ (data)
  for (const v of Object.values(d)) {
    if (!v || typeof v !== 'object') continue
    const row = /** @type {Record<string, unknown>} */ (v)
    if (typeof row.key === 'string' && typeof row.refresh_token === 'string') {
      const expiresAt = parseExpiresAt(row.expires_at)
      return {
        access_token: row.key,
        refresh_token: row.refresh_token,
        expires_at: expiresAt || Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer',
      }
    }
  }
  return null
}

/**
 * @param {unknown} blob
 * @returns {OAuthTokens | null}
 */
function normalizeTokenBlob(blob) {
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
  let expires_at = parseExpiresAt(b.expires_at)
  if (!expires_at && typeof b.expires_in === 'number') {
    expires_at = Math.floor(Date.now() / 1000) + b.expires_in
  }
  if (!expires_at) expires_at = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token: access,
    refresh_token: refresh,
    expires_at,
    token_type: typeof b.token_type === 'string' ? b.token_type : 'Bearer',
    scope: typeof b.scope === 'string' ? b.scope : undefined,
  }
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function parseExpiresAt(v) {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // seconds vs ms
    return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v)
  }
  if (typeof v === 'string' && v.trim()) {
    const ms = Date.parse(v)
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000)
  }
  return null
}

export function getCachedOAuthTokens() {
  return tokens
}

/**
 * Bearer for OpenAI-compatible client: OAuth access token or XAI_API_KEY.
 * @returns {Promise<string | null>}
 */
export async function resolveXaiBearer() {
  await ensureFreshOAuth()
  if (tokens?.access_token) return tokens.access_token
  const key = process.env.XAI_API_KEY?.trim()
  return key || null
}

export function chatAuthMode() {
  if (tokens?.access_token || process.env.XAI_OAUTH_JSON || process.env.XAI_OAUTH_B64) {
    return 'oauth'
  }
  if (process.env.XAI_API_KEY?.trim()) return 'api_key'
  // May still load from hermes file on first ensure
  return 'none'
}

/**
 * @param {{ force?: boolean }} [opts] force=true → always hit token endpoint (boot / deploy)
 * @returns {Promise<OAuthTokens | null>}
 */
export async function ensureFreshOAuth(opts = {}) {
  const force = Boolean(opts.force)
  if (!tokens) {
    tokens = loadOAuthTokensFromEnv()
  }
  if (!tokens?.access_token && !tokens?.refresh_token) return tokens

  // No refresh token: can only use access until it dies
  if (!tokens.refresh_token) {
    if (Date.now() >= tokens.expires_at * 1000) {
      console.warn('[xai-oauth] access expired and no refresh_token — re-run scripts/xai-oauth-login.mjs')
    }
    return tokens
  }

  // Boot/deploy: always mint a fresh access token from the stored refresh.
  // Not a browser reauth — silent refresh_token grant.
  if (force) {
    console.log('[xai-oauth] boot refresh — minting fresh access from refresh_token')
    return refreshOAuthTokens()
  }

  const expiresMs = tokens.expires_at * 1000
  // Steady-state: refresh when inside headroom OR already expired
  if (Date.now() < expiresMs - HEADROOM_MS) return tokens

  return refreshOAuthTokens()
}

/**
 * @returns {Promise<OAuthTokens | null>}
 */
export async function refreshOAuthTokens() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    if (!tokens) tokens = loadOAuthTokensFromEnv()
    if (!tokens?.refresh_token) {
      console.warn('[xai-oauth] no refresh_token — re-run scripts/xai-oauth-login.mjs')
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
        })
        if (!next) return tokens

        tokens = next
        persistTokensLocally(next)
        const persisted = await persistTokensToRailway(next)
        if (!persisted && !process.env.XAI_OAUTH_PATH?.trim()) {
          console.warn(
            '[xai-oauth] refreshed in-memory only — set RAILWAY_TOKEN (+ project/env/service ids) or XAI_OAUTH_PATH so rotated refresh survives restart',
          )
        }
        console.log(
          '[xai-oauth] refreshed · expires',
          new Date(next.expires_at * 1000).toISOString(),
          persisted ? '· persisted to Railway' : '',
        )
        return tokens
      }

      // Revoked / invalid grant — do not retry; need interactive login
      if (res.status === 400 || res.status === 401) {
        console.error('[xai-oauth] refresh failed', res.status, lastText.slice(0, 200))
        console.error('[xai-oauth] re-run: node scripts/xai-oauth-login.mjs && railway up (or restart)')
        tokens = tokens
          ? { ...tokens, refresh_token: undefined, expires_at: Math.floor(Date.now() / 1000) - 1 }
          : null
        return tokens
      }

      // 5xx / network-ish — backoff and retry
      console.warn(
        `[xai-oauth] refresh attempt ${attempt}/${REFRESH_MAX_ATTEMPTS} failed`,
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
 * @param {OAuthTokens} next
 */
function persistTokensLocally(next) {
  const json = JSON.stringify(next)
  process.env.XAI_OAUTH_JSON = json
  process.env.XAI_OAUTH_B64 = Buffer.from(json, 'utf8').toString('base64')

  // Optional durable path (e.g. Railway volume mount)
  const path = process.env.XAI_OAUTH_PATH?.trim()
  if (path) {
    try {
      writeFileSync(path, JSON.stringify(next, null, 2), { mode: 0o600 })
    } catch (err) {
      console.warn('[xai-oauth] write path failed:', err instanceof Error ? err.message : err)
    }
  }
}

/**
 * Best-effort: upsert XAI_OAUTH_B64 on Railway so restarts keep the rotated refresh token.
 * Requires RAILWAY_TOKEN (account/project token) — not always present in the runtime.
 * @param {OAuthTokens} next
 */
/**
 * @param {OAuthTokens} next
 * @returns {Promise<boolean>}
 */
async function persistTokensToRailway(next) {
  const token = process.env.RAILWAY_TOKEN?.trim() || process.env.RAILWAY_API_TOKEN?.trim()
  const projectId = process.env.RAILWAY_PROJECT_ID?.trim()
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID?.trim()
  const serviceId = process.env.RAILWAY_SERVICE_ID?.trim()
  if (!token || !projectId || !environmentId) {
    return false
  }

  const b64 = Buffer.from(JSON.stringify(next), 'utf8').toString('base64')
  const mutation = `
    mutation variableUpsert($input: VariableUpsertInput!) {
      variableUpsert(input: $input)
    }
  `
  const input = {
    projectId,
    environmentId,
    name: 'XAI_OAUTH_B64',
    value: b64,
    ...(serviceId ? { serviceId } : {}),
  }

  try {
    const res = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: mutation, variables: { input } }),
    })
    if (!res.ok) {
      console.warn('[xai-oauth] railway upsert HTTP', res.status)
      return false
    }
    const body = await res.json()
    if (body.errors?.length) {
      console.warn('[xai-oauth] railway upsert errors', body.errors[0]?.message)
      return false
    }
    console.log('[xai-oauth] persisted XAI_OAUTH_B64 to Railway')
    return true
  } catch (err) {
    console.warn('[xai-oauth] railway upsert failed:', err instanceof Error ? err.message : err)
    return false
  }
}

export function oauthPersistConfigured() {
  const token = Boolean(process.env.RAILWAY_TOKEN?.trim() || process.env.RAILWAY_API_TOKEN?.trim())
  const ids = Boolean(
    process.env.RAILWAY_PROJECT_ID?.trim() && process.env.RAILWAY_ENVIRONMENT_ID?.trim(),
  )
  const path = Boolean(process.env.XAI_OAUTH_PATH?.trim())
  return { railwayGraphQl: token && ids, filePath: path, ok: (token && ids) || path }
}

/**
 * Start background refresh loop (call once from server boot).
 */
export function startOAuthRefreshLoop() {
  tokens = loadOAuthTokensFromEnv()
  const persist = oauthPersistConfigured()
  if (tokens?.access_token || tokens?.refresh_token) {
    const exp = tokens.expires_at
      ? new Date(tokens.expires_at * 1000).toISOString()
      : 'unknown'
    console.log(
      `[xai-oauth] loaded · expires ${exp}${tokens.refresh_token ? ' · refresh ready' : ' · no refresh_token'} · persist ${persist.ok ? 'ok' : 'NONE (set RAILWAY_TOKEN or XAI_OAUTH_PATH)'}`,
    )
  } else if (process.env.XAI_API_KEY?.trim()) {
    console.log('[xai-oauth] using XAI_API_KEY (no OAuth blob)')
  } else {
    console.log('[xai-oauth] no credentials — set XAI_OAUTH_B64 or XAI_API_KEY')
  }

  if (timer) clearInterval(timer)
  // Keep the interval referenced — auto-renew must not be GC'd / skipped on idle
  timer = setInterval(() => {
    ensureFreshOAuth().catch((err) => {
      console.error('[xai-oauth] refresh loop', err instanceof Error ? err.message : err)
    })
  }, REFRESH_INTERVAL_MS)

  // Every restart / deploy: force refresh_token grant → new access (and rotated refresh if any).
  // This is NOT browser reauth. Browser reauth only when refresh is revoked.
  ensureFreshOAuth({ force: true }).catch((err) => {
    console.error('[xai-oauth] boot refresh failed', err instanceof Error ? err.message : err)
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
      persistOk: persist.ok,
    }
  }
  const expired = !t?.access_token || Date.now() > (t.expires_at || 0) * 1000
  // Reauth only when we cannot recover via refresh (no refresh or refresh already stripped)
  const needsReauth = !t?.refresh_token && expired && !process.env.XAI_API_KEY?.trim()
  return {
    mode: t?.access_token || t?.refresh_token ? 'oauth' : process.env.XAI_API_KEY?.trim() ? 'api_key' : 'none',
    expiresAt: t?.expires_at ? new Date(t.expires_at * 1000).toISOString() : null,
    needsReauth,
    hasRefresh: Boolean(t?.refresh_token),
    accessExpired: expired,
    persistOk: persist.ok,
  }
}

/** Serialize for Railway / local save (login script). */
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
      token_type: t.token_type || 'Bearer',
      scope: t.scope,
    },
  }
  writeFileSync(path, JSON.stringify(authData, null, 2), { mode: 0o600 })
  return path
}
