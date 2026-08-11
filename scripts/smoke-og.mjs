/**
 * Post-deploy / local smoke: OG PNG + meta for flagship share URLs.
 * Usage:
 *   node scripts/smoke-og.mjs
 *   node scripts/smoke-og.mjs https://bedrock.rippel.ai
 */
const origin = (process.argv[2] || 'https://bedrock.rippel.ai').replace(/\/$/, '')

const checks = [
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

let failed = 0

for (const c of checks) {
  process.stdout.write(`· ${c.name}… `)
  try {
    const imgRes = await fetch(c.image, { redirect: 'follow' })
    const ct = imgRes.headers.get('content-type') || ''
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    if (!imgRes.ok || !ct.includes('image/png') || !isPng) {
      console.log(`FAIL image (${imgRes.status} ${ct} ${buf.length}b)`)
      failed += 1
      continue
    }
    const pageRes = await fetch(c.page, { redirect: 'follow' })
    const html = await pageRes.text()
    if (!pageRes.ok) {
      console.log(`FAIL page ${pageRes.status}`)
      failed += 1
      continue
    }
    if (!html.includes(c.image) && !html.includes(c.image.replace(origin, ''))) {
      // accept absolute og:image pointing at this png
      const bare = c.image.split('/og/')[1]
      if (!bare || !html.includes(`/og/${bare}`)) {
        console.log('FAIL meta missing og image path')
        failed += 1
        continue
      }
    }
    if (html.includes('?v=') && html.includes('/og/')) {
      // soft warn only — query strings on og can hurt X
      console.log(`OK png=${buf.length}b (warn: ?v= in page meta)`)
    } else {
      console.log(`OK png=${buf.length}b meta=ok`)
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
