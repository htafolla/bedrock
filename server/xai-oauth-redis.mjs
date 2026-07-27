/**
 * Redis SSOT for xAI OAuth tokens (Postalocity MCP pattern).
 * Survives Railway redeploys when REDIS_URL is set (Railway Redis plugin).
 * Graceful no-op when Redis is unavailable.
 */

/** @type {import('ioredis').default | null} */
let redis = null
let available = false

export const XAI_OAUTH_REDIS_KEY = 'bedrock:xai-oauth-tokens'

/**
 * @returns {Promise<void>}
 */
export async function initOAuthRedis() {
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    console.log('[xai-oauth] REDIS_URL unset — Redis token SSOT disabled (file/env fallback)')
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
    available = true
    console.log('[xai-oauth] Redis connected — OAuth token SSOT ready')
  } catch (err) {
    available = false
    redis = null
    console.warn(
      '[xai-oauth] Redis unavailable — using file/env only:',
      err instanceof Error ? err.message : err,
    )
  }
}

export function isOAuthRedisAvailable() {
  return available && redis != null
}

/**
 * @returns {Promise<string | null>}
 */
export async function readOAuthTokensFromRedis() {
  if (!isOAuthRedisAvailable() || !redis) return null
  try {
    return await redis.get(XAI_OAUTH_REDIS_KEY)
  } catch (err) {
    console.warn('[xai-oauth] Redis read failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * @param {string} tokenJson
 * @returns {Promise<boolean>}
 */
export async function writeOAuthTokensToRedis(tokenJson) {
  if (!isOAuthRedisAvailable() || !redis) return false
  try {
    await redis.set(XAI_OAUTH_REDIS_KEY, tokenJson)
    console.log('[xai-oauth] tokens persisted to Redis')
    return true
  } catch (err) {
    console.warn('[xai-oauth] Redis write failed:', err instanceof Error ? err.message : err)
    return false
  }
}

export async function shutdownOAuthRedis() {
  if (!redis) return
  try {
    await redis.quit()
  } catch {
    /* ignore */
  }
  redis = null
  available = false
}
