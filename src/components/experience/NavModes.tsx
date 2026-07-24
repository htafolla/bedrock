export type NavMode = 'keys' | 'map' | 'toc'

interface NavModesProps {
  mode: NavMode
  onChange: (mode: NavMode) => void
}

const MODES: Array<{ id: NavMode; label: string }> = [
  { id: 'keys', label: 'Keys' },
  { id: 'map', label: 'Map' },
  { id: 'toc', label: 'Contents' },
]

/** Mobile-first top switcher: Keys · Map · Contents */
export function NavModes({ mode, onChange }: NavModesProps) {
  return (
    <header className="nav-modes" role="banner">
      <div className="nav-modes-bar">
        <p className="nav-brand" aria-hidden>
          Bedrock
        </p>
        <nav className="nav-modes-inner" aria-label="How to navigate" role="tablist">
          {MODES.map((m) => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'nav-mode-btn active' : 'nav-mode-btn'}
                onClick={() => onChange(m.id)}
              >
                {m.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
