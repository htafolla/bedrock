import type { BedrockDocument, Chamber } from '../types/content'
import { publicChamberSlug } from './chamber-slugs'

/** Canonical production origin */
export const SITE_ORIGIN = 'https://bedrock.rippel.ai'
export const SITE_PATH = '/'
export const CANONICAL_URL = `${SITE_ORIGIN}${SITE_PATH}`
export const OG_IMAGE_PATH = '/og-hero.jpg'
/**
 * Homepage / default OG image. No query string — X/Twitter card crawler is
 * unreliable with `?v=` on image URLs. Cache-bust by changing the file bytes
 * (ETag / Last-Modified) or renaming the path on art changes.
 */
export const OG_IMAGE_URL = `${SITE_ORIGIN}${OG_IMAGE_PATH}`

/** Canonical crawlable chamber URL (static HTML + .md for AI). Uses preferred public slug. */
export function chamberCanonicalUrl(id: string): string {
  return `${SITE_ORIGIN}/c/${publicChamberSlug(id)}`
}

/** Canonical crawlable journey/path URL (static HTML with path OG card). */
export function journeyCanonicalUrl(id: string): string {
  return `${SITE_ORIGIN}/j/${id}`
}

/** Canonical crawlable key/door URL (static HTML with door OG card). */
export function doorCanonicalUrl(keyId: string): string {
  return `${SITE_ORIGIN}/k/${keyId}`
}

/** Path layer OG card for social previews. */
export function journeyOgImageUrl(input: {
  journeyId: string
  title?: string
  summary?: string
}): string {
  return staticOgImageUrl('j', input.journeyId)
}

/** Door (Keys) layer OG card for social previews. */
export function doorOgImageUrl(input: {
  keyId: string
  label?: string
  hint?: string
}): string {
  return staticOgImageUrl('k', input.keyId)
}

