import type { BedrockMeta } from '../types/content'
import { baseTxExplorerUrl } from '../lib/permanence'

interface PermanenceBadgeProps {
  meta: BedrockMeta
  localHash?: string | null
}

export function PermanenceBadge({ meta, localHash }: PermanenceBadgeProps) {
  const hash = meta.contentHash ?? localHash
  const short = hash ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : null

  return (
    <aside className="permanence" aria-label="Permanence status">
      <div className="permanence-label">Permanence</div>
      <dl className="permanence-grid">
        <div>
          <dt>Document hash</dt>
          <dd className="mono">{short ?? 'Not anchored yet'}</dd>
        </div>
        <div>
          <dt>IPFS</dt>
          <dd className="mono">{meta.ipfsCid ?? 'Pending pin'}</dd>
        </div>
        <div>
          <dt>Chain anchor</dt>
          <dd>
            {meta.baseAnchorTx ? (
              <a
                href={baseTxExplorerUrl(meta.baseAnchorTx)}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
              >
                {meta.baseAnchorTx.slice(0, 10)}…
              </a>
            ) : (
              <span className="mono">Pending registry</span>
            )}
          </dd>
        </div>
      </dl>
    </aside>
  )
}
