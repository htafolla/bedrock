import { describe, expect, it } from 'vitest'
import { serializeTokensForEnv, oauthStatus } from './xai-oauth.mjs'

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

  it('oauthStatus reports none without credentials', () => {
    const prevJson = process.env.XAI_OAUTH_JSON
    const prevB64 = process.env.XAI_OAUTH_B64
    const prevKey = process.env.XAI_API_KEY
    delete process.env.XAI_OAUTH_JSON
    delete process.env.XAI_OAUTH_B64
    delete process.env.XAI_API_KEY
    const st = oauthStatus()
    expect(st.mode === 'none' || st.mode === 'oauth').toBe(true)
    if (prevJson) process.env.XAI_OAUTH_JSON = prevJson
    if (prevB64) process.env.XAI_OAUTH_B64 = prevB64
    if (prevKey) process.env.XAI_API_KEY = prevKey
  })
})
