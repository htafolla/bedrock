import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollExperienceToTop } from './scroll-top'

describe('scrollExperienceToTop', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('calls window.scrollTo(0, 0)', () => {
    const scrollTo = vi.fn()
    const docEl = { scrollTop: 400 }
    const body = { scrollTop: 400 }
    const getComputedStyle = vi.fn(() => ({ overflowY: 'visible' }))
    vi.stubGlobal('window', { scrollTo, getComputedStyle })
    vi.stubGlobal('document', { documentElement: docEl, body })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })

    scrollExperienceToTop()

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(docEl.scrollTop).toBe(0)
    expect(body.scrollTop).toBe(0)
  })

  it('scrolls an anchor into view at the start', () => {
    const intoView = vi.fn()
    const anchor = {
      scrollTop: 0,
      parentElement: null as HTMLElement | null,
      scrollIntoView: intoView,
    }
    const scrollTo = vi.fn()
    vi.stubGlobal('window', {
      scrollTo,
      getComputedStyle: () => ({ overflowY: 'visible' }),
    })
    vi.stubGlobal('document', {
      documentElement: { scrollTop: 0 },
      body: { scrollTop: 0 },
    })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })

    scrollExperienceToTop(anchor as unknown as HTMLElement)

    expect(intoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'start', behavior: 'auto' }),
    )
  })
})
