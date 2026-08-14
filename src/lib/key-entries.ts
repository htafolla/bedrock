/**
 * Keys = short storm triage on home (not the full atlas).
 *
 * Order:
 *   Solid (2): God · Marriage
 *   Fire (plan): Out of control · Trust · Grief · Wounded · Obsession · Regret · Fear
 *   Extra storms: Addiction · Jealousy · Control · Sexual sin · Witchcraft · Persecution
 *
 * Rules:
 * - journeyId only when this key’s chamberId is that path’s doorChamberId.
 * - Fruit / formation (Love, Patience fruit, Spirit) live in Contents — not Keys.
 * - Multi-step walks: Journeys tab. Full atlas: Contents. Rubric: Standard.
 * Desktop: grid · Mobile: carousel of 3.
 */
export interface KeyEntry {
  id: string
  label: string
  hint: string
  chamberId: string
  /**
   * Optional primary core journey opened by this key.
   * Must match journeys.json doorChamberId === chamberId.
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
    // Station only — forced-waiting door is Wait, not God first
  },
  {
    id: 'key-marriage',
    label: 'Marriage',
    hint: 'Covenant',
    chamberId: 'marriage-covenant',
    // Station only — spouse-left door is Wounded
  },
  {
    id: 'key-wait',
    label: 'Out of control',
    hint: "Can't force it",
    chamberId: 'wait-on-the-lord',
    journeyId: 'forced-waiting',
  },
  {
    id: 'key-trust',
    label: 'Trust',
    hint: 'Release grip',
    chamberId: 'trust-in-the-lord',
    // Station only — on forced-waiting path after Wait
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
    id: 'key-regret',
    label: 'Regret',
    hint: 'I blew it',
    chamberId: 'regret',
    journeyId: 'stuck-regret',
  },
  {
    id: 'key-fear',
    label: 'Fear',
    hint: 'Abandonment',
    chamberId: 'fear',
    journeyId: 'abandonment-fear',
  },
  {
    id: 'key-addiction',
    label: 'Addiction',
    hint: 'It owns me',
    chamberId: 'addiction',
    journeyId: 'addiction',
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
    hint: 'Stop securing',
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
    // Station only — spiritual-warfare-fog door is spiritual-warfare
  },
  {
    id: 'key-persecution',
    label: 'Persecution',
    hint: 'For His name',
    chamberId: 'persecution',
    journeyId: 'persecution',
  },
]
