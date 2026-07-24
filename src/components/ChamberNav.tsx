import type { Chamber } from '../types/content'

interface ChamberNavProps {
  chambers: Chamber[]
  activeId: string
  onSelect: (id: string) => void
}

export function ChamberNav({ chambers, activeId, onSelect }: ChamberNavProps) {
  return (
    <nav className="chamber-nav" aria-label="Bedrock chambers">
      <ol>
        {chambers.map((chamber, index) => {
          const active = chamber.id === activeId
          return (
            <li key={chamber.id}>
              <button
                type="button"
                className={active ? 'chamber-nav-item active' : 'chamber-nav-item'}
                onClick={() => onSelect(chamber.id)}
                aria-current={active ? 'true' : undefined}
              >
                <span className="chamber-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="chamber-nav-title">{chamber.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
