import { describe, it, expect } from 'vitest'
import { paginateLines } from '../src/deck.js'
import { getTheme, tunedTheme } from '../src/themes.js'

const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ zh: '一二三四五六七'.slice(0, 3) + i, pinyin: [] }))
const sizes = (n: number, max: number) => paginateLines(lines(n), tunedTheme(getTheme('night'), { linesPerSlide: max })).map((p) => p.length)

describe('paginateLines', () => {
  it('never leaves one line alone on a slide when the section has more', () => {
    expect(sizes(5, 4)).toEqual([2, 3])
    expect(sizes(7, 3)).toEqual([2, 2, 3])
    expect(sizes(5, 3)).toEqual([2, 3])
  })

  it('keeps couplets together when that costs no extra slide', () => {
    expect(sizes(6, 4)).toEqual([4, 2])
    expect(sizes(8, 4)).toEqual([4, 4])
    expect(sizes(4, 3)).toEqual([2, 2])
  })

  it('uses no more slides than filling each one would', () => {
    expect(sizes(9, 4)).toHaveLength(3)
    expect(sizes(4, 4)).toEqual([4])
  })

  it('at 2 lines a slide, lets the odd line out join its neighbours as a third', () => {
    expect(sizes(3, 2)).toEqual([3])
    expect(sizes(5, 2)).toEqual([2, 3])
    expect(sizes(4, 2)).toEqual([2, 2])
  })

  it('at 1 line a slide, keeps one line a slide', () => {
    expect(sizes(3, 1)).toEqual([1, 1, 1])
  })

  it('a section of one line is one slide', () => {
    expect(sizes(1, 4)).toEqual([1])
  })
})
