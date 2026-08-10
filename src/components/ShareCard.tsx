import { forwardRef } from 'react'
import type { SharePayload } from '../lib/share'

/**
 * Off-screen share card for html-to-image capture (1200×630 at 2× via pixelRatio).
 * Layout mirrors Bedrock glass / landing-card steel.
 */
export const ShareCard = forwardRef<HTMLDivElement, { payload: SharePayload }>(
  function ShareCard({ payload }, ref) {
    return (
      <div className="share-card-shot" aria-hidden>
        <div ref={ref} className="share-card" data-share-layer={payload.layer}>
          <p className="share-card-kicker">
            {payload.layerLabel.toUpperCase()} · BEDROCK
          </p>
          <h2 className="share-card-title">{payload.title}</h2>
          <p className="share-card-text">{payload.text}</p>
          <p className="share-card-motto">Do Better. Be Better. Trust God.</p>
          <p className="share-card-url">bedrock.rippel.ai</p>
        </div>
      </div>
    )
  },
)
