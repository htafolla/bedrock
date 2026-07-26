# Bedrock

**A Hitchhiker’s Guide to Love · Living · Enduring**

**Motto:** Do Better. Be Better. Trust God.

First principles, under-fire brain hacks, and short prayers for a troubled life.

> I hold these things to be true. A lifetime to master them.  
> Though I fall, I get back up. Out of the fire a crucible emerges.

## The dichotomy

1. **Verse access** — Bible Gateway direct verse + permanent / on-chain path (∞)  
2. **Field use** — **Truth** · **Under fire** (hacks) · **Prayer** · **Connected truth** (related web)

## Hybrid experience (IA)

See [`docs/ia-hybrid.md`](docs/ia-hybrid.md).

| Mode | What you do |
|------|-------------|
| **Arrival** | Threshold + prologue → *Enter* |
| **Constellation** | Spine strip + 3D path of first principles |
| **Chamber** | Field manual (Truth / Under fire / Prayer / Scripture) |

Spine order SSOT: `src/lib/spine.ts`

## Run

```bash
npm install
cp .env.example .env   # set XAI_API_KEY for guide chat (server-only)
npm run dev            # Vite UI
# optional second terminal for chat API:
npm run dev:server     # Express on :3000 — Vite proxies /api
```

```bash
npm test
npm run build
npm start              # production: static dist + POST /api/chat
```

### Guide chat (SpaceXAI / xAI)

| Item | Value |
|------|--------|
| **OAuth (preferred)** | SuperGrok / X Premium+ — `npm run xai:login` → Railway `XAI_OAUTH_B64` |
| **Auto-refresh** | Server refreshes access token before expiry; optional `RAILWAY_TOKEN` persists blob |
| **API key fallback** | `XAI_API_KEY` console key (Railway Variables / `.env`) |
| API | OpenAI-compatible `https://api.x.ai/v1` via `openai` npm |
| Model | `grok-4.5` (override with `XAI_MODEL`) |
| Endpoint | `POST /api/chat` (SSE stream) · `GET /api/health` (`authMode`, `oauthExpiresAt`) |

Never put secrets in `VITE_*`. Pattern ported from `~/dev/xray/scripts/node/setup-xai-oauth.mjs` + Hermes `auth.json`.

## Product SSOT

| Doc | Role |
|-----|------|
| [`docs/FINAL_PLAN.md`](docs/FINAL_PLAN.md) | **Locked final plan** — storm set, aggressor/victim, roadmap |
| [`docs/context.md`](docs/context.md) | Full product context |
| [`docs/tech-spec-v0.1.md`](docs/tech-spec-v0.1.md) | 3D + permanence tech spec |
| [`docs/architecture.md`](docs/architecture.md) | App architecture |
| [`docs/ux-ui.md`](docs/ux-ui.md) | UX / 3D interaction |
| [`src/content/bedrock.json`](src/content/bedrock.json) | Content SSOT (39 chambers) |

## Locked decisions

| Item | Choice |
|------|--------|
| Name | **Bedrock** |
| Tone | Steel over sentiment; restraint over spectacle |
| Testimony | Sealed optional |
| Verse primary | Bible Gateway direct verse (NIV default) |
| Permanence | IPFS + on-chain hash (**Sui preferred**) |

## Project map

| Path | Role |
|------|------|
| `src/content/bedrock.json` | Chambers, verses, prologue, sealed testimony |
| `src/lib/verses.ts` | Dual verse linking |
| `src/lib/permanence.ts` | IPFS + chain hash adapter stubs |
| `src/components/scene/BedrockScene.tsx` | Light R3F atmosphere (lazy-loaded) |
| `src/components/SealedTestimony.tsx` | Sealed personal testimony |
| `scripts/build-content.mjs` | Rebuild content JSON from structured source |

## Permanence (next)

1. Freeze document content  
2. Pin canonical JSON to IPFS  
3. Anchor `contentHash` on-chain (Sui preferred)  
4. Write CID + anchor tx back into document meta  
