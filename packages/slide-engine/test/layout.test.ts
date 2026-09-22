import { describe, it, expect } from 'vitest'
import { cellsFor, cellWidthPt, measureLatinPt, wrapLine, layoutSlide, countRows, CONTENT_W_PT, MAX_SCALE, rowHeightPt } from '../src/layout.js'
import { getTheme } from '../src/themes.js'
import { annotateLine } from '../src/pinyin.js'
import type { LyricLine } from '../src/types.js'

const L = (zh: string): LyricLine => ({ zh, pinyin: annotateLine(zh) })
const night = getTheme('night')

describe('cellsFor', () => {
  it('one cell per Chinese character and drops trailing punctuation', () => {
    const cells = cellsFor(L('我必不致缺乏，'))
    expect(cells.map((c) => c.zh)).toEqual(['我', '必', '不', '致', '缺', '乏'])
    expect(cells[5]!.py).toBe('fá')
    expect(cells[5]!.gapAfter).toBeFalsy()
  })
  it('groups consecutive non-Chinese into one cell and marks separator gaps', () => {
    const cells = cellsFor(L('哈利路亚 Amen 阿们'))
    expect(cells.map((c) => c.zh)).toEqual(['哈', '利', '路', '亚', 'Amen', '阿', '们'])
    expect(cells[3]!.gapAfter).toBe(true)
    expect(cells[4]!.gapAfter).toBe(true)
    expect(cells[4]!.py).toBe('')
  })
})

describe('measureLatinPt / cellWidthPt', () => {
  it('measures with the Arial table and ignores tone marks', () => {
    expect(measureLatinPt('ill', 100)).toBeCloseTo(66.6, 1)
    expect(measureLatinPt('shàng', 35)).toBeCloseTo(measureLatinPt('shang', 35), 5)
  })
  it('cell width is the wider of glyph and pinyin plus breathing room', () => {
    const w = cellWidthPt({ zh: '上', py: 'shàng' }, 45, 35)
    expect(w).toBeGreaterThan(45 + 0.15 * 45)
    expect(w).toBeCloseTo(measureLatinPt('shang', 35) + 0.15 * 45, 5)
    expect(cellWidthPt({ zh: '一', py: 'yī' }, 45, 35)).toBeCloseTo(45 + 0.15 * 45, 5)
  })
})

describe('wrapLine', () => {
  it('keeps a short line on one row', () => {
    expect(wrapLine(L('我必不致缺乏'), 45, 35).length).toBe(1)
  })
  it('wraps a line that exceeds the content width', () => {
    const rows = wrapLine(L('他使我躺卧在青草地上领我在可安歇的水边'), 45, 35)
    expect(rows.length).toBeGreaterThanOrEqual(2)
    for (const r of rows) expect(r.widthPt).toBeLessThanOrEqual(CONTENT_W_PT)
    expect(rows.flatMap((r) => r.cells).map((c) => c.zh).join('')).toBe('他使我躺卧在青草地上领我在可安歇的水边')
  })
  it('prefers a punctuation gap when wrapping', () => {
    const rows = wrapLine(L('我虽然行过死荫的幽谷，也不怕遭害'), 45, 35, CONTENT_W_PT)
    expect(rows.length).toBeGreaterThan(1)
    expect(rows[0]!.cells.at(-1)!.zh).toBe('谷')
  })
  it('never extends a row past the fitting prefix to reach punctuation', () => {
    const rows = wrapLine(L('一二三四五六七八九十一二三四五六七八九十，然后'), 45, 35, 300)
    const expected = '一二三四五六七八九十一二三四五六七八九十然后'

    expect([...expected]).toHaveLength(22)
    for (const row of rows) expect(row.widthPt).toBeLessThanOrEqual(300)
    expect(rows.flatMap((row) => row.cells).map((cell) => cell.zh).join('')).toBe(expected)
  })
})

describe('layoutSlide', () => {
  it('enlarges a two-line slide above the minimum size', () => {
    const lay = layoutSlide([L('他使我的灵魂苏醒'), L('为自己的名引导我走义路')], night)
    expect(lay.scale).toBeGreaterThan(1)
    expect(lay.scale).toBeLessThanOrEqual(MAX_SCALE)
    expect(lay.zhPt).toBeCloseTo(45 * lay.scale, 5)
    expect(lay.pyPt).toBeCloseTo(Math.round(lay.zhPt * (35 / 45) * 2) / 2, 5)
    expect(lay.rows.length).toBe(2)
  })
  it('never goes below 45/35 and keeps four short rows at scale 1', () => {
    const lay = layoutSlide([L('一二三四五六七'), L('一二三四五六七'), L('一二三四五六七'), L('一二三四五六七')], night)
    expect(lay.scale).toBeGreaterThanOrEqual(1)
    expect(lay.zhPt).toBeGreaterThanOrEqual(45)
    expect(lay.rows.length).toBe(4)
    expect(lay.blockHeightPt).toBeLessThanOrEqual(389 - 56 + 0.001)
  })
  it('rowHeightPt is zh*1.05 + py', () => { expect(rowHeightPt(45, 35)).toBeCloseTo(45 * 1.05 + 35, 5) })
  it('countRows reports wrapped rows at scale 1', () => {
    expect(countRows(L('我必不致缺乏'), night)).toBe(1)
    expect(countRows(L('他使我躺卧在青草地上领我在可安歇的水边'), night)).toBeGreaterThanOrEqual(2)
  })
})
