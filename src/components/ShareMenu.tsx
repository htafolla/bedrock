import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ShareNetwork, SharePayload } from '../lib/share'
import {
  canSystemShare,
  copyText,
  facebookShareUrl,
  openShareNetwork,
  systemShare,
  xIntentUrl,
} from '../lib/share'
import { trackEvent } from '../lib/analytics'

interface ShareMenuProps {
  payload: SharePayload
  /** Compact icon-style trigger */
  compact?: boolean
  className?: string
}

/**
 * Share Door / Station / Path / Standard.
 * X + Facebook: intent URLs (OG preview from payload.url).
 * Instagram + TikTok: system share or copy (no web post API).
 */
export function ShareMenu({ payload, compact = false, className = '' }: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const flash = useCallback((msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(null), 2200)
  }, [])

  const act = useCallback(
    async (network: ShareNetwork) => {
      trackEvent('nav', {
        nav: payload.layer,
        source: `share-${network}`,
      })
      if (network === 'system') {
        const r = await systemShare(payload)
        if (r === 'shared') flash('Shared')
        else if (r === 'copied') flash('Link copied')
        setOpen(false)
        return
      }
      if (network === 'copy') {
        const ok = await copyText(payload.shareLine)
        flash(ok ? 'Link copied' : 'Copy failed')
        setOpen(false)
        return
      }
      if (network === 'instagram' || network === 'tiktok') {
        const r = await systemShare(payload)
        if (r === 'shared') flash('Opened share sheet')
        else if (r === 'copied')
          flash(network === 'instagram' ? 'Link copied — paste in Instagram' : 'Link copied — paste in TikTok')
        setOpen(false)
        return
      }
      openShareNetwork(network, payload)
      setOpen(false)
    },
    [payload, flash],
  )

  return (
    <div className={`share-menu ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className={compact ? 'share-trigger compact' : 'share-trigger'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        title={`Share this ${payload.layerLabel.toLowerCase()}`}
      >
        Share
      </button>
      {open ? (
        <div className="share-popover" id={menuId} role="menu">
          <p className="share-popover-kicker">
            Share {payload.layerLabel}
          </p>
          <p className="share-popover-title">{payload.title}</p>
          {canSystemShare() ? (
            <button type="button" role="menuitem" className="share-item" onClick={() => void act('system')}>
              System share…
            </button>
          ) : null}
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
          </a>
          <button type="button" role="menuitem" className="share-item" onClick={() => void act('instagram')}>
            Instagram
            <span className="share-item-hint">share sheet / copy</span>
          </button>
          <button type="button" role="menuitem" className="share-item" onClick={() => void act('tiktok')}>
            TikTok
            <span className="share-item-hint">share sheet / copy</span>
          </button>
          <button type="button" role="menuitem" className="share-item" onClick={() => void act('copy')}>
            Copy link
          </button>
          <p className="share-popover-note">
            Previews use a card image + link. Instagram &amp; TikTok need the share sheet or paste.
          </p>
        </div>
      ) : null}
      {status ? (
        <span className="share-status" role="status">
          {status}
        </span>
      ) : null}
    </div>
  )
}
