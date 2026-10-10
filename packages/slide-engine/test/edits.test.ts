import { describe, it, expect } from 'vitest'
import { buildDeck } from '../src/deck.js'
import { applyDeckEdits, slideKeys, slideText } from '../src/edits.js'
import type { Song } from '../src/types.js'

const line = (zh: string) => ({ zh, pinyin: [] })
const psalm: Song = {
  id: 'p23', title: '耶和华是我的牧者', pinyinOverrides: {}, defaultFlow: 'V1 C',
  sections: [
    { id: 'V1', type: 'verse', lines: ['耶和华是我的牧者', '我必不致缺乏', '他使我躺卧在青草地上', '领我在可安歇的水边'].map(line) },
    { id: 'C', type: 'chorus', lines: ['他使我的灵魂苏醒', '为自己的名引导我走义路'].map(line) },
  ],
}
const grace: Song = {
  id: 'ag', title: '奇异恩典', pinyinOverrides: {}, defaultFlow: 'V1',
  sections: [{ id: 'V1', type: 'verse', lines: ['奇异恩典　何等甘甜', '我罪已得赦免'].map(line) }],
}

const build = () => buildDeck({ songs: [psalm, grace], flows: { p23: 'V1 I C', ag: 'V1' }, themeId: 'night', linesPerSlide: 2 })

describe('slideKeys', () => {
  it('names every slide by its song, flow step and page', () => {
    expect(slideKeys(build())).toEqual([
      'p23/title', 'p23/0/0', 'p23/0/1', 'p23/1', 'p23/2/0',
      'ag/before', 'ag/title', 'ag/0/0',
    ])
  })
})

describe('applyDeckEdits', () => {
  it('leaves the deck as built when there are no edits, keys added', () => {
    const deck = build()
    const out = applyDeckEdits(deck, undefined)
    expect(out.slides.map(slideText)).toEqual(deck.slides.map(slideText))
    expect(out.slides.every((s) => s.key && !s.edit)).toBe(true)
  })

  it('removes a slide, or keeps it marked for the overview', () => {
    const edits = { removed: [{ key: 'p23/1', was: '' }, { key: 'p23/0/1', was: '他使我躺卧在青草地上\n领我在可安歇的水边' }] }
    const out = applyDeckEdits(build(), edits)
    expect(out.slides.map((s) => s.key)).not.toContain('p23/1')
    expect(out.slides.map((s) => s.key)).not.toContain('p23/0/1')
    expect(out.slides).toHaveLength(6)
    const shown = applyDeckEdits(build(), edits, { showRemoved: true })
    expect(shown.slides.filter((s) => s.edit === 'removed').map((s) => s.key)).toEqual(['p23/0/1', 'p23/1'])
  })

  it('rewrites a lyrics slide with fresh pinyin, laid out on its own', () => {
    const out = applyDeckEdits(build(), { rewritten: [{ key: 'p23/2/0', was: '他使我的灵魂苏醒\n为自己的名引导我走义路', lines: ['他使我的灵魂苏醒'] }] })
    const s = out.slides.find((x) => x.key === 'p23/2/0')!
    expect(s.edit).toBe('rewritten')
    expect(s.lines.map((l) => l.zh)).toEqual(['他使我的灵魂苏醒'])
    expect(s.lines[0]!.pinyin[0]).toBe('tā')
    expect(s.fit).toBeUndefined()
    expect(s.sectionLabel).toBe('CHORUS')
  })

  it('rewrites a title slide as its title', () => {
    const out = applyDeckEdits(build(), { rewritten: [{ key: 'ag/title', was: '奇异恩典', lines: ['奇异恩典（诗歌）'] }] })
    const s = out.slides.find((x) => x.key === 'ag/title')!
    expect(s.title).toBe('奇异恩典（诗歌）')
    expect(s.titleLine!.pinyin[0]).toBe('qí')
  })

  it('drops an edit once the song no longer shows the text it was made against', () => {
    const edits = {
      removed: [{ key: 'p23/0/0', was: '旧的歌词' }],
      rewritten: [{ key: 'ag/0/0', was: '旧的歌词', lines: ['新'] }],
    }
    const out = applyDeckEdits(build(), edits)
    expect(out.slides.map(slideText)).toEqual(build().slides.map(slideText))
  })

  it('adds free-text slides after the slide they follow, chained, first, or last when orphaned', () => {
    const out = applyDeckEdits(build(), {
      removed: [{ key: 'p23/2/0', was: '他使我的灵魂苏醒\n为自己的名引导我走义路' }],
      added: [
        { id: 'a', after: 'p23/2/0', lines: ['诗篇 23 篇'] },
        { id: 'b', after: 'add/a', lines: ['一起读经'] },
        { id: 'c', after: '', lines: ['欢迎'] },
        { id: 'd', after: 'gone/0/0', lines: ['阿们'] },
      ],
    })
    const keys = out.slides.map((s) => s.key)
    expect(keys[0]).toBe('add/c')
    expect(keys.slice(keys.indexOf('p23/1'), keys.indexOf('p23/1') + 3)).toEqual(['p23/1', 'add/a', 'add/b'])
    expect(keys.at(-1)).toBe('add/d')
    const a = out.slides.find((s) => s.key === 'add/a')!
    expect(a).toMatchObject({ kind: 'lyrics', edit: 'added' })
    expect(a.lines[0]!.pinyin.slice(0, 2)).toEqual(['shī', 'piān'])
    expect(a.songId).toBeUndefined()
  })

  it('leaves out pinyin when the setlist hides it', () => {
    const out = applyDeckEdits(build(), { added: [{ id: 'a', after: '', lines: ['欢迎'] }] }, { pinyin: false })
    expect(out.slides[0]!.lines[0]!.pinyin).toEqual(['', ''])
  })
})
