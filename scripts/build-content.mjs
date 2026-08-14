/**
 * One-shot content compiler: source text → src/content/bedrock.json
 * Run: node scripts/build-content.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildAiSurface } from './build-ai-surface.mjs'
import { FIELD_AIDS } from './field-aids.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '../src/content/bedrock.json')

function slug(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Expand "Romans 11:33, 36" / "Galatians 5:16, 22-23, 25" / "Matthew 19:4-6, 8-9" */
function parseVerseList(line) {
  const parts = line.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean)
  const refs = []
  for (const part of parts) {
    const cleaned = part.replace(/[–—]/g, '-')
    const m = cleaned.match(/^((?:\d\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+):(.*)$/)
    if (!m) continue
    const book = m[1].replace(/\s+/g, ' ').trim()
    const chapter = Number(m[2])
    const versePart = m[3].trim()
    const chunks = versePart.split(/\s*,\s*/)
    for (const chunk of chunks) {
      const range = chunk.match(/^(\d+)(?:-(\d+))?$/)
      if (!range) continue
      const verseStart = Number(range[1])
      const verseEnd = range[2] != null ? Number(range[2]) : undefined
      const display =
        verseEnd != null
          ? `${book} ${chapter}:${verseStart}–${verseEnd}`
          : `${book} ${chapter}:${verseStart}`
      refs.push({ display, book, chapter, verseStart, ...(verseEnd != null ? { verseEnd } : {}) })
    }
  }
  return refs
}

function paragraphs(...lines) {
  return lines.map((text) => ({ type: 'paragraph', text }))
}

/** Body block helpers — structured SOP (rubrics) and plain chambers */
function h2(text) {
  return { type: 'heading', level: 2, text }
}
function h3(text) {
  return { type: 'heading', level: 3, text }
}
function p(text) {
  return { type: 'paragraph', text }
}
function list(...items) {
  return { type: 'list', items: items.flat() }
}

/**
 * Station SSOT (kind defaults to chamber — not Standard/rubric).
 *
 * Uniform design contract (enforced by content-integrity tests):
 * - Under fire = 1–3 holds (field aids)
 * - Prayer = short release (field aids)
 * - Truth body = Scripture paragraphs for default stations
 * - Lists/headings in Truth are exceptional (allowlist: kill-the-flesh battle station, rubrics)
 * - Do not copy Standard SOP shape onto ordinary stations
 *
 * @param {string} title
 * @param {string} summary
 * @param {(string | { type: string })[]} bodyLines strings → paragraphs; objects pass through
 * @param {string} verseLine
 * @param {string} [fixedId] Stable id when display title must not change the slug (e.g. share URLs)
 */
function chamber(title, summary, bodyLines, verseLine, fixedId) {
  const body = bodyLines.map((line) =>
    typeof line === 'string' ? { type: 'paragraph', text: line } : line,
  )
  return {
    id: fixedId ?? slug(title),
    title,
    summary,
    body,
    verses: parseVerseList(verseLine),
    hacks: [],
    prayers: [],
    related: [],
  }
}

/**
 * Pressure-ready aids: Truth = Scripture (body); Under fire = our words (≤3);
 * Prayer = **release** — same temperance as the first spines (god-first → fall).
 *
 * Release prayer form (locked):
 * 1. Address God (Father / Lord / Jesus / Holy Spirit / Our Father)
 * 2. Truth about Him or honest empty hands (You are… / I cast… / I wait… / I am not God…)
 * 3. One quiet **release** — not war-orders, not “make me perform,” not gripping outcomes
 * 4. Short. Steel. Worshipful. End Amen.
 *
 * Gold: “Father, You are first. I am not God. Be still my heart and lead me in Your will. Amen.”
 * Gold: “Lord, I trust You with all my heart. I release control. Direct my path. Amen.”
 */
