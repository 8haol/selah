import type { LyricLine, Theme } from './types.js'
import { isChinese } from './pinyin.js'

export const SLIDE_W_PT = 720
export const SLIDE_H_PT = 405
export const CONTENT_X_PT = 36
export const CONTENT_W_PT = 648
export const CONTENT_TOP_PT = 56
export const CONTENT_BOTTOM_PT = 389
export const MAX_SCALE = 64 / 45
export const PINYIN_RATIO = 35 / 45
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

export function cellWidthPt(cell: { zh: string; py: string }, zhPt: number, pyPt: number): number {
  return Math.max(zhWidthPt(cell.zh, zhPt), measureLatinPt(cell.py, pyPt)) + 0.15 * zhPt
}

export function wrapLine(line: LyricLine, zhPt: number, pyPt: number, maxWidthPt = CONTENT_W_PT): Row[] {
  const gapPt = 0.5 * zhPt
  const rowOf = (cells: Cell[]): Row => ({
    cells,
    widthPt: cells.reduce((width, cell, index) => width + cell.widthPt + (cell.gapAfter && index < cells.length - 1 ? gapPt : 0), 0),
  })
  const rows: Row[] = []
  const remaining: Cell[] = cellsFor(line).map((cell) => ({ ...cell, widthPt: cellWidthPt(cell, zhPt, pyPt) }))
  while (remaining.length > 0) {
    let fitCount = 1
    while (fitCount < remaining.length && rowOf(remaining.slice(0, fitCount + 1)).widthPt <= maxWidthPt) fitCount += 1
    if (fitCount === remaining.length) {
      rows.push(rowOf(remaining.splice(0)))
      break
    }

    let breakAfter = -1
    for (let index = 1; index < fitCount; index += 1) {
      if (remaining[index]!.gapAfter) breakAfter = index
    }
    const rowLength = breakAfter >= 1 ? breakAfter + 1 : fitCount
    rows.push(rowOf(remaining.splice(0, rowLength)))
  }
  return rows
}

export function rowHeightPt(zhPt: number, pyPt: number): number {
  return zhPt * 1.05 + pyPt * 1.0
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
  const maxRows = Math.min(theme.maxLinesPerSlide, lines.flatMap((line) => wrapLine(line, BASE_ZH_PT, pyFor(BASE_ZH_PT))).length)
  for (let scale = MAX_SCALE; scale >= 1 - 1e-9; scale -= 0.02) {
    const lay = attempt(lines, Math.max(1, scale), 8)
    if (lay.rows.length <= maxRows && lay.blockHeightPt <= contentH) return lay
  }
  const tight = attempt(lines, 1, 0)
  return tight
}

export function countRows(line: LyricLine, theme: Theme): number {
  void theme
  return wrapLine(line, BASE_ZH_PT, pyFor(BASE_ZH_PT)).length
}
