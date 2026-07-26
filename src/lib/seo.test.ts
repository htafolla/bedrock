import { describe, expect, it, vi, afterEach } from 'vitest'
import documentData from '../content/bedrock.json'
import type { BedrockDocument } from '../types/content'
import {
  buildChamberSeo,
  buildDefaultSeo,
  buildFaqEntities,
  CANONICAL_URL,
  DEFAULT_TITLE,
  OG_IMAGE_URL,
  applySeo,
} from './seo'

const doc = documentData as BedrockDocument

describe('seo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds default site SEO with FAQ and ItemList for AEO', () => {
    const seo = buildDefaultSeo(doc)
    expect(seo.title).toBe(DEFAULT_TITLE)
    expect(seo.description.length).toBeGreaterThan(40)
    expect(seo.canonical).toBe(CANONICAL_URL)
    expect(seo.ogImage).toBe(OG_IMAGE_URL)
    expect(seo.jsonLd.some((b) => b['@type'] === 'WebSite')).toBe(true)
    expect(seo.jsonLd.some((b) => b['@type'] === 'FAQPage')).toBe(true)
    expect(seo.jsonLd.some((b) => b['@type'] === 'ItemList')).toBe(true)
    const list = seo.jsonLd.find((b) => b['@type'] === 'ItemList') as {
      numberOfItems: number
    }
    expect(list.numberOfItems).toBe(doc.chambers.length)
  })

  it('builds chamber article SEO', () => {
    const c = doc.chambers.find((x) => x.id === 'spiritual-warfare')!
    const seo = buildChamberSeo(doc, c)
    expect(seo.title).toContain('Spiritual Warfare')
    expect(seo.ogType).toBe('article')
    expect(seo.canonical).toContain('#spiritual-warfare')
    expect(seo.jsonLd.some((b) => b['@type'] === 'Article')).toBe(true)
  })

  it('FAQ covers product intent questions', () => {
    const faqs = buildFaqEntities(doc)
    expect(faqs.length).toBeGreaterThanOrEqual(4)
    expect(faqs.some((f) => /what is bedrock/i.test(f.q))).toBe(true)
    expect(faqs.some((f) => /warfare|ready/i.test(f.a))).toBe(true)
  })

  it('applySeo sets document title and JSON-LD', () => {
    const scripts: Array<{ type: string; text: string; attr: Record<string, string> }> = []
    const metas = new Map<string, string>()
    const head = {
      querySelector: (sel: string) => {
        if (sel.startsWith('meta[')) return null
        if (sel.startsWith('link[')) return null
        if (sel.startsWith('script[')) return null
        return null
      },
      querySelectorAll: () => [],
      appendChild: (el: {
        type?: string
        textContent?: string
        setAttribute: (k: string, v: string) => void
        getAttribute?: (k: string) => string | null
      }) => {
        if (el.type === 'application/ld+json') {
          scripts.push({
            type: el.type,
            text: el.textContent ?? '',
            attr: {},
          })
        }
      },
    }
    vi.stubGlobal('document', {
      title: '',
      head,
      createElement: (tag: string) => {
        const attrs: Record<string, string> = {}
        return {
          type: '',
          textContent: '',
          setAttribute: (k: string, v: string) => {
            attrs[k] = v
            if (tag === 'meta' && (k === 'name' || k === 'property')) {
              // content set separately
            }
            if (tag === 'meta' && k === 'content') {
              const key = attrs.name || attrs.property
              if (key) metas.set(key, v)
            }
          },
          getAttribute: (k: string) => attrs[k] ?? null,
        }
      },
    })

    applySeo(buildDefaultSeo(doc))
    expect(document.title).toBe(DEFAULT_TITLE)
    expect(scripts.length).toBeGreaterThanOrEqual(3)
    expect(scripts[0].text).toContain('WebSite')
  })
})
