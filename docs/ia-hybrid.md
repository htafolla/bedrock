# Bedrock Hybrid IA — Precision Spec

**Direction:** Quiet nave of first principles + constellation map + chamber focus.  
**Rule:** 3D delivers place and weight; chamber UI delivers field manual (Truth · Under fire · Prayer · Scripture).

---

## 1. Modes (state machine)

| Mode | Purpose | User can |
|------|---------|----------|
| `arrival` | Threshold — enter the place | Read prologue; **Enter the nave** |
| `constellation` | Orient — spine + web | Select any chamber; follow spine |
| `chamber` | Work — field manual | Read truth/hacks/prayers; related jumps; spine prev/next; **Back to map** |

```
arrival ──Enter──► constellation ◄──Back── chamber
                         │                    ▲
                         └──── select node ───┘
                         └──── related link ──┘
```

Invalid: free-roam game controls, scroll-jacked page hijack, chamber without exit.

---

## 2. Spine (nave order)

Canonical pilgrimage order is `SPINE_ORDER` in `src/lib/spine.ts`.

- **All 35 chambers** appear on the spine (full guide, not a subset).
- **Default entry chamber:** `god-first` (index 0).
- **Default end:** `hope-of-glory` — *The Righteous Fall* sits after grace on the spine (fall → rise path), not as a dead-end after hope.
- **Next / Prev** always follow spine indices, not free graph walk.

---

## 3. Constellation layout

| Element | Spec |
|---------|------|
| Coordinate system | X right, Y up, Z depth (entrance +Z → glory −Z) |
| Spine path | Parametric curve `t ∈ [0,1]` along nave; slight lateral alternate for legibility |
| Node | Soft ember sphere; spine nodes slightly brighter |
| Active node | Stronger emissive + ring |
| Related edges | Thin dim lines between `related` pairs (drawn once, undirected) |
| Ground | Dark stone plane / fog — solid ground metaphor |
| Crucible | Near entrance (`t ≈ 0`), residual heat — not center stage in chamber mode |

---

## 4. Camera (lerp, never snap)

| Mode | Position (approx) | Look-at | Duration feel |
|------|-------------------|---------|---------------|
| `arrival` | `[0, 1.4, 11]` | `[0, 0.4, 2]` | Still, threshold |
| `constellation` | `[0, 9.5, 14]` | path midpoint | Elevated, quiet overview |
| `chamber` | node + offset `[1.8, 1.2, 3.2]` (camera-relative) | active node | Close, reverent |

- Damping: exponential lerp ~0.04–0.06 per frame at 60fps (smooth, not cinematic whip).
- `prefers-reduced-motion`: skip lerp; hard set pose.
- No orbit controls that invite “play the toy.” Optional future: constrained drag rotate only on constellation.

---

## 5. Interaction map

| Input | Mode | Result |
|-------|------|--------|
| Enter the nave | arrival | → constellation |
| Click node | constellation | → chamber(id) |
| Back to map | chamber | → constellation (keep last id for highlight) |
| Spine ← / → | chamber | adjacent spine chamber |
| Related chip | chamber | → chamber(relatedId) |
| Esc | chamber | → constellation |

Pointer: constellation canvas `pointer-events: auto`; chamber panel owns pointers; scene may stay visible but non-blocking under panel.

---

## 6. Progressive enhancement

| Capability | Experience |
|------------|------------|
| WebGL + desktop width + motion OK | Full R3F hybrid |
| Mobile / reduced motion / no WebGL | Same modes in 2D: arrival → spine strip + constellation list → chamber panel |

Visual language (stone, ember, beam) shared; geometry optional.

---

## 7. Content ownership

| Layer | Owns |
|-------|------|
| `bedrock.json` | Truth, hacks, prayers, verses, related |
| `spine.ts` | Nave order + 3D layout math |
| Experience shell | Mode, camera target, selection |

---

## 8. Success criteria

1. First-time user can enter without a manual.  
2. In crisis, spine Next is always available.  
3. Related web never strands user (Back always works).  
4. Feels like a place, not a dashboard with particles.  
5. Chamber text remains highly readable (contrast, no ornament fighting type).  
