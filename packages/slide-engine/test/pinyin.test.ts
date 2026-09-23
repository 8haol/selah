import { describe, it, expect } from 'vitest'
import { annotateLine, annotateSong, polyphonicChoices, joinPinyin, spotKey, isPinyinFor } from '../src/pinyin.js'
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
  it('reads 祢 and its variants as nǐ, not the dictionary default mí', () => {
    // 祢/袮/禰 are the reverent second-person pronoun in Chinese Christian texts.
    // pinyin-pro only knows the ancestral-shrine reading mí.
    expect(annotateLine('祢')).toEqual(['nǐ'])
    expect(annotateLine('袮')).toEqual(['nǐ'])
    expect(annotateLine('禰')).toEqual(['nǐ'])
    expect(annotateLine('主啊 我渴慕尋求祢').at(-1)).toBe('nǐ')
    expect(joinPinyin(annotateLine('我要愛慕祢'))).toBe('wǒ yào ài mù nǐ')
  })
  it('fixes hymn words the dictionary mis-reads', () => {
    expect(annotateLine('数算主恩').slice(0, 2)).toEqual(['shǔ', 'suàn'])
    expect(annotateLine('數算主恩').slice(0, 2)).toEqual(['shǔ', 'suàn'])
    expect(annotateLine('應許').slice(0, 2)).toEqual(['yīng', 'xǔ'])
  })
  it('lets a song override beat the church reading', () => {
    expect(annotateLine('祢', { 祢: 'mí' })).toEqual(['mí'])
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
  it('offers the church reading for 祢 so the editor can pick it', () => {
    expect(polyphonicChoices('祢')).toContain('nǐ')
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

describe('著 and spot overrides', () => {
  it('reads 得著 / 得着 as dé zháo, and a traditional 著 as 着 outside zhù words', () => {
    expect(annotateLine('我得著能力').slice(1, 3)).toEqual(['dé', 'zháo'])
    expect(annotateLine('我得着能力').slice(1, 3)).toEqual(['dé', 'zháo'])
    expect(annotateLine('爱著你')[1]).toBe('zhe')
    expect(annotateLine('祂的名显著')[4]).toBe('zhù')
  })
  it('a spot override changes one character in one line; a character override changes it everywhere', () => {
    const line = '爱着你 等着你'
    expect(annotateLine(line, { [spotKey(line, 5)]: 'zháo' })).toEqual(annotateLine(line).map((p, i) => (i === 5 ? 'zháo' : p)))
    expect(annotateLine('另一行着', { [spotKey(line, 5)]: 'zháo' })[3]).toBe('zhe')
    expect(annotateLine(line, { 着: 'zháo' }).filter((p) => p === 'zháo')).toHaveLength(2)
  })
})

describe('isPinyinFor', () => {
  it('spots the pinyin printed under a line, with or without tone marks', () => {
    expect(isPinyinFor('人算什麼 祢竟顧念他', 'rén suàn shí me  mí jìng gù niàn tā')).toBe(true)
    expect(isPinyinFor('我深知道世上所有', 'wo shen zhi dao shi shang suo you')).toBe(true)
    // combining marks, as some pages send them
    expect(isPinyinFor('患難困苦', 'huàn nán kùn kǔ')).toBe(true)
  })
  it('leaves English lyrics and Chinese lines alone', () => {
    expect(isPinyinFor('我爱你', 'I love you Lord')).toBe(false)
    expect(isPinyinFor('奇异恩典', 'Amazing grace how sweet the sound')).toBe(false)
    expect(isPinyinFor('我爱你', '我爱你')).toBe(false)
    expect(isPinyinFor('Amazing grace', 'how sweet the sound')).toBe(false)
  })
})
