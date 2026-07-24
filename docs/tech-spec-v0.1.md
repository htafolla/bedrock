# Bedrock Tech Spec

**Product name (locked):** Bedrock  
**Original working title:** The Hitchhiker’s Guild · Love · Living · Enduring  
**Version:** 0.1  
**Date:** July 23, 2026  
**Context SSOT:** [`docs/context.md`](./context.md)

## 1. Vision

Create a beautiful, immersive 3D web experience that presents the Bedrock principles as a permanent digital testament.

It is not a static page. It is a living space a person can walk through — a visual and spiritual monument that says: through the fire, He was always with me.

The experience should feel weighty, quiet, and modern enough for a generation that lives in screens, yet durable enough to outlast platforms.

## 2. Core Goals

- Present the full Bedrock content in a clean, readable, and emotionally resonant way
- Make every Scripture reference clickable and permanent
- Create a dual-source system (traditional + on-chain) so the truth survives both web rot and institutional change
- Deliver a 3D experience that feels sacred rather than gimmicky
- Embed the work itself on blockchain so the testimony cannot be easily erased

## 3. Target Audience

- People walking through personal fire (separation, grief, failure, waiting)
- Young believers and seekers who respond to visual / immersive mediums more than dense text
- Anyone who wants a permanent, shareable, non-platform-dependent statement of faith under pressure

## 4. Key Features

### 4.1 Immersive 3D Space

- Central metaphor: a forge / crucible / quiet cathedral of light and stone
- User can move through distinct “chambers” or floating nodes that correspond to major sections
- Subtle particle systems, soft light beams, and residual heat/embers that never fully die
- Smooth camera transitions and optional first-person or orbital navigation
- Mobile-friendly fallback (2D elegant scroll with the same visual language)

### 4.2 Verse Linking System (Dichotomy)

| Type | Source | Purpose |
|------|--------|---------|
| Primary | Bible Gateway direct passage | Human-readable, searchable, familiar |
| Secondary | On-chain or IPFS-backed verse | Permanent, censorship-resistant, timestamped |

- Default click opens primary
- Small “On-chain” badge opens permanent version
- Long-term: store exact verse text + reference as immutable record

### 4.3 Content Structure

- Full Bedrock text rendered cleanly inside the environment
- Major headings → interactive nodes/chambers
- Supporting verses as glowing/etched references
- Optional collect/bookmark principles

### 4.4 Blockchain Permanence Layer

- Entire document on IPFS
- Content hash anchored on-chain (**Sui preferred**)
- Optional Testimony NFT / soulbound token
- Future: community “I stand on this” commitments

### 4.5 Testimony Layer

Quiet, optional personal statement area (sealed by default):

> “My wife is leaving me. This is a testament that through the fire He was always with me.”

## 5. Technical Architecture

### Frontend

- React + React Three Fiber + Drei + Three.js
- Tailwind + custom atmosphere
- Progressive enhancement: full 3D on capable devices, elegant 2D on mobile/low-end

### Content & Linking

- Structured JSON source of truth for Bedrock text
- Verse parser auto-generates dual links
- Primary: Bible Gateway (`/passage/?search=Book+Chapter:Verse`)
- Secondary: IPFS verse snapshots / permanent registry

### Blockchain / Permanence

- IPFS (Pinata / web3.storage / self-hosted)
- Sui (preferred) for content hash registration; adapter keeps chain swappable
- Frontend reads latest verified hash

### Hosting

- Primary: Vercel / Cloudflare Pages
- Permanent mirror: IPFS gateway + ENS (later)

## 6. Design Principles

- Restraint over spectacle
- Light and residual heat rather than literal fire
- Typography highly readable even in 3D
- Silence and space are features
- Standing on something solid, not flying through a game

## 7. Phased Roadmap

### Phase 1 – Foundation (MVP) + light 3D shell

- Clean structured content + dual verse linking
- Beautiful 2D / light-3D reading experience
- IPFS upload + on-chain hash registration (Sui preferred)
- Sealed optional testimony

### Phase 2 – Immersion

- Full R3F environment, chambers, atmosphere

### Phase 3 – Permanence & Sharing

- Testimony minting, shareable permanent links, community layer

## 8. Locked decisions (2026-07-23 session)

| Question | Decision |
|----------|----------|
| Primary Bible source | Bible Gateway direct verse (NIV) |
| Chain for permanent anchor | **Sui preferred** |
| Testimony default | **Sealed optional** |
| Scope now | **Phase 1 + light 3D shell** |
| Content | Full field-manual text loaded (34 chambers) |
| Tone | Steel over sentiment; usable under pressure |
