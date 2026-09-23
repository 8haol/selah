'use client'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cx } from '@/core/ui'
import {
  layoutMeta, layoutSlide, layoutTitle, outlinePt, BADGE, CONTENT_X_PT, CONTENT_W_PT, META_LINE, SLIDE_W_PT, SLIDE_H_PT, type Slide, type Theme,
} from '@selah/slide-engine'

const PX = 1920 / SLIDE_W_PT          // 2.6667 px per pt
const px = (pt: number) => pt * PX
const FONT_ZH = `"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif`
const FONT_TITLE = FONT_ZH
const FONT_PY = `Arial,"Helvetica Neue",Helvetica,sans-serif`

function shadow(theme: Theme): string | undefined {
  if (!theme.shadow) return undefined
  const { color, opacity } = theme.shadow
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).join(',')
  return `0 4px 18px rgba(${rgb},${opacity}), 0 1px 2px rgba(${rgb},${opacity * 0.6})`
}

/** 字体描边, drawn behind the fill so it thickens the outside of each stroke like PowerPoint's. */
function stroke(theme: Theme, sizePt: number): { WebkitTextStroke?: string; paintOrder?: string } {
  const o = outlinePt(theme, sizePt)
  return o ? { WebkitTextStroke: `${px(o.widthPt)}px ${o.color}`, paintOrder: 'stroke fill' } : {}
}

/** The still frame for a theme: the JPEG itself, or a video theme's poster. */
export function posterSrc(theme: Theme): string {
  return theme.background.kind === 'video' ? theme.background.poster : theme.background.src
}

export function slideLabel(slide: Slide): string {
  if (slide.kind === 'title') return '标题'
  if (slide.kind === 'blank') return '空白'
  return slide.sectionLabel ?? '歌词'
}

/** A character picked on the slide: `line` indexes `slide.lines`, or is -1 for the title; `at` indexes that line's characters. */
export interface CharPick { line: number; at: number }

/**
 * `static` keeps thumbnails on the poster — dozens of playing videos at once is not worth it.
 * `onPickChar` makes each character clickable, for correcting it or its pinyin; `picked` rings the one being edited.
 */
