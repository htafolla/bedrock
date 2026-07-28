#!/usr/bin/env node
/**
 * xAI OAuth login for Bedrock.
 *
 * Preferred (Postalocity MCP pattern) — device-code ON the production server:
 *   npm run xai:login -- --device
 *   BEDROCK_URL=https://bedrock.rippel.ai OAUTH_ADMIN_KEY=... npm run xai:login -- --device
 *
 * Production polls xAI, then writes Redis + Railway env (skipDeploys). No localhost callback.
 *
 * Legacy local PKCE (dev only — does not run on the Railway process):
 *   npm run xai:login
 *   npm run xai:login -- --no-railway
 */

import { randomBytes, createHash } from 'node:crypto'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import http from 'node:http'
import {
  XAI_CLIENT_ID,
  XAI_TOKEN_URL,
  serializeTokensForEnv,
  writeHermesAuthFile,
  normalizeTokenBlob,
} from '../server/xai-oauth.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 56121
const XAI_AUTH_URL = 'https://auth.x.ai/oauth2/authorize'
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`
const VERIFIER_PATH = join(tmpdir(), 'bedrock-xai-oauth-verifier.txt')
const args = new Set(process.argv.slice(2))
const noRailway = args.has('--no-railway')
const useDevice = args.has('--device') || args.has('--device-code') || process.env.XAI_OAUTH_DEVICE === '1'
const BEDROCK_URL = (process.env.BEDROCK_URL || process.env.BEDROCK_API_URL || 'https://bedrock.rippel.ai').replace(
  /\/$/,
  '',
)
const ADMIN_KEY =
  process.env.OAUTH_ADMIN_KEY?.trim() ||
  process.env.BEDROCK_ADMIN_KEY?.trim() ||
  process.env.MCP_API_KEY?.trim() ||
  ''

function generateVerifier() {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function challenge(verifier) {
  return createHash('sha256')
    .update(verifier)
    .digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function wrapHtml(body) {
  return `<html><head><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#0c0a09;color:#f0e6d6;text-align:center;padding:2rem}h1{color:#e8a050}</style></head><body>${body}</body></html>`
}

async function runDeviceCodeOnServer() {
  console.log('\n========================================')
  console.log('  Bedrock · xAI OAuth (device-code)')
  console.log('  Postalocity MCP pattern — production poll')
  console.log('========================================\n')
  console.log(`Server: ${BEDROCK_URL}`)

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (ADMIN_KEY) headers['X-API-Key'] = ADMIN_KEY

  const initRes = await fetch(`${BEDROCK_URL}/oauth/initiate`, {
    method: 'POST',
    headers,
  })
  const initBody = await initRes.json().catch(() => ({}))
  if (!initRes.ok) {
    console.error('Initiate failed:', initRes.status, initBody)
    process.exit(1)
  }

  if (initBody.message?.includes('Already authenticated')) {
    console.log('Already authenticated:', initBody.status)
    process.exit(0)
  }

  const url = initBody.verification_uri_complete || initBody.verification_uri
  console.log('\nOpen this URL in your browser (any device):\n')
  console.log(`   ${url}\n`)
  if (initBody.user_code) console.log(`User code: ${initBody.user_code}\n`)
  console.log('Production server is polling. Tokens → Redis + Railway when you approve.')
  console.log('Waiting for authentication (status poll)...\n')

  try {
    spawnSync('open', [url], { stdio: 'ignore' })
  } catch {
    /* ignore */
  }

  const deadline = Date.now() + (Number(initBody.expires_in) || 900) * 1000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000))
    const stRes = await fetch(`${BEDROCK_URL}/oauth/status`, { headers: { Accept: 'application/json' } })
    const st = await stRes.json().catch(() => ({}))
    if (st.tokenValid || (st.authenticated && st.hasRefresh !== false && !st.needsReauth)) {
      console.log('✅ Authenticated on production')
      console.log('   expiresAt:', st.expiresAt)
      console.log('   persist:', JSON.stringify(st.persist || st))
      const health = await fetch(`${BEDROCK_URL}/api/health`).then((r) => r.json()).catch(() => ({}))
      console.log('   chatConfigured:', health.chatConfigured)
      process.exit(0)
    }
    if (st.pendingApproval) {
      process.stdout.write('.')
    } else if (!st.authenticated) {
      process.stdout.write('?')
    }
  }
  console.error('\nTimed out waiting for approval. Check Railway logs for [xai-oauth] device-code.')
  process.exit(1)
}

