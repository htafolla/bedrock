import type { ScriptureRef } from '../types/content'
import { permanentVerseUrl, primaryVerseUrl } from '../lib/verses'

interface VerseLinkProps {
  verse: ScriptureRef
  /** Visual weight: inline in body vs etched list */
  variant?: 'inline' | 'etched'
  ipfsCid?: string | null
}

export function VerseLink({ verse, variant = 'etched', ipfsCid }: VerseLinkProps) {
  const primary = primaryVerseUrl(verse)
  const permanent = permanentVerseUrl(verse, {
    ipfsGateway: 'https://ipfs.io',
    cid: ipfsCid,
  })

  const baseClass =
    variant === 'inline'
      ? 'verse-inline'
      : 'verse-etched'

  return (
    <span className={`verse-link ${baseClass}`}>
      <a
        href={primary}
        target="_blank"
        rel="noopener noreferrer"
        className="verse-primary"
        title={`Open ${verse.display} on Bible Gateway`}
      >
        {verse.display}
      </a>
      <a
        href={permanent}
        className="verse-permanent"
        title="Permanent / on-chain source"
        aria-label={`Permanent source for ${verse.display}`}
      >
        <span className="verse-permanent-badge" aria-hidden>
          ∞
        </span>
        <span className="sr-only">On-chain</span>
      </a>
    </span>
  )
}
