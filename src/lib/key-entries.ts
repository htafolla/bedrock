/**
 * Keys = storm triage only (short list).
 * Full atlas lives on Map · Contents — not on the first screen.
 *
 * Two solid doors first: God · Marriage.
 * Then the fire — chip labels lead with positives / plain speech people recognize.
 * Close the grid (12 = clean 3×4 / 4×3): Jealousy · Sexual sin · Love.
 * Addiction replaces Regret; Jealousy replaces Witchcraft on Keys
 * (regret / pharmakeia stay on Map · Contents).
 * Hope of glory stays Map terminus. Faith ≈ Trust already.
 */
export interface KeyEntry {
  id: string
  label: string
  hint: string
  chamberId: string
}

/** First doors for the broken — short, ordered. */
export const KEY_ENTRIES: KeyEntry[] = [
  {
    id: 'key-god',
    label: 'God',
    hint: 'First',
    chamberId: 'god-first',
  },
  {
    id: 'key-marriage',
    label: 'Marriage',
    hint: 'Covenant',
    chamberId: 'marriage-covenant',
  },
  {
    id: 'key-patience',
    label: 'Patience',
    hint: "Can't force it",
    chamberId: 'patience',
  },
  {
    id: 'key-trust',
    label: 'Trust',
    hint: 'Release grip',
    chamberId: 'trust-in-the-lord',
  },
  {
    id: 'key-loss',
    label: 'Grief',
    hint: 'Loss',
    chamberId: 'loss',
  },
  {
    id: 'key-wounded',
    label: 'Wounded',
    hint: 'I was hurt',
    chamberId: 'wounded',
  },
  {
    id: 'key-obsession',
    label: 'Obsession',
    hint: 'Mind stuck on loop',
    chamberId: 'rumination',
  },
  {
    id: 'key-addiction',
    label: 'Addiction',
    hint: 'It owns me',
    chamberId: 'addiction',
  },
  {
    id: 'key-fear',
    label: 'Fear',
    hint: 'Abandonment',
    chamberId: 'fear',
  },
  {
    id: 'key-jealousy',
    label: 'Jealousy',
    hint: 'Not love',
    chamberId: 'jealousy',
  },
  {
    id: 'key-sexual-sin',
    label: 'Sexual sin',
    hint: 'Not your own',
    chamberId: 'adultery',
  },
  {
    id: 'key-love',
    label: 'Love',
    hint: 'Still the way',
    chamberId: 'love',
  },
]