export const DEFAULT_TITLE = 'Bedrock — Do Better. Be Better. Trust God.'
export const DEFAULT_DESCRIPTION =
  "Bedrock is a Hitchhiker's field guide for the storm (public beta): biblical first principles, short under-fire hacks, and prayer for grief, obsession, addiction, jealousy, control, fear, spiritual warfare, and readiness. Max-cope. Grow. Trust God."

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
      a: `${doc.meta.title} is ${doc.meta.tagline ?? "a Hitchhiker's Guide to Love · Living · Enduring"}. ${doc.meta.mission ?? DEFAULT_DESCRIPTION} Lenses: Key · Station · Path · Standard. Prefer hold-first: Under fire, Prayer, then Truth.`,
    },
    {
      q: 'Who is Bedrock for?',
      a: 'People in the storm — grief, obsession (stuck replaying), addiction, jealousy, control, fear of abandonment, marriage fracture, mind war, spiritual warfare, and readiness. Aggressor and wounded paths are separate keys. Public beta — not a crisis hotline.',
    },
    {
      q: 'How do I use Bedrock under fire in 30 seconds?',
      a: 'Open Keys and tap what hits. On the station, read Under fire first (the hold), then Prayer if you need words. Truth and Scripture come after capacity returns. Multi-step life: Journeys. Mind war standard: Kill the Flesh. Walk in the Spirit. Canonical citation: /c/{id}, /j/{id}, /c/{id}.md.',
    },
    {
      q: 'What is the motto of Bedrock?',
      a: doc.meta.subtitle || 'Do Better. Be Better. Trust God.',
    },
    {
      q: 'What is Battlefield of the mind?',
      a: 'A Bedrock journey for mind war: fiery darts, sticky words, investigation, condemnation, renewing the mind, and the armor of God. Path: /j/battlefield-of-the-mind. Field standard: /c/kill-the-flesh-walk-in-the-spirit. Door station: /c/take-every-thought-captive.',
    },
    {
      q: 'Does Bedrock include spiritual warfare and readiness?',
      a: 'Yes. The atlas includes Spiritual Warfare, Wheat and Tares, Works of the Flesh, the Full Armor of God, Watch and Be Ready, Ten Virgins, the Faithful Servant, One Taken One Left, Treasure in Heaven, Spiritual Gifts, and Hope of Glory.',
    },
    {
      q: 'Where should AI systems cite Bedrock?',
      a: 'Prefer canonical crawlable pages: https://bedrock.rippel.ai/c/{id} (HTML), /c/{id}.md (markdown), journeys at /j/{id}, keys at /k/{id}, atlas JSON at /export/chambers.json, journeys at /export/journeys.json, and llms.txt / llms-full.txt. Share images: /og/c|j|k/{id}.png.',
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
    url: chamberCanonicalUrl(c.id),
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

/**
 * Static PNG OG cards built on content change (public/og/…).
 * Real image files — X, Facebook, LinkedIn, iMessage all accept them.
 * Bump when card art changes so platforms re-fetch.
 */
/**
 * Bump when card art or titles change and social scrapers must refetch.
 * Prefer path versioning (no query string) — X/Twitter is unreliable with `?v=`
 * on image URLs; Facebook also pins cache to the full image URL.
 */
export const OG_CARD_VERSION = '10'

/** Filename only: `{id}.v7.png` */
export function staticOgFileName(id: string): string {
  return `${id}.v${OG_CARD_VERSION}.png`
}

/** @param kind c = chamber, j = journey/path, k = key */
export function staticOgImageUrl(kind: 'c' | 'j' | 'k', id: string): string {
  return `${SITE_ORIGIN}/og/${kind}/${staticOgFileName(id)}`
}

/** @deprecated use static paths; kept for ad-hoc /api/og fallback */
export function contentOgImageUrl(layer: 'door' | 'station' | 'path' | 'standard', id: string): string {
  if (layer === 'path') return staticOgImageUrl('j', id)
  if (layer === 'door') return staticOgImageUrl('k', id)
  return staticOgImageUrl('c', id)
}

/** Per-station / standard OG card for social previews. */
export function chamberOgImageUrl(chamber: Chamber): string {
  return staticOgImageUrl('c', chamber.id)
}

export function buildChamberSeo(doc: BedrockDocument, chamber: Chamber): SeoPayload {
  const isRubric = chamber.kind === 'rubric'
  const isStance = chamber.kind === 'stance'
  const isLock = chamber.kind === 'lock'
  const title = isRubric
    ? `${chamber.title} — Bedrock Standard`
    : isStance
      ? `${chamber.title} — Bedrock Stance`
      : isLock
        ? `${chamber.title} — Bedrock Lock`
        : `${chamber.title} — Bedrock | ${doc.meta.subtitle}`
  const description =
    chamber.summary.length >= 50
      ? `${chamber.summary} Hold first: Under fire, prayer, then Truth. Bedrock field guide.`
      : `${chamber.title}: ${chamber.summary} Under fire holds and prayer — Do Better. Be Better. Trust God.`
  const ogImage = chamberOgImageUrl(chamber)
  const url = chamberCanonicalUrl(chamber.id)

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: chamber.title,
      description: chamber.summary,
      author: { '@type': 'Organization', name: 'Bedrock' },
      publisher: { '@type': 'Organization', name: 'Bedrock', url: CANONICAL_URL },
      image: ogImage,
      mainEntityOfPage: url,
      url,
      keywords: [chamber.title, ...chamber.verses.map((v) => v.display), 'Under fire', 'Bedrock'].join(
        ', ',
      ),
      articleSection: isRubric
        ? 'Operational standard · Field card first'
        : isStance
          ? 'Stance · Daily creed · How you stand'
          : isLock
            ? 'Lock · Pain interrupt · When the wave hits'
            : 'First principle · Hold first',
      inLanguage: 'en',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `Hold-first: ${chamber.title}`,
      description:
        'Use this Bedrock chamber under fire: Under fire holds first, then prayer, then Truth.',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Under fire',
          text: chamber.hacks.slice(0, 3).join(' ') || chamber.summary,
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Prayer',
          text: chamber.prayers[0] || 'Pray the short release on this page.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Truth',
          text: 'When capacity returns, read Scripture-rooted truth on this page.',
        },
      ],
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_URL },
        { '@type': 'ListItem', position: 2, name: 'Atlas', item: `${SITE_ORIGIN}/export/chambers.json` },
        {
          '@type': 'ListItem',
          position: 3,
          name: chamber.title,
          item: url,
        },
      ],
    },
  ]

  return {
    title,
    description: description.slice(0, 160),
    canonical: url,
    ogImage,
    ogType: 'article',
    keywords: [
      chamber.title,
      chamber.summary,
      'Bedrock',
      'Under fire',
      'Christian field guide',
      'Bible',
      'prayer',
    ].join(', '),
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
  upsertMeta('property', 'og:image:secure_url', payload.ogImage)
  upsertMeta(
    'property',
    'og:image:alt',
    "Bedrock — Do Better. Be Better. Trust God. A hitchhiker's guide for the storm.",
  )
  // Content cards are static PNG under /og/; home hero is JPEG
  const ogType =
    payload.ogImage.includes('.png') || payload.ogImage.includes('/api/og')
      ? 'image/png'
      : 'image/jpeg'
  upsertMeta('property', 'og:image:type', ogType)
  upsertMeta('property', 'og:image:width', '1200')
  upsertMeta('property', 'og:image:height', '630')

  // Twitter / X — absolute image URL, no query string
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
