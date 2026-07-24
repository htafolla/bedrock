/**
 * One-shot content compiler: source text → src/content/bedrock.json
 * Run: node scripts/build-content.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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

function chamber(title, summary, bodyLines, verseLine) {
  return {
    id: slug(title),
    title,
    summary,
    body: paragraphs(...bodyLines),
    verses: parseVerseList(verseLine),
    hacks: [],
    prayers: [],
    related: [],
  }
}

/** Pressure-ready aids: truth is in body/verses; these are the usable layer under fire. */
const FIELD_AIDS = {
  'god-first': {
    hacks: [
      'When panic rises, stop and name who is first: God — not outcome, not reputation, not control.',
      'Seek first the kingdom in the next five minutes: one obedient act, not a full recovery plan.',
    ],
    prayers: [
      'Father, You are first. I am not God. Be still my heart and lead me in Your will. Amen.',
    ],
  },
  'his-power-and-beauty': {
    hacks: [
      'When chaos feels big, look up: the heavens declare His glory — your crisis is not the largest thing in the room.',
      'Worship is a weapon. Name one true thing about who He is before you name one more fear.',
    ],
    prayers: [
      'Lord of all power and beauty, I worship You. Hold all things together — including me. Amen.',
    ],
  },
  'his-promises': {
    hacks: [
      'Replace “what if they never…” with “what has He already promised that does not depend on them.”',
      'Once you are in His hand, no one snatches you out — including your own shame narrative.',
    ],
    prayers: [
      'Lord, You are faithful. Anchor me to Your word when my feelings lie. Amen.',
    ],
  },
  'his-provision': {
    hacks: [
      'Ask for daily bread, not a five-year fortress. Today’s obedience + today’s trust.',
      'Your Father knows what you need. Anxiety is not a provision strategy.',
    ],
    prayers: [
      'Father, give us this day our daily bread. I trust Your knowing more than my planning. Amen.',
    ],
  },
  'the-lords-prayer': {
    hacks: [
      'Pray it slowly as a reset: Name → Kingdom → Will → Bread → Forgive → Deliver.',
      'If you cannot form words, pray the Lord’s Prayer until your spirit steadies.',
    ],
    prayers: [
      'Our Father in heaven, hallowed be Your name. Your kingdom come, Your will be done. Amen.',
    ],
  },
  'he-is-for-you': {
    hacks: [
      'If God is for you, stop rehearsing every face that seems against you.',
      'Cast the care — do not decorate it. He cares for you is a fact, not a mood.',
    ],
    prayers: [
      'Lord, You are for me. I cast my cares on You. Remember mercy over my sin. Amen.',
    ],
  },
  'the-meaning-of-life': {
    hacks: [
      'Simplify the assignment: love God fully; love people as yourself. Everything else is secondary.',
      'When overwhelmed, ask only: what does love require of me in the next hour?',
    ],
    prayers: [
      'Jesus, teach me to love You with all my heart and to love others as myself. Amen.',
    ],
  },
  'deny-yourself': {
    hacks: [
      'The cross is daily. Ask: what must I lay down right now — ego, argument, appetite, control?',
      'Losing your life for His sake is not self-hatred; it is refusing to make self the god of this hour.',
    ],
    prayers: [
      'Lord, I deny myself. I take up my cross. I follow You — not my flesh. Amen.',
    ],
  },
  'god-on-marriage': {
    hacks: [
      'God’s design does not change when feelings collapse. Hold the standard; entrust the outcome.',
      'He is witness between a man and the wife of his youth. Speak as if He is in the room.',
    ],
    prayers: [
      'God of the covenant, You hate faithlessness. Make me faithful. Heal what is broken. Amen.',
    ],
  },
  'love-and-patience': {
    hacks: [
      'Love keeps no record of wrongs — delete the scoreboard you keep replaying.',
      'Patience is love under pressure. Slow the reply. Soften the tone. Protect, trust, hope, persevere.',
    ],
    prayers: [
      'Lord, make my love patient and kind. No envy, no record of wrongs. Help me endure. Amen.',
    ],
  },
  'a-broken-and-contrite-heart': {
    hacks: [
      'Broken is not useless. God looks to the humble and contrite — not the polished performance.',
      'Do not rush past conviction. Sit with a clean sorrow that leads to life, not a toxic shame that freezes you.',
    ],
    prayers: [
      'O God, a broken and contrite heart You will not despise. I humble myself. Look upon me. Amen.',
    ],
  },
  'guard-your-heart-and-mouth': {
    hacks: [
      'Everything flows from the heart — so gate the inputs and the words. Silence is sometimes love.',
      'Before you speak: does this build up according to need, or does it only relieve my pressure?',
    ],
    prayers: [
      'Set a guard, O Lord, over my mouth. Keep my heart. Let my words give grace. Amen.',
    ],
  },
  'be-quick-to-listen': {
    hacks: [
      'Count to three before you answer. Listening is not losing; it is refusing to let anger drive.',
      'Slow to speak is spiritual warfare when the flesh wants the last word.',
    ],
    prayers: [
      'Lord, make me quick to listen, slow to speak, slow to anger. Amen.',
    ],
  },
  'restore-gently-and-give-time': {
    hacks: [
      'Gentleness is not weakness. Restore with care — and watch yourself so you do not fall the same way.',
      'There is a time for everything. Do not force a harvest in a winter season.',
    ],
    prayers: [
      'Father, teach me to restore gently. Give wisdom for timing. Keep me from pride. Amen.',
    ],
  },
  'walk-in-honesty-and-truth': {
    hacks: [
      'Let your yes be yes. Half-truths are full lies with better manners.',
      'Put off falsehood even when truth costs status. Light is safer than managed darkness.',
    ],
    prayers: [
      'God of truth, I put off falsehood. Make my words straight. Keep me in the light. Amen.',
    ],
  },
  'choose-selfless-love': {
    hacks: [
      'In humility count others more significant. Ask: what serves them, not what wins for me?',
      'Selfish ambition feels like clarity and is often poison. Check the motive before the move.',
    ],
    prayers: [
      'Lord, empty me of selfish ambition. Let me look to others’ interests in love. Amen.',
    ],
  },
  'do-not-repay-evil-with-evil': {
    hacks: [
      'Blessing is the counter-move. Evil repaid with evil multiplies darkness.',
      'When insult rises, answer with a blessing — out loud if you can, in prayer if you cannot yet.',
    ],
    prayers: [
      'Lord, I will not repay evil with evil. Teach me to bless. Guard my tongue and heart. Amen.',
    ],
  },
  'one-another-in-the-body': {
    hacks: [
      'You were not designed to carry this alone. Bear burdens — and let trusted saints bear yours.',
      'Encourage daily. Isolation hardens the heart; presence softens deceit.',
    ],
    prayers: [
      'Father, place me in Your body. Help me bear burdens and receive help. Stir love and good works. Amen.',
    ],
  },
  'trust-in-the-lord': {
    hacks: [
      'Lean not on your own understanding — especially when your understanding is panic with a spreadsheet.',
      'Trust is active: acknowledge Him in this path, then walk the straight step He shows.',
    ],
    prayers: [
      'Lord, I trust You with all my heart. I will not lean on my own understanding. Direct my path. Amen.',
    ],
  },
  'the-cross-and-our-justification': {
    hacks: [
      'Condemnation says “you are finished.” The cross says “it is finished.” Choose the finished work.',
      'Your standing is not your streak of good days. You are justified by faith in Christ.',
    ],
    prayers: [
      'Jesus, by Your wounds I am healed. There is no condemnation in You. Keep me there. Amen.',
    ],
  },
  'his-grace-is-sufficient': {
    hacks: [
      'Weakness is not the end of usefulness — it is where His power is perfected. Stop performing strength.',
      'Grace trains you; it does not excuse you. Receive mercy, then renounce the flesh habit.',
    ],
    prayers: [
      'Lord, Your grace is enough for this hour. Power in my weakness. Teach me to live upright. Amen.',
    ],
  },
  'walk-by-the-spirit': {
    hacks: [
      'Before you speak, check the fruit: is this love, patience, self-control — or flesh wanting control?',
      'Flesh wants the last word. Spirit keeps in step. Delay the reaction; choose the next right fruit.',
    ],
    prayers: [
      'Holy Spirit, I choose to walk with You. Kill rage, impatience, and control in me. Grow Your fruit. Amen.',
    ],
  },
  'marriage-covenant': {
    hacks: [
      'Covenant is not a contract of feelings. Lead by sacrifice, not by winning the argument.',
      'If separation exists: do not invent a new story. Remain faithful to what God still calls true.',
    ],
    prayers: [
      'Lord of the covenant, make me a husband of sacrificial love. Heal what I broke. Keep me faithful. Amen.',
    ],
  },
  'count-the-trial-as-joy': {
    hacks: [
      'Joy here is not denial. It is trusting that testing is producing endurance, not random cruelty.',
      'Name the fruit goal: perseverance → character → hope. Ask which of the three is forming today.',
    ],
    prayers: [
      'Father, I do not love this fire. Use it. Produce endurance and hope in me. Amen.',
    ],
  },
  'wait-on-the-lord': {
    hacks: [
      'Waiting is not passivity. It is refusing to force outcomes with flesh while you stay obedient today.',
      'When urgency screams, answer with: “Be strong. Take courage. Wait for the Lord.”',
    ],
    prayers: [
      'Lord, I wait for You. Renew my strength. I will not force what only You can restore. Amen.',
    ],
  },
  'lament-and-pour-out-your-heart': {
    hacks: [
      'Lament is allowed. Stuffing is not holiness. Pour it out to God, not onto people as weapons.',
      '“How long, O Lord?” is Scripture language. Use it instead of bitterness monologue.',
    ],
    prayers: [
      'Lord, I pour out my heart. How long? Stay near the brokenhearted. I trust You with this pain. Amen.',
    ],
  },
  'confess-and-be-cleansed': {
    hacks: [
      'Confession is specific. Vague sorrow keeps the sin warm. Name it, release it, receive cleansing.',
      'Draw near with confidence — not swagger. Mercy is for need, not for performance.',
    ],
    prayers: [
      'Father, I confess. Cleanse me from all unrighteousness. I draw near to Your throne of grace. Amen.',
    ],
  },
  'forgive-as-you-have-been-forgiven': {
    hacks: [
      'Forgiveness is not saying it did not hurt. It is releasing vengeance to God and refusing the debt ledger.',
      'Unforgiveness chains you to the wound. Forgiveness frees you to obey — even while grief remains.',
    ],
    prayers: [
      'Lord, as You forgave me in Christ, I forgive. Soften my heart. Keep no record of wrongs in me. Amen.',
    ],
  },
  'leave-vengeance-to-the-lord': {
    hacks: [
      'Stillness is a weapon. You need not win the courtroom of your mind. The Lord fights; you stand.',
      'If the urge is to repay, that is flesh. Bless, entrust, do the next right thing.',
      'Hatred of a brother and love of God cannot share the same heart. Name the hate; put it down before it becomes a second sin.',
    ],
    prayers: [
      'Lord, fight for me. Vengeance is Yours. Root hatred out of me. Teach me to love as You love. Amen.',
    ],
  },
  'do-not-fear': {
    hacks: [
      'Fear is a spirit-claim. Counter it: power, love, sound mind — then take the next obedient step.',
      'You cannot add an hour by worry. So put the hour into prayer and duty instead.',
    ],
    prayers: [
      'God, You have not given me a spirit of fear. Be with me. Steady my mind. Amen.',
    ],
  },
  fear: {
    hacks: [
      'Fear is the absence of perfect love — not proof that danger is fake. Run toward His love, not toward control.',
      'Say it plain: I am afraid of ___. Then: when I am afraid, I put my trust in You.',
      'Fear of man is a snare. Whose face are you managing? Put that face down. Look to the Lord.',
      'Peace is given, not earned. Receive His love; then take the next obedient step — even if your hands still shake.',
    ],
    prayers: [
      'Father, perfect Your love in me. Cast out fear. I am Your child, not a slave to terror. Amen.',
    ],
  },
  loss: {
    hacks: [
      'Name what was lost without rewriting God. Mourning is not unbelief.',
      'Do not grieve as those without hope — hope does not erase tears; it frames them.',
      'Empty hands can still bless His name. One honest sentence to God is better than a performance of fine.',
    ],
    prayers: [
      'Father, I am near the broken place. Be near me. Comfort those who mourn. Hold what I cannot hold. Amen.',
    ],
  },
  'take-every-thought-captive': {
    hacks: [
      'Catch the thought early: is it true, pure, lovely — or accusation, fantasy, revenge, despair?',
      'Capture → replace with Scripture → act. Do not argue with every intrusive story all day.',
    ],
    prayers: [
      'Jesus, I take this thought captive to You. Fill my mind with what is true and pure. Amen.',
    ],
  },
  'the-full-armor-of-god': {
    hacks: [
      'Dress for war daily: truth, righteousness, peace, faith, salvation, Word, prayer — not vibes.',
      'Flaming darts are expected. Raise the shield of faith instead of explaining every dart to yourself.',
    ],
    prayers: [
      'Lord, I put on Your full armor. Help me stand against the schemes of the devil. Amen.',
    ],
  },
  'the-righteous-fall': {
    hacks: [
      'Name the fall without lying: I sinned. I am not finished. Rising is obedience, not self-pity.',
      'Do not claim sinlessness. Do not camp in shame. Confess, rise, walk by the Spirit again.',
      'Your fall does not cancel the crucible. Get up. The righteous man rises again.',
    ],
    prayers: [
      'Father, I fell. Cleanse me. I rise by Your mercy. Teach me not to walk in the flesh. Amen.',
    ],
  },
  'hope-of-glory': {
    hacks: [
      'Present pain is real. Future glory is more real. Hold both without denying either.',
      'Steadfast under trial is not glamorous. Crowns are for those who remain — keep remaining today.',
    ],
    prayers: [
      'Jesus, my hope of glory. Wipe tears in Your time. Keep me steadfast until You appear. Amen.',
    ],
  },
  'renew-your-mind': {
    hacks: [
      'The world pattern will reassert itself by default. Choose a deliberate input: Word over feed, prayer over spiral.',
      'Transformation is renewed thinking practiced daily — not one emotional breakthrough.',
    ],
    prayers: [
      'Lord, renew my mind. Break conformity to the world. Transform how I see this trial. Amen.',
    ],
  },
}

