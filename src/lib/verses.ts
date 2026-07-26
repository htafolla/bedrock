import type { ScriptureRef } from '../types/content'

const BIBLE_GATEWAY_PASSAGE = 'https://www.biblegateway.com/passage/'
/** Default translation for primary links (Bible Gateway free tier). */
export const PRIMARY_BIBLE_VERSION = 'NIV'

/**
 * Build a Bible Gateway–friendly passage query (ASCII hyphen for ranges).
 * e.g. "Matthew 6:33", "Ephesians 6:10-18", "1 Corinthians 13:4-7"
 */
export function formatPassageQuery(ref: ScriptureRef): string {
  if (ref.verseEnd != null && ref.verseEnd !== ref.verseStart) {
    return `${ref.book} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`
  }
  return `${ref.book} ${ref.chapter}:${ref.verseStart}`
}

/**
 * Primary human-readable link: direct Bible Gateway passage for the verse/range.
 * https://www.biblegateway.com/passage/?search=John+3%3A16&version=NIV
 */
export function primaryVerseUrl(
  ref: ScriptureRef,
  version: string = PRIMARY_BIBLE_VERSION,
): string {
  const params = new URLSearchParams({
    search: formatPassageQuery(ref),
    version,
  })
  return `${BIBLE_GATEWAY_PASSAGE}?${params.toString()}`
}

/**
 * Permanent / secondary link.
 * Phase 1: local permanence route keyed by normalized ref.
 * Later: IPFS snapshot or on-chain verse registry URL.
 */
export function permanentVerseUrl(
  ref: ScriptureRef,
  options?: { ipfsGateway?: string; cid?: string | null },
): string {
  const key = normalizeRefKey(ref)
  if (options?.ipfsGateway && options.cid) {
    return `${options.ipfsGateway.replace(/\/$/, '')}/ipfs/${options.cid}/verses/${key}.json`
  }
  return `#/permanent/verse/${key}`
}

export function normalizeRefKey(ref: ScriptureRef): string {
  const end = ref.verseEnd != null ? `-${ref.verseEnd}` : ''
  const book = ref.book.toLowerCase().replace(/\s+/g, '-')
  return `${book}-${ref.chapter}-${ref.verseStart}${end}`
}

/** Parse common display strings like "John 3:16", "1 John 4:7–8", "Ephesians 6:10-18". */
export function parseScriptureDisplay(display: string): ScriptureRef | null {
  const cleaned = display.trim().replace(/[–—]/g, '-')
  // Allow trailing notes: "John 15:13 — comment" → take the ref only
  const head = cleaned.split(/\s+[—–-]\s+/)[0]?.trim() ?? cleaned
  const match = head.match(
    /^((?:\d\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?$/,
  )
  if (!match) return null
  const book = match[1].replace(/\s+/g, ' ').trim()
  const chapter = Number(match[2])
  const verseStart = Number(match[3])
  const verseEnd = match[4] != null ? Number(match[4]) : undefined
  return {
    display: formatVerseRange({
      display: cleaned,
      book,
      chapter,
      verseStart,
      verseEnd,
    }),
    book,
    chapter,
    verseStart,
    verseEnd,
  }
}

/** Bible Gateway search for free-text refs from the guide (fallback when parse fails). */
export function bibleGatewaySearchUrl(
  display: string,
  version: string = PRIMARY_BIBLE_VERSION,
): string {
  const search = display.trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ')
  const params = new URLSearchParams({ search, version })
  return `${BIBLE_GATEWAY_PASSAGE}?${params.toString()}`
}

export function scriptureChipHref(display: string): string {
  const ref = parseScriptureDisplay(display)
  return ref ? primaryVerseUrl(ref) : bibleGatewaySearchUrl(display)
}

/**
 * Parse a ·-separated verse list, including multi-verse tokens like
 * "Romans 11:33, 36" or "Matthew 19:4-6, 8-9".
 */
export function parseVerseList(line: string): ScriptureRef[] {
  const parts = line
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  const refs: ScriptureRef[] = []

  for (const part of parts) {
    const cleaned = part.replace(/[–—]/g, '-')
    const match = cleaned.match(/^((?:\d\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+):(.*)$/)
    if (!match) continue
    const book = match[1].replace(/\s+/g, ' ').trim()
    const chapter = Number(match[2])
    const chunks = match[3].trim().split(/\s*,\s*/)
    for (const chunk of chunks) {
      const range = chunk.match(/^(\d+)(?:-(\d+))?$/)
      if (!range) continue
      const verseStart = Number(range[1])
      const verseEnd = range[2] != null ? Number(range[2]) : undefined
      refs.push({
        display: formatVerseRange({
          display: '',
          book,
          chapter,
          verseStart,
          verseEnd,
        }),
        book,
        chapter,
        verseStart,
        verseEnd,
      })
    }
  }

  return refs
}

export function formatVerseRange(ref: ScriptureRef): string {
  if (ref.verseEnd != null && ref.verseEnd !== ref.verseStart) {
    return `${ref.book} ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`
  }
  return `${ref.book} ${ref.chapter}:${ref.verseStart}`
}
