/**
 * Key entry chips — ordered for first navigation under pressure.
 * Lead with what people are actually facing (God, fear, marriage, loss…),
 * not abstract “category” depth or spine pilgrimage order.
 */
export interface KeyEntry {
  id: string
  label: string
  /** Short tag under the label */
  hint: string
  chamberId: string
}

/**
 * Display order = priority on page load (Keys tab default).
 * God → Fear → Marriage first; then common trials; deeper categories later.
 */
export const KEY_ENTRIES: KeyEntry[] = [
  {
    id: 'key-god',
    label: 'God',
    hint: 'First',
    chamberId: 'god-first',
  },
  {
    id: 'key-fear',
    label: 'Fear',
    hint: 'Perfect love',
    chamberId: 'fear',
  },
  {
    id: 'key-marriage',
    label: 'Marriage',
    hint: 'Covenant',
    chamberId: 'marriage-covenant',
  },
  {
    id: 'key-loss',
    label: 'Loss',
    hint: 'Brokenhearted',
    chamberId: 'loss',
  },
  {
    id: 'key-fall',
    label: 'I fell',
    hint: 'Rise again',
    chamberId: 'the-righteous-fall',
  },
  {
    id: 'key-forgive',
    label: 'Forgive',
    hint: 'As forgiven',
    chamberId: 'forgive-as-you-have-been-forgiven',
  },
  {
    id: 'key-wait',
    label: 'Wait',
    hint: 'On the Lord',
    chamberId: 'wait-on-the-lord',
  },
  {
    id: 'key-vengeance',
    label: 'Hatred',
    hint: 'Leave vengeance',
    chamberId: 'leave-vengeance-to-the-lord',
  },
  {
    id: 'key-grace',
    label: 'Grace',
    hint: 'Sufficient',
    chamberId: 'his-grace-is-sufficient',
  },
  {
    id: 'key-spirit',
    label: 'Spirit',
    hint: 'Not flesh',
    chamberId: 'walk-by-the-spirit',
  },
  {
    id: 'key-confess',
    label: 'Confess',
    hint: 'Be cleansed',
    chamberId: 'confess-and-be-cleansed',
  },
  {
    id: 'key-armor',
    label: 'Armor',
    hint: 'Stand',
    chamberId: 'the-full-armor-of-god',
  },
  {
    id: 'key-hope',
    label: 'Hope',
    hint: 'Of glory',
    chamberId: 'hope-of-glory',
  },
  {
    id: 'key-cross',
    label: 'The Cross',
    hint: 'Justified',
    chamberId: 'the-cross-and-our-justification',
  },
]
