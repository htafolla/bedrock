import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Mesh } from 'three'
import * as THREE from 'three'
import type { Chamber } from '../../types/content'
import type { NodePose } from '../../lib/spine'
import type { ExperienceMode } from '../../types/experience'

interface ConstellationGraphProps {
  chambers: Chamber[]
  poses: NodePose[]
  mode: ExperienceMode
  activeChamberId: string | null
  onSelect: (id: string) => void
}

function undirectedEdges(chambers: Chamber[]): Array<[string, string]> {
  const seen = new Set<string>()
  const edges: Array<[string, string]> = []
  for (const c of chambers) {
    for (const r of c.related) {
      const key = c.id < r ? `${c.id}::${r}` : `${r}::${c.id}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([c.id, r])
    }
  }
  return edges
}

function ChamberNode({
  pose,
  title,
  active,
  dimmed,
  interactive,
  entering,
  onSelect,
}: {
  pose: NodePose
  title: string
  active: boolean
  dimmed: boolean
  interactive: boolean
  entering: boolean
  onSelect: (id: string) => void
}) {
  const ref = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const enterPulse = useRef(0)
  const anchor = pose.anchor

  useFrame((state) => {
    if (!ref.current) return
    if (entering) {
      enterPulse.current = Math.min(1, enterPulse.current + 0.08)
    } else {
      enterPulse.current = Math.max(0, enterPulse.current - 0.06)
    }
    // Anchors (warfare, Spirit hub, gifts…) read as larger cluster heads.
    const rest = anchor ? 0.22 : 0.13
    const hot = anchor ? 0.3 : 0.24
    const base = active || entering ? hot : hovered ? rest * 1.22 : rest
    const pulse =
      Math.sin(state.clock.elapsedTime * (active || entering ? 2.6 : anchor ? 1.4 : 1.1) + pose.index) *
      (anchor ? 0.02 : 0.012)
    const burst = enterPulse.current * (anchor ? 0.16 : 0.12)
    ref.current.scale.setScalar(base + pulse + burst)
  })

  const color = active || entering
    ? '#f0d9a8'
    : hovered
      ? '#e0c898'
      : anchor
        ? '#e0c090'
        : pose.onSpine
          ? '#c4a574'
          : '#8a7a68'
  const emissive = active || entering ? '#e8a050' : anchor ? '#c47830' : '#a85c20'
  // Keep neighbors readable in chamber focus so the path still “stays behind.”
  const opacity = dimmed && !active && !entering ? (anchor ? 0.55 : 0.38) : 0.95
  // Labels only on hover / active — permanent hub labels clutter mobile DNA.
  const showLabel = interactive && (hovered || active || entering)

  const bind = {
    onClick: (e: { stopPropagation: () => void }) => {
      if (!interactive) return
      e.stopPropagation()
      onSelect(pose.id)
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      if (!interactive) return
      e.stopPropagation()
      setHovered(true)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHovered(false)
      document.body.style.cursor = 'auto'
    },
  }

  const hitR = anchor ? 1.05 : 0.78
  const ringInner = anchor ? 0.42 : 0.34
  const ringOuter = anchor ? 0.55 : 0.44
  const labelY = anchor ? 0.72 : 0.55

  return (
    <group position={pose.position.toArray()}>
      <mesh ref={ref} {...bind}>
        <sphereGeometry args={[1, anchor ? 32 : 24, anchor ? 32 : 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={
            active || entering ? 1.2 : hovered ? 0.7 : anchor ? 0.62 : pose.onSpine ? 0.38 : 0.2
          }
          roughness={0.4}
          metalness={anchor ? 0.32 : 0.25}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Quiet halo marks hub topics that stitch the spine together */}
      {anchor && !active && !entering ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringInner, ringOuter, 48]} />
          <meshBasicMaterial
            color="#c4a574"
            transparent
            opacity={dimmed ? 0.22 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      {active || entering ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringInner, ringOuter, 48]} />
          <meshBasicMaterial
            color="#e8a050"
            transparent
            opacity={entering ? 0.85 : 0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      <mesh visible={false} {...bind}>
        <sphereGeometry args={[hitR, 12, 12]} />
        <meshBasicMaterial />
      </mesh>
      {showLabel ? (
        <Html
          center
          distanceFactor={anchor ? 16 : 14}
          position={[0, labelY, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          zIndexRange={[20, 0]}
        >
          <div
            className={`dna-node-label${entering ? ' entering' : ''}${active ? ' active' : ''}${anchor ? ' anchor' : ''}`}
          >
            {title}
          </div>
        </Html>
      ) : null}
    </group>
  )
}

export function ConstellationGraph({
  chambers,
  poses,
  mode,
  activeChamberId,
  onSelect,
}: ConstellationGraphProps) {
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const titleById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of chambers) m.set(c.id, c.title)
    return m
  }, [chambers])

  const poseMap = useMemo(() => {
    const m = new Map<string, NodePose>()
    for (const p of poses) m.set(p.id, p)
    return m
  }, [poses])

  const edgePositions = useMemo(() => {
    const edges = undirectedEdges(chambers)
    const segments: number[] = []
    for (const [a, b] of edges) {
      const pa = poseMap.get(a)
      const pb = poseMap.get(b)
      if (!pa || !pb) continue
      segments.push(
        pa.position.x,
        pa.position.y,
        pa.position.z,
        pb.position.x,
        pb.position.y,
        pb.position.z,
      )
    }
    return new Float32Array(segments)
  }, [chambers, poseMap])

  const spineLine = useMemo(() => {
    const ordered = [...poses].sort((a, b) => a.index - b.index).filter((p) => p.onSpine)
    const arr = new Float32Array(ordered.length * 3)
    ordered.forEach((p, i) => {
      arr[i * 3] = p.position.x
      arr[i * 3 + 1] = p.position.y
      arr[i * 3 + 2] = p.position.z
    })
    return arr
  }, [poses])

  const interactive = mode === 'constellation'
  const dimmed = mode === 'chamber'

  const handleSelect = (id: string) => {
    if (!interactive || enteringId) return
    // Slight enter pulse, but keep orbit camera free (CameraRig must not re-home)
    setEnteringId(id)
    window.setTimeout(() => {
      onSelect(id)
      window.setTimeout(() => setEnteringId(null), 400)
    }, 220)
  }

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[spineLine, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#c4a574" transparent opacity={dimmed ? 0.22 : 0.35} />
      </line>

      {edgePositions.length > 0 ? (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#5c4f42" transparent opacity={dimmed ? 0.12 : 0.18} />
        </lineSegments>
      ) : null}

      {poses.map((pose) => (
        <ChamberNode
          key={pose.id}
          pose={pose}
          title={titleById.get(pose.id) ?? pose.id}
          active={pose.id === activeChamberId}
          entering={pose.id === enteringId}
          dimmed={dimmed}
          interactive={interactive && !enteringId}
          onSelect={handleSelect}
        />
      ))}
    </group>
  )
}
