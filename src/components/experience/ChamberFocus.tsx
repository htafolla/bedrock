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
import { hasChamberLinks, parseBodyChamberLinks } from '../../lib/body-links'
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

function renderBlock(
  block: BodyBlock,
  key: number,
  ipfsCid?: string | null,
  onSelectChamber?: (id: string) => void,
  /** Standard (rubric) only — never apply SOP chrome to ordinary stations */
  isRubric = false,
) {
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
    // rubric-list = SOP band chrome. Stations use plain chamber-list only.
    return (
      <ul key={key} className={isRubric ? 'chamber-list rubric-list' : 'chamber-list'}>
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
  // Prayer: / When: bands exist only in Standard (rubric) body — not stations
  if (isRubric && block.type === 'paragraph' && PRAYER_RE.test(block.text)) {
    const body = block.text.replace(PRAYER_RE, '').trim()
    return (
      <aside key={key} className="rubric-prayer" aria-label="Prayer">
        <span className="rubric-prayer-label">Prayer</span>
        <p className="rubric-prayer-text">{body}</p>
      </aside>
    )
  }
  if (isRubric && block.type === 'paragraph' && WHEN_RE.test(block.text)) {
    return (
      <p key={key} className="rubric-when">
        {block.text.replace(/:\s*$/, '')}
      </p>
    )
  }
  // Inline [Label](chamber:id) — e.g. Standard deep-link from Master the Flesh
  if (block.type === 'paragraph' && hasChamberLinks(block.text) && onSelectChamber) {
    const parts = parseBodyChamberLinks(block.text)
    return (
      <p key={key} className="chamber-paragraph">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={`t-${i}`}>{part.text}</span>
          ) : (
            <button
              key={`c-${part.id}-${i}`}
              type="button"
              className="chamber-inline-link"
              onClick={() => onSelectChamber(part.id)}
            >
              {part.label}
            </button>
          ),
        )}
      </p>
    )
  }
  if (block.type === 'paragraph' && hasChamberLinks(block.text)) {
    // Fallback: plain labels if no navigation handler
    const parts = parseBodyChamberLinks(block.text)
    return (
      <p key={key} className="chamber-paragraph">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={`t-${i}`}>{part.text}</span>
          ) : (
            <span key={`c-${part.id}-${i}`} className="chamber-inline-link-static">
              {part.label}
            </span>
          ),
        )}
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
  onSelectChamber?: (id: string) => void,
) {
  return (
    <section key={`band-${si}-${sec.title ?? 'open'}`} className="rubric-band">
      {sec.title ? <h2 className="rubric-band-title">{sec.title}</h2> : null}
      {sec.intro.length > 0 ? (
        <div className="rubric-band-intro">
          {sec.intro.map((b, i) => renderBlock(b, i, ipfsCid, onSelectChamber, true))}
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
              {c.blocks.map((b, i) => renderBlock(b, i, ipfsCid, onSelectChamber, true))}
            </div>
          </article>
        )
      })}
    </section>
  )
}

/**
 * Field card always open (common steel).
 * Full holds collapsed by default — depth is opt-in under fog.
 * Mind path is secondary (not competing with the hold).
 */
