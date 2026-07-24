import { lazy, Suspense, useEffect, useMemo } from 'react'
import type { BedrockDocument } from '../../types/content'
import { useExperience } from '../../hooks/useExperience'
import { useMediaCapability } from '../../hooks/useMediaCapability'
import { ArrivalGate } from './ArrivalGate'
import { ConstellationHud } from './ConstellationHud'
import { ChamberFocus } from './ChamberFocus'
import { SealedTestimony } from '../SealedTestimony'
import { PermanenceBadge } from '../PermanenceBadge'
import { FallbackAtmosphere } from '../scene/FallbackAtmosphere'
import { buildPermanenceRecord, createLocalPermanenceAdapter } from '../../lib/permanence'
import { useState } from 'react'

const BedrockScene = lazy(async () => {
  const mod = await import('../scene/BedrockScene')
  return { default: mod.BedrockScene }
})

interface BedrockExperienceProps {
  document: BedrockDocument
}

export function BedrockExperience({ document }: BedrockExperienceProps) {
  const { allow3d, reducedMotion } = useMediaCapability()
  const { state, enterNave, openChamber, backToMap, spineStep } = useExperience()
  const [localHash, setLocalHash] = useState<string | null>(null)

  const activeChamber = useMemo(() => {
    if (!state.activeChamberId) return null
    return document.chambers.find((c) => c.id === state.activeChamberId) ?? null
  }, [document.chambers, state.activeChamberId])

  useEffect(() => {
    let cancelled = false
    void buildPermanenceRecord(document, createLocalPermanenceAdapter()).then((record) => {
      if (!cancelled) setLocalHash(record.contentHash)
    })
    return () => {
      cancelled = true
    }
  }, [document])

  const showScene = allow3d && state.mode !== 'arrival'
  const sceneInteractive = state.mode === 'constellation'

  return (
    <div className={`experience mode-${state.mode}`}>
      {allow3d && state.mode === 'arrival' ? (
        <Suspense fallback={<FallbackAtmosphere />}>
          <BedrockScene
            mode="arrival"
            chambers={document.chambers}
            activeChamberId={null}
            onSelectChamber={openChamber}
            reducedMotion={reducedMotion}
            interactive={false}
          />
        </Suspense>
      ) : null}

      {showScene ? (
        <Suspense fallback={<FallbackAtmosphere />}>
          <BedrockScene
            mode={state.mode === 'chamber' ? 'chamber' : 'constellation'}
            chambers={document.chambers}
            activeChamberId={state.activeChamberId}
            onSelectChamber={openChamber}
            reducedMotion={reducedMotion}
            interactive={sceneInteractive}
          />
        </Suspense>
      ) : (
        <FallbackAtmosphere />
      )}

      <div className="experience-ui">
        {state.mode === 'arrival' ? (
          <ArrivalGate
            title={document.meta.title}
            subtitle={document.meta.subtitle}
            tagline={document.meta.tagline}
            mission={document.meta.mission}
            prologue={document.prologue?.lines}
            onEnter={enterNave}
          />
        ) : null}

        {state.mode === 'constellation' ? (
          <ConstellationHud
            chambers={document.chambers}
            activeChamberId={state.activeChamberId}
            onSelect={openChamber}
            fallbackList={!allow3d}
          />
        ) : null}

        {state.mode === 'chamber' && activeChamber ? (
          <ChamberFocus
            document={document}
            chamber={activeChamber}
            onBack={backToMap}
            onSelect={openChamber}
            onSpineStep={spineStep}
          />
        ) : null}

        {state.mode !== 'arrival' ? (
          <div className="experience-footer-stack">
            {state.mode === 'constellation' ? (
              <SealedTestimony testimony={document.testimony} />
            ) : null}
            <PermanenceBadge meta={document.meta} localHash={localHash} />
            <footer className="site-footer compact">
              <p>Standing on something solid.</p>
              <p className="site-footer-meta">
                v{document.meta.version} · revised {document.meta.revised}
              </p>
            </footer>
          </div>
        ) : null}
      </div>
    </div>
  )
}
