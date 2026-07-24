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

  useFrame((state) => {
    if (!ref.current) return
    if (entering) {
      enterPulse.current = Math.min(1, enterPulse.current + 0.08)
    } else {
      enterPulse.current = Math.max(0, enterPulse.current - 0.06)
    }
    const base = active || entering ? 0.24 : hovered ? 0.18 : 0.14
    const pulse =
      Math.sin(state.clock.elapsedTime * (active || entering ? 2.6 : 1.1) + pose.index) * 0.015
    const burst = enterPulse.current * 0.14
    ref.current.scale.setScalar(base + pulse + burst)
  })

  const color = active || entering ? '#f0d9a8' : hovered ? '#e0c898' : pose.onSpine ? '#c4a574' : '#8a7a68'
  const emissive = active || entering ? '#e8a050' : '#a85c20'
  const opacity = dimmed && !active && !entering ? 0.22 : 0.95
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

  return (
    <group position={pose.position.toArray()}>
      <mesh ref={ref} {...bind}>
        <sphereGeometry args={[1, 28, 28]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={active || entering ? 1.15 : hovered ? 0.65 : pose.onSpine ? 0.42 : 0.2}
          roughness={0.4}
          metalness={0.25}
          transparent
          opacity={opacity}
        />
      </mesh>
      {active || entering ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.44, 48]} />
          <meshBasicMaterial
            color="#e8a050"
            transparent
            opacity={entering ? 0.85 : 0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      <mesh visible={false} {...bind}>
        <sphereGeometry args={[0.78, 12, 12]} />
        <meshBasicMaterial />
      </mesh>
      {showLabel ? (
        <Html
          center
          distanceFactor={14}
          position={[0, 0.55, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          zIndexRange={[20, 0]}
        >
          <div className={`dna-node-label${entering ? ' entering' : ''}${active ? ' active' : ''}`}>
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
    setEnteringId(id)
    window.setTimeout(() => {
      onSelect(id)
      // Clear pulse after parent has switched; keep ring via activeChamberId
      window.setTimeout(() => setEnteringId(null), 600)
    }, 380)
  }

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[spineLine, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#c4a574" transparent opacity={dimmed ? 0.12 : 0.35} />
      </line>

      {edgePositions.length > 0 ? (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#5c4f42" transparent opacity={dimmed ? 0.06 : 0.18} />
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
