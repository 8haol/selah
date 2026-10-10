import type { LyricLine, SlideFit, TextAnchor, Theme } from './types'
import { isChinese } from './pinyin'

export const SLIDE_W_PT = 720
export const SLIDE_H_PT = 405
export const CONTENT_X_PT = 36
export const CONTENT_W_PT = 648
/** Below the section badge (18–37pt), so a full slide never runs into it. */
export const CONTENT_TOP_PT = 40
// as far from the bottom as the top is from the top, so a full slide centres on the picture
export const CONTENT_BOTTOM_PT = SLIDE_H_PT - CONTENT_TOP_PT
export const MAX_SCALE = 64 / 45
/** Floor for the emergency shrink: below this, projected lyrics stop being readable. */
export const MIN_SCALE = 0.6
const SCALE_STEP = 0.02
/** Pinyin at half the character's size: an annotation, not a second lyric line. */
export const PINYIN_RATIO = 0.5
const BASE_ZH_PT = 45
const DEFAULT_ROW_GAP = 16
/** Lyrics centre on the middle of the picture, not of the space under the badge. */
const MIDDLE_PT = SLIDE_H_PT / 2

/** `at` is the index in `[...line.zh]` of the cell's first character. */
export interface Cell { zh: string; py: string; widthPt: number; gapAfter?: boolean; at?: number }
/**
 * `line` is the index into the slide's lines that the row came from. A laid-out
 * row also carries its own box: a row with no Chinese (an English lyric) has no
 * pinyin to make room for, so it is only as tall as its words.
 */
export interface Row { cells: Cell[]; widthPt: number; line?: number; topPt?: number; heightPt?: number }
export interface SlideLayout { scale: number; zhPt: number; pyPt: number; rowHeightPt: number; rowGapPt: number; rows: Row[]; blockHeightPt: number; topPt: number }

const ARIAL_EM: Record<string, number> = {
  i: 0.222, l: 0.222, j: 0.222, t: 0.278, f: 0.278, r: 0.333, "'": 0.191, m: 0.833, w: 0.722,
  s: 0.5, v: 0.5, x: 0.5, y: 0.5, z: 0.5, c: 0.5, k: 0.5, ' ': 0.278,
}
const PUNCT = new Set([...'，。！？、；：,.!?;:\'"“”‘’（）()'])

export function measureLatinPt(text: string, sizePt: number): number {
  const plain = text.normalize('NFD').replace(/\p{M}/gu, '')
  let em = 0
  for (const ch of plain) {
    if (ch in ARIAL_EM) em += ARIAL_EM[ch]!
    else if (/[A-Z]/.test(ch)) em += 0.667
    else em += 0.556
  }
  return em * sizePt
}

type RawCell = { zh: string; py: string; gapAfter?: boolean; at: number }

export function cellsFor(line: LyricLine): RawCell[] {
  const chars = [...line.zh]
  const cells: RawCell[] = []
  let latin: RawCell | null = null
  let pendingGap = false
  chars.forEach((ch, i) => {
    if (PUNCT.has(ch) || ch === ' ') {
      if (cells.length > 0) pendingGap = true
      latin = null
      return
    }
    if (pendingGap) cells[cells.length - 1]!.gapAfter = true
    pendingGap = false
    if (isChinese(ch)) { latin = null; cells.push({ zh: ch, py: line.pinyin[i] ?? '', at: i }); return }
    if (latin) { latin.zh += ch; return }
    latin = { zh: ch, py: '', at: i }
    cells.push(latin)
  })
  return cells
}

function zhWidthPt(zh: string, zhPt: number): number {
  let w = 0
  for (const ch of zh) {
    if (isChinese(ch)) w += zhPt
    else if (PUNCT.has(ch) && ch.charCodeAt(0) > 0x2000) w += 0.5 * zhPt   // full-width punctuation
    else w += measureLatinPt(ch, zhPt)
  }
  return w
}

/**
 * The characters set the rhythm of a row: every cell is one character wide
 * plus a little air. Only a syllable too long for that (shāng, kuáng) widens
 * its cell, and then just enough to keep a small space between it and the
 * next syllable so the pinyin never runs together.
 */
export function cellWidthPt(cell: { zh: string; py: string }, zhPt: number, pyPt: number): number {
  const py = measureLatinPt(cell.py, pyPt)
  return Math.max(zhWidthPt(cell.zh, zhPt) + 0.18 * zhPt, py > 0 ? py + 0.25 * pyPt : 0)
}

