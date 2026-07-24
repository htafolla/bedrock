import type { ScriptureRef } from '../types/content'
import { primaryVerseUrl } from '../lib/verses'

interface VerseLinkProps {
  verse: ScriptureRef
  /** Visual weight: inline in body vs etched list */
  variant?: 'inline' | 'etched'
  /** Reserved for future permanence dual-link; unused while IPFS/on-chain is offline */
  ipfsCid?: string | null
}

/** Single link → Bible Gateway direct passage. No dead permanence badge. */
export function VerseLink({ verse, variant = 'etched' }: VerseLinkProps) {
  const href = primaryVerseUrl(verse)
  const baseClass = variant === 'inline' ? 'verse-inline' : 'verse-etched'

  return (
    <span className={`verse-link ${baseClass}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="verse-primary"
        title={`Open ${verse.display} on Bible Gateway`}
      >
        {verse.display}
      </a>
    </span>
  )
}
