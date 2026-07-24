# Bedrock Architecture (Phase 1)

## Locked decisions

| Item | Choice |
|------|--------|
| Product name | **Bedrock** (working title heritage: Hitchhiker’s Guild · Love · Living · Enduring) |
| Primary Bible source | Bible Gateway direct passage (`/passage/?search=…`) |
| Chain | **Sui preferred** (adapter-ready; Phase 1 hash local) |
| Testimony | Sealed optional |
| Tone | Steel over sentiment; restraint over spectacle |
| Scope | Phase 1 + light R3F shell |

## Layers

```
┌─────────────────────────────────────────────┐
│  UI: ReadingExperience + SealedTestimony    │
│  Scene: BedrockScene (R3F light shell)      │
├─────────────────────────────────────────────┤
│  Content: bedrock.json (source of truth)    │
│  Verses: parse + dual-link URLs             │
├─────────────────────────────────────────────┤
│  Permanence adapter                         │
│   ├── IPFS pin (hash of full document)      │
│   └── On-chain registry (Sui preferred)     │
└─────────────────────────────────────────────┘
```

## Content model

- `BedrockDocument` → meta + chambers[]
- `Chamber` → id, title, body blocks, verses[]
- `BodyBlock` → paragraph | heading | quote
- `ScriptureRef` → book, chapter, verse(s), display

Replace placeholder chamber bodies by pasting the full Bedrock text into `src/content/bedrock.json` (or Markdown import later).

## Progressive enhancement

- Desktop / high capability: full light 3D atmosphere behind reading UI
- Mobile / reduced motion / low GPU: 2D gradient + static warmth (no WebGL)

## Permanence (Phase 1 stubs)

- `src/lib/permanence.ts` — interfaces + local hash + chain adapter stub (Sui preferred)
- Real Pinata/web3.storage + contract deploy after content freeze
- Full product context: `docs/context.md`
