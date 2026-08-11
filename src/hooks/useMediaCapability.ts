import { useEffect, useState } from 'react'

/**
 * Viewport / capability detection.
 * Mobile-first: SSR/default assumes narrow (phone).
 * Breakpoints aligned with CSS: 420 / 640 / 768 / 900
 */
export interface MediaCapability {
  /** Prefer WebGL atmosphere when true */
  allow3d: boolean
  reducedMotion: boolean
  /** max-width 768 — Keys carousel vs grid, etc. */
  isNarrow: boolean
  /** max-width 640 — large phone */
  isPhone: boolean
}

function detect(): MediaCapability {
  if (typeof window === 'undefined') {
    return { allow3d: false, reducedMotion: true, isNarrow: true, isPhone: true }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isNarrow = window.matchMedia('(max-width: 768px)').matches
  const isPhone = window.matchMedia('(max-width: 640px)').matches

  let webgl = false
  try {
    const canvas = document.createElement('canvas')
    webgl = Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    )
  } catch {
    webgl = false
  }

  // DNA map is the hero surface — allow WebGL on mobile when available.
  // Reduced-motion still skips 3D (a11y).
  const allow3d = webgl && !reducedMotion

  return { allow3d, reducedMotion, isNarrow, isPhone }
}

export function useMediaCapability(): MediaCapability {
  const [cap, setCap] = useState<MediaCapability>(() => detect())

  useEffect(() => {
    const update = () => setCap(detect())
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqNarrow = window.matchMedia('(max-width: 768px)')
    const mqPhone = window.matchMedia('(max-width: 640px)')
    mqMotion.addEventListener('change', update)
    mqNarrow.addEventListener('change', update)
    mqPhone.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mqMotion.removeEventListener('change', update)
      mqNarrow.removeEventListener('change', update)
      mqPhone.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return cap
}
