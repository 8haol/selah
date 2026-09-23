import { describe, it, expect } from 'vitest'
import { spotKey, type SongSection } from '@selah/slide-engine'
import { carrySpotFixes, countMatches, replaceCharAt, replaceInSections } from './replace'

const sec = (id: string, ...lines: string[]): SongSection => ({ id, type: 'verse', lines: lines.map((zh) => ({ zh, pinyin: [] })) })

describe('countMatches / replaceInSections', () => {
  const song = [sec('V1', '我爱你', '你是我的神'), sec('C', '主啊我要赞美你你')]

  it('counts every occurrence across sections', () => {
    expect(countMatches(song, '你')).toBe(4)
    expect(countMatches(song, '赞美')).toBe(1)
    expect(countMatches(song, '')).toBe(0)
  })

  it('replaces every occurrence and leaves untouched sections alone', () => {
    const out = replaceInSections(song, '你', '祢')
    expect(out.flatMap((s) => s.lines.map((l) => l.zh))).toEqual(['我爱祢', '祢是我的神', '主啊我要赞美祢祢'])
    expect(replaceInSections(song, '恩典', '慈爱')[0]).toBe(song[0])
  })
})

describe('replaceCharAt', () => {
  it('swaps one character by character index', () => {
    expect(replaceCharAt('你是我的神', 0, '祢')).toBe('祢是我的神')
    expect(replaceCharAt('你是我的神', 9, '祢')).toBe('你是我的神')
  })
})

describe('carrySpotFixes', () => {
  it('moves a fix to the edited line while its character stays put', () => {
    const before = [sec('V1', '你得着能力')]
    const after = [sec('V1', '祢得着能力')]
    const out = carrySpotFixes({ [spotKey('你得着能力', 2)]: 'zháo', 着: 'zhe' }, before, after)
    expect(out).toEqual({ [spotKey('祢得着能力', 2)]: 'zháo', 着: 'zhe' })
  })

  it('drops a fix whose character changed or moved', () => {
    const before = [sec('V1', '你得着能力')]
    expect(carrySpotFixes({ [spotKey('你得着能力', 2)]: 'zháo' }, before, [sec('V1', '你得到能力')])).toEqual({})
    expect(carrySpotFixes({ [spotKey('你得着能力', 2)]: 'zháo' }, before, [sec('V1', '我们得着能力')])).toEqual({})
  })
})
