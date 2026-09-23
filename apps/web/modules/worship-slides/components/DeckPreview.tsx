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

/** The still frame for a theme: the JPEG itself, or a video theme's poster. */
export function posterSrc(theme: Theme): string {
  return theme.background.kind === 'video' ? theme.background.poster : theme.background.src
}

/** `static` keeps thumbnails on the poster — dozens of playing videos at once is not worth it. */
export function SlideView({ slide, theme, static: isStatic = false, frameClassName = 'rounded-lg' }: { slide: Slide; theme: Theme; static?: boolean; frameClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setScale((e?.contentRect.width ?? 1920) / 1920))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const sh = shadow(theme)
  const lay = slide.kind === 'lyrics' ? layoutSlide(slide.lines, theme) : null
  const video = !isStatic && theme.background.kind === 'video' ? theme.background : null
  return (
    <div ref={ref} className={`relative aspect-video w-full overflow-hidden bg-black ${frameClassName}`}>
      <div style={{ width: 1920, height: px(SLIDE_H_PT), transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', inset: 0, backgroundImage: `url(${posterSrc(theme)})`, backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: FONT_ZH }}>
        {video && (
          <video src={video.src} poster={video.poster} autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {slide.kind === 'title' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* pinyin above the characters it annotates, as on every lyric line */}
            <div style={{ fontFamily: FONT_PY, fontSize: px(theme.sizes.titlePinyin * 0.75), letterSpacing: '.06em', color: theme.colors.pinyin, textShadow: sh, marginBottom: px(8) }}>{slide.titlePinyin}</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: px(theme.sizes.title * 0.75), fontWeight: 700, letterSpacing: '.08em', color: theme.colors.title, textShadow: sh }}>{slide.title}</div>
            <div style={{ width: 220, height: 3, borderRadius: 2, background: theme.colors.rule, opacity: 0.9, marginTop: px(16) }} />
            {slide.meta && <div style={{ fontFamily: FONT_PY, fontSize: px(theme.sizes.meta * 0.75), letterSpacing: '.14em', textTransform: 'uppercase', marginTop: px(20), opacity: 0.85, color: theme.colors.meta }}>{slide.meta}</div>}
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
                    {cell.py && <span style={{ fontFamily: FONT_PY, fontSize: px(lay.pyPt * 0.75), lineHeight: 1, color: theme.colors.pinyin, textShadow: sh, whiteSpace: 'nowrap' }}>{cell.py}</span>}
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

function slideLabel(slide: Slide): string {
  if (slide.kind === 'title') return '标题'
  if (slide.kind === 'blank') return '空白'
  return slide.sectionLabel ?? '歌词'
}

export function DeckPreview({ deck }: { deck: SlideDeck }) {
  const theme = getTheme(deck.themeId)
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
      <div className="grid aspect-video w-full place-items-center rounded-lg border border-dashed border-line text-sm text-ink-soft">
        还没有可预览的幻灯片
      </div>
    )
  }

  const cur = deck.slides[i]!
  return (
    <div className="space-y-3">
      <SlideView slide={cur} theme={theme} />
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>
          <span className="font-mono">{i + 1}</span> / <span className="font-mono">{n}</span> · {slideLabel(cur)}
        </span>
        <span aria-hidden="true">← → 翻页</span>
      </div>
      <div
        ref={stripRef}
        role="group"
        aria-label="幻灯片缩略图"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
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
            className={`w-28 shrink-0 overflow-hidden rounded-md ring-2 transition sm:w-32 ${k === i ? 'ring-accent' : 'ring-transparent hover:ring-line'}`}
          >
            <SlideView slide={s} theme={theme} static frameClassName="rounded-[4px]" />
          </button>
        ))}
      </div>
    </div>
  )
}
