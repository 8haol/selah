import { describe, expect, it } from 'vitest'
import { applyDeckEdits, buildDeck, slideText, type DeckEdits, type Song } from '@selah/slide-engine'
import { addSlide, editCount, removeSlide, restoreSlide, revertSlide, rewriteSlide } from './slide-edits'

const grace: Song = {
  id: 'ag', title: '奇异恩典', pinyinOverrides: {}, defaultFlow: 'V1',
  sections: [{ id: 'V1', type: 'verse', lines: ['奇异恩典　何等甘甜', '我罪已得赦免', '前我失丧　今被寻回', '瞎眼今得看见'].map((zh) => ({ zh, pinyin: [] })) }],
}
const view = (edits: DeckEdits) =>
  applyDeckEdits(buildDeck({ songs: [grace], flows: { ag: 'V1' }, themeId: 'night', linesPerSlide: 2 }), edits, { showRemoved: true })
const at = (edits: DeckEdits, key: string) => view(edits).slides.find((s) => s.key === key)!

describe('slide edits', () => {
  it('removes and restores a generated slide', () => {
    const e = removeSlide({}, at({}, 'ag/0/1'))
    expect(at(e, 'ag/0/1').edit).toBe('removed')
    expect(at(restoreSlide(e, at(e, 'ag/0/1')), 'ag/0/1').edit).toBeUndefined()
  })

  it('removes a rewritten slide against the song\'s text, so it can come back rewritten', () => {
    let e = rewriteSlide({}, at({}, 'ag/0/0'), ['奇异恩典'])
    e = removeSlide(e, at(e, 'ag/0/0'))
    expect(at(e, 'ag/0/0').edit).toBe('removed')
    e = restoreSlide(e, at(e, 'ag/0/0'))
    expect(slideText(at(e, 'ag/0/0'))).toEqual(['奇异恩典'])
  })

  it('rewrites, re-rewrites against the original, and reverts', () => {
    let e = rewriteSlide({}, at({}, 'ag/0/0'), ['一'])
    e = rewriteSlide(e, at(e, 'ag/0/0'), ['二'])
    expect(e.rewritten).toEqual([{ key: 'ag/0/0', was: '奇异恩典　何等甘甜\n我罪已得赦免', lines: ['二'] }])
    expect(revertSlide(e, at(e, 'ag/0/0')).rewritten).toEqual([])
    expect(rewriteSlide(e, at(e, 'ag/0/0'), ['奇异恩典　何等甘甜', '我罪已得赦免']).rewritten).toEqual([])
  })

  it('adds each slide right after the one it was added after, edits and deletes them', () => {
    let e = addSlide({}, 'ag/title', ['一'], 'a')
    e = addSlide(e, 'ag/title', ['二'], 'b')
    e = addSlide(e, 'add/b', ['三'], 'c')
    expect(view(e).slides.map((s) => s.key).slice(0, 4)).toEqual(['ag/title', 'add/b', 'add/c', 'add/a'])

    e = rewriteSlide(e, at(e, 'add/b'), ['乙'])
    expect(slideText(at(e, 'add/b'))).toEqual(['乙'])
    e = removeSlide(e, at(e, 'add/b'))
    expect(view(e).slides.map((s) => s.key).slice(0, 3)).toEqual(['ag/title', 'add/c', 'add/a'])
    expect(editCount(e)).toBe(2)
  })
})
