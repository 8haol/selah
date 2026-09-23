import { describe, it, expect } from 'vitest'
import { buildDeck } from '../src/deck.js'
import { countRows, layoutSlide } from '../src/layout.js'
import { getTheme, slideTheme, tunedTheme } from '../src/themes.js'
import type { Song } from '../src/types.js'

const L = (zh: string) => ({ zh, pinyin: [] })
const long = L('在钉十字架前在你舍命之前')
const song: Song = {
  id: 's1', title: '爱的彰显', pinyinOverrides: {}, defaultFlow: 'V1',
  sections: [{ id: 'V1', type: 'verse', lines: [L('与罪人同坐席'), L('医治伤心的人'), long, L('你来到这世上'), L('显明你的心')] }],
}

describe('大字 with a row budget', () => {
  it('counts a line by the rows it takes at the size it will be set', () => {
    expect(countRows(long, getTheme('night'))).toBe(1)
    expect(countRows(long, tunedTheme(getTheme('night'), { bigText: true }))).toBe(2)
  })

  it('never sets more rows than 每页最多行数', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night', linesPerSlide: 3, bigText: true, lineSpacing: 'loose' })
    for (const s of deck.slides.filter((x) => x.kind === 'lyrics')) {
      expect(layoutSlide(s.lines, slideTheme(deck, s), s.fit).rows.length).toBeLessThanOrEqual(3)
    }
  })
})
