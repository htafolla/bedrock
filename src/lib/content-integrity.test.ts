import { describe, expect, it } from 'vitest'
import document from '../content/bedrock.json'
import journeysDoc from '../content/journeys.json'
import { SPINE_ORDER } from './spine'
import { KEY_ENTRIES } from './key-entries'
import { listJourneys } from './journeys'

const FRUIT = [
  'love',
  'joy',
  'peace',
  'patience',
  'kindness',
  'goodness',
  'faithfulness',
  'gentleness',
  'self-control',
] as const

describe('bedrock content integrity', () => {
  const chambers = document.chambers
  const byId = new Map(chambers.map((c) => [c.id, c]))

  it('ships the full atlas (storm + fruit + war + flesh + readiness + practice + glory)', () => {
    expect(chambers.length).toBe(83)
    expect(new Set(chambers.map((c) => c.id)).size).toBe(83)
    // Full Standard (rubric) — former card restored
    expect(byId.has('kill-the-flesh-walk-in-the-spirit')).toBe(true)
    expect(byId.get('kill-the-flesh-walk-in-the-spirit')!.title).toMatch(/Kill the Flesh\. Walk in the Spirit/i)
    expect(byId.get('kill-the-flesh-walk-in-the-spirit')!.kind).toBe('rubric')
    expect(byId.get('kill-the-flesh-walk-in-the-spirit')!.hacks.join(' ').toLowerCase()).toMatch(
      /stop the thought|do your part|spirit, not outcomes|one free step/,
    )
    const rubric = byId.get('kill-the-flesh-walk-in-the-spirit')!
    expect(rubric.body.length).toBeGreaterThan(8)
    expect(rubric.body.some((b) => b.type === 'heading')).toBe(true)
    expect(rubric.body.some((b) => b.type === 'list')).toBe(true)
    const rubricText = rubric.body
      .map((b) => {
        if (b.type === 'list' && Array.isArray(b.items)) return b.items.join(' ')
        if ('text' in b && typeof b.text === 'string') return b.text
        return ''
      })
      .join(' ')
      .toLowerCase()
    expect(rubricText).toMatch(/thought capture|do your part|forgiveness|trust over understanding/)
    expect(rubricText).toMatch(/field card/)
    expect(rubricText).toMatch(/building a case|detective of every gap/)
    expect(rubricText).toMatch(/refuse condemnation|no condemnation|accuser/)
    expect(rubricText).toMatch(/battlefield of the mind|fiery darts|harsh words/)
    expect(rubricText).not.toMatch(/investigation mode|condemnation mode/)
    expect(rubricText).toMatch(/for men/)
    expect(rubricText).toMatch(/release this to you|sound mind/)
    // Station form like god-first / jealousy — not a custom SOP layout
    expect(byId.has('kill-the-flesh')).toBe(true)
    expect(byId.get('kill-the-flesh')!.title).toBe('Master the Flesh')
    expect(byId.get('kill-the-flesh')!.kind ?? 'chamber').toBe('chamber')
    const killCard = byId.get('kill-the-flesh')!
    expect(killCard.summary.toLowerCase()).toMatch(/you're in a fight|the urge is real|out of control/)
    expect(killCard.summary.toLowerCase()).toMatch(/master the flesh/)
    // Same Under fire chrome as god-first: default hint + flat hold cards only
    expect(killCard.underFireIntro).toBeUndefined()
    expect(killCard.hacks.length).toBeGreaterThan(0)
    expect(killCard.hacks.length).toBeLessThanOrEqual(3)
    expect(killCard.hacks.join(' ').toLowerCase()).toMatch(
      /fear \(the flesh\)|self-less|protect|honor god|capture|other path/,
    )
    // Truth: short lead lines + inner lists for filters / steps / tools
    expect(killCard.body.some((b) => b.type === 'list')).toBe(true)
    expect(killCard.body.filter((b) => b.type === 'list').length).toBeGreaterThanOrEqual(3)
    const killText = killCard.body
      .map((b) => {
        if (b.type === 'list' && Array.isArray(b.items)) return b.items.join(' ')
        if ('text' in b && typeof b.text === 'string') return b.text
        return ''
      })
      .join(' ')
      .toLowerCase()
    expect(killText).toMatch(/self-less|protect|honor god/)
    expect(killText).toMatch(/capture|christ|other path/)
    expect(killText).toMatch(/emotional state is my own|3-2-1|exhale/)
    expect(killCard.verses.length).toBeGreaterThanOrEqual(10)
    expect(killCard.verses.map((v) => v.display).join(' ')).toMatch(/James 1:19/)
    expect(killCard.illustration?.src).toMatch(/kill-the-flesh-pow/)
    expect(killCard.related).toContain('kill-the-flesh-walk-in-the-spirit')
    expect(killCard.related).toContain('presence-without-control')
    // Truth closer must deep-link to the Standard (not plain text)
    expect(
      killCard.body.some(
        (b) =>
          b.type === 'paragraph' &&
          /chamber:kill-the-flesh-walk-in-the-spirit/i.test(b.text) &&
          /Kill the Flesh\. Walk in the Spirit/i.test(b.text),
      ),
    ).toBe(true)
    expect(rubric.related).toContain('kill-the-flesh')
    // Presence Without Control — same station form as god-first (Truth = paragraphs, not lists)
    expect(byId.has('presence-without-control')).toBe(true)
    const presence = byId.get('presence-without-control')!
    expect(presence.title).toBe('Presence Without Control')
    expect(presence.kind ?? 'chamber').toBe('chamber')
    expect(presence.illustration).toBeUndefined()
    expect(presence.hacks.length).toBeGreaterThan(0)
    expect(presence.hacks.length).toBeLessThanOrEqual(3)
    expect(presence.hacks.join(' ').toLowerCase()).toMatch(/relax|present|control|hook|captive/)
    expect(presence.body.every((b) => b.type === 'paragraph')).toBe(true)
    expect(presence.body.some((b) => b.type === 'list')).toBe(false)
    expect(presence.verses.map((v) => v.display).join(' ')).toMatch(
      /Psalm 46:10|James 1:19|Philippians 4:6|Matthew 6:34|Proverbs 3:5/,
    )
    expect(presence.related).toContain('kill-the-flesh')
    expect(presence.related).toContain('control')
    expect(presence.related).toContain('the-line')
    expect(presence.related).toContain('pain-interrupt')
    expect(
      presence.body.some(
        (b) =>
          b.type === 'paragraph' &&
          /chamber:the-line/i.test(b.text) &&
          /The Line/i.test(b.text),
      ),
    ).toBe(true)
    expect(
      presence.body.some(
        (b) =>
          b.type === 'paragraph' &&
          /chamber:pain-interrupt/i.test(b.text) &&
          /Pain Interrupt/i.test(b.text),
      ),
    ).toBe(true)
    // Stance — The Line (daily creed); Lock — Pain Interrupt (wave tool)
    expect(byId.has('the-line')).toBe(true)
    const theLine = byId.get('the-line')!
    expect(theLine.title).toBe('The Line')
    expect(theLine.kind).toBe('stance')
    expect(theLine.summary.toLowerCase()).toMatch(
      /emotional state is my own|presence without control|love keeps no record/,
    )
    expect(theLine.hacks).toEqual([
      'My emotional state is my own.',
      'Presence without control.',
      'Love keeps no record.',
    ])
    expect(theLine.prayers[0]?.toLowerCase()).toMatch(/state is my own|keep no record/)
    expect(theLine.body.every((b) => b.type === 'paragraph')).toBe(true)
    expect(theLine.related).toContain('pain-interrupt')
    expect(theLine.related).toContain('kill-the-flesh-walk-in-the-spirit')
    expect(theLine.related).toContain('kill-the-flesh')
    expect(theLine.related).toContain('presence-without-control')
    expect(theLine.related).toContain('control')
    expect(theLine.related).toContain('trust-in-the-lord')
    expect(theLine.related).toContain('fear')
    expect(byId.has('pain-interrupt')).toBe(true)
    const lock = byId.get('pain-interrupt')!
    expect(lock.title).toBe('Pain Interrupt')
    expect(lock.kind).toBe('lock')
    expect(lock.hacks).toEqual([
      'Notice it.',
      'My emotional state is my own.',
      'Return to what is in front of me.',
    ])
    expect(lock.prayers[0]?.toLowerCase()).toMatch(/notice|state is my own|in front/)
    expect(lock.body.every((b) => b.type === 'paragraph')).toBe(true)
    expect(lock.related).toContain('the-line')
    expect(lock.related).toContain('wounded')
    expect(lock.related).toContain('rumination')
    expect(byId.get('control')!.related).toContain('the-line')
    expect(byId.get('control')!.related).toContain('pain-interrupt')
    expect(byId.get('kill-the-flesh')!.related).toContain('the-line')
    expect(byId.get('kill-the-flesh-walk-in-the-spirit')!.related).toContain('the-line')
    // Stance — Your Side of the Street (sister to The Line)
    expect(byId.has('your-side-of-the-street')).toBe(true)
    const yourSide = byId.get('your-side-of-the-street')!
    expect(yourSide.title).toBe('Your Side of the Street')
    expect(yourSide.kind).toBe('stance')
    expect(yourSide.summary.toLowerCase()).toMatch(/during separation/)
    expect(yourSide.summary.toLowerCase()).toMatch(/their side of the street and you on yours/)
    expect(yourSide.summary.toLowerCase()).toMatch(/your life|love is the way|change the mission/)
    expect(yourSide.hacks).toEqual([
      'Their schedule, emotions, and decisions are not yours.',
      'Choose Love. Not Evil.',
      'Openly share without games.',
    ])
    expect(yourSide.prayers[0]?.toLowerCase()).toMatch(/where you have me now|walk in love/)
    expect(yourSide.body.filter((b) => b.type === 'heading').map((b) => ('text' in b ? b.text : ''))).toEqual([
      'The Word',
    ])
    expect(yourSide.body.every((b) => b.type === 'paragraph' || b.type === 'heading')).toBe(true)
    const yourSideBody = yourSide.body.map((b) => ('text' in b ? b.text : '')).join(' ').toLowerCase()
    expect(yourSideBody).not.toMatch(/during separation/)
    expect(yourSideBody).toMatch(/create a better you/)
    expect(yourSideBody).toMatch(/don’t bottle feelings/)
    expect(yourSideBody).toMatch(/do not cancel the other or require being used or abused/)
    expect(yourSideBody).toMatch(/good and bad moments are weather/)
    expect(yourSideBody).toMatch(/watch what is kept, not what is said/)
    expect(yourSideBody).not.toMatch(/winning them back/)
    expect(yourSideBody).not.toMatch(/their schedule, emotions, and decisions are not yours/)
    expect(yourSideBody).not.toMatch(/when the war is person/)
    expect(yourSideBody).not.toMatch(/pain interrupt/)
    const yourSideVerses = yourSide.verses.map((v) => v.display).join(' ')
    expect(yourSideVerses).toMatch(/Galatians 6:5/)
    expect(yourSideVerses).toMatch(/1 Thessalonians 4:11/)
    expect(yourSideVerses).toMatch(/Romans 14:12/)
    expect(yourSideVerses).toMatch(/Romans 12:18/)
    expect(yourSideVerses).toMatch(/Romans 12:9/)
    expect(yourSideVerses).toMatch(/Matthew 5:37/)
    expect(yourSideVerses).not.toMatch(/Matthew 7:3/)
    expect(yourSideVerses).not.toMatch(/Ephesians 4:25/)
    expect(yourSideVerses).not.toMatch(/2 Timothy 1:7/)
    expect(yourSideVerses).not.toMatch(/1 Corinthians 13/)
    expect(yourSideVerses).not.toMatch(/Galatians 6:4/)
    expect(yourSideBody).toMatch(/bear his own load/)
    expect(yourSideBody).toMatch(/mind your own affairs/)
    expect(yourSideBody).toMatch(/account of himself to god/)
    expect(yourSideBody).toMatch(/abhor what is evil/)
    expect(yourSideBody).toMatch(/yes” or “no/)
    expect(yourSideBody).not.toMatch(/brother/)
    expect(yourSideBody).not.toMatch(/neighbor/)
    expect(yourSideBody).not.toMatch(/wife|spouse|husband/)
    expect(yourSide.related).toContain('the-line')
    expect(yourSide.related).toContain('pain-interrupt')
    expect(theLine.related).toContain('your-side-of-the-street')
    expect(byId.get('wounded')!.related).toContain('pain-interrupt')
    expect(byId.get('control')!.kind ?? 'chamber').toBe('chamber')
    expect(byId.has('persecution')).toBe(true)
    expect(byId.get('persecution')!.title).toBe('Persecution')
    expect(byId.has('addiction')).toBe(true)
    expect(byId.get('addiction')!.title).toBe('Addiction')
    expect(byId.get('addiction')!.summary.toLowerCase()).toMatch(/master|spirit|flesh/)
    expect(byId.has('jealousy')).toBe(true)
    expect(byId.get('jealousy')!.title).toBe('Jealousy')
    expect(byId.get('jealousy')!.summary.toLowerCase()).toMatch(/control|love|spirit/)
    expect(byId.get('jealousy')!.hacks.length).toBeLessThanOrEqual(3)
    expect(byId.get('jealousy')!.hacks.join(' ').toLowerCase()).toMatch(/jealousy|envy|spirit/)
    expect(byId.has('control')).toBe(true)
    expect(byId.get('control')!.title).toBe('Control')
    expect(byId.get('control')!.related).toContain('trust-in-the-lord')
    expect(byId.has('holy-spirit')).toBe(true)
    expect(byId.get('holy-spirit')!.summary.toLowerCase()).toMatch(/helper|spirit of truth|jesus/)
    expect(byId.get('holy-spirit')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(
      /helper|spirit of truth|power|serpents|strongholds|gifts/,
    )
    expect(byId.get('take-every-thought-captive')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(
      /destroy strongholds|divine power|serpents/,
    )
    expect(byId.get('spiritual-warfare')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(
      /serpents|strongholds/,
    )
    expect(byId.has('the-word')).toBe(true)
    expect(byId.get('the-word')!.summary.toLowerCase()).toMatch(/lie|understand|word|simple|god/)
    expect(byId.get('the-word')!.hacks.join(' ').toLowerCase()).toMatch(/cannot understand|lie|word/)
    expect(byId.has('the-adversary')).toBe(true)
    // Application is Christ-centered (defeated foe); Truth body may quote Scripture that names him
    expect(byId.get('the-adversary')!.summary.toLowerCase()).toMatch(/christ|jesus|won|eyes|stand/)
    expect(byId.get('the-adversary')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(
      /devil|adversary|weeds|evil one|persecut|crush satan|resist/,
    )
    expect(byId.get('the-adversary')!.hacks.join(' ').toLowerCase()).toMatch(
      /jesus|christ|stand|word|fruit/,
    )
    // Never teach staring / fixating on the adversary in holds
    expect(byId.get('the-adversary')!.hacks.join(' ').toLowerCase()).not.toMatch(
      /stare|fixate|fascinat/,
    )
    expect(byId.has('spiritual-warfare')).toBe(true)
    expect(byId.has('works-of-the-flesh')).toBe(true)
    expect(byId.has('wheat-and-tares')).toBe(true)
    expect(byId.has('watch-and-be-ready')).toBe(true)
    expect(byId.has('ten-virgins')).toBe(true)
    expect(byId.has('the-faithful-servant')).toBe(true)
    expect(byId.has('one-taken-one-left')).toBe(true)
    expect(byId.has('treasure-in-heaven')).toBe(true)
    expect(byId.has('prayer')).toBe(true)
    expect(byId.has('fasting')).toBe(true)
    expect(byId.has('sabbath')).toBe(true)
    expect(byId.get('sabbath')!.summary.toLowerCase()).toMatch(/seventh|saturday|holy/)
    expect(byId.get('sabbath')!.hacks.join(' ').toLowerCase()).toMatch(/saturday|seventh/)
    expect(byId.get('sabbath')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(
      /sign between me and|sanctif/,
    )
    expect(byId.has('healing')).toBe(true)
    expect(byId.has('laying-on-of-hands')).toBe(true)
    expect(byId.has('spiritual-gifts')).toBe(true)
    expect(byId.get('spiritual-gifts')!.title).toMatch(/Gifts of the Spirit/i)
    expect(byId.has('hope-of-glory')).toBe(true)
    expect(byId.has('the-full-armor-of-god')).toBe(true)
  })

  it('idolatry and strengthened adultery ship as first-principle stations', () => {
    expect(byId.has('idolatry')).toBe(true)
    const idol = byId.get('idolatry')!
    expect(idol.title).toBe('Idolatry')
    expect(idol.kind ?? 'chamber').toBe('chamber')
    expect(idol.summary.toLowerCase()).toMatch(/idol|god|person|outcome/)
    expect(idol.hacks.length).toBeGreaterThan(0)
    expect(idol.hacks.length).toBeLessThanOrEqual(3)
    expect(idol.hacks.join(' ').toLowerCase()).toMatch(/idol|god first|tear/)
    expect(idol.body.every((b) => b.type === 'paragraph')).toBe(true)
    expect(idol.related).toEqual(
      expect.arrayContaining(['god-first', 'control', 'the-line', 'adultery', 'works-of-the-flesh']),
    )
    expect(idol.verses.map((v) => v.display).join(' ')).toMatch(
      /Exodus 20:3|1 John 5:21|Colossians 3:5/,
    )

    const adultery = byId.get('adultery')!
    expect(adultery.summary.toLowerCase()).toMatch(/lust|heart|flee/)
    expect(adultery.hacks.join(' ').toLowerCase()).toMatch(/lust|eyes|flee|confess/)
    expect(adultery.body.some((b) => /lustful intent|looks at a woman/i.test(b.text))).toBe(true)
    expect(adultery.related).toContain('idolatry')
    expect(adultery.verses.map((v) => v.display).join(' ')).toMatch(
      /Matthew 5:28|1 Corinthians 6:18|Job 31:1|2 Timothy 2:22/,
    )
  })

  it('war → enemy sows → works of the flesh → armor', () => {
    const war = byId.get('spiritual-warfare')
    const flesh = byId.get('works-of-the-flesh')
    const wheat = byId.get('wheat-and-tares')
    expect(war!.related).toContain('works-of-the-flesh')
    expect(war!.related).toContain('wheat-and-tares')
    expect(flesh!.related).toEqual(
      expect.arrayContaining([
        'adultery',
        'idolatry',
        'pharmakeia',
        'murder',
        'malice',
        'falsehood',
      ]),
    )
    const body = flesh!.body.map((b) => b.text).join(' ').toLowerCase()
    expect(body).toMatch(/will not inherit|kingdom/)
    const wheatBody = wheat!.body.map((b) => b.text).join(' ').toLowerCase()
    expect(wheatBody).toMatch(/enemy|weeds|wheat|harvest/)
    const w = SPINE_ORDER.indexOf('spiritual-warfare')
    const wt = SPINE_ORDER.indexOf('wheat-and-tares')
    const f = SPINE_ORDER.indexOf('works-of-the-flesh')
    const a = SPINE_ORDER.indexOf('the-full-armor-of-god')
    expect(w).toBeGreaterThanOrEqual(0)
    expect(wt).toBe(w + 1)
    // persecution sits between wheat-and-tares and works-of-the-flesh
    expect(f).toBe(wt + 2)
    expect(a).toBeGreaterThan(f)
  })

  it('readiness → treasure · prayer/fasting/sabbath/healing/hands · gifts → hope', () => {
    const watch = byId.get('watch-and-be-ready')
    expect(watch).toBeDefined()
    const body = watch!.body.map((b) => b.text).join(' ').toLowerCase()
    expect(body).toMatch(/watch|ready|beforehand|told/)
    expect(watch!.related).toEqual(
      expect.arrayContaining(['ten-virgins', 'the-faithful-servant', 'one-taken-one-left', 'hope-of-glory']),
    )
    const treasure = byId.get('treasure-in-heaven')
    const gifts = byId.get('spiritual-gifts')
    expect(treasure!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(/treasure|heaven/)
    expect(gifts!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(/gift|spirit|common good/)
    expect(treasure!.related).toContain('hope-of-glory')
    expect(gifts!.related).toContain('hope-of-glory')
    const w = SPINE_ORDER.indexOf('watch-and-be-ready')
    const t = SPINE_ORDER.indexOf('one-taken-one-left')
    const tr = SPINE_ORDER.indexOf('treasure-in-heaven')
    const p = SPINE_ORDER.indexOf('prayer')
    const f = SPINE_ORDER.indexOf('fasting')
    const s = SPINE_ORDER.indexOf('sabbath')
    const he = SPINE_ORDER.indexOf('healing')
    const hands = SPINE_ORDER.indexOf('laying-on-of-hands')
    const g = SPINE_ORDER.indexOf('spiritual-gifts')
    const h = SPINE_ORDER.indexOf('hope-of-glory')
    expect(t).toBe(w + 3)
    expect(tr).toBe(t + 1)
    expect(p).toBe(tr + 1)
    expect(f).toBe(p + 1)
    expect(s).toBe(f + 1)
    expect(he).toBe(s + 1)
    expect(hands).toBe(he + 1)
    expect(g).toBe(hands + 1)
    expect(h).toBe(g + 1)
    expect(byId.get('prayer')!.related).toContain('the-lords-prayer')
    expect(byId.get('healing')!.related).toContain('laying-on-of-hands')
    expect(byId.get('fasting')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(/fast/)
    expect(byId.get('sabbath')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(
      /sabbath|seventh day|holy/,
    )
    expect(byId.get('sabbath')!.related).toContain('god-first')
  })

  it('every chamber has truth, hacks (1–3), prayer, verses, related', () => {
    for (const c of chambers) {
      expect(c.body.length, c.id).toBeGreaterThan(0)
      expect(c.hacks.length, c.id).toBeGreaterThan(0)
      expect(c.hacks.length, `${c.id} Under fire max 3`).toBeLessThanOrEqual(3)
      expect(c.prayers.length, c.id).toBeGreaterThan(0)
      expect(c.verses.length, c.id).toBeGreaterThan(0)
      expect(Array.isArray(c.related), c.id).toBe(true)
    }
  })

  /**
   * Uniform design by content type — stops “looks like a different card” regressions.
   * - Default stations: Truth = paragraphs only (god-first / control / presence form)
   * - Battle station kill-the-flesh may use lead + lists (explicit allowlist)
   * - Standard (rubric) may use headings + lists
   * - Illustration is opt-in art, not a second layout system
   */
  it('stations use uniform Truth shape by kind (no accidental SOP bodies)', () => {
    /** @type {ReadonlySet<string>} */
    const stationListAllow = new Set(['kill-the-flesh'])
    /** Stance may mark the Word as a subhead when teaching and verses share Truth. */
    const stationHeadingAllow = new Set(['your-side-of-the-street'])
    for (const c of chambers) {
      const kind = c.kind ?? 'chamber'
      if (kind === 'rubric') {
        expect(c.body.some((b) => b.type === 'heading' || b.type === 'list'), c.id).toBe(true)
        continue
      }
      if (stationListAllow.has(c.id)) {
        expect(c.body.some((b) => b.type === 'list'), c.id).toBe(true)
        continue
      }
      if (stationHeadingAllow.has(c.id)) {
        expect(c.body.some((b) => b.type === 'heading'), c.id).toBe(true)
        for (const b of c.body) {
          expect(['paragraph', 'heading'], `${c.id} Truth block ${b.type}`).toContain(b.type)
        }
        continue
      }
      // Default station chrome: Scripture paragraphs only in Truth
      for (const b of c.body) {
        expect(b.type, `${c.id} Truth block must be paragraph (got ${b.type})`).toBe('paragraph')
      }
    }
  })

  it('does not repeat the summary as the first Truth line', () => {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
    for (const c of chambers) {
      const firstBlock = c.body.find(
        (b) => b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote',
      )
      const first =
        firstBlock && (firstBlock.type === 'paragraph' || firstBlock.type === 'heading' || firstBlock.type === 'quote')
          ? firstBlock.text
          : undefined
      expect(first, c.id).toBeTruthy()
      expect(normalize(first ?? ''), c.id).not.toBe(normalize(c.summary))
    }
  })

  it('related edges only point at real chambers', () => {
    for (const c of chambers) {
      for (const rid of c.related) {
        expect(byId.has(rid), `${c.id} → ${rid}`).toBe(true)
      }
    }
  })

  it('fruit of the Spirit chambers are complete and counterfeit-aware', () => {
    for (const id of FRUIT) {
      const c = byId.get(id)
      expect(c, id).toBeDefined()
      const text = c!.body.map((b) => b.text).join(' ')
      expect(text.toLowerCase()).toContain('fruit of the spirit')
      // Counterfeit / application lives Under fire — plain, not jargon labels
      expect(c!.hacks.length, id).toBeGreaterThan(0)
      expect(c!.hacks.join(' ').toLowerCase(), id).toMatch(
        /not love|not his|not masters|not kindness|not courage|not a door|not earned|not denial|keeping score|bitterness|contempt|checking again|true to myself|useful for my case|control/,
      )
      expect(c!.related).toContain('walk-by-the-spirit')
    }
  })

  it('hub fans out to all nine fruit', () => {
    const hub = byId.get('walk-by-the-spirit')
    expect(hub).toBeDefined()
    for (const id of FRUIT) {
      expect(hub!.related).toContain(id)
    }
  })

  it('aggressor and wounded are separate spines — no dual packing in one chamber', () => {
    const dualMarkers = [
      'if you sinned',
      'if you were wronged',
      'if the fracture was yours',
      'if the wound was not yours',
      'if you wounded',
      'if you were wounded',
      'aggressor:',
      'victim:',
    ]
    for (const c of chambers) {
      const blob = [...c.body.map((b) => b.text), ...c.hacks].join(' ').toLowerCase()
      for (const m of dualMarkers) {
        expect(blob.includes(m), `${c.id} must not dual-pack (${m})`).toBe(false)
      }
    }
    const regret = byId.get('regret')
    const wounded = byId.get('wounded')
    expect(regret).toBeDefined()
    expect(wounded).toBeDefined()
    // Regret path = repentance
    expect(regret!.body.map((b) => b.text).join(' ').toLowerCase()).toContain('godly grief')
    expect(regret!.hacks.join(' ').toLowerCase()).toContain('confess')
    // Wounded path = harm done to you
    expect(wounded!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(/brokenhearted|wounds|avenge|you are mine/)
    expect(wounded!.hacks.join(' ').toLowerCase()).toMatch(/harmed|hatred|repay|boundaries/)
    expect(regret!.related.includes('wounded')).toBe(false)
  })

  it('Obsession chamber is plain-named (id stays rumination)', () => {
    const c = byId.get('rumination')
    expect(c).toBeDefined()
    expect(c!.title).toBe('Obsession')
    expect(c!.summary.toLowerCase()).toMatch(/stuck|replay|loop|captive|mind/)
    expect(c!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(/thought captive|renewal of your mind/)
  })

  it('core journeys SSOT is 15 arcs and every station is a real chamber', () => {
    expect(journeysDoc.meta.count).toBe(15)
    expect(listJourneys()).toHaveLength(15)
    for (const j of listJourneys()) {
      expect(byId.has(j.doorChamberId), `missing door ${j.doorChamberId}`).toBe(true)
      for (const s of j.stages) {
        expect(byId.has(s.chamberId), `missing station ${j.id}/${s.chamberId}`).toBe(true)
      }
    }
  })

  it('etches critical healing axiom: peace not ruled by them (≤3 under-fire lines)', () => {
    // Plain form of “your emotional state is your own” — no coaching jargon.
    const axiom = /do not let their choices rule your peace|rule yourself, not them/i
    // Self-control is impulse mastery (enkrateia) — not this relational axiom.
    for (const id of ['control', 'he-is-for-you', 'wounded'] as const) {
      const c = byId.get(id)
      expect(c, id).toBeDefined()
      expect(c!.hacks.length).toBeLessThanOrEqual(3)
      expect(c!.hacks.join(' ')).toMatch(axiom)
    }
    const spouse = journeysDoc.journeys.find((j) => j.id === 'marriage-shaken')
    expect(spouse?.title).toBe('Marriage Shaken')
    expect(spouse?.doorChamberId).toBe('god-on-marriage')
    expect(spouse?.stages[0]?.chamberId).toBe('god-on-marriage')
    expect(spouse?.summary).toMatch(/do not let their choices rule your peace/i)
    expect(spouse?.stages.map((s) => s.chamberId)).toEqual([
      'god-on-marriage',
      'wounded',
      'he-is-for-you',
      'pain-interrupt',
      'rumination',
      'fear',
      'control',
      'leave-vengeance-to-the-lord',
      'do-not-repay-evil-with-evil',
      'marriage-covenant',
      'when-you-can-no-longer-stand',
      'the-line',
      'forgive-as-you-have-been-forgiven',
      'trust-in-the-lord',
      'kill-the-flesh-walk-in-the-spirit',
      'hope-of-glory',
    ])
    expect(byId.has('when-you-can-no-longer-stand')).toBe(true)
    const stand = byId.get('when-you-can-no-longer-stand')!
    expect(stand.title).toBe('When You Can No Longer Stand')
    expect(stand.summary.toLowerCase()).toMatch(/covenant|ease|stand/)
    expect(stand.hacks.join(' ').toLowerCase()).toMatch(/covenant|pray|guard/)
    expect(stand.prayers[0]?.toLowerCase()).toMatch(/stand firm|covenant/)
    expect(stand.related).toEqual(
      expect.arrayContaining([
        'count-the-trial-as-joy',
        'trust-in-the-lord',
        'god-on-marriage',
        'marriage-covenant',
        'the-line',
      ]),
    )
  })

  it('Truth stays verse-shaped — application lives in Under fire', () => {
    const ids = [
      'regret',
      'wounded',
      'loss',
      'rumination',
      'fear',
      'wait-on-the-lord',
      'trust-in-the-lord',
      ...FRUIT,
    ]
    for (const id of ids) {
      const c = byId.get(id)
      expect(c, id).toBeDefined()
      const body = c!.body.map((b) => b.text).join(' ').toLowerCase()
      expect(body.includes('flesh counterfeit'), id).toBe(false)
      expect(body.includes('if you caused the fracture'), id).toBe(false)
      expect(body.includes('if you wounded:'), id).toBe(false)
      expect(body.includes('if you were wounded:'), id).toBe(false)
      expect(body.includes('do better and be better'), id).toBe(false)
      expect(body.includes('under fire:'), id).toBe(false)
      expect(body.includes('name the impulse'), id).toBe(false)
      expect(c!.hacks.length, id).toBeGreaterThan(0)
    }
  })

  it('fruit Truth names the Spirit fruit and lists matching Scripture refs', () => {
    for (const id of FRUIT) {
      const c = byId.get(id)
      expect(c, id).toBeDefined()
      const body = c!.body.map((b) => b.text).join(' ').toLowerCase()
      expect(body).toContain('fruit of the spirit')
      expect(c!.verses.some((v) => v.display.toLowerCase().includes('galatians 5')), id).toBe(true)
      expect(c!.hacks.length, id).toBeGreaterThan(0)
    }
  })

  it('prayer temperance — short plain petitions, not war-orders', () => {
    for (const c of chambers) {
      const p = (c.prayers[0] ?? '').trim()
      expect(p.length, c.id).toBeGreaterThan(0)
      expect(p.length, c.id).toBeLessThanOrEqual(160)
      expect(p.endsWith('Amen.'), c.id).toBe(true)
      const lower = p.toLowerCase()
      // Wrong direction: commanding God into combat as the lead petition
      expect(lower.startsWith('lord, fight for me'), c.id).toBe(false)
      expect(lower.includes('living god —') || lower.includes('living god-'), c.id).toBe(false)
      // Classic address: Father / Lord / Jesus / Holy Spirit / Our Father
      expect(
        /^(father|lord|jesus|holy spirit|our father)/i.test(p),
        `${c.id} prayer address: ${p}`,
      ).toBe(true)
    }
  })

  it('spine order covers every chamber id', () => {
    for (const id of SPINE_ORDER) {
      expect(byId.has(id), id).toBe(true)
    }
    expect(SPINE_ORDER.length).toBe(chambers.length)
  })

  it('keys resolve into real chambers', () => {
    for (const k of KEY_ENTRIES) {
      expect(byId.has(k.chamberId), k.id).toBe(true)
    }
  })
})