/** Edges in the navigable web of truth (chamber id → related ids). */
const RELATED = {
  'god-first': ['his-promises', 'trust-in-the-lord', 'do-not-fear', 'the-lords-prayer'],
  'his-power-and-beauty': ['god-first', 'his-promises', 'hope-of-glory'],
  'his-promises': ['god-first', 'he-is-for-you', 'trust-in-the-lord', 'hope-of-glory'],
  'his-provision': ['the-lords-prayer', 'trust-in-the-lord', 'god-first'],
  'the-lords-prayer': ['his-provision', 'forgive-as-you-have-been-forgiven', 'god-first'],
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
  'deny-yourself': ['walk-by-the-spirit', 'the-cross-and-our-justification', 'count-the-trial-as-joy'],
  'walk-by-the-spirit': [
    'deny-yourself',
    'take-every-thought-captive',
    'the-righteous-fall',
    'the-full-armor-of-god',
  ],
  'god-on-marriage': ['marriage-covenant', 'love-and-patience', 'forgive-as-you-have-been-forgiven'],
  'marriage-covenant': [
    'god-on-marriage',
    'love-and-patience',
    'choose-selfless-love',
    'leave-vengeance-to-the-lord',
  ],
  'love-and-patience': ['marriage-covenant', 'forgive-as-you-have-been-forgiven', 'be-quick-to-listen'],
  'count-the-trial-as-joy': ['wait-on-the-lord', 'hope-of-glory', 'lament-and-pour-out-your-heart'],
  'wait-on-the-lord': ['count-the-trial-as-joy', 'trust-in-the-lord', 'do-not-fear'],
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
  'be-quick-to-listen': ['guard-your-heart-and-mouth', 'love-and-patience', 'restore-gently-and-give-time'],
  'restore-gently-and-give-time': ['confess-and-be-cleansed', 'love-and-patience', 'one-another-in-the-body'],
  'confess-and-be-cleansed': [
    'the-righteous-fall',
    'a-broken-and-contrite-heart',
    'his-grace-is-sufficient',
    'walk-by-the-spirit',
  ],
  'walk-in-honesty-and-truth': ['confess-and-be-cleansed', 'guard-your-heart-and-mouth', 'the-full-armor-of-god'],
  'choose-selfless-love': ['love-and-patience', 'deny-yourself', 'marriage-covenant'],
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
  ],
  'forgive-as-you-have-been-forgiven': [
    'the-cross-and-our-justification',
    'leave-vengeance-to-the-lord',
    'love-and-patience',
  ],
  'one-another-in-the-body': ['restore-gently-and-give-time', 'confess-and-be-cleansed', 'choose-selfless-love'],
  'trust-in-the-lord': ['god-first', 'do-not-fear', 'wait-on-the-lord', 'his-promises'],
  'do-not-fear': ['fear', 'trust-in-the-lord', 'his-promises', 'take-every-thought-captive'],
  fear: [
    'do-not-fear',
    'trust-in-the-lord',
    'loss',
    'take-every-thought-captive',
    'his-promises',
    'he-is-for-you',
    'his-grace-is-sufficient',
  ],
  loss: [
    'lament-and-pour-out-your-heart',
    'a-broken-and-contrite-heart',
    'hope-of-glory',
    'wait-on-the-lord',
    'he-is-for-you',
    'fear',
  ],
  'renew-your-mind': ['take-every-thought-captive', 'walk-by-the-spirit', 'the-full-armor-of-god'],
  'take-every-thought-captive': [
    'renew-your-mind',
    'the-full-armor-of-god',
    'walk-by-the-spirit',
    'do-not-fear',
  ],
  'the-full-armor-of-god': [
    'take-every-thought-captive',
    'walk-by-the-spirit',
    'hope-of-glory',
  ],
  'hope-of-glory': [
    'count-the-trial-as-joy',
    'the-cross-and-our-justification',
    'the-righteous-fall',
    'wait-on-the-lord',
  ],
  'the-righteous-fall': [
    'confess-and-be-cleansed',
    'his-grace-is-sufficient',
    'walk-by-the-spirit',
    'hope-of-glory',
    'a-broken-and-contrite-heart',
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
      'First principles, brain hacks, and short prayers to navigate a troubled life — truth you can stand on when the ground is shaking.',
    workingTitle: "The Hitchhiker's Guild · Love · Living · Enduring",
    version: '0.1.0',
    revised: '2026-07-24',
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
      'He is for you, not against you.',
      [
        'He is for you, not against you.',
        'He casts your sins behind His back and remembers them no more.',
        'Cast all your cares on Him, because He cares for you.',
      ],
      'Romans 8:31 · Isaiah 43:25 · Hebrews 8:12 · 1 Peter 5:7',
    ),
    chamber(
      'His Grace Is Sufficient',
      'My grace is sufficient for you, for My power is made perfect in weakness.',
      [
        'My grace is sufficient for you, for My power is made perfect in weakness.',
        'The grace of God has appeared, bringing salvation… training us to renounce ungodliness and to live self-controlled, upright, and godly lives.',
        'We love because He first loved us.',
      ],
      '2 Corinthians 12:9 · Titus 2:11-12 · 1 John 4:19',
    ),
    chamber(
      'The Meaning of Life',
      'Love God with all your heart, soul, mind, and strength. And love everyone as yourself.',
      [
        'Love God with all your heart, soul, mind, and strength.',
        'And love everyone as yourself.',
      ],
      'Matthew 22:37-39 · Mark 12:30-31 · Luke 10:27',
    ),
    chamber(
      'Deny Yourself',
      'If anyone would come after Me, let him deny himself, take up his cross daily, and follow Me.',
      [
        'If anyone would come after Me, let him deny himself, take up his cross daily, and follow Me.',
        'Whoever loses his life for My sake will find it.',
      ],
      'Luke 9:23 · Matthew 16:24-25',
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
      'Marriage is a lifelong one-flesh covenant of sacrificial love and mutual faithfulness.',
      [
        'Marriage is a lifelong one-flesh covenant of sacrificial love and mutual faithfulness.',
        'The husband is the head of the wife as Christ is head of the church.',
        'Husbands love by giving themselves up and washing her with the word — leadership is defined by sacrifice, not control.',
        'Wives respect their husbands with pure and reverent conduct. She brings him good, not harm, all the days of her life.',
        'Do not deprive one another except by mutual agreement for a limited time.',
        'Do not separate except briefly. If separation occurs, remain unmarried or be reconciled.',
        'Husbands must not divorce their wives. Divorce for any reason other than sexual immorality makes them and those who remarry them adulterers.',
      ],
      'Ephesians 5:23, 25-27, 33 · 1 Peter 3:1-2 · Proverbs 31:11-12 · 1 Corinthians 7:5, 10-11 · Matthew 19:6, 8-9',
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
      'Wait for the Lord; be strong, and let your heart take courage; wait for the Lord.',
      [
        'Wait for the Lord; be strong, and let your heart take courage; wait for the Lord.',
        'Those who wait for the Lord shall renew their strength.',
        'The Lord is good to those who wait for Him, to the soul who seeks Him.',
      ],
      'Psalm 27:14 · Isaiah 40:31 · Lamentations 3:25',
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
      'Guard your heart above all else, for everything you do flows from it.',
      [
        'Guard your heart above all else, for everything you do flows from it.',
        'Speak only what builds others up according to their needs.',
      ],
      'Proverbs 4:23 · Psalm 141:3 · Ephesians 4:29',
    ),
    chamber(
      'Be Quick to Listen',
      'Be quick to listen, slow to speak, and slow to become angry.',
      ['Be quick to listen, slow to speak, and slow to become angry.'],
      'James 1:19',
    ),
    chamber(
      'Restore Gently and Give Time',
      'If someone is caught in sin, restore them gently while watching yourself.',
      [
        'If someone is caught in sin, restore them gently while watching yourself.',
        'There is a time for everything.',
      ],
      'Galatians 6:1 · Ecclesiastes 3:1',
    ),
    chamber(
      'Confess and Be Cleansed',
      'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.',
      [
        'If we confess our sins, He is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.',
        'Confess your sins to one another and pray for one another, that you may be healed.',
        'Let us then with confidence draw near to the throne of grace, that we may receive mercy and find grace to help in time of need.',
      ],
      '1 John 1:9 · James 5:16 · Hebrews 4:16',
    ),
    chamber(
      'Walk in Honesty and Truth',
      'Put off falsehood and speak truthfully.',
      [
        'Put off falsehood and speak truthfully.',
        'Let your yes be yes and your no be no.',
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
        'Hatred is vengeance that never leaves the heart. Put it down. Bless. Entrust the scales to God.',
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
    chamber(
      'Trust in the Lord',
      'Trust in the Lord with all your heart and lean not on your own understanding.',
      [
        'Trust in the Lord with all your heart and lean not on your own understanding.',
        'Do not be anxious about anything.',
      ],
      'Proverbs 3:5-6 · Philippians 4:6 · Matthew 6:27, 34',
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
        'Fear is the absence of perfect love — not the absence of danger. The cure is not bravado; it is abiding in His love.',
        'When I am afraid, I put my trust in You.',
        'The fear of man lays a snare, but whoever trusts in the Lord is safe.',
        'Peace I leave with you; My peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.',
        'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.',
        'Name the fear. Receive His love. Take the next obedient step.',
      ],
      '1 John 4:18 · Psalm 56:3 · Proverbs 29:25 · John 14:27 · Joshua 1:9 · Romans 8:15',
    ),
    chamber(
      'Loss',
      'The Lord is near to the brokenhearted and saves the crushed in spirit.',
      [
        'The Lord is near to the brokenhearted and saves the crushed in spirit.',
        'Blessed are those who mourn, for they shall be comforted.',
        'We do not grieve as others do who have no hope.',
        'The Lord gave, and the Lord has taken away; blessed be the name of the Lord.',
        'Loss empties hands. It does not empty God. Pour out your heart. Wait. Hold what remains true.',
        'He will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore.',
      ],
      'Psalm 34:18 · Matthew 5:4 · 1 Thessalonians 4:13 · Job 1:21 · Revelation 21:4',
    ),
    chamber(
      'Renew Your Mind',
      'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
      [
        'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
      ],
      'Romans 12:2',
    ),
    chamber(
      'Take Every Thought Captive',
      'Take every thought captive and make it obedient to Christ.',
      [
        'Take every thought captive and make it obedient to Christ.',
        'Put on the full armor of God.',
        'Focus on what is true, noble, right, pure, lovely, and admirable.',
      ],
      '2 Corinthians 10:5 · Ephesians 6:10-18 · Philippians 4:8',
    ),
    chamber(
      'The Full Armor of God',
      'Be strong in the Lord and in the strength of His might.',
      [
        'Be strong in the Lord and in the strength of His might.',
        'Put on the whole armor of God, that you may be able to stand against the schemes of the devil.',
        'Stand therefore, having fastened on the belt of truth, and having put on the breastplate of righteousness, and as shoes for your feet, having put on the readiness given by the gospel of peace.',
        'In all circumstances take up the shield of faith, with which you can extinguish all the flaming darts of the evil one; and take the helmet of salvation, and the sword of the Spirit, which is the word of God, praying at all times in the Spirit.',
      ],
      'Ephesians 6:10-18',
    ),
    chamber(
      'Hope of Glory',
      'The sufferings of this present time are not worth comparing with the glory that is to be revealed to us.',
      [
        'The sufferings of this present time are not worth comparing with the glory that is to be revealed to us.',
        'We wait for our blessed hope, the appearing of the glory of our great God and Savior Jesus Christ.',
        'Behold, the dwelling place of God is with man… He will wipe away every tear from their eyes.',
        'Behold, I am coming soon, bringing My recompense with Me, to repay each one for what he has done.',
        'Blessed is the one who remains steadfast under trial, for when he has stood the test he will receive the crown of life.',
        'There is laid up for me the crown of righteousness, which the Lord will award on that day.',
        'When the Chief Shepherd appears, you will receive the unfading crown of glory.',
      ],
      'Romans 8:18 · Titus 2:13 · Revelation 21:3-4 · Revelation 22:12 · James 1:12 · 2 Timothy 4:8 · 1 Peter 5:4',
    ),
    chamber(
      'The Righteous Fall',
      'The righteous man falls seven times and rises again.',
      [
        'The righteous man falls seven times and rises again.',
        'All have sinned and fall short of the glory of God.',
        'If we say we have no sin, we deceive ourselves, and the truth is not in us.',
        'There is none righteous, no, not one.',
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
  c.related = RELATED[c.id] ?? []
}

// Validate verse parse coverage + related ids
let totalVerses = 0
const ids = new Set(document.chambers.map((c) => c.id))
for (const c of document.chambers) {
  totalVerses += c.verses.length
  if (c.verses.length === 0) {
    console.error('No verses for chamber:', c.title)
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
console.log(
  `Wrote ${document.chambers.length} chambers, ${totalVerses} verse refs, ${withHacks} with hacks, ${withPrayers} with prayers → ${out}`,
)
