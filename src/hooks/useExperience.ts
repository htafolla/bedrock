import { useCallback, useReducer } from 'react'
import type { ExperienceAction, ExperienceState } from '../types/experience'
import { DEFAULT_SPINE_ID, spineNeighbor } from '../lib/spine'

function reducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case 'ENTER_NAVE':
      return {
        mode: 'constellation',
        activeChamberId: state.activeChamberId ?? DEFAULT_SPINE_ID,
      }
    case 'OPEN_CHAMBER':
      return {
        mode: 'chamber',
        activeChamberId: action.id,
      }
    case 'BACK_TO_MAP':
      return {
        mode: 'constellation',
        activeChamberId: state.activeChamberId,
      }
    case 'SPINE_STEP': {
      if (!state.activeChamberId) return state
      const next = spineNeighbor(state.activeChamberId, action.delta)
      if (!next) return state
      return {
        mode: 'chamber',
        activeChamberId: next,
      }
    }
    default:
      return state
  }
}

const initial: ExperienceState = {
  mode: 'arrival',
  activeChamberId: null,
}

export function useExperience() {
  const [state, dispatch] = useReducer(reducer, initial)

  const enterNave = useCallback(() => dispatch({ type: 'ENTER_NAVE' }), [])
  const openChamber = useCallback((id: string) => dispatch({ type: 'OPEN_CHAMBER', id }), [])
  const backToMap = useCallback(() => dispatch({ type: 'BACK_TO_MAP' }), [])
  const spineStep = useCallback((delta: -1 | 1) => dispatch({ type: 'SPINE_STEP', delta }), [])

  return {
    state,
    enterNave,
    openChamber,
    backToMap,
    spineStep,
  }
}
