/** 2D fallback when WebGL / motion / mobile caps out 3D. */
export function FallbackAtmosphere() {
  return (
    <div className="fallback-atmosphere" aria-hidden>
      <div className="fallback-glow" />
      <div className="fallback-ember fallback-ember-a" />
      <div className="fallback-ember fallback-ember-b" />
      <div className="fallback-ember fallback-ember-c" />
    </div>
  )
}