function RubricBody({
  blocks,
  ipfsCid,
  onOpenMindPath,
  onSelectChamber,
}: {
  blocks: BodyBlock[]
  ipfsCid?: string | null
  onOpenMindPath?: () => void
  onSelectChamber?: (id: string) => void
}) {
  const [showDepth, setShowDepth] = useState(false)
  const bands = useMemo(() => parseRubricBands(blocks), [blocks])
  const fieldBands = bands.filter((b) => isFieldCardBand(b.title))
  const depthBands = bands.filter((b) => !isFieldCardBand(b.title))
  const surface = fieldBands.length > 0 ? fieldBands : bands.slice(0, 1)
  const depth = fieldBands.length > 0 ? depthBands : bands.slice(1)

  return (
    <div className="chamber-body chamber-body-rubric">
      {surface.map((sec, si) => renderRubricBand(sec, si, ipfsCid, onSelectChamber))}

      <div className="rubric-depth-actions">
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
        {onOpenMindPath ? (
          <button type="button" className="rubric-depth-btn ghost" onClick={onOpenMindPath}>
            Mind war path →
          </button>
        ) : null}
      </div>

      {showDepth
        ? depth.map((sec, si) =>
            renderRubricBand(sec, si + surface.length, ipfsCid, onSelectChamber),
          )
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
  const isStance = chamber.kind === 'stance'
  const isLock = chamber.kind === 'lock'
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

  /**
   * Share hierarchy under fog:
   * - Primary: this station / standard (header + footer)
   * - Secondary: path only when on a journey, compact/ghost, never equal weight
   */
  const cardShare = (placement: 'header' | 'footer') => (
    <div
      className={
        placement === 'header'
          ? 'chamber-card-share chamber-card-share-header'
          : 'chamber-card-share chamber-card-share-footer'
      }
    >
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
          className="chamber-share-path chamber-share-path-secondary"
          triggerLabel="Path"
          payload={buildPathShare({
            journeyId: journey.id,
            title: journey.title,
            summary: journey.summary,
          })}
        />
      ) : null}
    </div>
  )

  const onJourney = Boolean(showJourneyRail && journey && onPath && onSelectJourneyStage)

  return (
    <div
      className={`chamber-focus${onJourney ? ' has-journey-path' : ''}${isRubric ? ' is-rubric' : ''}${isStance ? ' is-stance' : ''}${isLock ? ' is-lock' : ''}`}
      ref={rootRef}
    >
      {/*
        ONE path chrome: tools · title · station chips. No second section under it.
      */}
      {onJourney && journey && onSelectJourneyStage ? (
        <div className="path-chrome" aria-label={`${journey.title} path`}>
          <div className="path-chrome-row">
            <button type="button" className="focus-btn ghost path-chrome-back" onClick={onBack}>
              ← Paths
            </button>
            <p className="path-chrome-progress">
              {stageIdx + 1} / {journey.stages.length}
            </p>
            <div className="path-chrome-nav">
              <button
                type="button"
                className="focus-btn"
                disabled={!journeyPrev}
                onClick={() => journeyPrev && onSelectJourneyStage(journeyPrev)}
                aria-label="Previous station"
              >
                ←
              </button>
              <button
                type="button"
                className="focus-btn"
                disabled={!journeyNext}
                onClick={() => journeyNext && onSelectJourneyStage(journeyNext)}
                aria-label="Next station"
              >
                →
              </button>
            </div>
            <a
              className="focus-btn ghost path-chrome-plain"
              href={chamberPath(chamber.id)}
              title="Plain page for citation"
            >
              Plain
            </a>
          </div>
          <h1 className="path-chrome-title">{journey.title}</h1>
          <JourneyStageRail
            journey={journey}
            activeChamberId={chamber.id}
            placement="chips"
            onSelectStage={onSelectJourneyStage}
          />
        </div>
      ) : (
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
              ? 'Standard'
              : idx >= 0
                ? `${idx + 1} of ${SPINE_ORDER.length}`
                : '—'}
          </p>
          <div className="focus-spine-nav">
            <button
              type="button"
              className="focus-btn"
              disabled={!prev}
              onClick={() => onSpineStep(-1)}
            >
              ←
            </button>
            <button
              type="button"
              className="focus-btn"
              disabled={!next}
              onClick={() => onSpineStep(1)}
            >
              →
            </button>
          </div>
        </div>
      )}

      <article
        className={`chamber chamber-in-focus hold-first${isRubric ? ' chamber-rubric' : ''}${isStance ? ' chamber-stance' : ''}${isLock ? ' chamber-lock' : ''}${chamber.illustration ? ' has-illustration' : ''}`}
        id={chamber.id}
      >
        {/* Title + Under fire share one stage so the pow sits behind as corner watermark */}
        <div className="chamber-strike-stage">
          {chamber.illustration ? (
            <div className="chamber-illustration" aria-hidden="true">
              <img
                src={chamber.illustration.src}
                alt=""
                width={864}
                height={1152}
                loading="eager"
                decoding="async"
              />
            </div>
          ) : null}

          <header className="chamber-header">
            <div className="chamber-title-row">
              <h2
                className="chamber-title"
                ref={titleRef}
                tabIndex={-1}
              >
                {chamber.title}
              </h2>
              {cardShare('header')}
            </div>
            <p className="chamber-summary">{chamber.summary}</p>
            {isRubric ? (
              <p className="chamber-kind-note">
                Under fire first. Field card and full map when you can read.
              </p>
            ) : null}
            {isStance ? (
              <p className="chamber-kind-note">
                Stance — how you stand every day. When the wave hits, use Pain Interrupt.
              </p>
            ) : null}
            {isLock ? (
              <p className="chamber-kind-note">
                Lock — snaps you back into The Line when pain, memory, or rage surges.
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
                  {isRubric
                    ? 'Three holds when fog is worst.'
                    : isStance
                      ? 'Three lines — how you stand every day.'
                      : isLock
                        ? 'Three moves when the wave hits.'
                        : 'The next right hold — walk this hour.'}
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
        </div>

        <section className="field-layer field-truth-depth" aria-labelledby={`${chamber.id}-truth`}>
          <h3 id={`${chamber.id}-truth`} className="field-layer-label">
            {isRubric ? 'The standard' : 'Truth'}
          </h3>
          <p className="field-layer-hint">
            {isRubric
              ? 'Field card open. Full holds on demand. Mind path when the war is inside.'
              : 'When you can read deeper — Scripture-rooted steel.'}
          </p>
          {isRubric ? (
            <RubricBody
              blocks={chamber.body}
              ipfsCid={document.meta.ipfsCid}
              onOpenMindPath={onOpenMindPath}
              onSelectChamber={onSelect}
            />
          ) : (
            <div className="chamber-body">
              {chamber.body.map((block, i) =>
                renderBlock(block, i, document.meta.ipfsCid, onSelect, false),
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

        {/* End-of-card: compact left / right station nav */}
        {showJourneyRail && journey && onPath && onSelectJourneyStage ? (
          <nav className="journey-card-step" aria-label="Continue this journey">
            <div className="journey-card-step-actions">
              {journeyPrev && journeyPrevStage ? (
                <button
                  type="button"
                  className="journey-card-step-btn journey-card-step-prev"
                  onClick={() => onSelectJourneyStage(journeyPrev)}
                  aria-label={`Previous: ${journeyPrevStage.label}`}
                >
                  ← {journeyPrevStage.label}
                </button>
              ) : (
                <span className="journey-card-step-spacer" aria-hidden />
              )}
              {journeyNext && journeyNextStage ? (
                <button
                  type="button"
                  className="journey-card-step-btn journey-card-step-next"
                  onClick={() => onSelectJourneyStage(journeyNext)}
                  aria-label={`Next: ${journeyNextStage.label}`}
                >
                  {journeyNextStage.label} →
                </button>
              ) : (
                <button
                  type="button"
                  className="journey-card-step-btn journey-card-step-next journey-card-step-done"
                  onClick={onBack}
                  aria-label="Path complete. Back to map"
                >
                  Map →
                </button>
              )}
            </div>
          </nav>
        ) : null}

        {cardShare('footer')}

        {/* Always-on card footer — matches static /c pages and share chrome */}
        <footer className="chamber-card-end" aria-label="Bedrock">
          <p className="chamber-card-motto">Do Better. Be Better. Trust God.</p>
          <p className="chamber-card-end-meta">
            Hold first · Public beta · Not a crisis hotline
          </p>
          <p className="chamber-card-crisis">
            In crisis:{' '}
            <a href="tel:988">call or text 988</a>
            {' · '}
            Christian counsel:{' '}
            <a href="tel:18557714357">1-855-771-HELP</a>
          </p>
        </footer>
      </article>

      {/* Bottom path chips removed — one chip strip under path chrome is enough */}
    </div>
  )
}
