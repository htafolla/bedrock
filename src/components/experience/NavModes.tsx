import type { ThemeMode } from '../../lib/theme-preference'
import { ThemeToggle } from './ThemeToggle'

/** map kept for DNA/legacy; about is footer-only (not in header chrome). */
export type NavMode = 'keys' | 'journeys' | 'field' | 'map' | 'toc' | 'about'

interface NavModesProps {
  mode: NavMode
  onChange: (mode: NavMode) => void
  theme: ThemeMode
  onToggleTheme: () => void
  /** Brand → home (default Keys surface, leave chamber). */
  onHome: () => void
}

/** Header chrome — Field is first-class (local walk state), not optional. */
const MODES: Array<{ id: NavMode; label: string }> = [
  { id: 'keys', label: 'Keys' },
  { id: 'journeys', label: 'Journeys' },
  { id: 'field', label: 'Field' },
  { id: 'toc', label: 'Contents' },
]

/** Mobile-first top chrome: Bedrock · Keys/Journeys/Contents · theme far right. */
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
