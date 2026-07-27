import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import {
  ChatRequestError,
  streamGuideChat,
  type ChatContext,
  type ChatMessage,
} from '../../lib/chat'
import { resolveChamberId } from '../../lib/chamber-match'
import { scriptureChipHref } from '../../lib/verses'

interface GuideChamberRef {
  id: string
  title: string
}

interface GuideChatProps {
  context?: ChatContext
  /** Atlas chambers for Connected truth chip → spine open. */
  chambers?: GuideChamberRef[]
  /** Open a chamber while chat stays open. */
  onOpenChamber?: (id: string) => void
}

const STARTERS = [
  'Where do I start when I feel lost?',
  'How do I stand solid under fire?',
  'What does love look like when it costs me?',
]

function childText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props
    return childText(props?.children)
  }
  return ''
}

type ChipSection = 'none' | 'scripture' | 'truth'

/**
 * Factory so list items under Scripture / Connected truth become clickable chips.
 * chipSection is mutated during a single ReactMarkdown tree walk (h2 then following lis).
 */
function createGuideMarkdownComponents(
  chambers: GuideChamberRef[],
  onOpenChamber?: (id: string) => void,
) {
  let chipSection: ChipSection = 'none'

  return {
    h1: ({ children }: { children?: ReactNode }) => {
      const text = childText(children).trim()
      const chamberId = text ? resolveChamberId(text, chambers) : null
      if (chamberId && onOpenChamber) {
        return (
          <h1 className="guide-card-title">
            <button
              type="button"
              className="guide-card-title-btn"
              onClick={() => onOpenChamber(chamberId)}
              title={`Open ${text} on the spine`}
            >
              {children}
            </button>
          </h1>
        )
      }
      return <h1 className="guide-card-title">{children}</h1>
    },
    h2: ({ children }: { children?: ReactNode }) => {
      const label = childText(children).trim().toLowerCase()
      if (label === 'scripture') chipSection = 'scripture'
      else if (label === 'connected truth' || label === 'related' || label === 'related chambers') {
        chipSection = 'truth'
      } else chipSection = 'none'
      const chipSections = chipSection !== 'none'
      return (
        <h2 className={`guide-card-layer${chipSections ? ' guide-card-layer-chips' : ''}`}>
          {children}
        </h2>
      )
    },
    h3: ({ children }: { children?: ReactNode }) => {
      chipSection = 'none'
      return <h3 className="guide-card-layer">{children}</h3>
    },
    p: ({ children }: { children?: ReactNode }) => {
      const text = childText(children).trim()
      if (/^first principle$/i.test(text)) {
        return <p className="guide-card-kicker">{text}</p>
      }
      // Short line that is exactly a chamber title → open spine
      if (text && text.length <= 48 && onOpenChamber) {
        const chamberId = resolveChamberId(text, chambers)
        if (chamberId) {
          return (
            <p className="guide-card-line">
              <button
                type="button"
                className="guide-card-chip-action guide-inline-chamber"
                onClick={() => onOpenChamber(chamberId)}
                title={`Open ${text} on the spine`}
              >
                {text}
              </button>
            </p>
          )
        }
      }
      return <p className="guide-card-line">{children}</p>
    },
    em: ({ children }: { children?: ReactNode }) => {
      const text = childText(children).trim()
      if (/^first principle$/i.test(text)) {
        return <span className="guide-card-kicker">{text}</span>
      }
      return <em>{children}</em>
    },
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="guide-card-list">{children}</ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="guide-card-list">{children}</ol>
    ),
    li: ({ children }: { children?: ReactNode }) => {
      const text = childText(children).trim()

      if (chipSection === 'scripture' && text) {
        const href = scriptureChipHref(text)
        return (
          <li className="guide-card-item guide-card-chip is-clickable">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="guide-card-chip-action"
              title={`Open ${text} on Bible Gateway`}
            >
              {text}
            </a>
          </li>
        )
      }

      // Connected truth — or any short list line that matches a chamber title
      if (text && onOpenChamber) {
        const chamberId = resolveChamberId(text, chambers)
        if (chamberId && (chipSection === 'truth' || text.length <= 40)) {
          return (
            <li className="guide-card-item guide-card-chip is-clickable">
              <button
                type="button"
                className="guide-card-chip-action"
                onClick={() => onOpenChamber(chamberId)}
                title={`Open ${text} on the spine`}
              >
                {text}
              </button>
            </li>
          )
        }
      }

      return <li className="guide-card-item">{children}</li>
    },
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="guide-card-strong">{children}</strong>
    ),
  }
}

