import type { ThemeMode } from '../../lib/theme-preference'

interface ThemeToggleProps {
  theme: ThemeMode
  onToggle: () => void
  /** Compact placement (nav bar) vs arrival overlay */
  className?: string
}

/** Toggle light / dark. Label shows the mode you will switch to. */
export function ThemeToggle({ theme, onToggle, className = '' }: ThemeToggleProps) {
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'light' ? 'Light' : 'Dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {label}
    </button>
  )
}
