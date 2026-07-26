import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ExperienceMode } from '../../types/experience'
import type { NodePose } from '../../lib/spine'
import {
  cameraForArrival,
  cameraForChamber,
  cameraForConstellation,
  chamberApproachStart,
} from '../../lib/spine'

interface CameraRigProps {
  mode: ExperienceMode
  poses: NodePose[]
  activeChamberId: string | null
  reducedMotion: boolean
  /**
   * When true (Keys/Map), snap home then permanently yield so OrbitControls can auto-spin.
   */
  orbitEnabled: boolean
}

/**
 * Guided camera for arrival / chamber.
 * Map/Keys: snap to overview and hand off immediately — do not lerp forever against autoRotate.
 */
export function CameraRig({
  mode,
  poses,
  activeChamberId,
  reducedMotion,
  orbitEnabled,
}: CameraRigProps) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 1.2, 2))
  const desiredPos = useRef(new THREE.Vector3(0, 2.2, 14))
  const desiredTarget = useRef(new THREE.Vector3(0, 1.2, 2))
  const settled = useRef(false)
  const orbitHandedOff = useRef(false)
  const dampRef = useRef(0.045)
  const prevMode = useRef<ExperienceMode | null>(null)
  const prevOrbit = useRef(orbitEnabled)

  const poseMap = useMemo(() => {
    const m = new Map<string, NodePose>()
    for (const p of poses) m.set(p.id, p)
    return m
  }, [poses])

  useEffect(() => {
    const modeChanged = prevMode.current !== mode
    const orbitJustOn = orbitEnabled && !prevOrbit.current
    prevMode.current = mode
    prevOrbit.current = orbitEnabled

    // Free Map/Keys orbit: snap home once, then leave the camera alone so spin works.
    if (mode === 'constellation' && orbitEnabled && !reducedMotion) {
      if (orbitHandedOff.current && !modeChanged && !orbitJustOn) {
        return
      }
      const next = cameraForConstellation(poses)
      camera.position.copy(next.position)
      target.current.copy(next.target)
      camera.lookAt(target.current)
      desiredPos.current.copy(next.position)
      desiredTarget.current.copy(next.target)
      settled.current = true
      orbitHandedOff.current = true
      return
    }

    // Contents (constellation, no orbit): don't steal the camera
    if (mode === 'constellation' && !orbitEnabled) {
      return
    }

    // Leaving free orbit
    if (mode !== 'constellation') {
      orbitHandedOff.current = false
    }

    settled.current = false
    let next
    if (mode === 'arrival') {
      next = cameraForArrival()
      dampRef.current = 0.05
    } else {
      // chamber
      const node = activeChamberId ? poseMap.get(activeChamberId) : undefined
      next = node ? cameraForChamber(node.position) : cameraForConstellation(poses)
      dampRef.current = 0.045

      // Map → any bead: reseat near the node (no full-helix fly-through).
      if (node && !reducedMotion) {
        const approach = chamberApproachStart(
          camera.position,
          next,
          modeChanged ? 0 : 8,
        )
        if (approach) {
          camera.position.copy(approach)
          target.current.copy(next.target)
          camera.lookAt(target.current)
        } else {
          target.current.copy(next.target)
        }
      }
    }

    desiredPos.current.copy(next.position)
    desiredTarget.current.copy(next.target)

    if (reducedMotion) {
      camera.position.copy(next.position)
      target.current.copy(next.target)
      camera.lookAt(target.current)
      settled.current = true
    }
  }, [mode, poses, activeChamberId, poseMap, camera, reducedMotion, orbitEnabled])

  useFrame(() => {
    // Never fight OrbitControls after hand-off — this was killing auto-spin on load.
    if (orbitEnabled && orbitHandedOff.current && mode === 'constellation') {
      return
    }
    if (orbitEnabled && settled.current && !reducedMotion && mode === 'constellation') {
      return
    }
    if (reducedMotion) return

    const damp = dampRef.current
    camera.position.lerp(desiredPos.current, damp)
    target.current.lerp(desiredTarget.current, damp)
    camera.lookAt(target.current)

    const dist = camera.position.distanceTo(desiredPos.current)
    const threshold = mode === 'chamber' ? 0.12 : 0.18
    if (dist < threshold) {
      settled.current = true
    }
  })

  return null
}
