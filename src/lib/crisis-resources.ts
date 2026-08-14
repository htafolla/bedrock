/**
 * Real-world crisis / counsel lines (US).
 * Bedrock is a field guide — not a hotline. Always offer these when urgency is high.
 */

export interface CrisisResource {
  id: string
  label: string
  detail: string
  /** tel: / sms: / https: */
  href: string
  /** Short chip text */
  chip: string
}

/** Primary US crisis line — call or text 988 */
export const CRISIS_988: CrisisResource = {
  id: '988',
  label: '988 Suicide & Crisis Lifeline',
  detail: 'Call or text 988 · 24/7 · free · confidential',
  href: 'tel:988',
  chip: '988',
}

/**
 * Focus on the Family counseling consultation (Christian).
 * Weekdays 6am–8pm Mountain — not 24/7; 988 remains the always-on emergency line.
 */
export const CHRISTIAN_COUNSEL: CrisisResource = {
  id: 'fotf-counsel',
  label: 'Focus on the Family Counseling',
  detail: '1-855-771-HELP (4357) · Christian counsel · weekdays MT',
  href: 'tel:18557714357',
  chip: '1-855-771-HELP',
}

/** Ordered list for UI */
export const CRISIS_RESOURCES: CrisisResource[] = [CRISIS_988, CHRISTIAN_COUNSEL]

/** One-line footer / chat chrome */
export const CRISIS_FOOTER_LINE =
  'In crisis: call or text 988 · Christian counsel: 1-855-771-HELP (4357)'

/** Slightly fuller for About / static pages */
export const CRISIS_HELP_BLURB =
  'If you are in crisis or may harm yourself, call or text 988 (US Suicide & Crisis Lifeline) right now. For Christian counseling consultation: 1-855-771-HELP (4357). Bedrock is a field guide — not a crisis hotline, pastor, or therapist.'

/** Inject into guide system prompt */
export const CRISIS_SYSTEM_NOTE = `Crisis (hard):
- You are not a crisis hotline. If the visitor is in immediate danger, suicidal, or may harm themselves or others: urge them to call or text 988 (US Suicide & Crisis Lifeline) now, or local emergency services. Do not continue only with spiritual counsel as if that replaces emergency help.
- For Christian counseling consultation (not emergency): Focus on the Family Counseling at 1-855-771-HELP (4357), weekdays Mountain Time.
- Say the numbers plainly. Do not invent hotlines.`
