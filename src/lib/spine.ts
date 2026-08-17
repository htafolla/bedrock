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
  'holy-spirit',
  'love',
  'joy',
  'peace',
  'patience',
  'kindness',
  'goodness',
  'faithfulness',
  'gentleness',
  'self-control',
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
  'wounded',
  'rumination',
  'regret',
  'addiction',
  'jealousy',
  'control',
  'presence-without-control',
  'the-line',
  'pain-interrupt',
  'renew-your-mind',
  'take-every-thought-captive',
  'the-word',
  'the-adversary',
  'spiritual-warfare',
  'wheat-and-tares',
  'persecution',
  'works-of-the-flesh',
  'idolatry',
  'kill-the-flesh',
  'kill-the-flesh-walk-in-the-spirit',
  'adultery',
  'pharmakeia',
  'murder',
  'malice',
  'falsehood',
  'the-full-armor-of-god',
  'watch-and-be-ready',
  'ten-virgins',
  'the-faithful-servant',
  'one-taken-one-left',
  'treasure-in-heaven',
  /** Means of grace / Spirit practice — toward gifts and glory */
  'prayer',
  'fasting',
  'sabbath',
  'healing',
  'laying-on-of-hands',
  'spiritual-gifts',
  'hope-of-glory',
] as const

export type SpineId = (typeof SPINE_ORDER)[number]

export const DEFAULT_SPINE_ID: SpineId = 'god-first'

/**
 * Overarching hub topics — larger “anchor” beads on the Map.
 * Cluster leaves (individual fruit, flesh sins, parables) stay smaller.
 */
export const SPINE_ANCHORS = [
  'god-first',
  'the-cross-and-our-justification',
  'his-grace-is-sufficient',
  'the-righteous-fall',
  'the-meaning-of-life',
  'walk-by-the-spirit', // Fruit of the Spirit hub
  'holy-spirit', // Helper / Spirit of truth / power and gifts
  'marriage-covenant',
  'wait-on-the-lord',
  'trust-in-the-lord',
  'forgive-as-you-have-been-forgiven',
  'renew-your-mind',
  'the-word', // combat the lie that people cannot know or understand Scripture
  'the-adversary', // Christ has won — eyes on Jesus; stand with God
  'spiritual-warfare',
  'works-of-the-flesh',
  'the-full-armor-of-god',
  'watch-and-be-ready',
  'control', // release grip / stop securing outcome — hub for jealousy & trust
  'prayer', // practice / gifts approach
  'spiritual-gifts',
  'hope-of-glory',
] as const

const ANCHOR_SET: ReadonlySet<string> = new Set(SPINE_ANCHORS)

export function isSpineAnchor(id: string): boolean {
  return ANCHOR_SET.has(id)
}

/** Map chrome hubs only — full spine stays on Contents / DNA nodes. */
export function orderAnchorsBySpine(chambers: Chamber[]): Chamber[] {
  return orderChambersBySpine(chambers).filter((c) => isSpineAnchor(c.id))
}

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
  /** Overarching hub — larger bead, visual anchor for a cluster */
  anchor: boolean
}

/**
 * DNA / double-helix path: entrance +Z → glory −Z.
 * Kept narrow so the full width fits inside the page viewport (not a wide fan).
 */
export function spinePosition(index: number, total: number): THREE.Vector3 {
  const n = Math.max(total - 1, 1)
  const t = index / n
  // Long corridor of first principles
  const z = THREE.MathUtils.lerp(11, -20, t)
  // Compact helix envelope — slight mid-path open, still page-width safe
  const radius = 0.85 + Math.sin(t * Math.PI) * 1.65
  // ~2.25 turns along the path
  const angle = t * Math.PI * 4.5
  // Second strand offset for even/odd (DNA ladder feel)
  const strand = index % 2 === 0 ? 0 : Math.PI
  const x = Math.cos(angle + strand) * radius
  const y = 1.4 + Math.sin(angle + strand) * (radius * 0.48)
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
      anchor: isSpineAnchor(id),
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

/**
 * Map / Keys overview + OrbitControls target.
 *
 * Spine runs entrance (+Z) → glory (−Z). Home camera sits on the +X side so
 * that path reads **left → right** on screen (start left, hope right) — natural
 * reading order, not “into the distance” from the entrance end.
 */
export const CONSTELLATION_ORBIT = {
  /** Mid-path focus (halfway along Z corridor ~lerp(11,−20,0.5)). */
  target: { x: 0, y: 1.55, z: -4.5 },
  /**
   * Side vantage: +X looks across the DNA.
   * Screen: +Z (start) → left, −Z (glory) → right.
   * Closer in now that the helix is page-width compact.
   */
  position: { x: 12.5, y: 8.2, z: -1.2 },
  minDistance: 6,
  maxDistance: 32,
  /** OrbitControls units — slow idle turn (lower = calmer). */
  autoRotateSpeed: 0.28,
} as const

/** Home frame for Map/Keys before OrbitControls takes over (LTR side view). */
export function cameraForConstellation(_poses?: NodePose[]): CameraPose {
  const o = CONSTELLATION_ORBIT
  return {
    position: new THREE.Vector3(o.position.x, o.position.y, o.position.z),
    target: new THREE.Vector3(o.target.x, o.target.y, o.target.z),
  }
}

/**
 * Frame any spine node the same way: elevated, from the +Z (entrance) side.
 * Glory-side neighbors stay in view ahead; beads don't stream past in a tunnel dive.
 * Fixed +X bias (not flip-flopping) so spine prev/next cameras stay close enough to ease.
 * Works for God First (start), Marriage (mid), Hope of Glory (end) alike.
 */
export function cameraForChamber(nodePos: THREE.Vector3): CameraPose {
  return {
    position: new THREE.Vector3(nodePos.x + 2.5, nodePos.y + 3.35, nodePos.z + 5.0),
    target: nodePos.clone().add(new THREE.Vector3(0, 0.16, 0)),
  }
}

/**
 * Re-seat near the chamber frame when the jump is long (Map → any bead, related-link
 * jumps). Returns null for short neighbor steps so spine prev/next still eases.
 *
 * @param farThreshold distance below which we ease in place. Pass `0` to always reseat
 *   (used when entering chamber mode from Map/Keys).
 */
export function chamberApproachStart(
  from: THREE.Vector3,
  destination: CameraPose,
  farThreshold = 8,
): THREE.Vector3 | null {
  if (farThreshold > 0 && from.distanceTo(destination.position) < farThreshold) {
    return null
  }
  // Same look direction, a little further out — short settle, not a corridor dive.
  const dir = destination.position.clone().sub(destination.target)
  if (dir.lengthSq() < 1e-6) {
    dir.set(0, 2.2, 4.5)
  } else {
    const len = dir.length()
    dir.normalize().multiplyScalar(len + 3.2)
  }
  return destination.target.clone().add(dir)
}

/** True when Map/orbit home → this chamber would fly the helix without a reseat. */
export function chamberNeedsReseatFromHome(chamberId: string): boolean {
  const i = spineIndexOf(chamberId)
  if (i < 0) return true
  const node = spinePosition(i, SPINE_ORDER.length)
  const dest = cameraForChamber(node)
  const home = cameraForConstellation().position
  return chamberApproachStart(home, dest) != null
}
