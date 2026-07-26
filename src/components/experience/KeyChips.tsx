import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from 'react'
import { KEY_ENTRIES } from '../../lib/key-entries'

interface KeyChipsProps {
  activeChamberId: string | null
  onSelect: (chamberId: string) => void
}

/** One row of three doors — carousel so DNA stays visible and tappable. */
export const KEYS_PAGE_SIZE = 3

/** Storm triage — short doors into the atlas; paged so the 3D map keeps the stage. */
export function KeyChips({ activeChamberId, onSelect }: KeyChipsProps) {
  const pageCount = Math.ceil(KEY_ENTRIES.length / KEYS_PAGE_SIZE)
  const [page, setPage] = useState(0)
  const touchStartX = useRef<number | null>(null)

  // Jump to the page that holds the open door
  useEffect(() => {
    if (!activeChamberId) return
    const idx = KEY_ENTRIES.findIndex((e) => e.chamberId === activeChamberId)
    if (idx < 0) return
    setPage(Math.floor(idx / KEYS_PAGE_SIZE))
  }, [activeChamberId])

  const pageEntries = useMemo(() => {
    const start = page * KEYS_PAGE_SIZE
    return KEY_ENTRIES.slice(start, start + KEYS_PAGE_SIZE)
  }, [page])

  const go = useCallback(
    (delta: -1 | 1) => {
      setPage((p) => Math.max(0, Math.min(pageCount - 1, p + delta)))
    },
    [pageCount],
  )

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start == null) return
    const end = e.changedTouches[0]?.clientX
    if (end == null) return
    const dx = end - start
    if (Math.abs(dx) < 48) return
    if (dx < 0) go(1)
    else go(-1)
  }

  return (
    <div className="key-chips-panel key-chips-carousel-panel">
      <header className="nav-panel-header">
        <p className="constellation-kicker">Keys · Storm triage</p>
        <h2 className="constellation-title">What are you facing?</h2>
        <p className="constellation-blurb">
          Three doors at a time — swipe or use arrows. DNA below is live: drag, zoom, tap a node.
          Map holds the full path. Contents is the full list.
        </p>
      </header>

      <div
        className="key-chips-carousel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="group"
        aria-roledescription="carousel"
        aria-label="Storm triage doors"
      >
        <button
          type="button"
          className="key-chips-arrow"
          aria-label="Previous doors"
          disabled={page <= 0}
          onClick={() => go(-1)}
        >
          ‹
        </button>

        <ul className="key-chips key-chips-page" aria-live="polite">
          {pageEntries.map((entry) => {
            const active = entry.chamberId === activeChamberId
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={active ? 'key-chip active' : 'key-chip'}
                  onClick={() => onSelect(entry.chamberId)}
                >
                  <span className="key-chip-label">{entry.label}</span>
                  <span className="key-chip-hint">{entry.hint}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          className="key-chips-arrow"
          aria-label="Next doors"
          disabled={page >= pageCount - 1}
          onClick={() => go(1)}
        >
          ›
        </button>
      </div>

      <div className="key-chips-pager" aria-hidden={false}>
        <span className="key-chips-page-label">
          {page + 1} / {pageCount}
        </span>
        <div className="key-chips-dots" role="tablist" aria-label="Door pages">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Doors page ${i + 1}`}
              className={i === page ? 'key-chips-dot active' : 'key-chips-dot'}
              onClick={() => setPage(i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
