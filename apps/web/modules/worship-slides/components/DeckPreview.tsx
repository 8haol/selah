'use client'
import { useEffect, useRef, useState } from 'react'
import { getTheme, layoutSlide, CONTENT_X_PT, CONTENT_W_PT, SLIDE_W_PT, SLIDE_H_PT, type Slide, type SlideDeck, type Theme } from '@selah/slide-engine'

const PX = 1920 / SLIDE_W_PT          // 2.6667 px per pt
const px = (pt: number) => pt * PX
const FONT_ZH = `"SimHei","Heiti SC","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`
const FONT_TITLE = `"KaiTi","Kaiti SC","STKaiti","楷体",serif`
const FONT_PY = `Arial,"Helvetica Neue",Helvetica,sans-serif`

function shadow(theme: Theme): string | undefined {
  if (!theme.shadow) return undefined
  const { color, opacity } = theme.shadow
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).join(',')
  return `0 4px 18px rgba(${rgb},${opacity}), 0 1px 2px rgba(${rgb},${opacity * 0.6})`
}

export function SlideView({ slide, theme }: { slide: Slide; theme: Theme }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setScale((e?.contentRect.width ?? 1920) / 1920))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const sh = shadow(theme)
  const lay = slide.kind === 'lyrics' ? layoutSlide(slide.lines, theme) : null
  return (
    <div ref={ref} className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <div style={{ width: 1920, height: px(SLIDE_H_PT), transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', inset: 0, backgroundImage: `url(${theme.background.src})`, backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: FONT_ZH }}>
        {slide.kind === 'title' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: px(theme.sizes.title * 0.75), fontWeight: 700, letterSpacing: '.08em', color: theme.colors.title, textShadow: sh }}>{slide.title}</div>
            <div style={{ width: 220, height: 3, borderRadius: 2, background: theme.colors.rule, opacity: 0.9 }} />
            <div style={{ fontFamily: FONT_PY, fontSize: px(theme.sizes.titlePinyin * 0.75), letterSpacing: '.06em', color: theme.colors.pinyin }}>{slide.titlePinyin}</div>
            {slide.meta && <div style={{ fontFamily: FONT_PY, fontSize: px(theme.sizes.meta * 0.75), letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 26, opacity: 0.85, color: theme.colors.meta }}>{slide.meta}</div>}
          </div>
        )}
        {slide.kind === 'lyrics' && lay && (
          <>
            {slide.sectionLabel && (
              <div style={{ position: 'absolute', top: px(27), left: px(36), height: px(26), display: 'flex', alignItems: 'center', fontFamily: FONT_PY, fontSize: px(theme.sizes.badge * 0.75), letterSpacing: '.22em', padding: `0 ${px(8)}px`, border: `1.5px solid ${theme.colors.badge}55`, background: `${theme.colors.badge}1f`, borderRadius: 999, color: theme.colors.badge }}>{slide.sectionLabel}</div>
            )}
            {lay.rows.map((row, ri) => (
              <div key={ri} style={{ position: 'absolute', display: 'flex', left: px(CONTENT_X_PT + (CONTENT_W_PT - row.widthPt) / 2), top: px(lay.topPt + ri * (lay.rowHeightPt + lay.rowGapPt)), height: px(lay.rowHeightPt) }}>
                {row.cells.map((cell, ci) => (
                  <div key={ci} style={{ width: px(cell.widthPt), marginRight: cell.gapAfter && ci < row.cells.length - 1 ? px(0.5 * lay.zhPt) : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'center' }}>
                    {cell.py && <span style={{ fontFamily: FONT_PY, fontSize: px(lay.pyPt * 0.75), lineHeight: 1, color: theme.colors.pinyin, whiteSpace: 'nowrap' }}>{cell.py}</span>}
                    <span style={{ fontFamily: FONT_ZH, fontSize: px(lay.zhPt * 0.75), lineHeight: 1.05, fontWeight: 700, color: theme.colors.zh, textShadow: sh, whiteSpace: 'nowrap' }}>{cell.zh}</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export function DeckPreview({ deck }: { deck: SlideDeck }) {
  const theme = getTheme(deck.themeId)
  const [i, setI] = useState(0)
  const n = deck.slides.length
  useEffect(() => { setI((x) => Math.min(x, Math.max(0, n - 1))) }, [n])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(n - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [n])
  if (n === 0) return <div className="aspect-video w-full rounded-lg border border-dashed border-line" />
  const cur = deck.slides[i]!
  return (
    <div className="space-y-3">
      <SlideView slide={cur} theme={theme} />
      <div className="flex items-center justify-between text-xs text-ink-soft"><span>{i + 1} / {n} · {cur.kind === 'title' ? '标题' : cur.kind === 'blank' ? '空白' : cur.sectionLabel}</span><span>← → 翻页</span></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {deck.slides.map((s, k) => (
          <button key={k} onClick={() => setI(k)} className={`w-32 shrink-0 rounded-md ring-2 ${k === i ? 'ring-accent' : 'ring-transparent'}`}><SlideView slide={s} theme={theme} /></button>
        ))}
      </div>
    </div>
  )
}
