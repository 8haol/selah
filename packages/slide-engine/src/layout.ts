import type { LyricLine, Theme } from './types'
import { isChinese } from './pinyin'

export const SLIDE_W_PT = 720
export const SLIDE_H_PT = 405
export const CONTENT_X_PT = 36
export const CONTENT_W_PT = 648
export const CONTENT_TOP_PT = 48
export const CONTENT_BOTTOM_PT = 393
export const MAX_SCALE = 64 / 45
/** Floor for the emergency shrink: below this, projected lyrics stop being readable. */
export const MIN_SCALE = 0.6
const SCALE_STEP = 0.02
/** Pinyin at half the character's size: an annotation, not a second lyric line. */
export const PINYIN_RATIO = 0.5
const BASE_ZH_PT = 45

export interface Cell { zh: string; py: string; widthPt: number; gapAfter?: boolean }
export interface Row { cells: Cell[]; widthPt: number }
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

export function cellsFor(line: LyricLine): Array<{ zh: string; py: string; gapAfter?: boolean }> {
  const chars = [...line.zh]
  const cells: Array<{ zh: string; py: string; gapAfter?: boolean }> = []
  let latin: { zh: string; py: string; gapAfter?: boolean } | null = null
  let pendingGap = false
  chars.forEach((ch, i) => {
    if (PUNCT.has(ch) || ch === ' ') {
      if (cells.length > 0) pendingGap = true
      latin = null
      return
    }
    if (pendingGap) cells[cells.length - 1]!.gapAfter = true
    pendingGap = false
    if (isChinese(ch)) { latin = null; cells.push({ zh: ch, py: line.pinyin[i] ?? '' }); return }
    if (latin) { latin.zh += ch; return }
    latin = { zh: ch, py: '' }
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

function pyFor(zhPt: number): number { return Math.round(zhPt * PINYIN_RATIO * 2) / 2 }

function attempt(lines: LyricLine[], scale: number, gap: number): SlideLayout {
  const zhPt = BASE_ZH_PT * scale
  const pyPt = pyFor(zhPt)
  const rows = lines.flatMap((l) => wrapLine(l, zhPt, pyPt))
  const rh = rowHeightPt(zhPt, pyPt)
  const rowGapPt = gap * scale
  const blockHeightPt = rows.length * rh + Math.max(0, rows.length - 1) * rowGapPt
  const contentH = CONTENT_BOTTOM_PT - CONTENT_TOP_PT
  const topPt = Math.max(CONTENT_TOP_PT, CONTENT_TOP_PT + (contentH - blockHeightPt) / 2)
  return { scale, zhPt, pyPt, rowHeightPt: rh, rowGapPt, rows, blockHeightPt, topPt }
}

export function layoutSlide(lines: LyricLine[], theme: Theme): SlideLayout {
  const contentH = CONTENT_BOTTOM_PT - CONTENT_TOP_PT
  // 大字 lifts both the ceiling and the comfortable floor, so a slide that
  // already fit at scale 1 comes back larger instead of unchanged.
  const t = theme.textScale ?? 1
  const ceil = MAX_SCALE * t
  const floor = t
  const maxRows = Math.min(theme.maxLinesPerSlide, lines.flatMap((line) => wrapLine(line, BASE_ZH_PT, pyFor(BASE_ZH_PT))).length)
  for (let scale = ceil; scale >= floor - 1e-9; scale -= SCALE_STEP) {
    const lay = attempt(lines, Math.max(floor, scale), 16)
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

export function countRows(line: LyricLine, theme: Theme): number {
  void theme
  return wrapLine(line, BASE_ZH_PT, pyFor(BASE_ZH_PT)).length
}

/** True when one lyric line alone wraps past the slide's row budget — the editor nudges the user to break it. */
export function lineNeedsBreak(line: LyricLine, theme: Theme): boolean {
  return countRows(line, theme) > theme.maxLinesPerSlide
}
