import { describe, it, expect } from 'vitest'
import { annotateLine, annotateSong, polyphonicChoices, joinPinyin } from '../src/pinyin.js'
import type { Song } from '../src/types.js'

describe('annotateLine', () => {
  it('returns one pinyin per character with tone marks', () => {
    expect(annotateLine('耶和华')).toEqual(['yē', 'hé', 'huá'])
  })
  it('maps non-Chinese characters to empty strings, keeping alignment', () => {
    const r = annotateLine('哈利路亚, Amen!')
    expect(r.length).toBe([...'哈利路亚, Amen!'].length)
    expect(r.slice(0, 4)).toEqual(['hā', 'lì', 'lù', 'yà'])
    expect(r[4]).toBe('')
    expect(r[6]).toBe('')
  })
  it('gets common polyphonic words right by context', () => {
    expect(annotateLine('重新得力')[0]).toBe('chóng')
    expect(annotateLine('快乐')[1]).toBe('lè')
    expect(annotateLine('行在光中')[0]).toBe('xíng')
  })
  it('applies overrides per character', () => {
    expect(annotateLine('长阔高深', { 长: 'zhǎng' })[0]).toBe('zhǎng')
    expect(annotateLine('长长', { 长: 'zhǎng' })).toEqual(['zhǎng', 'zhǎng'])
  })
})

describe('annotateSong', () => {
  it('fills pinyin for every line without mutating input', () => {
    const song: Song = {
      id: 's', title: '牧者', pinyinOverrides: { 长: 'zhǎng' }, defaultFlow: 'V1',
      sections: [{ id: 'V1', type: 'verse', lines: [{ zh: '长阔', pinyin: [] }, { zh: '牧者', pinyin: [] }] }],
    }
    const out = annotateSong(song)
    expect(out.sections[0]!.lines[0]!.pinyin).toEqual(['zhǎng', 'kuò'])
    expect(out.sections[0]!.lines[1]!.pinyin).toEqual(['mù', 'zhě'])
    expect(song.sections[0]!.lines[0]!.pinyin).toEqual([])
  })
})

describe('polyphonicChoices', () => {
  it('lists readings for a polyphonic character', () => {
    const c = polyphonicChoices('长')
    expect(c).toContain('cháng')
    expect(c).toContain('zhǎng')
  })
  it('returns [] for non-Chinese', () => {
    expect(polyphonicChoices('A')).toEqual([])
  })
})

describe('joinPinyin', () => {
  it('joins with single spaces, skipping empties', () => {
    expect(joinPinyin(['yē', 'hé', '', 'huá'])).toBe('yē hé huá')
  })
})
