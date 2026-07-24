import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SPINE_ID,
  SPINE_ORDER,
  spineIndexOf,
  spineNeighbor,
  spinePosition,
  buildNodePoses,
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
})

describe('spineNeighbor', () => {
  it('walks the nave', () => {
    expect(spineNeighbor(DEFAULT_SPINE_ID, 1)).toBe('his-power-and-beauty')
    expect(spineNeighbor(DEFAULT_SPINE_ID, -1)).toBeNull()
    expect(spineNeighbor('hope-of-glory', 1)).toBeNull()
    expect(spineNeighbor('hope-of-glory', -1)).toBe('the-full-armor-of-god')
  })
})

describe('layout', () => {
  it('places later spine nodes further toward −Z (glory)', () => {
    const a = spinePosition(0, SPINE_ORDER.length)
    const b = spinePosition(SPINE_ORDER.length - 1, SPINE_ORDER.length)
    expect(b.z).toBeLessThan(a.z)
  })

  it('fans mid-path nodes wider than the ends (DNA envelope)', () => {
    const start = spinePosition(0, SPINE_ORDER.length)
    const mid = spinePosition(Math.floor(SPINE_ORDER.length / 2), SPINE_ORDER.length)
    const startR = Math.hypot(start.x, start.y - 1.4)
    const midR = Math.hypot(mid.x, mid.y - 1.4)
    expect(midR).toBeGreaterThan(startR)
  })

  it('builds a pose per id', () => {
    const poses = buildNodePoses([...SPINE_ORDER])
    expect(poses).toHaveLength(SPINE_ORDER.length)
    expect(poses[0].id).toBe('god-first')
  })
})
