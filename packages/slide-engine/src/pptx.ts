import PptxGenJS from 'pptxgenjs'
import type { SlideDeck, Theme } from './types.js'
import { getTheme } from './themes.js'
import { layoutSlide, CONTENT_X_PT, CONTENT_W_PT } from './layout.js'

export interface RenderPptxOptions { backgroundDataUrl: string }

const SW = 10
const inch = (pt: number) => pt / 72
const hex = (c: string) => c.replace('#', '')

type TextProps = Parameters<PptxGenJS.Slide['addText']>[1]
type Shadow = NonNullable<NonNullable<TextProps>['shadow']>

function shadowOf(theme: Theme): Shadow | undefined {
  if (!theme.shadow) return undefined
  return { type: 'outer', color: hex(theme.shadow.color), blur: 10, offset: 3, angle: 90, opacity: theme.shadow.opacity }
}

function bgData(url: string): string {
  return url.startsWith('data:') ? url.slice('data:'.length) : url
}

export function deckFileName(deck: SlideDeck, titles: string[]): string {
  const date = deck.meta.generatedAt.slice(0, 10)
  const first = (titles[0] ?? 'Selah').replace(/[\\/:*?"<>|]/g, ' ').trim()
  const more = titles.length > 1 ? ` + ${titles.length - 1} 首` : ''
  return `${date} ${first}${more}.pptx`
}

export async function renderPptx(deck: SlideDeck, opts: RenderPptxOptions): Promise<PptxGenJS> {
  const theme = getTheme(deck.themeId)
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  const background = { data: bgData(opts.backgroundDataUrl) }
  const shadow = shadowOf(theme)

  for (const slide of deck.slides) {
    const s = pptx.addSlide()
    s.background = background
    if (slide.kind === 'blank') continue

    if (slide.kind === 'title') {
      s.addText(slide.title ?? '', { x: 0.5, y: 1.55, w: SW - 1, h: 1.35, fontFace: theme.fonts.title, fontSize: theme.sizes.title, bold: true, color: hex(theme.colors.title), align: 'center', valign: 'middle', charSpacing: 6, shadow, margin: 0 })
      s.addShape(pptx.ShapeType.rect, { x: SW / 2 - 1.15, y: 3.02, w: 2.3, h: 0.035, fill: { color: hex(theme.colors.rule) }, line: { color: hex(theme.colors.rule), width: 0 } })
      if (slide.titlePinyin) s.addText(slide.titlePinyin, { x: 0.5, y: 3.15, w: SW - 1, h: 0.6, fontFace: theme.fonts.pinyin, fontSize: theme.sizes.titlePinyin, color: hex(theme.colors.pinyin), align: 'center', valign: 'middle', charSpacing: 2, margin: 0 })
      if (slide.meta) s.addText(slide.meta.toUpperCase(), { x: 0.5, y: 3.95, w: SW - 1, h: 0.4, fontFace: theme.fonts.pinyin, fontSize: theme.sizes.meta, color: hex(theme.colors.meta), align: 'center', valign: 'middle', charSpacing: 4, margin: 0 })
      continue
    }

    if (slide.sectionLabel) {
      s.addText(slide.sectionLabel, {
        x: 0.5, y: 0.38, w: 1.55, h: 0.36, fontFace: theme.fonts.pinyin, fontSize: theme.sizes.badge, color: hex(theme.colors.badge), align: 'center', valign: 'middle', charSpacing: 5, margin: 0,
        shape: pptx.ShapeType.roundRect, rectRadius: 0.18,
        fill: { color: hex(theme.colors.badge), transparency: 88 }, line: { color: hex(theme.colors.badge), width: 1, transparency: 60 },
      })
    }

    const lay = layoutSlide(slide.lines, theme)
    lay.rows.forEach((row, ri) => {
      const y = lay.topPt + ri * (lay.rowHeightPt + lay.rowGapPt)
      let x = CONTENT_X_PT + (CONTENT_W_PT - row.widthPt) / 2
      for (const cell of row.cells) {
        const zhRun = { text: cell.zh, options: { fontFace: theme.fonts.zh, fontSize: lay.zhPt, bold: true, color: hex(theme.colors.zh), shadow } }
        const runs = cell.py
          ? [{ text: cell.py, options: { fontFace: theme.fonts.pinyin, fontSize: lay.pyPt, color: hex(theme.colors.pinyin), breakLine: true } }, zhRun]
          : [zhRun]
        s.addText(runs, { x: inch(x), y: inch(y), w: inch(cell.widthPt), h: inch(lay.rowHeightPt), margin: 0, align: 'center', valign: 'bottom', fit: 'none' })
        x += cell.widthPt
      }
    })
  }
  return pptx
}
