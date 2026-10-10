import { describe, it, expect } from 'vitest'
import { buildDeck } from '../src/deck.js'
import type { Song } from '../src/types.js'

const line = (zh: string) => ({ zh, pinyin: [] })
const song: Song = {
  id: 's1', title: '耶和华是我的牧者', key: 'D', artist: '诗篇 23', pinyinOverrides: {}, defaultFlow: 'V1 C',
  sections: [
    { id: 'V1', type: 'verse', lines: ['一', '二', '三', '四', '五', '六'].map(line) },
    { id: 'C', type: 'chorus', lines: ['七', '八'].map(line) },
    { id: 'B', type: 'bridge', lines: [line('他使我躺卧在青草地上领我在可安歇的水边他使我躺卧在青草地上领我在可安歇的水边'), line('短')] },
  ],
}

describe('buildDeck', () => {
  it('emits title slide then paginated sections (max 4 rows)', () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1 C' }, themeId: 'night' })
    expect(deck.slides.map((s) => s.kind)).toEqual(['title', 'lyrics', 'lyrics', 'lyrics'])
    expect(deck.slides[0]!.title).toBe('耶和华是我的牧者')
    expect(deck.slides[0]!.titlePinyin).toBe('yē hé huá shì wǒ de mù zhě')
    expect(deck.slides[0]!.meta).toBe('诗篇 23')
    expect(deck.slides[0]!.titleLine!.pinyin[0]).toBe('yē')
    expect(deck.slides[1]!.lines.map((l) => l.zh)).toEqual(['一', '二', '三', '四'])
    expect(deck.slides[2]!.lines.map((l) => l.zh)).toEqual(['五', '六'])
    expect(deck.slides[2]!.sectionLabel).toBe('VERSE 1')
    expect(deck.slides[3]!.sectionId).toBe('C')
  })
  it('names the song on its lyrics slides only', () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1 I C' }, themeId: 'night' })
    expect(deck.slides.map((s) => s.songTitle)).toEqual([undefined, '耶和华是我的牧者', '耶和华是我的牧者', undefined, '耶和华是我的牧者'])
  })
  it('paginates by wrapped rows, not by lines', () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'B' }, themeId: 'night' })
    const lyric = deck.slides.filter((s) => s.kind === 'lyrics')
    expect(lyric.length).toBeGreaterThanOrEqual(2)          // the long line needs its own slide(s)
    expect(lyric[lyric.length - 1]!.lines.map((l) => l.zh)).toEqual(['短'])
  })
  it('fills pinyin on every lyric line', () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'C' }, themeId: 'night' })
    expect(deck.slides[1]!.lines[0]!.pinyin).toEqual(['qī'])
  })
  it('inserts blank slides for I and between songs', () => {
    const s2: Song = { ...song, id: 's2', title: '第二首' }
    const deck = buildDeck({ songs: [song, s2], flows: { s1: 'I C', s2: 'C' }, themeId: 'deep' })
    expect(deck.slides.map((s) => s.kind)).toEqual(['title', 'blank', 'lyrics', 'blank', 'title', 'lyrics'])
    expect(deck.themeId).toBe('deep')
    expect(deck.meta.songIds).toEqual(['s1', 's2'])
    expect(deck.meta.flows.s2).toBe('C')
  })
  it('uses the song default flow when none is given', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night' })
    expect(deck.meta.flows.s1).toBe('V1 C')
  })
})
