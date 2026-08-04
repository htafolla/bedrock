import { useEffect } from 'react'
import type { BedrockDocument } from '../../types/content'
import { SealedTestimony } from '../SealedTestimony'

interface AboutPanelProps {
  document: BedrockDocument
  /** Leave About → field guide (Keys) */
  onClose: () => void
}

/**
 * About · sealed word — optional origin, not the field-guide product pitch.
 * Reached from footer / arrival (not header chrome).
 *
 * Fixed overlay so close is never blocked by experience-main pointer-events
 * (DNA click-through) or the footer stack.
 */
export function AboutPanel({ document, onClose }: AboutPanelProps) {
  const { meta, prologue, testimony } = document

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock page scroll while About is open (overlay owns scroll)
  useEffect(() => {
    const body = window.document.body
    const prev = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="about-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <button
        type="button"
        className="about-backdrop"
        aria-label="Close About"
        onClick={onClose}
      />
      <div className="about-panel key-chips-panel">
        <div className="about-toolbar">
          <button type="button" className="focus-btn ghost" onClick={onClose}>
            ← Back to Keys
          </button>
          <button type="button" className="focus-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <header className="nav-panel-header">
          <p className="constellation-kicker">About · Origin</p>
          <h2 id="about-title" className="constellation-title">
            {meta.title}
          </h2>
          <p className="constellation-blurb">
            {meta.tagline ?? "A Hitchhiker's Guide to Love · Living · Enduring"}
          </p>
          {meta.mission ? <p className="about-mission">{meta.mission}</p> : null}
          <p className="about-motto">{meta.subtitle}</p>
        </header>

        {prologue?.lines?.length ? (
          <div className="about-prologue" aria-label="Prologue">
            {prologue.lines.map((line) => (
              <p key={line} className="about-prologue-line">
                {line}
              </p>
            ))}
          </div>
        ) : null}

        <div className="about-sealed">
          <p className="about-sealed-lead">
            The guide is the map. The sealed word is optional — open only if you choose.
          </p>
          <SealedTestimony testimony={testimony} />
        </div>

        <p className="about-meta">
          Public beta · v{meta.version}
          {meta.revised ? ` · revised ${meta.revised}` : ''}
        </p>

        <div className="about-footer-actions">
          <button type="button" className="focus-btn" onClick={onClose}>
            Back to Keys →
          </button>
        </div>
      </div>
    </div>
  )
}
