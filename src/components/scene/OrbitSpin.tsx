import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface OrbitSpinProps {
  enabled: boolean
  /** Soft idle turn of the view (not a carnival ride) */
  autoRotate: boolean
}

/**
 * Spin / zoom / orbit the DNA on Map.
 * Disabled in chamber & arrival so the guided camera keeps control.
 */
export function OrbitSpin({ enabled, autoRotate }: OrbitSpinProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
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
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', up)
      el.style.cursor = 'default'
    }
  }, [enabled, gl])

  useEffect(() => {
    if (controls.current) {
      controls.current.enabled = enabled
    }
  }, [enabled])

  return (
    <OrbitControls
      ref={controls}
      enabled={enabled}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minDistance={8}
      maxDistance={42}
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.72}
      autoRotate={enabled && autoRotate}
      autoRotateSpeed={0.35}
      target={[0, 1.6, -4]}
    />
  )
}
