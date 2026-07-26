import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CONSTELLATION_ORBIT } from '../../lib/spine'

interface OrbitSpinProps {
  enabled: boolean
  /** Soft idle turn of the view (not a carnival ride) */
  autoRotate: boolean
}

/**
 * Map / Keys: native OrbitControls auto-rotate + zoom.
 * CameraRig snaps home then yields; we own the camera while enabled.
 */
export function OrbitSpin({ enabled, autoRotate }: OrbitSpinProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { gl, camera } = useThree()

  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = 'none'
    el.style.userSelect = 'none'
    el.style.setProperty('-webkit-user-select', 'none')

    if (!enabled) {
      el.style.cursor = 'default'
      return
    }
    el.style.cursor = 'grab'
    const down = () => {
      el.style.cursor = 'grabbing'
    }
    const up = () => {
      el.style.cursor = 'grab'
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointerleave', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', up)
      el.removeEventListener('pointercancel', up)
      el.style.cursor = 'default'
    }
  }, [enabled, gl])

  useEffect(() => {
    const c = controls.current
    if (!c) return

    const t = CONSTELLATION_ORBIT.target
    c.enabled = enabled
    c.autoRotate = enabled && autoRotate
    c.autoRotateSpeed = CONSTELLATION_ORBIT.autoRotateSpeed
    c.target.set(t.x, t.y, t.z)
    c.minDistance = CONSTELLATION_ORBIT.minDistance
    c.maxDistance = CONSTELLATION_ORBIT.maxDistance

    if (enabled) {
      // Sync spherical state from wherever CameraRig placed the camera.
      c.object.position.copy(camera.position)
      c.update()
    }
  }, [enabled, autoRotate, camera])

  // Keep damping + autoRotate alive even if drei skips a frame.
  useFrame(() => {
    const c = controls.current
    if (!c || !enabled) return
    c.update()
  })

  const t = CONSTELLATION_ORBIT.target

  return (
    <OrbitControls
      ref={controls}
      enabled={enabled}
      makeDefault
      enablePan={false}
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.75}
      minDistance={CONSTELLATION_ORBIT.minDistance}
      maxDistance={CONSTELLATION_ORBIT.maxDistance}
      minPolarAngle={Math.PI * 0.16}
      maxPolarAngle={Math.PI * 0.74}
      autoRotate={enabled && autoRotate}
      autoRotateSpeed={CONSTELLATION_ORBIT.autoRotateSpeed}
      target={[t.x, t.y, t.z]}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  )
}
