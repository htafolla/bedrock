import type { BedrockDocument } from '../../types/content'
import { SealedTestimony } from '../SealedTestimony'

interface AboutPanelProps {
  document: BedrockDocument
}

/**
 * About · sealed word — optional origin, not the field-guide product pitch.
 * Reached from footer (not header chrome — keeps Keys · Journeys · Contents unwrapped).
 */
export function AboutPanel({ document }: AboutPanelProps) {
  const { meta, prologue, testimony } = document

  return (
    <div className="about-panel key-chips-panel">
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
    </div>
  )
}
