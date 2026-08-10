import { useEffect, useMemo, useRef, useState } from 'react'
import type { BedrockDocument, BodyBlock, Chamber } from '../../types/content'
import type { Journey } from '../../types/journey'
import { VerseLink } from '../VerseLink'
import { spineNeighbor, spineIndexOf, SPINE_ORDER } from '../../lib/spine'
import { chamberPath } from '../../lib/path-routing'
import { scrollExperienceToTop } from '../../lib/scroll-top'
import {
  isScriptureCitationLine,
  parseScriptureCitationLine,
} from '../../lib/verses'
import { JourneyStageRail } from './JourneyStageRail'
import { ShareMenu } from '../ShareMenu'
import { buildPathShare, buildStationShare } from '../../lib/share'

interface ChamberFocusProps {
  document: BedrockDocument
  chamber: Chamber
  onBack: () => void
  onSelect: (id: string) => void
  onSpineStep: (delta: -1 | 1) => void
  /** When set, path rail sticks to top + bottom of this station card */
  journey?: Journey | null
  onSelectJourneyStage?: (chamberId: string) => void
  /** Rubric Field card → Battlefield of the mind journey */
  onOpenMindPath?: () => void
}

const PRAYER_RE = /^Prayer:\s*/i
const WHEN_RE = /^When .+:\s*$/i
const NUMBERED_TITLE_RE = /^(\d+)\.\s+(.+)$/

function splitNumberedTitle(text: string): { num: string | null; label: string } {
  const m = text.trim().match(NUMBERED_TITLE_RE)
  if (!m) return { num: null, label: text }
  return { num: m[1]!, label: m[2]! }
}

