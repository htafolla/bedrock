import type { Chamber } from '../../types/content'
import { orderChambersBySpine, spineIndexOf } from '../../lib/spine'

interface TableOfContentsProps {
  chambers: Chamber[]
  activeChamberId: string | null
  onSelect: (id: string) => void
}

/** Full ordered list of first principles — searchable by eye, mobile-scrollable. */
export function TableOfContents({
  chambers,
  activeChamberId,
  onSelect,
}: TableOfContentsProps) {
  const ordered = orderChambersBySpine(chambers)

  return (
    <div className="toc-panel">
      <header className="nav-panel-header">
        <p className="constellation-kicker">Contents</p>
        <h2 className="constellation-title">All first principles</h2>
        <p className="constellation-blurb">
          Full table of contents in pilgrimage order. {ordered.length} chambers.
        </p>
      </header>
      <ol className="toc-list" aria-label="Table of contents">
        {ordered.map((c, i) => {
          const active = c.id === activeChamberId
          const n = spineIndexOf(c.id) >= 0 ? spineIndexOf(c.id) + 1 : i + 1
          return (
            <li key={c.id}>
              <button
                type="button"
                className={active ? 'toc-item active' : 'toc-item'}
                onClick={() => onSelect(c.id)}
                aria-current={active ? 'true' : undefined}
              >
                <span className="toc-num">{String(n).padStart(2, '0')}</span>
                <span className="toc-body">
                  <span className="toc-title">{c.title}</span>
                  <span className="toc-summary">{c.summary}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
