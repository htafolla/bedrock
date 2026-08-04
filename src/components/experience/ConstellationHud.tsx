import type { Chamber } from '../../types/content'
import { isSpineAnchor, orderAnchorsBySpine, spineIndexOf } from '../../lib/spine'

interface ConstellationHudProps {
  chambers: Chamber[]
  activeChamberId: string | null
  onSelect: (id: string) => void
  fallbackList?: boolean
}

/**
 * Map chrome — hub joints only (not all 70+ leaves).
 * Full atlas stays on Contents; DNA nodes still open any chamber.
 */
export function ConstellationHud({
  chambers,
  activeChamberId,
  onSelect,
  fallbackList = false,
}: ConstellationHudProps) {
  const hubs = orderAnchorsBySpine(chambers)
  // Keep the open leaf visible in the strip so you know where you landed
  const activeLeaf =
    activeChamberId && !isSpineAnchor(activeChamberId)
      ? chambers.find((c) => c.id === activeChamberId) ?? null
      : null
  const strip = activeLeaf ? insertActiveNearHub(hubs, activeLeaf) : hubs

  return (
    <div
      className={`constellation-hud map-chrome ${fallbackList ? 'constellation-hud-fallback' : ''}`}
    >
      <header className="nav-panel-header map-chrome-header">
        <p className="constellation-kicker">Map</p>
        <h2 className="constellation-title">Main joints</h2>
        <p className="constellation-blurb">
          {fallbackList
            ? `${hubs.length} main hubs. Prefer Contents for the full list.`
            : `${hubs.length} main hubs. Tap a name to open. Keys = one door. Journeys = multi-step path. Contents = full list.`}
        </p>
      </header>

      <ol className="spine-strip" aria-label="Pilgrimage hubs">
        {strip.map((c) => {
          const active = c.id === activeChamberId
          const hub = isSpineAnchor(c.id)
          const n = spineIndexOf(c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                className={[
                  'spine-chip',
                  active ? 'active' : '',
                  hub ? 'spine-chip-hub' : 'spine-chip-leaf',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(c.id)}
              >
                <span className="spine-chip-index">
                  {n >= 0 ? String(n + 1).padStart(2, '0') : '··'}
                  {hub ? '' : ' · now'}
                </span>
                <span className="spine-chip-title">{c.title}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {!fallbackList ? (
        <p className="constellation-focus-hint map-hint">
          Scene below — drag, zoom, tap a node
          {activeChamberId && spineIndexOf(activeChamberId) >= 0
            ? ` · now: ${String(spineIndexOf(activeChamberId) + 1).padStart(2, '0')}`
            : ''}
        </p>
      ) : (
        <p className="constellation-focus-hint">Hubs above. Contents has every chamber in order.</p>
      )}
    </div>
  )
}

/** Place active leaf chip after the nearest preceding hub for context. */
function insertActiveNearHub(hubs: Chamber[], leaf: Chamber): Chamber[] {
  if (hubs.some((h) => h.id === leaf.id)) return hubs
  const leafIdx = spineIndexOf(leaf.id)
  if (leafIdx < 0) return [...hubs, leaf]
  let insertAt = hubs.length
  for (let i = hubs.length - 1; i >= 0; i--) {
    const hIdx = spineIndexOf(hubs[i].id)
    if (hIdx >= 0 && hIdx < leafIdx) {
      insertAt = i + 1
      break
    }
  }
  if (insertAt === hubs.length) {
    const firstHub = hubs[0] ? spineIndexOf(hubs[0].id) : -1
    if (firstHub >= 0 && leafIdx < firstHub) insertAt = 0
  }
  const out = hubs.slice()
  out.splice(insertAt, 0, leaf)
  return out
}
