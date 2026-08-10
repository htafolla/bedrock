import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ShareNetwork, SharePayload } from '../lib/share'
import {
  canShareFiles,
  canSystemShare,
  copyText,
  facebookShareUrl,
  openShareNetwork,
  systemShare,
  xIntentUrl,
} from '../lib/share'
import {
  captureElementToPng,
  dataUrlToFile,
  downloadDataUrl,
  shareFilename,
} from '../lib/capture-share-image'
import { trackEvent } from '../lib/analytics'
import { ShareCard } from './ShareCard'

interface ShareMenuProps {
  payload: SharePayload
  /** Compact icon-style trigger */
  compact?: boolean
  className?: string
}

interface PopoverPos {
  top: number
  left: number
  maxWidth: number
}

/**
 * Share Door / Station / Path / Standard.
 * Image: html-to-image (bubble-blast-retro toPng) of ShareCard.
 * X / Facebook: link intents (OG unfurl from URL).
 * Instagram / TikTok: system share with PNG when possible.
 *
 * Popover is portaled to document.body so sticky rails / glass stacking
 * contexts never bury the menu.
 */
export function ShareMenu({ payload, compact = false, className = '' }: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pos, setPos] = useState<PopoverPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 8
    const maxWidth = Math.min(304, window.innerWidth - 24)
    let left = rect.left
    // Prefer opening below; if near bottom of viewport, still open below
    // (scrollable page) but clamp left so the panel stays on-screen.
    if (left + maxWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - 12 - maxWidth)
    }
    if (left < 12) left = 12
    setPos({
      top: rect.bottom + gap,
      left,
      maxWidth,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => updatePosition()
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    // Capture scroll from any nested scroller (experience main, etc.)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updatePosition])

  const flash = useCallback((msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(null), 2400)
  }, [])

  const capturePng = useCallback(async (): Promise<string | null> => {
    const el = cardRef.current
    if (!el) return null
    try {
      // Wait a frame so off-screen card paints fonts/layout
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      return await captureElementToPng(el, { quality: 0.95, pixelRatio: 2 })
    } catch (e) {
      console.error('share capture failed', e)
      return null
    }
  }, [])

  const shareWithImage = useCallback(async (): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> => {
    const dataUrl = await capturePng()
    if (!dataUrl) {
      return systemShare(payload)
    }
    const file = await dataUrlToFile(dataUrl, shareFilename(payload))
    if (canShareFiles()) {
      try {
        await navigator.share({
          title: payload.title,
          text: `${payload.text}\n${payload.url}`,
          files: [file],
        })
        return 'shared'
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return 'cancelled'
        // Some browsers reject files+text; try files only then fall back
        try {
          await navigator.share({ files: [file], title: payload.title })
          return 'shared'
        } catch {
          /* fall through */
        }
      }
    }
    // Desktop: download PNG + copy link (user can attach)
    downloadDataUrl(dataUrl, shareFilename(payload))
    await copyText(payload.shareLine)
    return 'copied'
  }, [capturePng, payload])

  const act = useCallback(
    async (network: ShareNetwork | 'image') => {
      trackEvent('nav', {
        nav: payload.layer,
        source: `share-${network}`,
      })
      setBusy(true)
      try {
        if (network === 'image') {
          const dataUrl = await capturePng()
          if (!dataUrl) {
            flash('Could not capture card')
            return
          }
          downloadDataUrl(dataUrl, shareFilename(payload))
          flash('Image saved')
          setOpen(false)
          return
        }
        if (network === 'system' || network === 'instagram' || network === 'tiktok') {
          const r = await shareWithImage()
          if (r === 'shared') flash(network === 'system' ? 'Shared' : 'Opened share sheet')
          else if (r === 'copied')
            flash(
              network === 'instagram' || network === 'tiktok'
                ? 'Image saved + link copied — paste in app'
                : 'Image saved + link copied',
            )
          setOpen(false)
          return
        }
        if (network === 'copy') {
          const ok = await copyText(payload.shareLine)
          flash(ok ? 'Link copied' : 'Copy failed')
          setOpen(false)
          return
        }
        // X / Facebook: open intent (preview uses OG from URL)
        openShareNetwork(network, payload)
        setOpen(false)
      } finally {
        setBusy(false)
      }
    },
    [payload, flash, capturePng, shareWithImage],
  )

  const popover =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            className="share-popover share-popover-portal"
            id={menuId}
            role="menu"
            style={{
              top: pos.top,
              left: pos.left,
              maxWidth: pos.maxWidth,
            }}
          >
            <p className="share-popover-kicker">Share {payload.layerLabel}</p>
            <p className="share-popover-title">{payload.title}</p>
            {canSystemShare() ? (
              <button
                type="button"
                role="menuitem"
                className="share-item"
                disabled={busy}
                onClick={() => void act('system')}
              >
                Share with image…
                <span className="share-item-hint">card PNG</span>
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="share-item"
              disabled={busy}
              onClick={() => void act('image')}
            >
              Save card image
            </button>
            <a
              role="menuitem"
              className="share-item"
              href={xIntentUrl(payload)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent('nav', { nav: payload.layer, source: 'share-x' })
                setOpen(false)
              }}
            >
              X (Twitter)
              <span className="share-item-hint">link + OG card</span>
            </a>
            <a
              role="menuitem"
              className="share-item"
              href={facebookShareUrl(payload)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent('nav', { nav: payload.layer, source: 'share-facebook' })
                setOpen(false)
              }}
            >
              Facebook
              <span className="share-item-hint">link + OG card</span>
            </a>
            <button
              type="button"
              role="menuitem"
              className="share-item"
              disabled={busy}
              onClick={() => void act('instagram')}
            >
              Instagram
              <span className="share-item-hint">image + share sheet</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="share-item"
              disabled={busy}
              onClick={() => void act('tiktok')}
            >
              TikTok
              <span className="share-item-hint">image + share sheet</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="share-item"
              disabled={busy}
              onClick={() => void act('copy')}
            >
              Copy link
            </button>
            <p className="share-popover-note">
              Card image is captured from this screen (html-to-image). X/Facebook previews also use
              the link&apos;s OG image.
            </p>
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={`share-menu${open ? ' is-open' : ''} ${className}`.trim()}
      ref={rootRef}
    >
      {/* Off-screen card for html-to-image (same technique as bubble-blast-retro) */}
      <ShareCard ref={cardRef} payload={payload} />

      <button
        ref={triggerRef}
        type="button"
        className={
          compact ? 'share-trigger compact share-trigger-icon' : 'share-trigger share-trigger-icon'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        title={`Share this ${payload.layerLabel.toLowerCase()}`}
        aria-label={`Share this ${payload.layerLabel.toLowerCase()}`}
      >
        {busy ? (
          <span className="share-trigger-busy" aria-hidden>
            …
          </span>
        ) : (
          <>
            <svg
              className="share-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51 15.42 17.49" />
              <path d="m15.41 6.51-6.82 3.98" />
            </svg>
            <span className="share-trigger-label">Share</span>
          </>
        )}
      </button>
      {popover}
      {status ? (
        <span className="share-status" role="status">
          {status}
        </span>
      ) : null}
    </div>
  )
}
