import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_SPINE_ID,
  SPINE_ORDER,
  SPINE_ANCHORS,
  spineIndexOf,
  spineNeighbor,
  spinePosition,
  buildNodePoses,
  cameraForChamber,
  cameraForConstellation,
  chamberApproachStart,
  chamberNeedsReseatFromHome,
  isSpineAnchor,
  orderAnchorsBySpine,
  CONSTELLATION_ORBIT,
} from './spine'

describe('SPINE_ORDER', () => {
  it('starts at god-first and ends at hope-of-glory', () => {
    expect(SPINE_ORDER[0]).toBe('god-first')
    expect(SPINE_ORDER[SPINE_ORDER.length - 1]).toBe('hope-of-glory')
  })

  it('places the-righteous-fall after grace, before meaning of life', () => {
    const fall = spineIndexOf('the-righteous-fall')
    const grace = spineIndexOf('his-grace-is-sufficient')
    const meaning = spineIndexOf('the-meaning-of-life')
    expect(fall).toBeGreaterThan(grace)
    expect(fall).toBeLessThan(meaning)
  })

  it('has unique ids', () => {
    expect(new Set(SPINE_ORDER).size).toBe(SPINE_ORDER.length)
  })

  it('places fruit of the Spirit cluster immediately after walk-by-the-spirit', () => {
    const fruit = [
      'love',
      'joy',
      'peace',
      'patience',
      'kindness',
      'goodness',
      'faithfulness',
      'gentleness',
      'self-control',
    ] as const
    const hub = spineIndexOf('walk-by-the-spirit')
    expect(hub).toBeGreaterThanOrEqual(0)
    expect(spineNeighbor('walk-by-the-spirit', 1)).toBe('holy-spirit')
    expect(spineNeighbor('holy-spirit', 1)).toBe('love')
    // Fruit cluster follows Holy Spirit chamber
    for (let i = 0; i < fruit.length; i++) {
      expect(spineIndexOf(fruit[i])).toBe(hub + 2 + i)
    }
    expect(spineNeighbor('self-control', 1)).toBe('god-on-marriage')
  })
})

describe('spineNeighbor', () => {
  it('walks the nave', () => {
    expect(spineNeighbor(DEFAULT_SPINE_ID, 1)).toBe('his-power-and-beauty')
    expect(spineNeighbor(DEFAULT_SPINE_ID, -1)).toBeNull()
    expect(spineNeighbor('hope-of-glory', 1)).toBeNull()
    expect(spineNeighbor('hope-of-glory', -1)).toBe('spiritual-gifts')
  })
})

describe('orderAnchorsBySpine', () => {
  it('returns only hub joints in spine order — far fewer than the full atlas', () => {
    const chambers = SPINE_ORDER.map((id) => ({
      id,
      title: id,
      summary: '',
      body: [],
      verses: [],
      related: [],
      tags: [],
    }))
    const hubs = orderAnchorsBySpine(chambers as never)
    expect(hubs.length).toBe(SPINE_ANCHORS.length)
    expect(hubs.length).toBeLessThan(SPINE_ORDER.length / 2)
    expect(hubs.every((c) => isSpineAnchor(c.id))).toBe(true)
    expect(hubs[0].id).toBe('god-first')
    expect(hubs[hubs.length - 1].id).toBe('hope-of-glory')
  })
})

