import { KEY_ENTRIES } from '../../lib/key-entries'
import { getJourney, listJourneys } from '../../lib/journeys'
import type { FieldState } from '../../lib/field-state'
import { summarizeField } from '../../lib/field-state'

interface FieldPanelProps {
  state: FieldState
  stoodToday: boolean
  onOpenStation: (chamberId: string, journeyId?: string) => void
  onOpenPath: (journeyId: string, chamberId: string) => void
  onOpenStand: () => void
}

/**
 * Field — private progress: keys used, stations held, paths walked, stand, lock.
 * Always present in nav (not an optional mode).
 */
export function FieldPanel({
  state,
  stoodToday,
  onOpenStation,
  onOpenPath,
  onOpenStand,
}: FieldPanelProps) {
  const sum = summarizeField(state)
  const journeys = listJourneys()
  const pathRows = Object.entries(state.paths)
    .map(([id, p]) => {
      const j = getJourney(id)
      return j ? { j, p } : null
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.p.lastAt - a.p.lastAt)

  const keyRows = KEY_ENTRIES.filter((k) => state.keys[k.id]).map((k) => ({
    entry: k,
    mark: state.keys[k.id]!,
  }))

  const heldStations = Object.entries(state.stations)
    .filter(([, m]) => m.heldAt != null)
    .sort((a, b) => (b[1].heldAt ?? 0) - (a[1].heldAt ?? 0))
    .slice(0, 12)

  return (
    <div className="field-panel key-chips-panel">
      <header className="nav-panel-header">
        <p className="constellation-kicker">Field</p>
        <h2 className="constellation-title">Your walk</h2>
        <p className="constellation-blurb">
          Private on this device. Keys used · stations held · paths walked · The Line · Lock.
        </p>
      </header>

      <ul className="field-stat-grid" aria-label="Field summary">
        <li className="field-stat">
          <span className="field-stat-n">{sum.daysStood}</span>
          <span className="field-stat-l">Days stood</span>
        </li>
        <li className="field-stat">
          <span className="field-stat-n">{sum.stationsHeld}</span>
          <span className="field-stat-l">Held</span>
        </li>
        <li className="field-stat">
          <span className="field-stat-n">{sum.pathsStarted}</span>
          <span className="field-stat-l">Paths</span>
        </li>
        <li className="field-stat">
          <span className="field-stat-n">{sum.keysUsed}</span>
          <span className="field-stat-l">Keys</span>
        </li>
        <li className="field-stat">
          <span className="field-stat-n">{sum.locksUsed}</span>
          <span className="field-stat-l">Locks</span>
        </li>
        <li className="field-stat">
          <span className="field-stat-n">{sum.pathsCompleted}</span>
          <span className="field-stat-l">Finished</span>
        </li>
      </ul>

      <section className="field-section" aria-labelledby="field-stand">
        <h3 id="field-stand" className="field-section-title">
          The Line
        </h3>
        <button
          type="button"
          className={stoodToday ? 'field-stand-btn done' : 'field-stand-btn'}
          onClick={onOpenStand}
        >
          {stoodToday ? 'Stood today — open The Line' : 'Stand today — open The Line'}
        </button>
      </section>

      {pathRows.length > 0 ? (
        <section className="field-section" aria-labelledby="field-paths">
          <h3 id="field-paths" className="field-section-title">
            Paths
          </h3>
          <ul className="field-list-rows">
            {pathRows.map(({ j, p }) => {
              const total = j.stages.length
              const at = Math.min(p.stageIndex + 1, total)
              const done = Boolean(p.completedAt)
              return (
                <li key={j.id}>
                  <button
                    type="button"
                    className="field-row-btn"
                    onClick={() => onOpenPath(j.id, p.chamberId)}
                  >
                    <span className="field-row-title">{j.title}</span>
                    <span className="field-row-meta">
                      {done ? 'Complete' : `Continue ${at}/${total}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <section className="field-section">
          <p className="field-empty">No path yet. Open Journeys and start walking.</p>
          <p className="field-empty-hint">
            {journeys.length} paths ready · Marriage Shaken · mind · control · more
          </p>
        </section>
      )}

      {keyRows.length > 0 ? (
        <section className="field-section" aria-labelledby="field-keys">
          <h3 id="field-keys" className="field-section-title">
            Keys used
          </h3>
          <ul className="field-list-rows">
            {keyRows.map(({ entry, mark }) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="field-row-btn"
                  onClick={() => onOpenStation(entry.chamberId, entry.journeyId)}
                >
                  <span className="field-row-title">{entry.label}</span>
                  <span className="field-row-meta">×{mark.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {heldStations.length > 0 ? (
        <section className="field-section" aria-labelledby="field-held">
          <h3 id="field-held" className="field-section-title">
            Held
          </h3>
          <ul className="field-chip-list">
            {heldStations.map(([id]) => (
              <li key={id}>
                <button
                  type="button"
                  className="field-chip"
                  onClick={() => onOpenStation(id)}
                >
                  {id.replace(/-/g, ' ')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
