#!/usr/bin/env node
/**
 * One-time local xAI OAuth (PKCE) → save tokens → push XAI_OAUTH_B64 to Railway.
 *
 * Pattern from ~/dev/xray/scripts/node/setup-xai-oauth.mjs
 *
 * Usage (from repo root, with railway linked to bedrock):
 *   node scripts/xai-oauth-login.mjs
 *   node scripts/xai-oauth-login.mjs --no-railway   # local ~/.hermes/auth.json only
 *
 * Then restart the Railway service (or railway up) so the runtime loads XAI_OAUTH_B64.
 * The server auto-refreshes access tokens; if RAILWAY_TOKEN is set on the service,
 * refreshed blobs are written back to Railway variables.
 */

import { randomBytes, createHash } from 'node:crypto'
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs'
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
} from '../server/xai-oauth.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 56121
const XAI_AUTH_URL = 'https://auth.x.ai/oauth2/authorize'
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`
const VERIFIER_PATH = join(tmpdir(), 'bedrock-xai-oauth-verifier.txt')
const noRailway = process.argv.includes('--no-railway')

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
  console.log('  Bedrock · xAI OAuth (SuperGrok)')
  console.log('========================================')
  console.log('\nOpen this URL in your browser:\n')
  console.log(`   ${XAI_AUTH_URL}?${params}\n`)
  console.log('Authorize → callback saves tokens → Railway env updated.')
  console.log('Close the tab when it says ✅ Authorized.\n')
}

function wrapHtml(body) {
  return `<html><head><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#0c0a09;color:#f0e6d6;text-align:center;padding:2rem}h1{color:#e8a050}</style></head><body>${body}</body></html>`
}

function startServer(verifier) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
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
        setTimeout(() => {
          server.close()
          resolve(code)
        }, 100)
        return
      }
      if (url.pathname === '/callback') {
        res.writeHead(400)
        res.end('Missing code')
        return
      }
      res.writeHead(404)
      res.end('Not found')
    })

    server.listen(PORT, '127.0.0.1', () => {
      writeFileSync(VERIFIER_PATH, verifier, 'utf8')
    })
    server.on('error', (err) => {
      if (/** @type {NodeJS.ErrnoException} */ (err).code === 'EADDRINUSE') {
        console.error(`Port ${PORT} in use — close other OAuth helpers and retry.`)
      }
      reject(err)
    })
  })
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
    client_id: XAI_CLIENT_ID,
  })
  const response = await fetch(XAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${await response.text()}`)
  }
  return response.json()
}

function toStoredTokens(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 86400),
    token_type: data.token_type || 'Bearer',
    scope: data.scope || 'openid profile email offline_access grok-cli:access api:access',
  }
}

function pushToRailway(b64) {
  console.log('Setting Railway variable XAI_OAUTH_B64 …')
  // railway variables set KEY=value (v4)
  let r = spawnSync('railway', ['variables', '--set', `XAI_OAUTH_B64=${b64}`], {
    encoding: 'utf8',
    cwd: join(__dirname, '..'),
  })
  if (r.status !== 0) {
    r = spawnSync('railway', ['variables', 'set', `XAI_OAUTH_B64=${b64}`], {
      encoding: 'utf8',
      cwd: join(__dirname, '..'),
    })
  }
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'railway variables set failed')
    console.error('\nSet manually:')
    console.error('  railway variables --set XAI_OAUTH_B64=<paste b64 from stdout>')
    process.stdout.write(`\nXAI_OAUTH_B64=${b64}\n`)
    return false
  }
  console.log('✅ XAI_OAUTH_B64 set on Railway project')
  console.log('   Restart the service (or railway up) so the process loads it.')
  return true
}

async function main() {
  const existingCode = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null
  let verifier
  if (existingCode) {
    if (!existsSync(VERIFIER_PATH)) {
      console.error('No saved verifier — run without code first')
      process.exit(1)
    }
    verifier = readFileSync(VERIFIER_PATH, 'utf8').trim()
  } else {
    verifier = generateVerifier()
    printUrl(verifier)
  }

  try {
    const code = existingCode || (await startServer(verifier))
    console.log('Exchanging code…')
    const data = await exchangeCode(code, verifier)
    const stored = toStoredTokens(data)
    const path = writeHermesAuthFile(stored)
    console.log(`✅ Saved local ${path}`)
    console.log(`   Expires ${new Date(stored.expires_at * 1000).toISOString()}`)

    const { b64 } = serializeTokensForEnv(stored)
    if (!noRailway) {
      pushToRailway(b64)
    } else {
      process.stdout.write(`\nXAI_OAUTH_B64=${b64}\n`)
    }
  } catch (err) {
    console.error('❌', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