describe('layout', () => {
  it('places later spine nodes further toward −Z (glory)', () => {
    const a = spinePosition(0, SPINE_ORDER.length)
    const b = spinePosition(SPINE_ORDER.length - 1, SPINE_ORDER.length)
    expect(b.z).toBeLessThan(a.z)
  })

  it('fans mid-path slightly wider than the ends (compact DNA envelope)', () => {
    const start = spinePosition(0, SPINE_ORDER.length)
    const mid = spinePosition(Math.floor(SPINE_ORDER.length / 2), SPINE_ORDER.length)
    const startR = Math.hypot(start.x, start.y - 1.4)
    const midR = Math.hypot(mid.x, mid.y - 1.4)
    expect(midR).toBeGreaterThan(startR)
  })

  it('keeps lateral width inside the page (not a wide fan)', () => {
    let maxAbsX = 0
    for (let i = 0; i < SPINE_ORDER.length; i++) {
      const p = spinePosition(i, SPINE_ORDER.length)
      maxAbsX = Math.max(maxAbsX, Math.abs(p.x))
    }
    // Compact helix — stays well within a typical Map frame
    expect(maxAbsX).toBeLessThan(3)
  })

  it('builds a pose per id', () => {
    const poses = buildNodePoses([...SPINE_ORDER])
    expect(poses).toHaveLength(SPINE_ORDER.length)
    expect(poses[0].id).toBe('god-first')
  })

  it('marks overarching hubs as Map anchors (not every fruit leaf)', () => {
    expect(isSpineAnchor('walk-by-the-spirit')).toBe(true)
    expect(isSpineAnchor('spiritual-warfare')).toBe(true)
    expect(isSpineAnchor('spiritual-gifts')).toBe(true)
    expect(isSpineAnchor('hope-of-glory')).toBe(true)
    expect(isSpineAnchor('love')).toBe(false)
    expect(isSpineAnchor('adultery')).toBe(false)
    expect(isSpineAnchor('ten-virgins')).toBe(false)
    for (const id of SPINE_ANCHORS) {
      expect(SPINE_ORDER.includes(id as (typeof SPINE_ORDER)[number]), id).toBe(true)
    }
    const poses = buildNodePoses([...SPINE_ORDER])
    expect(poses.filter((p) => p.anchor).map((p) => p.id).sort()).toEqual(
      [...SPINE_ANCHORS].slice().sort(),
    )
  })

  it('frames chambers from above-side (not a spine-tunnel camera)', () => {
    const node = spinePosition(spineIndexOf('marriage-covenant'), SPINE_ORDER.length)
    const cam = cameraForChamber(node)
    // Stay elevated and standoff so neighbors remain in view
    expect(cam.position.y).toBeGreaterThan(node.y + 2)
    expect(cam.position.distanceTo(node)).toBeGreaterThan(5)
    expect(cam.target.distanceTo(node)).toBeLessThan(0.5)
  })

  it('reseats far orbit dives near the chamber (no full-helix lerp)', () => {
    const node = spinePosition(spineIndexOf('marriage-covenant'), SPINE_ORDER.length)
    const dest = cameraForChamber(node)
    const fromOrbit = cameraForConstellation().position
    const approach = chamberApproachStart(fromOrbit, dest)
    expect(approach).not.toBeNull()
    expect(approach!.distanceTo(dest.position)).toBeLessThan(8)
    expect(approach!.distanceTo(fromOrbit)).toBeGreaterThan(8)

    // Neighbor step stays short — no reseat
    const near = dest.position.clone().add(new THREE.Vector3(1, 0.5, 1))
    expect(chamberApproachStart(near, dest)).toBeNull()
  })

  it('Map home is mid-close side view (readable DNA, not a distant wire)', () => {
    const home = cameraForConstellation()
    const target = new THREE.Vector3(
      CONSTELLATION_ORBIT.target.x,
      CONSTELLATION_ORBIT.target.y,
      CONSTELLATION_ORBIT.target.z,
    )
    const dist = home.position.distanceTo(target)
    expect(dist).toBeGreaterThan(12)
    expect(dist).toBeLessThan(28)
    expect(home.position.y).toBe(CONSTELLATION_ORBIT.position.y)
    // Side vantage — camera sits off +X looking across the path
    expect(home.position.x).toBeGreaterThan(10)
  })

  it('Map home reads spine left→right (start +Z left of glory −Z on screen)', () => {
    // Looking from +X toward origin: screen-right ≈ −Z (start left, glory right).
    const start = spinePosition(0, SPINE_ORDER.length)
    const end = spinePosition(SPINE_ORDER.length - 1, SPINE_ORDER.length)
    expect(start.z).toBeGreaterThan(end.z)
    const home = cameraForConstellation()
    // Camera is on +X side of both ends
    expect(home.position.x).toBeGreaterThan(start.x)
    expect(home.position.x).toBeGreaterThan(end.x)
  })

  it('every spine bead gets a stable elevated frame (start · mid · end)', () => {
    const samples = [0, Math.floor(SPINE_ORDER.length / 2), SPINE_ORDER.length - 1]
    for (const i of samples) {
      const node = spinePosition(i, SPINE_ORDER.length)
      const cam = cameraForChamber(node)
      expect(cam.position.y, SPINE_ORDER[i]).toBeGreaterThan(node.y + 2)
      // Always approach from the entrance (+Z) side of the bead
      expect(cam.position.z, SPINE_ORDER[i]).toBeGreaterThan(node.z)
      expect(cam.position.distanceTo(node), SPINE_ORDER[i]).toBeGreaterThan(5)
      expect(cam.position.distanceTo(node), SPINE_ORDER[i]).toBeLessThan(12)
    }
  })

  it('Map → any spine chamber reseats (no helix fly-through), neighbors ease', () => {
    const home = cameraForConstellation().position
    for (const id of SPINE_ORDER) {
      const i = spineIndexOf(id)
      const node = spinePosition(i, SPINE_ORDER.length)
      const dest = cameraForChamber(node)
      // forceReseat (threshold 0) always places near the bead
      const forced = chamberApproachStart(home, dest, 0)
      expect(forced, id).not.toBeNull()
      expect(forced!.distanceTo(dest.position), id).toBeLessThan(8)
    }

    // Neighbor steps: ease when close; soft reseat when helix swing is wide (still no corridor).
    for (let i = 0; i < SPINE_ORDER.length - 1; i++) {
      const a = cameraForChamber(spinePosition(i, SPINE_ORDER.length))
      const b = cameraForChamber(spinePosition(i + 1, SPINE_ORDER.length))
      const d = a.position.distanceTo(b.position)
      const approach = chamberApproachStart(a.position, b)
      if (d < 8) {
        expect(approach, SPINE_ORDER[i]).toBeNull()
      } else {
        expect(approach, SPINE_ORDER[i]).not.toBeNull()
        expect(approach!.distanceTo(b.position), SPINE_ORDER[i]).toBeLessThan(8)
      }
    }
  })

  it('flags which chambers need reseat from home (audit helper)', () => {
    // Mid and glory-end almost always need it; helper must be consistent
    expect(chamberNeedsReseatFromHome('marriage-covenant')).toBe(true)
    expect(chamberNeedsReseatFromHome('hope-of-glory')).toBe(true)
    expect(typeof chamberNeedsReseatFromHome('god-first')).toBe('boolean')
  })
})
