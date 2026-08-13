/**
 * Post-deploy / local smoke: OG PNG + meta for flagship share URLs.
 * Usage:
 *   node scripts/smoke-og.mjs
 *   node scripts/smoke-og.mjs https://bedrock.rippel.ai
 */
const origin = (process.argv[2] || 'https://bedrock.rippel.ai').replace(/\/$/, '')

const checks = [
  {
    name: 'Home',
    page: `${origin}/`,
    image: `${origin}/og-hero.jpg`,
    imageType: 'image/jpeg',
  },
  {
    name: 'About / Origin',
    page: `${origin}/about`,
    image: `${origin}/og/origin.png`,
  },
  {
    name: 'Standard',
    page: `${origin}/c/kill-the-flesh-walk-in-the-spirit`,
    image: `${origin}/og/c/kill-the-flesh-walk-in-the-spirit.png`,
  },
  {
    name: 'Battlefield path',
    page: `${origin}/j/battlefield-of-the-mind`,
    image: `${origin}/og/j/battlefield-of-the-mind.png`,
  },
  {
    name: 'Station wounded',
    page: `${origin}/c/wounded`,
    image: `${origin}/og/c/wounded.png`,
  },
  {
    name: 'Key wounded',
    page: `${origin}/k/key-wounded`,
    image: `${origin}/og/k/key-wounded.png`,
  },
]

const TWITTERBOT = { 'User-Agent': 'Twitterbot/1.0' }

let failed = 0

function isJpeg(buf) {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8
}
function isPng(buf) {
  return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
}

for (const c of checks) {
  process.stdout.write(`· ${c.name}… `)
  try {
    const wantJpeg = (c.imageType || '').includes('jpeg') || c.image.endsWith('.jpg')
    const imgRes = await fetch(c.image, { redirect: 'follow', headers: TWITTERBOT })
    const ct = imgRes.headers.get('content-type') || ''
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const okType = wantJpeg
      ? ct.includes('image/jpeg') && isJpeg(buf)
      : ct.includes('image/png') && isPng(buf)
    if (!imgRes.ok || !okType || buf.length < 1000) {
      console.log(`FAIL image (${imgRes.status} ${ct} ${buf.length}b)`)
      failed += 1
      continue
    }
    const pageRes = await fetch(c.page, { redirect: 'follow', headers: TWITTERBOT })
    const html = await pageRes.text()
    if (!pageRes.ok) {
      console.log(`FAIL page ${pageRes.status}`)
      failed += 1
      continue
    }
    const pathOnly = c.image.replace(origin, '')
    if (!html.includes(c.image) && !html.includes(pathOnly)) {
      console.log('FAIL meta missing og image path')
      failed += 1
      continue
    }
    // Hard fail: query strings on og/twitter image URLs break X card crawler
    if (/og:image[^>]+content="[^"]*\?v=/.test(html) || /twitter:image[^>]+content="[^"]*\?v=/.test(html)) {
      console.log(`FAIL ?v= on og/twitter image (${buf.length}b)`)
      failed += 1
      continue
    }
    console.log(`OK ${buf.length}b meta=ok`)
  } catch (e) {
    console.log(`FAIL ${e instanceof Error ? e.message : e}`)
    failed += 1
  }
}

// SPA deep links must redirect social crawlers to canonical pages with card OG
for (const deep of [
  { name: 'SPA ?c=wounded → /c/', from: `${origin}/?c=wounded`, expectPath: '/c/wounded', image: '/og/c/wounded.png' },
  { name: 'SPA ?j=spouse-left → /j/', from: `${origin}/?j=spouse-left`, expectPath: '/j/spouse-left', image: '/og/j/spouse-left.png' },
]) {
  process.stdout.write(`· ${deep.name}… `)
  try {
    const r = await fetch(deep.from, { redirect: 'manual', headers: TWITTERBOT })
    const loc = r.headers.get('location') || ''
    if (r.status >= 300 && r.status < 400 && loc.includes(deep.expectPath)) {
      const follow = await fetch(new URL(loc, origin).href, { headers: TWITTERBOT })
      const html = await follow.text()
      if (html.includes(deep.image)) {
        console.log(`OK ${r.status} → ${loc}`)
      } else {
        console.log(`FAIL redirect ok but meta missing ${deep.image}`)
        failed += 1
      }
    } else {
      // Pre-deploy live may not redirect yet — soft note when page has wrong home OG
      const follow = await fetch(deep.from, { redirect: 'follow', headers: TWITTERBOT })
      const html = await follow.text()
      if (html.includes(deep.image)) {
        console.log('OK (inline meta)')
      } else {
        console.log(`FAIL no redirect (${r.status} loc=${loc || 'none'}) and home OG only`)
        failed += 1
      }
    }
  } catch (e) {
    console.log(`FAIL ${e instanceof Error ? e.message : e}`)
    failed += 1
  }
}

if (failed) {
  console.error(`\nsmoke-og: ${failed} check(s) failed against ${origin}`)
  process.exit(1)
}
console.log(`\nsmoke-og: all clear · ${origin}`)
