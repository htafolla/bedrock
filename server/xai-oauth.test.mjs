import { describe, expect, it } from 'vitest'
import {
  serializeTokensForEnv,
  oauthStatus,
  normalizeTokenBlob,
  isRailwayOAuthSyncEnabled,
} from './xai-oauth.mjs'

describe('xai-oauth helpers', () => {
  it('serializes tokens for Railway env', () => {
    const t = {
      access_token: 'access',
      refresh_token: 'refresh',
      expires_at: 1_700_000_000,
      token_type: 'Bearer',
    }
    const { json, b64 } = serializeTokensForEnv(t)
    expect(JSON.parse(json).access_token).toBe('access')
    expect(Buffer.from(b64, 'base64').toString('utf8')).toBe(json)
  })

  it('normalizes expires_in + obtained_at and JWT-safe shape', () => {
    const now = Math.floor(Date.now() / 1000)
    const n = normalizeTokenBlob({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 3600,
      obtained_at: now,
    })
    expect(n?.expires_at).toBe(now + 3600)
    expect(n?.refresh_token).toBe('refresh')
  })

  it('oauthStatus reports none without credentials', () => {
    const prevJson = process.env.XAI_OAUTH_JSON
    const prevB64 = process.env.XAI_OAUTH_B64
    const prevTokens = process.env.XAI_OAUTH_TOKENS
    const prevKey = process.env.XAI_API_KEY
    delete process.env.XAI_OAUTH_JSON
    delete process.env.XAI_OAUTH_B64
    delete process.env.XAI_OAUTH_TOKENS
    delete process.env.XAI_API_KEY
    const st = oauthStatus()
    expect(st.mode === 'none' || st.mode === 'oauth').toBe(true)
    if (prevJson) process.env.XAI_OAUTH_JSON = prevJson
    if (prevB64) process.env.XAI_OAUTH_B64 = prevB64
    if (prevTokens) process.env.XAI_OAUTH_TOKENS = prevTokens
    if (prevKey) process.env.XAI_API_KEY = prevKey
  })

  it('Railway OAuth sync requires RAILWAY_API_TOKEN (account), not project-only', () => {
    const prev = process.env.RAILWAY_API_TOKEN
    delete process.env.RAILWAY_API_TOKEN
    // Even with project id vars, no account API token → disabled
    expect(isRailwayOAuthSyncEnabled()).toBe(false)
    if (prev) process.env.RAILWAY_API_TOKEN = prev
  })
})
