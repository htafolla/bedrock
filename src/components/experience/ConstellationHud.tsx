import type { Chamber } from '../../types/content'
import { orderChambersBySpine, spineIndexOf } from '../../lib/spine'

interface ConstellationHudProps {
  chambers: Chamber[]
  activeChamberId: string | null
  onSelect: (id: string) => void
  /** 2D fallback when 3D is off */
  fallbackList?: boolean
}

export function ConstellationHud({
  chambers,
  activeChamberId,
  onSelect,
  fallbackList = false,
}: ConstellationHudProps) {
  const ordered = orderChambersBySpine(chambers)

  return (
    <div className={`constellation-hud ${fallbackList ? 'constellation-hud-fallback' : ''}`}>
      <div className="constellation-hud-copy">
        <p className="constellation-kicker">Nave · Constellation</p>
        <h2 className="constellation-title">Walk the first principles</h2>
        <p className="constellation-blurb">
          The spine is the pilgrimage. Dim lines are connected truth. Select a chamber when you know
          what you are fighting — or walk the path in order.
        </p>
      </div>

      <ol
        className={`spine-strip ${fallbackList ? 'spine-strip-wrap' : ''}`}
        aria-label="Spine of first principles"
      >
        {ordered.map((c, i) => {
          const active = c.id === activeChamberId
          return (
            <li key={c.id}>
              <button
                type="button"
                className={active ? 'spine-chip active' : 'spine-chip'}
                onClick={() => onSelect(c.id)}
              >
                <span className="spine-chip-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="spine-chip-title">{c.title}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {activeChamberId && spineIndexOf(activeChamberId) >= 0 ? (
        <p className="constellation-focus-hint">
          Highlighted on the path · click a node or chip to enter the chamber
        </p>
      ) : null}
    </div>
  )
}
