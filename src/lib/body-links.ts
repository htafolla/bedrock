/**
 * Inline chamber links inside Truth paragraphs.
 * Syntax: [Label](chamber:chamber-id)
 * Example: full Standard: [Kill the Flesh. Walk in the Spirit.](chamber:kill-the-flesh-walk-in-the-spirit)
 */

export type BodyTextPart =
  | { type: 'text'; text: string }
  | { type: 'chamber'; id: string; label: string }

const CHAMBER_LINK_RE = /\[([^\]]+)\]\(chamber:([a-z0-9]+(?:-[a-z0-9]+)*)\)/gi

export function hasChamberLinks(text: string): boolean {
  return /\[([^\]]+)\]\(chamber:([a-z0-9]+(?:-[a-z0-9]+)*)\)/i.test(String(text || ''))
}

/** Split paragraph text into plain segments + chamber links (in order). */
export function parseBodyChamberLinks(text: string): BodyTextPart[] {
  const s = String(text || '')
  if (!s) return []
  const parts: BodyTextPart[] = []
  let last = 0
  const re = new RegExp(CHAMBER_LINK_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) != null) {
    if (m.index > last) {
      parts.push({ type: 'text', text: s.slice(last, m.index) })
    }
    parts.push({ type: 'chamber', label: m[1]!, id: m[2]!.toLowerCase() })
    last = m.index + m[0].length
  }
  if (last < s.length) parts.push({ type: 'text', text: s.slice(last) })
  if (parts.length === 0) parts.push({ type: 'text', text: s })
  return parts
}

/** Markdown / static HTML: expand chamber: links to public /c/{slug} URLs. */
export function expandChamberLinksToMarkdown(
  text: string,
  origin: string,
  publicSlug: (id: string) => string,
): string {
  return String(text || '').replace(CHAMBER_LINK_RE, (_full, label: string, id: string) => {
    const slug = publicSlug(String(id).toLowerCase())
    return `[${label}](${origin}/c/${slug})`
  })
}

export function expandChamberLinksToHtml(
  text: string,
  publicSlug: (id: string) => string,
  esc: (s: string) => string,
): string {
  const parts = parseBodyChamberLinks(text)
  return parts
    .map((p) => {
      if (p.type === 'text') return esc(p.text)
      const href = `/c/${esc(publicSlug(p.id))}`
      return `<a class="chamber-inline-link" href="${href}">${esc(p.label)}</a>`
    })
    .join('')
}
