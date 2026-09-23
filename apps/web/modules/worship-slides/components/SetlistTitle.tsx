'use client'
import { useRef, useState, useTransition } from 'react'
import { cx } from '@/core/ui'
import { renameSetlist } from '../setlist-actions'

/** The editor's title: tap to rename, Enter or leaving the field saves, Esc backs out. */
export function SetlistTitle({ id, title: initial }: { id: string; title: string }) {
  const [title, setTitle] = useState(initial)
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const cancelled = useRef(false)

  const commit = () => {
    if (draft === null) return
    const next = draft.trim()
    setDraft(null)
    if (cancelled.current || !next || next === title) { cancelled.current = false; return }
    const prev = title
    setTitle(next)
    start(async () => {
      const r = await renameSetlist(id, next)
      if (r.ok) { setError(null); document.title = `${next} · Selah` }
      else { setTitle(prev); setError(r.message) }
    })
  }

  if (draft !== null) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={60}
        aria-label="名字"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          // Enter while a pinyin IME is composing picks a candidate, not the name
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() }
        }}
        className="min-w-0 max-w-[20rem] flex-1 rounded-md border border-line-strong bg-surface px-2 py-1 text-[15.5px] font-semibold outline-none focus:border-ink-5"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setDraft(title)}
      title={error ?? '点一下改名'}
      aria-label={`${title}，点一下改名`}
      className={cx(
        'min-w-0 cursor-text truncate rounded-md px-2 py-1 text-left text-[15.5px] font-semibold transition-colors hover:bg-surface-3',
        pending && 'opacity-60',
        error && 'text-accent-strong',
      )}
    >
      {title}
    </button>
  )
}
