import { describe, expect, it } from 'vitest'
import {
  buildDoorShare,
  buildOriginShare,
  buildPathShare,
  buildStationShare,
  buildTestimonyPoemShare,
  facebookShareUrl,
  layerLabel,
  ogImageUrl,
  xIntentUrl,
} from './share'
import { SITE_ORIGIN } from './seo'

describe('share payloads', () => {
  it('station share uses canonical /c/ url and station og', () => {
    const p = buildStationShare({
      chamberId: 'wounded',
      title: 'Wounded',
      summary: 'You were harmed.',
    })
    expect(p.layer).toBe('station')
    expect(p.url).toBe(`${SITE_ORIGIN}/c/wounded`)
    expect(p.ogImage).toMatch(/\/og\/c\/wounded\.v\d+\.png$/)
  })

  it('Master the Flesh share uses public slug URL, stable og id', () => {
    const p = buildStationShare({
      chamberId: 'kill-the-flesh',
      title: 'Master the Flesh',
      summary: 'You’re in a fight.',
    })
    expect(p.url).toBe(`${SITE_ORIGIN}/c/master-the-flesh`)
    expect(p.ogImage).toMatch(/\/og\/c\/kill-the-flesh\.v\d+\.png$/)
  })

  it('rubric chamber is standard layer', () => {
    const p = buildStationShare({
      chamberId: 'kill-the-flesh-walk-in-the-spirit',
      title: 'Kill the Flesh. Walk in the Spirit.',
      summary: 'Steel under fire.',
      kind: 'rubric',
    })
    expect(p.layer).toBe('standard')
    expect(layerLabel(p.layer)).toBe('Standard')
  })

  it('stance chamber is stance layer', () => {
    const p = buildStationShare({
      chamberId: 'the-line',
      title: 'The Line',
      summary: 'My emotional state is my own. Presence without control. Love keeps no record.',
      kind: 'stance',
    })
    expect(p.layer).toBe('stance')
    expect(layerLabel(p.layer)).toBe('Stance')
    expect(p.title).toContain('Bedrock Stance')
    expect(p.url).toBe(`${SITE_ORIGIN}/c/the-line`)
    expect(p.ogImage).toMatch(/\/og\/c\/the-line\.v\d+\.png$/)
  })

  it('your-side-of-the-street is stance layer', () => {
    const p = buildStationShare({
      chamberId: 'your-side-of-the-street',
      title: 'Your Side of the Street',
      summary: 'Your life. Love is the way. Change the mission.',
      kind: 'stance',
    })
    expect(p.layer).toBe('stance')
    expect(p.title).toContain('Bedrock Stance')
    expect(p.url).toBe(`${SITE_ORIGIN}/c/your-side-of-the-street`)
  })

  it('lock chamber is lock layer', () => {
    const p = buildStationShare({
      chamberId: 'pain-interrupt',
      title: 'Pain Interrupt',
      summary: 'Notice it. My emotional state is my own. Return to what is in front of me.',
      kind: 'lock',
    })
    expect(p.layer).toBe('lock')
    expect(layerLabel(p.layer)).toBe('Lock')
    expect(p.title).toContain('Bedrock Lock')
    expect(p.url).toBe(`${SITE_ORIGIN}/c/pain-interrupt`)
    expect(p.ogImage).toMatch(/\/og\/c\/pain-interrupt\.v\d+\.png$/)
  })

  it('path share uses canonical /j/ url and path og', () => {
    const p = buildPathShare({
      journeyId: 'battlefield-of-the-mind',
      title: 'Battlefield of the mind',
      summary: 'The war is often inside.',
    })
    expect(p.layer).toBe('path')
    expect(p.url).toBe(`${SITE_ORIGIN}/j/battlefield-of-the-mind`)
    expect(p.ogImage).toMatch(/\/og\/j\/battlefield-of-the-mind\.v\d+\.png$/)
  })

  it('door share uses canonical /k/ url and door og', () => {
    const p = buildDoorShare({
      keyId: 'key-wounded',
      label: 'Wounded',
      hint: 'I was hurt',
      chamberId: 'wounded',
      journeyId: 'marriage-shaken',
    })
    expect(p.layer).toBe('door')
    expect(p.layerLabel).toBe('Key')
    expect(p.url).toBe(`${SITE_ORIGIN}/k/key-wounded`)
    expect(p.ogImage).toMatch(/\/og\/k\/key-wounded\.v\d+\.png$/)
  })

  it('origin share uses /about and origin og (heart of Bedrock)', () => {
    const p = buildOriginShare({
      title: 'Bedrock',
      tagline: "A Hitchhiker's Guide to Love · Living · Enduring",
      motto: 'Do Better. Be Better. Trust God.',
      heart: 'Through the fire He was always with me.',
    })
    expect(p.layer).toBe('origin')
    expect(p.layerLabel).toBe('Origin')
    expect(p.url).toBe(`${SITE_ORIGIN}/about`)
    expect(p.ogImage).toBe(`${SITE_ORIGIN}/og/origin.png`)
    expect(p.shareLine).toContain('Through the fire')
  })

  it('testimony poem share uses tall poem PNG — never About origin OG', () => {
    const lines = [
      'I made a grave error.',
      'Travesty has beset me.',
      'that we are forgiven, restored, and saved.',
    ]
    const p = buildTestimonyPoemShare({ title: 'Backstory', lines })
    expect(p.layer).toBe('testimony')
    expect(p.layerLabel).toBe('Sealed word')
    expect(p.lines).toEqual(lines)
    expect(p.url).toBe(`${SITE_ORIGIN}/about`)
    expect(p.ogImage).toBe(`${SITE_ORIGIN}/og/testimony-poem.png`)
    expect(p.ogImage).not.toContain('origin.png')
    expect(p.shareLine).toContain('I made a grave error.')
    expect(p.shareLine).toContain('forgiven, restored, and saved')
  })

  it('x and facebook intents encode url', () => {
    const p = buildStationShare({
      chamberId: 'peace',
      title: 'Peace',
      summary: 'Spirit fruit.',
    })
    expect(xIntentUrl(p)).toContain('twitter.com/intent/tweet')
    expect(xIntentUrl(p)).toContain(encodeURIComponent(p.url).slice(0, 20))
    expect(facebookShareUrl(p)).toContain('facebook.com/sharer')
    expect(ogImageUrl({ layer: 'door', id: 'key-god' })).toMatch(/\/og\/k\/key-god\.v\d+\.png$/)
  })
})

describe('share filename helper', () => {
  it('builds a stable png name', async () => {
    const { shareFilename } = await import('./capture-share-image')
    const p = buildStationShare({
      chamberId: 'wounded',
      title: 'Wounded',
      summary: 'You were harmed.',
    })
    expect(shareFilename(p)).toMatch(/^bedrock-station-wounded.*\.png$/)
  })
})
