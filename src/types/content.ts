/** Structured source of truth for the Bedrock document. */

export type BodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'quote'; text: string; attribution?: string }

export interface ScriptureRef {
  /** Canonical display, e.g. "Matthew 6:33" */
  display: string
  book: string
  chapter: number
  /** Inclusive start verse */
  verseStart: number
  /** Inclusive end verse; omit for single verse */
  verseEnd?: number
}

/**
 * Field-guide chamber: one node in the navigable web of truth.
 * Dichotomy in use: Truth (body + verses) | Hack (pressure reframe) | Prayer (when words fail).
 */
export interface Chamber {
  id: string
  title: string
  /** Short subtitle shown in nav / chamber map */
  summary: string
  /** First principles — the solid truth */
  body: BodyBlock[]
  /** Supporting verses etched at the chamber */
  verses: ScriptureRef[]
  /** Usable under pressure: short obedience / mind reframes ("brain hacks") */
  hacks: string[]
  /** Short prayers for the trial */
  prayers: string[]
  /** Related chamber ids — edges in the web of truth */
  related: string[]
}

export interface BedrockMeta {
  /** Final product name — always "Bedrock" */
  title: string
  /** Motto under the name: Do Better. Be Better. Trust God. */
  subtitle: string
  /**
   * Product line (one place for the triad).
   * e.g. A Hitchhiker's Guide to Love · Living · Enduring
   */
  tagline?: string
  /** What the guide is — one sentence under motto */
  mission?: string
  /** Original working title (historical, not primary brand) */
  workingTitle?: string
  version: string
  /** ISO date of the document revision */
  revised: string
  /** Content hash once pinned; null until permanence pass */
  contentHash: string | null
  /** IPFS CID once pinned */
  ipfsCid: string | null
  /** On-chain registry tx (Sui preferred; field name kept for Phase 1 schema stability) */
  baseAnchorTx: string | null
}

export interface Testimony {
  /** Sealed by default; only opened by visitor choice */
  sealed: true
  previewLabel: string
  /** Optional heading when opened */
  title?: string
  /** Short sealed word (shown first) */
  lines: string[]
  /** Optional poem for deeper understanding */
  poem?: {
    title: string
    linkLabel: string
    lines: string[]
  }
}

export interface Prologue {
  lines: string[]
}

export interface BedrockDocument {
  meta: BedrockMeta
  prologue?: Prologue
  chambers: Chamber[]
  testimony: Testimony
}
