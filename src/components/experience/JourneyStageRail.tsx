import type { Journey } from '../../types/journey'

interface JourneyStageRailProps {
  journey: Journey
  activeChamberId: string | null
  /** top under toolbar · bottom after card body · chips-only (no second header) */
  placement: 'top' | 'bottom' | 'chips'
  onSelectStage: (chamberId: string) => void
}

/**
 * Path station chips. Prefer placement="chips" on a station so path name
 * is not repeated under the main path chrome.
 */
export function JourneyStageRail({
  journey,
  activeChamberId,
  placement,
  onSelectStage,
}: JourneyStageRailProps) {
  const hereIdx = journey.stages.findIndex((s) => s.chamberId === activeChamberId)
  const chipsOnly = placement === 'chips'
  const onPath = hereIdx >= 0

  return (
    <nav
      className={
        chipsOnly
          ? 'journey-stage-rail-bar journey-stage-rail-chips'
          : `journey-stage-rail-bar journey-stage-rail-bar-${placement}`
      }
      aria-label={`${journey.title} path`}
    >
      {!chipsOnly ? (
        <div className="journey-stage-rail-head">
          {onPath ? (
            <p className="journey-stage-rail-progress journey-stage-rail-progress-solo">
              Station {hereIdx + 1} of {journey.stages.length}
            </p>
          ) : (
            <>
              <p className="journey-stage-rail-kicker">Path</p>
              <p className="journey-stage-rail-title">{journey.title}</p>
              <p className="journey-stage-rail-progress">Tap a station</p>
            </>
          )}
        </div>
      ) : null}
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
                aria-label={
                  s.note ? `${i + 1}. ${s.label}. ${s.note}` : `${i + 1}. ${s.label}`
                }
              >
                <span className="journey-stage-num" aria-hidden>
                  {i + 1}
                </span>
                <span className="journey-stage-name">{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
