/**
 * Classify HTTP access for privacy-first traffic (no IP).
 * Used by server middleware — bots do not run JS pageview beacons.
 */

/** @typedef {'ai' | 'social' | 'search' | 'human' | 'other'} AccessClass */
/** @typedef {'chamber' | 'chamber_md' | 'journey' | 'key' | 'og' | 'export' | 'llms' | 'sitemap' | 'home' | 'about' | 'other'} AccessKind */

/**
 * Ordered bot patterns: first match wins.
 * @type {Array<{ class: AccessClass, name: string, re: RegExp }>}
 */
const BOT_PATTERNS = [
  // AI / LLM crawlers
  { class: 'ai', name: 'GPTBot', re: /GPTBot|ChatGPT-User|OAI-SearchBot/i },
  { class: 'ai', name: 'ClaudeBot', re: /ClaudeBot|anthropic-ai|Claude-Web/i },
  { class: 'ai', name: 'PerplexityBot', re: /PerplexityBot|Perplexity/i },
  { class: 'ai', name: 'Google-Extended', re: /Google-Extended|GoogleOther/i },
  { class: 'ai', name: 'Bytespider', re: /Bytespider|Bytedance/i },
  { class: 'ai', name: 'CCBot', re: /CCBot/i },
  { class: 'ai', name: 'Diffbot', re: /Diffbot/i },
  { class: 'ai', name: 'Amazonbot', re: /Amazonbot/i },
  { class: 'ai', name: 'meta-externalagent', re: /meta-externalagent|FacebookBot/i },
  { class: 'ai', name: 'cohere-ai', re: /cohere-ai|cohere-training/i },
  { class: 'ai', name: 'YouBot', re: /YouBot/i },
  { class: 'ai', name: 'AI2Bot', re: /AI2Bot|AI2-Bot/i },
  { class: 'ai', name: 'Applebot-Extended', re: /Applebot-Extended/i },
  { class: 'ai', name: 'omgili', re: /omgili|Webzio-Extended/i },
  { class: 'ai', name: 'ImagesiftBot', re: /ImagesiftBot/i },
  { class: 'ai', name: 'TimpiBot', re: /Timpibot|TimpiBot/i },
  { class: 'ai', name: 'PetalBot', re: /PetalBot/i },
  { class: 'ai', name: 'SemrushBot', re: /SemrushBot/i },
  { class: 'ai', name: 'DataForSeo', re: /DataForSeoBot/i },
  { class: 'ai', name: 'OtherAI', re: /\bAI\b.*bot|bot.*\bAI\b|LLM|training-data/i },

  // Social unfurl / previews
  { class: 'social', name: 'Facebook', re: /facebookexternalhit|Facebot|FacebookBot/i },
  { class: 'social', name: 'Twitterbot', re: /Twitterbot/i },
  { class: 'social', name: 'LinkedInBot', re: /LinkedInBot/i },
  { class: 'social', name: 'Slackbot', re: /Slackbot|Slack-ImgProxy/i },
  { class: 'social', name: 'Discordbot', re: /Discordbot/i },
  { class: 'social', name: 'WhatsApp', re: /WhatsApp/i },
  { class: 'social', name: 'TelegramBot', re: /TelegramBot/i },
  { class: 'social', name: 'Pinterest', re: /Pinterest/i },
  { class: 'social', name: 'redditbot', re: /redditbot/i },
  { class: 'social', name: 'Embedly', re: /Embedly|Iframely/i },
  { class: 'social', name: 'SkypeUriPreview', re: /SkypeUriPreview/i },
  { class: 'social', name: 'Quora', re: /Quora Link Preview/i },

  // Search
  { class: 'search', name: 'Googlebot', re: /Googlebot|Google-InspectionTool|Storebot-Google|AdsBot-Google/i },
  { class: 'search', name: 'Bingbot', re: /bingbot|BingPreview|msnbot/i },
  { class: 'search', name: 'DuckDuckBot', re: /DuckDuckBot|DuckAssistBot/i },
  { class: 'search', name: 'Yandex', re: /YandexBot|Yandex/i },
  { class: 'search', name: 'Baiduspider', re: /Baiduspider/i },
  { class: 'search', name: 'Applebot', re: /Applebot/i },
  { class: 'search', name: 'Sogou', re: /Sogou/i },
  { class: 'search', name: 'OtherSearch', re: /Slurp|SeznamBot|Qwantify|ecosia/i },

  // Generic bots last
  { class: 'other', name: 'bot', re: /bot|crawler|spider|scraper|curl\/|wget|httpie|python-requests|Go-http-client|Java\/|libwww|scrapy/i },
]

