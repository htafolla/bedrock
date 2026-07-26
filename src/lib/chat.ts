/** Client helpers for Bedrock ↔ SpaceXAI (xAI) guide chat. Key never leaves the server. */

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatContext {
  chamberId?: string
  chamberTitle?: string
  chamberSummary?: string
}

export interface StreamChatOptions {
  messages: ChatMessage[]
  context?: ChatContext
  signal?: AbortSignal
  onDelta: (text: string) => void
}

export class ChatRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ChatRequestError'
    this.status = status
  }
}

/** Parse one SSE `data:` payload from the Bedrock chat proxy. */
export function parseChatSseData(raw: string): { type: string; text?: string; error?: string } | null {
  const line = raw.trim()
  if (!line || line === '[DONE]') return null
  try {
    const data = JSON.parse(line) as { type?: string; text?: string; error?: string }
    if (!data || typeof data.type !== 'string') return null
    return { type: data.type, text: data.text, error: data.error }
  } catch {
    return null
  }
}

/**
 * Stream a guide reply from POST /api/chat (server holds XAI_API_KEY).
 */
export async function streamGuideChat(options: StreamChatOptions): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      messages: options.messages,
      context: options.context,
    }),
    signal: options.signal,
  })

  if (!res.ok) {
    let detail = `Chat failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      /* ignore */
    }
    throw new ChatRequestError(detail, res.status)
  }

  if (!res.body) {
    throw new ChatRequestError('No response body', res.status)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = parseChatSseData(line.slice(5).trim())
        if (!payload) continue
        if (payload.type === 'delta' && payload.text) {
          options.onDelta(payload.text)
        } else if (payload.type === 'error') {
          throw new ChatRequestError(payload.error || 'Stream error', 502)
        }
      }
    }
  }
}