function renderBlock(block: BodyBlock, key: number, ipfsCid?: string | null) {
  if (block.type === 'heading') {
    const Tag = block.level === 2 ? 'h2' : 'h3'
    return (
      <Tag
        key={key}
        className={block.level === 2 ? 'chamber-subhead chamber-subhead-h2' : 'chamber-subhead chamber-subhead-h3'}
      >
        {block.text}
      </Tag>
    )
  }
  if (block.type === 'list') {
    return (
      <ul key={key} className="chamber-list rubric-list">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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
  // Rubric section verses: "(Galatians 5:16, 5:24-25)" → Bible Gateway chips
  if (block.type === 'paragraph' && isScriptureCitationLine(block.text)) {
    const refs = parseScriptureCitationLine(block.text)
    if (refs.length > 0) {
      return (
        <p key={key} className="chamber-paragraph chamber-verse-chips" aria-label="Scripture">
          {refs.map((v) => (
            <VerseLink key={v.display} verse={v} variant="etched" ipfsCid={ipfsCid} />
          ))}
        </p>
      )
    }
  }
  if (block.type === 'paragraph' && PRAYER_RE.test(block.text)) {
    const body = block.text.replace(PRAYER_RE, '').trim()
    return (
      <aside key={key} className="rubric-prayer" aria-label="Prayer">
        <span className="rubric-prayer-label">Prayer</span>
        <p className="rubric-prayer-text">{body}</p>
      </aside>
    )
  }
  if (block.type === 'paragraph' && WHEN_RE.test(block.text)) {
    return (
      <p key={key} className="rubric-when">
        {block.text.replace(/:\s*$/, '')}
      </p>
    )
  }
  return (
    <p key={key} className="chamber-paragraph">
      {block.text}
    </p>
  )
}

type RubricCard = { title: string; blocks: BodyBlock[] }
type RubricBand = { title: string | null; intro: BodyBlock[]; cards: RubricCard[] }

function parseRubricBands(blocks: BodyBlock[]): RubricBand[] {
  const bands: RubricBand[] = []
  let band: RubricBand = { title: null, intro: [], cards: [] }
  let card: RubricCard | null = null

  const flushCard = () => {
    if (card) {
      band.cards.push(card)
      card = null
    }
  }
  const flushBand = () => {
    flushCard()
    if (band.title != null || band.intro.length || band.cards.length) {
      bands.push(band)
    }
    band = { title: null, intro: [], cards: [] }
  }

  for (const b of blocks) {
    if (b.type === 'heading' && b.level === 2) {
      flushBand()
      band = { title: b.text, intro: [], cards: [] }
      continue
    }
    if (b.type === 'heading' && b.level === 3) {
      flushCard()
      card = { title: b.text, blocks: [] }
      continue
    }
    if (card) card.blocks.push(b)
    else band.intro.push(b)
  }
  flushBand()
  return bands
}

function isFieldCardBand(title: string | null): boolean {
  return (title ?? '').trim().toLowerCase() === 'field card'
}

function renderRubricBand(
  sec: RubricBand,
  si: number,
  ipfsCid?: string | null,
) {
  return (
    <section key={`band-${si}-${sec.title ?? 'open'}`} className="rubric-band">
      {sec.title ? <h2 className="rubric-band-title">{sec.title}</h2> : null}
      {sec.intro.length > 0 ? (
        <div className="rubric-band-intro">
          {sec.intro.map((b, i) => renderBlock(b, i, ipfsCid))}
        </div>
      ) : null}
      {sec.cards.map((c, ci) => {
        const { num, label } = splitNumberedTitle(c.title)
        return (
          <article
            key={`card-${ci}-${c.title}`}
            className="rubric-standard"
            aria-labelledby={`rubric-std-${si}-${ci}`}
          >
            <header className="rubric-standard-head">
              {num ? (
                <span className="rubric-num" aria-hidden>
                  {num}
                </span>
              ) : null}
              <h3 id={`rubric-std-${si}-${ci}`} className="rubric-standard-title">
                {label}
              </h3>
            </header>
            <div className="rubric-standard-body">
              {c.blocks.map((b, i) => renderBlock(b, i, ipfsCid))}
            </div>
          </article>
        )
      })}
    </section>
  )
}

/**
 * Field card always open (common steel).
 * Holds / For men / Success collapsed by default — depth is opt-in.
 */
function RubricBody({
  blocks,
  ipfsCid,
  onOpenMindPath,
}: {
  blocks: BodyBlock[]
  ipfsCid?: string | null
  onOpenMindPath?: () => void
}) {
  const [showDepth, setShowDepth] = useState(false)
  const bands = useMemo(() => parseRubricBands(blocks), [blocks])
  const fieldBands = bands.filter((b) => isFieldCardBand(b.title))
  const depthBands = bands.filter((b) => !isFieldCardBand(b.title))
  const surface = fieldBands.length > 0 ? fieldBands : bands.slice(0, 1)
  const depth = fieldBands.length > 0 ? depthBands : bands.slice(1)

  return (
    <div className="chamber-body chamber-body-rubric">
      {surface.map((sec, si) => renderRubricBand(sec, si, ipfsCid))}

      <div className="rubric-depth-actions">
        {onOpenMindPath ? (
          <button type="button" className="rubric-depth-btn primary" onClick={onOpenMindPath}>
            Mind war path →
          </button>
        ) : null}
        {depth.length > 0 ? (
          <button
            type="button"
            className="rubric-depth-btn"
            aria-expanded={showDepth}
            onClick={() => setShowDepth((v) => !v)}
          >
            {showDepth ? 'Hide full holds' : 'Show full holds'}
          </button>
        ) : null}
      </div>

      {showDepth
        ? depth.map((sec, si) => renderRubricBand(sec, si + surface.length, ipfsCid))
        : null}
    </div>
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
  onOpenMindPath,
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
  const journeyPrevStage =
    journey && stageIdx > 0 ? journey.stages[stageIdx - 1] ?? null : null
  const journeyNextStage =
    journey && stageIdx >= 0 && stageIdx < journey.stages.length - 1
      ? journey.stages[stageIdx + 1] ?? null
      : null
  const journeyPrev = journeyPrevStage?.chamberId ?? null
  const journeyNext = journeyNextStage?.chamberId ?? null

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

      <article
        className={`chamber chamber-in-focus hold-first${isRubric ? ' chamber-rubric' : ''}`}
        id={chamber.id}
      >
        <header className="chamber-header">
          <p className="chamber-kicker">
            {isRubric
              ? 'Operational rubric · SOP under fire'
              : journey && onPath
                ? 'Journey station · Hold first'
                : 'Hold first · First principle'}
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
              Hold first (Under fire). Field card and full map when you can read. Mind war path when
              the battle is inside.
            </p>
          ) : null}
        </header>

        {/*
          30-second path: title → Under fire → Prayer.
          Truth / Standard body / Scripture / Related come after capacity returns.
        */}
        <div className="hold-block" id={`${chamber.id}-hold`}>
          <p className="hold-block-kicker">This hour</p>
          {chamber.hacks.length > 0 ? (
            <section className="field-layer field-hacks hold-layer" aria-labelledby={`${chamber.id}-hacks`}>
              <h3 id={`${chamber.id}-hacks`} className="field-layer-label">
                Under fire
              </h3>
              <p className="field-layer-hint">
                {isRubric ? 'Three holds when fog is worst.' : 'The next right hold — walk this hour.'}
              </p>
              <ul className="field-list">
                {chamber.hacks.map((hack) => (
                  <li key={hack}>{hack}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {chamber.prayers.length > 0 ? (
            <section
              className="field-layer field-prayers hold-layer"
              aria-labelledby={`${chamber.id}-prayers`}
            >
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
        </div>

        <div className="chamber-header-share chamber-after-hold-share">
          <ShareMenu
            payload={buildStationShare({
              chamberId: chamber.id,
              title: chamber.title,
              summary: chamber.summary,
              kind: chamber.kind,
            })}
          />
          {journey && onPath ? (
            <ShareMenu
              compact
              className="chamber-share-path"
              triggerLabel="Share path"
              payload={buildPathShare({
                journeyId: journey.id,
                title: journey.title,
                summary: journey.summary,
              })}
            />
          ) : null}
        </div>

        <section className="field-layer field-truth-depth" aria-labelledby={`${chamber.id}-truth`}>
          <h3 id={`${chamber.id}-truth`} className="field-layer-label">
            {isRubric ? 'The standard' : 'Truth'}
          </h3>
          <p className="field-layer-hint">
            {isRubric
              ? 'Field card first. Open full holds only if you need the map.'
              : 'When you can read deeper — Scripture-rooted steel.'}
          </p>
          {isRubric ? (
            <RubricBody
              blocks={chamber.body}
              ipfsCid={document.meta.ipfsCid}
              onOpenMindPath={onOpenMindPath}
            />
          ) : (
            <div className="chamber-body">
              {chamber.body.map((block, i) =>
                renderBlock(block, i, document.meta.ipfsCid),
              )}
            </div>
          )}
        </section>

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

        {/* End-of-card path step — primary way forward after reading */}
        {showJourneyRail && journey && onPath && onSelectJourneyStage ? (
          <nav className="journey-card-step" aria-label="Continue this journey">
            <p className="journey-card-step-meta">
              Station {stageIdx + 1} of {journey.stages.length}
              <span className="journey-card-step-path"> · {journey.title}</span>
            </p>
            <div className="journey-card-step-actions">
              {journeyPrev && journeyPrevStage ? (
                <button
                  type="button"
                  className="journey-card-step-btn journey-card-step-prev"
                  onClick={() => onSelectJourneyStage(journeyPrev)}
                >
                  <span className="journey-card-step-dir">← Prev</span>
                  <span className="journey-card-step-label">{journeyPrevStage.label}</span>
                </button>
              ) : (
                <span className="journey-card-step-spacer" aria-hidden />
              )}
              {journeyNext && journeyNextStage ? (
                <button
                  type="button"
                  className="journey-card-step-btn journey-card-step-next"
                  onClick={() => onSelectJourneyStage(journeyNext)}
                >
                  <span className="journey-card-step-dir">Next station →</span>
                  <span className="journey-card-step-label">{journeyNextStage.label}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="journey-card-step-btn journey-card-step-next journey-card-step-done"
                  onClick={onBack}
                >
                  <span className="journey-card-step-dir">Path complete</span>
                  <span className="journey-card-step-label">Back to map</span>
                </button>
              )}
            </div>
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
