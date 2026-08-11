import { forwardRef } from 'react'
import type { SharePayload } from '../lib/share'

/**
 * Tall off-screen card for full sealed poem capture (html-to-image).
 * Portrait layout — not the landscape OG card.
 */
export const PoemShareCard = forwardRef<HTMLDivElement, { payload: SharePayload }>(
  function PoemShareCard({ payload }, ref) {
    const lines = payload.lines ?? []
    return (
      <div className="share-poem-shot" aria-hidden>
        <div ref={ref} className="share-poem-card" data-share-layer="testimony">
          <p className="share-poem-kicker">SEALED WORD · BEDROCK</p>
          <h2 className="share-poem-title">{payload.title}</h2>
          <div className="share-poem-body">
            {lines.map((line, i) => (
              <p key={`${i}-${line.slice(0, 20)}`} className="share-poem-line">
                {line}
              </p>
            ))}
          </div>
          <p className="share-poem-motto">Do Better. Be Better. Trust God.</p>
          <p className="share-poem-url">bedrock.rippel.ai/about</p>
        </div>
      </div>
    )
  },
)
