/**
 * Keys = storm triage only (short list).
 * Full atlas lives on Map · Contents — not on the first screen.
 *
 * Two solid doors first: God · Marriage.
 * Then the fire — chip labels lead with positives / plain speech people recognize.
 * Desktop: 4-column grid · Mobile: carousel of 3.
 * Close: Sexual sin · Witchcraft · Persecution · Love.
 * Regret stays Map / Contents (past act; Addiction owns the first-screen bondage door).
 * Hope of glory stays Map terminus. Faith ≈ Trust already.
 */
export interface KeyEntry {
  id: string
  label: string
  hint: string
  chamberId: string
  /**
   * Optional primary core journey opened by this key.
   * SSOT for stages: src/content/journeys.json (via journeys.ts).
   */
  journeyId?: string
}

/** First doors for the broken — short, ordered. */
export const KEY_ENTRIES: KeyEntry[] = [
  {
    id: 'key-god',
    label: 'God',
    hint: 'First',
    chamberId: 'god-first',
    journeyId: 'forced-waiting',
  },
  {
    id: 'key-marriage',
    label: 'Marriage',
    hint: 'Covenant',
    chamberId: 'marriage-covenant',
    journeyId: 'spouse-left',
  },
  {
    id: 'key-patience',
    label: 'Patience',
    hint: "Can't force it",
    chamberId: 'patience',
    journeyId: 'forced-waiting',
  },
  {
    id: 'key-trust',
    label: 'Trust',
    hint: 'Release grip',
    chamberId: 'trust-in-the-lord',
    journeyId: 'forced-waiting',
  },
  {
    id: 'key-loss',
    label: 'Grief',
    hint: 'Loss',
    chamberId: 'loss',
    journeyId: 'death-of-loved-one',
  },
  {
    id: 'key-wounded',
    label: 'Wounded',
    hint: 'I was hurt',
    chamberId: 'wounded',
    journeyId: 'spouse-left',
  },
  {
    id: 'key-obsession',
    label: 'Obsession',
    hint: 'Mind stuck on loop',
    chamberId: 'rumination',
    journeyId: 'obsession',
  },
  {
    id: 'key-addiction',
    label: 'Addiction',
    hint: 'It owns me',
    chamberId: 'addiction',
    journeyId: 'addiction',
  },
  {
    id: 'key-fear',
    label: 'Fear',
    hint: 'Abandonment',
    chamberId: 'fear',
    journeyId: 'abandonment-fear',
  },
  {
    id: 'key-jealousy',
    label: 'Jealousy',
    hint: 'Not love',
    chamberId: 'jealousy',
    journeyId: 'jealousy',
  },
  {
    id: 'key-control',
    label: 'Control',
    hint: 'Open hand',
    chamberId: 'control',
    journeyId: 'control-grip',
  },
  {
    id: 'key-sexual-sin',
    label: 'Sexual sin',
    hint: 'Not your own',
    chamberId: 'adultery',
    journeyId: 'sexual-sin',
  },
  {
    id: 'key-witchcraft',
    label: 'Witchcraft',
    hint: 'Counterfeit power',
    chamberId: 'pharmakeia',
    journeyId: 'spiritual-warfare-fog',
  },
  {
    id: 'key-persecution',
    label: 'Persecution',
    hint: 'For His name',
    chamberId: 'persecution',
    journeyId: 'persecution',
  },
  {
    id: 'key-love',
    label: 'Love',
    hint: 'Still the way',
    chamberId: 'love',
    // Love is formation / fruit — not a storm journey door
  },
]
