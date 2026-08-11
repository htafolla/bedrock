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
    expect(chambers.length).toBe(76)
    expect(new Set(chambers.map((c) => c.id)).size).toBe(76)
    expect(byId.has('kill-the-flesh-walk-in-the-spirit')).toBe(true)
    expect(byId.get('kill-the-flesh-walk-in-the-spirit')!.title).toMatch(/Kill the Flesh/i)
    expect(byId.get('kill-the-flesh-walk-in-the-spirit')!.kind).toBe('rubric')
    expect(byId.get('kill-the-flesh-walk-in-the-spirit')!.hacks.join(' ').toLowerCase()).toMatch(
      /capture the thought|case-hunt|accuser|condemnation/,
    )
    // Rubrics are denser SOP with structured headings/lists (not a wall of prose)
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
    expect(rubricText).toMatch(/case-hunt|permanent investigator/)
    expect(rubricText).toMatch(/refuse condemnation|no condemnation|accuser/)
    expect(rubricText).toMatch(/battlefield of the mind|sticky words|fiery darts/)
    expect(rubricText).not.toMatch(/investigation mode|condemnation mode/)
    expect(rubricText).toMatch(/for men/)
    expect(rubricText).toMatch(/release this to you|sound mind/)
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
    expect(byId.get('the-word')!.summary.toLowerCase()).toMatch(/enemy|understand|word|simple/)
    expect(byId.get('the-word')!.hacks.join(' ').toLowerCase()).toMatch(/cannot understand|enemy/)
    expect(byId.has('the-adversary')).toBe(true)
    expect(byId.get('the-adversary')!.summary.toLowerCase()).toMatch(/real|fixate|resist|stand/)
    expect(byId.get('the-adversary')!.body.map((b) => b.text).join(' ').toLowerCase()).toMatch(
      /devil|adversary|weeds|evil one|persecut/,
    )
    expect(byId.get('the-adversary')!.hacks.join(' ').toLowerCase()).toMatch(/fixate|fascinat|resist/)
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

  it('war → enemy sows → works of the flesh → armor', () => {
    const war = byId.get('spiritual-warfare')
    const flesh = byId.get('works-of-the-flesh')
    const wheat = byId.get('wheat-and-tares')
    expect(war!.related).toContain('works-of-the-flesh')
    expect(war!.related).toContain('wheat-and-tares')
    expect(flesh!.related).toEqual(
      expect.arrayContaining(['adultery', 'pharmakeia', 'murder', 'malice', 'falsehood']),
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
        /not love|not his|not masters|not kindness|not courage|not a door|not earned|not denial|scorekeeping|bitterness|contempt|check-again|true to myself|useful for my case|control/,
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
    for (const id of ['control', 'self-control', 'he-is-for-you', 'wounded'] as const) {
      const c = byId.get(id)
      expect(c, id).toBeDefined()
      expect(c!.hacks.length).toBeLessThanOrEqual(3)
      expect(c!.hacks.join(' ')).toMatch(axiom)
    }
    const spouse = journeysDoc.journeys.find((j) => j.id === 'spouse-left')
    expect(spouse?.summary).toMatch(/do not let their choices rule your peace/i)
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