/** Edges in the navigable web of truth (chamber id → related ids). */
const RELATED = {
  'god-first': ['his-promises', 'trust-in-the-lord', 'do-not-fear', 'the-lords-prayer'],
  'his-power-and-beauty': ['god-first', 'his-promises', 'hope-of-glory'],
  'his-promises': ['god-first', 'he-is-for-you', 'trust-in-the-lord', 'hope-of-glory'],
  'his-provision': ['the-lords-prayer', 'trust-in-the-lord', 'god-first'],
  'the-lords-prayer': [
    'his-provision',
    'forgive-as-you-have-been-forgiven',
    'god-first',
    'prayer',
  ],
  'the-cross-and-our-justification': [
    'he-is-for-you',
    'his-grace-is-sufficient',
    'the-righteous-fall',
    'confess-and-be-cleansed',
  ],
  'he-is-for-you': ['the-cross-and-our-justification', 'his-promises', 'do-not-fear'],
  'his-grace-is-sufficient': [
    'the-righteous-fall',
    'walk-by-the-spirit',
    'the-cross-and-our-justification',
  ],
  'the-meaning-of-life': ['love-and-patience', 'choose-selfless-love', 'god-first'],
  'deny-yourself': [
    'walk-by-the-spirit',
    'the-cross-and-our-justification',
    'count-the-trial-as-joy',
    'self-control',
  ],
  'walk-by-the-spirit': [
    'kill-the-flesh-walk-in-the-spirit',
    'deny-yourself',
    'holy-spirit',
    'love',
    'joy',
    'peace',
    'patience',
    'kindness',
    'goodness',
    'faithfulness',
    'gentleness',
    'self-control',
    'works-of-the-flesh',
    'take-every-thought-captive',
    'spiritual-warfare',
    'the-righteous-fall',
    'the-full-armor-of-god',
  ],
  'holy-spirit': [
    'walk-by-the-spirit',
    'the-word',
    'spiritual-gifts',
    'take-every-thought-captive',
    'spiritual-warfare',
    'the-adversary',
    'prayer',
    'god-first',
    'love',
  ],
  love: [
    'walk-by-the-spirit',
    'holy-spirit',
    'love-and-patience',
    'choose-selfless-love',
    'leave-vengeance-to-the-lord',
    'marriage-covenant',
    'joy',
    'jealousy',
  ],
  joy: [
    'walk-by-the-spirit',
    'count-the-trial-as-joy',
    'hope-of-glory',
    'loss',
    'peace',
    'love',
  ],
  peace: [
    'walk-by-the-spirit',
    'fear',
    'do-not-fear',
    'trust-in-the-lord',
    'take-every-thought-captive',
    'patience',
  ],
  patience: [
    'walk-by-the-spirit',
    'wait-on-the-lord',
    'love-and-patience',
    'trust-in-the-lord',
    'peace',
    'self-control',
  ],
  kindness: [
    'walk-by-the-spirit',
    'be-quick-to-listen',
    'forgive-as-you-have-been-forgiven',
    'restore-gently-and-give-time',
    'goodness',
    'gentleness',
  ],
  goodness: [
    'walk-by-the-spirit',
    'walk-in-honesty-and-truth',
    'confess-and-be-cleansed',
    'the-full-armor-of-god',
    'kindness',
    'faithfulness',
  ],
  faithfulness: [
    'walk-by-the-spirit',
    'marriage-covenant',
    'god-on-marriage',
    'his-promises',
    'goodness',
    'gentleness',
  ],
  gentleness: [
    'walk-by-the-spirit',
    'restore-gently-and-give-time',
    'guard-your-heart-and-mouth',
    'leave-vengeance-to-the-lord',
    'kindness',
    'self-control',
  ],
  'self-control': [
    'walk-by-the-spirit',
    'deny-yourself',
    'take-every-thought-captive',
    'rumination',
    'wait-on-the-lord',
    'patience',
  ],
  'god-on-marriage': ['marriage-covenant', 'love-and-patience', 'forgive-as-you-have-been-forgiven'],
  'marriage-covenant': [
    'god-on-marriage',
    'love-and-patience',
    'choose-selfless-love',
    'leave-vengeance-to-the-lord',
    'faithfulness',
    'love',
  ],
  'love-and-patience': [
    'marriage-covenant',
    'forgive-as-you-have-been-forgiven',
    'be-quick-to-listen',
    'love',
    'patience',
  ],
  'count-the-trial-as-joy': [
    'wait-on-the-lord',
    'hope-of-glory',
    'lament-and-pour-out-your-heart',
    'joy',
  ],
  'wait-on-the-lord': [
    'count-the-trial-as-joy',
    'trust-in-the-lord',
    'do-not-fear',
    'patience',
    'self-control',
  ],
  'lament-and-pour-out-your-heart': [
    'a-broken-and-contrite-heart',
    'wait-on-the-lord',
    'he-is-for-you',
    'loss',
  ],
  'a-broken-and-contrite-heart': [
    'lament-and-pour-out-your-heart',
    'confess-and-be-cleansed',
    'the-righteous-fall',
    'loss',
  ],
  'guard-your-heart-and-mouth': ['be-quick-to-listen', 'walk-in-honesty-and-truth', 'walk-by-the-spirit'],
  'be-quick-to-listen': [
    'guard-your-heart-and-mouth',
    'love-and-patience',
    'restore-gently-and-give-time',
    'presence-without-control',
  ],
  'restore-gently-and-give-time': [
    'confess-and-be-cleansed',
    'love-and-patience',
    'one-another-in-the-body',
    'gentleness',
  ],
  'confess-and-be-cleansed': [
    'the-righteous-fall',
    'a-broken-and-contrite-heart',
    'his-grace-is-sufficient',
    'walk-by-the-spirit',
  ],
  'walk-in-honesty-and-truth': [
    'falsehood',
    'confess-and-be-cleansed',
    'guard-your-heart-and-mouth',
    'the-full-armor-of-god',
  ],
  'choose-selfless-love': [
    'love-and-patience',
    'deny-yourself',
    'marriage-covenant',
    'love',
  ],
  'do-not-repay-evil-with-evil': [
    'leave-vengeance-to-the-lord',
    'forgive-as-you-have-been-forgiven',
    'walk-by-the-spirit',
  ],
  'leave-vengeance-to-the-lord': [
    'do-not-repay-evil-with-evil',
    'forgive-as-you-have-been-forgiven',
    'wait-on-the-lord',
    'love-and-patience',
    'choose-selfless-love',
    'fear',
    'love',
    'gentleness',
    'wounded',
  ],
  'forgive-as-you-have-been-forgiven': [
    'the-cross-and-our-justification',
    'leave-vengeance-to-the-lord',
    'love-and-patience',
  ],
  'one-another-in-the-body': ['restore-gently-and-give-time', 'confess-and-be-cleansed', 'choose-selfless-love'],
  'trust-in-the-lord': [
    'the-line',
    'fear',
    'do-not-fear',
    'love',
    'presence-without-control',
    'control',
    'god-first',
    'his-promises',
    'he-is-for-you',
    'choose-selfless-love',
    'wait-on-the-lord',
  ],
  'do-not-fear': ['fear', 'trust-in-the-lord', 'his-promises', 'take-every-thought-captive'],
  fear: [
    'the-line',
    'do-not-fear',
    'control',
    'presence-without-control',
    'trust-in-the-lord',
    'loss',
    'take-every-thought-captive',
    'his-promises',
    'he-is-for-you',
    'his-grace-is-sufficient',
    'peace',
  ],
  loss: [
    'pain-interrupt',
    'lament-and-pour-out-your-heart',
    'a-broken-and-contrite-heart',
    'hope-of-glory',
    'wait-on-the-lord',
    'he-is-for-you',
    'fear',
    'wounded',
    'rumination',
  ],
  wounded: [
    'pain-interrupt',
    'the-line',
    'loss',
    'leave-vengeance-to-the-lord',
    'do-not-repay-evil-with-evil',
    'forgive-as-you-have-been-forgiven',
    'he-is-for-you',
    'fear',
    'hope-of-glory',
  ],
  'renew-your-mind': [
    'take-every-thought-captive',
    'the-word',
    'walk-by-the-spirit',
    'spiritual-warfare',
    'the-full-armor-of-god',
  ],
  'take-every-thought-captive': [
    'rumination',
    'renew-your-mind',
    'the-word',
    'spiritual-warfare',
    'the-full-armor-of-god',
    'walk-by-the-spirit',
    'do-not-fear',
  ],
  'the-word': [
    'god-first',
    'renew-your-mind',
    'take-every-thought-captive',
    'the-adversary',
    'spiritual-warfare',
    'the-full-armor-of-god',
    'prayer',
    'walk-by-the-spirit',
    'falsehood',
  ],
  'the-adversary': [
    'god-first',
    'the-word',
    'spiritual-warfare',
    'wheat-and-tares',
    'the-full-armor-of-god',
    'the-cross-and-our-justification',
    'do-not-fear',
    'take-every-thought-captive',
  ],
  rumination: [
    'pain-interrupt',
    'the-line',
    'take-every-thought-captive',
    'renew-your-mind',
    'the-word',
    'fear',
    'loss',
    'wait-on-the-lord',
    'self-control',
    'peace',
    'spiritual-warfare',
    'the-adversary',
  ],
  regret: [
    'the-righteous-fall',
    'confess-and-be-cleansed',
    'his-grace-is-sufficient',
    'the-cross-and-our-justification',
    'rumination',
    'addiction',
    'hope-of-glory',
  ],
  addiction: [
    // Core cluster: mastery, mind, Spirit, fruit — then grace; substance/sexual doors last
    'self-control',
    'take-every-thought-captive',
    'renew-your-mind',
    'walk-by-the-spirit',
    'holy-spirit',
    'works-of-the-flesh',
    'confess-and-be-cleansed',
    'his-grace-is-sufficient',
    'jealousy',
    'pharmakeia',
    'adultery',
  ],
  jealousy: [
    'control',
    'works-of-the-flesh',
    'self-control',
    'walk-by-the-spirit',
    'take-every-thought-captive',
    'love',
    'addiction',
    'fear',
    'trust-in-the-lord',
  ],
  control: [
    'the-line',
    'pain-interrupt',
    'fear',
    'presence-without-control',
    'kill-the-flesh',
    'trust-in-the-lord',
    'self-control',
    'walk-by-the-spirit',
    'jealousy',
    'wait-on-the-lord',
    'god-first',
    'take-every-thought-captive',
    'peace',
  ],
  'spiritual-warfare': [
    'the-adversary',
    'wheat-and-tares',
    'works-of-the-flesh',
    'the-full-armor-of-god',
    'the-word',
    'take-every-thought-captive',
    'walk-by-the-spirit',
    'do-not-fear',
    'the-cross-and-our-justification',
  ],
  'wheat-and-tares': [
    'the-adversary',
    'spiritual-warfare',
    'persecution',
    'works-of-the-flesh',
    'walk-by-the-spirit',
    'hope-of-glory',
    'god-first',
  ],
  persecution: [
    'spiritual-warfare',
    'the-adversary',
    'wheat-and-tares',
    'do-not-fear',
    'love',
    'watch-and-be-ready',
    'the-full-armor-of-god',
    'hope-of-glory',
    'leave-vengeance-to-the-lord',
  ],
  'works-of-the-flesh': [
    'kill-the-flesh',
    'kill-the-flesh-walk-in-the-spirit',
    'spiritual-warfare',
    'walk-by-the-spirit',
    'adultery',
    'pharmakeia',
    'addiction',
    'jealousy',
    'murder',
    'malice',
    'falsehood',
    'wheat-and-tares',
    'confess-and-be-cleansed',
  ],
  /** Battle station — same form as other keys; full map is the Standard */
  'kill-the-flesh': [
    'the-line',
    'pain-interrupt',
    'kill-the-flesh-walk-in-the-spirit',
    'presence-without-control',
    'walk-by-the-spirit',
    'take-every-thought-captive',
    'fear',
    'control',
    'jealousy',
    'self-control',
    'trust-in-the-lord',
    'the-full-armor-of-god',
  ],
  /** Practical other path when Master the Flesh meets real presence */
  'presence-without-control': [
    'the-line',
    'pain-interrupt',
    'kill-the-flesh',
    'control',
    'love',
    'fear',
    'be-quick-to-listen',
    'wait-on-the-lord',
    'take-every-thought-captive',
    'trust-in-the-lord',
    'self-control',
    'peace',
  ],
  /**
   * Stance — The Line (daily creed for person-idol / grip cluster).
   * Under Standard; above Fear · Control · Trust · Master · Presence.
   * Sister: Pain Interrupt (Lock) when the wave hits.
   */
  'the-line': [
    'pain-interrupt',
    'kill-the-flesh-walk-in-the-spirit',
    'kill-the-flesh',
    'presence-without-control',
    'control',
    'trust-in-the-lord',
    'fear',
    'love',
    'god-first',
    'forgive-as-you-have-been-forgiven',
  ],
  /**
   * Lock — Pain Interrupt (moment tool when pain / memory / rage surges).
   * Snaps you back into The Line (Stance).
   */
  'pain-interrupt': [
    'the-line',
    'wounded',
    'rumination',
    'loss',
    'control',
    'presence-without-control',
    'fear',
    'kill-the-flesh',
    'take-every-thought-captive',
    'peace',
  ],
  'kill-the-flesh-walk-in-the-spirit': [
    'the-line',
    'pain-interrupt',
    'kill-the-flesh',
    'walk-by-the-spirit',
    'works-of-the-flesh',
    'take-every-thought-captive',
    'the-adversary',
    'forgive-as-you-have-been-forgiven',
    'self-control',
    'control',
    'fear',
    'trust-in-the-lord',
    'peace',
    'the-full-armor-of-god',
    'wounded',
    'he-is-for-you',
    'rumination',
    'renew-your-mind',
    'regret',
  ],
  adultery: [
    'works-of-the-flesh',
    'confess-and-be-cleansed',
    'marriage-covenant',
    'god-on-marriage',
    'walk-by-the-spirit',
    'self-control',
    'addiction',
  ],
  pharmakeia: [
    'addiction',
    'works-of-the-flesh',
    'spiritual-warfare',
    'do-not-fear',
    'walk-by-the-spirit',
    'self-control',
    'confess-and-be-cleansed',
  ],
  murder: [
    'works-of-the-flesh',
    'leave-vengeance-to-the-lord',
    'do-not-repay-evil-with-evil',
    'malice',
    'spiritual-warfare',
    'confess-and-be-cleansed',
  ],
  malice: [
    'works-of-the-flesh',
    'murder',
    'leave-vengeance-to-the-lord',
    'forgive-as-you-have-been-forgiven',
    'kindness',
    'walk-by-the-spirit',
  ],
  falsehood: [
    'works-of-the-flesh',
    'walk-in-honesty-and-truth',
    'confess-and-be-cleansed',
    'the-full-armor-of-god',
    'spiritual-warfare',
  ],
  'the-full-armor-of-god': [
    'spiritual-warfare',
    'works-of-the-flesh',
    'take-every-thought-captive',
    'walk-by-the-spirit',
    'watch-and-be-ready',
    'hope-of-glory',
  ],
  'watch-and-be-ready': [
    'ten-virgins',
    'the-faithful-servant',
    'one-taken-one-left',
    'hope-of-glory',
    'wheat-and-tares',
    'wait-on-the-lord',
    'spiritual-warfare',
  ],
  'ten-virgins': [
    'watch-and-be-ready',
    'the-faithful-servant',
    'hope-of-glory',
    'one-taken-one-left',
    'walk-by-the-spirit',
  ],
  'the-faithful-servant': [
    'watch-and-be-ready',
    'ten-virgins',
    'one-taken-one-left',
    'deny-yourself',
    'love-and-patience',
    'hope-of-glory',
  ],
  'one-taken-one-left': [
    'watch-and-be-ready',
    'ten-virgins',
    'the-faithful-servant',
    'hope-of-glory',
    'treasure-in-heaven',
    'wheat-and-tares',
    'do-not-fear',
  ],
  'treasure-in-heaven': [
    'hope-of-glory',
    'prayer',
    'spiritual-gifts',
    'the-faithful-servant',
    'god-first',
    'his-provision',
    'watch-and-be-ready',
  ],
  prayer: [
    'the-lords-prayer',
    'fasting',
    'healing',
    'lament-and-pour-out-your-heart',
    'walk-by-the-spirit',
    'spiritual-gifts',
    'god-first',
  ],
  fasting: [
    'prayer',
    'sabbath',
    'deny-yourself',
    'a-broken-and-contrite-heart',
    'healing',
    'wait-on-the-lord',
    'walk-by-the-spirit',
  ],
  sabbath: [
    'god-first',
    'prayer',
    'fasting',
    'his-provision',
    'wait-on-the-lord',
    'peace',
    'the-lords-prayer',
  ],
  healing: [
    'prayer',
    'laying-on-of-hands',
    'fasting',
    'sabbath',
    'his-power-and-beauty',
    'faithfulness',
    'hope-of-glory',
    'spiritual-gifts',
  ],
  'laying-on-of-hands': [
    'healing',
    'prayer',
    'spiritual-gifts',
    'one-another-in-the-body',
    'walk-by-the-spirit',
    'his-power-and-beauty',
  ],
  'spiritual-gifts': [
    'treasure-in-heaven',
    'hope-of-glory',
    'holy-spirit',
    'prayer',
    'healing',
    'laying-on-of-hands',
    'the-faithful-servant',
    'one-another-in-the-body',
    'walk-by-the-spirit',
    'love',
  ],
  'hope-of-glory': [
    'count-the-trial-as-joy',
    'the-cross-and-our-justification',
    'the-righteous-fall',
    'wait-on-the-lord',
    'spiritual-warfare',
    'wheat-and-tares',
    'watch-and-be-ready',
    'treasure-in-heaven',
    'spiritual-gifts',
    'healing',
    'prayer',
  ],
  'the-righteous-fall': [
    'confess-and-be-cleansed',
    'his-grace-is-sufficient',
    'walk-by-the-spirit',
    'hope-of-glory',
    'a-broken-and-contrite-heart',
    'regret',
  ],
}

