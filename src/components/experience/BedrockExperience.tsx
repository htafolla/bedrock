import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react'
import type { BedrockDocument } from '../../types/content'
import { useExperience } from '../../hooks/useExperience'
import { useMediaCapability } from '../../hooks/useMediaCapability'
import { useNavModePreference } from '../../hooks/useNavModePreference'
import { useThemePreference } from '../../hooks/useThemePreference'
import { DEFAULT_NAV_MODE } from '../../lib/nav-preference'
import { parseChamberFromLocation, setChamberQuery } from '../../lib/path-routing'
import { scrollExperienceToTop } from '../../lib/scroll-top'
import { trackEvent, trackPageview } from '../../lib/analytics'
import { ArrivalGate } from './ArrivalGate'
import { ConstellationHud } from './ConstellationHud'
import { ChamberFocus } from './ChamberFocus'
import { GuideChat } from './GuideChat'
import { KeyChips } from './KeyChips'
import { TableOfContents } from './TableOfContents'
import { NavModes, type NavMode } from './NavModes'
import { ThemeToggle } from './ThemeToggle'
import { SeoHead } from '../SeoHead'
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

  const deepLinkId = useMemo(() => {
    if (typeof window === 'undefined') return null
    const raw = parseChamberFromLocation()
    if (!raw) return null
    return document.chambers.some((c) => c.id === raw) ? raw : null
  }, [document.chambers])

  const { state, enterNave, openChamber, backToMap, spineStep } = useExperience({
    initialChamberId: deepLinkId,
  })
  /** Preferred Keys · Map · Contents — localStorage-backed. */
  const { navMode, setNavMode } = useNavModePreference()
  /** Dark default; light available — localStorage-backed. */
  const { theme, toggleTheme } = useThemePreference()

  const activeChamber = useMemo(() => {
    if (!state.activeChamberId) return null
    return document.chambers.find((c) => c.id === state.activeChamberId) ?? null
  }, [document.chambers, state.activeChamberId])

  // Keep shareable ?c= in sync with open chamber (canonical /c/:id is static HTML for AI/SEO)
  useEffect(() => {
    if (state.mode === 'chamber' && state.activeChamberId) {
      setChamberQuery(state.activeChamberId)
      trackPageview(`/?c=${state.activeChamberId}`)
    } else if (state.mode === 'constellation' || state.mode === 'arrival') {
      setChamberQuery(null)
    }
  }, [state.mode, state.activeChamberId])

  const showScene = allow3d && state.mode !== 'arrival'
  // DNA interactive on Keys and Map (same orbit/click). Contents stays list-first.
  const sceneInteractive =
    state.mode === 'constellation' && (navMode === 'map' || navMode === 'keys')

  const selectChamber = useCallback(
    (id: string, source: string = 'ui') => {
      trackEvent(source === 'keys' ? 'key_tap' : 'open_chamber', {
        chamberId: id,
        source,
        nav: navMode,
      })
      openChamber(id)
      // Do not override preferred nav mode — chamber focus always shows while reading.
      scrollExperienceToTop()
    },
    [openChamber, navMode],
  )

  /** Leave chamber; keep user’s preferred header tab. */
  const leaveChamber = useCallback(() => {
    setChamberQuery(null)
    backToMap()
  }, [backToMap])

  /** Tab switch: persist preference; if reading, return to that surface. */
  const onNavChange = useCallback(
    (mode: NavMode) => {
      trackEvent('nav', { nav: mode, source: 'header' })
      setNavMode(mode)
      if (state.mode === 'chamber') {
        backToMap()
      }
    },
    [setNavMode, state.mode, backToMap],
  )

  /** Brand mark → home: default Keys surface, leave any chamber. */
  const goHome = useCallback(() => {
    setNavMode(DEFAULT_NAV_MODE)
    if (state.mode === 'chamber') {
      backToMap()
    }
    scrollExperienceToTop()
  }, [setNavMode, state.mode, backToMap])

  return (
    <div className={`experience mode-${state.mode} nav-${navMode}`}>
      <SeoHead document={document} chamber={state.mode === 'chamber' ? activeChamber : null} />
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
          <>
            <div className="arrival-theme-slot">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
            <ArrivalGate
              title={document.meta.title}
              subtitle={document.meta.subtitle}
              tagline={document.meta.tagline}
              mission={document.meta.mission}
              prologue={document.prologue?.lines}
              onEnter={() => {
                trackEvent('enter', { source: 'arrival' })
                enterNave()
              }}
            />
          </>
        ) : null}

        {state.mode !== 'arrival' ? (
          <div className="experience-main-with-nav">
            {/* Top: Keys · Map · Contents — Map uses same storm doors as Keys; no sealed word. */}
            <NavModes
              mode={navMode}
              onChange={onNavChange}
              theme={theme}
              onToggleTheme={toggleTheme}
              onHome={goHome}
            />

            <div className="experience-main">
              {state.mode === 'constellation' && navMode === 'keys' ? (
                <KeyChips
                  activeChamberId={state.activeChamberId}
                  onSelect={(id) => selectChamber(id, 'keys')}
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
                <ChamberFocus
                  document={document}
                  chamber={activeChamber}
                  onBack={leaveChamber}
                  onSelect={selectChamber}
                  onSpineStep={spineStep}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Viewport-fixed footer — outside nested chrome so mobile always pins bottom */}
        {state.mode === 'constellation' &&
        (navMode === 'keys' || navMode === 'map') ? (
          <div className="experience-footer-stack" role="contentinfo">
            <footer className="site-footer compact">
              <p>Standing on something solid.</p>
              <p className="site-footer-meta">
                Public beta · v{document.meta.version} · revised {document.meta.revised}
              </p>
            </footer>
          </div>
        ) : null}
      </div>

      {state.mode !== 'arrival' ? (
        <GuideChat
          context={
            activeChamber
              ? {
                  chamberId: activeChamber.id,
                  chamberTitle: activeChamber.title,
                  chamberSummary: activeChamber.summary,
                }
              : undefined
          }
          chambers={document.chambers.map((c) => ({ id: c.id, title: c.title }))}
          onOpenChamber={selectChamber}
        />
      ) : null}
    </div>
  )
}
