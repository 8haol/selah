import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildDeck } from '../src/deck.js'
import { renderPptx, deckFileName } from '../src/pptx.js'
import type { Song } from '../src/types.js'

// 1×1 white JPEG
const JPEG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
const song: Song = {
  id: 's1', title: '耶和华是我的牧者', key: 'D', pinyinOverrides: {}, defaultFlow: 'V1 C',
  sections: [
    { id: 'V1', type: 'verse', lines: [{ zh: '耶和华是我的牧者', pinyin: [] }, { zh: '我必不致缺乏', pinyin: [] }] },
    { id: 'C', type: 'chorus', lines: [{ zh: '他使我的灵魂苏醒', pinyin: [] }] },
  ],
}

describe('renderPptx', () => {
  it('produces a 16:9 deck with one slide per SlideDeck slide, per-character text boxes, image backgrounds', async () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1 I C' }, themeId: 'night' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    const zip = await JSZip.loadAsync(buf)
    const slideFiles = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    expect(slideFiles.length).toBe(deck.slides.length) // title, V1, blank, C

    const pres = await zip.file('ppt/presentation.xml')!.async('string')
    expect(pres).toContain('cx="9144000"') // 10in
    expect(pres).toContain('cy="5143500"') // 5.625in

    const xml2 = await zip.file('ppt/slides/slide2.xml')!.async('string')
    expect(xml2).not.toContain('<a:tbl>')
    // one text box per character: 8 + 6 = 14 cells + 1 badge
    expect((xml2.match(/<p:sp>/g) ?? []).length).toBe(15)
    expect(xml2).toContain('>huá<')
    expect(xml2).toContain('>华<')
    expect(xml2).toContain('typeface="SimHei"')
    expect(xml2).toContain('typeface="Arial"')
    // sizes: auto-fit ≥ minimum (sz is pt*100)
    const sizes = [...xml2.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]))
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(4500)
    expect(sizes.some((s) => s >= 3500 && s < Math.max(...sizes))).toBe(true)
    expect(xml2).toContain('VERSE 1')

    const rels2 = await zip.file('ppt/slides/_rels/slide2.xml.rels')!.async('string')
    expect(rels2).toMatch(/relationships\/image/)
  })
  it('names the file with date, first title and count', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night' })
    const name = deckFileName({ ...deck, meta: { ...deck.meta, generatedAt: '2026-09-27T09:00:00.000Z' } }, ['耶和华是我的牧者', '第二首'])
    expect(name).toBe('2026-09-27 耶和华是我的牧者 + 1 首.pptx')
  })
})
