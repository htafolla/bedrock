import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ExperienceMode } from '../../types/experience'
import type { NodePose } from '../../lib/spine'
import {
  cameraForArrival,
  cameraForChamber,
  cameraForConstellation,
} from '../../lib/spine'

interface CameraRigProps {
  mode: ExperienceMode
  poses: NodePose[]
  activeChamberId: string | null
  reducedMotion: boolean
  /**
   * When true (Map + interactive), lerp to a pose then yield to OrbitControls
   * so the user can spin / zoom the DNA freely.
   */
  orbitEnabled: boolean
}

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
  /** Softer damp when entering/leaving a chamber for cinematic weight */
  const dampRef = useRef(0.045)

  const poseMap = useMemo(() => {
    const m = new Map<string, NodePose>()
    for (const p of poses) m.set(p.id, p)
    return m
  }, [poses])

  useEffect(() => {
    settled.current = false
    let next
    if (mode === 'arrival') {
      next = cameraForArrival()
      dampRef.current = 0.05
    } else if (mode === 'constellation') {
      next = cameraForConstellation(poses)
      // Exit chamber → map: ease out, then hand off to orbit
      dampRef.current = 0.038
    } else {
      const node = activeChamberId ? poseMap.get(activeChamberId) : undefined
      next = node ? cameraForChamber(node.position) : cameraForConstellation(poses)
      // Enter chamber: slower, weightier approach
      dampRef.current = 0.028
    }
    desiredPos.current.copy(next.position)
    desiredTarget.current.copy(next.target)

    if (reducedMotion) {
      camera.position.copy(next.position)
      target.current.copy(next.target)
      camera.lookAt(target.current)
      settled.current = true
    }
  }, [mode, poses, activeChamberId, poseMap, camera, reducedMotion])

  useFrame(() => {
    if (orbitEnabled && settled.current && !reducedMotion) return
    if (reducedMotion) return

    const damp = dampRef.current
    camera.position.lerp(desiredPos.current, damp)
    target.current.lerp(desiredTarget.current, damp)
    camera.lookAt(target.current)

    const dist = camera.position.distanceTo(desiredPos.current)
    // Chamber settles when close; constellation slightly looser before orbit takes over
    const threshold = mode === 'chamber' ? 0.12 : 0.18
    if (dist < threshold) {
      settled.current = true
      if (mode === 'constellation') {
        dampRef.current = 0.06
      }
    }
  })

  return null
}
