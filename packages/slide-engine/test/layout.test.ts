import { describe, it, expect } from 'vitest'
import { cellsFor, cellWidthPt, measureLatinPt, wrapLine, layoutSlide, countRows, lineNeedsBreak, CONTENT_W_PT, MAX_SCALE, MIN_SCALE, rowHeightPt } from '../src/layout.js'
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
  it('cell width follows the character, widening only for a syllable that clearly outgrows it', () => {
    expect(cellWidthPt({ zh: '一', py: 'yī' }, 45, 22.5)).toBeCloseTo(45 + 0.18 * 45, 5)
    expect(cellWidthPt({ zh: '是', py: 'shì' }, 45, 22.5)).toBeCloseTo(45 + 0.18 * 45, 5)
    const wide = cellWidthPt({ zh: '庄', py: 'zhuāng' }, 45, 35)
    expect(wide).toBeCloseTo(measureLatinPt('zhuang', 35) + 0.25 * 35, 5)
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
  it('balances the rows instead of filling the first one', () => {
    const rows = wrapLine(L('每个伤心失望里你爱我爱到底'), 64, 32, 600)
    expect(rows.map((r) => r.cells.map((c) => c.zh).join(''))).toEqual(['每个伤心失望里', '你爱我爱到底'])
  })
  it('breaks at the space between phrases when there is one', () => {
    const rows = wrapLine(L('每个狂风暴雨里 你同在在那里'), 64, 32, 600)
    expect(rows.map((r) => r.cells.map((c) => c.zh).join(''))).toEqual(['每个狂风暴雨里', '你同在在那里'])
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
    expect(lay.pyPt).toBeCloseTo(Math.round(lay.zhPt * 0.5 * 2) / 2, 5)
    expect(lay.rows.length).toBe(2)
  })
  it('never goes below 45/35 and keeps four short rows at scale 1', () => {
    const lay = layoutSlide([L('一二三四五六七'), L('一二三四五六七'), L('一二三四五六七'), L('一二三四五六七')], night)
    expect(lay.scale).toBeGreaterThanOrEqual(1)
    expect(lay.zhPt).toBeGreaterThanOrEqual(45)
    expect(lay.rows.length).toBe(4)
    expect(lay.blockHeightPt).toBeLessThanOrEqual(393 - 64 + 0.001)
  })
  it('rowHeightPt is zh*1.02 + py*0.98', () => { expect(rowHeightPt(45, 35)).toBeCloseTo(45 * 1.02 + 35 * 0.98, 5) })
  it('countRows reports wrapped rows at scale 1', () => {
    expect(countRows(L('我必不致缺乏'), night)).toBe(1)
    expect(countRows(L('他使我躺卧在青草地上领我在可安歇的水边'), night)).toBeGreaterThanOrEqual(2)
  })
})

describe('a line too long to fit at all', () => {
  const long = L('一二三四五六七八九十'.repeat(8) + '一二')

  it('shrinks below scale 1, down to MIN_SCALE at worst, until the block fits', () => {
    expect([...long.zh]).toHaveLength(82)
    const lay = layoutSlide([long], night)
    expect(lay.scale).toBeLessThan(1)
    expect(lay.scale).toBeGreaterThanOrEqual(MIN_SCALE)
    expect(lay.blockHeightPt).toBeLessThanOrEqual(329)
  })

  it('lineNeedsBreak flags it and leaves a normal line alone', () => {
    expect(lineNeedsBreak(long, night)).toBe(true)
    expect(lineNeedsBreak(L('一二三四五六七八九十'), night)).toBe(false)
  })
})
