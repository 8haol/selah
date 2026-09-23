'use client'
import { useEffect, useRef, useState } from 'react'
import { slideTheme, type SlideDeck } from '@selah/slide-engine'
import { SlideView, slideLabel } from './SlideView'

export { SlideView, posterSrc, slideLabel } from './SlideView'

/** Read-only walkthrough of a saved deck. The setlist editor has its own. */
export function DeckPreview({ deck }: { deck: SlideDeck }) {
  const [wanted, setWanted] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)
  const n = deck.slides.length
  // clamp during render — an effect here would cascade a second render
  const i = Math.min(wanted, Math.max(0, n - 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (stripRef.current?.contains(target) || target.closest('input, textarea'))) return
      if (e.key === 'ArrowRight') setWanted((x) => Math.min(n - 1, x + 1))
      if (e.key === 'ArrowLeft') setWanted((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])

  if (n === 0) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-line-strong text-sm text-ink-5">
        还没有可预览的幻灯片
      </div>
    )
  }

  const cur = deck.slides[i]!
  return (
    <div className="space-y-3">
      <SlideView slide={cur} theme={slideTheme(deck, cur)} frameClassName="rounded-xl" />
      <div className="flex items-center justify-between text-[13px] text-ink-5">
        <span>
          <span className="font-mono">{i + 1}</span> / <span className="font-mono">{n}</span> · {slideLabel(cur)}
        </span>
        <span aria-hidden="true">← → 翻页</span>
      </div>
      <div
        ref={stripRef}
        role="group"
        aria-label="幻灯片缩略图"
        className="scroll-thin flex gap-2 overflow-x-auto pb-1"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
          e.preventDefault()
          e.stopPropagation()
          const next = Math.max(0, Math.min(n - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))
          setWanted(next)
          stripRef.current?.querySelectorAll('button')[next]?.focus()
        }}
      >
        {deck.slides.map((s, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setWanted(k)}
            aria-label={`第 ${k + 1} 页 · ${slideLabel(s)}`}
            aria-current={k === i || undefined}
            className={`w-24 shrink-0 overflow-hidden rounded-xs outline-2 outline-offset-2 transition sm:w-[88px] ${k === i ? 'outline-accent' : 'outline-transparent hover:outline-line-4'}`}
          >
            <SlideView slide={s} theme={slideTheme(deck, s)} static frameClassName="rounded-xs" />
          </button>
        ))}
      </div>
    </div>
  )
}
