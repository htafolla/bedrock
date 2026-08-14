import { useEffect, useMemo } from 'react'
import type { BedrockDocument } from '../../types/content'
import { buildOriginShare } from '../../lib/share'
import { SealedTestimony } from '../SealedTestimony'
import { ShareMenu } from '../ShareMenu'

interface AboutPanelProps {
  document: BedrockDocument
  /** Leave About → field guide (Keys) */
  onClose: () => void
}

/**
 * About · Origin — heart of Bedrock (prologue + sealed testimony).
 * Shareable: /about + /og/origin.png.
 */
export function AboutPanel({ document, onClose }: AboutPanelProps) {
  const { meta, prologue, testimony } = document

  const originShare = useMemo(() => {
    const heartLines = [
      ...(testimony?.lines ?? []),
      ...(prologue?.lines ?? []),
    ].filter(Boolean)
    const heart =
      heartLines.slice(0, 2).join(' ') ||
      'This is a testament to Him that through the fire He was always with me.'
    return buildOriginShare({
      title: meta.title,
      tagline: meta.tagline,
      motto: meta.subtitle,
      heart,
    })
  }, [meta.title, meta.tagline, meta.subtitle, prologue?.lines, testimony?.lines])

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
            ← Keys
          </button>
        </div>

        <header className="nav-panel-header about-header">
          <div className="about-title-row">
            <div className="about-title-block">
              <p className="constellation-kicker">About · Origin</p>
              <h2 id="about-title" className="constellation-title">
                {meta.title}
              </h2>
            </div>
            <div className="about-title-share">
              <ShareMenu payload={originShare} />
            </div>
          </div>
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
            The guide is the map. Sealed word optional — open only if you choose.
          </p>
          <SealedTestimony testimony={testimony} />
        </div>

        <div className="about-footer-actions">
          <ShareMenu payload={originShare} triggerLabel="Share Origin" />
          <button type="button" className="focus-btn" onClick={onClose}>
            Keys →
          </button>
        </div>

        <p className="about-meta about-crisis">
          In crisis:{' '}
          <a href="tel:988">call or text 988</a>
          {' · '}
          Christian counsel:{' '}
          <a href="tel:18557714357">1-855-771-HELP</a>
        </p>
        <p className="about-meta">
          Public beta · v{meta.version}
          {meta.revised ? ` · revised ${meta.revised}` : ''}
          {' · '}
          Not a crisis hotline
        </p>
      </div>
    </div>
  )
}