/**
 * Split a line into the fewest rows that fit, then choose where the rows break:
 * at a comma or space when one is available, otherwise wherever the rows come
 * out closest to even. "每个伤心失望里你爱我爱到底" breaks 7 / 6, not 6 / 7
 * after whatever happened to fill the first row.
 */
export function wrapLine(line: LyricLine, zhPt: number, pyPt: number, maxWidthPt = CONTENT_W_PT): Row[] {
  const gapPt = 0.5 * zhPt
  const cells: Cell[] = cellsFor(line).map((cell) => ({ ...cell, widthPt: cellWidthPt(cell, zhPt, pyPt) }))
  const rowOf = (from: number, to: number): Row => {
    const slice = cells.slice(from, to)
    return {
      cells: slice,
      widthPt: slice.reduce((width, cell, index) => width + cell.widthPt + (cell.gapAfter && index < slice.length - 1 ? gapPt : 0), 0),
    }
  }
  const n = cells.length
  if (n === 0) return []
  if (rowOf(0, n).widthPt <= maxWidthPt) return [rowOf(0, n)]

  // fewest rows: greedy fill is optimal for that
  let rowsNeeded = 0
  for (let at = 0; at < n; rowsNeeded += 1) {
    let end = at + 1
    while (end < n && rowOf(at, end + 1).widthPt <= maxWidthPt) end += 1
    at = end
  }

  const total = rowOf(0, n).widthPt
  const target = total / rowsNeeded
  // Breaking mid-phrase costs as much as a row 35% of the slide off balance.
  const midPhrase = (0.35 * maxWidthPt) ** 2
  // best[r][j]: cheapest way to set cells [0, j) as r rows; from[r][j] its last break
  const best = Array.from({ length: rowsNeeded + 1 }, () => new Array<number>(n + 1).fill(Infinity))
  const from = Array.from({ length: rowsNeeded + 1 }, () => new Array<number>(n + 1).fill(-1))
  best[0]![0] = 0
  for (let r = 1; r <= rowsNeeded; r += 1) {
    for (let j = 1; j <= n; j += 1) {
      for (let i = j - 1; i >= r - 1; i -= 1) {
        const row = rowOf(i, j)
        if (row.widthPt > maxWidthPt && j - i > 1) break
        const prev = best[r - 1]![i]!
        if (prev === Infinity) continue
        const breakCost = j < n && !cells[j - 1]!.gapAfter ? midPhrase : 0
        // Near a tie, the upper row keeps the extra character: a phrase's last
        // word (里, 的) stays with the words before it.
        const topHeavy = j < n ? -zhPt * row.widthPt : 0
        const cost = prev + (target - row.widthPt) ** 2 + breakCost + topHeavy
        if (cost < best[r]![j]!) { best[r]![j] = cost; from[r]![j] = i }
      }
    }
  }
  const rows: Row[] = []
  for (let r = rowsNeeded, j = n; r > 0; r -= 1) {
    const i = from[r]![j]!
    rows.unshift(rowOf(i, j))
    j = i
  }
  return rows
}

export function rowHeightPt(zhPt: number, pyPt: number): number {
  return zhPt * 1.02 + pyPt * 0.98
}

/** Height of a row with no pinyin above it. */
export function bareRowHeightPt(zhPt: number): number {
  return zhPt * 1.02
}

const hasChinese = (row: Row) => row.cells.some((cell) => [...cell.zh].some(isChinese))

function pyFor(zhPt: number): number { return Math.round(zhPt * PINYIN_RATIO * 2) / 2 }

function attempt(lines: LyricLine[], scale: number, gap: number, fixedTop?: number): SlideLayout {
  const zhPt = BASE_ZH_PT * scale
  const pyPt = pyFor(zhPt)
  const rh = rowHeightPt(zhPt, pyPt)
  const rowGapPt = gap * scale
  const wrapped = lines.flatMap((l, line) => wrapLine(l, zhPt, pyPt).map((row) => ({ ...row, line, heightPt: hasChinese(row) ? rh : bareRowHeightPt(zhPt) })))
  const blockHeightPt = wrapped.reduce((h, row) => h + row.heightPt, 0) + Math.max(0, wrapped.length - 1) * rowGapPt
  const topPt = fixedTop ?? centredTop(blockHeightPt)
  let y = topPt
  const rows = wrapped.map((row) => {
    const placed = { ...row, topPt: y }
    y += row.heightPt + rowGapPt
    return placed
  })
  return { scale, zhPt, pyPt, rowHeightPt: rh, rowGapPt, rows, blockHeightPt, topPt }
}