const document = {
  meta: {
    title: 'Bedrock',
    /** Motto under the name — not a second triad line */
    subtitle: 'Do Better. Be Better. Trust God.',
    /** One place for the triad */
    tagline: "A Hitchhiker's Guide to Love · Living · Enduring",
    mission:
      'Truth, brain hacks, and prayer to max-cope and grow out of the storm — do better, be better, trust God when everything feels out of control.',
    workingTitle: "The Hitchhiker's Guild · Love · Living · Enduring",
    version: '0.2.0-beta',
    revised: '2026-08-10',
    contentHash: null,
    ipfsCid: null,
    baseAnchorTx: null,
  },
  prologue: {
    lines: [
      'I hold these things to be true. A lifetime to master them.',
      'Though I fall, I get back up. Out of the fire a crucible emerges.',
    ],
  },
  chambers: [
    chamber(
      'God First',
      'God is with you and will never leave you.',
      [
        'God is with you and will never leave you.',
        'He goes before you, guards behind you, stays close when you are brokenhearted, and fights for you.',
        'Be still and know that He is God.',
        'Return to your first love. Seek first His kingdom. Fear the Lord. Abide in Him. Keep His commandments and follow Him.',
      ],
      'Deuteronomy 31:6 · Psalm 34:18 · Isaiah 52:12 · Exodus 14:14 · Psalm 46:10 · Revelation 2:4 · Matthew 6:33 · Proverbs 1:7 · John 15:4 · John 14:15',
    ),
    chamber(
      'His Power and Beauty',
      'All things were created by Him and for Him.',
      [
        'All things were created by Him and for Him.',
        'He holds all things together by the word of His power.',
        'From Him and through Him and to Him are all things.',
        'The heavens declare the glory of God, and the sky above proclaims His handiwork.',
        'Oh, the depth of the riches and wisdom and knowledge of God! How unsearchable are His judgments and how inscrutable His ways!',
      ],
      'Colossians 1:16-17 · Hebrews 1:3 · Romans 11:33, 36 · Psalm 19:1 · Revelation 4:11',
    ),
    chamber(
      'His Promises',
      'God is faithful. He will never leave you nor forsake you.',
      [
        'God is faithful. He will never leave you nor forsake you.',
        'Once you are in His hand, no one can snatch you out.',
        'The work of God is this: to believe in the One He has sent.',
        'Abide in Me, and I will abide in you.',
        'He is faithful. His word is true. He never breaks His promises.',
      ],
      'Deuteronomy 31:6 · John 10:28-29 · John 6:29 · John 15:4 · Hebrews 10:23 · Numbers 23:19',
    ),
    chamber(
      'His Provision',
      'Give us this day our daily bread.',
      [
        'Give us this day our daily bread.',
        'Your Father knows what you need before you ask Him.',
        'If you then, who are evil, know how to give good gifts to your children, how much more will your Father in heaven give good things to those who ask Him.',
        'Seek first the kingdom of God and His righteousness, and all these things will be added to you.',
      ],
      'Matthew 6:11 · Matthew 6:8 · Matthew 7:11 · Matthew 6:33',
    ),
    chamber(
      "The Lord's Prayer",
      'Our Father in heaven, hallowed be Your name.',
      [
        'Our Father in heaven, hallowed be Your name.',
        'Your kingdom come, Your will be done, on earth as it is in heaven.',
        'Give us this day our daily bread.',
        'And forgive us our debts, as we also have forgiven our debtors.',
        'And lead us not into temptation, but deliver us from evil.',
      ],
      'Matthew 6:9-13',
    ),
    chamber(
      'The Cross and Our Justification',
      'Christ died for our sins according to the Scriptures. He was raised on the third day.',
      [
        'Christ died for our sins according to the Scriptures. He was raised on the third day.',
        'By His wounds you have been healed. There is therefore now no condemnation for those who are in Christ Jesus.',
        'We have been justified by faith and have peace with God through our Lord Jesus Christ.',
        'It is finished.',
      ],
      '1 Corinthians 15:3-4 · Isaiah 53:5 · 1 Peter 2:24 · Romans 8:1 · Romans 5:1 · John 19:30',
    ),
    chamber(
      'He Is For You',
      'God is for you.',
      [
        'If God is for us, who can be against us?',
        'He who did not spare His own Son but gave Him up for us all, how will He not also with Him graciously give us all things?',
        'He casts your sins behind His back and remembers them no more.',
        'Cast all your cares on Him, because He cares for you.',
      ],
      'Romans 8:31-32 · Isaiah 43:25 · Hebrews 8:12 · 1 Peter 5:7',
    ),
    chamber(
      'His Grace Is Sufficient',
      'Grace enough for this hour.',
      [
        'My grace is sufficient for you, for My power is made perfect in weakness.',
        'The grace of God has appeared, bringing salvation for all people, training us to renounce ungodliness and worldly passions, and to live self-controlled, upright, and godly lives in the present age.',
        'We love because He first loved us.',
      ],
      '2 Corinthians 12:9 · Titus 2:11-12 · 1 John 4:19',
    ),
    chamber(
      'The Meaning of Life',
      'The greatest commandments.',
      [
        'You shall love the Lord your God with all your heart and with all your soul and with all your mind and with all your strength.',
        'You shall love your neighbor as yourself.',
        'On these two commandments depend all the Law and the Prophets.',
      ],
      'Matthew 22:37-40 · Mark 12:30-31 · Luke 10:27',
    ),
    chamber(
      'Deny Yourself',
      'Cross daily. Follow Me.',
      [
        'If anyone would come after Me, let him deny himself and take up his cross daily and follow Me.',
        'For whoever would save his life will lose it, but whoever loses his life for My sake will save it.',
      ],
      'Luke 9:23-24 · Matthew 16:24-25',
    ),
    chamber(
      'Walk by the Spirit',
      'Walk by the Spirit, and you will not gratify the desires of the flesh.',
      [
        'Walk by the Spirit, and you will not gratify the desires of the flesh.',
        'The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.',
        'If we live by the Spirit, let us also keep in step with the Spirit.',
      ],
      'Galatians 5:16, 22-23, 25 · Romans 8:5-6, 14',
    ),
    chamber(
      'Kill the Flesh. Walk in the Spirit.',
      'Kill the flesh. Walk in the Spirit. Short card first. Full holds when you need them.',
      [
        // —— Common-person field card ——
        h2('Field card'),
        p('Kill the acts of the flesh. Walk in the Spirit. This is the path — not a mood.'),
        p('(Galatians 5:16, 5:24-25)'),
        list(
          'Capture every destructive thought. Stop. Name it. Do not feed it. Give it to Christ.',
          'Refuse building a case. Small gaps are not proof you must solve now.',
          'Refuse condemnation — the accuser’s voice. Conviction leads to life; condemnation freezes. Own once, cleanse, rise.',
          'Fight fear with power, love, and a sound mind. Hand the outcome to God.',
          'Refuse the flesh: no rage, control, monitoring, revenge, or settled bitterness.',
          'Forgive. Release the debt. Do your part.',
          'Guard body and desire. Love without vanishing. Do not let their choices rule your peace.',
          'Low contact when the bond is unstable. Logistics only. Strength, not need. Trust God over understanding.',
        ),
        p(
          'Prayer: “Father, I take every thought captive. I refuse building a case and condemnation. I walk in the Spirit. Amen.”',
        ),
        p(
          'Success: not whether they return or choose you. Success is staying in the Spirit — one decision at a time. Do better. Be better. Trust God.',
        ),
        p(
          'Mind war goes deeper than one card. Path: Battlefield of the mind. Full holds below when fog needs a map.',
        ),
        // —— Full holds (same order) ——
        h2('Holds'),
        h3('1. Thought capture'),
        p('Destructive thought appears — capture it.'),
        list('Stop.', 'Name it.', 'Do not feed it.', 'Give it to Christ.'),
        p('Prayer: “No. I release this to You, Lord.”'),
        p('(2 Corinthians 10:5, Colossians 3:2)'),
        h3('2. Refuse building a case'),
        p('The mind hunts evidence. Gaps become “proof.” Peace rarely follows.'),
        list(
          'Name it: “I am building a case.”',
          'Refuse every lead.',
          'Do not turn open questions into a case right now.',
        ),
        p('Prayer: “I refuse to live as the detective of every gap. I hand this uncertainty to You.”'),
        p('(2 Corinthians 10:5, Philippians 4:8, Romans 12:2)'),
        h3('3. Refuse condemnation'),
        p(
          'The accuser’s voice: self-hate loops, harsh words that stick, judgment, fiery darts. Conviction is specific and leads to life. Condemnation freezes.',
        ),
        list(
          'Name it: “This is condemnation — not the Holy Spirit.”',
          'Own what is real once.',
          'Receive cleansing. Take one free step.',
        ),
        p(
          'Prayer: “There is no condemnation in Christ Jesus. I refuse the accuser’s voice. Cleanse me and raise me.”',
        ),
        p('(Romans 8:1, Revelation 12:10, 1 John 1:9, 2 Corinthians 7:10)'),
        h3('4. Fight fear'),
        p('Fear is fought with power, love, and a sound mind.'),
        list('Name the fear.', 'Refuse to agree with it.', 'Hand the outcome to God.'),
        p(
          'Prayer: “God has not given me a spirit of fear, but of power, love, and a sound mind. I hand this to You.”',
        ),
        p('(2 Timothy 1:7, Ephesians 6:16, Philippians 4:6-7)'),
        h3('5. Refuse the flesh'),
        p('No name-calling, rage, control, monitoring, revenge, or settled bitterness.'),
        list('Name the act.', 'Refuse it.', 'Return to obedience.'),
        p('Prayer: “I refuse this. I will walk in Love.”'),
        p('(Galatians 5:19-21, Ephesians 4:29, 4:31)'),
        h3('6. Forgiveness'),
        p('Forgiveness refuses the scorecard and bitterness.'),
        list('Release the debt.', 'Stop rehearsing the offense.', 'Hand them and the injustice to God.'),
        p('Prayer: “I forgive. I release this to You, Lord.”'),
        p('(Matthew 6:14-15, Ephesians 4:32, Colossians 3:13)'),
        h3('7. Self-control'),
        p('Guard eyes, thoughts, and body. Do not push for intimacy or force deep talks.'),
        list('Stop the urge.', 'Do not chase self-gratification.', 'Submit the thought to Christ.'),
        p(
          'Prayer: “My body is the temple of the Holy Spirit. I choose self-control. Strengthen me.”',
        ),
        p('(1 Corinthians 6:18-20, Galatians 5:22-23)'),
        h3('8. Presence'),
        p('You are whole under God. Love without vanishing or managing their feelings.'),
        list(
          'Do not over-function.',
          'Be present where God has you.',
          'Do not let their choices rule your peace.',
        ),
        p('Prayer: “Lord, this is where You have me. Help me be present where I am.”'),
        p('(Colossians 3:23, Galatians 6:4-5, Psalm 16:8)'),
        h3('9. Honest assessment'),
        p('You may not fully trust them. Do not pretend. Do not use distrust as a license for the flesh.'),
        list('Admit it.', 'Do not overcommit.', 'Still refuse the flesh.'),
        p('Prayer: “Lord, I do not trust them. Give me peace.”'),
        p('(Proverbs 4:23, Ephesians 4:15)'),
        h3('10. Contact and boundaries'),
        p('When the bond is unstable: low contact. Logistics only. Not to calm your pain or force reassurance.'),
        list(
          'Short and clear.',
          'Kids, house, money, schedules — not the relationship.',
          'If the urge is to manage pain, do not send.',
        ),
        p('Prayer: “I will not use contact to manage pain. Give me restraint.”'),
        p('(Matthew 5:37, Ecclesiastes 3:1)'),
        h3('11. Do your part'),
        p('You own thoughts, mouth, actions, obedience, standards. Their replies and plans are theirs.'),
        list('Notice the drift.', 'Stop building stories.', 'Return to your part.'),
        p(
          'Prayer: “Lord, You know what they are doing. I give them to You.”',
        ),
        p('(1 Thessalonians 4:11, Galatians 6:4-5, Matthew 7:3)'),
        h3('12. Outside pressure'),
        p('Old patterns and third parties return. Do not compete or spy.'),
        list('Notice the pull.', 'Do your part.', 'Hand the situation to God.'),
        p('Prayer: “Lord, I will not compete. I entrust this to You.”'),
        p('(Romans 12:17-19)'),
        h3('13. Strength, not need'),
        p('Do not reach out from anxiety. Do not measure worth by their tone.'),
        list(
          'Stop reaching from need.',
          'Bring the raw sentence to the Lord.',
          'Measure by obedience, not their response.',
        ),
        p('Prayer: “My peace is not dependent on them. I hand this to You.”'),
        p('(Psalm 46:10, Exodus 14:14, 1 Peter 5:7)'),
        h3('14. Trust over understanding'),
        p('Trust the Lord. Do not lean on your own understanding.'),
        list(
          'Refuse the demand to figure it all out.',
          'Hand unanswered questions to Him.',
          'Do your part.',
        ),
        p('Prayer: “Lord, You know the plans You have for me. Help me trust You.”'),
        p('(Proverbs 3:5-6, Jeremiah 29:11)'),
        h2('For men'),
        p('Lead yourself first. Carry your own load. Kind, clear, and boundaried — not passive, not aggressive.'),
        list(
          'No one else steadies your peace for you.',
          'Courage stays steady without forcing closeness.',
          'Govern yourself; do not manage her.',
        ),
        p('(1 Corinthians 16:13-14, Proverbs 25:28, Joshua 1:9, Ephesians 5:25)'),
        h2('Success'),
        p('Not whether they return or choose you. Staying in the Spirit — one decision at a time.'),
        p('Do better. Be better. Trust God.'),
        p('(Galatians 6:9, James 1:12)'),
      ],
      'Galatians 5:16, 24-25 · 2 Corinthians 10:5 · Colossians 3:2 · Philippians 4:8 · Romans 12:2 · Romans 8:1 · Revelation 12:10 · 1 John 1:9 · 2 Corinthians 7:10 · 2 Timothy 1:7 · Ephesians 6:16 · Philippians 4:6-7 · Galatians 5:19-21 · Ephesians 4:29, 31-32 · Matthew 6:14-15 · Colossians 3:13 · 1 Corinthians 6:18-20 · Galatians 5:22-23 · Colossians 3:23 · Galatians 6:4-5 · Psalm 16:8 · Proverbs 4:23 · Ephesians 4:15 · Matthew 5:37 · Ecclesiastes 3:1 · 1 Thessalonians 4:11 · Matthew 7:3 · Romans 12:17-19 · Psalm 46:10 · Exodus 14:14 · 1 Peter 5:7 · Proverbs 3:5-6 · Jeremiah 29:11 · 1 Corinthians 16:13-14 · Proverbs 25:28 · Joshua 1:9 · Ephesians 5:25 · Galatians 6:9 · James 1:12',
    ),
    chamber(
      'Holy Spirit',
      'Jesus gave the Helper — Spirit of truth with you, to testify and empower.',
      [
        'And I will ask the Father, and He will give you another Helper, to be with you forever, even the Spirit of truth, whom the world cannot receive, because it neither sees Him nor knows Him. You know Him, for He dwells with you and will be in you.',
        'But the Helper, the Holy Spirit, whom the Father will send in My name, He will teach you all things and bring to your remembrance all that I have said to you.',
        'But when the Helper comes, whom I will send to you from the Father, the Spirit of truth, who proceeds from the Father, He will bear witness about Me.',
        'Nevertheless, I tell you the truth: it is to your advantage that I go away, for if I do not go away, the Helper will not come to you. But if I go, I will send Him to you.',
        'When the Spirit of truth comes, He will guide you into all the truth.',
        'But you will receive power when the Holy Spirit has come upon you, and you will be My witnesses.',
        'God’s love has been poured into our hearts through the Holy Spirit who has been given to us.',
        'Now there are varieties of gifts, but the same Spirit… To each is given the manifestation of the Spirit for the common good.',
        'For the weapons of our warfare are not of the flesh but have divine power to destroy strongholds.',
        'Behold, I have given you authority to tread on serpents and scorpions, and over all the power of the enemy, and nothing shall hurt you.',
      ],
      'John 14:16-17 · John 14:26 · John 15:26 · John 16:7 · John 16:13 · Acts 1:8 · Romans 5:5 · 1 Corinthians 12:4-7 · 2 Corinthians 10:4 · Luke 10:19',
    ),
    chamber(
      'Love',
      'Spirit fruit: love.',
      [
        'The fruit of the Spirit is love.',
        'Beloved, let us love one another, for love is from God, and whoever loves has been born of God and knows God. Anyone who does not love does not know God, because God is love.',
        'If anyone says, “I love God,” and hates his brother, he is a liar; for he who does not love his brother whom he has seen cannot love God whom he has not seen.',
        'Love is patient and kind; love does not envy or boast; it is not arrogant or rude. It does not insist on its own way; it is not irritable or resentful; it does not rejoice at wrongdoing, but rejoices with the truth.',
        'God’s love has been poured into our hearts through the Holy Spirit who has been given to us.',
      ],
      'Galatians 5:22 · 1 John 4:7-8, 20 · 1 Corinthians 13:4-6 · Romans 5:5',
    ),
    chamber(
      'Joy',
      'Spirit fruit: joy.',
      [
        'The fruit of the Spirit is joy.',
        'Do not be grieved, for the joy of the Lord is your strength.',
        'Rejoice in the Lord always; again I will say, rejoice.',
        'These things I have spoken to you, that My joy may be in you, and that your joy may be full.',
        'Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',
      ],
      'Galatians 5:22 · Nehemiah 8:10 · Philippians 4:4 · John 15:11 · 1 Thessalonians 5:16-18',
    ),
    chamber(
      'Peace',
      'Spirit fruit: peace.',
      [
        'The fruit of the Spirit is peace.',
        'Peace I leave with you; My peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.',
        'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.',
        'And let the peace of Christ rule in your hearts, to which indeed you were called in one body. And be thankful.',
        'You keep him in perfect peace whose mind is stayed on You, because he trusts in You.',
      ],
      'Galatians 5:22 · John 14:27 · Philippians 4:6-7 · Colossians 3:15 · Isaiah 26:3',
    ),
    chamber(
      'Patience',
      'Spirit fruit: patience.',
      [
        'The fruit of the Spirit is patience.',
        'Be patient, therefore, brothers, until the coming of the Lord. See how the farmer waits for the precious fruit of the earth, being patient about it, until it receives the early and the late rains. You also, be patient. Establish your hearts, for the coming of the Lord is at hand.',
        'Wait for the Lord; be strong, and let your heart take courage; wait for the Lord!',
        'Rejoice in hope, be patient in tribulation, be constant in prayer.',
        'Love is patient and kind.',
      ],
      'Galatians 5:22 · James 5:7-8 · Psalm 27:14 · Romans 12:12 · 1 Corinthians 13:4',
    ),
    chamber(
      'Kindness',
      'Spirit fruit: kindness.',
      [
        'The fruit of the Spirit is kindness.',
        'Be kind to one another, tenderhearted, forgiving one another, as God in Christ forgave you.',
        'Put on then, as God’s chosen ones, holy and beloved, compassionate hearts, kindness, humility, meekness, and patience.',
        'Let not steadfast love and faithfulness forsake you; bind them around your neck; write them on the tablet of your heart.',
        'Or do you presume on the riches of His kindness and forbearance and patience, not knowing that God’s kindness is meant to lead you to repentance?',
      ],
      'Galatians 5:22 · Ephesians 4:32 · Colossians 3:12 · Proverbs 3:3 · Romans 2:4',
    ),
    chamber(
      'Goodness',
      'Spirit fruit: goodness.',
      [
        'The fruit of the Spirit is goodness.',
        'Let love be genuine. Abhor what is evil; hold fast to what is good.',
        'He has told you, O man, what is good; and what does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?',
        'For the fruit of light is found in all that is good and right and true.',
        'Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the Lord forever.',
      ],
      'Galatians 5:22 · Romans 12:9 · Micah 6:8 · Ephesians 5:9 · Psalm 23:6',
    ),
    chamber(
      'Faithfulness',
      'Spirit fruit: faithfulness.',
      [
        'The fruit of the Spirit is faithfulness.',
        'Moreover, it is required of stewards that they be found faithful.',
        'The steadfast love of the Lord never ceases; His mercies never come to an end; they are new every morning; great is Your faithfulness.',
        'Let not steadfast love and faithfulness forsake you; bind them around your neck; write them on the tablet of your heart. So you will find favor and good success in the sight of God and man.',
        'If we are faithless, He remains faithful—for He cannot deny Himself.',
      ],
      'Galatians 5:22 · 1 Corinthians 4:2 · Lamentations 3:22-23 · Proverbs 3:3-4 · 2 Timothy 2:13',
    ),
    chamber(
      'Gentleness',
      'Spirit fruit: gentleness.',
      [
        'The fruit of the Spirit is gentleness.',
        'Brothers, if anyone is caught in any transgression, you who are spiritual should restore him in a spirit of gentleness. Keep watch on yourself, lest you too be tempted.',
        'Take My yoke upon you, and learn from Me, for I am gentle and lowly in heart, and you will find rest for your souls.',
        'Let your reasonableness be known to everyone. The Lord is at hand.',
        'Always being prepared to make a defense to anyone who asks you for a reason for the hope that is in you; yet do it with gentleness and respect.',
      ],
      'Galatians 5:22-23 · Galatians 6:1 · Matthew 11:29 · Philippians 4:5 · 1 Peter 3:15',
    ),
    chamber(
      'Self-control',
      'Spirit fruit: self-control.',
      [
        'The fruit of the Spirit is self-control; against such things there is no law.',
        'For God gave us a spirit not of fear but of power and love and self-control.',
        'A man without self-control is like a city broken into and left without walls.',
        'Every athlete exercises self-control in all things. They do it to receive a perishable wreath, but we an imperishable.',
        'For the grace of God has appeared, bringing salvation for all people, training us to renounce ungodliness and worldly passions, and to live self-controlled, upright, and godly lives in the present age.',
      ],
      'Galatians 5:22-23 · 2 Timothy 1:7 · Proverbs 25:28 · 1 Corinthians 9:25 · Titus 2:11-12',
    ),
    chamber(
      'God on Marriage',
      'God designed marriage as a lifelong one-flesh covenant and hates divorce.',
      [
        'God designed marriage as a lifelong one-flesh covenant and hates divorce.',
        'God is the witness between a man and the wife of his youth.',
        'What He has joined, no one should separate.',
        'Divorce covers a man’s garment with violence and breaks faith, yet God desires godly offspring.',
      ],
      'Malachi 2:14-16 · Matthew 19:4-6, 8-9 · Luke 16:18',
    ),
    chamber(
      'Marriage Covenant',
      'One-flesh covenant. Sacrificial love.',
      [
        'The husband is the head of the wife even as Christ is the head of the church, His body, and is Himself its Savior.',
        'Husbands, love your wives, as Christ loved the church and gave Himself up for her, that He might sanctify her, having cleansed her by the washing of water with the word.',
        'However, let each one of you love his wife as himself, and let the wife see that she respects her husband.',
        'Wives, be subject to your own husbands, so that even if some do not obey the word, they may be won without a word by the conduct of their wives, when they see your respectful and pure conduct.',
        'She does him good, and not harm, all the days of her life.',
        'Do not deprive one another, except perhaps by agreement for a limited time, that you may devote yourselves to prayer; but then come together again.',
        'To the married I give this charge (not I, but the Lord): the wife should not separate from her husband… and the husband should not divorce his wife.',
      ],
      'Ephesians 5:23, 25-26, 33 · 1 Peter 3:1-2 · Proverbs 31:12 · 1 Corinthians 7:5, 10-11 · Matthew 19:6, 8-9',
    ),
    chamber(
      'Love and Patience',
      'True love is patient, kind, and keeps no record of wrongs.',
      [
        'True love is patient, kind, and keeps no record of wrongs.',
        'Love does not envy, boast, or act proudly. It is not self-seeking or easily angered.',
        'It always protects, trusts, hopes, and perseveres.',
      ],
      '1 Corinthians 13:4-7',
    ),
    chamber(
      'Count the Trial as Joy',
      'Consider it pure joy when you face trials.',
      [
        'Consider it pure joy when you face trials.',
        'The testing of your faith produces perseverance that makes you mature and complete.',
        'Suffering produces perseverance; perseverance, character; and character, hope.',
      ],
      'James 1:2-4 · Romans 5:3-4',
    ),
    chamber(
      'Wait on the Lord',
      'When everything is out of your control — wait. Be strong. Take courage.',
      [
        'Wait for the Lord; be strong, and let your heart take courage; wait for the Lord.',
        'Those who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.',
        'The Lord is good to those who wait for Him, to the soul who seeks Him.',
        'Be still before the Lord and wait patiently for Him; fret not yourself over the one who prospers in his way.',
      ],
      'Psalm 27:14 · Isaiah 40:31 · Lamentations 3:25 · Psalm 37:7',
    ),
    chamber(
      'Lament and Pour Out Your Heart',
      'Pour out your heart like water before the presence of the Lord.',
      [
        'Pour out your heart like water before the presence of the Lord.',
        'How long, O Lord? Will You forget me forever?',
        'The Lord is near to the brokenhearted and saves the crushed in spirit.',
        'Trust in Him at all times… pour out your heart before Him.',
      ],
      'Lamentations 2:19 · Psalm 13:1 · Psalm 34:18 · Psalm 62:8',
    ),
    chamber(
      'A Broken and Contrite Heart',
      'The Lord is near to the brokenhearted.',
      [
        'The Lord is near to the brokenhearted.',
        'This is the one to whom I will look: he who is humble and contrite in spirit and trembles at My word.',
        'The sacrifices of God are a broken spirit; a broken and contrite heart, O God, You will not despise.',
      ],
      'Psalm 34:18 · Isaiah 66:2 · Psalm 51:17',
    ),
    chamber(
      'Guard Your Heart and Mouth',
      'Gate the heart and the mouth.',
      [
        'Keep your heart with all vigilance, for from it flow the springs of life.',
        'Set a guard, O Lord, over my mouth; keep watch over the door of my lips!',
        'Let no corrupting talk come out of your mouths, but only such as is good for building up, as fits the occasion, that it may give grace to those who hear.',
      ],
      'Proverbs 4:23 · Psalm 141:3 · Ephesians 4:29',
    ),
    chamber(
      'Be Quick to Listen',
      'Quick to hear. Slow to speak. Slow to anger.',
      [
        'Know this, my beloved brothers: let every person be quick to hear, slow to speak, slow to anger; for the anger of man does not produce the righteousness of God.',
      ],
      'James 1:19-20',
    ),
    chamber(
      'Restore Gently and Give Time',
      'Gentleness and timing.',
      [
        'Brothers, if anyone is caught in any transgression, you who are spiritual should restore him in a spirit of gentleness. Keep watch on yourself, lest you too be tempted.',
        'For everything there is a season, and a time for every matter under heaven.',
      ],
      'Galatians 6:1 · Ecclesiastes 3:1',
    ),
    chamber(
      'Confess and Be Cleansed',
      'Confess. Be cleansed. Draw near.',
      [
        'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.',
        'Therefore, confess your sins to one another and pray for one another, that you may be healed.',
        'Let us then with confidence draw near to the throne of grace, that we may receive mercy and find grace to help in time of need.',
      ],
      '1 John 1:9 · James 5:16 · Hebrews 4:16',
    ),
    chamber(
      'Walk in Honesty and Truth',
      'Truthful lips. Yes and no.',
      [
        'Lying lips are an abomination to the Lord, but those who act faithfully are His delight.',
        'Therefore, having put away falsehood, let each one of you speak the truth with his neighbor, for we are members one of another.',
        'Let what you say be simply “Yes” or “No”; anything more than this comes from evil.',
      ],
      'Proverbs 12:22 · Ephesians 4:25 · Matthew 5:37',
    ),
    chamber(
      'Choose Selfless Love',
      'In humility value others above yourselves.',
      [
        'In humility value others above yourselves.',
        'Look not only to your own interests, but also to the interests of others.',
      ],
      'Philippians 2:3-4 · James 3:14-16',
    ),
    chamber(
      'Do Not Repay Evil with Evil',
      'Do not repay evil with evil or insult with insult.',
      [
        'Do not repay evil with evil or insult with insult.',
        'On the contrary, repay evil with blessing.',
      ],
      '1 Peter 3:9',
    ),
    chamber(
      'Leave Vengeance to the Lord',
      'Vengeance belongs to Him — and hatred has no place with love.',
      [
        'The Lord will fight for you; you need only be still.',
        'Never avenge yourselves. Leave it to the wrath of God. Vengeance belongs to Him; He will repay.',
        'If anyone says, “I love God,” and hates his brother, he is a liar; for he who does not love his brother whom he has seen cannot love God whom he has not seen.',
        'Everyone who hates his brother is a murderer, and you know that no murderer has eternal life abiding in him.',
        'You shall not take vengeance or bear a grudge… but you shall love your neighbor as yourself.',
        'Love your enemies and pray for those who persecute you.',
      ],
      'Exodus 14:14 · Romans 12:19 · 1 John 4:20 · 1 John 3:15 · Leviticus 19:17-18 · Matthew 5:43-44',
    ),
    chamber(
      'Forgive as You Have Been Forgiven',
      'Forgive one another as God in Christ forgave you.',
      [
        'Forgive one another as God in Christ forgave you.',
        'If you do not forgive others their trespasses, neither will your Father forgive your trespasses.',
        'Be kind to one another, tenderhearted, forgiving one another.',
      ],
      'Ephesians 4:32 · Matthew 6:14-15 · Colossians 3:13',
    ),
    chamber(
      'One Another in the Body',
      'Bear one another’s burdens, and so fulfill the law of Christ.',
      [
        'Bear one another’s burdens, and so fulfill the law of Christ.',
        'Encourage one another daily… that none of you may be hardened by the deceitfulness of sin.',
        'Confess your sins to one another and pray for one another.',
        'Let us consider how to stir up one another to love and good works, not neglecting to meet together.',
      ],
      'Galatians 6:2 · Hebrews 3:13 · James 5:16 · Hebrews 10:24-25',
    ),
    /**
     * Trust — how to trust other people. Fear blocks trust; give the fear to the Lord.
     * Not Control (stop securing outcomes). Not “never trust people.” Lord holds the risk.
     */
    chamber(
      'Trust in the Lord',
      'Afraid to trust them? Give the fear to the Lord. Then one faithful step.',
      [
        'Fear of trust says you will be hurt again. So you control, pull away, or demand certainty first. Give that fear to the Lord. He holds the risk. Then take one clear step toward them — not the whole future.',
        'There is no fear in love, but perfect love casts out fear. For fear has to do with punishment, and whoever fears has not been perfected in love.',
        'When I am afraid, I put my trust in You.',
        'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.',
        'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.',
        'Love bears all things, believes all things, hopes all things, endures all things.',
        'Cast your burden on the Lord, and He will sustain you.',
      ],
      '1 John 4:18 · Psalm 56:3 · Proverbs 3:5-6 · Philippians 4:6-7 · 1 Corinthians 13:7 · Psalm 55:22 · Isaiah 26:3',
    ),
    chamber(
      'Do Not Fear',
      'God has not given you a spirit of fear, but of power, love, and a sound mind.',
      [
        'God has not given you a spirit of fear, but of power, love, and a sound mind.',
        'Do not fear, for He is with you.',
        'You cannot add a single hour to your life. Even the hairs of your head are all numbered.',
      ],
      '2 Timothy 1:7 · Isaiah 41:10 · Philippians 4:6 · Matthew 6:27 · Matthew 10:30',
    ),
    chamber(
      'Fear',
      'There is no fear in love, but perfect love casts out fear.',
      [
        'There is no fear in love, but perfect love casts out fear. For fear has to do with punishment, and whoever fears has not been perfected in love.',
        'When I am afraid, I put my trust in You.',
        'The fear of man lays a snare, but whoever trusts in the Lord is safe.',
        'Peace I leave with you; My peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.',
        'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.',
        'For you did not receive the spirit of slavery to fall back into fear, but you have received the Spirit of adoption as sons, by whom we cry, “Abba! Father!”',
      ],
      '1 John 4:18 · Psalm 56:3 · Proverbs 29:25 · John 14:27 · Joshua 1:9 · Romans 8:15',
    ),
    chamber(
      'Loss',
      'Grief for real loss and possible loss — He is near the brokenhearted.',
      [
        'The Lord is near to the brokenhearted and saves the crushed in spirit.',
        'Blessed are those who mourn, for they shall be comforted.',
        'But we do not want you to be uninformed, brothers, about those who are asleep, that you may not grieve as others do who have no hope.',
        'The Lord gave, and the Lord has taken away; blessed be the name of the Lord.',
        'He will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore, for the former things have passed away.',
      ],
      'Psalm 34:18 · Matthew 5:4 · 1 Thessalonians 4:13 · Job 1:21 · Revelation 21:4',
    ),
    chamber(
      'Wounded',
      'You were harmed — God sees; He is near the crushed.',
      [
        'The Lord is near to the brokenhearted and saves the crushed in spirit.',
        'He heals the brokenhearted and binds up their wounds.',
        'Do not repay evil for evil or reviling for reviling, but on the contrary, bless, for to this you were called, that you may obtain a blessing.',
        'Beloved, never avenge yourselves, but leave it to the wrath of God, for it is written, “Vengeance is Mine, I will repay, says the Lord.”',
        'Fear not, for I have redeemed you; I have called you by name, you are Mine.',
        'For you did not receive the spirit of slavery to fall back into fear, but you have received the Spirit of adoption as sons, by whom we cry, “Abba! Father!”',
      ],
      'Psalm 34:18 · Psalm 147:3 · 1 Peter 3:9 · Romans 12:19 · Isaiah 43:1 · Romans 8:15',
    ),
    (() => {
      // Plain speech title (Keys: Obsession). Stable id keeps spine/related unbroken.
      const c = chamber(
        'Obsession',
        'The stuck, replaying mind is not the Holy Spirit. Capture it.',
        [
          'We destroy arguments and every lofty opinion raised against the knowledge of God, and take every thought captive to obey Christ.',
          'Do not be conformed to this world, but be transformed by the renewal of your mind.',
          'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
          'Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable… think about these things.',
          'When the cares of my heart are many, Your consolations cheer my soul.',
          'You keep him in perfect peace whose mind is stayed on You, because he trusts in You.',
        ],
        '2 Corinthians 10:5 · Romans 12:2 · Philippians 4:6-8 · Psalm 94:19 · Isaiah 26:3',
      )
      c.id = 'rumination'
      return c
    })(),
    chamber(
      'Regret',
      'Godly grief leads to life; worldly grief leads to death.',
      [
        'Godly grief produces a repentance that leads to salvation without regret, whereas worldly grief produces death.',
        'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.',
        'There is therefore now no condemnation for those who are in Christ Jesus.',
        'Whoever conceals his transgressions will not prosper, but he who confesses and forsakes them will obtain mercy.',
        'Create in me a clean heart, O God, and renew a right spirit within me.',
      ],
      '2 Corinthians 7:10 · 1 John 1:9 · Romans 8:1 · Proverbs 28:13 · Psalm 51:10',
    ),
    chamber(
      'Addiction',
      'If it masters you, it is not free — walk by the Spirit; put the flesh to death.',
      [
        '“All things are lawful for me,” but not all things are helpful. “All things are lawful for me,” but I will not be dominated by anything.',
        'And do not get drunk with wine, for that is debauchery, but be filled with the Spirit.',
        'But I say, walk by the Spirit, and you will not gratify the desires of the flesh.',
        'Or do you not know that your body is a temple of the Holy Spirit within you, whom you have from God? You are not your own, for you were bought with a price. So glorify God in your body.',
        'For the weapons of our warfare are not of the flesh but have divine power to destroy strongholds.',
        'And such were some of you. But you were washed, you were sanctified, you were justified in the name of the Lord Jesus Christ and by the Spirit of our God.',
      ],
      '1 Corinthians 6:12 · Ephesians 5:18 · Galatians 5:16 · 1 Corinthians 6:19-20 · 2 Corinthians 10:4 · 1 Corinthians 6:11',
    ),
    chamber(
      'Jealousy',
      'If it demands control of another, it is not love — walk by the Spirit; put the flesh to death.',
      [
        'For where jealousy and selfish ambition exist, there will be disorder and every vile practice.',
        'Love is patient and kind; love does not envy or boast; it is not arrogant or rude. It does not insist on its own way; it is not irritable or resentful.',
        'Now the works of the flesh are evident: sexual immorality, impurity, sensuality, idolatry, sorcery, enmity, strife, jealousy, fits of anger, rivalries, dissensions, divisions, envy, drunkenness, orgies, and things like these.',
        'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control; against such things there is no law.',
      ],
      'James 3:16 · 1 Corinthians 13:4-5 · Galatians 5:19-21 · Galatians 5:22-23',
    ),
    chamber(
      'Control',
      'Control is the grip on the outcome. Often fear — also pride, habit, or idol. Stop securing what only God can rule.',
      [
        // What control is (precise): driver is often fear, not always only fear
        'Control is the grip that tries to secure the outcome — people, timeline, certainty. It is often fear at work; pride, habit, and the idol of outcome can drive it too. Name the driver. Stop securing what only God can rule. Do your part. Leave the rest to the Lord.',
        'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.',
        'Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!',
        'The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control; against such things there is no law.',
        'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
        'Cast your burden on the Lord, and He will sustain you; He will never permit the righteous to be moved.',
      ],
      'Proverbs 3:5-6 · Psalm 46:10 · Galatians 5:22-23 · Philippians 4:6 · Psalm 55:22 · 2 Timothy 1:7',
    ),
    /**
     * Adjacent to Master the Flesh — same station chrome as god-first / control:
     * Truth = Scripture paragraphs (not list/rubric body). Holds carry the practical list.
     */
    chamber(
      'Presence Without Control',
      'Relax. Be present. Don’t take or force control of the present or the future.',
      [
        // Echo: force = control; driver often fear, not absolute
        'Forcing the present or the future is control — often fear, not always only fear. Presence is not control. Show up cleanly; do not manage the outcome. When the war is person, fear, grip, and ledger — stand on [The Line](chamber:the-line). When a memory or pain wave hits — use [Pain Interrupt](chamber:pain-interrupt).',
        'Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!',
        'Know this, my beloved brothers: let every person be quick to hear, slow to speak, slow to anger.',
        'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
        'Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.',
        'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make straight your paths.',
      ],
      'Psalm 46:10 · James 1:19 · Philippians 4:6 · Matthew 6:34 · Proverbs 3:5-6 · 2 Timothy 1:7',
    ),
    /**
     * Stance — daily posture / creed for the person-idol cluster.
     * Title: The Line. Kind: stance. How you stand every day.
     * Sister Lock: Pain Interrupt (when the wave hits).
     */
    chamber(
      'The Line',
      'My emotional state is my own. Presence without control. Love keeps no record.',
      [
        'When a person sits where only God should, fear, control, ledger, and obsession warp peace and self. The Line is the stance — how you stand every day under the Standard.',
        'My emotional state is my own — their choices do not own your peace. Presence without control — listen, wait, talk less; do not force the present or the future. Love keeps no record — stop the ledger; release the score to God.',
        'This is the posture. When pain, memory, or rage surges mid-hour, use [Pain Interrupt](chamber:pain-interrupt) — the lock that snaps you back into this stance.',
        'Be still, and know that I am God.',
        'Love is patient and kind… it is not irritable or resentful.',
        'God has not given you a spirit of fear, but of power and love and a sound mind.',
        'Know this, my beloved brothers: let every person be quick to hear, slow to speak, slow to anger.',
        'Trust in the Lord with all your heart, and do not lean on your own understanding.',
      ],
      'Psalm 46:10 · 1 Corinthians 13:4-5 · 2 Timothy 1:7 · James 1:19 · Proverbs 3:5 · Matthew 6:33',
      'the-line',
    ),
    /**
     * Lock — moment tool when pain, memory, or rage surges.
     * Title: Pain Interrupt. Kind: lock. Snaps you back into The Line (Stance).
     */
    chamber(
      'Pain Interrupt',
      'Notice it. My emotional state is my own. Return to what is in front of me.',
      [
        'A painful memory or reminder hits — it hurts. This is not the time to rebuild the whole creed. This is the lock: three moves that snap you back into [The Line](chamber:the-line).',
        'Notice it — name the wave without following it. My emotional state is my own — not theirs; their choices do not own this hour. Return to what is in front of you — the next real task, person, or prayer under your feet.',
        'Stance is how you live. Lock is how you recover when the wave hits. Then stand again on The Line.',
        'We destroy arguments and every lofty opinion raised against the knowledge of God, and take every thought captive to obey Christ.',
        'Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable, if there is any excellence, if there is anything worthy of praise, think about these things.',
        'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
        'Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.',
      ],
      '2 Corinthians 10:5 · Philippians 4:8 · Philippians 4:6 · Matthew 6:34 · Isaiah 26:3 · Psalm 46:10',
      'pain-interrupt',
    ),
    chamber(
      'Renew Your Mind',
      'Transformed mind.',
      [
        'Do not be conformed to this world, but be transformed by the renewal of your mind, that by testing you may discern what is the will of God, what is good and acceptable and perfect.',
        'Have this mind among yourselves, which is yours in Christ Jesus.',
      ],
      'Romans 12:2 · Philippians 2:5',
    ),
    chamber(
      'Take Every Thought Captive',
      'Divine power demolishes strongholds — take every thought captive to Christ.',
      [
        'For the weapons of our warfare are not of the flesh but have divine power to destroy strongholds.',
        'We destroy arguments and every lofty opinion raised against the knowledge of God, and take every thought captive to obey Christ.',
        'Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable, if there is any excellence, if there is anything worthy of praise, think about these things.',
        'Behold, I have given you authority to tread on serpents and scorpions, and over all the power of the enemy, and nothing shall hurt you.',
      ],
      '2 Corinthians 10:4-5 · Philippians 4:8 · Luke 10:19',
    ),
    chamber(
      'The Word',
      'The lie says you cannot know or understand. God says His Word is for you — light to the simple.',
      [
        'The unfolding of Your words gives light; it imparts understanding to the simple.',
        'For this commandment that I command you today is not too hard for you, neither is it far off… But the word is very near you. It is in your mouth and in your heart, so that you can do it.',
        'All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness, that the man of God may be complete, equipped for every good work.',
        'If you abide in My word, you are truly My disciples, and you will know the truth, and the truth will set you free.',
        'When the Spirit of truth comes, He will guide you into all the truth.',
        'Now we have received not the spirit of the world, but the Spirit who is from God, that we might understand the things freely given us by God.',
        'For the word of God is living and active, sharper than any two-edged sword.',
        'My people are destroyed for lack of knowledge.',
        'Man shall not live by bread alone, but by every word that comes from the mouth of God.',
        'And take the helmet of salvation, and the sword of the Spirit, which is the word of God.',
        'But I am afraid that as the serpent deceived Eve by his cunning, your thoughts will be led astray from a sincere and pure devotion to Christ.',
      ],
      'Psalm 119:130 · Deuteronomy 30:11-14 · 2 Timothy 3:16-17 · John 8:31-32 · John 16:13 · 1 Corinthians 2:12 · Hebrews 4:12 · Hosea 4:6 · Matthew 4:4 · Ephesians 6:17 · 2 Corinthians 11:3',
    ),
    chamber(
      'The Adversary',
      'Christ has already won. Fix your eyes on Jesus. Stand with God.',
      [
        'Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion, seeking someone to devour. Resist him, firm in your faith.',
        'You are of your father the devil, and your will is to do your father’s desires. He was a murderer from the beginning, and does not stand in the truth, because there is no truth in him. When he lies, he speaks out of his own character, for he is a liar and the father of lies.',
        'The field is the world, and the good seed is the sons of the kingdom. The weeds are the sons of the evil one, and the enemy who sowed them is the devil.',
        'By this it is evident who are the children of God, and who are the children of the devil: whoever does not practice righteousness is not of God, nor is the one who does not love his brother.',
        'Indeed, all who desire to live a godly life in Christ Jesus will be persecuted.',
        'If the world hates you, know that it has hated Me before it hated you… If they persecuted Me, they will also persecute you.',
        'Put on the whole armor of God, that you may be able to stand against the schemes of the devil. For we do not wrestle against flesh and blood, but against the rulers, against the authorities, against the cosmic powers over this present darkness, against the spiritual forces of evil in the heavenly places.',
        'Submit yourselves therefore to God. Resist the devil, and he will flee from you. Draw near to God, and He will draw near to you.',
        'And they have conquered him by the blood of the Lamb and by the word of their testimony, for they loved not their lives even unto death.',
        'The God of peace will soon crush Satan under your feet.',
      ],
      '1 Peter 5:8-9 · John 8:44 · Matthew 13:38-39 · 1 John 3:10 · 2 Timothy 3:12 · John 15:18-20 · Ephesians 6:11-12 · James 4:7-8 · Revelation 12:11 · Romans 16:20',
    ),
    chamber(
      'Spiritual Warfare',
      'We are at war — not against flesh and blood.',
      [
        'For we do not wrestle against flesh and blood, but against the rulers, against the authorities, against the cosmic powers over this present darkness, against the spiritual forces of evil in the heavenly places.',
        'Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion, seeking someone to devour. Resist him, firm in your faith.',
        'Submit yourselves therefore to God. Resist the devil, and he will flee from you. Draw near to God, and He will draw near to you.',
        'For though we walk in the flesh, we are not waging war according to the flesh. For the weapons of our warfare are not of the flesh but have divine power to destroy strongholds.',
        'Finally, be strong in the Lord and in the strength of His might. Put on the whole armor of God, that you may be able to stand against the schemes of the devil.',
        'For the weapons of our warfare are not of the flesh but have divine power to destroy strongholds.',
        'Behold, I have given you authority to tread on serpents and scorpions, and over all the power of the enemy, and nothing shall hurt you.',
        'The thief comes only to steal and kill and destroy. I came that they may have life and have it abundantly.',
        'You are of your father the devil, and your will is to do your father’s desires. He was a murderer from the beginning, and does not stand in the truth, because there is no truth in him. When he lies, he speaks out of his own character, for he is a liar and the father of lies.',
      ],
      'Ephesians 6:12 · 1 Peter 5:8-9 · James 4:7-8 · 2 Corinthians 10:3-4 · Ephesians 6:10-11 · Luke 10:19 · John 10:10 · John 8:44',
    ),
    chamber(
      'Wheat and Tares',
      'A good farmer sowed wheat; an enemy sowed weeds at night.',
      [
        'The kingdom of heaven may be compared to a man who sowed good seed in his field, but while his men were sleeping, his enemy came and sowed weeds among the wheat and went away.',
        'He said, “An enemy has done this.” … “Let both grow together until the harvest, and at harvest time I will tell the reapers, Gather the weeds first and bind them in bundles to be burned, but gather the wheat into my barn.”',
        'The one who sows the good seed is the Son of Man. The field is the world, and the good seed is the sons of the kingdom. The weeds are the sons of the evil one, and the enemy who sowed them is the devil.',
        'The harvest is the end of the age, and the reapers are angels. … The Son of Man will send His angels, and they will gather out of His kingdom all causes of sin and all law-breakers.',
      ],
      'Matthew 13:24-30, 37-41',
    ),
    chamber(
      'Persecution',
      'Blessed when they revile you for His name — stand, bless, do not repay evil.',
      [
        'Blessed are those who are persecuted for righteousness’ sake, for theirs is the kingdom of heaven. Blessed are you when others revile you and persecute you and utter all kinds of evil against you falsely on My account.',
        'Indeed, all who desire to live a godly life in Christ Jesus will be persecuted.',
        'But I say to you, Love your enemies and pray for those who persecute you.',
        'Do not be surprised at the fiery trial when it comes upon you to test you, as though something strange were happening to you. But rejoice insofar as you share Christ’s sufferings.',
        'If the world hates you, know that it has hated Me before it hated you.',
      ],
      'Matthew 5:10-11 · 2 Timothy 3:12 · Matthew 5:44 · 1 Peter 4:12-13 · John 15:18',
    ),
    chamber(
      'Works of the Flesh',
      'Those who practice such things will not inherit the kingdom of God.',
      [
        'Now the works of the flesh are evident: sexual immorality, impurity, sensuality, idolatry, sorcery, enmity, strife, jealousy, fits of anger, rivalries, dissensions, divisions, envy, drunkenness, orgies, and things like these.',
        'I warn you, as I warned you before, that those who do such things will not inherit the kingdom of God.',
        'Or do you not know that the unrighteous will not inherit the kingdom of God? Do not be deceived: neither the sexually immoral, nor idolaters, nor adulterers, nor men who practice homosexuality, nor thieves, nor the greedy, nor drunkards, nor revilers, nor swindlers will inherit the kingdom of God.',
        'And such were some of you. But you were washed, you were sanctified, you were justified in the name of the Lord Jesus Christ and by the Spirit of our God.',
        'But as for the cowardly, the faithless, the detestable, as for murderers, the sexually immoral, sorcerers, idolaters, and all liars, their portion will be in the lake that burns with fire and sulfur, which is the second death.',
      ],
      'Galatians 5:19-21 · 1 Corinthians 6:9-11 · Revelation 21:8',
    ),
    /**
     * Battle station (same form as god-first / jealousy — not the full Standard rubric).
     * Display title: Master the Flesh. Fixed id `kill-the-flesh` keeps share/OG URLs stable.
     * Station chrome matches other keys. Truth: short lead lines + inner bullet lists
     * for filters / kill steps / tools (not one long run-on paragraph each).
     */
    chamber(
      'Master the Flesh',
      'You’re in a fight. The urge is real. You feel out of control — master the flesh.',
      [
        'Fear drives the flesh as reaction and reflex — in thoughts and in person. It produces control, jealousy, and impatience; then rage, bitterness, habit, and immediate relief. Say it plain: this is fear; this is the flesh.',
        'Before you speak, send, or act — three filters:',
        list(
          'Is it self-less?',
          'Does it protect?',
          'Does it honor God?',
          'If any answer is no → stop. Do not negotiate with the flesh.',
        ),
        'Kill it in three steps:',
        list(
          'Name it — “This is fear. This is the flesh.”',
          'Capture the thought and give it to Christ.',
          'Stop. Breathe. Choose the other path.',
        ),
        'When the body is still ringing — reset, then return to the three steps:',
        list(
          'Exhale hard once',
          '3-2-1 grounding — three you see, two you hear, one you feel',
          'Default phrase: “My emotional state is my own.”',
        ),
        'Take every thought captive to obey Christ. Walk by the Spirit, and you will not gratify the desires of the flesh. God has not given a spirit of fear, but of power and love and a sound mind.',
        // Inline chamber link — SPA + static /c pages resolve [label](chamber:id)
        'When the fight slows — full Standard: [Kill the Flesh. Walk in the Spirit.](chamber:kill-the-flesh-walk-in-the-spirit)',
      ],
      'James 1:19 · 2 Timothy 1:7 · Galatians 5:16, 22-23 · 2 Corinthians 10:5 · Luke 9:23 · 1 Corinthians 13:4-7 · Proverbs 25:28 · Titus 2:11-12 · James 5:16 · Matthew 6:16-18',
      'kill-the-flesh',
    ),
    chamber(
      'Adultery',
      'Flee sexual immorality. You are not your own.',
      [
        'You shall not commit adultery.',
        'But I say to you that everyone who looks at a woman with lustful intent has already committed adultery with her in his heart.',
        'Flee from sexual immorality. Every other sin a person commits is outside the body, but the sexually immoral person sins against his own body.',
        'Or do you not know that your body is a temple of the Holy Spirit within you, whom you have from God? You are not your own, for you were bought with a price. So glorify God in your body.',
        'Let marriage be held in honor among all, and let the marriage bed be undefiled, for God will judge the sexually immoral and adulterous.',
      ],
      'Exodus 20:14 · Matthew 5:28 · 1 Corinthians 6:18-20 · Hebrews 13:4',
    ),
    chamber(
      'Pharmakeia',
      'Sorcery — and every counterfeit power — is works of the flesh.',
      [
        'Now the works of the flesh are evident: … idolatry, sorcery… and things like these. I warn you… that those who do such things will not inherit the kingdom of God.',
        'But as for … sorcerers, idolaters, and all liars, their portion will be in the lake that burns with fire and sulfur.',
        'Outside are the dogs and sorcerers and the sexually immoral and murderers and idolaters, and everyone who loves and practices falsehood.',
        'Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion, seeking someone to devour.',
        'Submit yourselves therefore to God. Resist the devil, and he will flee from you.',
      ],
      'Galatians 5:19-21 · Revelation 21:8 · Revelation 22:15 · 1 Peter 5:8 · James 4:7',
    ),
    chamber(
      'Murder',
      'You shall not murder — not by hand, and not by hatred.',
      [
        'You shall not murder.',
        'Everyone who hates his brother is a murderer, and you know that no murderer has eternal life abiding in him.',
        'You have heard that it was said to those of old, “You shall not murder; and whoever murders will be liable to judgment.” But I say to you that everyone who is angry with his brother will be liable to judgment.',
        'But as for … murderers… their portion will be in the lake that burns with fire and sulfur.',
        'Beloved, never avenge yourselves, but leave it to the wrath of God, for it is written, “Vengeance is Mine, I will repay, says the Lord.”',
      ],
      'Exodus 20:13 · 1 John 3:15 · Matthew 5:21-22 · Revelation 21:8 · Romans 12:19',
    ),
    chamber(
      'Malice',
      'Put away all malice — the quiet wish to harm.',
      [
        'Let all bitterness and wrath and anger and clamor and slander be put away from you, along with all malice.',
        'So put away all malice and all deceit and hypocrisy and envy and all slander.',
        'Be kind to one another, tenderhearted, forgiving one another, as God in Christ forgave you.',
        'Now the works of the flesh are evident: … enmity, strife, jealousy, fits of anger, rivalries, dissensions, divisions, envy…',
        'Those who do such things will not inherit the kingdom of God.',
      ],
      'Ephesians 4:31-32 · 1 Peter 2:1 · Galatians 5:19-21',
    ),
    chamber(
      'Falsehood',
      'All liars — and everyone who loves and practices falsehood.',
      [
        'Therefore, having put away falsehood, let each one of you speak the truth with his neighbor, for we are members one of another.',
        'Lying lips are an abomination to the Lord, but those who act faithfully are His delight.',
        'But as for … all liars, their portion will be in the lake that burns with fire and sulfur, which is the second death.',
        'Outside are the dogs and sorcerers and the sexually immoral and murderers and idolaters, and everyone who loves and practices falsehood.',
        'Let what you say be simply “Yes” or “No”; anything more than this comes from evil.',
      ],
      'Ephesians 4:25 · Proverbs 12:22 · Revelation 21:8 · Revelation 22:15 · Matthew 5:37',
    ),
    chamber(
      'The Full Armor of God',
      'The kit for the war — stand.',
      [
        'Be strong in the Lord and in the strength of His might.',
        'Put on the whole armor of God, that you may be able to stand against the schemes of the devil.',
        'Stand therefore, having fastened on the belt of truth, and having put on the breastplate of righteousness, and as shoes for your feet, having put on the readiness given by the gospel of peace.',
        'In all circumstances take up the shield of faith, with which you can extinguish all the flaming darts of the evil one; and take the helmet of salvation, and the sword of the Spirit, which is the word of God, praying at all times in the Spirit.',
      ],
      'Ephesians 6:10-18',
    ),
    chamber(
      'Watch and Be Ready',
      'Stay awake. The Son of Man is coming at an hour you do not expect.',
      [
        'Watch therefore, for you know neither the day nor the hour.',
        'Therefore you also must be ready, for the Son of Man is coming at an hour you do not expect.',
        'See, I have told you beforehand.',
        'But stay awake at all times, praying that you may have strength to escape all these things that are going to take place, and to stand before the Son of Man.',
        'Behold, I stand at the door and knock. If anyone hears My voice and opens the door, I will come in to him and eat with him, and he with Me.',
        'I have said these things to you, that when their hour comes you may remember that I told them to you.',
      ],
      'Matthew 25:13 · Matthew 24:44 · Matthew 24:25 · Luke 21:36 · Revelation 3:20 · John 16:4',
    ),
    chamber(
      'Ten Virgins',
      'Five were wise, five foolish — the door was shut.',
      [
        'Then the kingdom of heaven will be like ten virgins who took their lamps and went to meet the bridegroom. Five of them were foolish, and five were wise.',
        'For when the foolish took their lamps, they took no oil with them, but the wise took flasks of oil with their lamps.',
        'As the bridegroom was delayed, they all became drowsy and slept. But at midnight there was a cry, “Here is the bridegroom! Come out to meet him.”',
        'And the foolish said to the wise, “Give us some of your oil, for our lamps are going out.” But the wise answered, saying, “Since there will not be enough for us and for you, go rather to the dealers and buy for yourselves.”',
        'And while they were going to buy, the bridegroom came, and those who were ready went in with him to the marriage feast, and the door was shut.',
        'Afterward the other virgins came also, saying, “Lord, lord, open to us.” But he answered, “Truly, I say to you, I do not know you.” Watch therefore, for you know neither the day nor the hour.',
      ],
      'Matthew 25:1-13',
    ),
    chamber(
      'The Faithful Servant',
      'Blessed is that servant whom his master will find so doing when he comes.',
      [
        'Who then is the faithful and wise servant, whom his master has set over his household, to give them their food at the proper time? Blessed is that servant whom his master will find so doing when he comes.',
        'But if that wicked servant says to himself, “My master is delayed,” and begins to beat his fellow servants and eats and drinks with drunkards, the master of that servant will come on a day when he does not expect him and at an hour he does not know.',
        'And will cut him in pieces and put him with the hypocrites. In that place there will be weeping and gnashing of teeth.',
        'Everyone to whom much was given, of him much will be required, and from him to whom they entrusted much, they will demand the more.',
        'Stay dressed for action and keep your lamps burning, and be like men who are waiting for their master to come home from the wedding feast, so that they may open the door to him at once when he comes and knocks.',
      ],
      'Matthew 24:45-51 · Luke 12:35-36, 48',
    ),
    chamber(
      'One Taken, One Left',
      'Two in the field — one taken, one left.',
      [
        'Then two men will be in the field; one will be taken and one left. Two women will be grinding at the mill; one will be taken and one left.',
        'I tell you, in that night there will be two in one bed. One will be taken and the other left. There will be two women grinding together. One will be taken and the other left.',
        'As were the days of Noah, so will be the coming of the Son of Man. For as in those days before the flood they were eating and drinking, marrying and giving in marriage, until the day when Noah entered the ark, and they were unaware until the flood came and swept them all away, so will be the coming of the Son of Man.',
        'Therefore, stay awake, for you do not know on what day your Lord is coming.',
        'See, I have told you beforehand.',
      ],
      'Matthew 24:40-42 · Luke 17:34-35 · Matthew 24:37-39 · Matthew 24:25',
    ),
    chamber(
      'Treasure in Heaven',
      'Lay up treasure where moth and rust do not destroy.',
      [
        'Do not lay up for yourselves treasures on earth, where moth and rust destroy and where thieves break in and steal, but lay up for yourselves treasures in heaven, where neither moth nor rust destroys and where thieves do not break in and steal.',
        'For where your treasure is, there your heart will be also.',
        'But seek first the kingdom of God and His righteousness, and all these things will be added to you.',
        'Sell your possessions, and give to the needy. Provide yourselves with moneybags that do not grow old, with a treasure in the heavens that does not fail.',
        'As for the rich in this present age, charge them not to be haughty, nor to set their hopes on the uncertainty of riches, but on God… They are to do good, to be rich in good works, to be generous and ready to share, thus storing up treasure for themselves as a good foundation for the future.',
      ],
      'Matthew 6:19-21 · Matthew 6:33 · Luke 12:33 · 1 Timothy 6:17-19',
    ),
    chamber(
      'Prayer',
      'Ask, seek, knock — pray without ceasing.',
      [
        'Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you.',
        'And He told them a parable to the effect that they ought always to pray and not lose heart.',
        'Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',
        'Likewise the Spirit helps us in our weakness. For we do not know what to pray for as we ought, but the Spirit Himself intercedes for us with groanings too deep for words.',
        'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
        'If any of you lacks wisdom, let him ask God, who gives generously to all without reproach, and it will be given him.',
        'The prayer of a righteous person has great power as it is working.',
      ],
      'Matthew 7:7 · Luke 18:1 · 1 Thessalonians 5:16-18 · Romans 8:26 · Philippians 4:6 · James 1:5 · James 5:16',
    ),
    chamber(
      'Fasting',
      'Humble yourself with fasting — seek God, not applause.',
      [
        'And when you fast, do not look gloomy like the hypocrites, for they disfigure their faces that their fasting may be seen by others… But when you fast, anoint your head and wash your face, that your fasting may not be seen by others but by your Father who is in secret.',
        'Then I turned my face to the Lord God, seeking Him by prayer and pleas for mercy with fasting and sackcloth and ashes.',
        'Is not this the fast that I choose: to loose the bonds of wickedness, to undo the straps of the yoke, to let the oppressed go free… Is it not to share your bread with the hungry…?',
        'And Jesus said to them, “Can the wedding guests mourn as long as the bridegroom is with them? The days will come when the bridegroom is taken away from them, and then they will fast.”',
        'While they were worshiping the Lord and fasting, the Holy Spirit said, “Set apart for Me Barnabas and Saul for the work to which I have called them.”',
        'So we fasted and implored our God for this, and He listened to our entreaty.',
      ],
      'Matthew 6:16-18 · Daniel 9:3 · Isaiah 58:6-7 · Matthew 9:15 · Acts 13:2 · Ezra 8:23',
    ),
    chamber(
      'Sabbath',
      'The seventh day is the Sabbath — Saturday — still holy to the Lord. A holy day He made.',
      [
        'So God blessed the seventh day and made it holy, because on it God rested from all His work that He had done in creation.',
        'Remember the Sabbath day, to keep it holy. Six days you shall labor, and do all your work, but the seventh day is a Sabbath to the Lord your God. On it you shall not do any work.',
        'You shall keep My Sabbaths, for this is a sign between Me and you throughout your generations, that you may know that I, the Lord, sanctify you.',
        'Moreover, I gave them My Sabbaths as a sign between Me and them, that they might know that I am the Lord who sanctifies them.',
        'And keep My Sabbaths holy that they may be a sign between Me and you, that you may know that I am the Lord your God.',
        'If you turn back your foot from the Sabbath, from doing your pleasure on My holy day, and call the Sabbath a delight and the holy day of the Lord honorable… then you shall take delight in the Lord.',
        'And He said to them, “The Sabbath was made for man, not man for the Sabbath. So the Son of Man is lord even of the Sabbath.”',
        'There remains a Sabbath rest for the people of God, for whoever has entered God’s rest has also rested from his works as God did from His.',
        'Be still, and know that I am God.',
      ],
      'Genesis 2:3 · Exodus 20:8-10 · Exodus 31:13 · Ezekiel 20:12 · Ezekiel 20:20 · Isaiah 58:13-14 · Mark 2:27-28 · Hebrews 4:9-10 · Psalm 46:10',
    ),
    chamber(
      'Healing',
      'Jesus heals — ask, trust, and do not lose heart.',
      [
        'And He went throughout all Galilee, teaching in their synagogues and proclaiming the gospel of the kingdom and healing every disease and every affliction among the people.',
        'He Himself took our illnesses and bore our diseases.',
        'Is anyone among you sick? Let him call for the elders of the church, and let them pray over him, anointing him with oil in the name of the Lord. And the prayer of faith will save the one who is sick, and the Lord will raise him up.',
        'And these signs will accompany those who believe: in My name they will cast out demons… they will lay their hands on the sick, and they will recover.',
        'Bless the Lord, O my soul, and forget not all His benefits, who forgives all your iniquity, who heals all your diseases.',
        'Heal me, O Lord, and I shall be healed; save me, and I shall be saved, for You are my praise.',
      ],
      'Matthew 4:23 · Matthew 8:17 · James 5:14-15 · Mark 16:17-18 · Psalm 103:2-3 · Jeremiah 17:14',
    ),
    chamber(
      'Laying on of Hands',
      'Hands laid in faith under the name of Jesus.',
      [
        'Then they laid their hands on them and they received the Holy Spirit.',
        'Do not neglect the gift you have, which was given you by prophecy when the council of elders laid their hands on you.',
        'And He could do no mighty work there, except that He laid His hands on a few sick people and healed them.',
        'They will lay their hands on the sick, and they will recover.',
        'And when Paul had laid his hands on them, the Holy Spirit came on them, and they began speaking in tongues and prophesying.',
        'And God was doing extraordinary miracles by the hands of Paul.',
      ],
      'Acts 8:17 · 1 Timothy 4:14 · Mark 6:5 · Mark 16:18 · Acts 19:6 · Acts 19:11',
    ),
    (() => {
      // Title people search for; stable id keeps spine/related/tests unbroken.
      const c = chamber(
        'Gifts of the Spirit',
        'Varieties of gifts, one Spirit — for the common good.',
        [
          'Now there are varieties of gifts, but the same Spirit; and there are varieties of service, but the same Lord; and there are varieties of activities, but it is the same God who empowers them all in everyone. To each is given the manifestation of the Spirit for the common good.',
          'For to one is given through the Spirit the utterance of wisdom, and to another the utterance of knowledge… to another faith… to another gifts of healing… to another the working of miracles, to another prophecy, to another the ability to distinguish between spirits, to another various kinds of tongues, to another the interpretation of tongues.',
          'Having gifts that differ according to the grace given to us, let us use them: if prophecy, in proportion to our faith; if service, in our serving; the one who teaches, in his teaching; the one who exhorts, in his exhortation; the one who contributes, in generosity; the one who leads, with zeal; the one who does acts of mercy, with cheerfulness.',
          'As each has received a gift, use it to serve one another, as good stewards of God’s varied grace… in order that in everything God may be glorified through Jesus Christ.',
          'And He gave the apostles, the prophets, the evangelists, the shepherds and teachers, to equip the saints for the work of ministry, for building up the body of Christ.',
          'Pursue love, and earnestly desire the spiritual gifts, especially that you may prophesy.',
          'If I speak in the tongues of men and of angels, but have not love, I am a noisy gong or a clanging cymbal.',
        ],
        '1 Corinthians 12:4-11 · Romans 12:6-8 · 1 Peter 4:10-11 · Ephesians 4:11-12 · 1 Corinthians 14:1 · 1 Corinthians 13:1',
      )
      c.id = 'spiritual-gifts'
      return c
    })(),
    chamber(
      'Hope of Glory',
      'What we fight toward — glory with Him.',
      [
        'The sufferings of this present time are not worth comparing with the glory that is to be revealed to us.',
        'Christ in you, the hope of glory.',
        'We wait for our blessed hope, the appearing of the glory of our great God and Savior Jesus Christ.',
        'Behold, the dwelling place of God is with man… He will wipe away every tear from their eyes.',
        'Behold, I am coming soon, bringing My recompense with Me, to repay each one for what he has done.',
        'Blessed is the one who remains steadfast under trial, for when he has stood the test he will receive the crown of life.',
        'There is laid up for me the crown of righteousness, which the Lord will award on that day.',
        'When the Chief Shepherd appears, you will receive the unfading crown of glory.',
      ],
      'Romans 8:18 · Colossians 1:27 · Titus 2:13 · Revelation 21:3-4 · Revelation 22:12 · James 1:12 · 2 Timothy 4:8 · 1 Peter 5:4',
    ),
    chamber(
      'The Righteous Fall',
      'Fall and rise.',
      [
        'For the righteous falls seven times and rises again, but the wicked stumble in times of calamity.',
        'For all have sinned and fall short of the glory of God.',
        'If we say we have no sin, we deceive ourselves, and the truth is not in us.',
        'As it is written: “None is righteous, no, not one.”',
      ],
      'Proverbs 24:16 · Romans 3:23 · 1 John 1:8 · Romans 3:10',
    ),
  ],
  testimony: {
    sealed: true,
    previewLabel: 'A sealed word',
    lines: [
      'This is a testament to Him that through the fire He was always with me.',
      'I have found a crucible in the rubble. A hidden gem only He could fashion.',
    ],
    poem: {
      title: 'Backstory',
      linkLabel: 'For a deeper understanding',
      lines: [
        'I made a grave error.',
        'Travesty has beset me.',
        'Chaos swirls all around me,',
        'though I take no delight in it, nor part in its ways.',
        'Truth and integrity are my shield,',
        'yet I am flawed to the core.',
        'I strive to control myself at every turn,',
        'but still I slip and stumble.',
        'I have taken a fall.',
        'I fell from the grace that once protected me.',
        'The hoot of the owl in the haunt warned me.',
        'I heard it. I listened. I pondered.',
        'Yet I did not heed the warning,',
        'and I failed to guard myself from travesty.',
        'Discipline and justice come to all whom the Lord loves—',
        'by His hand, without prejudice.',
        'He stores up His wrath for everyone else.',
        'Take correction when it comes to you.',
        'Study its ways.',
        'Digest its warnings.',
        'Redemption’s journey may be quick or prolonged.',
        'Pray for mercy.',
        'Delight in goodness.',
        'Once restored, help others who share the same plight.',
        'For it is only by His lovingkindness and mercy',
        'that we are forgiven, restored, and saved.',
      ],
    },
  },
}

