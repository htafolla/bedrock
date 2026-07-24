/** Hybrid IA modes — see docs/ia-hybrid.md */
export type ExperienceMode = 'arrival' | 'constellation' | 'chamber'

export interface ExperienceState {
  mode: ExperienceMode
  /** Last / current chamber; null only before first selection */
  activeChamberId: string | null
}

export type ExperienceAction =
  | { type: 'ENTER_NAVE' }
  | { type: 'OPEN_CHAMBER'; id: string }
  | { type: 'BACK_TO_MAP' }
  | { type: 'SPINE_STEP'; delta: -1 | 1 }
