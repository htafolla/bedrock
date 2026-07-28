import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { BedrockDocument } from '../../types/content'
import { useExperience } from '../../hooks/useExperience'
import { useMediaCapability } from '../../hooks/useMediaCapability'
import { useNavModePreference } from '../../hooks/useNavModePreference'
import { useThemePreference } from '../../hooks/useThemePreference'
import { DEFAULT_NAV_MODE } from '../../lib/nav-preference'
import {
  parseChamberFromLocation,
  parseJourneyFromLocation,
  setChamberQuery,
} from '../../lib/path-routing'
import { getJourney } from '../../lib/journeys'
import { scrollExperienceToTop } from '../../lib/scroll-top'
import { trackEvent, trackPageview } from '../../lib/analytics'
import { ArrivalGate } from './ArrivalGate'
import { ConstellationHud } from './ConstellationHud'
import { ChamberFocus } from './ChamberFocus'
import { GuideChat } from './GuideChat'
import { KeyChips } from './KeyChips'
import { JourneyPanel } from './JourneyPanel'
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

  const deepLink = useMemo(() => {
    if (typeof window === 'undefined') {
      return { chamberId: null as string | null, journeyId: null as string | null }
    }
    const journeyRaw = parseJourneyFromLocation()
    const journey = journeyRaw ? getJourney(journeyRaw) : null
    const chamberRaw = parseChamberFromLocation()
    const chamberFromQuery =
      chamberRaw && document.chambers.some((c) => c.id === chamberRaw) ? chamberRaw : null
    // ?j= opens the journey door when ?c= is absent or invalid
    const chamberId =
      chamberFromQuery ||
      (journey && document.chambers.some((c) => c.id === journey.doorChamberId)
        ? journey.doorChamberId
        : null)
    return {
      chamberId,
      journeyId: journey?.id ?? null,
    }
  }, [document.chambers])

  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(deepLink.journeyId)

  const { state, enterNave, openChamber, backToMap, spineStep } = useExperience({
    initialChamberId: deepLink.chamberId,
  })
  /** Preferred Keys · Map · Contents — localStorage-backed. */
  const { navMode, setNavMode } = useNavModePreference()
  /** Dark default; light available — localStorage-backed. */
  const { theme, toggleTheme } = useThemePreference()

  const activeChamber = useMemo(() => {
    if (!state.activeChamberId) return null
    return document.chambers.find((c) => c.id === state.activeChamberId) ?? null
  }, [document.chambers, state.activeChamberId])

  const activeJourney = useMemo(
    () => (activeJourneyId ? getJourney(activeJourneyId) : null),
    [activeJourneyId],
  )

  // Keep shareable ?c= / ?j= in sync with open chamber + journey
  useEffect(() => {
    if (state.mode === 'chamber' && state.activeChamberId) {
      setChamberQuery(state.activeChamberId, { journeyId: activeJourneyId })
      const path = activeJourneyId
        ? `/?j=${activeJourneyId}&c=${state.activeChamberId}`
        : `/?c=${state.activeChamberId}`
      trackPageview(path)
    } else if (state.mode === 'constellation') {
      // Keep journey context on the Journeys tab; only drop chamber from URL
      setChamberQuery(null, { journeyId: activeJourneyId })
    } else if (state.mode === 'arrival') {
      setChamberQuery(null, { journeyId: null })
      setActiveJourneyId(null)
    }
  }, [state.mode, state.activeChamberId, activeJourneyId])

  const showScene = allow3d && state.mode !== 'arrival'
  // DNA interactive on Keys / Journeys / Map. Contents stays list-first.
  const sceneInteractive =
    state.mode === 'constellation' &&
    (navMode === 'map' || navMode === 'keys' || navMode === 'journeys')

  const selectChamber = useCallback(
    (id: string, source: string = 'ui', journeyId?: string | null) => {
      trackEvent(source === 'keys' ? 'key_tap' : 'open_chamber', {
        chamberId: id,
        source,
        nav: navMode,
        journeyId: journeyId || undefined,
      })
      if (journeyId) setActiveJourneyId(journeyId)
      else if (source === 'keys' || source === 'ui') {
        // Opening a door without journey id clears path context
        setActiveJourneyId(null)
      }
      openChamber(id)
      // Do not override preferred nav mode — chamber focus always shows while reading.
      scrollExperienceToTop()
    },
    [openChamber, navMode],
  )

  /** Leave chamber; keep journey path context for the Journeys tab. */
  const leaveChamber = useCallback(() => {
    setChamberQuery(null, { journeyId: activeJourneyId })
    backToMap()
  }, [backToMap, activeJourneyId])

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

  /** Brand mark → home: default Keys surface, leave any chamber, clear journey. */
  const goHome = useCallback(() => {
    setNavMode(DEFAULT_NAV_MODE)
    setActiveJourneyId(null)
    setChamberQuery(null, { journeyId: null })
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
            {/* Top: Keys · Journeys · Map · Contents */}
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
                  onSelect={(id, journeyId) => selectChamber(id, 'keys', journeyId)}
                />
              ) : null}

              {state.mode === 'constellation' && navMode === 'journeys' ? (
                <JourneyPanel
                  activeJourneyId={activeJourneyId}
                  activeChamberId={state.activeChamberId}
                  onSelectJourney={(journeyId, chamberId) => {
                    trackEvent('open_chamber', {
                      chamberId,
                      source: 'journeys',
                      nav: 'journeys',
                      journeyId,
                    })
                    setActiveJourneyId(journeyId)
                    openChamber(chamberId)
                    scrollExperienceToTop()
                  }}
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
        (navMode === 'keys' || navMode === 'journeys' || navMode === 'map') ? (
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
                  journeyId: activeJourney?.id,
                  journeyTitle: activeJourney?.title,
                }
              : activeJourney
                ? {
                    journeyId: activeJourney.id,
                    journeyTitle: activeJourney.title,
                  }
                : undefined
          }
          chambers={document.chambers.map((c) => ({ id: c.id, title: c.title }))}
          onOpenChamber={(id) => selectChamber(id, 'guide', activeJourneyId)}
        />
      ) : null}
    </div>
  )
}
