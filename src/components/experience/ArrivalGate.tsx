interface ArrivalGateProps {
  title: string
  /** Motto: Do Better. Be Better. Trust God. */
  subtitle: string
  /** Hitchhiker's Guide line (holds the triad once) */
  tagline?: string
  mission?: string
  prologue?: string[]
  onEnter: () => void
  /** Origin page — full poem, heart, crisis lines (not an SPA overlay) */
  aboutHref?: string
}

export function ArrivalGate({
  title,
  subtitle,
  tagline,
  mission,
  prologue,
  onEnter,
  aboutHref = '/about',
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
        {aboutHref ? (
          <a href={aboutHref} className="arrival-about">
            About
          </a>
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
