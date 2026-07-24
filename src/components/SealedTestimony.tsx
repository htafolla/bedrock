import { useState } from 'react'
import type { Testimony } from '../types/content'

interface SealedTestimonyProps {
  testimony: Testimony
}

/**
 * Sealed by default. Visitor must choose to open.
 * Holds the backstory poem — not the product pitch.
 * Restraint: no animation spectacle — quiet reveal.
 */
export function SealedTestimony({ testimony }: SealedTestimonyProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="testimony" aria-label="Sealed backstory">
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
          {testimony.title ? (
            <h3 className="testimony-title">{testimony.title}</h3>
          ) : null}
          <div className="testimony-poem">
            {testimony.lines.map((line, i) => (
              <p key={`${i}-${line.slice(0, 24)}`} className="testimony-text">
                {line}
              </p>
            ))}
          </div>
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
