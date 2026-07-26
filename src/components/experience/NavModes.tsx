import type { ThemeMode } from '../../lib/theme-preference'
import { ThemeToggle } from './ThemeToggle'

export type NavMode = 'keys' | 'map' | 'toc'

interface NavModesProps {
  mode: NavMode
  onChange: (mode: NavMode) => void
  theme: ThemeMode
  onToggleTheme: () => void
  /** Brand → home (default Keys surface, leave chamber). */
  onHome: () => void
}

const MODES: Array<{ id: NavMode; label: string }> = [
  { id: 'keys', label: 'Keys' },
  { id: 'map', label: 'Map' },
  { id: 'toc', label: 'Contents' },
]

/** Mobile-first top chrome: Bedrock · Keys/Map/Contents · theme far right. */
export function NavModes({ mode, onChange, theme, onToggleTheme, onHome }: NavModesProps) {
  return (
    <header className="nav-modes" role="banner">
      <div className="nav-modes-bar">
        <button type="button" className="nav-brand" onClick={onHome} aria-label="Bedrock home">
          Bedrock
        </button>
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
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="nav-theme" />
      </div>
    </header>
  )
}