export function SlideView({ slide, theme, static: isStatic = false, frameClassName = 'rounded-lg', onPickChar, picked }: {
  slide: Slide; theme: Theme; static?: boolean; frameClassName?: string; onPickChar?: (pick: CharPick) => void; picked?: CharPick | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setScale((e?.contentRect.width ?? 1920) / 1920))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const sh = shadow(theme)
  const lay = slide.kind === 'lyrics' ? layoutSlide(slide.lines, theme, slide.fit) : null
  const meta = slide.kind === 'title' && slide.meta ? layoutMeta(slide.meta, theme) : null
  const title = slide.kind === 'title' && slide.titleLine ? layoutTitle(slide.titleLine, theme) : null
  const video = !isStatic && theme.background.kind === 'video' ? theme.background : null
  const pickable = (line: number, at: number | undefined, zh: string) => {
    if (!onPickChar || at === undefined || !/\p{Script=Han}/u.test(zh)) return {}
    const on = picked?.line === line && picked.at === at
    return {
      role: 'button', tabIndex: 0, 'aria-label': `改“${zh}”`,
      onClick: () => onPickChar({ line, at }),
      onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPickChar({ line, at }) } },
      className: cx('cursor-pointer rounded-[12px] outline-offset-4 transition-colors hover:bg-white/15', on ? 'bg-white/20 outline-4 outline-white/80' : 'outline-transparent'),
    }
  }
  return (
    <div ref={ref} className={`relative aspect-video w-full overflow-hidden bg-black ${frameClassName}`}>
      <div style={{ width: 1920, height: px(SLIDE_H_PT), transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', inset: 0, WebkitTextSizeAdjust: 'none', textSizeAdjust: 'none', backgroundImage: `url(${posterSrc(theme)})`, backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: FONT_ZH }}>
        {video && (
          <video src={video.src} poster={video.poster} autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {slide.kind === 'title' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {title ? (
              // each syllable centred over its own character, as on every lyric line
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                {title.cells.map((cell, ci) => (
                  <div key={ci} {...pickable(-1, cell.at, cell.zh)} style={{ width: px(cell.widthPt), marginRight: cell.gapAfter && ci < title.cells.length - 1 ? px(0.3 * title.zhPt) : 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {cell.py && <span style={{ fontFamily: FONT_PY, fontSize: px(title.pyPt), lineHeight: 1, color: theme.colors.pinyin, textShadow: sh, whiteSpace: 'nowrap', marginBottom: px(4), ...stroke(theme, title.pyPt) }}>{cell.py}</span>}
                    <span style={{ fontFamily: FONT_TITLE, fontSize: px(title.zhPt), lineHeight: 1.1, fontWeight: 700, color: theme.colors.title, textShadow: sh, whiteSpace: 'nowrap', ...stroke(theme, title.zhPt) }}>{cell.zh}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {slide.titlePinyin && <div style={{ fontFamily: FONT_PY, fontSize: px(theme.sizes.titlePinyin), letterSpacing: '.06em', color: theme.colors.pinyin, textShadow: sh, marginBottom: px(8) }}>{slide.titlePinyin}</div>}
                <div style={{ fontFamily: FONT_TITLE, fontSize: px(theme.sizes.title), fontWeight: 700, letterSpacing: '.08em', color: theme.colors.title, textShadow: sh }}>{slide.title}</div>
              </>
            )}
            <div style={{ width: 220, height: 3, borderRadius: 2, background: theme.colors.rule, opacity: 0.9, marginTop: px(16) }} />
            {meta && (
              <div style={{ fontFamily: FONT_PY, fontSize: px(meta.pt), lineHeight: META_LINE, letterSpacing: '.22em', textAlign: 'center', whiteSpace: 'nowrap', marginTop: px(20), opacity: 0.85, color: theme.colors.meta }}>
                {meta.lines.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        )}
        {slide.kind === 'lyrics' && lay && (
          <>
            {slide.sectionLabel && (
              <div style={{ position: 'absolute', top: px(BADGE.topPt), left: px(BADGE.leftPt), height: px(BADGE.heightPt), display: 'flex', alignItems: 'center', fontFamily: FONT_PY, fontSize: px(theme.sizes.badge), letterSpacing: `${BADGE.tracking}em`, padding: `0 ${px(BADGE.padPt)}px`, border: `1.5px solid ${theme.colors.badge}55`, background: `${theme.colors.badge}1f`, borderRadius: 999, color: theme.colors.badge }}>{slide.sectionLabel}</div>
            )}
            {lay.rows.map((row, ri) => (
              <div key={ri} style={{ position: 'absolute', display: 'flex', left: px(CONTENT_X_PT + (CONTENT_W_PT - row.widthPt) / 2), top: px(row.topPt ?? lay.topPt + ri * (lay.rowHeightPt + lay.rowGapPt)), height: px(row.heightPt ?? lay.rowHeightPt) }}>
                {row.cells.map((cell, ci) => (
                  <div key={ci} {...pickable(row.line ?? 0, cell.at, cell.zh)} style={{ width: px(cell.widthPt), marginRight: cell.gapAfter && ci < row.cells.length - 1 ? px(0.5 * lay.zhPt) : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'center' }}>
                    {cell.py && <span style={{ fontFamily: FONT_PY, fontSize: px(lay.pyPt), lineHeight: 1, color: theme.colors.pinyin, textShadow: sh, whiteSpace: 'nowrap', ...stroke(theme, lay.pyPt) }}>{cell.py}</span>}
                    <span style={{ fontFamily: FONT_ZH, fontSize: px(lay.zhPt), lineHeight: 1.05, fontWeight: 700, color: theme.colors.zh, textShadow: sh, whiteSpace: 'nowrap', ...stroke(theme, lay.zhPt) }}>{cell.zh}</span>
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
