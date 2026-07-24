import { useEffect, useState } from 'react'

export interface MediaCapability {
  /** Prefer WebGL atmosphere when true */
  allow3d: boolean
  reducedMotion: boolean
  isNarrow: boolean
}

function detect(): MediaCapability {
  if (typeof window === 'undefined') {
    return { allow3d: false, reducedMotion: true, isNarrow: true }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isNarrow = window.matchMedia('(max-width: 768px)').matches

  let webgl = false
  try {
    const canvas = document.createElement('canvas')
    webgl = Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    )
  } catch {
    webgl = false
  }

  // Light shell: skip 3D on narrow screens or reduced motion
  const allow3d = webgl && !reducedMotion && !isNarrow

  return { allow3d, reducedMotion, isNarrow }
}

export function useMediaCapability(): MediaCapability {
  const [cap, setCap] = useState<MediaCapability>(() => detect())

  useEffect(() => {
    const update = () => setCap(detect())
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqWidth = window.matchMedia('(max-width: 768px)')
    mqMotion.addEventListener('change', update)
    mqWidth.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mqMotion.removeEventListener('change', update)
      mqWidth.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return cap
}
