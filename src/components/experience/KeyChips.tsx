import { KEY_ENTRIES } from '../../lib/key-entries'

interface KeyChipsProps {
  activeChamberId: string | null
  onSelect: (chamberId: string) => void
}

/** Trial-keyed shortcuts — primary path on mobile when you know the fight. */
export function KeyChips({ activeChamberId, onSelect }: KeyChipsProps) {
  return (
    <div className="key-chips-panel">
      <header className="nav-panel-header">
        <p className="constellation-kicker">Keys</p>
        <h2 className="constellation-title">What are you facing?</h2>
        <p className="constellation-blurb">
          Start with the big ones — God, fear, marriage, loss. Then the rest of the fight. Map and
          Contents hold the full path.
        </p>
      </header>
      <ul className="key-chips" aria-label="Key entry points">
        {KEY_ENTRIES.map((entry) => {
          const active = entry.chamberId === activeChamberId
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={active ? 'key-chip active' : 'key-chip'}
                onClick={() => onSelect(entry.chamberId)}
              >
                <span className="key-chip-label">{entry.label}</span>
                <span className="key-chip-hint">{entry.hint}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