// Wire field aids + related web
for (const c of document.chambers) {
  const aids = FIELD_AIDS[c.id]
  if (aids) {
    c.hacks = aids.hacks ?? []
    c.prayers = aids.prayers ?? []
  }
  // Artifact kinds: most nodes are first-principle chambers; rubrics are denser SOP under fire
  if (c.id === 'kill-the-flesh-walk-in-the-spirit') {
    c.kind = 'rubric'
  } else if (c.id === 'the-line') {
    c.kind = 'stance'
  } else if (c.id === 'pain-interrupt') {
    c.kind = 'lock'
  } else if (!c.kind) {
    c.kind = 'chamber'
  }
  c.related = RELATED[c.id] ?? []
  // Battle-card line art (transparent pow) — not in chamber() helper
  if (c.id === 'kill-the-flesh') {
    c.illustration = {
      src: '/art/kill-the-flesh-pow.png',
      alt: 'Pow crescendo line form',
    }
  }
}

/**
 * UI shows summary under the title, then Truth body.
 * Drop body[0] when it only repeats the lead (exact or near).
 * If body lead is richer, promote it to summary so nothing is lost.
 */
function normalizeLead(s) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set([
  'the',
  'and',
  'for',
  'you',
  'your',
  'with',
  'that',
  'this',
  'from',
  'not',
  'but',
  'are',
  'was',
  'has',
  'have',
  'will',
  'shall',
  'his',
  'her',
  'our',
  'all',
  'who',
  'whom',
  'into',
  'onto',
  'than',
  'then',
  'when',
  'what',
  'your',
])

