/** Core multi-stage walks through the chamber atlas (ground-shaking life). */

export type JourneyFamily = 'body' | 'will' | 'conscience' | 'world'

/** Shared spine roles — not every stage uses every role. */
export type JourneyStageRole =
  | 'blow'
  | 'near'
  | 'spiral'
  | 'fork'
  | 'long_middle'
  | 'remain'

export interface JourneyStage {
  id: string
  role: JourneyStageRole
  /** Short human label for UI / chat */
  label: string
  chamberId: string
  /** Pastoral precision for this station */
  note?: string
}

export interface Journey {
  id: string
  title: string
  family: JourneyFamily
  /** Ship priority: 1 first */
  wave: 1 | 2 | 3
  summary: string
  /**
   * Optional short line for OG / share cards (path PNG + share payload).
   * Falls back to summary when omitted.
   */
  shareSummary?: string
  /** Phrases people actually say — matching entry */
  plainSpeech: string[]
  /** First chamber when entering this journey */
  doorChamberId: string
  /** Journeys that must not be confused with this one */
  distinctFrom?: string[]
  /** Keys that open this journey */
  keyIds?: string[]
  /** Stage ids that commonly re-enter (spiral / long middle) */
  loopStageIds?: string[]
  stages: JourneyStage[]
}

export interface JourneysMeta {
  version: string
  revised: string
  title: string
  description: string
  stageRoles: JourneyStageRole[]
  families: Record<JourneyFamily, string>
  count: number
}

export interface JourneysDocument {
  meta: JourneysMeta
  journeys: Journey[]
}
