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
}

export function CameraRig({
  mode,
  poses,
  activeChamberId,
  reducedMotion,
}: CameraRigProps) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.45, 2.2))
  const desiredPos = useRef(new THREE.Vector3(0, 1.45, 11.2))
  const desiredTarget = useRef(new THREE.Vector3(0, 0.45, 2.2))

  const poseMap = useMemo(() => {
    const m = new Map<string, NodePose>()
    for (const p of poses) m.set(p.id, p)
    return m
  }, [poses])

  useEffect(() => {
    let next
    if (mode === 'arrival') {
      next = cameraForArrival()
    } else if (mode === 'constellation') {
      next = cameraForConstellation(poses)
    } else {
      const node = activeChamberId ? poseMap.get(activeChamberId) : undefined
      next = node ? cameraForChamber(node.position) : cameraForConstellation(poses)
    }
    desiredPos.current.copy(next.position)
    desiredTarget.current.copy(next.target)

    if (reducedMotion) {
      camera.position.copy(next.position)
      target.current.copy(next.target)
      camera.lookAt(target.current)
    }
  }, [mode, poses, activeChamberId, poseMap, camera, reducedMotion])

  useFrame(() => {
    if (reducedMotion) return
    const damp = 0.045
    camera.position.lerp(desiredPos.current, damp)
    target.current.lerp(desiredTarget.current, damp)
    camera.lookAt(target.current)
  })

  return null
}