export function GuideChat({ context, chambers = [], onOpenChamber }: GuideChatProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messageCountRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((r) => r.json())
      .then((body: { chatConfigured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(body.chatConfigured))
      })
      .catch(() => {
        if (!cancelled) setConfigured(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  // Pin the *start* of a new turn into view once — do not chase the stream downward.
  useEffect(() => {
    const el = listRef.current
    if (!el || !open) return
    if (messages.length <= messageCountRef.current) {
      messageCountRef.current = messages.length
      return
    }
    messageCountRef.current = messages.length
    // After React paints the new bubble(s), scroll so the latest turn starts at the top of the list.
    const id = window.requestAnimationFrame(() => {
      const bubbles = el.querySelectorAll('.guide-chat-bubble')
      const last = bubbles[bubbles.length - 1] as HTMLElement | undefined
      if (!last) return
      const top = last.offsetTop - el.offsetTop
      el.scrollTop = Math.max(0, top - 4)
    })
    return () => window.cancelAnimationFrame(id)
  }, [messages.length, open])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || busy) return

      setError(null)
      setInput('')
      const nextHistory: ChatMessage[] = [...messages, { role: 'user', content }]
      setMessages([...nextHistory, { role: 'assistant', content: '' }])
      setBusy(true)

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      try {
        await streamGuideChat({
          messages: nextHistory,
          context,
          signal: ac.signal,
          onDelta: (delta) => {
            setMessages((prev) => {
              if (prev.length === 0) return prev
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last.role !== 'assistant') return prev
              copy[copy.length - 1] = { role: 'assistant', content: last.content + delta }
              return copy
            })
          },
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg =
          err instanceof ChatRequestError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Chat failed'
        setError(msg)
        setMessages((prev) => {
          // Drop empty assistant bubble on failure
          if (prev.length && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
            return prev.slice(0, -1)
          }
          return prev
        })
      } finally {
        setBusy(false)
      }
    },
    [busy, context, messages],
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <div className={`guide-chat ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="guide-chat-fab"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close' : 'Ask'}
      </button>

      {open ? (
        <section
          id={panelId}
          className="guide-chat-panel"
          role="dialog"
          aria-label="Bedrock guide chat"
        >
          <header className="guide-chat-header">
            <div>
              <p className="guide-chat-kicker">Field guide</p>
              <h2 className="guide-chat-title">Ask Bedrock</h2>
            </div>
            {context?.chamberTitle ? (
              <p className="guide-chat-context">In: {context.chamberTitle}</p>
            ) : (
              <p className="guide-chat-context">SpaceXAI · grok-4.5</p>
            )}
          </header>

          {configured === false ? (
            <p className="guide-chat-banner" role="status">
              Chat needs server auth: <code>npm run xai:login</code> (OAuth) or{' '}
              <code>XAI_API_KEY</code>. Secrets never ship to the browser.
            </p>
          ) : null}

          <div className="guide-chat-messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="guide-chat-empty">
                <p>Short counsel under pressure. Start with a starter or type your own.</p>
                <ul className="guide-chat-starters">
                  {STARTERS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => void send(s)} disabled={busy}>
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`guide-chat-bubble guide-chat-bubble-${m.role}`}
                >
                  <span className="guide-chat-role">{m.role === 'user' ? 'You' : 'Guide'}</span>
                  {m.role === 'assistant' ? (
                    <div className="guide-chat-md guide-mini-card">
                      {m.content ? (
                        <ReactMarkdown
                          components={createGuideMarkdownComponents(chambers, onOpenChamber)}
                        >
                          {m.content}
                        </ReactMarkdown>
                      ) : busy && i === messages.length - 1 ? (
                        <p className="guide-chat-thinking" aria-live="polite" aria-label="Thinking">
                          <span className="guide-chat-dot" />
                          <span className="guide-chat-dot" />
                          <span className="guide-chat-dot" />
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="guide-chat-user-text">{m.content}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {error ? (
            <p className="guide-chat-error" role="alert">
              {error}
            </p>
          ) : null}

          <form className="guide-chat-form" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Message
            </label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask under fire…"
              disabled={busy || configured === false}
              maxLength={4000}
            />
            <button type="submit" disabled={busy || !input.trim() || configured === false}>
              {busy ? '…' : 'Send'}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
