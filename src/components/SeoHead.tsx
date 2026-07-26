import { useEffect } from 'react'
import type { BedrockDocument, Chamber } from '../types/content'
import { applySeo, buildChamberSeo, buildDefaultSeo } from '../lib/seo'

interface SeoHeadProps {
  document: BedrockDocument
  /** When set, article-level SEO for the open chamber */
  chamber?: Chamber | null
}

/**
 * SPA head manager for SEO + AEO (meta, Open Graph, Twitter, JSON-LD).
 */
export function SeoHead({ document, chamber }: SeoHeadProps) {
  useEffect(() => {
    const payload = chamber ? buildChamberSeo(document, chamber) : buildDefaultSeo(document)
    applySeo(payload)
  }, [document, chamber])

  return null
}
