import { publicChamberSlug, resolveChamberIdFromSlug } from './chamber-slugs'

/** Normalize chamber titles / chip labels for loose matching. */
export function normalizeChamberLabel(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\w\s'-]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Resolve a guide "Connected truth" chip label to a chamber id.
 * Matches exact title (case-insensitive), then slug/id forms + public aliases.
 */
export function resolveChamberId(
  label: string,
  chambers: ReadonlyArray<{ id: string; title: string }>,
): string | null {
  const n = normalizeChamberLabel(label)
  if (!n) return null

  const byTitle = chambers.find((c) => normalizeChamberLabel(c.title) === n)
  if (byTitle) return byTitle.id

  const raw = label.trim().toLowerCase()
  const byId = chambers.find((c) => c.id === raw || c.id === n.replace(/\s+/g, '-'))
  if (byId) return byId.id

  // "God First" ↔ god-first; "Master the Flesh" public slug ↔ kill-the-flesh
  const slug = n.replace(/\s+/g, '-')
  const viaAlias = resolveChamberIdFromSlug(slug)
  if (viaAlias !== slug && chambers.some((c) => c.id === viaAlias)) return viaAlias

  const bySlug = chambers.find((c) => c.id === slug || publicChamberSlug(c.id) === slug)
  return bySlug?.id ?? null
}
