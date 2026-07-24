/**
 * Key entry chips — crisis / trial shortcuts into the field guide.
 * Mobile-first: fewer taps than the full TOC when you know what you're fighting.
 */
export interface KeyEntry {
  id: string
  label: string
  /** Short tag under the label */
  hint: string
  chamberId: string
}

export const KEY_ENTRIES: KeyEntry[] = [
  {
    id: 'key-god',
    label: 'God First',
    hint: 'Foundation',
    chamberId: 'god-first',
  },
  {
    id: 'key-fall',
    label: 'I fell',
    hint: 'Rise again',
    chamberId: 'the-righteous-fall',
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
    id: 'key-marriage',
    label: 'Covenant',
    hint: 'Marriage',
    chamberId: 'marriage-covenant',
  },
  {
    id: 'key-wait',
    label: 'Wait',
    hint: 'On the Lord',
    chamberId: 'wait-on-the-lord',
  },
  {
    id: 'key-fear',
    label: 'Fear',
    hint: 'Perfect love',
    chamberId: 'fear',
  },
  {
    id: 'key-loss',
    label: 'Loss',
    hint: 'Brokenhearted',
    chamberId: 'loss',
  },
  {
    id: 'key-forgive',
    label: 'Forgive',
    hint: 'As forgiven',
    chamberId: 'forgive-as-you-have-been-forgiven',
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
