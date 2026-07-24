import type { Chamber } from '../types/content'
import * as THREE from 'three'

/**
 * Canonical nave order — pilgrimage spine.
 * The Righteous Fall sits after grace (fall → rise), before Meaning of Life.
 * Hope of Glory is the terminus.
 */
export const SPINE_ORDER = [
  'god-first',
  'his-power-and-beauty',
  'his-promises',
  'his-provision',
  'the-lords-prayer',
  'the-cross-and-our-justification',
  'he-is-for-you',
  'his-grace-is-sufficient',
  'the-righteous-fall',
  'the-meaning-of-life',
  'deny-yourself',
  'walk-by-the-spirit',
  'god-on-marriage',
  'marriage-covenant',
  'love-and-patience',
  'count-the-trial-as-joy',
  'wait-on-the-lord',
  'lament-and-pour-out-your-heart',
  'a-broken-and-contrite-heart',
  'guard-your-heart-and-mouth',
  'be-quick-to-listen',
  'restore-gently-and-give-time',
  'confess-and-be-cleansed',
  'walk-in-honesty-and-truth',
  'choose-selfless-love',
  'do-not-repay-evil-with-evil',
  'leave-vengeance-to-the-lord',
  'forgive-as-you-have-been-forgiven',
  'one-another-in-the-body',
  'trust-in-the-lord',
  'do-not-fear',
  'fear',
  'loss',
  'renew-your-mind',
  'take-every-thought-captive',
  'the-full-armor-of-god',
  'hope-of-glory',
] as const

export type SpineId = (typeof SPINE_ORDER)[number]

export const DEFAULT_SPINE_ID: SpineId = 'god-first'

export function spineIndexOf(id: string): number {
  return SPINE_ORDER.indexOf(id as SpineId)
}

export function spineNeighbor(id: string, delta: -1 | 1): string | null {
  const i = spineIndexOf(id)
  if (i < 0) return null
  const j = i + delta
  if (j < 0 || j >= SPINE_ORDER.length) return null
  return SPINE_ORDER[j]
}

export function orderChambersBySpine(chambers: Chamber[]): Chamber[] {
  const byId = new Map(chambers.map((c) => [c.id, c]))
  const ordered: Chamber[] = []
  for (const id of SPINE_ORDER) {
    const c = byId.get(id)
    if (c) ordered.push(c)
  }
  // Any chamber missing from spine still appears at end (schema safety)
  for (const c of chambers) {
    if (spineIndexOf(c.id) < 0) ordered.push(c)
  }
  return ordered
}

export interface NodePose {
  id: string
  index: number
  t: number
  position: THREE.Vector3
  /** On the primary pilgrimage path */
  onSpine: boolean
}

/**
 * Fanned DNA / double-helix path: entrance +Z → glory −Z.
 * Wide lateral spread so nodes are clickable and readable, not a tight line.
 */
export function spinePosition(index: number, total: number): THREE.Vector3 {
  const n = Math.max(total - 1, 1)
  const t = index / n
  // Long corridor of first principles
  const z = THREE.MathUtils.lerp(11, -20, t)
  // Fan radius: narrow at ends, open in the middle (helix envelope)
  const radius = 1.6 + Math.sin(t * Math.PI) * 4.2
  // ~2.25 turns along the path
  const angle = t * Math.PI * 4.5
  // Second strand offset for even/odd (DNA ladder feel)
  const strand = index % 2 === 0 ? 0 : Math.PI
  const x = Math.cos(angle + strand) * radius
  const y = 1.4 + Math.sin(angle + strand) * (radius * 0.62)
  return new THREE.Vector3(x, y, z)
}

export function buildNodePoses(chamberIds: string[]): NodePose[] {
  const total = chamberIds.length
  return chamberIds.map((id, index) => {
    const spineIdx = spineIndexOf(id)
    const layoutIndex = spineIdx >= 0 ? spineIdx : index
    const layoutTotal = spineIdx >= 0 ? SPINE_ORDER.length : total
    return {
      id,
      index: layoutIndex,
      t: layoutIndex / Math.max(layoutTotal - 1, 1),
      position: spinePosition(layoutIndex, layoutTotal),
      onSpine: spineIdx >= 0,
    }
  })
}

export function pathMidpoint(poses: NodePose[]): THREE.Vector3 {
  if (poses.length === 0) return new THREE.Vector3(0, 0.5, 0)
  const mid = poses[Math.floor(poses.length / 2)]
  return mid.position.clone()
}

export interface CameraPose {
  position: THREE.Vector3
  target: THREE.Vector3
}

export function cameraForArrival(): CameraPose {
  return {
    position: new THREE.Vector3(0, 2.2, 14),
    target: new THREE.Vector3(0, 1.2, 2),
  }
}

/** Pull back high enough to read the fanned DNA. */
export function cameraForConstellation(poses: NodePose[]): CameraPose {
  const mid = pathMidpoint(poses)
  return {
    position: new THREE.Vector3(0.4, 14.5, 22),
    target: new THREE.Vector3(mid.x * 0.15, mid.y + 0.4, mid.z),
  }
}

/** Intimate frame on a node — used for enter transition into chamber reading. */
export function cameraForChamber(nodePos: THREE.Vector3): CameraPose {
  return {
    position: new THREE.Vector3(nodePos.x + 2.1, nodePos.y + 1.15, nodePos.z + 3.35),
    target: nodePos.clone().add(new THREE.Vector3(0, 0.12, 0)),
  }
}
