import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BedrockDocument } from '../../types/content'
import { useExperience } from '../../hooks/useExperience'
import { useMediaCapability } from '../../hooks/useMediaCapability'
import { useNavModePreference } from '../../hooks/useNavModePreference'
import { useThemePreference } from '../../hooks/useThemePreference'
import {
  parseChamberFromLocation,
  parseJourneyFromLocation,
  readAppLocationFromUrl,
  writeAppLocation,
} from '../../lib/path-routing'
import { getJourney } from '../../lib/journeys'
import { scrollExperienceToTop } from '../../lib/scroll-top'
import { trackEvent, trackPageview } from '../../lib/analytics'
import { useFieldState } from '../../hooks/useFieldState'
import { KEY_ENTRIES } from '../../lib/key-entries'
import {
  markPathStage as fieldMarkPathStage,
  markStationOpened as fieldMarkStationOpened,
} from '../../lib/field-state'
import { ArrivalGate } from './ArrivalGate'
import { ChamberFocus } from './ChamberFocus'
import { FieldPanel } from './FieldPanel'
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

  const { state, enterNave, openChamber, backToMap, spineStep, restore } = useExperience({
    initialChamberId: deepLink.chamberId,
  })
  /** Preferred Keys · Journeys · Field · Contents — localStorage-backed (About is session-only). */
  const { navMode, setNavMode, leaveAbout } = useNavModePreference()
  // About is always the static Origin page (/about) — never an SPA overlay
  /** Dark default; light available — localStorage-backed. */
  const { theme, toggleTheme } = useThemePreference()
  /** Field — always on: keys, stations, paths, stand, lock (device-local). */
  const field = useFieldState()

  /** Skip push when restoring from browser Back/Forward. */
  const skipHistoryRef = useRef(false)
  const historySeededRef = useRef(false)

  const activeChamber = useMemo(() => {
    if (!state.activeChamberId) return null
    return document.chambers.find((c) => c.id === state.activeChamberId) ?? null
  }, [document.chambers, state.activeChamberId])

  const activeJourney = useMemo(
    () => (activeJourneyId ? getJourney(activeJourneyId) : null),
    [activeJourneyId],
  )

  // Field: mark open + path when chamber focus changes (deep links, spine, history)
  useEffect(() => {
    if (state.mode !== 'chamber' || !state.activeChamberId) return
    fieldMarkStationOpened(state.activeChamberId)
    if (activeJourney) {
      const stageIdx = activeJourney.stages.findIndex((s) => s.chamberId === state.activeChamberId)
      if (stageIdx >= 0) {
        fieldMarkPathStage(
          activeJourney.id,
          stageIdx,
          state.activeChamberId,
          activeJourney.stages.length,
        )
      }
    }
    field.refresh()
  }, [state.mode, state.activeChamberId, activeJourney, field.refresh])

  // Push history on navigation so the browser Back button returns to the prior view
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      return
    }

    const chamberId =
      state.mode === 'chamber' ? state.activeChamberId : null
    const journeyId = state.mode === 'arrival' ? null : activeJourneyId
    const mode = state.mode

    if (!historySeededRef.current) {
      historySeededRef.current = true
      writeAppLocation({
        chamberId,
        journeyId,
        mode,
        method: 'replace',
      })
      return
    }

    writeAppLocation({
      chamberId,
      journeyId,
      mode,
      method: 'push',
    })

    if (state.mode === 'chamber' && state.activeChamberId) {
      const path = activeJourneyId
        ? `/?j=${activeJourneyId}&c=${state.activeChamberId}`
        : `/?c=${state.activeChamberId}`
      trackPageview(path)
    } else if (state.mode === 'constellation') {
      trackPageview(activeJourneyId ? `/?j=${activeJourneyId}` : '/')
    }
  }, [state.mode, state.activeChamberId, activeJourneyId])

  // Browser Back / Forward — restore from history.state + URL
  useEffect(() => {
    if (typeof window === 'undefined') return

    const onPopState = (event: PopStateEvent) => {
      skipHistoryRef.current = true
      const st = (event.state || {}) as {
        chamberId?: string | null
        journeyId?: string | null
        mode?: 'arrival' | 'constellation' | 'chamber'
      }
      const loc = readAppLocationFromUrl()
      const rawChamber = loc.chamberId ?? st.chamberId ?? null
      const chamberOk =
        rawChamber && document.chambers.some((c) => c.id === rawChamber) ? rawChamber : null
      const journeyId = loc.journeyId ?? st.journeyId ?? null
      setActiveJourneyId(journeyId)

      const mode = st.mode
      if (mode === 'arrival') {
        restore('arrival', null)
        setActiveJourneyId(null)
      } else if (mode === 'chamber' || chamberOk) {
        restore('chamber', chamberOk)
      } else {
        restore('constellation', chamberOk)
      }
      scrollExperienceToTop()
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [document.chambers, restore])

  const showScene = allow3d && state.mode !== 'arrival'
  // DNA interactive on Keys / Journeys. Contents stays list-first.
  const sceneInteractive =
    state.mode === 'constellation' && (navMode === 'keys' || navMode === 'journeys' || navMode === 'map')

  const selectChamber = useCallback(
    (id: string, source: string = 'ui', journeyId?: string | null) => {
      trackEvent(source === 'keys' ? 'key_tap' : 'open_chamber', {
        chamberId: id,
        source,
        nav: navMode,
        journeyId: journeyId || undefined,
      })
      /**
       * Path context only when:
       * - explicit path UI (journeys tab / stage rail / mind-path / guide), or
       * - key/station open where chamberId is that path’s door (never attach a
       *   mismatched journey that would mislabel Station as Path).
       */
      let pathId: string | null = null
      if (journeyId) {
        const j = getJourney(journeyId)
        const pathUi =
          source === 'journeys' ||
          source === 'journey-stage' ||
          source === 'rubric-mind-path' ||
          source === 'guide' ||
          source === 'field'
        const doorMatch = Boolean(j && j.doorChamberId === id)
        if (pathUi || doorMatch) {
          setActiveJourneyId(journeyId)
          pathId = journeyId
        } else setActiveJourneyId(null)
      } else if (source === 'journey-stage') {
        pathId = activeJourneyId
        // stay on active journey
      } else if (source === 'keys' || source === 'ui' || source === 'toc') {
        setActiveJourneyId(null)
      }

      // Field: station open + key management + path stage
      field.markStationOpened(id)
      if (source === 'keys') {
        const key = KEY_ENTRIES.find((k) => k.chamberId === id)
        if (key) field.markKeyOpened(key.id)
      }
      const jForPath = pathId ? getJourney(pathId) : activeJourneyId ? getJourney(activeJourneyId) : null
      if (jForPath) {
        const stageIdx = jForPath.stages.findIndex((s) => s.chamberId === id)
        if (stageIdx >= 0) {
          field.markPathStage(jForPath.id, stageIdx, id, jForPath.stages.length)
        }
      }

      openChamber(id)
      // Do not override preferred nav mode — chamber focus always shows while reading.
      scrollExperienceToTop()
    },
    [openChamber, navMode, field, activeJourneyId],
  )

  /** Leave chamber; keep journey path context for the Journeys tab. */
  const leaveChamber = useCallback(() => {
    backToMap()
  }, [backToMap])

  /** Tab switch: leave chamber and open that surface. About is /about (full page). */
  const onNavChange = useCallback(
    (mode: NavMode) => {
      trackEvent('nav', { nav: mode, source: 'header' })
      if (mode === 'about') {
        leaveAbout()
        if (typeof window !== 'undefined') window.location.assign('/about')
        return
      }
      setNavMode(mode)
      if (state.mode === 'chamber') {
        backToMap()
      }
    },
    [setNavMode, leaveAbout, state.mode, backToMap],
  )

  /** Brand mark → home: default Keys surface, leave chamber, clear journey. */
  const goHome = useCallback(() => {
    leaveAbout()
    setActiveJourneyId(null)
    if (state.mode === 'chamber') {
      backToMap()
    }
    scrollExperienceToTop()
  }, [leaveAbout, state.mode, backToMap])

  /** Rubric Field card → Battlefield of the mind journey (depth ladder: Path). */
  const openMindPath = useCallback(() => {
    const j = getJourney('battlefield-of-the-mind')
    if (!j) return
    trackEvent('open_chamber', {
      chamberId: j.doorChamberId,
      source: 'rubric-mind-path',
      nav: 'journeys',
      journeyId: j.id,
    })
    setActiveJourneyId(j.id)
    setNavMode('journeys')
    openChamber(j.doorChamberId)
    scrollExperienceToTop()
  }, [openChamber, setNavMode])

  const isRubricOpen =
    state.mode === 'chamber' && activeChamber?.kind === 'rubric'
  const isStanceOpen =
    state.mode === 'chamber' && activeChamber?.kind === 'stance'
  const isLockOpen =
    state.mode === 'chamber' && activeChamber?.kind === 'lock'
  const depthLayer: 'door' | 'station' | 'path' | 'stance' | 'lock' | 'standard' | null =
    state.mode === 'arrival'
      ? null
      : isRubricOpen
        ? 'standard'
        : isStanceOpen
          ? 'stance'
          : isLockOpen
            ? 'lock'
            : state.mode === 'chamber'
              ? activeJourney
                ? 'path'
                : 'station'
              : navMode === 'journeys'
                ? 'path'
                : navMode === 'toc'
                  ? 'station'
                  : 'door'

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
              aboutHref="/about"
            />
          </>
        ) : null}

        {state.mode !== 'arrival' ? (
          <div className="experience-main-with-nav">
            {/* Top: Keys · Journeys · Contents (Map hidden — same surface as Keys) */}
            <NavModes
              mode={navMode === 'map' ? 'keys' : navMode}
              onChange={onNavChange}
              theme={theme}
              onToggleTheme={toggleTheme}
              onHome={goHome}
            />
            {/* Depth ladder: Key · Station · Path · Stance · Lock · Standard (subtle on chamber) */}
            {depthLayer ? (
              <p
                className={
                  state.mode === 'chamber'
                    ? 'depth-ladder depth-ladder-on-station'
                    : 'depth-ladder'
                }
                aria-label="How Bedrock is layered"
              >
                <span className={depthLayer === 'door' ? 'depth-step active' : 'depth-step'}>
                  Key
                </span>
                <span className="depth-sep" aria-hidden>
                  ·
                </span>
                <span className={depthLayer === 'station' ? 'depth-step active' : 'depth-step'}>
                  Station
                </span>
                <span className="depth-sep" aria-hidden>
                  ·
                </span>
                <span className={depthLayer === 'path' ? 'depth-step active' : 'depth-step'}>
                  Path
                </span>
                <span className="depth-sep" aria-hidden>
                  ·
                </span>
                <span className={depthLayer === 'stance' ? 'depth-step active' : 'depth-step'}>
                  Stance
                </span>
                <span className="depth-sep" aria-hidden>
                  ·
                </span>
                <span className={depthLayer === 'lock' ? 'depth-step active' : 'depth-step'}>
                  Lock
                </span>
                <span className="depth-sep" aria-hidden>
                  ·
                </span>
                <span className={depthLayer === 'standard' ? 'depth-step active' : 'depth-step'}>
                  Standard
                </span>
              </p>
            ) : null}

            <div className="experience-main">
              {state.mode === 'constellation' && (navMode === 'keys' || navMode === 'map') ? (
                <KeyChips
                  activeChamberId={state.activeChamberId}
                  keyMarks={field.state.keys}
                  onSelect={(id, journeyId) => selectChamber(id, 'keys', journeyId)}
                />
              ) : null}

              {state.mode === 'constellation' && navMode === 'journeys' ? (
                <JourneyPanel
                  activeJourneyId={activeJourneyId}
                  activeChamberId={state.activeChamberId}
                  fieldPaths={field.state.paths}
                  onSelectJourney={(journeyId, doorChamberId) => {
                    const j = getJourney(journeyId)
                    const resume = field.pathResumeChamberId(
                      journeyId,
                      doorChamberId,
                      j?.stages,
                    )
                    selectChamber(resume, 'journeys', journeyId)
                  }}
                />
              ) : null}

              {state.mode === 'constellation' && navMode === 'field' ? (
                <FieldPanel
                  state={field.state}
                  stoodToday={field.stoodToday}
                  onOpenStation={(chamberId, journeyId) =>
                    selectChamber(chamberId, 'field', journeyId)
                  }
                  onOpenPath={(journeyId, chamberId) =>
                    selectChamber(chamberId, 'field', journeyId)
                  }
                  onOpenStand={() => selectChamber('the-line', 'field')}
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
                  journey={activeJourney}
                  onSelectJourneyStage={
                    activeJourney
                      ? (chamberId) => selectChamber(chamberId, 'journey-stage', activeJourney.id)
                      : undefined
                  }
                  onOpenMindPath={
                    activeChamber.kind === 'rubric' ? openMindPath : undefined
                  }
                  stationMark={field.getStationMark(activeChamber.id)}
                  stoodToday={field.stoodToday}
                  onMarkHeld={() => field.markStationHeld(activeChamber.id)}
                  onMarkPrayed={() => field.markStationPrayed(activeChamber.id)}
                  onMarkStand={() => {
                    field.markStandToday()
                    field.markStationHeld(activeChamber.id)
                  }}
                  onMarkLock={() => {
                    field.markLockUsed()
                    field.markStationHeld(activeChamber.id)
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Viewport-fixed footer — every surface after enter (Keys, Map, chamber cards, paths) */}
        {state.mode !== 'arrival' ? (
          <div className="experience-footer-stack" role="contentinfo">
            <footer className="site-footer compact">
              <p>Do Better. Be Better. Trust God.</p>
              <p className="site-footer-crisis">
                In crisis:{' '}
                <a href="tel:988" className="site-footer-crisis-link">
                  call or text 988
                </a>
                {' · '}
                Christian counsel:{' '}
                <a href="tel:18557714357" className="site-footer-crisis-link">
                  1-855-771-HELP
                </a>
              </p>
              <p className="site-footer-meta">
                <a
                  href="/about"
                  className="site-footer-about"
                  onClick={() => trackEvent('nav', { nav: 'about', source: 'footer' })}
                >
                  About
                </a>
                {' · '}
                Public beta · v{document.meta.version} · revised {document.meta.revised}
                {' · '}
                Not a crisis hotline
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
