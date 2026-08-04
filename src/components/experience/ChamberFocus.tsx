import { useEffect, useRef } from 'react'
import type { BedrockDocument, BodyBlock, Chamber } from '../../types/content'
import type { Journey } from '../../types/journey'
import { VerseLink } from '../VerseLink'
import { spineNeighbor, spineIndexOf, SPINE_ORDER } from '../../lib/spine'
import { chamberPath } from '../../lib/path-routing'
import { scrollExperienceToTop } from '../../lib/scroll-top'
import { JourneyStageRail } from './JourneyStageRail'

interface ChamberFocusProps {
  document: BedrockDocument
  chamber: Chamber
  onBack: () => void
  onSelect: (id: string) => void
  onSpineStep: (delta: -1 | 1) => void
  /** When set, path rail sticks to top + bottom of this station card */
  journey?: Journey | null
  onSelectJourneyStage?: (chamberId: string) => void
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
  journey = null,
  onSelectJourneyStage,
}: ChamberFocusProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const prev = spineNeighbor(chamber.id, -1)
  const next = spineNeighbor(chamber.id, 1)
  const idx = spineIndexOf(chamber.id)
  const related = chamber.related
    .map((id) => document.chambers.find((c) => c.id === id))
    .filter((c): c is Chamber => c != null)
  const stageIdx = journey?.stages.findIndex((s) => s.chamberId === chamber.id) ?? -1
  const onPath = stageIdx >= 0
  const showJourneyRail = Boolean(journey && onSelectJourneyStage)
  const isRubric = chamber.kind === 'rubric'
  const journeyPrev =
    journey && stageIdx > 0 ? journey.stages[stageIdx - 1]?.chamberId ?? null : null
  const journeyNext =
    journey && stageIdx >= 0 && stageIdx < journey.stages.length - 1
      ? journey.stages[stageIdx + 1]?.chamberId ?? null
      : null

  // Connected truth · spine prev/next · any chamber swap: pin to top (mobile-first).
  useEffect(() => {
    scrollExperienceToTop(rootRef.current)
    // Move focus to the new title so screen readers / keyboard land at the start.
    titleRef.current?.focus({ preventScroll: true })
  }, [chamber.id])

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
    <div
      className={`chamber-focus${showJourneyRail ? ' has-journey-path' : ''}${isRubric ? ' is-rubric' : ''}`}
      ref={rootRef}
    >
      <div className="chamber-focus-toolbar">
        <button type="button" className="focus-btn ghost" onClick={onBack}>
          ← Back
        </button>
        <a
          className="focus-btn ghost focus-plain-link"
          href={chamberPath(chamber.id)}
          title="Canonical plain page for sharing and AI citation"
        >
          Plain
        </a>
        <p className="focus-spine-meta">
          {isRubric
            ? 'Operational standard'
            : journey && onPath
              ? `${journey.title}`
              : idx >= 0
                ? `${idx + 1} / ${SPINE_ORDER.length} · spine`
                : '—'}
        </p>
        <div className="focus-spine-nav">
          {showJourneyRail && onPath && onSelectJourneyStage ? (
            <>
              <button
                type="button"
                className="focus-btn"
                disabled={!journeyPrev}
                onClick={() => journeyPrev && onSelectJourneyStage(journeyPrev)}
              >
                ← Prev station
              </button>
              <button
                type="button"
                className="focus-btn"
                disabled={!journeyNext}
                onClick={() => journeyNext && onSelectJourneyStage(journeyNext)}
              >
                Next station →
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {showJourneyRail && journey && onSelectJourneyStage ? (
        <JourneyStageRail
          journey={journey}
          activeChamberId={chamber.id}
          placement="top"
          onSelectStage={onSelectJourneyStage}
        />
      ) : null}

      <article className={`chamber chamber-in-focus${isRubric ? ' chamber-rubric' : ''}`} id={chamber.id}>
        <header className="chamber-header">
          <p className="chamber-kicker">
            {isRubric
              ? 'Operational rubric · SOP under fire'
              : journey && onPath
                ? 'Journey station · First principle'
                : 'First principle'}
          </p>
          <h2
            className="chamber-title"
            ref={titleRef}
            tabIndex={-1}
          >
            {chamber.title}
          </h2>
          <p className="chamber-summary">{chamber.summary}</p>
          {isRubric ? (
            <p className="chamber-kind-note">
              Rubric — denser than a first principle on purpose. Forged word, then the standard under
              fire. Not a temporary hack.
            </p>
          ) : null}
        </header>

        <section className="field-layer" aria-labelledby={`${chamber.id}-truth`}>
          <h3 id={`${chamber.id}-truth`} className="field-layer-label">
            {isRubric ? 'The standard' : 'Truth'}
          </h3>
          {isRubric ? (
            <p className="field-layer-hint">Story first, then the full rule-set.</p>
          ) : null}
          <div className="chamber-body">
            {chamber.body.map((block, i) => renderBlock(block, i))}
          </div>
        </section>

        {chamber.hacks.length > 0 ? (
          <section className="field-layer field-hacks" aria-labelledby={`${chamber.id}-hacks`}>
            <h3 id={`${chamber.id}-hacks`} className="field-layer-label">
              Under fire
            </h3>
            <p className="field-layer-hint">
              {isRubric ? 'Three holds when fog is worst.' : 'How to walk this hour.'}
            </p>
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
            <p className="field-layer-hint">Related chambers — tap to open.</p>
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

      {showJourneyRail && journey && onSelectJourneyStage ? (
        <JourneyStageRail
          journey={journey}
          activeChamberId={chamber.id}
          placement="bottom"
          onSelectStage={onSelectJourneyStage}
        />
      ) : null}
    </div>
  )
}
