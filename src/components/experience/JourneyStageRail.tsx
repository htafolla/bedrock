import type { Journey } from '../../types/journey'

interface JourneyStageRailProps {
  journey: Journey
  activeChamberId: string | null
  /** top under toolbar · bottom after card body */
  placement: 'top' | 'bottom'
  onSelectStage: (chamberId: string) => void
}

/**
 * Horizontal path of a core journey — stays with the chamber card
 * so the visitor always sees where they are on the walk.
 */
export function JourneyStageRail({
  journey,
  activeChamberId,
  placement,
  onSelectStage,
}: JourneyStageRailProps) {
  const hereIdx = journey.stages.findIndex((s) => s.chamberId === activeChamberId)

  return (
    <nav
      className={`journey-stage-rail-bar journey-stage-rail-bar-${placement}`}
      aria-label={`${journey.title} path`}
    >
      <div className="journey-stage-rail-head">
        <p className="journey-stage-rail-kicker">Journey</p>
        <p className="journey-stage-rail-title">{journey.title}</p>
        {hereIdx >= 0 ? (
          <p className="journey-stage-rail-progress">
            Station {hereIdx + 1} of {journey.stages.length}
          </p>
        ) : (
          <p className="journey-stage-rail-progress">Not on this path — tap a station</p>
        )}
      </div>
      <ol className="journey-stage-rail">
        {journey.stages.map((s, i) => {
          const here = s.chamberId === activeChamberId
          const done = hereIdx >= 0 && i < hereIdx
          return (
            <li key={s.id} className={here ? 'is-here' : done ? 'is-done' : undefined}>
              <button
                type="button"
                className={
                  here
                    ? 'journey-stage-chip active'
                    : done
                      ? 'journey-stage-chip done'
                      : 'journey-stage-chip'
                }
                onClick={() => onSelectStage(s.chamberId)}
                title={s.note || s.label}
                aria-current={here ? 'step' : undefined}
              >
                <span className="journey-stage-role">{s.role.replace(/_/g, ' ')}</span>
                <span className="journey-stage-name">{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
