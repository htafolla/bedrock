import { lazy, Suspense, useMemo, useState } from 'react'
import type { BedrockDocument } from '../../types/content'
import { useExperience } from '../../hooks/useExperience'
import { useMediaCapability } from '../../hooks/useMediaCapability'
import { ArrivalGate } from './ArrivalGate'
import { ConstellationHud } from './ConstellationHud'
import { ChamberFocus } from './ChamberFocus'
import { KeyChips } from './KeyChips'
import { TableOfContents } from './TableOfContents'
import { NavModes, type NavMode } from './NavModes'
import { SealedTestimony } from '../SealedTestimony'
import { FallbackAtmosphere } from '../scene/FallbackAtmosphere'

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
  /** Always open on Keys so crisis chips (God · Fear · Marriage…) lead navigation. */
  const [navMode, setNavMode] = useState<NavMode>('keys')

  const activeChamber = useMemo(() => {
    if (!state.activeChamberId) return null
    return document.chambers.find((c) => c.id === state.activeChamberId) ?? null
  }, [document.chambers, state.activeChamberId])

  const showScene = allow3d && state.mode !== 'arrival'
  const sceneInteractive = state.mode === 'constellation' && navMode === 'map'

  const selectChamber = (id: string) => {
    openChamber(id)
    setNavMode('map')
  }

  const goToMap = () => {
    backToMap()
    setNavMode('map')
  }

  return (
    <div className={`experience mode-${state.mode} nav-${navMode}`}>
      {allow3d && state.mode === 'arrival' ? (
        <Suspense fallback={<FallbackAtmosphere />}>
          <BedrockScene
            mode="arrival"
            chambers={document.chambers}
            activeChamberId={null}
            onSelectChamber={selectChamber}
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
            onSelectChamber={selectChamber}
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

        {state.mode !== 'arrival' ? (
          <div className="experience-main-with-nav">
            {/* Top: Keys · Map · Contents */}
            <NavModes mode={navMode} onChange={setNavMode} />

            <div className="experience-main">
              {state.mode === 'constellation' && navMode === 'keys' ? (
                <KeyChips
                  activeChamberId={state.activeChamberId}
                  onSelect={selectChamber}
                />
              ) : null}

              {state.mode === 'constellation' && navMode === 'map' ? (
                <ConstellationHud
                  chambers={document.chambers}
                  activeChamberId={state.activeChamberId}
                  onSelect={selectChamber}
                  fallbackList={!allow3d}
                />
              ) : null}

              {state.mode === 'constellation' && navMode === 'toc' ? (
                <TableOfContents
                  chambers={document.chambers}
                  activeChamberId={state.activeChamberId}
                  onSelect={selectChamber}
                />
              ) : null}

              {state.mode === 'chamber' && activeChamber ? (
                <>
                  {navMode === 'toc' ? (
                    <TableOfContents
                      chambers={document.chambers}
                      activeChamberId={state.activeChamberId}
                      onSelect={selectChamber}
                    />
                  ) : null}
                  {navMode === 'keys' ? (
                    <KeyChips
                      activeChamberId={state.activeChamberId}
                      onSelect={selectChamber}
                    />
                  ) : null}
                  {navMode === 'map' ? (
                    <ChamberFocus
                      document={document}
                      chamber={activeChamber}
                      onBack={goToMap}
                      onSelect={selectChamber}
                      onSpineStep={spineStep}
                    />
                  ) : null}
                </>
              ) : null}

              {state.mode === 'constellation' && navMode === 'keys' ? (
                <div className="experience-footer-stack">
                  <SealedTestimony testimony={document.testimony} />
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
        ) : null}
      </div>
    </div>
  )
}