/** Browser-ish UA (humans). Not authoritative — absence of bot match + this → human. */
const BROWSER_RE =
  /Mozilla\/|Chrome\/|Safari\/|Firefox\/|Edg\/|OPR\/|CriOS|FxiOS|Mobile\/|Android|iPhone|iPad/i

/**
 * @param {string | undefined | null} ua
 * @returns {{ class: AccessClass, bot: string | null }}
 */
export function classifyUserAgent(ua) {
  const s = String(ua || '').slice(0, 400)
  if (!s) return { class: 'other', bot: 'empty' }

  for (const p of BOT_PATTERNS) {
    if (p.re.test(s)) {
      return { class: p.class, bot: p.name }
    }
  }

  if (BROWSER_RE.test(s)) {
    return { class: 'human', bot: null }
  }

  return { class: 'other', bot: 'unknown' }
}

/**
 * Paths worth counting for AEO/social/share health.
 * @param {string} pathname
 * @returns {boolean}
 */
export function isInterestingAccessPath(pathname) {
  const p = String(pathname || '')
  if (!p || p.startsWith('/api/')) return false
  if (p.startsWith('/assets/')) return false
  if (p === '/favicon.ico' || p === '/favicon.svg') return false
  if (p.startsWith('/art/')) return false

  if (p === '/' || p === '/about' || p === '/og-hero.jpg') return true
  if (p === '/llms.txt' || p === '/llms-full.txt' || p === '/sitemap.xml' || p === '/robots.txt')
    return true
  if (p.startsWith('/c/') || p.startsWith('/j/') || p.startsWith('/k/')) return true
  if (p.startsWith('/og/') || p.startsWith('/export/')) return true
  return false
}

/**
 * @param {string} pathname
 * @returns {AccessKind}
 */
export function classifyAccessPath(pathname) {
  const p = String(pathname || '')
  if (p === '/' ) return 'home'
  if (p === '/about') return 'about'
  if (p === '/llms.txt' || p === '/llms-full.txt') return 'llms'
  if (p === '/sitemap.xml' || p === '/robots.txt') return 'sitemap'
  if (p.startsWith('/og/') || p === '/og-hero.jpg') return 'og'
  if (p.startsWith('/export/')) return 'export'
  if (p.startsWith('/j/')) return 'journey'
  if (p.startsWith('/k/')) return 'key'
  if (p.startsWith('/c/') && p.endsWith('.md')) return 'chamber_md'
  if (p.startsWith('/c/')) return 'chamber'
  return 'other'
}

/**
 * Pull chamber/journey/key id from path when present.
 * @param {string} pathname
 * @returns {string | undefined}
 */
export function extractResourceId(pathname) {
  const p = String(pathname || '')
  const m = p.match(/^\/([cjk])\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.md)?$/i)
  if (m) return m[2].toLowerCase()
  // Versioned OG: /og/c/{id}.v7.png
  const og = p.match(/^\/og\/([cjk])\/([a-z0-9]+(?:-[a-z0-9]+)*)\.v\d+\.png$/i)
  if (og) return og[2].toLowerCase()
  const ogPlain = p.match(/^\/og\/([cjk])\/([a-z0-9]+(?:-[a-z0-9]+)*)\.png$/i)
  if (ogPlain) return ogPlain[2].toLowerCase()
  return undefined
}
