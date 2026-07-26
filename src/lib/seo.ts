import type { BedrockDocument, Chamber } from '../types/content'

/** Canonical production origin */
export const SITE_ORIGIN = 'https://bedrock.rippel.ai'
export const SITE_PATH = '/'
export const CANONICAL_URL = `${SITE_ORIGIN}${SITE_PATH}`
export const OG_IMAGE_PATH = '/og-hero.jpg'
/** Bump when og-hero changes so X/FB treat the image URL as new and re-fetch. */
export const OG_IMAGE_VERSION = '2'
export const OG_IMAGE_URL = `${SITE_ORIGIN}${OG_IMAGE_PATH}?v=${OG_IMAGE_VERSION}`

export const DEFAULT_TITLE = 'Bedrock — Do Better. Be Better. Trust God.'
export const DEFAULT_DESCRIPTION =
  "Bedrock is a Hitchhiker's field guide for the storm (public beta): biblical first principles, short under-fire hacks, and prayer for grief, obsession, addiction, jealousy, fear, spiritual warfare, and readiness. Max-cope. Grow. Trust God."

export interface SeoPayload {
  title: string
  description: string
  canonical: string
  ogImage: string
  ogType: 'website' | 'article'
  keywords: string
  jsonLd: Record<string, unknown>[]
}

function chamberKeywords(chambers: Chamber[]): string {
  const core = [
    'Bedrock',
    'Christian field guide',
    'spiritual warfare',
    'fruit of the Spirit',
    'Armor of God',
    'grief',
    'regret',
    'rumination',
    'fear',
    'hope of glory',
    'Bible',
    'prayer',
    'watch and be ready',
    'ten virgins',
    'works of the flesh',
    'Do Better Be Better Trust God',
  ]
  const titles = chambers.slice(0, 24).map((c) => c.title)
  return [...core, ...titles].join(', ')
}

/** FAQ pairs for AEO (answer engines + People Also Ask style). */
export function buildFaqEntities(doc: BedrockDocument): Array<{ q: string; a: string }> {
  return [
    {
      q: 'What is Bedrock?',
      a: `${doc.meta.title} is ${doc.meta.tagline ?? "a Hitchhiker's Guide to Love · Living · Enduring"}. ${doc.meta.mission ?? DEFAULT_DESCRIPTION}`,
    },
    {
      q: 'Who is Bedrock for?',
      a: 'People in the storm — grief, obsession (stuck replaying), regret, fear of abandonment, marriage fracture, spiritual warfare, and the need to stay ready. Aggressor and wounded paths are separate doors.',
    },
    {
      q: 'How do I use Bedrock?',
      a: 'Open Keys for storm triage, Map for the full DNA path of first principles, or Contents for the full list. Each chamber gives Truth (Scripture), Under fire (short reframes), Prayer, and related chambers.',
    },
    {
      q: 'What is the motto of Bedrock?',
      a: doc.meta.subtitle || 'Do Better. Be Better. Trust God.',
    },
    {
      q: 'Does Bedrock include spiritual warfare and readiness?',
      a: 'Yes. The atlas includes Spiritual Warfare, Wheat and Tares, Works of the Flesh, the Full Armor of God, Watch and Be Ready, Ten Virgins, the Faithful Servant, One Taken One Left, Treasure in Heaven, Spiritual Gifts, and Hope of Glory.',
    },
  ]
}

export function buildDefaultSeo(doc: BedrockDocument): SeoPayload {
  const faqs = buildFaqEntities(doc)
  const chamberList = doc.chambers.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.title,
    description: c.summary,
    url: `${CANONICAL_URL}#${c.id}`,
  }))

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: doc.meta.title,
      alternateName: doc.meta.workingTitle ?? undefined,
      url: CANONICAL_URL,
      description: doc.meta.mission ?? DEFAULT_DESCRIPTION,
      inLanguage: 'en',
      keywords: chamberKeywords(doc.chambers),
      publisher: {
        '@type': 'Organization',
        name: 'Bedrock',
        url: CANONICAL_URL,
        motto: doc.meta.subtitle,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: doc.meta.title,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: doc.meta.mission ?? DEFAULT_DESCRIPTION,
      url: CANONICAL_URL,
      image: OG_IMAGE_URL,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Bedrock first principles chambers',
      numberOfItems: doc.chambers.length,
      itemListElement: chamberList,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_URL },
        { '@type': 'ListItem', position: 2, name: 'Keys', item: `${CANONICAL_URL}#keys` },
        { '@type': 'ListItem', position: 3, name: 'Map', item: `${CANONICAL_URL}#map` },
        { '@type': 'ListItem', position: 4, name: 'Contents', item: `${CANONICAL_URL}#contents` },
      ],
    },
  ]

  return {
    title: DEFAULT_TITLE,
    description: doc.meta.mission ?? DEFAULT_DESCRIPTION,
    canonical: CANONICAL_URL,
    ogImage: OG_IMAGE_URL,
    ogType: 'website',
    keywords: chamberKeywords(doc.chambers),
    jsonLd,
  }
}