function significantWords(s) {
  return normalizeLead(s)
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w))
}

function isLeadRedundant(summary, first) {
  const nS = normalizeLead(summary)
  const nF = normalizeLead(first)
  if (!nS || !nF) return false
  // Exact or one is a strict prefix of the other (true UI duplicate)
  if (nS === nF) return true
  if (nF.startsWith(nS) || nS.startsWith(nF)) return true
  // Fuzzy only when lengths are close — do not yank a full verse into a short door summary
  const lenRatio = Math.min(nS.length, nF.length) / Math.max(nS.length, nF.length)
  if (lenRatio < 0.72) return false
  const sW = significantWords(summary)
  const fSet = new Set(significantWords(first))
  if (sW.length >= 4) {
    const hits = sW.filter((w) => fSet.has(w)).length
    if (hits / sW.length >= 0.85) return true
  }
  const take = Math.min(6, nS.split(' ').length, nF.split(' ').length)
  if (take >= 5 && nS.split(' ').slice(0, take).join(' ') === nF.split(' ').slice(0, take).join(' ')) {
    return true
  }
  return false
}

let dedupedLeads = 0
for (const c of document.chambers) {
  if (c.body.length === 0) continue
  const first = c.body[0].text
  if (!isLeadRedundant(c.summary, first)) continue
  // Prefer the fuller line as the header summary
  if (first.length > c.summary.length + 10) {
    c.summary = first
  }
  c.body = c.body.slice(1)
  dedupedLeads += 1
}

