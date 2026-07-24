# Bedrock UX / UI — Design Pass

**Mobile-first. Don't make me think. Restraint over spectacle.**

## Navigation (3 ways, top bar)

| Tab | Job |
|-----|-----|
| **Keys** | Trial entry chips — fastest when you know the fight |
| **Map** | Fanned DNA + spine chips — spatial / pilgrimage |
| **Contents** | Full TOC — find any principle by name |

- Sticky **top** (not bottom): brand + Keys · Map · Contents  
- Touch targets ≥ 44–48px  
- Default: Keys on narrow, Map on wide  

## DNA / constellation

- Double-helix **fan**: radius opens mid-path (not a tight line)  
- Camera pulled back to read the structure  
- **Orbit / spin**: drag to rotate, scroll to zoom (Map only; disabled in chamber)  
- Soft **auto-rotate** when idle (off under reduced motion)  
- Map chrome is **compact** so canvas stays clickable  
- UI shell uses `pointer-events: none` on empty space so clicks reach nodes  

## Enhanced 3D UX — roadmap (restraint-first)

| Priority | Enhancement | Why |
|----------|-------------|-----|
| Done | Spin / zoom orbit | User owns the space |
| Next | Hover labels on nodes | Know the chamber before click |
| Next | Click pulse + camera ease into chamber | Continuity of place |
| Later | Touch two-finger orbit polish | Mobile when 3D is enabled |
| Later | Soft “path ribbon” along spine | Orientation without clutter |
| Skip | Flight sims, free fly, particle fireworks | Breaks sacred restraint |

## Visual system

- Stone / ember / beam palette (existing tokens)  
- Glass panels for content; quiet hierarchy  
- Single verse link → Bible Gateway  
- Sealed word: short → poem link for depth  

## Accessibility

- Tab roles on nav, focus-visible rings  
- Reduced motion / no WebGL → 2D fallback, same three navigators  
- Readable type on dark ground (display + body pair)  
