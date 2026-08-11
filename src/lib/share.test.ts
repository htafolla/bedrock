import { describe, expect, it } from 'vitest'
import {
  buildDoorShare,
  buildOriginShare,
  buildPathShare,
  buildStationShare,
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
    expect(p.ogImage).toContain('/og/c/wounded.png')
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

  it('path share uses canonical /j/ url and path og', () => {
    const p = buildPathShare({
      journeyId: 'battlefield-of-the-mind',
      title: 'Battlefield of the mind',
      summary: 'The war is often inside.',
    })
    expect(p.layer).toBe('path')
    expect(p.url).toBe(`${SITE_ORIGIN}/j/battlefield-of-the-mind`)
    expect(p.ogImage).toContain('/og/j/battlefield-of-the-mind.png')
  })

  it('door share uses canonical /k/ url and door og', () => {
    const p = buildDoorShare({
      keyId: 'key-wounded',
      label: 'Wounded',
      hint: 'I was hurt',
      chamberId: 'wounded',
      journeyId: 'spouse-left',
    })
    expect(p.layer).toBe('door')
    expect(p.layerLabel).toBe('Key')
    expect(p.url).toBe(`${SITE_ORIGIN}/k/key-wounded`)
    expect(p.ogImage).toContain('/og/k/key-wounded.png')
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

  it('x and facebook intents encode url', () => {
    const p = buildStationShare({
      chamberId: 'peace',
      title: 'Peace',
      summary: 'Spirit fruit.',
    })
    expect(xIntentUrl(p)).toContain('twitter.com/intent/tweet')
    expect(xIntentUrl(p)).toContain(encodeURIComponent(p.url).slice(0, 20))
    expect(facebookShareUrl(p)).toContain('facebook.com/sharer')
    expect(ogImageUrl({ layer: 'door', id: 'key-god' })).toContain('/og/k/key-god.png')
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
