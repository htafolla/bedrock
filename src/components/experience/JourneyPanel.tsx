import { useMemo } from 'react'
import { listJourneys } from '../../lib/journeys'
import type { Journey, JourneyFamily } from '../../types/journey'
import { JourneyStageRail } from './JourneyStageRail'

const FAMILY_ORDER: JourneyFamily[] = ['body', 'will', 'conscience', 'world']

const FAMILY_LABEL: Record<JourneyFamily, string> = {
  body: 'Body & wound',
  will: 'Bondage & loops',
  conscience: 'Fall & return',
  world: 'War & wait',
}

const FAMILY_HINT: Record<JourneyFamily, string> = {
  body: 'Death, leave, betrayal, abandonment fear',
  will: 'Addiction, obsession, control, jealousy',
  conscience: 'I fell, sexual sin, stuck regret',
  world: 'Persecution, warfare, forced waiting',
}

interface JourneyPanelProps {
  activeJourneyId?: string | null
  activeChamberId?: string | null
  onSelectJourney: (journeyId: string, doorChamberId: string) => void
}

/**
 * Core journeys surface — multi-stage paths for ground-shaking life.
 * Tap a journey → door chamber with ?j= context (not a one-shot card dump).
 */
export function JourneyPanel({
  activeJourneyId,
  activeChamberId,
  onSelectJourney,
}: JourneyPanelProps) {
  const journeys = useMemo(() => listJourneys(), [])

  const byFamily = useMemo(() => {
    const map = new Map<JourneyFamily, Journey[]>()
    for (const f of FAMILY_ORDER) map.set(f, [])
    for (const j of journeys) {
      const list = map.get(j.family) || []
      list.push(j)
      map.set(j.family, list)
    }
    for (const f of FAMILY_ORDER) {
      const list = map.get(f) || []
      list.sort((a, b) => a.wave - b.wave || a.title.localeCompare(b.title))
      map.set(f, list)
    }
    return map
  }, [journeys])

  const active = activeJourneyId ? journeys.find((j) => j.id === activeJourneyId) : null

  return (
    <div className="journey-panel key-chips-panel">
      <header className="nav-panel-header">
        <p className="constellation-kicker">Journeys</p>
        <h2 className="constellation-title">What path are you on?</h2>
        <p className="constellation-blurb">
          Path: multi-step walks when one door is not enough. Death and leave are different. Mind
          war: Battlefield of the mind. Steel SOP: Kill the Flesh on that path and on Contents.
        </p>
      </header>

      {active ? (
        <div className="journey-active-strip" aria-live="polite">
          <JourneyStageRail
            journey={active}
            activeChamberId={activeChamberId ?? null}
            placement="top"
            onSelectStage={(chamberId) => onSelectJourney(active.id, chamberId)}
          />
        </div>
      ) : null}

      <div className="journey-families">
        {FAMILY_ORDER.map((family) => {
          const list = byFamily.get(family) || []
          if (list.length === 0) return null
          return (
            <section key={family} className="journey-family" aria-labelledby={`journey-fam-${family}`}>
              <h3 id={`journey-fam-${family}`} className="journey-family-title">
                {FAMILY_LABEL[family]}
              </h3>
              <p className="journey-family-hint">{FAMILY_HINT[family]}</p>
              <ul className="journey-list" aria-label={FAMILY_LABEL[family]}>
                {list.map((j) => {
                  const isActive = j.id === activeJourneyId
                  return (
                    <li key={j.id}>
                      <button
                        type="button"
                        className={isActive ? 'journey-card active' : 'journey-card'}
                        onClick={() => onSelectJourney(j.id, j.doorChamberId)}
                      >
                        <span className="journey-card-top">
                          <span className="journey-card-title">{j.title}</span>
                          <span className="journey-card-wave">W{j.wave}</span>
                        </span>
                        <span className="journey-card-summary">{j.summary}</span>
                        <span className="journey-card-meta">
                          {j.stages.length} stations · door {j.doorChamberId.replace(/-/g, ' ')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
