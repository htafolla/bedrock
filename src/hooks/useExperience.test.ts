import { describe, expect, it } from 'vitest'
import { DEFAULT_SPINE_ID, spineNeighbor } from '../lib/spine'
import type { ExperienceState } from '../types/experience'

/** Mirrors useExperience reducer for pure unit precision */
function reduce(
  state: ExperienceState,
  action:
    | { type: 'ENTER_NAVE' }
    | { type: 'OPEN_CHAMBER'; id: string }
    | { type: 'BACK_TO_MAP' }
    | { type: 'SPINE_STEP'; delta: -1 | 1 }
    | { type: 'RESTORE'; mode: ExperienceState['mode']; activeChamberId: string | null },
): ExperienceState {
  switch (action.type) {
    case 'ENTER_NAVE':
      return { mode: 'constellation', activeChamberId: state.activeChamberId ?? DEFAULT_SPINE_ID }
    case 'OPEN_CHAMBER':
      return { mode: 'chamber', activeChamberId: action.id }
    case 'BACK_TO_MAP':
      return { mode: 'constellation', activeChamberId: state.activeChamberId }
    case 'SPINE_STEP': {
      if (!state.activeChamberId) return state
      const next = spineNeighbor(state.activeChamberId, action.delta)
      if (!next) return state
      return { mode: 'chamber', activeChamberId: next }
    }
    case 'RESTORE':
      return { mode: action.mode, activeChamberId: action.activeChamberId }
    default:
      return state
  }
}

describe('experience state machine', () => {
  it('arrival → constellation on enter', () => {
    const next = reduce({ mode: 'arrival', activeChamberId: null }, { type: 'ENTER_NAVE' })
    expect(next.mode).toBe('constellation')
    expect(next.activeChamberId).toBe(DEFAULT_SPINE_ID)
  })

  it('constellation → chamber on open', () => {
    const next = reduce(
      { mode: 'constellation', activeChamberId: DEFAULT_SPINE_ID },
      { type: 'OPEN_CHAMBER', id: 'wait-on-the-lord' },
    )
    expect(next).toEqual({ mode: 'chamber', activeChamberId: 'wait-on-the-lord' })
  })

  it('chamber → constellation preserves active id', () => {
    const next = reduce(
      { mode: 'chamber', activeChamberId: 'do-not-fear' },
      { type: 'BACK_TO_MAP' },
    )
    expect(next).toEqual({ mode: 'constellation', activeChamberId: 'do-not-fear' })
  })

  it('spine step advances along nave', () => {
    const next = reduce(
      { mode: 'chamber', activeChamberId: 'god-first' },
      { type: 'SPINE_STEP', delta: 1 },
    )
    expect(next.activeChamberId).toBe('his-power-and-beauty')
  })

  it('RESTORE applies browser history without other transitions', () => {
    const next = reduce(
      { mode: 'chamber', activeChamberId: 'loss' },
      { type: 'RESTORE', mode: 'constellation', activeChamberId: 'loss' },
    )
    expect(next).toEqual({ mode: 'constellation', activeChamberId: 'loss' })
  })
})
