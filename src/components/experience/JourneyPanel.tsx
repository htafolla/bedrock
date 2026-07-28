import { useMemo } from 'react'
import { listJourneys } from '../../lib/journeys'
import type { Journey, JourneyFamily } from '../../types/journey'

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
        <p className="constellation-kicker">Journeys · Ground-shaking paths</p>
        <h2 className="constellation-title">What path are you on?</h2>
        <p className="constellation-blurb">
          Not one door — a walk: blow → near → spiral → long middle → remain. Death is not leave.
          Tap a journey to open its first station. Keys are still storm triage; this is the full path.
        </p>
      </header>

      {active ? (
        <div className="journey-active-strip" aria-live="polite">
          <p className="journey-active-label">On path</p>
          <p className="journey-active-title">{active.title}</p>
          <ol className="journey-stage-rail">
            {active.stages.map((s) => {
              const here = s.chamberId === activeChamberId
              return (
                <li key={s.id} className={here ? 'is-here' : undefined}>
                  <button
                    type="button"
                    className={here ? 'journey-stage-chip active' : 'journey-stage-chip'}
                    onClick={() => onSelectJourney(active.id, s.chamberId)}
                    title={s.note || s.label}
                  >
                    <span className="journey-stage-role">{s.role.replace('_', ' ')}</span>
                    <span className="journey-stage-name">{s.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
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