/** Centred on the picture, but never above the content top or off the bottom. */
function centredTop(blockHeightPt: number): number {
  const top = MIDDLE_PT - blockHeightPt / 2
  return Math.max(CONTENT_TOP_PT, Math.min(top, CONTENT_BOTTOM_PT - blockHeightPt))
}

/**
 * With a fit (every slide built since per-song sizing) the size and first-row
 * height are the song's, decided once in `songFit`. Without one the slide finds
 * its own largest size, as decks saved before it did.
 */
export function layoutSlide(lines: LyricLine[], theme: Theme, fit?: SlideFit): SlideLayout {
  if (fit) return attempt(lines, fit.scale, fit.rowGap, fit.topPt)
  return freeLayout(lines, theme)
}

function freeLayout(lines: LyricLine[], theme: Theme): SlideLayout {
  const contentH = CONTENT_BOTTOM_PT - CONTENT_TOP_PT
  const gap = theme.rowGap ?? DEFAULT_ROW_GAP
  // 大字 lifts both the ceiling and the comfortable floor, so a slide that
  // already fit at scale 1 comes back larger instead of unchanged.
  const t = theme.textScale ?? 1
  const ceil = MAX_SCALE * t
  const floor = t
  const maxRows = Math.min(theme.maxLinesPerSlide, lines.reduce((n, line) => n + countRows(line, theme), 0))
  for (let scale = ceil; scale >= floor - 1e-9; scale -= SCALE_STEP) {
    const lay = attempt(lines, Math.max(floor, scale), gap)
    if (lay.rows.length <= maxRows && lay.blockHeightPt <= contentH) return lay
  }
  // At the floor, close the gap only as far as it takes: 宽松 on a full slide
  // comes out as loose as the slide allows, not squeezed shut.
  for (let g = gap - 1; g >= 0; g -= 1) {
    const lay = attempt(lines, floor, g)
    if (lay.rows.length <= maxRows && lay.blockHeightPt <= contentH) return lay
  }
  const tight = attempt(lines, floor, 0)
  if (tight.blockHeightPt <= contentH) return tight
  // A single line wrapping to more rows than the slide allows: shrink past the
  // 45pt floor rather than let the block run off the bottom of the slide.
  const steps = Math.round((floor - MIN_SCALE) / SCALE_STEP)
  for (let i = 1; i <= steps; i += 1) {
    const scale = Math.max(MIN_SCALE, Number((floor - i * SCALE_STEP).toFixed(4)))
    const lay = attempt(lines, scale, 0)
    if (lay.blockHeightPt <= contentH || scale === MIN_SCALE) return lay
  }
  // Unreachable: the loop always reaches scale === MIN_SCALE on its last
  // iteration (steps >= 1) and returns there. Kept only to satisfy TS's
  // control-flow analysis of the for loop.
  return attempt(lines, MIN_SCALE, 0)
}

/**
 * One size for the whole song: the largest every one of its slides can take,
 * which is the fullest slide's. With `top`, the first row sits where it does on
 * that fullest slide, centred on the picture, so turning the page never moves
 * the text up or down.
 */
export function songFit(pages: LyricLine[][], theme: Theme, anchor: TextAnchor = 'top'): SlideFit | undefined {
  const free = pages.map((lines) => freeLayout(lines, theme))
  if (free.length === 0) return undefined
  const scale = Math.min(...free.map((l) => l.scale))
  const rowGap = Math.min(...free.map((l) => l.rowGapPt / l.scale))
  if (anchor === 'center') return { scale, rowGap }
  const tallest = Math.max(...pages.map((lines) => attempt(lines, scale, rowGap).blockHeightPt))
  return { scale, rowGap, topPt: centredTop(tallest) }
}

/** The section badge: a small pill tucked into the top-left corner. */
export const BADGE = { topPt: 18, leftPt: 24, heightPt: 19, padPt: 7, tracking: 0.2 } as const

/** The song's name in the bottom-right corner: the badge's mirror image, as small and as far from the edges. */
export const FOOTER = { rightPt: BADGE.leftPt, bottomPt: BADGE.topPt, heightPt: BADGE.heightPt, widthPt: SLIDE_W_PT / 2, opacity: 0.7 } as const

