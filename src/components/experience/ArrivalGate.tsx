interface ArrivalGateProps {
  title: string
  /** Motto: Do Better. Be Better. Trust God. */
  subtitle: string
  /** Hitchhiker's Guide line (holds the triad once) */
  tagline?: string
  mission?: string
  prologue?: string[]
  onEnter: () => void
}

export function ArrivalGate({
  title,
  subtitle,
  tagline,
  mission,
  prologue,
  onEnter,
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
        {prologue?.length ? (
          <div className="prologue">
            {prologue.map((line) => (
              <p key={line} className="prologue-line">
                {line}
              </p>
            ))}
          </div>
        ) : null}
        <button type="button" className="arrival-enter" onClick={onEnter}>
          Enter the nave
        </button>
        <p className="arrival-hint">A quiet path of first principles. Solid ground.</p>
      </div>
    </div>
  )
}
