/**
 * Mobile-first jump to top after chamber navigation.
 * Instant (no smooth scroll) — reliable on iOS/Android when content swaps mid-page.
 */
export function scrollExperienceToTop(anchor?: HTMLElement | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const jump = () => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    let node: HTMLElement | null = anchor ?? null
    while (node) {
      if (node.scrollTop > 0) node.scrollTop = 0
      const style = window.getComputedStyle(node)
      const oy = style.overflowY
      if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollTop > 0) {
        node.scrollTop = 0
      }
      node = node.parentElement
    }

    if (anchor) {
      anchor.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' })
    }
  }

  jump()
  // Content swap can lag one frame on mobile WebKit — re-pin after layout.
  requestAnimationFrame(() => {
    jump()
    requestAnimationFrame(jump)
  })
}
