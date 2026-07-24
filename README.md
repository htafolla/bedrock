# Bedrock

**A field guide to Love · Living · Enduring** — first principles, under-fire brain hacks, and short prayers for a troubled life.

Original working title: *The Hitchhiker’s Guild · Love · Living · Enduring*  
Final name: **Bedrock** (because these are first principles that remain true)

> I hold these things to be true. A lifetime to master them.  
> Though I fall, I get back up. Out of the fire a crucible emerges.

## The dichotomy

1. **Verse access** — Bible Gateway direct verse + permanent / on-chain path (∞)  
2. **Field use** — **Truth** · **Under fire** (hacks) · **Prayer** · **Connected truth** (related web)

## Hybrid experience (IA)

See [`docs/ia-hybrid.md`](docs/ia-hybrid.md).

| Mode | What you do |
|------|-------------|
| **Arrival** | Threshold + prologue → *Enter the nave* |
| **Constellation** | Spine strip + 3D path of first principles |
| **Chamber** | Field manual (Truth / Under fire / Prayer / Scripture) |

Spine order SSOT: `src/lib/spine.ts`

## Run

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Product SSOT

| Doc | Role |
|-----|------|
| [`docs/context.md`](docs/context.md) | Full product context (what / why / tone / structure) |
| [`docs/tech-spec-v0.1.md`](docs/tech-spec-v0.1.md) | 3D + permanence tech spec |
| [`docs/architecture.md`](docs/architecture.md) | App architecture |
| [`src/content/bedrock.json`](src/content/bedrock.json) | Content source of truth (34 chambers) |

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
