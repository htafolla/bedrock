import { useMemo, useState } from 'react'
import type { BedrockDocument, BodyBlock, Chamber } from '../types/content'
import { scrollExperienceToTop } from '../lib/scroll-top'
import { ChamberNav } from './ChamberNav'
import { VerseLink } from './VerseLink'
import { SealedTestimony } from './SealedTestimony'
import {
  isScriptureCitationLine,
  parseScriptureCitationLine,
} from '../lib/verses'
import { hasChamberLinks, parseBodyChamberLinks } from '../lib/body-links'

interface ReadingExperienceProps {
  document: BedrockDocument
}

function renderBlock(
  block: BodyBlock,
  key: number,
  ipfsCid?: string | null,
  onSelectChamber?: (id: string) => void,
) {
  if (block.type === 'heading') {
    const Tag = block.level === 2 ? 'h2' : 'h3'
    return (
      <Tag key={key} className="chamber-subhead">
        {block.text}
      </Tag>
    )
  }
  if (block.type === 'list') {
    return (
      <ul key={key} className="chamber-list">
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
  if (block.type === 'paragraph' && hasChamberLinks(block.text)) {
    const parts = parseBodyChamberLinks(block.text)
    return (
      <p key={key} className="chamber-paragraph">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={`t-${i}`}>{part.text}</span>
          ) : onSelectChamber ? (
            <button
              key={`c-${part.id}-${i}`}
              type="button"
              className="chamber-inline-link"
              onClick={() => onSelectChamber(part.id)}
            >
              {part.label}
            </button>
          ) : (
            <span key={`c-${part.id}-${i}`}>{part.label}</span>
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

function ChamberView({
  chamber,
  chambers,
  ipfsCid,
  onSelect,
}: {
  chamber: Chamber
  chambers: Chamber[]
  ipfsCid: string | null
  onSelect: (id: string) => void
}) {
  const relatedChambers = chamber.related
    .map((id) => chambers.find((c) => c.id === id))
    .filter((c): c is Chamber => c != null)

  return (
    <article className="chamber" id={chamber.id}>
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
          {chamber.body.map((block, i) => renderBlock(block, i, ipfsCid, onSelect))}
        </div>
      </section>

      {chamber.hacks.length > 0 ? (
        <section className="field-layer field-hacks" aria-labelledby={`${chamber.id}-hacks`}>
          <h3 id={`${chamber.id}-hacks`} className="field-layer-label">
            Under fire
          </h3>
          <p className="field-layer-hint">Scripture under pressure — how to walk this hour.</p>
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
                <VerseLink verse={v} variant="etched" ipfsCid={ipfsCid} />
              </li>
            ))}
          </ul>
        </footer>
      ) : null}

      {relatedChambers.length > 0 ? (
        <nav className="related-web" aria-label="Related first principles">
          <h3 className="verses-heading">Connected truth</h3>
          <p className="field-layer-hint">Walk the web — related chambers for this trial.</p>
          <ul className="related-list">
            {relatedChambers.map((rel) => (
              <li key={rel.id}>
                <button
                  type="button"
                  className="related-link"
                  onClick={() => onSelect(rel.id)}
                >
                  {rel.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

    </article>
  )
}

export function ReadingExperience({ document }: ReadingExperienceProps) {
  const [activeId, setActiveId] = useState(document.chambers[0]?.id ?? '')

  const selectChamber = (id: string) => {
    setActiveId(id)
    scrollExperienceToTop()
  }

  const active = useMemo(
    () => document.chambers.find((c) => c.id === activeId) ?? document.chambers[0],
    [document.chambers, activeId],
  )

  if (!active) {
    return <p className="empty-state">No chambers in document yet.</p>
  }

  return (
    <div className="reading">
      <header className="site-header">
        <p className="site-eyebrow">
          {document.meta.tagline ?? "A Hitchhiker's Guide to Love · Living · Enduring"}
        </p>
        <h1 className="site-title">{document.meta.title}</h1>
        <p className="site-motto">{document.meta.subtitle}</p>
        {document.meta.mission ? (
          <p className="site-mission">{document.meta.mission}</p>
        ) : null}
        {document.prologue?.lines?.length ? (
          <div className="prologue">
            {document.prologue.lines.map((line) => (
              <p key={line} className="prologue-line">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </header>

      <div className="reading-layout">
        <ChamberNav
          chambers={document.chambers}
          activeId={active.id}
          onSelect={selectChamber}
        />
        <div className="reading-main">
          <ChamberView
            chamber={active}
            chambers={document.chambers}
            ipfsCid={document.meta.ipfsCid}
            onSelect={selectChamber}
          />
          <SealedTestimony testimony={document.testimony} />
          {/* PermanenceBadge hidden until IPFS / chain pin is live */}
        </div>
      </div>
    </div>
  )
}
