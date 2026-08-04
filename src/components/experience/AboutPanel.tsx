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
 */
export function AboutPanel({ document, onClose }: AboutPanelProps) {
  const { meta, prologue, testimony } = document

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
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
        <h2 className="constellation-title">{meta.title}</h2>
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
          The product is the map. The sealed word is optional — open only if you choose.
        </p>
        <SealedTestimony testimony={testimony} />
      </div>

      <p className="about-meta">
        Public beta · v{meta.version}
        {meta.revised ? ` · revised ${meta.revised}` : ''}
      </p>

      <div className="about-footer-actions">
        <button type="button" className="focus-btn" onClick={onClose}>
          Enter the field guide →
        </button>
      </div>
    </div>
  )
}
