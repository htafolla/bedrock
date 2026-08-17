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

/** Main walk tabs — three only so the pill never wraps. */
const MODES: Array<{ id: NavMode; label: string }> = [
  { id: 'keys', label: 'Keys' },
  { id: 'journeys', label: 'Journeys' },
  { id: 'toc', label: 'Contents' },
]

/**
 * Mobile-first top chrome:
 * Bedrock · Keys/Journeys/Contents · [Field · theme] (profile start, far right).
 */
export function NavModes({ mode, onChange, theme, onToggleTheme, onHome }: NavModesProps) {
  const fieldActive = mode === 'field'

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
        <div className="nav-profile" aria-label="Field and display">
          <button
            type="button"
            className={fieldActive ? 'nav-field-chip active' : 'nav-field-chip'}
            aria-pressed={fieldActive}
            aria-label="Field — your walk"
            title="Field — your walk"
            onClick={() => onChange('field')}
          >
            Field
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} className="nav-theme" />
        </div>
      </div>
    </header>
  )
}
