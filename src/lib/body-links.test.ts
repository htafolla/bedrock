import { describe, expect, it } from 'vitest'
import {
  hasChamberLinks,
  parseBodyChamberLinks,
  expandChamberLinksToMarkdown,
} from './body-links'

describe('body chamber links', () => {
  it('detects and parses Standard deep-link', () => {
    const t =
      'When the fight slows — full Standard: [Kill the Flesh. Walk in the Spirit.](chamber:kill-the-flesh-walk-in-the-spirit)'
    expect(hasChamberLinks(t)).toBe(true)
    const parts = parseBodyChamberLinks(t)
    expect(parts).toEqual([
      { type: 'text', text: 'When the fight slows — full Standard: ' },
      {
        type: 'chamber',
        id: 'kill-the-flesh-walk-in-the-spirit',
        label: 'Kill the Flesh. Walk in the Spirit.',
      },
    ])
  })

  it('expands to public markdown URL', () => {
    const t = '[Standard](chamber:kill-the-flesh-walk-in-the-spirit)'
    expect(
      expandChamberLinksToMarkdown(t, 'https://bedrock.rippel.ai', (id) => id),
    ).toBe(
      '[Standard](https://bedrock.rippel.ai/c/kill-the-flesh-walk-in-the-spirit)',
    )
  })

  it('leaves plain text alone', () => {
    expect(hasChamberLinks('No link here')).toBe(false)
    expect(parseBodyChamberLinks('Plain.')).toEqual([{ type: 'text', text: 'Plain.' }])
  })
})
