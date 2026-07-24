import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Points } from 'three'
import type { Chamber } from '../../types/content'
import type { ExperienceMode } from '../../types/experience'
import { buildNodePoses, orderChambersBySpine } from '../../lib/spine'
import { CameraRig } from './CameraRig'
import { ConstellationGraph } from './ConstellationGraph'

interface BedrockSceneProps {
  mode: ExperienceMode
  chambers: Chamber[]
  activeChamberId: string | null
  onSelectChamber: (id: string) => void
  reducedMotion: boolean
  /** When true, canvas receives pointer events (constellation) */
  interactive: boolean
}

function Embers({ count = 64, intensity = 1 }: { count?: number; intensity?: number }) {
  const ref = useRef<Points>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14
      arr[i * 3 + 1] = Math.random() * 5 - 0.5
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22
    }
    return arr
  }, [count])

  useFrame((state) => {
    const points = ref.current
    if (!points) return
    const t = state.clock.elapsedTime
    const pos = points.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      const y = pos.getY(i) + 0.003 * intensity + Math.sin(t * 0.35 + i) * 0.0008
      pos.setY(i, y > 4.5 ? -0.8 : y)
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#e8a050"
        transparent
        opacity={0.4 * intensity}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, -2]} receiveShadow={false}>
      <circleGeometry args={[28, 64]} />
      <meshStandardMaterial color="#14110e" roughness={0.96} metalness={0.02} />
    </mesh>
  )
}

function EntranceCrucible({ visible }: { visible: boolean }) {
  const group = useRef<Group>(null)
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 0.35) * 0.05
    group.current.visible = visible
  })
  return (
    <group ref={group} position={[0, 0.15, 8.2]}>
      <mesh>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial
          color="#c4a574"
          emissive="#a85c20"
          emissiveIntensity={visible ? 0.4 : 0.1}
          roughness={0.45}
          metalness={0.35}
        />
      </mesh>
      <pointLight color="#ffb060" intensity={visible ? 1.8 : 0.4} distance={7} decay={2} />
    </group>
  )
}

function Atmosphere({ mode }: { mode: ExperienceMode }) {
  const emberIntensity = mode === 'chamber' ? 0.45 : 1
  return (
    <>
      <color attach="background" args={['#0c0a09']} />
      <fog attach="fog" args={['#0c0a09', mode === 'constellation' ? 12 : 5, mode === 'constellation' ? 36 : 20]} />
      <ambientLight intensity={mode === 'chamber' ? 0.1 : 0.16} color="#8a7a68" />
      <directionalLight position={[5, 12, 4]} intensity={mode === 'chamber' ? 0.25 : 0.4} color="#f5e6c8" />
      <spotLight
        position={[0, 14, 2]}
        angle={0.4}
        penumbra={0.85}
        intensity={mode === 'chamber' ? 0.5 : 1.0}
        color="#ffe0b0"
      />
      <Stars radius={50} depth={40} count={mode === 'chamber' ? 600 : 1400} factor={2} saturation={0} fade speed={0.15} />
      <Ground />
      <EntranceCrucible visible={mode !== 'chamber'} />
      <Embers intensity={emberIntensity} />
    </>
  )
}

/** Immersive hybrid scene: nave spine + constellation + camera rig. */
export function BedrockScene({
  mode,
  chambers,
  activeChamberId,
  onSelectChamber,
  reducedMotion,
  interactive,
}: BedrockSceneProps) {
  const ordered = useMemo(() => orderChambersBySpine(chambers), [chambers])
  const poses = useMemo(() => buildNodePoses(ordered.map((c) => c.id)), [ordered])

  return (
    <div
      className={`scene-root ${interactive ? 'scene-interactive' : 'scene-passive'}`}
      aria-hidden={!interactive}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.45, 11.2], fov: 42, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Atmosphere mode={mode} />
          <ConstellationGraph
            chambers={ordered}
            poses={poses}
            mode={mode}
            activeChamberId={activeChamberId}
            onSelect={onSelectChamber}
          />
          <CameraRig
            mode={mode}
            poses={poses}
            activeChamberId={activeChamberId}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
