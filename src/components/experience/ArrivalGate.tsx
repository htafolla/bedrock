interface ArrivalGateProps {
  title: string
  /** Motto: Do Better. Be Better. Trust God. */
  subtitle: string
  /** Hitchhiker's Guide line (holds the triad once) */
  tagline?: string
  mission?: string
  prologue?: string[]
  onEnter: () => void
  /** Optional sealed word / about (after enter chrome would show footer About) */
  onAbout?: () => void
}

export function ArrivalGate({
  title,
  subtitle,
  tagline,
  mission,
  prologue,
  onEnter,
  onAbout,
}: ArrivalGateProps) {
  return (
    <div className="arrival-gate">
      <div className="arrival-card">
        <p className="site-eyebrow">
          {tagline ?? "A Hitchhiker's Guide to Love · Living · Enduring"}
        </p>
        <h1 className="site-title">{title}</h1>
        <p className="site-motto">{subtitle}</p>
        {mission ? <p className="site-mission">{mission}</p> : null}
        <button type="button" className="arrival-enter" onClick={onEnter}>
          Enter
        </button>
        {onAbout ? (
          <button type="button" className="arrival-about" onClick={onAbout}>
            About
          </button>
        ) : null}
        {prologue?.length ? (
          <div className="arrival-under-enter" aria-label="Prologue">
            {prologue.map((line) => (
              <p key={line} className="arrival-under-enter-line">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
