import { describe, expect, it } from 'vitest'
import { normalizeChatBody, MAX_CONTENT_LEN } from './index.mjs'

describe('normalizeChatBody', () => {
  it('requires messages and user last turn', () => {
    expect(normalizeChatBody(null).error).toMatch(/Invalid/)
    expect(normalizeChatBody({ messages: [] }).error).toMatch(/required/)
    expect(
      normalizeChatBody({
        messages: [{ role: 'assistant', content: 'hi' }],
      }).error,
    ).toMatch(/Last message/)
  })

  it('keeps valid turns and chamber context', () => {
    const { messages, contextLine, error } = normalizeChatBody({
      messages: [
        { role: 'user', content: '  What is love?  ' },
        { role: 'assistant', content: 'God is love.' },
        { role: 'user', content: 'Under fire?' },
      ],
      context: {
        chamberId: 'love',
        chamberTitle: 'Love',
        chamberSummary: 'Love is from God.',
      },
    })
    expect(error).toBeUndefined()
    expect(messages).toHaveLength(3)
    expect(messages[0].content).toBe('What is love?')
    expect(contextLine).toMatch(/Love/)
    expect(contextLine).toMatch(/love/)
  })

  it('truncates long content', () => {
    const long = 'x'.repeat(MAX_CONTENT_LEN + 500)
    const { messages, error } = normalizeChatBody({
      messages: [{ role: 'user', content: long }],
    })
    expect(error).toBeUndefined()
    expect(messages[0].content).toHaveLength(MAX_CONTENT_LEN)
  })
})
