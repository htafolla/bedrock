import { describe, expect, it } from 'vitest'
import {
  classifyUserAgent,
  isInterestingAccessPath,
  classifyAccessPath,
  extractResourceId,
} from './access-classify.mjs'

describe('classifyUserAgent', () => {
  it('detects major AI crawlers', () => {
    expect(classifyUserAgent('Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.2)')).toEqual({
      class: 'ai',
      bot: 'GPTBot',
    })
    expect(classifyUserAgent('ClaudeBot/1.0')).toMatchObject({ class: 'ai', bot: 'ClaudeBot' })
    expect(classifyUserAgent('PerplexityBot/1.0')).toMatchObject({ class: 'ai', bot: 'PerplexityBot' })
  })

  it('detects social unfurl bots', () => {
    expect(classifyUserAgent('facebookexternalhit/1.1')).toMatchObject({
      class: 'social',
      bot: 'Facebook',
    })
    expect(classifyUserAgent('Twitterbot/1.0')).toMatchObject({ class: 'social', bot: 'Twitterbot' })
  })

  it('detects search bots', () => {
    expect(classifyUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toMatchObject({
      class: 'search',
      bot: 'Googlebot',
    })
  })

  it('classifies browsers as human', () => {
    expect(
      classifyUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toEqual({ class: 'human', bot: null })
  })
})

describe('access paths', () => {
  it('flags interesting surfaces only', () => {
    expect(isInterestingAccessPath('/c/master-the-flesh')).toBe(true)
    expect(isInterestingAccessPath('/c/master-the-flesh.md')).toBe(true)
    expect(isInterestingAccessPath('/og/c/kill-the-flesh.v7.png')).toBe(true)
    expect(isInterestingAccessPath('/llms.txt')).toBe(true)
    expect(isInterestingAccessPath('/api/telemetry')).toBe(false)
    expect(isInterestingAccessPath('/assets/index.js')).toBe(false)
  })

  it('classifies path kinds and ids', () => {
    expect(classifyAccessPath('/c/master-the-flesh')).toBe('chamber')
    expect(classifyAccessPath('/c/master-the-flesh.md')).toBe('chamber_md')
    expect(classifyAccessPath('/og/c/x.v7.png')).toBe('og')
    expect(extractResourceId('/c/master-the-flesh')).toBe('master-the-flesh')
    expect(extractResourceId('/c/kill-the-flesh.md')).toBe('kill-the-flesh')
    expect(extractResourceId('/og/c/kill-the-flesh.v7.png')).toBe('kill-the-flesh')
  })
})
