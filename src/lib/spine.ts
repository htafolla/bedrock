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
 * Nave path: entrance +Z → glory −Z.
 * Slight lateral alternate for legibility; gentle vertical arc.
 */
export function spinePosition(index: number, total: number): THREE.Vector3 {
  const n = Math.max(total - 1, 1)
  const t = index / n
  const z = THREE.MathUtils.lerp(7.5, -13.5, t)
  const y = 0.35 + Math.sin(t * Math.PI) * 0.55
  const lateral = (index % 2 === 0 ? -1 : 1) * (0.55 + t * 0.35)
  const x = Math.sin(t * Math.PI) * 0.25 + lateral
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
    position: new THREE.Vector3(0, 1.45, 11.2),
    target: new THREE.Vector3(0, 0.45, 2.2),
  }
}

export function cameraForConstellation(poses: NodePose[]): CameraPose {
  const mid = pathMidpoint(poses)
  return {
    position: new THREE.Vector3(0.2, 9.8, 14.5),
    target: new THREE.Vector3(mid.x * 0.3, mid.y + 0.2, mid.z),
  }
}

export function cameraForChamber(nodePos: THREE.Vector3): CameraPose {
  return {
    position: new THREE.Vector3(nodePos.x + 2.1, nodePos.y + 1.15, nodePos.z + 3.4),
    target: nodePos.clone().add(new THREE.Vector3(0, 0.05, 0)),
  }
}