function printUrl(verifier) {
  const codeChallenge = challenge(verifier)
  const state = randomBytes(16).toString('hex')
  const nonce = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XAI_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email offline_access grok-cli:access api:access',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
    plan: 'generic',
    referrer: 'bedrock',
  }).toString()

  console.log('\n========================================')
  console.log('  Bedrock · xAI OAuth (local PKCE — legacy)')
  console.log('========================================')
  console.log('\nPrefer production device-code: npm run xai:login -- --device\n')
  console.log('Open this URL in your browser:\n')
  console.log(`   ${XAI_AUTH_URL}?${params}\n`)
  console.log('Authorize → callback saves tokens → Railway env updated.')
  console.log('Close the tab when it says ✅ Authorized.\n')
}

function startServer(verifier) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
      if (url.pathname === '/callback' && url.searchParams.has('code')) {
        const code = url.searchParams.get('code')
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          wrapHtml(
            '<h1>✅ Authorized</h1><p>Tokens saved. Railway env updating. You can close this window.</p>',
          ),
        )
        try {
          unlinkSync(VERIFIER_PATH)
        } catch {
          /* ignore */
        }
        server.close()
        resolve(code)
        return
      }
      res.writeHead(404)
      res.end('Not found')
    })
    server.on('error', reject)
    server.listen(PORT, '127.0.0.1', () => {
      printUrl(verifier)
      try {
        spawnSync('open', [`file://${VERIFIER_PATH}`], { stdio: 'ignore' })
      } catch {
        /* ignore */
      }
    })
  })
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: XAI_CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  })
  const res = await fetch(XAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${text}`)
  return JSON.parse(text)
}

function pushRailway(stored) {
  const { b64, json } = serializeTokensForEnv(stored)
  for (const pair of [`XAI_OAUTH_TOKENS=${json}`, `XAI_OAUTH_B64=${b64}`]) {
    const r = spawnSync('railway', ['variables', '-s', 'bedrock', '--set', pair], {
      encoding: 'utf8',
      cwd: join(__dirname, '..'),
    })
    console.log(pair.split('=')[0], r.status === 0 ? 'ok' : 'fail', (r.stderr || '').slice(0, 120))
  }
}

async function runLocalPkce() {
  const verifier = generateVerifier()
  writeFileSync(VERIFIER_PATH, verifier, { mode: 0o600 })
  const code = await startServer(verifier)
  const data = await exchangeCode(code, verifier)
  const obtained_at = Math.floor(Date.now() / 1000)
  const stored = normalizeTokenBlob({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 3600,
    obtained_at,
    token_type: data.token_type || 'Bearer',
    scope: data.scope,
  })
  if (!stored) throw new Error('normalize failed')
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true })
  writeFileSync(join(__dirname, '..', 'data', 'xai-oauth-tokens.json'), JSON.stringify(stored, null, 2), {
    mode: 0o600,
  })
  writeHermesAuthFile(stored)
  console.log('Saved local · expires', new Date(stored.expires_at * 1000).toISOString())
  if (!noRailway) {
    pushRailway(stored)
    console.log('OAuth vars set on Railway. Redeploy so process loads env (or use --device next time).')
  }
}

if (useDevice) {
  runDeviceCodeOnServer().catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else {
  runLocalPkce().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
