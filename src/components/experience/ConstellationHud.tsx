import type { Chamber } from '../../types/content'
import { orderChambersBySpine, spineIndexOf } from '../../lib/spine'

interface ConstellationHudProps {
  chambers: Chamber[]
  activeChamberId: string | null
  onSelect: (id: string) => void
  fallbackList?: boolean
}

/** Compact top chrome for Map — DNA lives in the open canvas below. */
export function ConstellationHud({
  chambers,
  activeChamberId,
  onSelect,
  fallbackList = false,
}: ConstellationHudProps) {
  const ordered = orderChambersBySpine(chambers)

  return (
    <div
      className={`constellation-hud map-chrome ${fallbackList ? 'constellation-hud-fallback' : ''}`}
    >
      <header className="nav-panel-header map-chrome-header">
        <p className="constellation-kicker">Map</p>
        <h2 className="constellation-title">The path · fanned</h2>
        <p className="constellation-blurb">
          {fallbackList
            ? 'Swipe the spine below. On larger screens you can spin the DNA constellation.'
            : 'Drag to spin · scroll to zoom · hover a node for its name · click to enter.'}
        </p>
      </header>

      <ol className="spine-strip" aria-label="Spine of first principles">
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

      {!fallbackList ? (
        <p className="constellation-focus-hint map-hint">
          Drag empty space to orbit · scroll to zoom · nodes open chambers
        </p>
      ) : (
        <p className="constellation-focus-hint">
          {activeChamberId && spineIndexOf(activeChamberId) >= 0
            ? 'Selected on the path'
            : 'Choose a chamber from the spine'}
        </p>
      )}
    </div>
  )
}
