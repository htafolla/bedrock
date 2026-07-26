import { describe, expect, it } from 'vitest'
import { parseChatSseData } from './chat'

describe('parseChatSseData', () => {
  it('parses delta events', () => {
    expect(parseChatSseData(JSON.stringify({ type: 'delta', text: 'Hello' }))).toEqual({
      type: 'delta',
      text: 'Hello',
      error: undefined,
    })
  })

  it('parses done and error', () => {
    expect(parseChatSseData(JSON.stringify({ type: 'done' }))?.type).toBe('done')
    expect(parseChatSseData(JSON.stringify({ type: 'error', error: 'nope' }))).toMatchObject({
      type: 'error',
      error: 'nope',
    })
  })

  it('ignores junk and DONE', () => {
    expect(parseChatSseData('[DONE]')).toBeNull()
    expect(parseChatSseData('not-json')).toBeNull()
    expect(parseChatSseData('')).toBeNull()
  })
})