// Validate verse parse coverage + related ids + Under fire cap
const MAX_HACKS = 3
let totalVerses = 0
const ids = new Set(document.chambers.map((c) => c.id))
for (const c of document.chambers) {
  totalVerses += c.verses.length
  if (c.verses.length === 0) {
    console.error('No verses for chamber:', c.title)
    process.exit(1)
  }
  if (c.body.length === 0) {
    console.error('Empty Truth body after lead dedupe (add a non-summary line):', c.title)
    process.exit(1)
  }
  if (c.hacks.length === 0) {
    console.error('Empty Under fire (need 1–3 hacks):', c.title)
    process.exit(1)
  }
  if (c.hacks.length > MAX_HACKS) {
    console.error(`Under fire max ${MAX_HACKS} (has ${c.hacks.length}):`, c.title)
    process.exit(1)
  }
  if (c.prayers.length === 0) {
    console.error('Empty Prayer:', c.title)
    process.exit(1)
  }
  for (const rid of c.related) {
    if (!ids.has(rid)) {
      console.error(`Broken related link: ${c.id} → ${rid}`)
      process.exit(1)
    }
  }
}

const withHacks = document.chambers.filter((c) => c.hacks.length > 0).length
const withPrayers = document.chambers.filter((c) => c.prayers.length > 0).length

writeFileSync(out, JSON.stringify(document, null, 2) + '\n')

// AI / AEO surface: /c/:id HTML+MD, /j, /k, static OG PNGs, llms, export, sitemap
const ai = await buildAiSurface(document)

console.log(
  `Wrote ${document.chambers.length} chambers, ${totalVerses} verse refs, ${withHacks} with hacks, ${withPrayers} with prayers, ${dedupedLeads} lead dedupes → ${out}`,
)
console.log(
  `AI surface: ${ai.chambers} chambers · ${ai.journeys || 0} journeys · ${ai.keys || 0} keys · ${ai.ogCards || 0} OG PNGs → public/`,
)