export function buildChamberSeo(doc: BedrockDocument, chamber: Chamber): SeoPayload {
  const title = `${chamber.title} — Bedrock | ${doc.meta.subtitle}`
  const description =
    chamber.summary.length >= 50
      ? `${chamber.summary} Scripture, under-fire hacks, and prayer in Bedrock.`
      : `${chamber.title}: ${chamber.summary} Truth, hacks, and prayer — Do Better. Be Better. Trust God.`

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: chamber.title,
      description: chamber.summary,
      author: { '@type': 'Organization', name: 'Bedrock' },
      publisher: { '@type': 'Organization', name: 'Bedrock', url: CANONICAL_URL },
      image: OG_IMAGE_URL,
      mainEntityOfPage: `${CANONICAL_URL}#${chamber.id}`,
      keywords: [chamber.title, ...chamber.verses.map((v) => v.display)].join(', '),
      articleSection: 'First principles',
      inLanguage: 'en',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_URL },
        { '@type': 'ListItem', position: 2, name: 'Map', item: `${CANONICAL_URL}#map` },
        {
          '@type': 'ListItem',
          position: 3,
          name: chamber.title,
          item: `${CANONICAL_URL}#${chamber.id}`,
        },
      ],
    },
  ]

  return {
    title,
    description: description.slice(0, 160),
    canonical: `${CANONICAL_URL}#${chamber.id}`,
    ogImage: OG_IMAGE_URL,
    ogType: 'article',
    keywords: [chamber.title, chamber.summary, 'Bedrock', 'Bible', 'prayer'].join(', '),
    jsonLd,
  }
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const JSON_LD_ATTR = 'data-bedrock-jsonld'

/** Apply SEO/AEO payload to document head (SPA-safe). */
export function applySeo(payload: SeoPayload): void {
  if (typeof document === 'undefined') return

  document.title = payload.title

  upsertMeta('name', 'description', payload.description)
  upsertMeta('name', 'keywords', payload.keywords)
  upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
  upsertMeta('name', 'googlebot', 'index, follow')
  upsertMeta('name', 'author', 'Bedrock')
  upsertMeta('name', 'theme-color', '#0c0a09')
  upsertMeta('name', 'color-scheme', 'dark')
  upsertMeta('name', 'application-name', 'Bedrock')
  upsertMeta('name', 'apple-mobile-web-app-title', 'Bedrock')
  upsertMeta('name', 'apple-mobile-web-app-capable', 'yes')
  upsertMeta('name', 'mobile-web-app-capable', 'yes')
  upsertMeta('name', 'format-detection', 'telephone=no')

  // Open Graph
  upsertMeta('property', 'og:site_name', 'Bedrock')
  upsertMeta('property', 'og:locale', 'en_US')
  upsertMeta('property', 'og:type', payload.ogType)
  upsertMeta('property', 'og:title', payload.title)
  upsertMeta('property', 'og:description', payload.description)
  upsertMeta('property', 'og:url', payload.canonical)
  upsertMeta('property', 'og:image', payload.ogImage)
  upsertMeta(
    'property',
    'og:image:alt',
    "Bedrock — Do Better. Be Better. Trust God. A hitchhiker's guide for the storm.",
  )
  upsertMeta('property', 'og:image:type', 'image/jpeg')
  upsertMeta('property', 'og:image:width', '1200')
  upsertMeta('property', 'og:image:height', '630')

  // Twitter / X
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', payload.title)
  upsertMeta('name', 'twitter:description', payload.description)
  upsertMeta('name', 'twitter:image', payload.ogImage)
  upsertMeta(
    'name',
    'twitter:image:alt',
    "Bedrock — Do Better. Be Better. Trust God. A hitchhiker's guide for the storm.",
  )

  // AI / answer-engine hints
  upsertMeta('name', 'ai-content-declaration', 'human-authored Christian field guide; first principles from Scripture')
  upsertMeta('name', 'subject', 'Christian spiritual formation, grief, spiritual warfare, readiness')

  upsertLink('canonical', payload.canonical.split('#')[0] ?? payload.canonical)

  // Replace JSON-LD blocks
  document.head.querySelectorAll(`script[${JSON_LD_ATTR}]`).forEach((n) => n.remove())
  for (const block of payload.jsonLd) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute(JSON_LD_ATTR, 'true')
    script.textContent = JSON.stringify(block)
    document.head.appendChild(script)
  }
}