export function badgeWidthPt(label: string, sizePt: number): number {
  return measureLatinPt(label, sizePt) + [...label].length * BADGE.tracking * sizePt + 2 * BADGE.padPt
}

/** Where the artist line starts on a title slide, and its line height. */
export const META_TOP_PT = 300
export const META_LINE = 1.35

/** The stroke on one run of text, if the theme carries 字体描边. */
export function outlinePt(theme: Theme, sizePt: number): { color: string; widthPt: number } | null {
  return theme.outline ? { color: theme.outline.color, widthPt: Math.max(0.5, theme.outline.ratio * sizePt) } : null
}

export interface MetaLayout { pt: number; lines: string[] }

const META_MIN_PT = 11

/**
 * The artist line under a title, upper-cased: at the theme's size when it fits
 * on one line, otherwise shrunk and wrapped onto two, and cut with an ellipsis
 * only when even the smallest size runs past two lines. `spacing` is the
 * tracking the renderers add, as a fraction of the size.
 */
export function layoutMeta(text: string, theme: Theme, maxWidthPt = CONTENT_W_PT, spacing = 0.22): MetaLayout {
  const upper = text.toUpperCase()
  const width = (s: string, pt: number) => {
    let w = 0
    for (const ch of s) w += (isChinese(ch) || (PUNCT.has(ch) && ch.charCodeAt(0) > 0x2000) ? pt : measureLatinPt(ch, pt)) + spacing * pt
    return w
  }
  const wrap = (pt: number): string[] => {
    // break at spaces, or between any two characters of CJK
    const tokens = upper.match(/[\u3000-\u9fff\uff00-\uffef]|[^\s\u3000-\u9fff\uff00-\uffef]+\s*|\s+/g) ?? []
    const out: string[] = []
    let cur = ''
    for (const t of tokens) {
      if (cur && width((cur + t).trimEnd(), pt) > maxWidthPt) { out.push(cur.trimEnd()); cur = t.trimStart() }
      else cur += t
    }
    if (cur.trim()) out.push(cur.trimEnd())
    return out
  }
  const full = theme.sizes.meta
  if (width(upper, full) <= maxWidthPt) return { pt: full, lines: [upper] }
  for (let pt = full; pt >= META_MIN_PT; pt -= 0.5) {
    const lines = wrap(pt)
    if (lines.length <= 2) return { pt, lines }
  }
  const [first = '', ...rest] = wrap(META_MIN_PT)
  let second = rest.join(' ')
  while (second && width(`${second}…`, META_MIN_PT) > maxWidthPt) second = [...second].slice(0, -1).join('').trimEnd()
  return { pt: META_MIN_PT, lines: [first, `${second}…`] }
}

export interface TitleLayout { zhPt: number; pyPt: number; cells: Cell[]; widthPt: number }

/**
 * The title slide's one row: each character with its own pinyin centred above
 * it, like a lyric line, shrunk only as far as a long title needs to fit.
 */
export function layoutTitle(line: LyricLine, theme: Theme, maxWidthPt = CONTENT_W_PT): TitleLayout {
  const cells = cellsFor(line)
  const measure = (zhPt: number, pyPt: number) => {
    const sized = cells.map((cell) => ({ ...cell, widthPt: cellWidthPt(cell, zhPt, pyPt) }))
    const widthPt = sized.reduce((w, cell, i) => w + cell.widthPt + (cell.gapAfter && i < sized.length - 1 ? 0.3 * zhPt : 0), 0)
    return { zhPt, pyPt, cells: sized, widthPt }
  }
  const full = measure(theme.sizes.title, theme.sizes.titlePinyin)
  if (full.widthPt <= maxWidthPt) return full
  const k = maxWidthPt / full.widthPt
  return measure(theme.sizes.title * k, theme.sizes.titlePinyin * k)
}

/**
 * Rows the line takes at the smallest size a slide of this theme is set at —
 * 45pt, or 大字's larger floor. Counting at 45 under 大字 let a line that
 * wraps at the real size slip past the row budget.
 */
export function countRows(line: LyricLine, theme: Theme): number {
  const zhPt = BASE_ZH_PT * (theme.textScale ?? 1)
  return wrapLine(line, zhPt, pyFor(zhPt)).length
}

/** True when one lyric line alone wraps past the slide's row budget — the editor nudges the user to break it. */
export function lineNeedsBreak(line: LyricLine, theme: Theme): boolean {
  return countRows(line, theme) > theme.maxLinesPerSlide
}
