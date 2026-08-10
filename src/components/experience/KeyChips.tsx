import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from 'react'
import { KEY_ENTRIES } from '../../lib/key-entries'
import { useMediaCapability } from '../../hooks/useMediaCapability'

interface KeyChipsProps {
  activeChamberId: string | null
  /** chamberId, optional journeyId from key entry */
  onSelect: (chamberId: string, journeyId?: string) => void
}

/** Mobile carousel page size — one row so DNA stays usable. */
export const KEYS_PAGE_SIZE = 3

function ChipButton({
  entry,
  active,
  onSelect,
}: {
  entry: (typeof KEY_ENTRIES)[number]
  active: boolean
  onSelect: (chamberId: string, journeyId?: string) => void
}) {
  return (
    <button
      type="button"
      className={active ? 'key-chip active' : 'key-chip'}
      onClick={() => onSelect(entry.chamberId, entry.journeyId)}
      title={entry.journeyId ? `Journey: ${entry.journeyId}` : undefined}
    >
      <span className="key-chip-label">{entry.label}</span>
      <span className="key-chip-hint">{entry.hint}</span>
    </button>
  )
}

/** Shared header copy — keep desktop + mobile aligned. */
export const KEYS_BLURB =
  'Door: tap what hits hardest → one station under fire. Path (multi-step): Journeys. Full atlas: Contents. Standard: Kill the Flesh (Contents or mind-war path).'

const KEYS_BLURB_MOBILE =
  'Door: three at a time. Tap to open a station. Path: Journeys. Atlas: Contents.'

/** Storm triage — full grid on desktop; 3-up carousel on mobile. */
export function KeyChips({ activeChamberId, onSelect }: KeyChipsProps) {
  const { isNarrow } = useMediaCapability()

  if (!isNarrow) {
    return (
      <div className="key-chips-panel key-chips-grid-panel">
        <header className="nav-panel-header">
          <p className="constellation-kicker">Keys</p>
          <h2 className="constellation-title">What are you facing?</h2>
          <p className="constellation-blurb">{KEYS_BLURB}</p>
        </header>
        <ul className="key-chips key-chips-grid" aria-label="Storm triage doors">
          {KEY_ENTRIES.map((entry) => (
            <li key={entry.id}>
              <ChipButton
                entry={entry}
                active={entry.chamberId === activeChamberId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return <KeyChipsCarousel activeChamberId={activeChamberId} onSelect={onSelect} />
}

/** Mobile-only: one row of three + arrows so the DNA map stays interactive. */
function KeyChipsCarousel({ activeChamberId, onSelect }: KeyChipsProps) {
  const pageCount = Math.ceil(KEY_ENTRIES.length / KEYS_PAGE_SIZE)
  const [page, setPage] = useState(0)
  const touchStartX = useRef<number | null>(null)

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
        <p className="constellation-kicker">Keys</p>
        <h2 className="constellation-title">What are you facing?</h2>
        <p className="constellation-blurb">{KEYS_BLURB_MOBILE}</p>
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
          {pageEntries.map((entry) => (
            <li key={entry.id}>
              <ChipButton
                entry={entry}
                active={entry.chamberId === activeChamberId}
                onSelect={onSelect}
              />
            </li>
          ))}
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

      <div className="key-chips-pager">
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
