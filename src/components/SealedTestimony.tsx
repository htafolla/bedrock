import { useState } from 'react'
import type { Testimony } from '../types/content'

interface SealedTestimonyProps {
  testimony: Testimony
}

/**
 * Sealed by default. Visitor must choose to open.
 * Restraint: no animation spectacle — quiet reveal.
 */
export function SealedTestimony({ testimony }: SealedTestimonyProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="testimony" aria-label="Personal testimony">
      {!open ? (
        <button
          type="button"
          className="testimony-seal"
          onClick={() => setOpen(true)}
        >
          <span className="testimony-seal-mark" aria-hidden>
            ⌼
          </span>
          <span>{testimony.previewLabel}</span>
          <span className="testimony-hint">Open only if you choose</span>
        </button>
      ) : (
        <div className="testimony-body">
          {testimony.lines.map((line) => (
            <p key={line} className="testimony-text">
              {line}
            </p>
          ))}
          <button
            type="button"
            className="testimony-close"
            onClick={() => setOpen(false)}
          >
            Seal again
          </button>
        </div>
      )}
    </section>
  )
}
