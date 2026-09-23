import PptxGenJS from 'pptxgenjs'
import JSZip from 'jszip'
import type { SlideDeck, Theme } from './types'
import { getTheme } from './themes'
import { layoutSlide, CONTENT_X_PT, CONTENT_W_PT } from './layout'
import { dedupeMedia, injectVideoTiming } from './pptx-post'

export interface RenderAssets {
  /** JPEG data URL: the image theme's background, or the video theme's poster. */
  backgroundDataUrl: string
  /** MP4 data URL. Required for video themes, ignored for image themes. */
  videoDataUrl?: string
}

/** @deprecated use {@link RenderAssets} */
export type RenderPptxOptions = RenderAssets

const SW = 10
const SH = 5.625
const inch = (pt: number) => pt / 72
const hex = (c: string) => c.replace('#', '')

type TextProps = Parameters<PptxGenJS.Slide['addText']>[1]
type Shadow = NonNullable<NonNullable<TextProps>['shadow']>

/**
 * A *fresh* shadow object per call. pptxgenjs converts `blur` / `offset` /
 * `angle` / `opacity` from points to EMU in place on the object it is handed,
 * so sharing one object across text boxes re-converts the already-converted
 * numbers: the second box gets blurRad 12700x too large, the third 12700x
 * again, and PowerPoint renders a black smear instead of a soft shadow.
 */
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

export async function renderPptx(deck: SlideDeck, assets: RenderAssets): Promise<PptxGenJS> {
  const theme = getTheme(deck.themeId)
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  const background = { data: bgData(assets.backgroundDataUrl) }
  const newShadow = () => shadowOf(theme)
  if (theme.background.kind === 'video' && !assets.videoDataUrl) {
    throw new Error(`动态主题 "${theme.name}" 需要提供视频文件`)
  }
  const video = theme.background.kind === 'video' ? bgData(assets.videoDataUrl!) : null

  for (const slide of deck.slides) {
    const s = pptx.addSlide()
    s.background = background
    // before every text box, so the clip sits at the back of the slide
    if (video) s.addMedia({ type: 'video', data: video, cover: background.data, x: 0, y: 0, w: SW, h: SH })
    if (slide.kind === 'blank') continue

    if (slide.kind === 'title') {
      // pinyin sits above the characters it annotates, exactly as on a lyric line
      if (slide.titlePinyin) s.addText(slide.titlePinyin, { x: 0.5, y: 1.80, w: SW - 1, h: 0.55, fontFace: theme.fonts.pinyin, fontSize: theme.sizes.titlePinyin, color: hex(theme.colors.pinyin), align: 'center', valign: 'bottom', charSpacing: 2, shadow: newShadow(), margin: 0 })
      s.addText(slide.title ?? '', { x: 0.5, y: 2.32, w: SW - 1, h: 1.35, fontFace: theme.fonts.title, fontSize: theme.sizes.title, bold: true, color: hex(theme.colors.title), align: 'center', valign: 'middle', charSpacing: 6, shadow: newShadow(), margin: 0 })
      s.addShape(pptx.ShapeType.rect, { x: SW / 2 - 1.15, y: 3.76, w: 2.3, h: 0.035, fill: { color: hex(theme.colors.rule) }, line: { color: hex(theme.colors.rule), width: 0 } })
      if (slide.meta) s.addText(slide.meta.toUpperCase(), { x: 0.5, y: 4.15, w: SW - 1, h: 0.4, fontFace: theme.fonts.pinyin, fontSize: theme.sizes.meta, color: hex(theme.colors.meta), align: 'center', valign: 'middle', charSpacing: 4, margin: 0 })
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
      // a single cell can be wider than the content box; never start off the left edge
      let x = Math.max(CONTENT_X_PT, CONTENT_X_PT + (CONTENT_W_PT - row.widthPt) / 2)
      for (const [cellIndex, cell] of row.cells.entries()) {
        const zhRun = { text: cell.zh, options: { fontFace: theme.fonts.zh, fontSize: lay.zhPt, bold: true, color: hex(theme.colors.zh) } }
        const runs = cell.py
          ? [{ text: cell.py, options: { fontFace: theme.fonts.pinyin, fontSize: lay.pyPt, color: hex(theme.colors.pinyin), breakLine: true } }, zhRun]
          : [zhRun]
        // `shadow` only takes effect on the text box — pptxgenjs drops it from a
        // run's options, which is why exported lyrics used to carry none at all.
        // On the box it covers the pinyin run and the character run together.
        s.addText(runs, { x: inch(x), y: inch(y), w: inch(cell.widthPt), h: inch(lay.rowHeightPt), margin: 0, align: 'center', valign: 'bottom', fit: 'none', wrap: false, shadow: newShadow() })
        x += cell.widthPt + (cell.gapAfter && cellIndex < row.cells.length - 1 ? 0.5 * lay.zhPt : 0)
      }
    })
  }
  return pptx
}

/**
 * The finished .pptx bytes. Every deck is post-processed so it carries one
 * shared copy of each background image (pptxgenjs stores one per slide), and
 * video decks additionally get one shared clip plus per-slide autoplay timing.
 */
export async function renderPptxBytes(deck: SlideDeck, assets: RenderAssets): Promise<Uint8Array> {
  const theme = getTheme(deck.themeId)
  const pptx = await renderPptx(deck, assets)
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: 'uint8array' })) as Uint8Array)
  await dedupeMedia(zip)
  if (theme.background.kind === 'video') await injectVideoTiming(zip, theme.background.durationMs)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
