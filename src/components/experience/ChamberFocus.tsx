import { useEffect } from 'react'
import type { BedrockDocument, BodyBlock, Chamber } from '../../types/content'
import { VerseLink } from '../VerseLink'
import { spineNeighbor, spineIndexOf, SPINE_ORDER } from '../../lib/spine'

interface ChamberFocusProps {
  document: BedrockDocument
  chamber: Chamber
  onBack: () => void
  onSelect: (id: string) => void
  onSpineStep: (delta: -1 | 1) => void
}

function renderBlock(block: BodyBlock, key: number) {
  if (block.type === 'heading') {
    const Tag = block.level === 2 ? 'h2' : 'h3'
    return (
      <Tag key={key} className="chamber-subhead">
        {block.text}
      </Tag>
    )
  }
  if (block.type === 'quote') {
    return (
      <blockquote key={key} className="chamber-quote">
        <p>{block.text}</p>
        {block.attribution ? <cite>{block.attribution}</cite> : null}
      </blockquote>
    )
  }
  return (
    <p key={key} className="chamber-paragraph">
      {block.text}
    </p>
  )
}

export function ChamberFocus({
  document,
  chamber,
  onBack,
  onSelect,
  onSpineStep,
}: ChamberFocusProps) {
  const prev = spineNeighbor(chamber.id, -1)
  const next = spineNeighbor(chamber.id, 1)
  const idx = spineIndexOf(chamber.id)
  const related = chamber.related
    .map((id) => document.chambers.find((c) => c.id === id))
    .filter((c): c is Chamber => c != null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
      if (e.key === 'ArrowRight') onSpineStep(1)
      if (e.key === 'ArrowLeft') onSpineStep(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, onSpineStep])

  return (
    <div className="chamber-focus">
      <div className="chamber-focus-toolbar">
        <button type="button" className="focus-btn ghost" onClick={onBack}>
          ← Back to map
        </button>
        <p className="focus-spine-meta">
          {idx >= 0 ? `${idx + 1} / ${SPINE_ORDER.length}` : '—'} · spine
        </p>
        <div className="focus-spine-nav">
          <button
            type="button"
            className="focus-btn"
            disabled={!prev}
            onClick={() => onSpineStep(-1)}
          >
            ← Prev
          </button>
          <button
            type="button"
            className="focus-btn"
            disabled={!next}
            onClick={() => onSpineStep(1)}
          >
            Next →
          </button>
        </div>
      </div>

      <article className="chamber chamber-in-focus" id={chamber.id}>
        <header className="chamber-header">
          <p className="chamber-kicker">First principle</p>
          <h2 className="chamber-title">{chamber.title}</h2>
          <p className="chamber-summary">{chamber.summary}</p>
        </header>

        <section className="field-layer" aria-labelledby={`${chamber.id}-truth`}>
          <h3 id={`${chamber.id}-truth`} className="field-layer-label">
            Truth
          </h3>
          <div className="chamber-body">
            {chamber.body.map((block, i) => renderBlock(block, i))}
          </div>
        </section>

        {chamber.hacks.length > 0 ? (
          <section className="field-layer field-hacks" aria-labelledby={`${chamber.id}-hacks`}>
            <h3 id={`${chamber.id}-hacks`} className="field-layer-label">
              Under fire
            </h3>
            <p className="field-layer-hint">Short reframes when the ground is shaking.</p>
            <ul className="field-list">
              {chamber.hacks.map((hack) => (
                <li key={hack}>{hack}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {chamber.prayers.length > 0 ? (
          <section className="field-layer field-prayers" aria-labelledby={`${chamber.id}-prayers`}>
            <h3 id={`${chamber.id}-prayers`} className="field-layer-label">
              Prayer
            </h3>
            <p className="field-layer-hint">When you do not have the words.</p>
            <ul className="field-list prayer-list">
              {chamber.prayers.map((prayer) => (
                <li key={prayer}>{prayer}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {chamber.verses.length > 0 ? (
          <footer className="chamber-verses">
            <h3 className="verses-heading">Scripture</h3>
            <p className="field-layer-hint">Opens the passage on Bible Gateway.</p>
            <ul className="verses-list">
              {chamber.verses.map((v, i) => (
                <li key={`${v.display}-${i}`}>
                  <VerseLink verse={v} variant="etched" ipfsCid={document.meta.ipfsCid} />
                </li>
              ))}
            </ul>
          </footer>
        ) : null}

        {related.length > 0 ? (
          <nav className="related-web" aria-label="Related first principles">
            <h3 className="verses-heading">Connected truth</h3>
            <p className="field-layer-hint">Leave the spine briefly — the web still holds.</p>
            <ul className="related-list">
              {related.map((rel) => (
                <li key={rel.id}>
                  <button type="button" className="related-link" onClick={() => onSelect(rel.id)}>
                    {rel.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </article>
    </div>
  )
}
