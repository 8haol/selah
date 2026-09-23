import PptxGenJS from 'pptxgenjs'
import JSZip from 'jszip'
import type { SlideDeck, Theme } from './types'
import { getTheme, slideTheme } from './themes'
import { layoutMeta, layoutSlide, layoutTitle, outlinePt, badgeWidthPt, rowHeightPt, BADGE, CONTENT_X_PT, CONTENT_W_PT, META_LINE, META_TOP_PT, SLIDE_W_PT } from './layout'
import { dedupeMedia, injectVideoTiming } from './pptx-post'

export interface ThemeAssets {
  /** JPEG data URL: the image theme's background, or the video theme's poster. */
  backgroundDataUrl: string
  /** MP4 data URL. Required for video themes, ignored for image themes. */
  videoDataUrl?: string
}

export interface RenderAssets extends ThemeAssets {
  /**
   * themeId → that theme's assets, for a deck whose songs use different
   * themes. The top-level pair stays the deck theme's, so a single-theme
   * render passes exactly what it always did.
   */
  byTheme?: Record<string, ThemeAssets>
}

/** Every themeId the deck actually projects with, deck theme first. */
export function deckThemeIds(deck: SlideDeck): string[] {
  const ids = new Set<string>([deck.themeId])
  for (const s of deck.slides) if (s.themeId) ids.add(s.themeId)
  return [...ids]
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

function assetsFor(deck: SlideDeck, assets: RenderAssets, themeId: string): ThemeAssets {
  if (themeId === deck.themeId) return assets
  const own = assets.byTheme?.[themeId]
  if (!own) throw new Error(`主题 "${getTheme(themeId).name}" 缺少素材`)
  return own
}

export async function renderPptx(deck: SlideDeck, assets: RenderAssets): Promise<PptxGenJS> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'

  // Resolve every theme's assets up front so a missing one fails before we
  // have written half a deck.
  const bg = new Map<string, { background: { data: string }; video: string | null }>()
  for (const themeId of deckThemeIds(deck)) {
    const t = getTheme(themeId)
    const own = assetsFor(deck, assets, themeId)
    if (t.background.kind === 'video' && !own.videoDataUrl) {
      throw new Error(`动态主题 "${t.name}" 需要提供视频文件`)
    }
    bg.set(themeId, {
      background: { data: bgData(own.backgroundDataUrl) },
      video: t.background.kind === 'video' ? bgData(own.videoDataUrl!) : null,
    })
  }

  for (const slide of deck.slides) {
    const themeId = slide.themeId ?? deck.themeId
    const theme = slideTheme(deck, slide)
    const newShadow = () => shadowOf(theme)
    const stroke = (sizePt: number) => {
      const o = outlinePt(theme, sizePt)
      return o ? { outline: { color: hex(o.color), size: o.widthPt } } : {}
    }
    const { background, video } = bg.get(themeId)!
    const s = pptx.addSlide()
    s.background = background
    // before every text box, so the clip sits at the back of the slide
    if (video) s.addMedia({ type: 'video', data: video, cover: background.data, x: 0, y: 0, w: SW, h: SH })
    if (slide.kind === 'blank') continue

    if (slide.kind === 'title') {
      if (slide.titleLine) {
        // one box per character, its pinyin centred above it — exactly as on a lyric line
        const t = layoutTitle(slide.titleLine, theme)
        const h = rowHeightPt(t.zhPt, t.pyPt)
        const bottom = 3.62 * 72
        let x = (SLIDE_W_PT - t.widthPt) / 2
        for (const [i, cell] of t.cells.entries()) {
          const zhRun = { text: cell.zh, options: { fontFace: theme.fonts.title, fontSize: t.zhPt, bold: true, color: hex(theme.colors.title), ...stroke(t.zhPt) } }
          const runs = cell.py
            ? [{ text: cell.py, options: { fontFace: theme.fonts.pinyin, fontSize: t.pyPt, color: hex(theme.colors.pinyin), breakLine: true, ...stroke(t.pyPt) } }, zhRun]
            : [zhRun]
          s.addText(runs, { x: inch(x), y: inch(bottom - h), w: inch(cell.widthPt), h: inch(h), margin: 0, align: 'center', valign: 'bottom', fit: 'none', wrap: false, shadow: newShadow() })
          x += cell.widthPt + (cell.gapAfter && i < t.cells.length - 1 ? 0.3 * t.zhPt : 0)
        }
      } else {
        // decks saved before titleLine existed: pinyin as one centred line above the title
        if (slide.titlePinyin) s.addText(slide.titlePinyin, { x: 0.5, y: 1.80, w: SW - 1, h: 0.55, fontFace: theme.fonts.pinyin, fontSize: theme.sizes.titlePinyin, color: hex(theme.colors.pinyin), align: 'center', valign: 'bottom', charSpacing: 2, shadow: newShadow(), margin: 0 })
        s.addText(slide.title ?? '', { x: 0.5, y: 2.32, w: SW - 1, h: 1.35, fontFace: theme.fonts.title, fontSize: theme.sizes.title, bold: true, color: hex(theme.colors.title), align: 'center', valign: 'middle', charSpacing: 6, shadow: newShadow(), margin: 0 })
      }
      s.addShape(pptx.ShapeType.rect, { x: SW / 2 - 1.15, y: 3.76, w: 2.3, h: 0.035, fill: { color: hex(theme.colors.rule) }, line: { color: hex(theme.colors.rule), width: 0 } })
      if (slide.meta) {
        // shrinks and wraps onto a second line rather than run off the slide
        const m = layoutMeta(slide.meta, theme)
        s.addText(m.lines.map((text, i) => ({ text, options: { breakLine: i < m.lines.length - 1 } })), {
          x: inch(CONTENT_X_PT), y: inch(META_TOP_PT), w: inch(CONTENT_W_PT), h: inch(m.lines.length * m.pt * META_LINE),
          fontFace: theme.fonts.pinyin, fontSize: m.pt, color: hex(theme.colors.meta), align: 'center', valign: 'top',
          charSpacing: 0.22 * m.pt, lineSpacingMultiple: 1.1, margin: 0, wrap: false, fit: 'none',
        })
      }
      continue
    }

    if (slide.sectionLabel) {
      s.addText(slide.sectionLabel, {
        x: inch(BADGE.leftPt), y: inch(BADGE.topPt), w: inch(badgeWidthPt(slide.sectionLabel, theme.sizes.badge)), h: inch(BADGE.heightPt),
        fontFace: theme.fonts.pinyin, fontSize: theme.sizes.badge, color: hex(theme.colors.badge), align: 'center', valign: 'middle',
        charSpacing: BADGE.tracking * theme.sizes.badge, margin: 0,
        shape: pptx.ShapeType.roundRect, rectRadius: inch(BADGE.heightPt / 2),
        fill: { color: hex(theme.colors.badge), transparency: 88 }, line: { color: hex(theme.colors.badge), width: 1, transparency: 60 },
      })
    }

    const lay = layoutSlide(slide.lines, theme, slide.fit)
    lay.rows.forEach((row, ri) => {
      const y = row.topPt ?? lay.topPt + ri * (lay.rowHeightPt + lay.rowGapPt)
      const h = row.heightPt ?? lay.rowHeightPt
      // a single cell can be wider than the content box; never start off the left edge
      let x = Math.max(CONTENT_X_PT, CONTENT_X_PT + (CONTENT_W_PT - row.widthPt) / 2)
      for (const [cellIndex, cell] of row.cells.entries()) {
        const zhRun = { text: cell.zh, options: { fontFace: theme.fonts.zh, fontSize: lay.zhPt, bold: true, color: hex(theme.colors.zh), ...stroke(lay.zhPt) } }
        const runs = cell.py
          ? [{ text: cell.py, options: { fontFace: theme.fonts.pinyin, fontSize: lay.pyPt, color: hex(theme.colors.pinyin), breakLine: true, ...stroke(lay.pyPt) } }, zhRun]
          : [zhRun]
        // `shadow` only takes effect on the text box — pptxgenjs drops it from a
        // run's options, which is why exported lyrics used to carry none at all.
        // On the box it covers the pinyin run and the character run together.
        s.addText(runs, { x: inch(x), y: inch(y), w: inch(cell.widthPt), h: inch(h), margin: 0, align: 'center', valign: 'bottom', fit: 'none', wrap: false, shadow: newShadow() })
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
  const pptx = await renderPptx(deck, assets)
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: 'uint8array' })) as Uint8Array)
  await dedupeMedia(zip)
  // One timing pass covers the deck; with mixed video themes the longest clip
  // sets it, so no slide cuts its own video short.
  const longest = deckThemeIds(deck)
    .map((id) => getTheme(id).background)
    .reduce((ms, b) => (b.kind === 'video' ? Math.max(ms, b.durationMs) : ms), 0)
  if (longest > 0) await injectVideoTiming(zip, longest)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
