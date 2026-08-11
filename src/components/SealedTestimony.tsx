import { useMemo, useState } from 'react'
import type { Testimony } from '../types/content'
import { buildTestimonyPoemShare } from '../lib/share'
import { ShareMenu } from './ShareMenu'

interface SealedTestimonyProps {
  testimony: Testimony
}

/**
 * Sealed by default. Short word first; poem behind a deeper-understanding link.
 * Poem view includes shareable tall image of the full sealed word.
 */
export function SealedTestimony({ testimony }: SealedTestimonyProps) {
  const [open, setOpen] = useState(false)
  const [showPoem, setShowPoem] = useState(false)

  const poemShare = useMemo(() => {
    if (!testimony.poem?.lines?.length) return null
    return buildTestimonyPoemShare({
      title: testimony.poem.title || 'Backstory',
      lines: testimony.poem.lines,
    })
  }, [testimony.poem])

  const close = () => {
    setOpen(false)
    setShowPoem(false)
  }

  return (
    <section className="testimony" aria-label="Sealed word">
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
          {!showPoem ? (
            <>
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
              {testimony.poem ? (
                <button
                  type="button"
                  className="testimony-deeper"
                  onClick={() => setShowPoem(true)}
                >
                  {testimony.poem.linkLabel}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <div className="testimony-poem-head">
                <h3 className="testimony-title">{testimony.poem?.title ?? 'Backstory'}</h3>
                {poemShare ? (
                  <ShareMenu payload={poemShare} triggerLabel="Share image" />
                ) : null}
              </div>
              <div className="testimony-poem">
                {(testimony.poem?.lines ?? []).map((line, i) => (
                  <p key={`${i}-${line.slice(0, 24)}`} className="testimony-text">
                    {line}
                  </p>
                ))}
              </div>
              {poemShare ? (
                <div className="testimony-poem-share">
                  <ShareMenu payload={poemShare} triggerLabel="Share poem image" />
                </div>
              ) : null}
              <button
                type="button"
                className="testimony-deeper ghost"
                onClick={() => setShowPoem(false)}
              >
                ← Back to the sealed word
              </button>
            </>
          )}
          <button type="button" className="testimony-close" onClick={close}>
            Seal again
          </button>
        </div>
      )}
    </section>
  )
}
