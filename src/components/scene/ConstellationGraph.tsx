import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
  active,
  dimmed,
  interactive,
  onSelect,
}: {
  pose: NodePose
  active: boolean
  dimmed: boolean
  interactive: boolean
  onSelect: (id: string) => void
}) {
  const ref = useRef<Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const base = active ? 0.16 : 0.1
    const pulse = Math.sin(state.clock.elapsedTime * (active ? 2.2 : 1.1) + pose.index) * 0.012
    ref.current.scale.setScalar(base + pulse + (pose.onSpine ? 0.02 : 0))
  })

  const color = active ? '#f0d9a8' : pose.onSpine ? '#c4a574' : '#8a7a68'
  const emissive = active ? '#e8a050' : '#a85c20'
  const opacity = dimmed && !active ? 0.28 : 0.92

  return (
    <group position={pose.position.toArray()}>
      <mesh
        ref={ref}
        onClick={(e) => {
          if (!interactive) return
          e.stopPropagation()
          onSelect(pose.id)
        }}
        onPointerOver={(e) => {
          if (!interactive) return
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={active ? 0.85 : pose.onSpine ? 0.35 : 0.18}
          roughness={0.4}
          metalness={0.25}
          transparent
          opacity={opacity}
        />
      </mesh>
      {active ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.28, 48]} />
          <meshBasicMaterial color="#e8a050" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      {/* Invisible hit target for easier selection */}
      <mesh
        visible={false}
        onClick={(e) => {
          if (!interactive) return
          e.stopPropagation()
          onSelect(pose.id)
        }}
      >
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
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
      segments.push(pa.position.x, pa.position.y, pa.position.z, pb.position.x, pb.position.y, pb.position.z)
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

  return (
    <group>
      {/* Spine path */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[spineLine, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#c4a574" transparent opacity={dimmed ? 0.12 : 0.35} />
      </line>

      {/* Related web */}
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
          active={pose.id === activeChamberId}
          dimmed={dimmed}
          interactive={interactive}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
